const { getDB, saveDB } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'setregisterkey',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (chat.isGroup) {
            return msg.reply('❌ Usa este comando por privado con el bot');
        }

        const newKey = (args[0] || '').trim();

        if (!newKey) {
            return msg.reply(warn('Uso: setregisterkey <nueva_clave>'));
        }

        if (newKey.length < 8) {
            return msg.reply(warn('La clave debe tener al menos 8 caracteres'));
        }

        const db = getDB();
        const previousKey = db.config.registerKey;
        db.config.registerKey = newKey;
        saveDB();

        auditAction(msg, 'SET_REGISTER_KEY', {
            previousKeyLength: String(previousKey || '').length,
            newKeyLength: newKey.length
        });

        return msg.reply(ok('Clave de registro actualizada'));
    }
};
