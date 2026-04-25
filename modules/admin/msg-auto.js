const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { startMsgAuto, stopMsgAuto } = require('../../utils/msgAuto');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'msg-auto',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;

        if (!await isRegisteredAdmin(msg, client)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const option = (args[0] || 'ver').toLowerCase();

        if (!['on', 'off', 'ver', 'view', 'status'].includes(option)) {
            return msg.reply(warn('Usa: .msg-auto on | off | ver'));
        }

        const groupDb = readGroupDB(chatId);

        if (option === 'ver' || option === 'view' || option === 'status') {
            return msg.reply(ok(`MsgAuto ${groupDb.msgAutoEnabled ? '🟢 ON' : '🔴 OFF'}`));
        }

        const enabled = option === 'on';

        groupDb.msgAutoEnabled = enabled;
        saveGroupDB(chatId, groupDb);

        if (enabled) {
            startMsgAuto(client, chatId);
        } else {
            stopMsgAuto(chatId);
        }

        return msg.reply(ok(`MsgAuto ${enabled ? '🟢 ON' : '🔴 OFF'}`));
    }
};
