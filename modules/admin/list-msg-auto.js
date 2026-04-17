const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB } = require('../../utils/groupDb');
const { error, info } = require('../../utils/style');

module.exports = {
    name: 'list-msg-auto',
    category: 'admin',

    async execute(client, msg) {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;

        if (!await isRegisteredAdmin(client, msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const list = readGroupDB(chatId).msgAuto || [];

        if (!list.length) {
            return msg.reply(info('Sin datos'));
        }

        let text = 'ℹ️ Lista de mensajes automaticos:\n';

        list.forEach((item, index) => {
            text += `${index + 1}. ${item.text} (${item.time}ms)\n`;
        });

        return msg.reply(text);
    }
};
