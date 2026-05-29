const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a rating
 */
function createRating(ticketId, userId, panelId, rating, comment = null) {
  const ratingId = `rating-${uuidv4()}`;
  const guildId = db.prepare('SELECT guild_id FROM tickets WHERE id = ?').get(ticketId).guild_id;
  
  db.prepare(`
    INSERT INTO ratings (id, ticket_id, user_id, panel_id, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ratingId, ticketId, userId, panelId, rating, comment);
  
  return ratingId;
}

/**
 * Check if user already rated ticket
 */
function hasUserRated(ticketId, userId, panelId) {
  const rating = db.prepare(`
    SELECT id FROM ratings WHERE ticket_id = ? AND user_id = ? AND panel_id = ?
  `).get(ticketId, userId, panelId);
  
  return !!rating;
}

/**
 * Get rating for ticket
 */
function getTicketRating(ticketId) {
  return db.prepare(`
    SELECT * FROM ratings WHERE ticket_id = ?
  `).get(ticketId);
}

/**
 * Get average rating for panel
 */
function getPanelAverageRating(panelId) {
  const result = db.prepare(`
    SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE panel_id = ?
  `).get(panelId);
  
  return { average: result.avg || 0, count: result.count };
}

/**
 * Track SLA metrics
 */
function trackSLA(ticketId, firstResponseTime = null, resolutionTime = null, slaBreached = false) {
  const slaId = `sla-${uuidv4()}`;
  
  db.prepare(`
    INSERT INTO sla_tracking (id, ticket_id, first_response_at, resolved_at, response_time_minutes, resolution_time_minutes, sla_breached)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    slaId,
    ticketId,
    firstResponseTime ? new Date(firstResponseTime).toISOString() : null,
    resolutionTime ? new Date(resolutionTime).toISOString() : null,
    firstResponseTime ? Math.floor((Date.now() - new Date(firstResponseTime).getTime()) / 60000) : null,
    resolutionTime ? Math.floor((Date.now() - new Date(resolutionTime).getTime()) / 60000) : null,
    slaBreached ? 1 : 0
  );
  
  return slaId;
}

/**
 * Get SLA metrics
 */
function getSLAMetrics(panelId) {
  return db.prepare(`
    SELECT 
      AVG(response_time_minutes) as avg_response_time,
      AVG(resolution_time_minutes) as avg_resolution_time,
      COUNT(CASE WHEN sla_breached = 1 THEN 1 END) as breaches
    FROM sla_tracking st
    JOIN tickets t ON st.ticket_id = t.id
    WHERE t.panel_id = ?
  `).get(panelId);
}

module.exports = {
  createRating,
  hasUserRated,
  getTicketRating,
  getPanelAverageRating,
  trackSLA,
  getSLAMetrics,
};
