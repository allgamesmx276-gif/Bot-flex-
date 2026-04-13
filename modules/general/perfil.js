const { getDB } = require('../../utils/db');
const { getPoints, getRank, formatTimeAgo, formatDetail } = require('../../utils/rankSystem');

module.exports = {
    name: 'perfil',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Este comando funciona solo en grupos.');
        }

        let targetId;

        if (msg.mentionedIds && msg.mentionedIds.length > 0) {
            targetId = msg.mentionedIds[0];
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            targetId = quoted.author || quoted.from;
        } else {
            return msg.reply('Uso: .perfil @usuario  o responde un mensaje');
        }

        const chatId = chat.id._serialized;
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

        const number = targetId.split('@')[0];
        const contact = await client.getContactById(targetId).catch(() => null);
        const name = (contact && (contact.pushname || contact.name)) || `+${number}`;

        const now = Date.now();
        const inactiveDays = lastSeen ? Math.floor((now - lastSeen) / 86400000) : null;
        const inactiveFlag = inactiveDays !== null && inactiveDays >= 14 ? `\n⚠️ Inactivo (${inactiveDays}d sin mensajes)` : '';

        let text = `👤 *${name}*\n`;
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

        return msg.reply(text, undefined, { mentions: [targetId] });
    }
};
