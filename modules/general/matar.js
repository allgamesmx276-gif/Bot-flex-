const { MessageMedia } = require('whatsapp-web.js');

const MEDIA = [
    'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif',
    'https://media.giphy.com/media/3o7TKsQ8UQ9jvJ6f56/giphy.gif'
];

const TEXTS = [
    '⚔️ @ACTOR y @TARGET entraron a una batalla de videojuego... ¡@TARGET cayó en combate!',
    '💥 @ACTOR lanzó su ataque especial y @TARGET quedó fuera de la partida.',
    '🎮 Duelo épico: @ACTOR derrotó a @TARGET en modo arena.'
];

module.exports = {
    name: 'matar',
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
            return msg.reply('Usa: .matar @usuario o responde un mensaje');
        }

        const actor = msg.author || msg.from;
        const text = TEXTS[Math.floor(Math.random() * TEXTS.length)]
            .replace(/@ACTOR/g, `@${actor.split('@')[0]}`)
            .replace(/@TARGET/g, `@${target.split('@')[0]}`);

        const mediaUrl = MEDIA[Math.floor(Math.random() * MEDIA.length)];
        const mentions = [actor, target];

        try {
            const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
            return client.sendMessage(msg.from, media, { caption: text, mentions, gifPlayback: true });
        } catch {
            return msg.reply(text, undefined, { mentions });
        }
    }
};
