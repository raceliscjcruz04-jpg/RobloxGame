const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');
const { createTemplate, getCategoryTemplates } = require('../../utils/tagUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('template')
    .setDescription('📄 Manage response templates')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a response template')
        .addStringOption(opt =>
          opt.setName('panel').setDescription('Panel name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('category').setDescription('Category name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('name').setDescription('Template name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('content').setDescription('Template content').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List templates for a category')
        .addStringOption(opt =>
          opt.setName('panel').setDescription('Panel name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('category').setDescription('Category name').setRequired(true)
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
      const panelName = interaction.options.getString('panel');
      const categoryName = interaction.options.getString('category');
      const templateName = interaction.options.getString('name');
      const content = interaction.options.getString('content');

      const panel = db.prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?').get(guildId, panelName);
      if (!panel) {
        return interaction.reply({
          content: `❌ Panel "${panelName}" not found.`,
          ephemeral: true,
        });
      }

      const category = db.prepare('SELECT * FROM categories WHERE panel_id = ? AND category_name = ?').get(panel.id, categoryName);
      if (!category) {
        return interaction.reply({
          content: `❌ Category "${categoryName}" not found.`,
          ephemeral: true,
        });
      }

      createTemplate(panel.id, category.id, templateName, content);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Template Created')
        .addFields(
          { name: 'Template Name', value: templateName, inline: true },
          { name: 'Category', value: categoryName, inline: true },
          { name: 'Content', value: content }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'list') {
      const panelName = interaction.options.getString('panel');
      const categoryName = interaction.options.getString('category');

      const panel = db.prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?').get(guildId, panelName);
      if (!panel) {
        return interaction.reply({
          content: `❌ Panel "${panelName}" not found.`,
          ephemeral: true,
        });
      }

      const category = db.prepare('SELECT * FROM categories WHERE panel_id = ? AND category_name = ?').get(panel.id, categoryName);
      if (!category) {
        return interaction.reply({
          content: `❌ Category "${categoryName}" not found.`,
          ephemeral: true,
        });
      }

      const templates = getCategoryTemplates(category.id);

      if (templates.length === 0) {
        return interaction.reply({
          content: '📋 No templates for this category.',
          ephemeral: true,
        });
      }

      let templateList = '';
      for (const template of templates) {
        templateList += `**${template.template_name}**\n${template.content}\n\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`📄 Templates - ${categoryName}`)
        .setDescription(templateList)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
