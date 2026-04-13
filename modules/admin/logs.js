const { getDB } = require('../../utils/db');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'logs',
    category: 'admin',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (chat.isGroup) return;

        if (!isOwner(msg)) {
            return msg.reply('❌ Solo el owner puede ver logs');
        }

        const db = getDB();
        const now = Date.now();

        // --- Grupos activos ---
        const chats = await client.getChats();
        const groups = chats.filter(c => c.isGroup);

        let groupsText = `🗂️ *GRUPOS (${groups.length})*\n\n`;

        for (const g of groups) {
            const gId = g.id._serialized;
            const plan = (db.groupPlans && db.groupPlans[gId]) || 'free';
            const expiry = db.groupPlanExpiry && db.groupPlanExpiry[gId];

            let timeStr = '∞';
            if (expiry) {
                if (now > expiry) {
                    timeStr = '⚠️ EXPIRADO';
                } else {
                    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                    timeStr = `${days}d`;
                }
            }

            groupsText += `▸ *${g.name || 'Sin nombre'}*\n`;
            groupsText += `  ID: ${gId}\n`;
            groupsText += `  Plan: *${plan}* | ⏱ ${timeStr}\n\n`;
        }

        // --- Eventos recientes ---
        const list = db.logs || [];
        let logsText = `📊 *EVENTOS (${Math.min(list.length, 10)})*\n\n`;

        if (!list.length) {
            logsText += 'Sin eventos registrados.';
        } else {
            list.slice(-10).forEach((item, i) => {
                logsText += `${i + 1}. ${item.text}\n`;
            });
        }

        await msg.reply(groupsText.trim());
        return msg.reply(logsText.trim());
    }
};
