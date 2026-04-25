const fs = require('fs');
const { getDB, saveDB } = require('./utils/db');
const { isOwner, isAdmin } = require('./utils/permissions');
const { getChatPlan, getRequiredPlan, isPlanAllowed, isPlanExpired } = require('./utils/planAccess');
const logger = require('./utils/logger');

let commands = [];
const commandMap = new Map();
const autoCommands = [];

function loadCommands() {
    commands = [];
    commandMap.clear();
    autoCommands.length = 0;

    const basePath = './modules';

    if (!fs.existsSync(basePath)) {
        console.log('❌ Carpeta modules no existe');
        return;
    }

    const folders = fs.readdirSync(basePath);

    for (const folder of folders) {
        const folderPath = `${basePath}/${folder}`;

        if (!fs.lstatSync(folderPath).isDirectory()) continue;

        const files = fs.readdirSync(folderPath)
            .filter(file => file.endsWith('.js'));

        for (const file of files) {
            try {
                const fullPath = `./modules/${folder}/${file}`;
                const resolvedPath = require.resolve(fullPath);

                delete require.cache[resolvedPath];

                const command = require(resolvedPath);

                if (!command || !command.name) continue;

                commands.push(command);
                if (command.auto) {
                    autoCommands.push(command);
                } else {
                    const name = command.name.toLowerCase();
                    commandMap.set(name, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => commandMap.set(alias.toLowerCase(), command));
                    }
                }
            } catch (err) {
                console.log(`❌ Error cargando ${file}:`, err.message);
            }
        }
    }
    console.log(`🚀 Total comandos: ${commands.length} (${autoCommands.length} auto)`);
}

async function handleMessage(client, msg) {
    try {
        if (!msg.body) return;

        const body = String(msg.body).trim();
        const dbState = getDB();
        const prefix = dbState.config.prefix || '.';
        const isPrefixed = body.startsWith(prefix);
        const isGroupChat = msg.from.endsWith('@g.us');

        const pausedInGroup = isGroupChat && dbState.pausedGroups?.[msg.from];
        
        if (pausedInGroup) {
            if (!isPrefixed || !body.toLowerCase().includes('bot')) return;
        }

        // ⚡ Ejecución rápida de comandos automáticos
        for (const cmd of autoCommands) {
            try {
                // Clave: solo marcamos como manejado si el comando auto lo decide p.ej. anti-link
                await cmd.execute(client, msg);
                // Si un comando auto marca _flexHandled, detenemos el flujo para este mensaje
                if (msg._flexHandled) return;
            } catch (err) {
                console.error(`Error en auto ${cmd.name}:`, err.message);
            }
        }

        // Antes de los comandos con prefijo, nos aseguramos que _flexHandled sea false si no fue marcado por auto
        if (msg._flexHandled || !isPrefixed) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = (args.shift() || '').toLowerCase();
        
        // 🎯 Búsqueda O(1) en el Map
        const command = commandMap.get(commandName);
        if (!command) return;

        const owner = isOwner(msg);

        if (command.ownerOnly && !owner) {
            return msg.reply('Solo el owner puede usar este comando');
        }

        if (!owner && command.category === 'admin' && !await isAdmin(client, msg)) {
            return client.sendMessage(msg.from, 'Solo los administradores del grupo pueden usar este comando');
        }

        if (!owner) {
            if (isPlanExpired(dbState, msg.from)) {
                const expired = dbState.groupPlanExpiry?.[msg.from];
                const expiryDate = expired ? new Date(expired).toLocaleDateString() : '';
                dbState.groupPlans[msg.from] = 'free';
                delete dbState.groupPlanExpiry[msg.from];
                saveDB();
                await msg.reply(`⚠️ Tu plan ha expirado (${expiryDate}). Ahora estás en plan FREE.`);
            }

            const currentPlan = getChatPlan(dbState, msg.from, msg.author || msg.from);
            const requiredPlan = getRequiredPlan(command);

            if (!isPlanAllowed(currentPlan, requiredPlan)) {
                return msg.reply(`⚠️ Requiere plan *${requiredPlan}* (Actual: *${currentPlan}*)`);
            }
        }

        msg._flexHandled = true;
        
        // Simular que el bot está escribiendo y esperar 2 segundos
        // Se comenta o reduce para mejorar la respuesta inmediata si es necesario
        /*
        try {
            const chat = await msg.getChat();
            await chat.sendStateTyping();
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
            console.error('Error al enviar estado "escribiendo":', e.message);
        }
        */

        await command.execute(client, msg, args);

    } catch (err) {
        logger.error('Error general en handler', { error: err.message });
        if (!msg._flexHandled) {
            try { await msg.reply('❌ Error interno'); } catch {}
        }
    }
}

function getCommands() {
    return commands;
}

module.exports = { loadCommands, handleMessage, getCommands };
