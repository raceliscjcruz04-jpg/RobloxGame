````markdown name=README.md
# 🎫 Advanced Discord Ticket Bot

A fully-featured, database-driven Discord ticket system with complete persistence, multi-panel support, and extensive customization options.

## ✨ Features

### Core Features
- ✅ **Fully Configurable Categories** - Unlimited category types per panel
- ✅ **Staff Role Management** - Multiple roles with permission levels (Support, Moderator, Admin)
- ✅ **Flexible Ticket Channels** - New channels, threads, or existing channels (per category)
- ✅ **HTML Transcripts** - Auto-generated, sent to user DM + staff channel
- ✅ **Star Ratings** - 1-5 star system with custom labels and comments
- ✅ **Claiming System** - Claim tickets (others see but can't message, configurable)
- ✅ **Priority Levels** - Configurable ticket priorities
- ✅ **Auto-Close** - Automatic closure of inactive tickets (fully configurable)
- ✅ **Multi-step Forms** - Custom forms with various question types
- ✅ **Max Open Tickets** - Configurable per-user limit
- ✅ **Multiple Panels** - Create as many panels as needed
- ✅ **Category Display** - Buttons or dropdown selection

### Advanced Features
- 🏷️ **Ticket Tags/Labels** - Categorize and organize tickets
- 📝 **Ticket Templates** - Pre-made responses for common issues
- 🤖 **Automated Responses** - Reduce support load
- 📈 **Statistics Dashboard** - View analytics on `/stats`
- 🚀 **Escalation System** - Mark urgent tickets
- ⏱️ **SLA Tracking** - Monitor response and resolution times
- 📋 **Internal Staff Notes** - Private notes between staff
- 🔔 **Notification Preferences** - Customizable alerts
- 📜 **Audit Log** - Full compliance tracking
- 🔗 **Webhook Integration** - External service notifications

### Role & Channel Permissions
- **Role Mentions or Names** - No need to use IDs
- **Multiple Input** - Comma-separated roles/channels
- **Smart Parsing** - Accepts both mentions and names

## 📦 Installation

### Prerequisites
- Node.js v16+
- Discord Bot Token
- Guilds (Discord servers) to test on

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/raceliscjcruz04-jpg/RobloxGame.git
   cd RobloxGame/ticket-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add:
   - `TOKEN` - Your Discord bot token
   - `CLIENT_ID` - Your bot's Client ID
   - `GUILD_ID` - Your test server ID (optional, for guild commands)

4. **Start the bot**
   ```bash
   npm start
   ```

## 🚀 Quick Start Guide

### Using the Interactive Setup

1. **Run the setup guide**
   ```
   /setup
   ```
   This shows all available commands in order.

2. **Create a Panel**
   ```
   /panel create
   name: Support
   description: Create a support ticket
   ```

3. **Add Categories**
   ```
   /category add
   panel: Support
   category: Bug Report
   emoji: 🐛
   ```

4. **Configure Staff Roles**
   ```
   /staff role
   action: Add
   roles: @Support, Moderator (can use names or mentions)
   level: support
   ```

5. **Deploy the Panel**
   ```
   /panel deploy
   panel: Support
   channel: #tickets (can use mention or name)
   display_type: buttons
   ```

6. **Configure Guild Settings (Optional)**
   ```
   /settings guild
   max_open_tickets: 5
   auto_close_days: 7
   auto_close_enabled: true
   archive_category: Closed Tickets
   transcript_channel: #transcripts
   rating_channel: #ratings
   ```

## 📋 Command Reference

### Panel Management
```
/panel create [name] [description?]
/panel deploy [panel] [channel] [display_type]
/panel list
/panel delete [name]
```

### Category Management
```
/category add [panel] [category] [emoji?]
/category list [panel]
/category delete [panel] [category]
```

### Staff Management
```
/staff role [action] [roles] [level?]
/staff list
```

### Permissions (Advanced)
```
/permission role-command [action] [roles] [commands]
/permission list
/permission reset
```

### Settings
```
/settings guild [max_open_tickets?] [auto_close_days?] [auto_close_enabled?] [archive_category?] [transcript_channel?] [rating_channel?]
/settings view
```

### Info
```
/stats
/ticket help
/setup
```

## 🗄️ Database Structure

### Tables
- `panels` - Ticket panels
- `categories` - Panel categories
- `tickets` - Individual tickets
- `ticket_members` - Ticket access control
- `transcripts` - HTML transcripts
- `ratings` - User ratings
- `staff_roles` - Staff configuration
- `guild_settings` - Guild-wide settings
- `forms` - Custom forms
- `form_questions` - Form questions
- `form_responses` - User responses
- `ticket_tags` - Ticket tags/labels
- `ticket_tag_associations` - Tag mappings
- `ticket_templates` - Template responses
- `staff_notes` - Internal notes
- `sla_tracking` - SLA metrics
- `audit_logs` - Complete audit trail
- `role_command_permissions` - Role-based command access

## 🔐 Data Persistence

All data is stored in SQLite with WAL (Write-Ahead Logging) for:
- ✅ Bot restart/crash recovery
- ✅ Guild removal recovery
- ✅ Complete data consistency
- ✅ ACID compliance

## 🎨 Customization

### Input Flexibility
All commands that accept roles/channels support:
- **Mentions**: `@Role` or `#channel`
- **Names**: `Support` or `tickets`
- **Multiple**: `@Staff, Moderator, @Support` (comma-separated)

### Form Types
- `text` (short or paragraph)
- `dropdown` (StringSelect with custom options)
- `user_select` (UserSelect)
- `role_select` (RoleSelect)
- `channel_select` (ChannelSelect)
- `mention_select` (MentionableSelect)

## 📝 Examples

### Allow specific roles to use ticket command
```
/permission role-command
action: Allow
roles: @Support Team, Managers
commands: ticket, stats
```

### Configure multiple channels
```
/settings guild
transcript_channel: #ticket-logs
rating_channel: #feedback
```

## 🆘 Troubleshooting

### Bot won't respond to commands
- Ensure bot has "Use Application Commands" permission
- Check bot token in `.env`
- Verify bot is in the server

### Commands show as unavailable
- Commands are guild-specific (not global) by default
- May take 1-2 minutes to register
- Try re-inviting the bot

### Database errors
- Ensure `ticket-bot/` directory is writable
- Check for corrupted `tickets.db`
- Delete `.db` files and restart if needed

## 📈 Future Features
- [ ] Web dashboard for analytics
- [ ] Discord.py migration
- [ ] Mobile app integration
- [ ] AI-powered ticket categorization
- [ ] Ticket assignment algorithm

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues, feature requests, or questions:
1. Check existing GitHub issues
2. Create a new issue with details
3. Include error logs and reproduction steps

---

**Made with ❤️ for Discord communities**
````
