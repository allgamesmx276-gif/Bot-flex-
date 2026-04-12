const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'setgoodbye',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(error('Solo en grupos'));
        }

        if (!isRegisteredAdmin(msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const text = args.join(' ').trim();

        if (!text) {
            return msg.reply(warn('Usa: .setgoodbye tu mensaje'));
        }

        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);
        groupDb.goodbyeMsg = text;
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok('Mensaje de despedida actualizado'));
    }
};
