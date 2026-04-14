const { getDB, saveDB, logEvent } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');

function resolveTarget(msg, args) {
    let target = (args[0] || '').trim();

    if (Array.isArray(msg.mentionedIds) && msg.mentionedIds.length > 0) {
        target = msg.mentionedIds[0];
    }

    return target;
}

module.exports = {
    name: 'addmod',
    category: 'admin',
    ownerOnly: false,

    async execute(client, msg, args) {
        const { isAdmin, isOwner } = require('../../utils/permissions');
        if (!await isAdmin(client, msg) && !isOwner(msg)) return msg.reply('Solo admin/owner pueden usar este comando');
        const target = resolveTarget(msg, args);
        if (!target) {
            return msg.reply('Uso: addmod <numero@c.us> o menciona al usuario');
        }
        const db = getDB();
        if (!Array.isArray(db.moderators)) {
            db.moderators = [];
        }
        if (db.moderators.includes(target)) {
            return msg.reply('Ese usuario ya es moderador.');
        }
        db.moderators.push(target);
        saveDB();
        logEvent(`MOD+ ${target}`);
        auditAction(msg, 'ADD_MOD', { target });
        return msg.reply(`Moderador agregado: ${target}`);
    }
};
