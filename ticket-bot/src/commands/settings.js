const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('⚙️ Configure guild and ticket settings')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('guild')
        .setDescription('Configure guild-wide settings')
        .addIntegerOption(opt =>
          opt
            .setName('max_open_tickets')
            .setDescription('Max open tickets per user')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt
            .setName('auto_close_days')
            .setDescription('Days before auto-closing inactive tickets')
            .setMinValue(1)
            .setMaxValue(365)
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('auto_close_enabled')
            .setDescription('Enable or disable auto-close')
            .setRequired(false)
            .addChoices(
              { name: 'Enable', value: 'true' },
              { name: 'Disable', value: 'false' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('archive_category')
            .setDescription('Category name or mention for closed tickets')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('transcript_channel')
            .setDescription('Channel mention or name for transcripts')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('rating_channel')
            .setDescription('Channel mention or name for rating notifications')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View current settings')
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

    if (subcommand === 'guild') {
      await interaction.deferReply({ ephemeral: true });

      const maxOpenTickets = interaction.options.getInteger('max_open_tickets');
      const autoCloseDays = interaction.options.getInteger('auto_close_days');
      const autoCloseEnabled = interaction.options.getString('auto_close_enabled');
      const archiveCategory = interaction.options.getString('archive_category');
      const transcriptChannel = interaction.options.getString('transcript_channel');
      const ratingChannel = interaction.options.getString('rating_channel');

      const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);

      let archiveCategoryId = settings?.archive_category_id;
      let transcriptChannelId = settings?.transcript_channel_id;
      let ratingChannelId = settings?.rating_channel_id;

      // Resolve archive category
      if (archiveCategory) {
        let category;
        if (archiveCategory.startsWith('<#') && archiveCategory.endsWith('>')) {
          const categoryId = archiveCategory.slice(2, -1);
          category = await interaction.guild.channels.fetch(categoryId).catch(() => null);
        } else {
          category = interaction.guild.channels.cache.find(
            c => c.name.toLowerCase() === archiveCategory.toLowerCase() && c.isCategory()
          );
        }

        if (!category || !category.isCategory()) {
          return interaction.editReply(`❌ Archive category "${archiveCategory}" not found.`);
        }
        archiveCategoryId = category.id;
      }

      // Resolve transcript channel
      if (transcriptChannel) {
        let channel;
        if (transcriptChannel.startsWith('<#') && transcriptChannel.endsWith('>')) {
          const channelId = transcriptChannel.slice(2, -1);
          channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        } else {
          channel = interaction.guild.channels.cache.find(
            c => c.name.toLowerCase() === transcriptChannel.toLowerCase()
          );
        }

        if (!channel || !channel.isTextBased()) {
          return interaction.editReply(`❌ Transcript channel "${transcriptChannel}" not found.`);
        }
        transcriptChannelId = channel.id;
      }

      // Resolve rating channel
      if (ratingChannel) {
        let channel;
        if (ratingChannel.startsWith('<#') && ratingChannel.endsWith('>')) {
          const channelId = ratingChannel.slice(2, -1);
          channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        } else {
          channel = interaction.guild.channels.cache.find(
            c => c.name.toLowerCase() === ratingChannel.toLowerCase()
          );
        }

        if (!channel || !channel.isTextBased()) {
          return interaction.editReply(`❌ Rating channel "${ratingChannel}" not found.`);
        }
        ratingChannelId = channel.id;
      }

      // Update settings
      if (settings) {
        const updates = [];
        const values = [];

        if (maxOpenTickets !== null) {
          updates.push('max_open_tickets = ?');
          values.push(maxOpenTickets);
        }
        if (autoCloseDays !== null) {
          updates.push('auto_close_days = ?');
          values.push(autoCloseDays);
        }
        if (autoCloseEnabled !== null) {
          updates.push('auto_close_enabled = ?');
          values.push(autoCloseEnabled === 'true' ? 1 : 0);
        }
        if (archiveCategoryId) {
          updates.push('archive_category_id = ?');
          values.push(archiveCategoryId);
        }
        if (transcriptChannelId) {
          updates.push('transcript_channel_id = ?');
          values.push(transcriptChannelId);
        }
        if (ratingChannelId) {
          updates.push('rating_channel_id = ?');
          values.push(ratingChannelId);
        }

        if (updates.length > 0) {
          values.push(guildId);
          const query = `UPDATE guild_settings SET ${updates.join(', ')} WHERE guild_id = ?`;
          db.prepare(query).run(...values);
        }
      } else {
        db.prepare(`
          INSERT INTO guild_settings (guild_id, max_open_tickets, auto_close_days, auto_close_enabled, archive_category_id, transcript_channel_id, rating_channel_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          guildId,
          maxOpenTickets || 5,
          autoCloseDays || 7,
          autoCloseEnabled === 'true' ? 1 : 1,
          archiveCategoryId || null,
          transcriptChannelId || null,
          ratingChannelId || null
        );
      }

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Settings Updated')
        .addFields(
          { name: 'Max Open Tickets', value: (maxOpenTickets || settings?.max_open_tickets || 5).toString(), inline: true },
          { name: 'Auto-close Days', value: (autoCloseDays || settings?.auto_close_days || 7).toString(), inline: true },
          { name: 'Auto-close Enabled', value: (autoCloseEnabled || (settings?.auto_close_enabled ? 'true' : 'false')), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'view') {
      const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);

      if (!settings) {
        return interaction.reply({
          content: '📋 No settings configured. Use `/settings guild` to configure.',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('⚙️ Guild Settings')
        .addFields(
          { name: 'Max Open Tickets per User', value: settings.max_open_tickets.toString(), inline: true },
          { name: 'Auto-close Days', value: settings.auto_close_days.toString(), inline: true },
          { name: 'Auto-close Enabled', value: settings.auto_close_enabled ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Archive Category', value: settings.archive_category_id ? `<#${settings.archive_category_id}>` : '❌ Not set', inline: true },
          { name: 'Transcript Channel', value: settings.transcript_channel_id ? `<#${settings.transcript_channel_id}>` : '❌ Not set', inline: true },
          { name: 'Rating Channel', value: settings.rating_channel_id ? `<#${settings.rating_channel_id}>` : '❌ Not set', inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
