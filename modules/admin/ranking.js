const { getDB } = require('../../utils/db');
const { getPoints, getRank } = require('../../utils/rankSystem');

module.exports = {
    name: 'ranking',
    category: 'admin',
    minPlan: 'basic',

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Este comando funciona solo en grupos.');
        }

        const chatId = chat.id._serialized;
        const db = getDB();

        const reactionsInChat = (db.userReactions && db.userReactions[chatId]) || {};
        const activityInChat = (db.userActivity && db.userActivity[chatId]) || {};

        // Collect all known users in this group
        const allUsers = new Set([
            ...Object.keys(reactionsInChat),
            ...Object.keys(activityInChat)
        ]);

        if (!allUsers.size) {
            return msg.reply('📊 Sin datos de actividad aún en este grupo.');
        }

        // Build sorted list by net points
        const sorted = [...allUsers]
            .map(userId => ({
                userId,
                points: getPoints(reactionsInChat[userId]),
                msgs: activityInChat[userId] ? activityInChat[userId].msgs || 0 : 0
            }))
            .sort((a, b) => b.points - a.points || b.msgs - a.msgs)
            .slice(0, 10);

        const medals = ['🥇', '🥈', '🥉'];

        let text = `🏆 *RANKING — ${chat.name}*\n\n`;

        for (let i = 0; i < sorted.length; i++) {
            const entry = sorted[i];
            const rank = getRank(entry.points);
            const medal = medals[i] || `${i + 1}.`;
            const contact = await client.getContactById(entry.userId).catch(() => null);
            const name = (contact && (contact.pushname || contact.name)) || `+${entry.userId.split('@')[0]}`;
            const pts = entry.points >= 0 ? `+${entry.points}` : `${entry.points}`;
            text += `${medal} ${rank.emoji} *${name}*  ${pts} pts\n`;
        }

        return msg.reply(text.trim());
    }
};
