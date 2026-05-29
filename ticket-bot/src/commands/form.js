const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');
const { createForm, addFormQuestion, getFormQuestions } = require('../../utils/formUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('form')
    .setDescription('📋 Create and manage custom ticket forms')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a form for a category')
        .addStringOption(opt =>
          opt.setName('panel').setDescription('Panel name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('category').setDescription('Category name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add-question')
        .setDescription('Add a question to a form')
        .addStringOption(opt =>
          opt.setName('panel').setDescription('Panel name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('category').setDescription('Category name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('question').setDescription('Question text').setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Question type')
            .setRequired(true)
            .addChoices(
              { name: 'Short Text', value: 'text' },
              { name: 'Long Text', value: 'paragraph' },
              { name: 'Dropdown', value: 'dropdown' },
              { name: 'User Select', value: 'user' },
              { name: 'Role Select', value: 'role' },
              { name: 'Channel Select', value: 'channel' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('step').setDescription('Step number (for multi-step forms)').setMinValue(1).setMaxValue(10)
        )
        .addStringOption(opt =>
          opt.setName('required').setDescription('Is this required?').addChoices(
            { name: 'Yes', value: 'true' },
            { name: 'No', value: 'false' }
          )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View a form')
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

      const existingForm = db.prepare('SELECT * FROM forms WHERE panel_id = ? AND category_id = ?').get(panel.id, category.id);
      if (existingForm) {
        return interaction.reply({
          content: '❌ A form already exists for this category.',
          ephemeral: true,
        });
      }

      createForm(panel.id, category.id);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Form Created')
        .addFields(
          { name: 'Panel', value: panelName, inline: true },
          { name: 'Category', value: categoryName, inline: true },
          { name: 'Next Step', value: 'Use `/form add-question` to add questions' }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'add-question') {
      const panelName = interaction.options.getString('panel');
      const categoryName = interaction.options.getString('category');
      const questionText = interaction.options.getString('question');
      const questionType = interaction.options.getString('type');
      const step = interaction.options.getInteger('step') || 1;
      const required = interaction.options.getString('required') !== 'false';

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

      const form = db.prepare('SELECT * FROM forms WHERE panel_id = ? AND category_id = ?').get(panel.id, category.id);
      if (!form) {
        return interaction.reply({
          content: '❌ No form exists for this category. Use `/form create` first.',
          ephemeral: true,
        });
      }

      addFormQuestion(form.id, questionText, questionType, step, required);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Question Added')
        .addFields(
          { name: 'Question', value: questionText, inline: false },
          { name: 'Type', value: questionType, inline: true },
          { name: 'Required', value: required ? 'Yes' : 'No', inline: true },
          { name: 'Step', value: step.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'view') {
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

      const form = db.prepare('SELECT * FROM forms WHERE panel_id = ? AND category_id = ?').get(panel.id, category.id);
      if (!form) {
        return interaction.reply({
          content: '📋 No form for this category.',
          ephemeral: true,
        });
      }

      const questions = getFormQuestions(form.id);

      let questionList = '';
      for (const q of questions) {
        questionList += `**${q.question_text}** (${q.question_type}, ${q.required ? 'Required' : 'Optional'})\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`📋 Form - ${categoryName}`)
        .setDescription(questionList || 'No questions yet')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
