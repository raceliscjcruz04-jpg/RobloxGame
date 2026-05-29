const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('category')
    .setDescription('🏷️ Manage ticket categories')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a category to a panel')
        .addStringOption(opt =>
          opt.setName('panel').setDescription('Panel name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('category').setDescription('Category name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('emoji').setDescription('Category emoji').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List categories in a panel')
        .addStringOption(opt =>
          opt.setName('panel').setDescription('Panel name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a category')
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

    if (subcommand === 'add') {
      const panelName = interaction.options.getString('panel');
      const categoryName = interaction.options.getString('category');
      const emoji = interaction.options.getString('emoji') || '📦';

      // Find panel
      const panel = db
        .prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?')
        .get(guildId, panelName);

      if (!panel) {
        return interaction.reply({
          content: `❌ Panel "${panelName}" not found.`,
          ephemeral: true,
        });
      }

      // Check if category already exists
      const existing = db
        .prepare('SELECT * FROM categories WHERE panel_id = ? AND category_name = ?')
        .get(panel.id, categoryName);

      if (existing) {
        return interaction.reply({
          content: `❌ Category "${categoryName}" already exists in this panel.`,
          ephemeral: true,
        });
      }

      const categoryId = uuidv4();
      db.prepare(`
        INSERT INTO categories (id, guild_id, panel_id, category_name, emoji)
        VALUES (?, ?, ?, ?, ?)
      `).run(categoryId, guildId, panel.id, categoryName, emoji);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Category Added')
        .addFields(
          { name: 'Panel', value: panelName, inline: true },
          { name: 'Category', value: `${emoji} ${categoryName}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'list') {
      const panelName = interaction.options.getString('panel');

      const panel = db
        .prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?')
        .get(guildId, panelName);

      if (!panel) {
        return interaction.reply({
          content: `❌ Panel "${panelName}" not found.`,
          ephemeral: true,
        });
      }

      const categories = db
        .prepare('SELECT * FROM categories WHERE panel_id = ?')
        .all(panel.id);

      if (categories.length === 0) {
        return interaction.reply({
          content: `📋 No categories in panel "${panelName}".`,
          ephemeral: true,
        });
      }

      let categoryList = '';
      for (const cat of categories) {
        categoryList += `${cat.emoji} **${cat.category_name}**\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`📋 Categories in "${panelName}"`)
        .setDescription(categoryList)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'delete') {
      const panelName = interaction.options.getString('panel');
      const categoryName = interaction.options.getString('category');

      const panel = db
        .prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?')
        .get(guildId, panelName);

      if (!panel) {
        return interaction.reply({
          content: `❌ Panel "${panelName}" not found.`,
          ephemeral: true,
        });
      }

      const category = db
        .prepare('SELECT * FROM categories WHERE panel_id = ? AND category_name = ?')
        .get(panel.id, categoryName);

      if (!category) {
        return interaction.reply({
          content: `❌ Category "${categoryName}" not found.`,
          ephemeral: true,
        });
      }

      // Cascade delete
      db.prepare('DELETE FROM forms WHERE category_id = ?').run(category.id);
      db.prepare('DELETE FROM tickets WHERE category_id = ?').run(category.id);
      db.prepare('DELETE FROM categories WHERE id = ?').run(category.id);

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('✅ Category Deleted')
        .setDescription(`Category "${categoryName}" and all associated tickets have been deleted.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
