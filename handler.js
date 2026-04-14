const fs = require('fs');
const { getDB } = require('./utils/db');
const { isOwner, isAdmin } = require('./utils/permissions');
const { getChatPlan, getRequiredPlan, isPlanAllowed, isPlanExpired } = require('./utils/planAccess');
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
    const dbState = getDB();
    const prefix = dbState.config.prefix || '.';
    const automaticCommands = commands.filter(cmd => cmd.auto);

    if (!msg.body) return;

    const body = String(msg.body || '').trim();
    const isPrefixed = body.startsWith(prefix);
    const inputParts = isPrefixed
        ? body.slice(prefix.length).trim().split(/ +/)
        : [];
    const inputCommandName = (inputParts.shift() || '').toLowerCase();

    // Global pause mode: bot process stays online but ignores all messages,
    // except the .bot command used to reactivate it.
    if (dbState.config && dbState.config.botPaused) {
        if (!isPrefixed || inputCommandName !== 'bot') return;
    }

    for (const cmd of automaticCommands) {
        try {
            await cmd.execute(client, msg);
        } catch (err) {
            console.error(`Error en modulo automatico ${cmd.name}:`, err);
        }
    }

    if (msg._flexHandled) return;
    if (!isPrefixed) return;

    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands.find(cmd => !cmd.auto && cmd.name === commandName);

    if (!command) return;

    try {
        const owner = isOwner(msg);

        if (command.ownerOnly && !owner) {
            return msg.reply('Solo el owner puede usar este comando');
        }

        if (!owner && command.category === 'admin' && !await isAdmin(client, msg)) {
            return msg.reply('Solo los administradores del grupo pueden usar este comando');
        }

        if (!owner) {
            const db = getDB();
            const chatId = msg.from;
            const sender = msg.author || msg.from;

            // Check if plan expired
            if (isPlanExpired(db, chatId)) {
                const expired = db.groupPlanExpiry && db.groupPlanExpiry[chatId];
                const expiryDate = expired ? new Date(expired).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
                // Reset to free
                db.groupPlans[chatId] = 'free';
                delete db.groupPlanExpiry[chatId];
                const { saveDB } = require('./utils/db');
                saveDB();
            }

            const currentPlan = getChatPlan(db, chatId, sender);
            const requiredPlan = getRequiredPlan(command);

            if (!isPlanAllowed(currentPlan, requiredPlan)) {
                return msg.reply(`⚠️ Este comando requiere plan *${requiredPlan}*.
💼 Plan actual: *${currentPlan}*

Contacta al administrador del bot para activar un plan superior.`);
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
