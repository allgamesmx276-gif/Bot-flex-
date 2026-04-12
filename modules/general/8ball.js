const ANSWERS = [
    'Si.',
    'No.',
    'Tal vez.',
    'Definitivamente si.',
    'Definitivamente no.',
    'Parece que si.',
    'No cuenta con ello.',
    'Mejor pregunta mas tarde.',
    'Las señales apuntan a que si.',
    'No lo veo claro.'
];

module.exports = {
    name: '8ball',
    category: 'general',

    async execute(client, msg, args) {
        const question = args.join(' ').trim();

        if (!question) {
            return msg.reply('Uso: .8ball <pregunta>\nEjemplo: .8ball me ira bien hoy?');
        }

        const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
        return msg.reply(`Pregunta: ${question}\nRespuesta: ${answer}`);
    }
};
