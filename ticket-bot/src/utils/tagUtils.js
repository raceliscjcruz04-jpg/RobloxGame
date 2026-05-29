const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a tag
 */
function createTag(guildId, tagName, color = '#7289da') {
  const tagId = `tag-${uuidv4()}`;
  
  db.prepare(`
    INSERT INTO ticket_tags (id, guild_id, tag_name, color)
    VALUES (?, ?, ?, ?)
  `).run(tagId, guildId, tagName, color);
  
  return tagId;
}

/**
 * Get or create tag
 */
function getOrCreateTag(guildId, tagName, color = '#7289da') {
  const existing = db.prepare(`
    SELECT id FROM ticket_tags WHERE guild_id = ? AND tag_name = ?
  `).get(guildId, tagName);
  
  if (existing) return existing.id;
  return createTag(guildId, tagName, color);
}

/**
 * Get all tags for guild
 */
function getGuildTags(guildId) {
  return db.prepare(`
    SELECT * FROM ticket_tags WHERE guild_id = ?
    ORDER BY tag_name ASC
  `).all(guildId);
}

/**
 * Delete tag
 */
function deleteTag(tagId) {
  db.prepare('DELETE FROM ticket_tag_associations WHERE tag_id = ?').run(tagId);
  db.prepare('DELETE FROM ticket_tags WHERE id = ?').run(tagId);
}

/**
 * Create a template
 */
function createTemplate(panelId, categoryId, templateName, content) {
  const templateId = `template-${uuidv4()}`;
  const guildId = db.prepare('SELECT guild_id FROM panels WHERE id = ?').get(panelId).guild_id;
  
  db.prepare(`
    INSERT INTO ticket_templates (id, guild_id, panel_id, category_id, template_name, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(templateId, guildId, panelId, categoryId, templateName, content);
  
  return templateId;
}

/**
 * Get templates for category
 */
function getCategoryTemplates(categoryId) {
  return db.prepare(`
    SELECT * FROM ticket_templates WHERE category_id = ?
    ORDER BY template_name ASC
  `).all(categoryId);
}

module.exports = {
  createTag,
  getOrCreateTag,
  getGuildTags,
  deleteTag,
  createTemplate,
  getCategoryTemplates,
};
