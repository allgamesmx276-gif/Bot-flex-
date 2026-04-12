const HELP_BY_COMMAND = {
    convert: 'Uso: .convert <monto> <origen> <destino>\nEjemplo: .convert 100 usd mxn\nAtajo: .convert 0.6',
    calc: 'Uso: .calc 2 + 2 * 5',
    qr: 'Uso: .qr <texto o enlace>\nEjemplo: .qr https://ejemplo.com',
    traducir: 'Uso: .traducir <idioma> <texto>\nEjemplo: .traducir en hola mundo',
    clima: 'Uso: .clima <ciudad>\nEjemplo: .clima Monterrey',
    s: 'Uso: envia una imagen con .s o responde a una imagen con .s',
    encuesta: 'Uso:\n.encuesta <pregunta> | <opcion1> | <opcion2>\n.encuesta sorteo\n.encuesta sorteo <limite> | <pregunta> | <opcion1> | <opcion2>\n.encuesta <pregunta> | <opcion1> | <opcion2> --max <limite>\nVoto rapido: enviar solo el numero (ej: 2)\n.encuesta votar <numero>\n.encuesta resultados\n.encuesta resumen\n.encuesta votantes\n.encuesta reiniciar\n.encuesta cerrar',
    recordar: 'Uso: .recordar <texto>\nOpciones: .recordar ver | .recordar borrar',
    afk: 'Uso: .afk <motivo>\nEjemplo: .afk comiendo',
    hora: 'Uso: .hora',
    fecha: 'Uso: .fecha',
    random: 'Uso: .random <min> <max>\nEjemplo: .random 1 100',
    dado: 'Uso: .dado [caras]\nEjemplo: .dado 20',
    caraocruz: 'Uso: .caraocruz',
    frase: 'Uso: .frase',
    chiste: 'Uso: .chiste',
    meme: 'Uso: .meme',
    userinfo: 'Uso: .userinfo',
    miid: 'Uso: .miid',
    '8ball': 'Uso: .8ball <pregunta>\nEjemplo: .8ball tendre suerte hoy?',
    elige: 'Uso: .elige opcion1 | opcion2 | opcion3'
};

module.exports = {
    name: 'ayuda',
    category: 'general',

    async execute(client, msg, args) {
        const command = (args[0] || '').toLowerCase();

        if (!command) {
            return msg.reply('Uso: .ayuda <comando>\nEjemplos:\n• .ayuda convert\n• .ayuda encuesta\n• .ayuda traducir');
        }

        const help = HELP_BY_COMMAND[command];

        if (!help) {
            return msg.reply(`No tengo ayuda registrada para: ${command}`);
        }

        return msg.reply(help);
    }
};
