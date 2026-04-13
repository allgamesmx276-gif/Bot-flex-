const { getDB } = require('../../utils/db');
const { getPoints, getRank, formatTimeAgo, formatDetail } = require('../../utils/rankSystem');

module.exports = {
    name: 'miranking',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Este comando funciona solo en grupos.');
        }

        const chatId = chat.id._serialized;
        const targetId = msg.author || msg.from;
        const db = getDB();

        const reactionData = db.userReactions && db.userReactions[chatId] && db.userReactions[chatId][targetId];
        const activityData = db.userActivity && db.userActivity[chatId] && db.userActivity[chatId][targetId];

        const points = getPoints(reactionData);
        const rank = getRank(points);
        const pos = reactionData ? reactionData.pos || 0 : 0;
        const neg = reactionData ? reactionData.neg || 0 : 0;
        const detail = reactionData ? formatDetail(reactionData.detail) : null;
        const msgs = activityData ? activityData.msgs || 0 : 0;
        const lastSeen = activityData ? activityData.lastSeen : null;

        const now = Date.now();
        const inactiveDays = lastSeen ? Math.floor((now - lastSeen) / 86400000) : null;
        const inactiveFlag = inactiveDays !== null && inactiveDays >= 14 ? `\n⚠️ Inactivo (${inactiveDays}d sin mensajes)` : '';

        let text = `👤 *Tu perfil*\n`;
        text += `${rank.emoji} Rango: *${rank.name}*\n\n`;
        text += `📊 Puntos: *${points >= 0 ? '+' : ''}${points}*\n`;
        text += `   ✅ Recibidas: ${pos}  |  ❌ Recibidas: ${neg}\n`;

        if (detail) {
            text += `\n💝 Reacciones recibidas:\n   ${detail}\n`;
        } else {
            text += `\n💝 Sin reacciones aún\n`;
        }

        text += `\n💬 Actividad\n`;
        text += `   Mensajes: ${msgs.toLocaleString()}\n`;
        text += `   Último mensaje: ${formatTimeAgo(lastSeen)}`;
        text += inactiveFlag;

        return msg.reply(text);
    }
};
