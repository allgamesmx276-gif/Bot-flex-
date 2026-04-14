const { getDB, saveDB } = require('../../utils/db');

module.exports = {
    name: 'bot',
    category: 'admin',
    minPlan: 'free',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        if (!chat.isGroup) {
            return msg.reply('Este comando funciona solo en grupos.');
        }

        const db = getDB();
        const chatId = chat.id._serialized;
        if (!db.pausedGroups || typeof db.pausedGroups !== 'object') {
            db.pausedGroups = {};
        }
        const action = String(args[0] || 'ver').toLowerCase();
        const paused = Boolean(db.pausedGroups[chatId]);

        if (action === 'ver') {
            return msg.reply(
                `🤖 Estado del bot: *${paused ? 'OFF (sin responder)' : 'ON (activo)'}*\n` +
                `Uso: .bot on | off | ver`
            );
        }

        if (action === 'off') {
            if (paused) {
                return msg.reply('El bot ya está en modo OFF en este grupo.');
            }

            db.pausedGroups[chatId] = true;
            saveDB();
            return msg.reply('🛑 Bot en *OFF* para este grupo. Sigo en línea y respondiendo en otros grupos.');
        }

        if (action === 'on') {
            if (!paused) {
                return msg.reply('El bot ya está en modo ON en este grupo.');
            }

            delete db.pausedGroups[chatId];
            saveDB();
            return msg.reply('✅ Bot en *ON* para este grupo. Ya vuelvo a responder aquí.');
        }

        return msg.reply('Uso: .bot on | off | ver');
    }
};
