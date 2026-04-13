module.exports = {
    name: 'ship',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('Este comando funciona solo en grupos.');

        let a = msg.author || msg.from;
        let b = null;

        if (msg.mentionedIds && msg.mentionedIds.length > 0) {
            b = msg.mentionedIds[0];
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            b = quoted.author || quoted.from;
        }

        if (!b) {
            return msg.reply('Usa: .ship @usuario o responde un mensaje');
        }

        const score = Math.floor(Math.random() * 101);
        let label = '💔 Complicado';
        if (score >= 80) label = '💖 Destinados';
        else if (score >= 60) label = '💘 Buen match';
        else if (score >= 40) label = '😏 Puede funcionar';

        const text = [
            '💞 *SHIP METER*',
            '',
            `@${a.split('@')[0]} + @${b.split('@')[0]}`,
            `Compatibilidad: *${score}%*`,
            `${label}`
        ].join('\n');

        return msg.reply(text, undefined, { mentions: [a, b] });
    }
};
