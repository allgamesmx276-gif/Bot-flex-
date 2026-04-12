const { getDB } = require('../../utils/db');
const { isRegisteredAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'logs',
    category: 'admin',
    hidden: true,

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (chat.isGroup) return;

        if (!isRegisteredAdmin(msg) && !isOwner(msg)) {
            return msg.reply('❌ Solo admins o el owner pueden ver logs');
        }

        const db = getDB();
        const list = db.logs || [];

        if (!list.length) {
            return msg.reply('Sin logs');
        }

        let text = '📊 LOGS:\n\n';

        list.slice(-10).forEach((item, index) => {
            text += `${index + 1}. ${item.text}\n`;
        });

        return msg.reply(text);
    }
};
