const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn, info } = require('../../utils/style');

module.exports = {
    name: 'goodbye',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(error('Solo en grupos'));
        }

        if (!isRegisteredAdmin(msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const option = (args[0] || 'ver').toLowerCase();
        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);

        if (option === 'ver' || option === 'view' || option === 'status') {
            return msg.reply(
                [
                    info('Estado de despedida'),
                    `• Sistema: ${groupDb.goodbye ? '🟢 ON' : '🔴 OFF'}`,
                    `• Mensaje: ${groupDb.goodbyeMsg}`
                ].join('\n')
            );
        }

        if (!['on', 'off'].includes(option)) {
            return msg.reply(warn('Usa: .goodbye on | off | ver'));
        }

        groupDb.goodbye = option === 'on';
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Goodbye ${option === 'on' ? '🟢 ON' : '🔴 OFF'}`));
    }
};
