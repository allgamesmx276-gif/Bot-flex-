const { MessageMedia } = require('whatsapp-web.js');

const MEDIA = [
    'https://media.giphy.com/media/3o7TKxLz9bJX8jJfKU/giphy.gif',
    'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif'
];

module.exports = {
    name: 'gay',
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
            target = msg.author || msg.from;
        }

        const score = Math.floor(Math.random() * 101);
        const text = `🌈 Energía arcoíris de @${target.split('@')[0]}: *${score}%*`;
        const mediaUrl = MEDIA[Math.floor(Math.random() * MEDIA.length)];

        try {
            const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
            return client.sendMessage(msg.from, media, { caption: text, mentions: [target], gifPlayback: true });
        } catch {
            return msg.reply(text, undefined, { mentions: [target] });
        }
    }
};
