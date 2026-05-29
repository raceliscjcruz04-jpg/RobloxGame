const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('👮 Manage staff roles and permissions')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('role')
        .setDescription('Add/remove staff roles')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Add or remove')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('roles')
            .setDescription('Role mentions or names (comma-separated)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('level')
            .setDescription('Permission level')
            .setRequired(false)
            .addChoices(
              { name: 'Support', value: 'support' },
              { name: 'Moderator', value: 'moderator' },
              { name: 'Admin', value: 'admin' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all staff roles')
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

    if (subcommand === 'role') {
      const action = interaction.options.getString('action');
      const rolesInput = interaction.options.getString('roles');
      const level = interaction.options.getString('level') || 'support';

      const roleList = rolesInput.split(',').map(r => r.trim());
      const resolvedRoles = [];
      let errors = [];

      for (const roleInput of roleList) {
        let role;
        if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
          const roleId = roleInput.slice(3, -1);
          role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        } else {
          role = interaction.guild.roles.cache.find(
            r => r.name.toLowerCase() === roleInput.toLowerCase()
          );
        }

        if (!role) {
          errors.push(`❌ Role "${roleInput}" not found.`);
          continue;
        }
        resolvedRoles.push({ id: role.id, name: role.name });
      }

      if (action === 'add') {
        for (const role of resolvedRoles) {
          db.prepare(`
            INSERT OR REPLACE INTO staff_roles (id, guild_id, role_id, permission_level)
            VALUES (?, ?, ?, ?)
          `).run(uuidv4(), guildId, role.id, level);
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('✅ Staff Roles Added')
          .addFields(
            { name: 'Roles', value: resolvedRoles.map(r => r.name).join(', ') || 'None', inline: false },
            { name: 'Permission Level', value: level.toUpperCase(), inline: true }
          )
          .setTimestamp();

        if (errors.length > 0) {
          embed.addFields({ name: 'Errors', value: errors.join('\n') });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (action === 'remove') {
        for (const role of resolvedRoles) {
          db.prepare('DELETE FROM staff_roles WHERE guild_id = ? AND role_id = ?').run(guildId, role.id);
        }

        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('✅ Staff Roles Removed')
          .addFields(
            { name: 'Roles', value: resolvedRoles.map(r => r.name).join(', ') || 'None', inline: false }
          )
          .setTimestamp();

        if (errors.length > 0) {
          embed.addFields({ name: 'Errors', value: errors.join('\n') });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } else if (subcommand === 'list') {
      const staffRoles = db.prepare('SELECT * FROM staff_roles WHERE guild_id = ?').all(guildId);

      if (staffRoles.length === 0) {
        return interaction.reply({
          content: '📋 No staff roles configured.',
          ephemeral: true,
        });
      }

      let roleList = '';
      for (const sr of staffRoles) {
        roleList += `<@&${sr.role_id}> - **${sr.permission_level.toUpperCase()}**\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('👮 Staff Roles')
        .setDescription(roleList)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
