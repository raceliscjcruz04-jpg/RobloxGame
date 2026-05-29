const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');
const { createTag, getGuildTags, deleteTag } = require('../../utils/tagUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('🏷️ Manage ticket tags')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new tag')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Tag name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('color').setDescription('Tag color (hex, e.g. #FF0000)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all tags')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a tag')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Tag name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add-to-ticket')
        .setDescription('Add tag to a ticket')
        .addStringOption(opt =>
          opt.setName('ticket_id').setDescription('Ticket ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('tag_name').setDescription('Tag name').setRequired(true)
        )
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to run this command.',
        ephemeral: true,
      });
    }

    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const tagName = interaction.options.getString('name');
      const color = interaction.options.getString('color') || '#7289da';

      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
          content: '❌ Invalid color format. Use hex format: #FF0000',
          ephemeral: true,
        });
      }

      const tagId = createTag(guildId, tagName, color);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('✅ Tag Created')
        .addFields(
          { name: 'Tag Name', value: tagName, inline: true },
          { name: 'Color', value: color, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'list') {
      const tags = getGuildTags(guildId);

      if (tags.length === 0) {
        return interaction.reply({
          content: '📋 No tags created yet.',
          ephemeral: true,
        });
      }

      let tagList = '';
      for (const tag of tags) {
        tagList += `**${tag.tag_name}** (${tag.color})\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('🏷️ Tags')
        .setDescription(tagList)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'delete') {
      const tagName = interaction.options.getString('name');
      const tag = db.prepare('SELECT * FROM ticket_tags WHERE guild_id = ? AND tag_name = ?').get(guildId, tagName);

      if (!tag) {
        return interaction.reply({
          content: `❌ Tag "${tagName}" not found.`,
          ephemeral: true,
        });
      }

      deleteTag(tag.id);

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('✅ Tag Deleted')
        .setDescription(`Tag "${tagName}" has been deleted.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'add-to-ticket') {
      const ticketId = interaction.options.getString('ticket_id');
      const tagName = interaction.options.getString('tag_name');

      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket not found.',
          ephemeral: true,
        });
      }

      const tag = db.prepare('SELECT * FROM ticket_tags WHERE guild_id = ? AND tag_name = ?').get(guildId, tagName);
      if (!tag) {
        return interaction.reply({
          content: `❌ Tag "${tagName}" not found.`,
          ephemeral: true,
        });
      }

      const { addTagToTicket } = require('../../utils/ticketUtils');
      const added = addTagToTicket(ticketId, tag.id);

      if (!added) {
        return interaction.reply({
          content: '❌ Tag already added to ticket.',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Tag Added')
        .addFields(
          { name: 'Ticket ID', value: ticketId, inline: true },
          { name: 'Tag', value: tagName, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
