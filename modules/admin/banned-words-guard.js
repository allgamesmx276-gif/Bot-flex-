const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');

module.exports = {
    name: 'banned-words-guard',
    category: 'system',
    auto: true,
    hidden: true,

    async execute(client, msg) {
        if (!msg.body) return;
        if (msg.fromMe) return;

        // Optimización: verificación rápida antes de getChat()
        if (!msg.from.endsWith('@g.us')) return;

        const text = msg.body.toLowerCase();
        const chatId = msg.from;
        const groupDb = readGroupDB(chatId);

        if (!groupDb.bannedWordsEnabled) return;
        if (!groupDb.bannedWords || groupDb.bannedWords.length === 0) return;

        // Verificar si contiene alguna palabra prohibida antes de pedir datos del chat
        const foundWord = groupDb.bannedWords.find(word => text.includes(word.toLowerCase()));
        if (!foundWord) return;

        try {
            const chat = await msg.getChat();
            const sender = msg.author || msg.from;

            if (!groupDb.warns) groupDb.warns = {};
            if (!groupDb.warns[sender]) {
                groupDb.warns[sender] = 0;
            }

            groupDb.warns[sender]++;
            const warns = groupDb.warns[sender];

            saveGroupDB(chatId, groupDb);

            await msg.delete(true).catch(() => {});

            const participant = chat.participants.find(p => p.id._serialized === sender);
            const name = participant ? participant.contact.pushname || 'Usuario' : 'Usuario';

            const warnMessage = `⚠️ *${name}* - Advertencia ${warns}/3\nPalabra prohibida detectada: "${foundWord}"`;

            await msg.reply(warnMessage);

            if (warns >= 3) {
                await msg.reply(`🔇 *${name}* ha sido silenciado por exceder 3 advertencias. Sus próximos mensajes serán eliminados.`);
                if (!groupDb.silenced) groupDb.silenced = {};
                groupDb.silenced[sender] = true;
                saveGroupDB(chatId, groupDb);
            }

            msg._flexHandled = true;
            return;
        } catch (err) {
            console.error('ERROR BANNED WORDS GUARD:', err);
        }
    }
};
