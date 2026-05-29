const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getAuditLogs } = require('../../utils/auditUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audit')
    .setDescription('📜 View audit logs')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of logs to show').setMinValue(1).setMaxValue(50)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to run this command.',
        ephemeral: true,
      });
    }

    const limit = interaction.options.getInteger('limit') || 20;
    const guildId = interaction.guildId;

    const logs = getAuditLogs(guildId, limit);

    if (logs.length === 0) {
      return interaction.reply({
        content: '📋 No audit logs found.',
        ephemeral: true,
      });
    }

    let logList = '';
    for (const log of logs) {
      const date = new Date(log.created_at).toLocaleString();
      logList += `**${log.action}** (${date})\n`;
      if (log.user_id) logList += `User: <@${log.user_id}>\n`;
      if (log.ticket_id) logList += `Ticket: ${log.ticket_id}\n`;
      logList += '\n';
    }

    const embed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle('📜 Audit Logs')
      .setDescription(logList)
      .setFooter({ text: `Showing ${logs.length} most recent logs` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
