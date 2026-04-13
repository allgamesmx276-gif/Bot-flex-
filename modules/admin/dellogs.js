const { getDB, saveDB } = require('../../utils/db');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'dellogs',
    category: 'admin',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (chat.isGroup) return;

        if (!isOwner(msg)) {
            return msg.reply('❌ Solo el owner puede borrar logs');
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
