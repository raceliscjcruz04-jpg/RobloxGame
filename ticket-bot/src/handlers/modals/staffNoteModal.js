const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { addStaffNote } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  customId: 'staff_note_modal',
  async execute(interaction) {
    const ticketId = interaction.customId.split('_')[3];
    const noteContent = interaction.fields.getTextInputValue('note_content');

    addStaffNote(ticketId, interaction.user.id, noteContent);
    logAudit(interaction.guildId, 'STAFF_NOTE_ADDED', interaction.user.id, ticketId);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Note Added')
      .setDescription('Your internal note has been saved.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
