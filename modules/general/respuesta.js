const { getDB, saveDB } = require('../../utils/db');

module.exports = {
    name: 'respuesta',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('Este comando funciona solo en grupos.');

        const chatId = chat.id._serialized;
        const db = getDB();
        const game = db.triviaGames && db.triviaGames[chatId];

        if (!game) {
            return msg.reply('No hay una trivia activa. Usa *.trivia* primero.');
        }

        const elapsed = Date.now() - (game.createdAt || 0);
        const maxMs = 2 * 60 * 1000;
        if (elapsed > maxMs) {
            delete db.triviaGames[chatId];
            saveDB();
            return msg.reply('La trivia expiró. Inicia otra con *.trivia*.');
        }

        const selected = parseInt(args[0], 10);
        if (!Number.isInteger(selected) || selected < 1 || selected > (game.options || []).length) {
            return msg.reply('Uso: *.respuesta <número>*');
        }

        const sender = msg.author || msg.from;
        const ok = selected === game.answer;
        const correctText = game.options[game.answer - 1] || `opción ${game.answer}`;

        delete db.triviaGames[chatId];
        saveDB();

        if (ok) {
            return msg.reply(`✅ Correcto @${sender.split('@')[0]}\nRespuesta: *${correctText}*`, undefined, { mentions: [sender] });
        }

        return msg.reply(`❌ Incorrecto @${sender.split('@')[0]}\nRespuesta correcta: *${correctText}*`, undefined, { mentions: [sender] });
    }
};
