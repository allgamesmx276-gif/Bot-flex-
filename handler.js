const fs = require('fs');
const { getDB } = require('./utils/db');
const { isOwner, isRegisteredAdmin } = require('./utils/permissions');
const { getChatPlan, getRequiredPlan, isPlanAllowed } = require('./utils/planAccess');
const logger = require('./utils/logger');

let commands = [];

function loadCommands() {
    commands = [];

    const folders = fs.readdirSync('./modules');

    for (const folder of folders) {
        const files = fs.readdirSync(`./modules/${folder}`)
            .filter(file => file.endsWith('.js'));

        for (const file of files) {
            delete require.cache[require.resolve(`./modules/${folder}/${file}`)];

            const command = require(`./modules/${folder}/${file}`);

            if (command && command.name) {
                commands.push(command);
            }
        }
    }

    logger.info('Total comandos cargados', { total: commands.length });
}

async function handleMessage(client, msg) {
    const prefix = getDB().config.prefix || '.';
    const automaticCommands = commands.filter(cmd => cmd.auto);

    if (!msg.body) return;

    for (const cmd of automaticCommands) {
        try {
            await cmd.execute(client, msg);
        } catch (err) {
            console.error(`Error en modulo automatico ${cmd.name}:`, err);
        }
    }

    if (msg._flexHandled) return;
    if (!msg.body.startsWith(prefix)) return;

    const args = msg.body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands.find(cmd => !cmd.auto && cmd.name === commandName);

    if (!command) return;

    try {
        const owner = isOwner(msg);

        if (command.ownerOnly && !owner) {
            return msg.reply('Solo el owner puede usar este comando');
        }

        if (!owner && command.category === 'admin' && !isRegisteredAdmin(msg)) {
            return msg.reply('Debes registrarte como admin para usar comandos admin');
        }

        if (!owner) {
            const db = getDB();
            const chatId = msg.from;
            const currentPlan = getChatPlan(db, chatId);
            const requiredPlan = getRequiredPlan(command);

            if (!isPlanAllowed(currentPlan, requiredPlan)) {
                return msg.reply(`Este comando requiere plan ${requiredPlan}. Plan actual: ${currentPlan}.`);
            }
        }

        await command.execute(client, msg, args);
    } catch (err) {
        logger.error('Error ejecutando comando', { name: command.name, error: err.message });
        msg.reply('Error ejecutando comando');
    }
}

function getCommands() {
    return commands;
}

module.exports = { loadCommands, handleMessage, getCommands };
