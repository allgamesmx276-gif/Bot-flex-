const { getDB } = require('../../utils/db');
const { getChatPlan } = require('../../utils/planAccess');
const { isOwner, isAdmin } = require('../../utils/permissions');

module.exports = {
    name: 'verplan',
    category: 'admin',

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Este comando funciona en grupos');
        }

        if (!isOwner(msg) && !await isAdmin(client, msg)) {
            return msg.reply('Solo admins pueden ver el plan');
        }

        const db = getDB();
        const chatId = chat.id._serialized;
        const plan = getChatPlan(db, chatId);
        const expiry = db.groupPlanExpiry && db.groupPlanExpiry[chatId];

        if (!expiry) {
            return msg.reply(`💼 Plan activo: *${plan}*\n📅 Sin expiración configurada`);
        }

        const now = Date.now();
        if (now > expiry) {
            return msg.reply(`💼 Plan: *free* (plan anterior expiró)\n📅 Venció el ${new Date(expiry).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`);
        }

        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        const expiryDate = new Date(expiry).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'long', year: 'numeric'
        });

        return msg.reply(
            `💼 Plan activo: *${plan}*\n` +
            `📅 Vence: ${expiryDate}\n` +
            `⏳ Días restantes: ${daysLeft}`
        );
    }
};

