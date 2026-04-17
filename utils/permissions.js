const { getDB } = require('./db');

function normalizeWhatsAppId(value) {
    return String(value || '')
        .trim()
        .replace(/^\+/, '')
        .split('@')[0];
}

function getPossibleSenderIds(msg) {
    return [
        msg.author,
        msg.from,
        msg.to,
        msg.id && msg.id.participant,
        msg._data && msg._data.author,
        msg._data && msg._data.from,
        msg._data && msg._data.to,
        msg._data && msg._data.participant
    ].filter(Boolean);
}

// 🔑 OWNER
function isOwner(msg) {
    const db = getDB();
    const ownerNumber = db.config?.ownerNumber;

    if (msg.fromMe) {
        console.log('[PERM] Owner detectado (fromMe)');
        return true;
    }

    if (!ownerNumber) {
        console.log('[PERM] ownerNumber no configurado');
        return false;
    }

    const normalizedOwner = normalizeWhatsAppId(ownerNumber);
    const senders = getPossibleSenderIds(msg);

    const found = senders.some(sender =>
        sender === ownerNumber ||
        normalizeWhatsAppId(sender) === normalizedOwner
    );

    console.log('[PERM] isOwner:', found);
    return found;
}

// 👑 ADMIN (WhatsApp)
async function isAdmin(client, msg) {
    if (isOwner(msg)) return true;

    try {
        if (!msg.from.endsWith('@g.us')) return false;

        const chat = await msg.getChat();
        const senderId = msg.author || msg.from;
        
        // WhatsApp Web.js a veces devuelve el ID con o sin el sufijo :index
        const senderPure = senderId.split(':')[0].split('@')[0];

        const participant = chat.participants.find(p => {
            const pId = p.id._serialized;
            const pPure = pId.split(':')[0].split('@')[0];
            return pPure === senderPure;
        });

        const result = !!participant && (participant.isAdmin || participant.isSuperAdmin);
        
        // Log CRÍTICO para ver qué está pasando realmente en el VPS
        console.log(`[DEBUG_ADMIN] Group: ${msg.from}`);
        console.log(`[DEBUG_ADMIN] Sender: ${senderId} (Pure: ${senderPure})`);
        if (participant) {
            console.log(`[DEBUG_ADMIN] Found Participant: ${participant.id._serialized} | isAdmin: ${participant.isAdmin} | isSuperAdmin: ${participant.isSuperAdmin}`);
        } else {
            console.log(`[DEBUG_ADMIN] Participant NOT FOUND in chat.participants list`);
        }

        return result;

    } catch (err) {
        console.error('[PERM] Error isAdmin:', err.message);
        return false;
    }
}

// 🤖 BOT ADMIN
async function isBotAdmin(client, msg) {
    try {
        if (!msg.from.endsWith('@g.us')) return false;

        const chat = await msg.getChat();
        const botId = client.info.wid._serialized;

        const bot = chat.participants.find(p => p.id._serialized === botId);

        return !!bot && (bot.isAdmin || bot.isSuperAdmin);

    } catch (err) {
        console.error('[PERM] Error isBotAdmin:', err.message);
        return false;
    }
}

// 📋 ADMIN REGISTRADO (DB)
function isRegisteredAdmin(msg) {
    const db = getDB();
    const senders = getPossibleSenderIds(msg);

    return senders.some(sender =>
        (db.admins || []).includes(sender)
    );
}

// 🛡️ MODERADOR (FIXED)
function isModerator(msg) {
    const db = getDB();
    const senders = getPossibleSenderIds(msg);

    return senders.some(sender =>
        (db.moderators || []).includes(sender)
    );
}

// 🔐 ACCESOS
function hasRegisteredAdminAccess(msg) {
    return isOwner(msg) || isRegisteredAdmin(msg);
}

function hasModeratorAccess(msg) {
    return isOwner(msg) || isRegisteredAdmin(msg) || isModerator(msg);
}

module.exports = {
    getPossibleSenderIds,
    hasModeratorAccess,
    hasRegisteredAdminAccess,
    isAdmin,
    isBotAdmin,
    isModerator,
    isRegisteredAdmin,
    isOwner
};