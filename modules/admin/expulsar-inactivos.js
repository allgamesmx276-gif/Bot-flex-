const { getDB } = require('../../utils/db');
const { isAdmin, isBotAdmin } = require('../../utils/permissions');

module.exports = {
    name: 'expulsar-inactivos',
    category: 'admin',
    minPlan: 'pro',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Este comando funciona solo en grupos.');
        }

        if (!await isAdmin(client, msg)) {
            return msg.reply('Solo admins pueden usar este comando.');
        }

        if (!await isBotAdmin(client, msg)) {
            return msg.reply('El bot necesita ser administrador del grupo para expulsar.');
        }

        const days = parseInt(args[0], 10) || 14;

        if (days < 1) {
            return msg.reply('⚠️ El mínimo es 1 día.');
        }

        const chatId = chat.id._serialized;
        const db = getDB();
        const activityInChat = (db.userActivity && db.userActivity[chatId]) || {};
        const threshold = Date.now() - days * 86400000;
        const botId = (client.info && client.info.wid && client.info.wid._serialized) || '';
        const senderId = msg.author || msg.from;

        const participants = chat.participants || [];

        const toKick = participants
            .map(p => p.id._serialized)
            .filter(userId => {
                if (userId === botId) return false;
                if (userId === senderId) return false;
                if (participants.find(p => p.id._serialized === userId && p.isAdmin)) return false; // skip admins
                const data = activityInChat[userId];
                if (!data) return true;
                return data.lastSeen < threshold;
            });

        if (!toKick.length) {
            return msg.reply(`✅ No hay inactivos con más de ${days} días sin mensajes.`);
        }

        await msg.reply(`🚪 Expulsando ${toKick.length} inactivo(s) con +${days}d sin mensajes...`);

        let kicked = 0;
        let failed = 0;

        for (const userId of toKick) {
            try {
                await chat.removeParticipants([userId]);
                kicked++;
                await new Promise(r => setTimeout(r, 600));
            } catch {
                failed++;
            }
        }

        let result = `🚪 *Expulsión completada*\n\n`;
        result += `✅ Expulsados: ${kicked}\n`;
        if (failed) result += `❌ Fallidos: ${failed}\n`;
        result += `\nUmbral: +${days}d sin mensajes`;

        return msg.reply(result);
    }
};
