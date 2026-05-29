const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket, updateTicketStatus } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  customId: 'reopen_ticket',
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
        content: '❌ You do not have permission to reopen this ticket.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Restore channel
      const channel = await interaction.guild.channels.fetch(ticket.channel_id).catch(() => null);
      if (channel) {
        // Rename channel (remove 'closed-' prefix)
        const newName = channel.name.replace('closed-', '');
        await channel.setName(newName).catch(() => {});

        // Restore user permissions
        await channel.permissionOverwrites.create(ticket.user_id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(() => {});
      }

      // Update ticket status
      updateTicketStatus(ticketId, 'open');
      db.prepare('UPDATE tickets SET closed_at = NULL, reopened_count = reopened_count + 1 WHERE id = ?').run(ticketId);

      // Log audit
      logAudit(guildId, 'TICKET_REOPENED', userId, ticketId);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🟢 Ticket Reopened')
        .setDescription('This ticket has been reopened.')
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeButton);

      await interaction.channel.send({ embeds: [embed], components: [row] });

      await interaction.editReply({
        content: '✅ Ticket reopened.',
      });
    } catch (error) {
      console.error('Error reopening ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to reopen ticket.',
      });
    }
  },
};
