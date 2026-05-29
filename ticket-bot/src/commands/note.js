const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getStaffNotes } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('📝 Manage internal ticket notes (staff only)')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add an internal note to a ticket')
        .addStringOption(opt =>
          opt.setName('ticket_id').setDescription('Ticket ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('content').setDescription('Note content').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View all notes for a ticket')
        .addStringOption(opt =>
          opt.setName('ticket_id').setDescription('Ticket ID').setRequired(true)
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
        content: '❌ Only staff can manage notes.',
        ephemeral: true,
      });
    }

    if (subcommand === 'add') {
      const ticketId = interaction.options.getString('ticket_id');
      const content = interaction.options.getString('content');

      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket not found.',
          ephemeral: true,
        });
      }

      const { addStaffNote } = require('../../utils/ticketUtils');
      addStaffNote(ticketId, interaction.user.id, content);
      logAudit(guildId, 'STAFF_NOTE_ADDED', interaction.user.id, ticketId);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Note Added')
        .addFields(
          { name: 'Ticket ID', value: ticketId, inline: true },
          { name: 'Added By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Content', value: content }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'view') {
      const ticketId = interaction.options.getString('ticket_id');

      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket not found.',
          ephemeral: true,
        });
      }

      const notes = getStaffNotes(ticketId);

      if (notes.length === 0) {
        return interaction.reply({
          content: '📋 No notes for this ticket.',
          ephemeral: true,
        });
      }

      let noteList = '';
      for (const note of notes) {
        const date = new Date(note.created_at).toLocaleString();
        noteList += `**${date}** - <@${note.staff_id}>\n${note.note_content}\n\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`📝 Notes for Ticket ${ticketId}`)
        .setDescription(noteList)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
