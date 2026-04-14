const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { getChatPlan, isPlanAllowed } = require('../../utils/planAccess');
const { isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'disablesection',
    category: 'admin',
    minPlan: 'premium',
    async execute(client, msg, args) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('Solo en grupos');
        const { getDB } = require('../../utils/db');
        const db = getDB();
        const plan = getChatPlan(db, chat.id._serialized);
        if (!isPlanAllowed(plan, 'premium')) return msg.reply('Solo para grupos con plan premium');

        // Debug: mostrar admins detectados
        const adminList = chat.participants.filter(p => p.isAdmin || p.isSuperAdmin).map(p => p.id._serialized);
        await msg.reply('Admins detectados por el bot:\n' + adminList.join('\n'));

        if (!await isAdmin(client, msg) && !isOwner(msg)) return msg.reply('Solo admin/owner pueden usar este comando');
        const section = (args[0] || '').toLowerCase();
        if (!section) return msg.reply('Indica la sección a ocultar. Ejemplo: .disablesection diversion');
        const groupDb = readGroupDB(chat.id._serialized);
        if (!Array.isArray(groupDb.disabledMenuSections)) groupDb.disabledMenuSections = [];
        if (groupDb.disabledMenuSections.includes(section)) return msg.reply('La sección ya está oculta.');
        groupDb.disabledMenuSections.push(section);
        saveGroupDB(chat.id._serialized, groupDb);
        return msg.reply(`Sección '${section}' oculta del menú.`);
    }
};
