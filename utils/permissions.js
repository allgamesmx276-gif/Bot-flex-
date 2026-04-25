const { getDB } = require('./db');

function normalizeWhatsAppId(value) {
    return String(value || '')
        .trim()
        .replace(/^\+/, '')
        .split('@')[0];
}

function getPossibleSenderIds(msg) {
    if (!msg) return [];
    
    return [
        msg.author,
        msg.from,
        msg.to,
        msg.id ? msg.id.participant : null,
        msg._data ? msg._data.author : null,
        msg._data ? msg._data.from : null,
        msg._data ? msg._data.to : null,
        msg._data ? msg._data.participant : null
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
        const chatId = msg.from;
        if (!chatId.endsWith('@g.us')) return false;

        const chat = await msg.getChat();
        const senderId = msg.author || msg.from;

        console.log(`--- DEBUG ADMIN START ---`);
        console.log(`Chat: ${chatId}`);
        console.log(`Sender ID: ${senderId}`);

        // 1. Intento por ID directo
        let participant = (chat.participants || []).find(p => p.id._serialized === senderId);

        // 2. Intento por Número Puro (Quitar @c.us, @lid, sufijos :1, etc)
        if (!participant) {
            const senderPure = senderId.split(':')[0].split('@')[0];
            participant = (chat.participants || []).find(p => {
                const pPure = p.id._serialized.split(':')[0].split('@')[0];
                return pPure === senderPure;
            });
            if (participant) console.log(`[DEBUG] Found by Pure ID: ${senderPure}`);
        }

        // 3. Intento forzando resolución de contacto (Especial para LID -> c.us)
        if (!participant) {
            console.log(`[DEBUG] Not found in participants list. Attempting contact resolution...`);
            try {
                const contact = await client.getContactById(senderId);
                if (contact && contact.id && contact.id._serialized) {
                    const realId = contact.id._serialized;
                    const realPure = realId.split(':')[0].split('@')[0];
                    console.log(`[DEBUG] Resolved ID: ${realId}`);

                    participant = (chat.participants || []).find(p => {
                        const pPure = p.id._serialized.split(':')[0].split('@')[0];
                        return pPure === realPure;
                    });
                }
            } catch (e) {
                console.log(`[DEBUG] Contact resolution failed: ${e.message}`);
            }
        }

        const result = !!participant && (participant.isAdmin || participant.isSuperAdmin);

        if (!participant) {
            console.log(`[!] SENDER ${senderId} STILL NOT FOUND IN LIST`);
            if (chat.participants && chat.participants.length > 0) {
                console.log(`List Sample (3): ${chat.participants.slice(0, 3).map(p => p.id._serialized).join(', ')}`);
            }
        } else {
            console.log(`Participant Found: ${participant.id._serialized} | Admin: ${participant.isAdmin}`);
        }

        console.log(`Final Result: ${result}`);
        console.log(`--- DEBUG ADMIN END ---`);

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
async function isRegisteredAdmin(msg, client) {
    if (!msg) return false;
    const db = getDB();
    const senders = getPossibleSenderIds(msg);
    const chatId = msg.from;

    // 1. Si es el owner definido en config, siempre tiene acceso
    if (isOwner(msg)) return true;

    // 2. Si es ADMIN del grupo en WhatsApp
    if (chatId && chatId.endsWith('@g.us') && client && await isAdmin(client, msg)) return true;

    // 3. Verificar en la lista global de admins de la DB (Solo para comandos globales si es necesario)
    return senders.some(sender => {
        const pure = sender.split(':')[0].split('@')[0];
        const inDb = (db.admins || []).some(adminId => {
            const adminPure = adminId.split(':')[0].split('@')[0];
            return adminPure === pure;
        });
        return inDb;
    });
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