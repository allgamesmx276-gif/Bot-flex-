const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB } = require('../../utils/groupDb');
const { error, info } = require('../../utils/style');

module.exports = {
    name: 'list-auto-responder',
    category: 'admin',

    async execute(client, msg) {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;

        if (!isRegisteredAdmin(msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const list = readGroupDB(chatId).autoResponses || [];

        if (!list.length) {
            return msg.reply(info('Sin datos'));
        }

        let text = 'ℹ️ Lista de auto respuestas:\n';

        list.forEach((item, index) => {
            text += `${index + 1}. ${item.trigger}\n`;
        });

        return msg.reply(text);
    }
};
