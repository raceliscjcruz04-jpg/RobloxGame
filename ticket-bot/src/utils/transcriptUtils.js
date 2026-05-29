const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create HTML transcript from messages
 */
function generateHTMLTranscript(ticketData, messages) {
  const timestamp = new Date().toISOString();
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket #${ticketData.id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #36393f;
            color: #dcddde;
            padding: 20px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header {
            background: #2f3136;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #7289da;
        }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
        .header-info div { background: #202225; padding: 8px 12px; border-radius: 4px; }
        .messages { background: #2f3136; border-radius: 8px; overflow: hidden; }
        .message {
            padding: 12px 16px;
            border-bottom: 1px solid #202225;
            display: flex;
            gap: 12px;
        }
        .message:last-child { border-bottom: none; }
        .message-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #7289da;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-weight: bold;
        }
        .message-content { flex: 1; }
        .message-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 4px;
        }
        .message-author { font-weight: 600; }
        .message-time { font-size: 12px; color: #72767d; }
        .message-text {
            color: #dcddde;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #72767d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ticket #${ticketData.id}</h1>
            <div class="header-info">
                <div><strong>Status:</strong> ${ticketData.status}</div>
                <div><strong>Created:</strong> ${new Date(ticketData.created_at).toLocaleString()}</div>
                <div><strong>User:</strong> <@${ticketData.user_id}></div>
                <div><strong>Priority:</strong> ${ticketData.priority}</div>
            </div>
        </div>
        <div class="messages">
            ${messages.map(msg => `
                <div class="message">
                    <div class="message-avatar">${msg.author.charAt(0).toUpperCase()}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-author">${msg.author}</span>
                            <span class="message-time">${new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="message-text">${escapeHtml(msg.content)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="footer">
            <p>Transcript generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
  `;
  
  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Save transcript
 */
function saveTranscript(ticketId, htmlContent) {
  const transcriptId = `transcript-${uuidv4()}`;
  
  db.prepare(`
    INSERT INTO transcripts (id, ticket_id, html_content)
    VALUES (?, ?, ?)
  `).run(transcriptId, ticketId, htmlContent);
  
  return transcriptId;
}

/**
 * Get transcript
 */
function getTranscript(ticketId) {
  return db.prepare(`
    SELECT * FROM transcripts WHERE ticket_id = ?
  `).get(ticketId);
}

module.exports = {
  generateHTMLTranscript,
  escapeHtml,
  saveTranscript,
  getTranscript,
};
