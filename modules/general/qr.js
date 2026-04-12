const { MessageMedia } = require('whatsapp-web.js');

module.exports = {
    name: 'qr',
    category: 'general',

    async execute(client, msg, args) {
        const text = args.join(' ').trim();

        if (!text) {
            return msg.reply('Uso: .qr <texto o enlace>\nEjemplo: .qr https://wa.me/5210000000000');
        }

        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`;
            const media = await MessageMedia.fromUrl(url, { unsafeMime: true });

            await client.sendMessage(msg.from, media, {
                caption: 'QR generado correctamente.'
            });
        } catch (err) {
            console.error('ERROR QR:', err);
            return msg.reply('No se pudo generar el QR en este momento.');
        }
    }
};
