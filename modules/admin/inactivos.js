const { getDB } = require('../../utils/db');

module.exports = {
    name: 'inactivos',
    category: 'admin',
    minPlan: 'basic',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Este comando funciona solo en grupos.');
        }

        const days = parseInt(args[0], 10) || 14;

        if (days < 1) {
            return msg.reply('⚠️ El mínimo es 1 día.');
        }

        const chatId = chat.id._serialized;
        const db = getDB();
        const activityInChat = (db.userActivity && db.userActivity[chatId]) || {};
        const threshold = Date.now() - days * 86400000;

        const participants = chat.participants || [];
        const botId = (client.info && client.info.wid && client.info.wid._serialized) || '';

        const inactive = participants
            .map(p => p.id._serialized)
            .filter(userId => {
                if (userId === botId) return false;
                const data = activityInChat[userId];
                if (!data) return true; // never spoke
                return data.lastSeen < threshold;
            });

        if (!inactive.length) {
            return msg.reply(`✅ No hay inactivos con más de ${days} días sin mensajes.`);
        }

        const lines = await Promise.all(inactive.map(async (userId, i) => {
            const data = activityInChat[userId];
            const daysInactive = data
                ? Math.floor((Date.now() - data.lastSeen) / 86400000)
                : null;
            const contact = await client.getContactById(userId).catch(() => null);
            const name = (contact && (contact.pushname || contact.name)) || `+${userId.split('@')[0]}`;
            const timeStr = daysInactive !== null ? `${daysInactive}d` : 'sin mensajes';
            return `${i + 1}. @${userId.split('@')[0]} — ${timeStr}  *${name}*`;
        }));

        const text = `😴 *Inactivos (+${days}d sin mensajes)*\n\n${lines.join('\n')}\n\nTotal: ${inactive.length}`;

        return msg.reply(text, undefined, { mentions: inactive });
    }
};
