const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { getTicket } = require('../../utils/ticketUtils');
const { createRating } = require('../../utils/ratingUtils');
const { logAudit } = require('../../utils/auditUtils');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  customId: 'rating_modal',
  async execute(interaction) {
    const ticketId = interaction.customId.split('_')[2];
    const rating = parseInt(interaction.fields.getTextInputValue('rating_stars'));
    const comment = interaction.fields.getTextInputValue('rating_comment');

    // Validate rating
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return interaction.reply({
        content: '❌ Please enter a valid rating between 1 and 5.',
        ephemeral: true,
      });
    }

    const ticket = getTicket(ticketId);
    if (!ticket) {
      return interaction.reply({
        content: '❌ Ticket not found.',
        ephemeral: true,
      });
    }

    // Create rating
    createRating(ticketId, interaction.user.id, ticket.panel_id, rating, comment);

    // Log audit
    logAudit(ticket.guild_id, 'TICKET_RATED', interaction.user.id, ticketId, { rating, comment });

    // Send to rating channel if configured
    const settings = db.prepare('SELECT rating_channel_id FROM guild_settings WHERE guild_id = ?').get(ticket.guild_id);
    if (settings?.rating_channel_id) {
      const ratingChannel = await interaction.guild.channels.fetch(settings.rating_channel_id).catch(() => null);
      if (ratingChannel) {
        const ratingEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('⭐ New Ticket Rating')
          .addFields(
            { name: 'Ticket ID', value: ticketId, inline: true },
            { name: 'Rating', value: '⭐'.repeat(rating), inline: true },
            { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Comment', value: comment || 'No comment provided' }
          )
          .setTimestamp();

        await ratingChannel.send({ embeds: [ratingEmbed] }).catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Rating Submitted')
      .setDescription(`Thank you for rating! Your rating of ${rating} star${rating !== 1 ? 's' : ''} has been recorded.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
