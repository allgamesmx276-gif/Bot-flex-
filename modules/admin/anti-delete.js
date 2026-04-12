const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'anti-delete',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;

        if (!chat.isGroup) {
            return msg.reply(error('Solo en grupos'));
        }

        if (!isRegisteredAdmin(msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const option = (args[0] || '').toLowerCase();

        if (!['on', 'off'].includes(option)) {
            return msg.reply(warn('Usa: .anti-delete on | off'));
        }

        const groupDb = readGroupDB(chatId);
        groupDb.antiDeleteEnabled = option === 'on';
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Anti-delete ${option === 'on' ? '🟢 ON' : '🔴 OFF'}`));
    }
};
