const { getDB, saveDB } = require('../../utils/db');

const QUESTIONS = [
    { q: '¿Cuál es la capital de México?', options: ['Monterrey', 'Guadalajara', 'CDMX', 'Puebla'], answer: 3 },
    { q: '¿Cuánto es 7 x 8?', options: ['54', '56', '64', '58'], answer: 2 },
    { q: '¿Qué planeta es conocido como el planeta rojo?', options: ['Venus', 'Marte', 'Júpiter', 'Saturno'], answer: 2 },
    { q: '¿Cuál es el océano más grande?', options: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], answer: 3 },
    { q: '¿Quién pintó la Mona Lisa?', options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Dalí'], answer: 2 }
];

module.exports = {
    name: 'trivia',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('Este comando funciona solo en grupos.');

        const chatId = chat.id._serialized;
        const db = getDB();
        const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

        db.triviaGames[chatId] = {
            answer: question.answer,
            question: question.q,
            options: question.options,
            createdAt: Date.now(),
            by: msg.author || msg.from
        };
        saveDB();

        const lines = [
            '🧠 *TRIVIA*',
            question.q,
            '',
            ...question.options.map((opt, i) => `${i + 1}. ${opt}`),
            '',
            'Responde con: *.respuesta <número>*'
        ];

        return msg.reply(lines.join('\n'));
    }
};
