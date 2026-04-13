module.exports = {
    name: 'simulador',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('Este comando funciona solo en grupos.');

        const topic = args.join(' ').trim() || 'pro gamer';
        const target = (msg.mentionedIds && msg.mentionedIds[0]) || (msg.author || msg.from);
        const score = Math.floor(Math.random() * 101);

        const text = [
            '🎲 *SIMULADOR*',
            `@${target.split('@')[0]} tiene *${score}%* de ser *${topic}*.`
        ].join('\n');

        return msg.reply(text, undefined, { mentions: [target] });
    }
};
