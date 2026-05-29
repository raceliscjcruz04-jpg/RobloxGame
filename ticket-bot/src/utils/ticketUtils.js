const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

/**
 * Create a new ticket
 */
function createTicket(guildId, userId, panelId, categoryId, channelId, priority = 'normal') {
  const ticketId = `ticket-${uuidv4()}`;
  
  db.prepare(`
    INSERT INTO tickets (id, guild_id, user_id, panel_id, category_id, channel_id, status, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ticketId, guildId, userId, panelId, categoryId, channelId, 'open', priority);
  
  // Add user to ticket members
  db.prepare(`
    INSERT INTO ticket_members (ticket_id, user_id, can_message)
    VALUES (?, ?, ?)
  `).run(ticketId, userId, 1);
  
  return ticketId;
}

/**
 * Add member to ticket
 */
function addTicketMember(ticketId, userId, canMessage = true) {
  try {
    db.prepare(`
      INSERT INTO ticket_members (ticket_id, user_id, can_message)
      VALUES (?, ?, ?)
    `).run(ticketId, userId, canMessage ? 1 : 0);
    return true;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return false;
    }
    throw error;
  }
}

/**
 * Remove member from ticket
 */
function removeTicketMember(ticketId, userId) {
  db.prepare(`
    DELETE FROM ticket_members WHERE ticket_id = ? AND user_id = ?
  `).run(ticketId, userId);
}

/**
 * Get ticket members
 */
function getTicketMembers(ticketId) {
  return db.prepare(`
    SELECT * FROM ticket_members WHERE ticket_id = ?
  `).all(ticketId);
}

/**
 * Update ticket status
 */
function updateTicketStatus(ticketId, status) {
  const validStatuses = ['open', 'closed', 'on-hold'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  
  db.prepare(`
    UPDATE tickets SET status = ? WHERE id = ?
  `).run(status, ticketId);
}

/**
 * Claim ticket
 */
function claimTicket(ticketId, staffId) {
  db.prepare(`
    UPDATE tickets SET claimed_by = ? WHERE id = ?
  `).run(staffId, ticketId);
}

/**
 * Unclaim ticket
 */
function unclaimTicket(ticketId) {
  db.prepare(`
    UPDATE tickets SET claimed_by = NULL WHERE id = ?
  `).run(ticketId);
}

/**
 * Get ticket by ID
 */
function getTicket(ticketId) {
  return db.prepare(`
    SELECT * FROM tickets WHERE id = ?
  `).get(ticketId);
}

/**
 * Get user's open tickets
 */
function getUserOpenTickets(guildId, userId) {
  return db.prepare(`
    SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = ?
  `).all(guildId, userId, 'open');
}

/**
 * Add tag to ticket
 */
function addTagToTicket(ticketId, tagId) {
  try {
    db.prepare(`
      INSERT INTO ticket_tag_associations (ticket_id, tag_id)
      VALUES (?, ?)
    `).run(ticketId, tagId);
    return true;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return false;
    }
    throw error;
  }
}

/**
 * Remove tag from ticket
 */
function removeTagFromTicket(ticketId, tagId) {
  db.prepare(`
    DELETE FROM ticket_tag_associations WHERE ticket_id = ? AND tag_id = ?
  `).run(ticketId, tagId);
}

/**
 * Add staff note
 */
function addStaffNote(ticketId, staffId, content) {
  const noteId = `note-${uuidv4()}`;
  
  db.prepare(`
    INSERT INTO staff_notes (id, ticket_id, staff_id, note_content)
    VALUES (?, ?, ?, ?)
  `).run(noteId, ticketId, staffId, content);
  
  return noteId;
}

/**
 * Get staff notes
 */
function getStaffNotes(ticketId) {
  return db.prepare(`
    SELECT * FROM staff_notes WHERE ticket_id = ?
    ORDER BY created_at DESC
  `).all(ticketId);
}

module.exports = {
  createTicket,
  addTicketMember,
  removeTicketMember,
  getTicketMembers,
  updateTicketStatus,
  claimTicket,
  unclaimTicket,
  getTicket,
  getUserOpenTickets,
  addTagToTicket,
  removeTagFromTicket,
  addStaffNote,
  getStaffNotes,
};
