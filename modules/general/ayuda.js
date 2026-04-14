function section(title, value) {
    return `${title}:\n${value}`;
}

const { getCommands } = require('../../handler');
const fs = require('fs');
const path = require('path');

function findCommandFile(commandName) {
    const modulesDir = path.join(process.cwd(), 'modules');
    const folders = fs.existsSync(modulesDir) ? fs.readdirSync(modulesDir) : [];

    for (const folder of folders) {
        const filePath = path.join(modulesDir, folder, `${commandName}.js`);
        if (fs.existsSync(filePath)) return filePath;
    }

    return null;
}

function extractSourceHints(commandName) {
    const filePath = findCommandFile(commandName);
    if (!filePath) return {};

    try {
        const source = fs.readFileSync(filePath, 'utf8');
        const usageMatch = source.match(/Uso:\s*([^'`\n]+)/i);
        const hasOnOff = /on\s*\|\s*off/i.test(source);
        const hasView = /\b(ver|view|status)\b/i.test(source);
        const asksReplyOrMention = /responde|@usuario|quoted/i.test(source);

        return {
            usage: usageMatch ? usageMatch[1].trim() : null,
            hasOnOff,
            hasView,
            asksReplyOrMention
        };
    } catch (_) {
        return {};
    }
}

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
    ].join('\n\n'),
    'msg-auto': [
        section('Que hace', 'Activa o desactiva el envio de mensajes automaticos por intervalo en el grupo.'),
        section('Como usar', '.msg-auto on | off | ver'),
        section('Como funciona', 'Necesita que existan mensajes en la lista msg-auto.\nCon *on* inicia el scheduler del grupo, con *off* lo detiene.'),
        section('Flujo recomendado', '1) .add-msg-auto\n2) Escribe el mensaje\n3) Define el tiempo: 10s / 5m / 1h\n4) .msg-auto on'),
        section('Ejemplo', '.msg-auto on')
    ].join('\n\n'),
    'add-msg-auto': [
        section('Que hace', 'Agrega un mensaje automatico nuevo para el grupo.'),
        section('Como usar', '.add-msg-auto'),
        section('Como funciona', 'Abre un flujo en 2 pasos: primero mensaje, luego intervalo.\nIntervalo valido: s (segundos), m (minutos), h (horas).'),
        section('Ejemplo', '.add-msg-auto  -> "Recuerden leer reglas" -> 30m')
    ].join('\n\n'),
    'list-msg-auto': [
        section('Que hace', 'Lista los mensajes automaticos configurados y su tiempo en ms.'),
        section('Como usar', '.list-msg-auto'),
        section('Como funciona', 'Muestra indice, contenido y tiempo. Ese indice se usa para eliminar con del-msg-auto.'),
        section('Ejemplo', '.list-msg-auto')
    ].join('\n\n'),
    'del-msg-auto': [
        section('Que hace', 'Elimina un mensaje automatico de la lista por numero.'),
        section('Como usar', '.del-msg-auto <numero>'),
        section('Como funciona', 'Borra el item indicado y reinicia la configuracion de msg-auto del grupo.'),
        section('Ejemplo', '.del-msg-auto 2')
    ].join('\n\n'),
    'auto-responder': [
        section('Que hace', 'Activa o desactiva respuestas por palabra clave exacta.'),
        section('Como usar', '.auto-responder on | off | ver'),
        section('Como funciona', 'Solo responde cuando el mensaje coincide exactamente con la clave guardada.'),
        section('Flujo despues de activar', '1) .auto-responder on\n2) .add-auto-responder\n3) Envia palabra clave\n4) Envia la respuesta\n5) Verifica con .list-auto-responder\n6) Elimina con .del-auto-responder <numero> si hace falta'),
        section('Ejemplo', '.auto-responder on')
    ].join('\n\n'),
    'add-auto-responder': [
        section('Que hace', 'Agrega una clave y su respuesta automatica.'),
        section('Como usar', '.add-auto-responder'),
        section('Como funciona', 'Inicia flujo: primero palabra clave, luego respuesta.\nLa coincidencia es exacta, no parcial.'),
        section('Ejemplo', '.add-auto-responder  -> "hola" -> "Hola, bienvenido"')
    ].join('\n\n'),
    'list-auto-responder': [
        section('Que hace', 'Muestra la lista de claves y respuestas configuradas.'),
        section('Como usar', '.list-auto-responder'),
        section('Como funciona', 'Enumera cada regla para que puedas revisar o borrar por indice.'),
        section('Ejemplo', '.list-auto-responder')
    ].join('\n\n'),
    'del-auto-responder': [
        section('Que hace', 'Elimina una regla de auto-respuesta por numero.'),
        section('Como usar', '.del-auto-responder <numero>'),
        section('Como funciona', 'Borra la regla seleccionada de la lista del grupo.'),
        section('Ejemplo', '.del-auto-responder 1')
    ].join('\n\n'),

    cofre: [
        section('Que hace', 'Lanza un cofre con puntos de premio que los miembros intentan abrir.'),
        section('Como usar', '*.cofre* — ver estado | *.cofre abrir* — intentar | *.cofre activar* — (admin) lanzar | *.cofre cerrar* — (admin) cerrar | *.cofre config* — (admin) ajustar'),
        section('Como funciona', 'El admin configura modo, probabilidad, premio y tiempo. Los miembros usan .cofre abrir para intentar ganarlo.'),
        section('Modos', '*primero* — el 1er usuario gana directo\n*suerte* — % de prob por intento, 1 ganador\n*todos* — % de prob, varios ganadores posibles'),
        section('Desde privado', 'Envía *.cofre activar* al bot desde privado — detecta tus grupos y lanza un flujo guiado con preguntas paso a paso.'),
        section('Ejemplo', '.cofre config modo suerte → .cofre config prob 25 → .cofre activar')
    ].join('\n\n'),
    bot: [
        section('Que hace', 'Pone el bot en ON/OFF sin apagar el proceso.'),
        section('Como usar', '.bot on | off | ver'),
        section('Como funciona', 'En OFF el bot queda en linea pero no responde mensajes ni comandos. Solo acepta .bot on para reactivarse.'),
        section('Acceso', 'Admins del grupo (ADMIN CTRL).'),
        section('Ejemplo', '.bot off')
    ].join('\n\n'),

    // ── COMANDOS ADMIN ───────────────────────────────────────────────────────
    ban: [
        section('Que hace', 'Expulsa un usuario del grupo.'),
        section('Como usar', '.ban @usuario | responde un mensaje del usuario'),
        section('Como funciona', 'Verifica permisos, obtiene el ID del usuario mencionado o del mensaje respondido y lo remueve del grupo.'),
        section('Requisitos', 'El bot debe ser admin del grupo. Solo admins pueden usarlo.'),
        section('Tip', 'Genera registro de auditoria del evento.')
    ].join('\n\n'),
    warn: [
        section('Que hace', 'Advierte un usuario y lo expulsa al alcanzar 3 advertencias.'),
        section('Como usar', '.warn @usuario | responde un mensaje del usuario'),
        section('Como funciona', 'Registra advertencias en la base de datos del grupo. Al llegar a 3 warns expulsa automaticamente y resetea el contador.'),
        section('Requisitos', 'Bot admin del grupo. Solo admins.'),
        section('Tip', 'Para ver warns actuales de un usuario ejecuta .warn sin argumentos.')
    ].join('\n\n'),
    welcome: [
        section('Que hace', 'Activa o desactiva el mensaje de bienvenida al entrar nuevos miembros.'),
        section('Como usar', '.welcome on | off | ver'),
        section('Como funciona', 'Guarda la bandera en la base del grupo. Al ingresar alguien se envia el mensaje configurado con .setwelcome.'),
        section('Flujo recomendado', '1) .setwelcome <tu mensaje>\n2) .welcome on'),
        section('Ejemplo', '.welcome on')
    ].join('\n\n'),
    setwelcome: [
        section('Que hace', 'Configura el mensaje de bienvenida personalizado del grupo.'),
        section('Como usar', '.setwelcome <mensaje>'),
        section('Como funciona', 'Guarda el texto en la base del grupo. Se envia cuando entra un nuevo miembro si .welcome esta activo.'),
        section('Ejemplo', '.setwelcome Bienvenido al grupo, lee las reglas antes de participar.')
    ].join('\n\n'),
    goodbye: [
        section('Que hace', 'Activa o desactiva el mensaje de despedida cuando un miembro sale.'),
        section('Como usar', '.goodbye on | off | ver'),
        section('Como funciona', 'Guarda la bandera en la base del grupo. Al salir alguien se envia el mensaje configurado con .setgoodbye.'),
        section('Flujo recomendado', '1) .setgoodbye <tu mensaje>\n2) .goodbye on'),
        section('Ejemplo', '.goodbye on')
    ].join('\n\n'),
    setgoodbye: [
        section('Que hace', 'Configura el mensaje de despedida personalizado del grupo.'),
        section('Como usar', '.setgoodbye <mensaje>'),
        section('Como funciona', 'Guarda el texto en la base del grupo. Se envia cuando un miembro abandona el grupo si .goodbye esta activo.'),
        section('Ejemplo', '.setgoodbye Hasta luego, fue un placer tenerte aqui.')
    ].join('\n\n'),
    'anti-link': [
        section('Que hace', 'Activa o desactiva proteccion contra enlaces en el grupo.'),
        section('Como usar', '.anti-link on | off'),
        section('Como funciona', 'Cuando esta activo detecta y elimina mensajes con links. Agrega warns al usuario por cada link enviado.'),
        section('Requisitos', 'Bot admin del grupo. Solo admins.'),
        section('Tip', 'Al llegar a 3 warns por links el usuario es expulsado automaticamente.')
    ].join('\n\n'),
    'anti-delete': [
        section('Que hace', 'Activa o desactiva proteccion contra eliminacion de mensajes.'),
        section('Como usar', '.anti-delete on | off'),
        section('Como funciona', 'Cuando esta activo guarda mensajes y los recupera si alguien los elimina, publicando el contenido original.'),
        section('Requisitos', 'Bot admin del grupo. Solo admins.'),
        section('Tip', 'Util para auditar grupos con actividad importante.')
    ].join('\n\n'),
    bannedwords: [
        section('Que hace', 'Lista, activa o desactiva el filtro de palabras prohibidas del grupo.'),
        section('Como usar', '.bannedwords on | off | ver'),
        section('Como funciona', 'Muestra palabras predefinidas y personalizadas. Cuando activo filtra mensajes automaticamente.'),
        section('Comandos relacionados', '.addbannedword, .delbannedword, .resetbannedwords'),
        section('Ejemplo', '.bannedwords ver')
    ].join('\n\n'),
    addbannedword: [
        section('Que hace', 'Agrega una palabra a la lista de prohibidas del grupo.'),
        section('Como usar', '.addbannedword <palabra>'),
        section('Como funciona', 'Convierte a minusculas, verifica duplicados y agrega a la lista del grupo.'),
        section('Ejemplo', '.addbannedword insulto')
    ].join('\n\n'),
    delbannedword: [
        section('Que hace', 'Elimina una palabra de la lista de prohibidas del grupo.'),
        section('Como usar', '.delbannedword <palabra>'),
        section('Como funciona', 'Busca la palabra en la lista personalizada del grupo y la elimina.'),
        section('Ejemplo', '.delbannedword insulto')
    ].join('\n\n'),
    resetbannedwords: [
        section('Que hace', 'Restaura la lista de palabras prohibidas a las predefinidas por defecto.'),
        section('Como usar', '.resetbannedwords'),
        section('Como funciona', 'Copia la lista DEFAULT a la lista del grupo, eliminando todas las palabras personalizadas agregadas.'),
        section('Advertencia', 'Destruye la lista personalizada. No se puede deshacer.')
    ].join('\n\n'),
    mutetime: [
        section('Que hace', 'Silencia temporalmente un usuario por el tiempo que indiques.'),
        section('Como usar', '.mutetime <tiempo> @usuario'),
        section('Como funciona', 'Parsea duracion (s/m/h), calcula timestamp de expiracion y guarda en la base. El usuario no puede chatear hasta que expire.'),
        section('Formatos', '30s = 30 segundos\n5m = 5 minutos\n1h = 1 hora'),
        section('Ejemplo', '.mutetime 10m @usuario')
    ].join('\n\n'),
    unmute: [
        section('Que hace', 'Desmuetea un usuario silenciado antes de que expire su tiempo.'),
        section('Como usar', '.unmute @usuario | responde un mensaje del usuario'),
        section('Como funciona', 'Busca al usuario en la lista de muteados y lo elimina, permitiendo que vuelva a chatear.'),
        section('Ejemplo', '.unmute @usuario')
    ].join('\n\n'),
    open: [
        section('Que hace', 'Abre el grupo para que todos los miembros puedan escribir mensajes.'),
        section('Como usar', '.open'),
        section('Como funciona', 'Ejecuta setMessagesAdminsOnly(false) en WhatsApp, permitiendo mensajes de todos.'),
        section('Requisitos', 'El bot debe ser admin del grupo. Solo admins pueden usarlo.')
    ].join('\n\n'),
    close: [
        section('Que hace', 'Cierra el grupo para que solo los admins puedan escribir.'),
        section('Como usar', '.close'),
        section('Como funciona', 'Ejecuta setMessagesAdminsOnly(true) en WhatsApp, bloqueando mensajes de miembros regulares.'),
        section('Requisitos', 'El bot debe ser admin del grupo. Solo admins pueden usarlo.')
    ].join('\n\n'),
    verplan: [
        section('Que hace', 'Muestra el plan actual del grupo y cuantos dias quedan hasta vencimiento.'),
        section('Como usar', '.verplan'),
        section('Como funciona', 'Lee el plan y la fecha de expiracion registrada en la base global del bot.'),
        section('Tip', 'Muestra "sin expiracion" si el plan fue asignado con 0 dias.')
    ].join('\n\n'),
    ranking: [
        section('Que hace', 'Muestra el top 10 de usuarios mas activos del grupo por puntos.'),
        section('Como usar', '.ranking'),
        section('Como funciona', 'Calcula puntos netos (reacciones positivas - negativas + actividad), ordena y muestra con emojis de medalla.'),
        section('Plan minimo', 'basic'),
        section('Tip', 'Usa .rangos para ver como sumar puntos y cuales son los rangos disponibles.')
    ].join('\n\n'),
    inactivos: [
        section('Que hace', 'Lista usuarios inactivos del grupo por cantidad de dias sin actividad.'),
        section('Como usar', '.inactivos <dias>'),
        section('Como funciona', 'Compara la ultima actividad registrada de cada miembro contra el umbral indicado y lista a los que no participaron.'),
        section('Plan minimo', 'basic'),
        section('Ejemplo', '.inactivos 14')
    ].join('\n\n'),
    'expulsar-inactivos': [
        section('Que hace', 'Expulsa automaticamente a usuarios inactivos por X dias.'),
        section('Como usar', '.expulsar-inactivos <dias>'),
        section('Como funciona', 'Obtiene lista de participantes, filtra inactivos segun umbral de dias y los expulsa con pausa entre cada uno.'),
        section('Plan minimo', 'pro'),
        section('Advertencia', 'Salta admins y el bot. Acepta confirmacion antes de proceder.'),
        section('Ejemplo', '.expulsar-inactivos 30')
    ].join('\n\n'),
    backupnow: [
        section('Que hace', 'Crea un backup manual de todos los datos del bot.'),
        section('Como usar', '.backupnow'),
        section('Como funciona', 'Ejecuta la funcion de backup que comprime datos y los guarda en storage/backups/ con timestamp.'),
        section('Tip', 'Retorna la ruta relativa del archivo generado para verificacion.')
    ].join('\n\n'),
    reporte: [
        section('Que hace', 'Envia un reporte de bug o problema al owner del bot.'),
        section('Como usar', '.reporte <comando> <descripcion>'),
        section('Como funciona', 'Genera un mensaje privado al owner con el contexto del chat, usuario, grupo y hora del reporte.'),
        section('Plan minimo', 'basic'),
        section('Ejemplo', '.reporte ban el comando no expulsa aunque el bot es admin')
    ].join('\n\n'),
    comentario: [
        section('Que hace', 'Envia una sugerencia o comentario general al owner del bot.'),
        section('Como usar', '.comentario <texto>'),
        section('Como funciona', 'Construye mensaje con datos del usuario y grupo, lo envia al owner de forma privada y confirma el envio.'),
        section('Plan minimo', 'basic'),
        section('Ejemplo', '.comentario seria genial un comando de sorteos')
    ].join('\n\n'),
    setmenuimg: [
        section('Que hace', 'Establece una imagen personalizada como cabecera del menu del grupo.'),
        section('Como usar', 'Responde una imagen con .setmenuimg | .setmenuimg reset'),
        section('Como funciona', 'Descarga y valida la imagen, la guarda en storage del grupo y el menu la usara como header.'),
        section('Plan minimo', 'premium'),
        section('Tip', 'Con reset elimina la imagen personalizada y vuelve al header por defecto.')
    ].join('\n\n'),
    setmenuname: [
        section('Que hace', 'Establece un titulo personalizado para el menu del grupo.'),
        section('Como usar', '.setmenuname <titulo> | .setmenuname reset'),
        section('Como funciona', 'Guarda el texto (max 40 caracteres) en la base del grupo. El menu usara ese titulo en lugar del nombre global.'),
        section('Plan minimo', 'premium'),
        section('Ejemplo', '.setmenuname 🎮 Comandos Gamer')
    ].join('\n\n'),

    // ── COMANDOS OWNER ───────────────────────────────────────────────────────
    setplan: [
        section('Que hace', 'Asigna un plan (free/basic/pro/premium) a un grupo con duracion.'),
        section('Como usar', '.setplan (en el grupo) | .setplan <chat_id> (en privado)'),
        section('Como funciona', 'Inicia flujo de 2 pasos: primero elige plan, luego dias de duracion. 0 dias = sin vencimiento.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.setplan pro -> 30')
    ].join('\n\n'),
    setadminplan: [
        section('Que hace', 'Asigna un plan personalizado a un admin registrado.'),
        section('Como usar', '.setadminplan <numero@c.us> <plan>'),
        section('Como funciona', 'Verifica que sea admin registrado, valida el plan y lo guarda. "default" elimina el plan personalizado.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.setadminplan 521234567890@c.us pro')
    ].join('\n\n'),
    setprefix: [
        section('Que hace', 'Cambia el prefijo global de comandos del bot.'),
        section('Como usar', '.setprefix <caracter>'),
        section('Como funciona', 'Valida que no tenga espacios y sea de maximo 3 caracteres, luego actualiza db.config.prefix.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.setprefix !')
    ].join('\n\n'),
    broadcast: [
        section('Que hace', 'Envia un mensaje a todos los grupos donde esta el bot.'),
        section('Como usar', '.broadcast <mensaje> | .broadcast [solo-plan:pro] <mensaje>'),
        section('Como funciona', 'Itera sobre todos los grupos con pausa de 800ms entre envios. Soporta filtro de plan opcional.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.broadcast Mantenimiento manana a las 10am')
    ].join('\n\n'),
    checkcmds: [
        section('Que hace', 'Valida la integridad de todos los comandos cargados en el bot.'),
        section('Como usar', '.checkcmds'),
        section('Como funciona', 'Verifica que cada comando tenga nombre y funcion execute(), detecta duplicados y cuenta tipos (auto, hidden, ownerOnly).'),
        section('Solo owner', 'Si'),
        section('Tip', 'Usar despues de agregar nuevos comandos para confirmar que cargaron correctamente.')
    ].join('\n\n'),
    disablecmd: [
        section('Que hace', 'Desactiva un comando renombrandolo a .disabled.js (sin eliminarlo).'),
        section('Como usar', '.disablecmd <nombre>'),
        section('Como funciona', 'Busca el archivo en modules/general, lo renombra a .disabled.js y recarga comandos.'),
        section('Solo owner', 'Si'),
        section('Tip', 'Para reactivarlo usa .enablecmd. Protege "menu" y "ayuda".')
    ].join('\n\n'),
    enablecmd: [
        section('Que hace', 'Reactiva un comando desactivado previamente con .disablecmd.'),
        section('Como usar', '.enablecmd <nombre>'),
        section('Como funciona', 'Busca el archivo .disabled.js en modules/general, lo renombra a .js y recarga comandos.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.enablecmd ping')
    ].join('\n\n'),
    listadmins: [
        section('Que hace', 'Lista todos los admins registrados en el bot con sus planes actuales.'),
        section('Como usar', '.listadmins'),
        section('Como funciona', 'Lee db.admins y muestra cada numero con su plan personalizado o el plan por defecto.'),
        section('Solo owner', 'Si'),
        section('Tip', 'Usa .setadminplan para cambiar el plan de cualquier admin de la lista.')
    ].join('\n\n'),
    listmods: [
        section('Que hace', 'Lista todos los moderadores registrados en el sistema.'),
        section('Como usar', '.listmods'),
        section('Como funciona', 'Lee db.moderators y muestra lista numerada de todos los numeros con rol de moderador.'),
        section('Solo owner', 'Si')
    ].join('\n\n'),
    addmod: [
        section('Que hace', 'Agrega un nuevo moderador al sistema del bot.'),
        section('Como usar', '.addmod <numero@c.us> | menciona usuario'),
        section('Como funciona', 'Valida el formato del numero, verifica que no sea duplicado y lo agrega a db.moderators.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.addmod 521234567890@c.us')
    ].join('\n\n'),
    delmod: [
        section('Que hace', 'Elimina un moderador del sistema del bot.'),
        section('Como usar', '.delmod <numero@c.us> | menciona usuario'),
        section('Como funciona', 'Busca el numero en db.moderators, verifica que exista y lo filtra del array.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.delmod 521234567890@c.us')
    ].join('\n\n'),
    setowner: [
        section('Que hace', 'Transfiere la propiedad del bot a otro usuario.'),
        section('Como usar', '.setowner <numero@c.us> | menciona usuario | responde mensaje'),
        section('Como funciona', 'Valida el nuevo owner, actualiza db.config.ownerNumber y genera registro de auditoria.'),
        section('Solo owner', 'Si'),
        section('Advertencia', 'Operacion irreversible sin acceso al archivo de datos directamente.')
    ].join('\n\n'),
    claimowner: [
        section('Que hace', 'Reclama la propiedad del bot si aun no esta asignada.'),
        section('Como usar', '.claimowner'),
        section('Como funciona', 'Verifica si existe owner, si no asigna al remitente como owner. Solo funciona una vez.'),
        section('Nota', 'Usar en privado. Solo disponible si el bot nunca tuvo owner configurado.')
    ].join('\n\n'),
    reload: [
        section('Que hace', 'Recarga todos los comandos del bot sin reiniciarlo.'),
        section('Como usar', '.reload'),
        section('Como funciona', 'Ejecuta loadCommands() que rescannea la carpeta modules/ y carga archivos actualizados.'),
        section('Solo owner', 'Si'),
        section('Tip', 'Util despues de editar o agregar un archivo de comando desde el servidor.')
    ].join('\n\n'),
    statusbot: [
        section('Que hace', 'Muestra estado del bot: uptime, memoria, chats activos y comandos cargados.'),
        section('Como usar', '.statusbot'),
        section('Como funciona', 'Obtiene process.uptime(), process.memoryUsage(), lista de chats y comandos. Formatea en reporte compacto.'),
        section('Solo owner', 'Si'),
        section('Tip', 'Memoria muestra RSS y Heap en MB. Uptime en dias/horas/minutos/segundos.')
    ].join('\n\n'),
    'cleanup-groups': [
        section('Que hace', 'Limpia del almacenamiento las carpetas de grupos que ya no existen.'),
        section('Como usar', '.cleanup-groups | .cleanup-groups apply'),
        section('Como funciona', 'Sin "apply" solo simula y lista lo que borraria. Con "apply" realiza la limpieza efectiva.'),
        section('Solo owner', 'Si'),
        section('Tip', 'Siempre ejecuta sin "apply" primero para previsualizar.')
    ].join('\n\n'),
    bulksetplan: [
        section('Que hace', 'Asigna el mismo plan a todos los grupos con admins registrados.'),
        section('Como usar', '.bulksetplan <plan> <dias>'),
        section('Como funciona', 'Obtiene lista de grupos, filtra los que tienen admin registrado y asigna plan+expiry a todos.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.bulksetplan pro 30')
    ].join('\n\n'),
    setcmdplan: [
        section('Que hace', 'Establece el plan minimo requerido para ejecutar un comando especifico.'),
        section('Como usar', '.setcmdplan <comando> <plan> | .setcmdplan <comando> default'),
        section('Como funciona', 'Valida que el comando exista, actualiza db.commandPlans[nombre]. "default" elimina la restriccion.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.setcmdplan trivia premium')
    ].join('\n\n'),
    delcmd: [
        section('Que hace', 'Elimina permanentemente un archivo de comando.'),
        section('Como usar', '.delcmd <nombre>'),
        section('Como funciona', 'Busca el archivo .js en modules/general, lo elimina con fs.rmSync y recarga comandos.'),
        section('Solo owner', 'Si'),
        section('Advertencia', 'Operacion destructiva, diferente a .disablecmd. No se puede deshacer.')
    ].join('\n\n'),
    menusection: [
        section('Que hace', 'Crea, organiza y gestiona secciones personalizadas en el menu.'),
        section('Como usar', '.menusection list | create <dominio> <Titulo> | delete <Titulo> | move <sec:cmd> <sec:cmd>'),
        section('Como funciona', 'Gestiona db.menuSections con operaciones create/list/move/delete sobre secciones custom sin tocar las predefinidas.'),
        section('Solo owner', 'Si'),
        section('Dominios validos', 'user, admin, owner')
    ].join('\n\n'),
    movecmd: [
        section('Que hace', 'Mueve un comando hacia arriba o abajo dentro de su seccion en el menu.'),
        section('Como usar', '.movecmd <comando> 1 (subir) | .movecmd <comando> 0 (bajar)'),
        section('Como funciona', 'Busca el comando en db.menuSections, valida la direccion e intercambia posiciones con el adjacente.'),
        section('Solo owner', 'Si'),
        section('Ejemplo', '.movecmd ping 1')
    ].join('\n\n'),
    setlogskey: [
        section('Que hace', 'Configura la clave de seguridad requerida para borrar logs con .dellogs.'),
        section('Como usar', '.setlogskey <clave>'),
        section('Como funciona', 'Valida minimo 8 caracteres, actualiza db.config.logsKey. La clave se requiere en cada .dellogs.'),
        section('Solo owner', 'Si. Solo en privado.'),
        section('Tip', 'No muestra la clave en los logs de auditoria por seguridad.')
    ].join('\n\n'),
    verlogskey: [
        section('Que hace', 'Muestra la clave actual configurada para borrar logs.'),
        section('Como usar', '.verlogskey'),
        section('Como funciona', 'Retorna db.config.logsKey al owner.'),
        section('Solo owner', 'Si. Solo en privado.')
    ].join('\n\n'),
    setregisterkey: [
        section('Que hace', 'Configura la clave necesaria para que admins se registren en el bot.'),
        section('Como usar', '.setregisterkey <clave>'),
        section('Como funciona', 'Valida minimo 8 caracteres, actualiza db.config.registerKey. Los admins la necesitan para el registro inicial.'),
        section('Solo owner', 'Si. Solo en privado.')
    ].join('\n\n'),
    verregisterkey: [
        section('Que hace', 'Muestra la clave actual para registro de admins.'),
        section('Como usar', '.verregisterkey'),
        section('Como funciona', 'Retorna db.config.registerKey al owner.'),
        section('Solo owner', 'Si. Solo en privado.')
    ].join('\n\n'),
    logs: [
        section('Que hace', 'Muestra resumen de grupos activos, planes y ultimos eventos del sistema.'),
        section('Como usar', '.logs'),
        section('Como funciona', 'Lista cada grupo con su plan y dias restantes, seguido de los ultimos 10 eventos registrados.'),
        section('Solo owner', 'Si. Solo en privado.')
    ].join('\n\n'),
    dellogs: [
        section('Que hace', 'Elimina un log especifico del registro del sistema (requiere clave).'),
        section('Como usar', '.dellogs <numero> <clave>'),
        section('Como funciona', 'Valida la clave contra db.config.logsKey, verifica que el log exista y lo borra definitivamente.'),
        section('Solo owner', 'Si. Solo en privado.'),
        section('Ejemplo', '.dellogs 5 MiClave123')
    ].join('\n\n'),
    menulogs: [
        section('Que hace', 'Muestra menu de comandos privados disponibles para el owner.'),
        section('Como usar', '.menulogs'),
        section('Como funciona', 'Retorna lista de comandos privados disponibles con referencias a .ayudalogs para mas detalle.'),
        section('Solo owner', 'Si. Solo en privado.')
    ].join('\n\n'),
    ayudalogs: [
        section('Que hace', 'Muestra ayuda detallada de los comandos privados del owner.'),
        section('Como usar', '.ayudalogs'),
        section('Como funciona', 'Retorna sintaxis y ejemplos de: .logs, .dellogs, .verlogskey, .setlogskey, .verregisterkey, .setregisterkey.'),
        section('Solo owner', 'Si. Solo en privado.')
    ].join('\n\n')
};

function buildAutoHelp(commandDef) {
    if (!commandDef) return null;

    const name = commandDef.name || 'comando';
    const category = commandDef.category || 'general';
    const minPlan = commandDef.minPlan || (category === 'admin' ? 'basic' : category === 'owner' ? 'premium' : 'free');
    const hints = extractSourceHints(name);
    const access = commandDef.ownerOnly
        ? 'Solo owner'
        : category === 'admin'
            ? 'Admins del grupo y owner'
            : 'Usuarios del grupo (segun plan)';

    let howToUse = `.${name}`;
    if (hints.usage) {
        howToUse = hints.usage.startsWith('.') ? hints.usage : `.${hints.usage}`;
    } else if (hints.hasOnOff && hints.hasView) {
        howToUse = `.${name} on | off | ver`;
    } else if (hints.hasOnOff) {
        howToUse = `.${name} on | off`;
    }

    let howItWorks = 'Recibe argumentos opcionales y procesa la accion definida para este comando.';
    if (hints.hasOnOff) {
        howItWorks = 'Permite activar/desactivar una funcion. Guarda el estado por chat y aplica cambios al instante.';
    }
    if (hints.asksReplyOrMention) {
        howItWorks += '\nPuede requerir mencion de usuario o responder un mensaje.';
    }

    return [
        section('Que hace', `Comando *${name}* de categoria *${category}* para gestionar una funcion del bot.`),
        section('Como usar', howToUse),
        section('Como funciona', howItWorks),
        section('Requisitos', `Categoria: ${category}\nPlan minimo: ${minPlan}\nAcceso: ${access}`),
        section('Tip', `Si necesitas mas detalle, ejecuta .${name} sin parametros para ver validaciones o mensajes guiados.`)
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
