const { MessageMedia } = require('whatsapp-web.js');

const MEDIA = [
    'https://media.giphy.com/media/26Ff5KNXikHNDNwB2/giphy.gif',
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
];

const TEXTS = [
    '💍 ¡Boda en FlexBot! @A y @B ahora están casados oficialmente.',
    '💒 Se abren las puertas de la capilla: @A + @B = matrimonio.',
    '🥂 @A y @B se casaron. ¡Que viva el amor!'
];

module.exports = {
    name: 'casarse',
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
            return msg.reply('Usa: .casarse @usuario o responde un mensaje');
        }

        const actor = msg.author || msg.from;
        const text = TEXTS[Math.floor(Math.random() * TEXTS.length)]
            .replace(/@A/g, `@${actor.split('@')[0]}`)
            .replace(/@B/g, `@${target.split('@')[0]}`);

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
