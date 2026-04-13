function section(title, value) {
    return `${title}:\n${value}`;
}

const { getCommands } = require('../../handler');

const HELP_BY_COMMAND = {
    convert: [
        section('Que hace', 'Convierte montos entre monedas y acepta formato rapido.'),
        section('Como usar', '.convert <monto> <origen> <destino>'),
        section('Como funciona', 'Toma el monto, lee moneda origen/destino y calcula con la tasa actual.'),
        section('Ejemplos', '.convert 100 usd mxn\n.convert 0.6')
    ].join('\n\n'),
    calc: [
        section('Que hace', 'Evalua operaciones matematicas.'),
        section('Como usar', '.calc <operacion>'),
        section('Como funciona', 'Resuelve la expresion respetando prioridad de operadores.'),
        section('Ejemplo', '.calc 2 + 2 * 5')
    ].join('\n\n'),
    qr: [
        section('Que hace', 'Genera un codigo QR desde texto o enlace.'),
        section('Como usar', '.qr <texto o enlace>'),
        section('Como funciona', 'Codifica tu texto y te devuelve la imagen QR lista para compartir.'),
        section('Ejemplo', '.qr https://ejemplo.com')
    ].join('\n\n'),
    traducir: [
        section('Que hace', 'Traduce texto al idioma que indiques.'),
        section('Como usar', '.traducir <idioma> <texto>'),
        section('Como funciona', 'Toma el codigo de idioma (en, fr, it, etc.) y traduce el texto.'),
        section('Ejemplo', '.traducir en hola mundo')
    ].join('\n\n'),
    clima: [
        section('Que hace', 'Muestra clima actual de una ciudad.'),
        section('Como usar', '.clima <ciudad>'),
        section('Como funciona', 'Busca la ciudad y devuelve temperatura/condicion meteo.'),
        section('Ejemplo', '.clima Monterrey')
    ].join('\n\n'),
    s: [
        section('Que hace', 'Convierte imagen a sticker.'),
        section('Como usar', 'Envia una imagen con .s o responde una imagen con .s'),
        section('Como funciona', 'Descarga la imagen, la convierte y la manda como sticker.'),
        section('Tip', 'Si falla una imagen, prueba con otra o con menos peso.')
    ].join('\n\n'),
    encuesta: [
        section('Que hace', 'Crea encuestas y permite votar, ver resultados, cerrar o sortear.'),
        section('Como usar', '.encuesta <pregunta> | <op1> | <op2>\n.encuesta votar <numero>\n.encuesta resultados\n.encuesta resumen\n.encuesta cerrar'),
        section('Como funciona', 'Guarda votos por usuario en el grupo y calcula el conteo en tiempo real.'),
        section('Ejemplo', '.encuesta Mejor juego? | FIFA | COD | Forza')
    ].join('\n\n'),
    recordar: [
        section('Que hace', 'Guarda recordatorios rapidos.'),
        section('Como usar', '.recordar <texto>\n.recordar ver\n.recordar borrar'),
        section('Como funciona', 'Asocia recordatorios al usuario y permite consultarlos o limpiarlos.'),
        section('Ejemplo', '.recordar pagar internet')
    ].join('\n\n'),
    afk: [
        section('Que hace', 'Te marca como ausente con motivo.'),
        section('Como usar', '.afk <motivo>'),
        section('Como funciona', 'Guarda tu estado AFK y al mencionar tu usuario responde con el motivo.\nSe desactiva cuando vuelves a escribir.'),
        section('Ejemplo', '.afk en clase')
    ].join('\n\n'),
    random: [
        section('Que hace', 'Genera un numero aleatorio entre un minimo y maximo.'),
        section('Como usar', '.random <min> <max>'),
        section('Como funciona', 'Toma ambos limites y genera un valor entero aleatorio en ese rango.'),
        section('Ejemplo', '.random 1 100')
    ].join('\n\n'),
    dado: [
        section('Que hace', 'Lanza un dado virtual.'),
        section('Como usar', '.dado [caras]'),
        section('Como funciona', 'Si no indicas caras usa valor por defecto; si indicas, usa ese maximo.'),
        section('Ejemplo', '.dado 20')
    ].join('\n\n'),
    caraocruz: [
        section('Que hace', 'Lanza una moneda virtual (cara o cruz).'),
        section('Como usar', '.caraocruz'),
        section('Como funciona', 'Resultado aleatorio entre dos opciones.'),
        section('Tip', 'Util para decisiones rapidas en grupo.')
    ].join('\n\n'),
    frase: [
        section('Que hace', 'Envia una frase aleatoria.'),
        section('Como usar', '.frase'),
        section('Como funciona', 'Selecciona una frase del conjunto disponible y la responde.'),
        section('Tip', 'Puedes usarla para dinamizar el chat.')
    ].join('\n\n'),
    chiste: [
        section('Que hace', 'Manda un chiste aleatorio.'),
        section('Como usar', '.chiste'),
        section('Como funciona', 'Obtiene un chiste y lo publica en el chat.'),
        section('Tip', 'Ideal para usar junto con .meme')
    ].join('\n\n'),
    meme: [
        section('Que hace', 'Trae un meme con imagen.'),
        section('Como usar', '.meme'),
        section('Como funciona', 'Consulta una fuente de memes y envía una imagen valida.'),
        section('Tip', 'Si una imagen falla, intenta de nuevo.')
    ].join('\n\n'),
    userinfo: [
        section('Que hace', 'Muestra informacion basica de tu usuario.'),
        section('Como usar', '.userinfo'),
        section('Como funciona', 'Lee datos de usuario desde el contexto del chat y los muestra.'),
        section('Tip', 'Combina con .miid para soporte.')
    ].join('\n\n'),
    miid: [
        section('Que hace', 'Muestra tu ID de WhatsApp para configuraciones/admin.'),
        section('Como usar', '.miid'),
        section('Como funciona', 'Toma el identificador de tu mensaje actual y lo imprime.'),
        section('Tip', 'Util para setadminplan y diagnosticos.')
    ].join('\n\n'),
    '8ball': [
        section('Que hace', 'Responde una pregunta con estilo bola magica.'),
        section('Como usar', '.8ball <pregunta>'),
        section('Como funciona', 'Elige una respuesta aleatoria de una lista predefinida.'),
        section('Ejemplo', '.8ball tendre suerte hoy?')
    ].join('\n\n'),
    elige: [
        section('Que hace', 'Elige una opcion entre varias.'),
        section('Como usar', '.elige opcion1 | opcion2 | opcion3'),
        section('Como funciona', 'Separa tus opciones por | y devuelve una al azar.'),
        section('Tip', 'Perfecto para desempates.')
    ].join('\n\n'),
    ship: [
        section('Que hace', 'Calcula compatibilidad entre dos usuarios.'),
        section('Como usar', '.ship @usuario o responde mensaje'),
        section('Como funciona', 'Genera un porcentaje aleatorio y etiqueta a ambos usuarios.'),
        section('Tip', 'Solo modo diversion.')
    ].join('\n\n'),
    simulador: [
        section('Que hace', 'Genera un porcentaje meme sobre un tema.'),
        section('Como usar', '.simulador <tema>'),
        section('Como funciona', 'Toma el tema escrito y devuelve porcentaje aleatorio.'),
        section('Ejemplo', '.simulador pro player')
    ].join('\n\n'),
    ruleta: [
        section('Que hace', 'Lanza una ruleta con premio/castigo divertido.'),
        section('Como usar', '.ruleta'),
        section('Como funciona', 'Selecciona una opcion aleatoria de una lista de resultados.'),
        section('Tip', 'Ideal para dinamicas de grupo.')
    ].join('\n\n'),
    batalla: [
        section('Que hace', 'Simula una batalla entre dos usuarios.'),
        section('Como usar', '.batalla @usuario o responde mensaje'),
        section('Como funciona', 'Asigna poder aleatorio a ambos y anuncia un ganador.'),
        section('Tip', 'No aplica sanciones reales, solo juego.')
    ].join('\n\n'),
    trivia: [
        section('Que hace', 'Inicia una trivia de opcion multiple en el grupo.'),
        section('Como usar', '.trivia'),
        section('Como funciona', 'Publica una pregunta, guarda la respuesta correcta y espera .respuesta.'),
        section('Siguiente paso', 'Usa .respuesta <numero> para contestar.')
    ].join('\n\n'),
    respuesta: [
        section('Que hace', 'Responde la trivia activa del grupo.'),
        section('Como usar', '.respuesta <numero>'),
        section('Como funciona', 'Valida tu opcion, compara con la correcta y cierra la trivia.'),
        section('Ejemplo', '.respuesta 2')
    ].join('\n\n')
};

