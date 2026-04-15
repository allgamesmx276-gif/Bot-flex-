const fs = require('fs');
const { getDB, saveDB } = require('./utils/db');
const { isOwner, isAdmin } = require('./utils/permissions');
const { getChatPlan, getRequiredPlan, isPlanAllowed, isPlanExpired } = require('./utils/planAccess');
const logger = require('./utils/logger');

let commands = [];

function loadCommands() {
    commands = [];

    const basePath = './modules';

    if (!fs.existsSync(basePath)) {
        console.log('❌ Carpeta modules no existe');
        return;
    }

    const folders = fs.readdirSync(basePath);

    console.log('📂 Carpetas detectadas:', folders);

    for (const folder of folders) {
        const folderPath = `${basePath}/${folder}`;

        // Ignorar si no es carpeta
        if (!fs.lstatSync(folderPath).isDirectory()) continue;

        const files = fs.readdirSync(folderPath)
            .filter(file => file.endsWith('.js'));

        console.log(`📁 ${folder}:`, files);

        for (const file of files) {
            try {
                const fullPath = `${folderPath}/${file}`;

                delete require.cache[require.resolve(fullPath)];

                const command = require(fullPath);

                if (!command || !command.name) {
                    console.log(`⚠️ Comando inválido: ${file}`);
                    continue;
                }

                commands.push(command);
                console.log(`✅ Cargado: ${command.name}`);

            } catch (err) {
                console.log(`❌ Error en ${file}:`, err.message);
            }
        }
    }

    console.log('🚀 TOTAL COMANDOS:', commands.length);
}
async function handleMessage(client, msg) {
    try {
        if (!msg.body) return;

        // 🔥 evitar doble ejecución
        

        const dbState = getDB();
        const prefix = dbState.config.prefix || '.';

        const body = String(msg.body).trim();
        const isPrefixed = body.startsWith(prefix);

        const isGroupChat = String(msg.from || '').endsWith('@g.us');
        const pausedInGroup = Boolean(
            isGroupChat &&
            dbState.pausedGroups &&
            dbState.pausedGroups[msg.from]
        );

        // 🔒 grupo pausado
        if (pausedInGroup) {
            if (!isPrefixed || !body.toLowerCase().includes('bot')) return;
        }

        // ⚡ comandos automáticos
        for (const cmd of commands) {
            if (!cmd.auto) continue;

            try {
                await cmd.execute(client, msg);
            } catch (err) {
                console.log(`Error en comando auto ${cmd.name}:`, err.message);
            }
        }

        // Si el comando fue marcado como manejado por un comando auto, detenemos el flujo
        if (msg._flexHandled) return;

        if (!isPrefixed) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = (args.shift() || '').toLowerCase();

        const command = commands.find(cmd => !cmd.auto && cmd.name === commandName);

        if (!command) return;

        const owner = isOwner(msg);

        // 🔒 owner only
        if (command.ownerOnly && !owner) {
            return msg.reply('Solo el owner puede usar este comando');
        }

        // 🔒 admin
        if (!owner && command.category === 'admin' && !await isAdmin(client, msg)) {
            return client.sendMessage(msg.from, 'Solo los administradores del grupo pueden usar este comando');
        }

        // 💼 sistema de planes
        if (!owner) {
            const db = getDB();
            const chatId = msg.from;
            const sender = msg.author || msg.from;

            // verificar expiración
            if (isPlanExpired(db, chatId)) {
                const expired = db.groupPlanExpiry?.[chatId];
                const expiryDate = expired
                    ? new Date(expired).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                    })
                    : '';

                db.groupPlans[chatId] = 'free';
                delete db.groupPlanExpiry[chatId];
                saveDB();

                await msg.reply(`⚠️ Tu plan ha expirado (${expiryDate}). Ahora estás en plan FREE.`);
            }

            const currentPlan = getChatPlan(db, chatId, sender);
            const requiredPlan = getRequiredPlan(command);

            if (!isPlanAllowed(currentPlan, requiredPlan)) {
                return msg.reply(
`⚠️ Este comando requiere plan *${requiredPlan}*
💼 Plan actual: *${currentPlan}*

Contacta al administrador del bot para mejorar tu plan.`
                );
            }
        }

        // ✅ MARCAR COMO PROCESADO (CLAVE)
        

        // 🚀 ejecutar comando
        console.log('👉 Ejecutando comando:', command.name);
        await command.execute(client, msg, args);

    } catch (err) {
        logger.error('Error general en handler', { error: err.message });
        msg.reply('❌ Error interno en el bot');
    }
}

function getCommands() {
    return commands;
}

module.exports = { loadCommands, handleMessage, getCommands };