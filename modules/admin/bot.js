const { getDB, saveDB } = require('../../utils/db');

module.exports = {
    name: 'bot',
    category: 'admin',
    minPlan: 'basic',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        if (!chat.isGroup) {
            return msg.reply('Este comando funciona solo en grupos.');
        }

        const db = getDB();
        const action = String(args[0] || 'ver').toLowerCase();
        const paused = Boolean(db.config && db.config.botPaused);

        if (action === 'ver') {
            return msg.reply(
                `🤖 Estado del bot: *${paused ? 'OFF (sin responder)' : 'ON (activo)'}*\n` +
                `Uso: .bot on | off | ver`
            );
        }

        if (action === 'off') {
            if (paused) {
                return msg.reply('El bot ya está en modo OFF (sin responder).');
            }

            db.config.botPaused = true;
            saveDB();
            return msg.reply('🛑 Bot en *OFF*. Sigo en línea pero dejaré de responder hasta usar *.bot on*.');
        }

        if (action === 'on') {
            if (!paused) {
                return msg.reply('El bot ya está en modo ON.');
            }

            db.config.botPaused = false;
            saveDB();
            return msg.reply('✅ Bot en *ON*. Ya vuelvo a responder normalmente.');
        }

        return msg.reply('Uso: .bot on | off | ver');
    }
};
