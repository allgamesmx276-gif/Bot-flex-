const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { loadCommands, handleMessage } = require('./handler');
const { ensureDB, getDB } = require('./utils/db');
const { readGroupDB } = require('./utils/groupDb');
const { restartAllMsgAuto } = require('./utils/msgAuto');
const logger = require('./utils/logger');
const { backupNow } = require('./utils/backup');

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

let hotReloadWatcher = null;

function setupCommandHotReload() {
    if (hotReloadWatcher) return;

    const modulesDir = './modules';
    let timer = null;

    hotReloadWatcher = require('fs').watch(modulesDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const name = String(filename).toLowerCase();
        if (!name.endsWith('.js') && !name.endsWith('.disabled.js')) return;

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            try {
                loadCommands();
                logger.info('Hot reload aplicado', { eventType, file: filename });
            } catch (err) {
                logger.error('Hot reload fallo', { error: err.message, file: filename });
            }
        }, 400);
    });
}

ensureDB();
logger.clearLog();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('loading_screen', (percent, message) => {
    logger.info('Cargando WhatsApp Web', { percent, message });
});

client.on('authenticated', () => {
    logger.info('Sesion autenticada');
});

client.on('auth_failure', message => {
    logger.error('Fallo de autenticacion', { message });
});

client.on('ready', () => {
    logger.info('Bot listo');
    try {
        backupNow('startup');
    } catch (err) {
        logger.error('Backup startup fallido', { error: err.message });
    }
    loadCommands();
    setupCommandHotReload();
    restartAllMsgAuto(client);
});

client.on('message', async msg => {
    await handleMessage(client, msg);
});

client.on('message_create', async msg => {
    try {
        if (!msg.fromMe) return;

        const db = getDB();
        const prefix = db.config.prefix || '.';
        const text = (msg.body || '').trim().toLowerCase();
        const shouldHandle =
            text.startsWith(prefix.toLowerCase()) ||
            text === 'offline' ||
            text === 'online' ||
            text === 'registrar admin' ||
            text === 'cancelar' ||
            msg.body === db.config.registerKey;

        if (!shouldHandle) return;

        await handleMessage(client, msg);
    } catch (err) {
        logger.error('ERROR MESSAGE_CREATE', { error: err.message });
    }
});

client.on('group_join', async notification => {
    try {
        const chatId = notification.id.remote;
        const participantId = notification.id.participant;
        const botId = client.info && client.info.wid && client.info.wid._serialized;

        if (participantId && botId && participantId === botId) {
            const db = getDB();
            const ownerId = db.config && db.config.ownerNumber;

            if (ownerId) {
                const chat = await client.getChatById(chatId).catch(() => null);
                const joinedGroupName = chat && chat.name ? chat.name : chatId;
                const allChats = await client.getChats().catch(() => []);
                const groups = allChats.filter(item => item && item.isGroup);
                const groupNames = groups
                    .map(item => item.name || item.id && item.id._serialized)
                    .filter(Boolean)
                    .slice(0, 30)
                    .join('\n- ');

                const text = [
                    '🔔 Bot agregado a un grupo',
                    `Grupo nuevo: ${joinedGroupName}`,
                    `Total grupos: ${groups.length}`,
                    '',
                    groups.length
                        ? `Grupos actuales:\n- ${groupNames}`
                        : 'Grupos actuales: ninguno'
                ].join('\n');

                await client.sendMessage(ownerId, text).catch(() => false);
            }
        }

        const groupDb = readGroupDB(chatId);

        if (!groupDb.welcome) return;

        const user = notification.id.participant;
        const mention = '@' + user.split('@')[0];
        let welcomeText = groupDb.welcomeMsg || 'Bienvenido';

        if (welcomeText.includes('@user')) {
            welcomeText = welcomeText.replace(/@user/g, mention);
        } else {
            welcomeText = `${welcomeText}\n${mention}`;
        }

        await client.sendMessage(chatId, welcomeText, {
            mentions: [user]
        });
    } catch (err) {
        logger.error('ERROR WELCOME', { error: err.message });
    }
});

client.on('group_leave', async notification => {
    try {
        const chatId = notification.id.remote;
        const groupDb = readGroupDB(chatId);

        if (!groupDb.goodbye) return;

        const user = notification.id.participant;
        const mention = '@' + user.split('@')[0];
        let goodbyeText = groupDb.goodbyeMsg || 'Adiós';

        if (goodbyeText.includes('@user')) {
            goodbyeText = goodbyeText.replace(/@user/g, mention);
        } else {
            goodbyeText = `${goodbyeText}\n${mention}`;
        }

        await client.sendMessage(chatId, goodbyeText, {
            mentions: [user]
        });
    } catch (err) {
        logger.error('ERROR GOODBYE', { error: err.message });
    }
});

client.on('message_revoke_everyone', async (_, revokedMsg) => {
    try {
        if (!revokedMsg) return;

        const groupDb = readGroupDB(revokedMsg.from);

        if (!groupDb.antiDeleteEnabled) return;

        await client.sendMessage(
            revokedMsg.from,
            `Eliminado:\n${revokedMsg.body || '[sin texto]'}`
        );
    } catch (err) {
        logger.error('ERROR ANTI-DELETE', { error: err.message });
    }
});

client.on('disconnected', reason => {
    logger.warn('Cliente desconectado', { reason });
});

client.initialize().catch(err => {
    logger.error('No se pudo iniciar el bot', { error: err.message });
    logger.error('Verifica CHROME_PATH si Chrome/Chromium no abre');
});
