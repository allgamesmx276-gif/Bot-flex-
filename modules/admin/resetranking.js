const { getDB, saveDB } = require('../../utils/db');
const { isAdmin, isOwner } = require('../../utils/permissions');
const { ok, error } = require('../../utils/style');

module.exports = {
    name: 'resetranking',
    category: 'admin',
    description: 'Resetea el ranking de reacciones de este grupo',

    async execute(client, msg) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply(error('Solo en grupos'));

        if (!isOwner(msg) && !await isAdmin(client, msg)) {
            return msg.reply(error('Solo admins u owner pueden resetear el ranking'));
        }

        const chatId = chat.id._serialized;
        const db = getDB();

        if (db.userReactions && db.userReactions[chatId]) {
            delete db.userReactions[chatId];
            saveDB();
            return msg.reply(ok('El ranking de este grupo ha sido reseteado correctamente.'));
        } else {
            return msg.reply(error('No hay datos de ranking en este grupo.'));
        }
    }
};