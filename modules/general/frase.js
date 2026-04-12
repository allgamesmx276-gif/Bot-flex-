const PHRASES = [
    'Hazlo simple, pero hazlo bien.',
    'La constancia vence al talento cuando el talento no es constante.',
    'Un paso pequeno tambien cuenta.',
    'Si puedes imaginarlo, puedes construirlo.',
    'La disciplina pesa gramos; el arrepentimiento pesa toneladas.',
    'Menos excusas, mas resultados.',
    'Todo progreso empieza con una decision.',
    'No busques tiempo, haz tiempo.'
];

module.exports = {
    name: 'frase',
    category: 'general',

    async execute(client, msg) {
        const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
        return msg.reply(`Frase: ${phrase}`);
    }
};
