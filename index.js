// ===============================
// INICIO BOT
// ===============================
console.log('🚀 INICIO: index.js ejecutándose');

let hotReloadWatcher = null;

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const { loadCommands, handleMessage } = require('./handler');
const { ensureDB, getDB, saveDB, logEvent } = require('./utils/db');
const { readGroupDB } = require('./utils/groupDb');
const { restartAllMsgAuto } = require('./utils/msgAuto');
const logger = require('./utils/logger');
const { backupNow } = require('./utils/backup');
const { POSITIVE_REACTIONS, NEGATIVE_REACTIONS } = require('./utils/rankSystem');

// ===============================
// CLIENTE
// ===============================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});
// ===============================
// DB Y LOG
// ===============================
ensureDB();
logger.clearLog();

// ===============================
// QR
// ===============================
client.on('qr', qr => {
    console.log('📱 Escanea el QR');
    qrcode.generate(qr, { small: true });
});

// ===============================
// EVENTOS
// ===============================
client.on('loading_screen', (percent, message) => {
    logger.info('Cargando WhatsApp', { percent, message });
});

client.on('authenticated', () => {
    logger.info('Sesion autenticada');
});

client.on('auth_failure', message => {
    logger.error('Fallo auth', { message });
});

// ===============================
// READY
// ===============================
client.on('ready', () => {
    logger.info('🤖 BOT LISTO');

    try {
        const db = getDB();
        const botWid = client.info?.wid?._serialized;

        if (botWid && db.config.botNumber !== botWid) {
            db.config.botNumber = botWid;
            saveDB();
        }

        if (!db.config.ownerNumber) {
            console.log('⚠️ Owner no configurado');
        }

    } catch (err) {
        logger.error('Error init', { error: err.message });
    }

    try {
        backupNow('startup');
    } catch {}

    loadCommands();
    restartAllMsgAuto(client);
});
// ===============================
// MESSAGE (FIX PRINCIPAL)
// ===============================
client.on('message', async msg => {
    try {
        const text = (msg.body || '').toLowerCase().trim();

        console.log('📨', text);

        // TEST
        if (text.includes('ping')) {
            await client.sendMessage(msg.from, 'pong 🏓');
            return;
        }

        // TRACK ACTIVIDAD
        try {
            if (msg.from && msg.from.endsWith('@g.us') && !msg.fromMe) {
                const sender = msg.author || msg.from;
                const chatId = msg.from;
                const db = getDB();

                if (!db.userActivity[chatId]) db.userActivity[chatId] = {};
                if (!db.userActivity[chatId][sender]) {
                    db.userActivity[chatId][sender] = { msgs: 0, lastSeen: 0 };
                }

                db.userActivity[chatId][sender].msgs++;
                db.userActivity[chatId][sender].lastSeen = Date.now();
                saveDB();
            }
        } catch (_) {}

        // 🔥 Ejecutar comandos automáticos (auto: true) ANTES de checar prefijo
        await handleMessage(client, msg);

        // PREFIJO
        const db = getDB();
        const prefix = db.config?.prefix || '.';

        if (!text.startsWith(prefix)) return;

        // Si ya fue procesado por handleMessage arriba como comando normal (con prefijo),
        // no hace falta llamarlo de nuevo, pero handleMessage ya tiene lógica interna para separar auto vs normal.
        // Sin embargo, para consistencia, el flujo ideal es que handleMessage gestione todo.

    } catch (err) {
        console.log('❌ Error en message:', err.message);
    }
});
// ===============================
// REACCIONES
// ===============================
client.on('message_reaction', async (reaction) => {
    try {
        if (!reaction || !reaction.reaction) return;

        const emoji = reaction.reaction;
        const isPos = POSITIVE_REACTIONS.includes(emoji);
        const isNeg = NEGATIVE_REACTIONS.includes(emoji);

        if (!isPos && !isNeg) return;

        const chatId = reaction.msgId?.remote;
        if (!chatId || !chatId.endsWith('@g.us')) return;

        const db = getDB();

        if (!db.userReactions[chatId]) db.userReactions[chatId] = {};

        const authorId = reaction.msgId.participant;
        if (!authorId) return;

        if (!db.userReactions[chatId][authorId]) {
            db.userReactions[chatId][authorId] = { pos: 0, neg: 0 };
        }

        if (isPos) db.userReactions[chatId][authorId].pos++;
        else db.userReactions[chatId][authorId].neg++;

        saveDB();

    } catch (err) {
        logger.error('Error reaction', { error: err.message });
    }
});

// ===============================
// DESCONECTADO
// ===============================
client.on('disconnected', reason => {
    console.log('⚠️ Desconectado:', reason);
});

// ===============================
// INICIAR
// ===============================
client.initialize().catch(err => {
    console.log('❌ Error al iniciar:', err.message);
});