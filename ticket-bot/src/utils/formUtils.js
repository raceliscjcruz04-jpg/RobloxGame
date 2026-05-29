const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a form
 */
function createForm(panelId, categoryId) {
  const formId = `form-${uuidv4()}`;
  const guildId = db.prepare('SELECT guild_id FROM panels WHERE id = ?').get(panelId).guild_id;
  
  db.prepare(`
    INSERT INTO forms (id, guild_id, panel_id, category_id, form_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(formId, guildId, panelId, categoryId, `Form for ${categoryId}`);
  
  return formId;
}

/**
 * Add question to form
 */
function addFormQuestion(formId, questionText, questionType, stepNumber = 1, required = true, options = null) {
  const questionId = `question-${uuidv4()}`;
  const maxOrder = db.prepare('SELECT MAX(order_position) as max FROM form_questions WHERE form_id = ?').get(formId).max || 0;
  
  db.prepare(`
    INSERT INTO form_questions (id, form_id, question_text, question_type, step_number, required, options, order_position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(questionId, formId, questionText, questionType, stepNumber, required ? 1 : 0, options, maxOrder + 1);
  
  return questionId;
}

/**
 * Get form questions
 */
function getFormQuestions(formId, stepNumber = null) {
  let query = 'SELECT * FROM form_questions WHERE form_id = ?';
  const params = [formId];
  
  if (stepNumber !== null) {
    query += ' AND step_number = ?';
    params.push(stepNumber);
  }
  
  query += ' ORDER BY order_position ASC';
  
  return db.prepare(query).all(...params);
}

/**
 * Save form response
 */
function saveFormResponse(ticketId, questionId, response) {
  const responseId = `response-${uuidv4()}`;
  
  db.prepare(`
    INSERT INTO form_responses (id, ticket_id, question_id, response)
    VALUES (?, ?, ?, ?)
  `).run(responseId, ticketId, questionId, response);
  
  return responseId;
}

/**
 * Get form responses
 */
function getFormResponses(ticketId) {
  return db.prepare(`
    SELECT fr.*, fq.question_text FROM form_responses fr
    JOIN form_questions fq ON fr.question_id = fq.id
    WHERE fr.ticket_id = ?
    ORDER BY fq.order_position ASC
  `).all(ticketId);
}

module.exports = {
  createForm,
  addFormQuestion,
  getFormQuestions,
  saveFormResponse,
  getFormResponses,
};
