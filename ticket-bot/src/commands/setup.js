const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('🛠️ Interactive setup guide for the ticket system')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to run this command.',
        ephemeral: true,
      });
    }

    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Initialize guild settings if not exists
    const existingSettings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    if (!existingSettings) {
      db.prepare(`
        INSERT INTO guild_settings (guild_id) VALUES (?)
      `).run(guildId);
    }

    const embed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle('🎫 Ticket System Setup Guide')
      .setDescription('Welcome! This guide will help you set up the ticket system. Follow the steps below:')
      .addFields(
        { name: '📋 Step 1: Create a Panel', value: '`/panel create` - Create a new ticket panel', inline: false },
        { name: '🏷️ Step 2: Add Categories', value: '`/category add` - Add categories to your panel', inline: false },
        { name: '👮 Step 3: Configure Staff Roles', value: '`/staff role add` - Add staff roles with permissions', inline: false },
        { name: '⚙️ Step 4: Configure Guild Settings', value: '`/settings guild` - Set max tickets, auto-close, etc.', inline: false },
        { name: '📝 Step 5: Create Forms (Optional)', value: '`/form create` - Create custom forms for categories', inline: false },
        { name: '🔐 Step 6: Role Permissions (Optional)', value: '`/permission role-command` - Restrict commands by role', inline: false },
        { name: '📤 Step 7: Deploy Panel', value: '`/panel deploy` - Send the panel to a channel', inline: false },
        { name: '📊 Additional Commands', value: '`/ticket` - Manage tickets\n`/settings` - View/edit settings\n`/stats` - View statistics', inline: false },
      )
      .setFooter({ text: 'Type the command to get started! Use /ticket help for more info.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
