const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('🎫 Manage ticket panels')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new ticket panel')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Panel name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('description').setDescription('Panel description').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('deploy')
        .setDescription('Deploy panel to a channel')
        .addStringOption(opt =>
          opt.setName('panel').setDescription('Panel name').setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel mention or name')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('display_type')
            .setDescription('Display type: buttons or dropdown')
            .setRequired(true)
            .addChoices(
              { name: 'Buttons', value: 'buttons' },
              { name: 'Dropdown', value: 'dropdown' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all panels')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a panel')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Panel name').setRequired(true)
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
      const panelName = interaction.options.getString('name');
      const description = interaction.options.getString('description') || 'Create a ticket';

      const existingPanel = db
        .prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?')
        .get(guildId, panelName);

      if (existingPanel) {
        return interaction.reply({
          content: `❌ Panel "${panelName}" already exists.`,
          ephemeral: true,
        });
      }

      const panelId = uuidv4();
      db.prepare(`
        INSERT INTO panels (id, guild_id, panel_name, description)
        VALUES (?, ?, ?, ?)
      `).run(panelId, guildId, panelName, description);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Panel Created')
        .addFields(
          { name: 'Panel Name', value: panelName, inline: true },
          { name: 'Description', value: description, inline: true },
          { name: 'Next Steps', value: '1. `/category add` to add categories\n2. `/panel deploy` to send to a channel' }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'deploy') {
      const panelName = interaction.options.getString('panel');
      const channelInput = interaction.options.getString('channel');
      const displayType = interaction.options.getString('display_type');

      await interaction.deferReply({ ephemeral: true });

      // Find panel
      const panel = db
        .prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?')
        .get(guildId, panelName);

      if (!panel) {
        return interaction.editReply(`❌ Panel "${panelName}" not found.`);
      }

      // Resolve channel
      let channel;
      if (channelInput.startsWith('<#') && channelInput.endsWith('>')) {
        const channelId = channelInput.slice(2, -1);
        channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      } else {
        channel = interaction.guild.channels.cache.find(
          c => c.name.toLowerCase() === channelInput.toLowerCase()
        );
      }

      if (!channel || !channel.isTextBased()) {
        return interaction.editReply(`❌ Channel "${channelInput}" not found or not a text channel.`);
      }

      // Get categories
      const categories = db
        .prepare('SELECT * FROM categories WHERE panel_id = ?')
        .all(panel.id);

      if (categories.length === 0) {
        return interaction.editReply(
          `❌ Panel "${panelName}" has no categories. Add categories with /category add`
        );
      }

      // Create panel message
      const panelEmbed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`🎫 ${panel.panel_name}`)
        .setDescription(panel.description)
        .addFields(
          { name: 'Available Categories', value: categories.map(c => `${c.emoji || '📦'} ${c.category_name}`).join('\n') }
        )
        .setFooter({ text: 'Click a button or select a category to create a ticket' })
        .setTimestamp();

      try {
        const message = await channel.send({ embeds: [panelEmbed] });

        // Update panel with message and channel info
        db.prepare(`
          UPDATE panels SET message_id = ?, channel_id = ?, display_type = ? WHERE id = ?
        `).run(message.id, channel.id, displayType, panel.id);

        const successEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('✅ Panel Deployed')
          .addFields(
            { name: 'Channel', value: `<#${channel.id}>`, inline: true },
            { name: 'Display Type', value: displayType === 'buttons' ? '🔘 Buttons' : '📋 Dropdown', inline: true },
            { name: 'Categories', value: categories.length.toString(), inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
      } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Failed to send panel to channel. Check bot permissions.');
      }
    } else if (subcommand === 'list') {
      const panels = db.prepare('SELECT * FROM panels WHERE guild_id = ?').all(guildId);

      if (panels.length === 0) {
        return interaction.reply({
          content: '📋 No panels created yet. Use `/panel create` to create one.',
          ephemeral: true,
        });
      }

      let panelList = '';
      for (const p of panels) {
        const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories WHERE panel_id = ?').get(p.id).count;
        panelList += `**${p.panel_name}** (${categoryCount} categories)\n${p.description}\n\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('📋 Ticket Panels')
        .setDescription(panelList)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'delete') {
      const panelName = interaction.options.getString('name');

      const panel = db
        .prepare('SELECT * FROM panels WHERE guild_id = ? AND panel_name = ?')
        .get(guildId, panelName);

      if (!panel) {
        return interaction.reply({
          content: `❌ Panel "${panelName}" not found.`,
          ephemeral: true,
        });
      }

      // Cascade delete
      db.prepare('DELETE FROM categories WHERE panel_id = ?').run(panel.id);
      db.prepare('DELETE FROM forms WHERE panel_id = ?').run(panel.id);
      db.prepare('DELETE FROM panels WHERE id = ?').run(panel.id);

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('✅ Panel Deleted')
        .setDescription(`Panel "${panelName}" and all associated data have been deleted.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
