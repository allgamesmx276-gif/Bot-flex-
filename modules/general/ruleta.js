module.exports = {
    name: 'ruleta',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg) {
        const outcomes = [
            '🎉 Premio sorpresa',
            '😅 Te salvaste esta vez',
            '🍀 Suerte máxima',
            '🤡 Mini castigo: manda un meme',
            '💤 Castigo suave: 5 minutos en silencio',
            '🕺 Premio: elige una canción para el grupo'
        ];

        const result = outcomes[Math.floor(Math.random() * outcomes.length)];
        return msg.reply(`🎡 *RULETA FLEXBOT*\n\nResultado: ${result}`);
    }
};
