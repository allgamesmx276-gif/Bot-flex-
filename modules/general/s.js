module.exports = {
    name: 's',
    category: 'general',

    async execute(client, msg) {
        try {
            const chat = await msg.getChat();
            let media = null;

            if (msg.hasMedia) {
                media = await msg.downloadMedia();
            } else if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                if (quoted.hasMedia) {
                    media = await quoted.downloadMedia();
                }
            }

            if (!media) {
                return msg.reply('Usa .s con una imagen o responde a una imagen con .s');
            }

            if (!String(media.mimetype || '').startsWith('image/')) {
                return msg.reply('Solo puedo convertir imagenes a sticker.');
            }

            await client.sendMessage(chat.id._serialized, media, {
                sendMediaAsSticker: true,
                stickerAuthor: 'FlexBot',
                stickerName: 'Sticker'
            });

            return;
        } catch (err) {
            console.error('ERROR STICKER:', err);
            return msg.reply('No se pudo crear el sticker. Intenta con otra imagen.');
        }
    }
};
