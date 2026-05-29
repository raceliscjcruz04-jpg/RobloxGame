const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket, addTicketMember, removeTicketMember } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  customId: 'user_select_ticket_member',
  async execute(interaction) {
    const ticketId = interaction.customId.split('_')[4]; // Format: user_select_ticket_member_ticketId
    const selectedUserId = interaction.values[0];
    const guildId = interaction.guildId;

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

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Only staff can add members to tickets.',
        ephemeral: true,
      });
    }

    const channel = await interaction.guild.channels.fetch(ticket.channel_id).catch(() => null);
    if (!channel) {
      return interaction.reply({
        content: '❌ Ticket channel not found.',
        ephemeral: true,
      });
    }

    try {
      // Add user to channel
      await channel.permissionOverwrites.create(selectedUserId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      // Add to database
      addTicketMember(ticketId, selectedUserId, true);

      // Log audit
      logAudit(guildId, 'TICKET_MEMBER_ADDED', interaction.user.id, ticketId, { added_user: selectedUserId });

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Member Added')
        .setDescription(`<@${selectedUserId}> has been added to the ticket.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error adding member:', error);
      await interaction.reply({
        content: '❌ Failed to add member to ticket.',
        ephemeral: true,
      });
    }
  },
};
