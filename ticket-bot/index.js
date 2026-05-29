const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { initializeDatabase } = require('./src/database/db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize collections
client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selectMenus = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Load button handlers
const buttonsPath = path.join(__dirname, 'src', 'handlers', 'buttons');
if (fs.existsSync(buttonsPath)) {
  const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
  for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);
    if (button.customId) {
      client.buttons.set(button.customId, button);
    }
  }
}

// Load modal handlers
const modalsPath = path.join(__dirname, 'src', 'handlers', 'modals');
if (fs.existsSync(modalsPath)) {
  const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
  for (const file of modalFiles) {
    const filePath = path.join(modalsPath, file);
    const modal = require(filePath);
    if (modal.customId) {
      client.modals.set(modal.customId, modal);
    }
  }
}

// Load select menu handlers
const selectMenusPath = path.join(__dirname, 'src', 'handlers', 'selectMenus');
if (fs.existsSync(selectMenusPath)) {
  const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));
  for (const file of selectMenuFiles) {
    const filePath = path.join(selectMenusPath, file);
    const selectMenu = require(filePath);
    if (selectMenu.customId) {
      client.selectMenus.set(selectMenu.customId, selectMenu);
    }
  }
}

// Initialize database
initializeDatabase();

// Login
client.login(process.env.TOKEN);
