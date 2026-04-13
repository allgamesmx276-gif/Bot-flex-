module.exports = {
    name: 'rangos',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg) {
        const text = [
            '🏅 *SISTEMA DE RANGOS*',
            '',
            'Puntos = reacciones positivas - reacciones negativas',
            '',
            '*Rangos y requisitos:*',
            '🌱 Novato: -∞ a 19 pts',
            '🪖 Recluta: 20 a 59 pts',
            '🛡️ Veterano: 60 a 149 pts',
            '💎 Elite: 150 a 299 pts',
            '👑 Leyenda: 300+ pts',
            '',
            '*Reacciones positivas:* ❤️ 🔥 👍 😍 💯 🎉 👏 ⭐ 🥳 😂',
            '*Reacciones negativas:* 👎 💔 🤮 😒 😡 🤦 🙄',
            '',
            '*Comandos y características:*',
            '.perfil @usuario  -> ver rango, puntos y actividad',
            '.miranking        -> ver tu propio perfil',
            '.ranking          -> top del grupo (plan basic)',
            '.inactivos [dias] -> lista inactivos por mensajes (plan basic)',
            '.expulsar-inactivos [dias] -> expulsa inactivos (plan pro)',
            '',
            'Tip: para subir de rango pide reacciones positivas respondiendo mensajes útiles.'
        ].join('\n');

        return msg.reply(text);
    }
};
