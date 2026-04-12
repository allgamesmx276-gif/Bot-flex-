module.exports = {
    name: 'tips',
    category: 'general',

    async execute(client, msg) {
        const lines = [
            'Tips de uso rapido:',
            '',
            '1) Sticker: envia una imagen con .s',
            '2) Moneda: .convert 100 usd mxn',
            '3) Traducir: .traducir en hola mundo',
            '4) Clima: .clima Monterrey',
            '5) Encuesta: .encuesta Pregunta? | opcion1 | opcion2',
            '6) Recordatorio: .recordar comprar pan',
            '7) Historial: .historial'
        ];

        return msg.reply(lines.join('\n'));
    }
};
