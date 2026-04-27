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
const isLinux = process.platform === 'linux';
const client = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-js/main/dist/wppconnect-wa.js'
    },
    puppeteer: {
        headless: true,
        authTimeoutMs: 120000, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--safebrowsing-disable-auto-update',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-browser-side-navigation',
            '--disable-features=IsolateOrigins,site-per-process',
            '--js-flags="--max-old-space-size=400 --expose-gc"'
        ]
    }
});

// GC Periodic Trigger (Limited RAM environment)
setInterval(() => {
    if (global.gc) {
        global.gc();
    }
}, 1000 * 60 * 15); // Clear heap every 15 minutes
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

    loadCommands();

    // Ejecutar tareas pesadas en segundo plano
    setTimeout(() => {
        try {
            backupNow('startup');
        } catch (e) {
            console.error('Error in startup backup:', e.message);
        }
        restartAllMsgAuto(client);
    }, 5000);
});

// ===============================
// GRUPO JOIN (AUTO ADMIN REG)
// ===============================
client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        const contact = await notification.getContact();
        const botId = client.info.wid._serialized;

        // Si el que se unió es el BOT
        if (contact.id._serialized === botId) {
            console.log(`\n📥 BOT unido al grupo: ${chat.name}`);
            
            // Ya no los añadimos a db.admins GLOBAL para evitar que sean admins en otros grupos.
            // Los permisos se verificarán en tiempo real por el sistema de WhatsApp.
            
            const adminsInGroup = chat.participants.filter(p => p.isAdmin || p.isSuperAdmin);
            
            await client.sendMessage(chat.id._serialized, `✅ ¡Hola! He configurado los permisos de administrador automáticamente para este grupo.`);
            console.log(`✅ Grupo ${chat.name} configurado con ${adminsInGroup.length} administradores.`);
        }
    } catch (err) {
        console.error('❌ Error en group_join:', err.message);
    }
});

// ===============================
// MESSAGE (FIX PRINCIPAL)
// ===============================
client.on('message', async msg => {
    // Evitar procesar mensajes de uno mismo o vacíos
    if (msg.fromMe || !msg.body) return;

    try {
        const text = (msg.body || '').toLowerCase().trim();

        // TRACK ACTIVIDAD (Optimizado: solo grupos)
        if (msg.from.endsWith('@g.us')) {
            const sender = msg.author || msg.from;
            const chatId = msg.from;
            const dbRef = getDB();

            if (!dbRef.userActivity[chatId]) dbRef.userActivity[chatId] = {};
            if (!dbRef.userActivity[chatId][sender]) {
                dbRef.userActivity[chatId][sender] = { msgs: 0, lastSeen: 0 };
            }

            dbRef.userActivity[chatId][sender].msgs++;
            dbRef.userActivity[chatId][sender].lastSeen = Date.now();
        }

        // 🔥 Ejecutar todo a través de handleMessage (incluye auto y normales)
        await handleMessage(client, msg);

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

        const dbRef = getDB();

        if (!dbRef.userReactions[chatId]) dbRef.userReactions[chatId] = {};

        const authorId = reaction.msgId.participant; // Autor del mensaje reaccionado
        const reactorId = reaction.senderId; // Persona que reacciona
        
        if (!authorId || !reactorId) return;

        // 🔥 NO PERMITIR AUTO-REACCIONES (Dar puntos a sus propios mensajes)
        if (authorId === reactorId) {
            console.log(`[RANK] Intento de auto-reacción detectado en ${chatId} por ${reactorId}. Ignorando puntos.`);
            return;
        }

        if (!dbRef.userReactions[chatId][authorId]) {
            dbRef.userReactions[chatId][authorId] = { pos: 0, neg: 0 };
        }

        if (isPos) dbRef.userReactions[chatId][authorId].pos++;
        else dbRef.userReactions[chatId][authorId].neg++;

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