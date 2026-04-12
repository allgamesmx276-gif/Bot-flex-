const { isAdmin } = require('../../utils/permissions');
const { ok, error } = require('../../utils/style');

module.exports = {
    name: 'close',
    category: 'admin',

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(error('Solo en grupos'));
        }

        if (!await isAdmin(client, msg)) {
            return msg.reply(error('No eres admin'));
        }

        await chat.setMessagesAdminsOnly(true);
        return msg.reply(ok('Grupo cerrado'));
    }
};
