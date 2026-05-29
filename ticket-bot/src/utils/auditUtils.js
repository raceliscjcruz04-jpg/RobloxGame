const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Log audit action
 */
function logAudit(guildId, action, userId = null, ticketId = null, details = null) {
  const auditId = `audit-${uuidv4()}`;
  
  db.prepare(`
    INSERT INTO audit_logs (id, guild_id, ticket_id, user_id, action, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(auditId, guildId, ticketId, userId, action, details ? JSON.stringify(details) : null);
  
  return auditId;
}

/**
 * Get audit logs for guild
 */
function getAuditLogs(guildId, limit = 50) {
  return db.prepare(`
    SELECT * FROM audit_logs WHERE guild_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(guildId, limit);
}

/**
 * Get audit logs for ticket
 */
function getTicketAuditLogs(ticketId) {
  return db.prepare(`
    SELECT * FROM audit_logs WHERE ticket_id = ?
    ORDER BY created_at DESC
  `).all(ticketId);
}

module.exports = {
  logAudit,
  getAuditLogs,
  getTicketAuditLogs,
};
