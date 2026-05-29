const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket } = require('../../utils/ticketUtils');
const { createRating, hasUserRated } = require('../../utils/ratingUtils');
const { logAudit } = require('../../utils/auditUtils');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  customId: 'rate_ticket',
  async execute(interaction) {
    const ticketId = interaction.customId.split('_')[2];
    const ticket = getTicket(ticketId);

    if (!ticket) {
      return interaction.reply({
        content: '❌ Ticket not found.',
        ephemeral: true,
      });
    }

    // Check if already rated
    if (hasUserRated(ticketId, interaction.user.id, ticket.panel_id)) {
      return interaction.reply({
        content: '❌ You have already rated this ticket.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`rating_modal_${ticketId}`)
      .setTitle('Rate Your Experience');

    const starSelect = new TextInputBuilder()
      .setCustomId('rating_stars')
      .setLabel('Rating (1-5 stars)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter a number 1-5')
      .setMinLength(1)
      .setMaxLength(1);

    const commentInput = new TextInputBuilder()
      .setCustomId('rating_comment')
      .setLabel('Comment (Optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(starSelect),
      new ActionRowBuilder().addComponents(commentInput)
    );

    await interaction.showModal(modal);
  },
};
