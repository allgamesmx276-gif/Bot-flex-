const { getDB, saveDB } = require('../../utils/db');
const { isRegisteredAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'dellogs',
    category: 'admin',
    hidden: true,

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (chat.isGroup) return;

        if (!isRegisteredAdmin(msg) && !isOwner(msg)) {
            return msg.reply('❌ Solo admins o el owner pueden borrar logs');
        }

        const num = parseInt(args[0], 10);
        const key = args[1];
        const db = getDB();

        if (!num || !key) {
            return msg.reply('❌ Uso: .dellogs 1 CLAVE');
        }

        if (key !== db.config.logsKey) {
            return msg.reply('❌ Clave incorrecta');
        }

        if (!db.logs[num - 1]) {
            return msg.reply('❌ Log no existe');
        }

        db.logs.splice(num - 1, 1);
        saveDB();

        return msg.reply(`🗑 Log ${num} eliminado`);
    }
};
