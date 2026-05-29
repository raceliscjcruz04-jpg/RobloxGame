const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');
const { createTicket, addTicketMember } = require('../../utils/ticketUtils');
const { logAudit } = require('../../utils/auditUtils');

module.exports = {
  customId: 'category_select',
  async execute(interaction) {
    const selectedCategoryId = interaction.values[0];
    const panelId = interaction.customId.split('_')[2]; // Format: category_select_panelId
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Check open tickets limit
    const settings = db.prepare('SELECT max_open_tickets FROM guild_settings WHERE guild_id = ?').get(guildId);
    const maxTickets = settings?.max_open_tickets || 5;
    
    const openTickets = db.prepare(`
      SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND user_id = ? AND status = ?
    `).get(guildId, userId, 'open').count;

    if (openTickets >= maxTickets) {
      return interaction.reply({
        content: `❌ You have reached the maximum number of open tickets (${maxTickets}). Please close some tickets first.`,
        ephemeral: true,
      });
    }

    // Get panel and category info
    const panel = db.prepare('SELECT * FROM panels WHERE id = ?').get(panelId);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(selectedCategoryId);

    if (!panel || !category) {
      return interaction.reply({
        content: '❌ Panel or category not found.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Create ticket channel
      const channelName = `ticket-${Date.now().toString().slice(-5)}`;
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: 0, // Text channel
        topic: `Ticket for ${interaction.user.username} | Category: ${category.category_name}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ['ViewChannel'],
          },
          {
            id: userId,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
        ],
      });

      // Add staff roles to channel
      const staffRoles = db.prepare('SELECT role_id FROM staff_roles WHERE guild_id = ?').all(guildId);
      for (const staff of staffRoles) {
        await ticketChannel.permissionOverwrites.create(staff.role_id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(() => {});
      }

      // Create ticket in database
      const ticketId = createTicket(guildId, userId, panelId, selectedCategoryId, ticketChannel.id);

      // Send welcome message
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`${category.emoji} ${category.category_name} Ticket`)
        .setDescription(`Thank you for creating a ticket! Our support team will assist you shortly.`)
        .addFields(
          { name: 'Ticket ID', value: ticketId, inline: true },
          { name: 'Category', value: category.category_name, inline: true },
          { name: 'Status', value: '🟢 Open', inline: true }
        )
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const claimButton = new ButtonBuilder()
        .setCustomId(`claim_ticket_${ticketId}`)
        .setLabel('Claim')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

      await ticketChannel.send({ embeds: [welcomeEmbed], components: [row] });

      // Log audit
      logAudit(guildId, 'TICKET_CREATED', userId, ticketId, { panel: panel.panel_name, category: category.category_name });

      await interaction.editReply({
        content: `✅ Ticket created! <#${ticketChannel.id}>`,
      });
    } catch (error) {
      console.error('Error creating ticket from select:', error);
      await interaction.editReply({
        content: '❌ Failed to create ticket. Please try again.',
      });
    }
  },
};
