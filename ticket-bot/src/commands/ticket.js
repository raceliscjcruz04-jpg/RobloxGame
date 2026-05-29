const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Manage tickets')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('help')
        .setDescription('Get help with ticket commands')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('🎫 Ticket System Help')
        .addFields(
          { name: '📋 User Commands', value: '`/ticket help` - This command' },
          { name: '🎯 Panel & Category Setup', value: '`/panel create` - Create new panel\n`/panel deploy` - Deploy to channel\n`/category add` - Add categories' },
          { name: '⚙️ Configuration', value: '`/settings guild` - Configure guild settings\n`/staff role` - Manage staff\n`/permission role-command` - Set command permissions' },
          { name: '📊 Stats & Info', value: '`/stats` - View statistics\n`/setup` - Setup guide' }
        )
        .setFooter({ text: 'Use / to see all available commands' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
