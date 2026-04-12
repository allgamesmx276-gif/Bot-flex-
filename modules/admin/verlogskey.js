const { getDB } = require('../../utils/db');
const { info } = require('../../utils/style');

module.exports = {
    name: 'verlogskey',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (chat.isGroup) {
            return msg.reply('❌ Usa este comando por privado con el bot');
        }

        const db = getDB();
        return msg.reply(info(`Clave actual de logs: ${db.config.logsKey}`));
    }
};
