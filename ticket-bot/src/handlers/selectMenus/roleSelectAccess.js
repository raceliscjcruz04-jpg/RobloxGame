const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  customId: 'role_select_ticket_access',
  async execute(interaction) {
    const ticketId = interaction.customId.split('_')[4]; // Format: role_select_ticket_access_ticketId
    const selectedRoleId = interaction.values[0];
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
        content: '❌ Only staff can manage ticket access.',
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
      // Add role to channel
      await channel.permissionOverwrites.create(selectedRoleId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      // Log audit
      logAudit(guildId, 'TICKET_ROLE_GRANTED', interaction.user.id, ticketId, { role_id: selectedRoleId });

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Role Access Granted')
        .setDescription(`<@&${selectedRoleId}> has been granted access to the ticket.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error granting role access:', error);
      await interaction.reply({
        content: '❌ Failed to grant role access.',
        ephemeral: true,
      });
    }
  },
};
