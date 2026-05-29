const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('permission')
    .setDescription('🔐 Manage command role permissions')
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('role-command')
        .setDescription('Allow or deny roles from using specific commands')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Allow or Deny')
            .setRequired(true)
            .addChoices(
              { name: 'Allow', value: 'allow' },
              { name: 'Deny', value: 'deny' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('roles')
            .setDescription('Role names or mentions (comma-separated, e.g: "@Staff, Moderator, @Support")')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('commands')
            .setDescription('Command names (comma-separated, e.g: "ticket, panel, settings")')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all role-command permissions')
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Reset all permissions to default')
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

    if (subcommand === 'role-command') {
      const action = interaction.options.getString('action');
      const rolesInput = interaction.options.getString('roles');
      const commandsInput = interaction.options.getString('commands');

      await interaction.deferReply({ ephemeral: true });

      // Parse roles
      const roleList = rolesInput.split(',').map(r => r.trim());
      const resolvedRoles = [];

      for (const roleInput of roleList) {
        let role;
        // Check if it's a mention
        if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
          const roleId = roleInput.slice(3, -1);
          role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        } else {
          // Search by name
          role = interaction.guild.roles.cache.find(
            r => r.name.toLowerCase() === roleInput.toLowerCase()
          );
        }

        if (!role) {
          return interaction.editReply(`❌ Role "${roleInput}" not found.`);
        }
        resolvedRoles.push(role.id);
      }

      // Parse commands
      const commandList = commandsInput.split(',').map(c => c.trim().toLowerCase());

      // Create permission table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS role_command_permissions (
          id TEXT PRIMARY KEY,
          guild_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          command_name TEXT NOT NULL,
          action TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(guild_id, role_id, command_name)
        )
      `);

      // Set permissions
      for (const roleId of resolvedRoles) {
        for (const commandName of commandList) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO role_command_permissions (id, guild_id, role_id, command_name, action)
            VALUES (?, ?, ?, ?, ?)
          `);
          stmt.run(uuidv4(), guildId, roleId, commandName, action);
        }
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Permissions Updated')
        .addFields(
          { name: 'Action', value: action === 'allow' ? '✅ Allow' : '❌ Deny', inline: true },
          { name: 'Roles', value: resolvedRoles.map(id => `<@&${id}>`).join(', '), inline: true },
          { name: 'Commands', value: commandList.join(', '), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } else if (subcommand === 'list') {
      const perms = db.prepare(`
        SELECT * FROM role_command_permissions WHERE guild_id = ?
      `).all(guildId);

      if (perms.length === 0) {
        return interaction.reply({
          content: '📋 No role-command permissions are set.',
          ephemeral: true,
        });
      }

      let permList = '```\n';
      for (const perm of perms) {
        const action = perm.action === 'allow' ? '✅' : '❌';
        permList += `${action} <@&${perm.role_id}> → ${perm.command_name}\n`;
      }
      permList += '```';

      const listEmbed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('🔐 Role-Command Permissions')
        .setDescription(permList)
        .setTimestamp();

      await interaction.reply({ embeds: [listEmbed], ephemeral: true });
    } else if (subcommand === 'reset') {
      db.prepare('DELETE FROM role_command_permissions WHERE guild_id = ?').run(guildId);

      const resetEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔄 Permissions Reset')
        .setDescription('All role-command permissions have been reset to default.')
        .setTimestamp();

      await interaction.reply({ embeds: [resetEmbed], ephemeral: true });
    }
  },
};
