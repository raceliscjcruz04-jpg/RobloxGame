const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket, addTicketMember, removeTicketMember, getTicketMembers } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manage')
    .setDescription('🛠️ Manage ticket properties and access')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('priority')
        .setDescription('Set ticket priority')
        .addStringOption(opt =>
          opt
            .setName('ticket_id')
            .setDescription('Ticket ID')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('level')
            .setDescription('Priority level')
            .setRequired(true)
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Normal', value: 'normal' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('rename')
        .setDescription('Rename a ticket channel')
        .addStringOption(opt =>
          opt.setName('ticket_id').setDescription('Ticket ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('new_name').setDescription('New channel name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Get ticket information')
        .addStringOption(opt =>
          opt.setName('ticket_id').setDescription('Ticket ID').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('members')
        .setDescription('View or manage ticket members')
        .addStringOption(opt =>
          opt.setName('ticket_id').setDescription('Ticket ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('action').setDescription('View or remove').addChoices(
            { name: 'View', value: 'view' },
            { name: 'Remove', value: 'remove' }
          )
        )
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    // Check if staff
    const isStaff = db.prepare(`
      SELECT * FROM staff_roles WHERE guild_id = ? AND role_id IN (${interaction.member.roles.cache.map(() => '?').join(',')})
    `).get(guildId, ...interaction.member.roles.cache.map(r => r.id));

    if (!isStaff && !interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ Only staff can manage tickets.',
        ephemeral: true,
      });
    }

    const ticketId = interaction.options.getString('ticket_id');
    const ticket = getTicket(ticketId);

    if (!ticket) {
      return interaction.reply({
        content: '❌ Ticket not found.',
        ephemeral: true,
      });
    }

    if (subcommand === 'priority') {
      const level = interaction.options.getString('level');
      db.prepare('UPDATE tickets SET priority = ? WHERE id = ?').run(level, ticketId);
      logAudit(guildId, 'TICKET_PRIORITY_CHANGED', interaction.user.id, ticketId, { priority: level });

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Priority Updated')
        .addFields(
          { name: 'Ticket ID', value: ticketId, inline: true },
          { name: 'Priority', value: level.toUpperCase(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'rename') {
      const newName = interaction.options.getString('new_name').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const channel = await interaction.guild.channels.fetch(ticket.channel_id).catch(() => null);

      if (!channel) {
        return interaction.reply({
          content: '❌ Ticket channel not found.',
          ephemeral: true,
        });
      }

      await channel.setName(newName).catch(() => {});
      logAudit(guildId, 'TICKET_RENAMED', interaction.user.id, ticketId, { new_name: newName });

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Channel Renamed')
        .addFields(
          { name: 'New Name', value: newName, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'info') {
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(ticket.category_id);
      const panel = db.prepare('SELECT * FROM panels WHERE id = ?').get(ticket.panel_id);

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`🎫 Ticket Information - ${ticketId}`)
        .addFields(
          { name: 'User', value: `<@${ticket.user_id}>`, inline: true },
          { name: 'Status', value: ticket.status.toUpperCase(), inline: true },
          { name: 'Priority', value: ticket.priority.toUpperCase(), inline: true },
          { name: 'Panel', value: panel?.panel_name || 'Unknown', inline: true },
          { name: 'Category', value: category?.category_name || 'Unknown', inline: true },
          { name: 'Claimed By', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'Unclaimed', inline: true },
          { name: 'Created At', value: new Date(ticket.created_at).toLocaleString(), inline: false },
          { name: 'Closed At', value: ticket.closed_at ? new Date(ticket.closed_at).toLocaleString() : 'Open', inline: true },
          { name: 'Reopened Count', value: ticket.reopened_count.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'members') {
      const action = interaction.options.getString('action') || 'view';

      if (action === 'view') {
        const members = getTicketMembers(ticketId);

        if (members.length === 0) {
          return interaction.reply({
            content: '📋 No additional members.',
            ephemeral: true,
          });
        }

        let memberList = '';
        for (const member of members) {
          memberList += `<@${member.user_id}> - ${member.can_message ? 'Can message' : 'View only'}\n`;
        }

        const embed = new EmbedBuilder()
          .setColor('#2f3136')
          .setTitle('Members')
          .setDescription(memberList)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
