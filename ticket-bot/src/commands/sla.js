const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getSLAMetrics } = require('../../utils/ratingUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sla')
    .setDescription('⏱️ View SLA metrics and response times')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('panel').setDescription('Panel name').setRequired(true)
    ),
  async execute(interaction) {
    const panelName = interaction.options.getString('panel');
    const guildId = interaction.guildId;

    const panel = db.prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?').get(guildId, panelName);
    if (!panel) {
      return interaction.reply({
        content: `❌ Panel "${panelName}" not found.`,
        ephemeral: true,
      });
    }

    const metrics = getSLAMetrics(panel.id);

    const embed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle(`⏱️ SLA Metrics - ${panelName}`)
      .addFields(
        { name: 'Avg Response Time', value: metrics.avg_response_time ? `${Math.round(metrics.avg_response_time)} minutes` : 'N/A', inline: true },
        { name: 'Avg Resolution Time', value: metrics.avg_resolution_time ? `${Math.round(metrics.avg_resolution_time)} minutes` : 'N/A', inline: true },
        { name: 'SLA Breaches', value: metrics.breaches?.toString() || '0', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
