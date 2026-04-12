const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { error, ok } = require('../../utils/style');

module.exports = {
    name: 'del-auto-responder',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;

        if (!isRegisteredAdmin(msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const num = parseInt(args[0], 10);
        const groupDb = readGroupDB(chatId);
        const list = groupDb.autoResponses || [];

        if (!num || num < 1 || num > list.length) {
            return msg.reply(error('Numero invalido'));
        }

        list.splice(num - 1, 1);
        groupDb.autoResponses = list;
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok('Auto respuesta eliminada'));
    }
};
