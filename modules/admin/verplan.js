const { getDB } = require('../../utils/db');
const { getChatPlan } = require('../../utils/planAccess');
const { isOwner, isRegisteredAdmin } = require('../../utils/permissions');

module.exports = {
    name: 'verplan',
    category: 'admin',

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Este comando funciona en grupos');
        }

        if (!isOwner(msg) && !isRegisteredAdmin(msg)) {
            return msg.reply('Solo admins registrados o owner pueden ver el plan');
        }

        const db = getDB();
        const chatId = chat.id._serialized;
        const plan = getChatPlan(db, chatId);

        return msg.reply(`Plan activo del grupo: ${plan}`);
    }
};
