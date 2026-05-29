const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket, updateTicketStatus } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  customId: 'close_ticket',
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

    // Check permissions
    const isStaff = db.prepare(`
      SELECT * FROM staff_roles WHERE guild_id = ? AND role_id IN (${interaction.member.roles.cache.map(() => '?').join(',')})
    `).get(guildId, ...interaction.member.roles.cache.map(r => r.id));

    const isAuthor = ticket.user_id === userId;

    if (!isStaff && !isAuthor) {
      return interaction.reply({
        content: '❌ You do not have permission to close this ticket.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Archive channel
      const channel = await interaction.guild.channels.fetch(ticket.channel_id).catch(() => null);
      if (channel) {
        // Rename channel
        await channel.setName(`closed-${channel.name}`).catch(() => {});

        // Remove user permissions
        await channel.permissionOverwrites.delete(ticket.user_id).catch(() => {});
      }

      // Update ticket status
      updateTicketStatus(ticketId, 'closed');
      db.prepare('UPDATE tickets SET closed_at = CURRENT_TIMESTAMP WHERE id = ?').run(ticketId);

      // Log audit
      logAudit(guildId, 'TICKET_CLOSED', userId, ticketId);

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔴 Ticket Closed')
        .setDescription('This ticket has been closed. You can reopen it if needed.')
        .setTimestamp();

      const reopenButton = new ButtonBuilder()
        .setCustomId(`reopen_ticket_${ticketId}`)
        .setLabel('Reopen')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(reopenButton);

      await interaction.channel.send({ embeds: [embed], components: [row] });

      await interaction.editReply({
        content: '✅ Ticket closed.',
      });
    } catch (error) {
      console.error('Error closing ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to close ticket.',
      });
    }
  },
};
