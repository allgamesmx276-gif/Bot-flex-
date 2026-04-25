const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'auto-responder',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;

        if (!await isRegisteredAdmin(msg, client)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const option = (args[0] || 'ver').toLowerCase();

        if (!['on', 'off', 'ver', 'view', 'status'].includes(option)) {
            return msg.reply(warn('Usa: .auto-responder on | off | ver'));
        }

        const groupDb = readGroupDB(chatId);

        if (option === 'ver' || option === 'view' || option === 'status') {
            return msg.reply(ok(`Auto responder ${groupDb.autoResponderEnabled ? '🟢 ON' : '🔴 OFF'}`));
        }
        groupDb.autoResponderEnabled = option === 'on';
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Auto responder ${option === 'on' ? '🟢 ON' : '🔴 OFF'}`));
    }
};
