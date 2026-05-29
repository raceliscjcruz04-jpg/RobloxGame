const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tickets.db'));
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  // Panels table
  db.exec(`
    CREATE TABLE IF NOT EXISTS panels (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      panel_name TEXT NOT NULL,
      description TEXT,
      message_id TEXT,
      channel_id TEXT,
      display_type TEXT DEFAULT 'buttons',
      webhook_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, panel_name)
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      panel_id TEXT NOT NULL,
      category_name TEXT NOT NULL,
      emoji TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(panel_id) REFERENCES panels(id) ON DELETE CASCADE,
      UNIQUE(panel_id, category_name)
    )
  `);

  // Tickets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      panel_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      claimed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      reopened_count INTEGER DEFAULT 0,
      FOREIGN KEY(panel_id) REFERENCES panels(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Ticket members (who can see/message)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      can_message INTEGER DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      UNIQUE(ticket_id, user_id)
    )
  `);

  // Ticket transcripts
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      html_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )
  `);

  // Ratings
  db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      panel_id TEXT NOT NULL,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(ticket_id, user_id, panel_id),
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY(panel_id) REFERENCES panels(id) ON DELETE CASCADE
    )
  `);

  // Staff roles
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_roles (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      permission_level TEXT DEFAULT 'support',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, role_id)
    )
  `);

  // Guild settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      max_open_tickets INTEGER DEFAULT 5,
      auto_close_days INTEGER DEFAULT 7,
      auto_close_enabled INTEGER DEFAULT 1,
      archive_category_id TEXT,
      transcript_channel_id TEXT,
      rating_channel_id TEXT,
      notification_preferences TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ticket forms
  db.exec(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      panel_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      form_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(panel_id, category_id),
      FOREIGN KEY(panel_id) REFERENCES panels(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Form questions
  db.exec(`
    CREATE TABLE IF NOT EXISTS form_questions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT,
      step_number INTEGER,
      required INTEGER DEFAULT 1,
      options TEXT,
      order_position INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(form_id) REFERENCES forms(id) ON DELETE CASCADE
    )
  `);

  // Form responses
  db.exec(`
    CREATE TABLE IF NOT EXISTS form_responses (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES form_questions(id) ON DELETE CASCADE
    )
  `);

  // Ticket tags/labels
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_tags (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, tag_name)
    )
  `);

  // Ticket-tag associations
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_tag_associations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES ticket_tags(id) ON DELETE CASCADE,
      UNIQUE(ticket_id, tag_id)
    )
  `);

  // Ticket templates
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_templates (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      panel_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(panel_id, category_id, template_name),
      FOREIGN KEY(panel_id) REFERENCES panels(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Staff notes
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_notes (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      note_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )
  `);

  // SLA tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS sla_tracking (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      first_response_at DATETIME,
      resolved_at DATETIME,
      response_time_minutes INTEGER,
      resolution_time_minutes INTEGER,
      sla_breached INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )
  `);

  // Audit logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      ticket_id TEXT,
      user_id TEXT,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized successfully');
}

module.exports = {
  db,
  initializeDatabase,
};
