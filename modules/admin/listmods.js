const { getDB } = require('../../utils/db');

module.exports = {
    name: 'listmods',
    category: 'admin',
    ownerOnly: false,

    async execute(client, msg) {
        const { isAdmin, isOwner } = require('../../utils/permissions');
        if (!await isAdmin(client, msg) && !isOwner(msg)) return msg.reply('Solo admin/owner pueden usar este comando');
        const db = getDB();
        const moderators = Array.isArray(db.moderators) ? db.moderators : [];
        if (!moderators.length) {
            return msg.reply('No hay moderadores registrados.');
        }
        const text = ['MODERADORES', '']
            .concat(moderators.map((item, index) => `${index + 1}. ${item}`))
            .join('\n');
        return msg.reply(text);
    }
};
