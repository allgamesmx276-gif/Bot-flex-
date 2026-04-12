const JOKES = [
    'Por que los programadores confunden Halloween y Navidad? Porque OCT 31 = DEC 25.',
    'No es un bug, es una feature inesperada.',
    'Ayer sali a correr... pero me atrapo la pereza.',
    'Mi WiFi y yo tenemos una relacion complicada: a veces conecta, a veces no.',
    'Quise hacer ejercicio, pero justo se me actualizo el cansancio.',
    'Trabaja inteligente, no duro... excepto cuando no queda de otra.',
    'El teclado y yo tenemos diferencias, pero siempre terminamos escribiendo la historia.',
    'Hoy no estoy procrastinando, estoy posponiendo estrategicamente.'
];

module.exports = {
    name: 'chiste',
    category: 'general',

    async execute(client, msg) {
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        return msg.reply(`Chiste: ${joke}`);
    }
};
