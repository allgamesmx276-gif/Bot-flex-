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

async function isAdmin(client, msg) {
    if (isOwner(msg)) return true;

    try {
        if (!msg.from.endsWith('@g.us')) return false;

        const chat = await msg.getChat();
        const senderId = msg.author || msg.from;

        const participant = chat.participants.find(p => p.id._serialized === senderId);

        return !!participant && (participant.isAdmin || participant.isSuperAdmin);
    } catch (err) {
        console.error('Error isAdmin:', err);
        return false;
    }
}

async function isBotAdmin(client, msg) {
    try {
        if (!msg.from.endsWith('@g.us')) return false;

        const chat = await msg.getChat();
        const botId = client.info.wid._serialized;
        const bot = chat.participants.find(p => p.id._serialized === botId);

        return !!bot && (bot.isAdmin || bot.isSuperAdmin);
    } catch (err) {
        console.error('Error isBotAdmin:', err);
        return false;
    }
}

function isRegisteredAdmin(msg) {
    const db = getDB();
    const senders = getPossibleSenderIds(msg);

    return senders.some(sender => db.admins.includes(sender));
}

function isModerator(msg) {
    if (isOwner(msg) || isRegisteredAdmin(msg)) {
        return false;
    }

    const db = getDB();
    const senders = getPossibleSenderIds(msg);

    return senders.some(sender => db.moderators.includes(sender));
}

function hasRegisteredAdminAccess(msg) {
    return isOwner(msg) || isRegisteredAdmin(msg);
}

function hasModeratorAccess(msg) {
    return hasRegisteredAdminAccess(msg) || isModerator(msg);
}

function isOwner(msg) {
    const db = getDB();
    const ownerNumber = db.config.ownerNumber;

    if (msg.fromMe) {
        return true;
    }

    if (!ownerNumber) return false;

    const normalizedOwner = normalizeWhatsAppId(ownerNumber);
    const senders = getPossibleSenderIds(msg);

    return senders.some(sender =>
        sender === ownerNumber ||
        normalizeWhatsAppId(sender) === normalizedOwner
    );
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
