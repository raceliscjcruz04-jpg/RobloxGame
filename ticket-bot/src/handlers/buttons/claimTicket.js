const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket, claimTicket, unclaimTicket } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  customId: 'claim_ticket',
  async execute(interaction) {
    const ticketId = interaction.customId.split('_')[2];
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const ticket = getTicket(ticketId);
    if (!ticket) {
      return interaction.reply({
        content: '❌ Ticket not found.',
        ephemeral: true,
      });
    }

    // Check if staff
    const isStaff = db.prepare(`
      SELECT * FROM staff_roles WHERE guild_id = ? AND role_id IN (${interaction.member.roles.cache.map(() => '?').join(',')})
    `).get(guildId, ...interaction.member.roles.cache.map(r => r.id));

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Only staff can claim tickets.',
        ephemeral: true,
      });
    }

    if (ticket.claimed_by === userId) {
      // Unclaim
      unclaimTicket(ticketId);
      logAudit(guildId, 'TICKET_UNCLAIMED', userId, ticketId);

      const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('🔄 Ticket Unclaimed')
        .setDescription(`${interaction.user.username} has unclaimed this ticket.`);

      await interaction.reply({ embeds: [embed] });
    } else if (ticket.claimed_by) {
      return interaction.reply({
        content: `❌ This ticket is already claimed by <@${ticket.claimed_by}>.`,
        ephemeral: true,
      });
    } else {
      // Claim
      claimTicket(ticketId, userId);
      logAudit(guildId, 'TICKET_CLAIMED', userId, ticketId);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Ticket Claimed')
        .setDescription(`${interaction.user.username} has claimed this ticket.`);

      await interaction.reply({ embeds: [embed] });
    }
  },
};
