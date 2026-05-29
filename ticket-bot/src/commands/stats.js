const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('📊 View ticket system statistics')
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;

    await interaction.deferReply({ ephemeral: true });

    // Get statistics
    const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?').get(guildId).count;
    const openTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = ?').get(guildId, 'open').count;
    const closedTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = ?').get(guildId, 'closed').count;
    const avgRating = db.prepare('SELECT AVG(rating) as avg FROM ratings WHERE guild_id = ?').get(guildId).avg;
    const totalRatings = db.prepare('SELECT COUNT(*) as count FROM ratings WHERE guild_id = ?').get(guildId).count;

    // Get tickets by category
    const byCategory = db.prepare(`
      SELECT c.category_name, COUNT(t.id) as count
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.guild_id = ?
      GROUP BY t.category_id
    `).all(guildId);

    let categoryBreakdown = byCategory.length > 0 ? '' : 'No data';
    for (const cat of byCategory) {
      categoryBreakdown += `${cat.category_name}: ${cat.count}\n`;
    }

    const embed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle('📊 Ticket Statistics')
      .addFields(
        { name: '📈 Total Tickets', value: totalTickets.toString(), inline: true },
        { name: '🟢 Open Tickets', value: openTickets.toString(), inline: true },
        { name: '🔴 Closed Tickets', value: closedTickets.toString(), inline: true },
        { name: '⭐ Average Rating', value: avgRating ? avgRating.toFixed(2) : 'N/A', inline: true },
        { name: '⭐ Total Ratings', value: totalRatings.toString(), inline: true },
        { name: 'Breakdown by Category', value: `\`\`\`${categoryBreakdown}\`\`\``, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
