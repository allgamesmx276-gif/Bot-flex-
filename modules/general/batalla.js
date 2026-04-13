module.exports = {
    name: 'batalla',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('Este comando funciona solo en grupos.');

        let target;
        if (msg.mentionedIds && msg.mentionedIds.length > 0) {
            target = msg.mentionedIds[0];
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            target = quoted.author || quoted.from;
        } else {
            return msg.reply('Usa: .batalla @usuario o responde un mensaje');
        }

        const actor = msg.author || msg.from;
        if (actor === target) {
            return msg.reply('No puedes batallar contra ti mismo 😅');
        }

        const actorPower = Math.floor(Math.random() * 100) + 1;
        const targetPower = Math.floor(Math.random() * 100) + 1;
        const winner = actorPower >= targetPower ? actor : target;

        const text = [
            '⚔️ *BATALLA*',
            `@${actor.split('@')[0]} Poder: ${actorPower}`,
            `@${target.split('@')[0]} Poder: ${targetPower}`,
            '',
            `🏆 Ganador: @${winner.split('@')[0]}`
        ].join('\n');

        return msg.reply(text, undefined, { mentions: [actor, target, winner] });
    }
};
