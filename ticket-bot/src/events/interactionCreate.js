const { InteractionType } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: '❌ An error occurred while executing this command.',
          ephemeral: true,
        });
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const button = client.buttons.get(interaction.customId);
      if (!button) return;

      try {
        await button.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: '❌ An error occurred while processing this button.',
          ephemeral: true,
        });
      }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      const modal = client.modals.get(interaction.customId);
      if (!modal) return;

      try {
        await modal.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: '❌ An error occurred while processing this form.',
          ephemeral: true,
        });
      }
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu() || interaction.isMentionableSelectMenu()) {
      const selectMenu = client.selectMenus.get(interaction.customId);
      if (!selectMenu) return;

      try {
        await selectMenu.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: '❌ An error occurred while processing this selection.',
          ephemeral: true,
        });
      }
    }
  },
};
