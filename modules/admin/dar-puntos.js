const { getDB, saveDB } = require('../../utils/db');
const { isAdmin, isOwner } = require('../../utils/permissions');
const { ok, error, warn, info } = require('../../utils/style');

module.exports = {
    name: 'dar-puntos',
    category: 'admin',
    description: 'Añade puntos de ranking a un usuario manualmente',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply(error('Solo en grupos'));

        // Permisos
        if (!isOwner(msg) && !await isAdmin(client, msg)) {
            return msg.reply(error('Solo admins u owner pueden dar puntos'));
        }

        let target;
        let amountStr;

        if (msg.mentionedIds.length > 0) {
            target = msg.mentionedIds[0];
            amountStr = args[1]; // .dar-puntos @user 50
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            target = quoted.author || quoted.from;
            amountStr = args[0]; // .dar-puntos 50 (respondiendo)
        } else {
            return msg.reply(warn('Uso: .dar-puntos @usuario [cantidad] o responde a un mensaje con .dar-puntos [cantidad]'));
        }

        const amount = parseInt(amountStr, 10);
        if (isNaN(amount)) {
            return msg.reply(warn('Por favor indica una cantidad válida de puntos (número).'));
        }

        const chatId = chat.id._serialized;
        const db = getDB();

        if (!db.userReactions) db.userReactions = {};
        if (!db.userReactions[chatId]) db.userReactions[chatId] = {};
        if (!db.userReactions[chatId][target]) {
            db.userReactions[chatId][target] = { pos: 0, neg: 0 };
        }

        // Añadimos los puntos como "pos" (reacciones positivas)
        db.userReactions[chatId][target].pos += amount;
        saveDB();

        return msg.reply(ok(`Se han añadido ${amount} puntos de ranking a @${target.split('@')[0]}.`), {
            mentions: [target]
        });
    }
};