function buildAutoHelp(commandDef) {
    if (!commandDef) return null;

    const name = commandDef.name || 'comando';
    const category = commandDef.category || 'general';
    const minPlan = commandDef.minPlan || (category === 'admin' ? 'basic' : category === 'owner' ? 'premium' : 'free');
    const access = commandDef.ownerOnly
        ? 'Solo owner'
        : category === 'admin'
            ? 'Admins del grupo y owner'
            : 'Usuarios del grupo (segun plan)';

    return [
        section('Que hace', `Ejecuta la funcion del comando *${name}*.`),
        section('Como usar', `.${name}`),
        section('Como funciona', 'Recibe argumentos opcionales y procesa la accion definida para este comando.'),
        section('Requisitos', `Categoria: ${category}\nPlan minimo: ${minPlan}\nAcceso: ${access}`),
        section('Tip', `Si necesitas sintaxis exacta, prueba usar el comando y revisa su mensaje de uso. Ej: .${name}`)
    ].join('\n\n');
}

module.exports = {
    name: 'ayuda',
    category: 'general',

    async execute(client, msg, args) {
        const command = (args[0] || '').toLowerCase();

        if (!command) {
            return msg.reply('Uso: .ayuda <comando>\nEjemplos:\n• .ayuda convert\n• .ayuda encuesta\n• .ayuda traducir');
        }

        const help = HELP_BY_COMMAND[command];

        if (help) {
            return msg.reply(help);
        }

        const commandDef = getCommands().find(cmd => cmd && cmd.name && cmd.name.toLowerCase() === command);
        const autoHelp = buildAutoHelp(commandDef);

        if (autoHelp) {
            return msg.reply(autoHelp);
        }

        return msg.reply(`No tengo ayuda registrada para: ${command}`);
    }
};
