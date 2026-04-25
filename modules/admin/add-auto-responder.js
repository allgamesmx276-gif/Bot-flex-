const { getDB, saveDB } = require('../../utils/db');
const { isRegisteredAdmin } = require('../../utils/permissions');
const { error, warn, action } = require('../../utils/style');

module.exports = {
    name: 'add-auto-responder',
    category: 'admin',

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (!await isRegisteredAdmin(msg, client)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const db = getDB();
        const sender = msg.author || msg.from;

        if (db.awaiting[sender]) {
            return msg.reply(warn('Termina el proceso actual o escribe "cancelar"'));
        }

        db.awaiting[sender] = {
            step: 'word',
            chatId: chat.id._serialized
        };

        saveDB();
        return msg.reply(action('Envia la palabra clave'));
    }
};
