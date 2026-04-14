const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { getChatPlan, isPlanAllowed } = require('../../utils/planAccess');
const { isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'enablesection',
    category: 'admin',
    minPlan: 'premium',
    async execute(client, msg, args) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('Solo en grupos');
        const { getDB } = require('../../utils/db');
        const db = getDB();
        const plan = getChatPlan(db, chat.id._serialized);
        if (!isPlanAllowed(plan, 'premium')) return msg.reply('Solo para grupos con plan premium');
        if (!await isAdmin(client, msg) && !isOwner(msg)) return msg.reply('Solo admin/owner pueden usar este comando');
        const section = (args[0] || '').toLowerCase();
        if (!section) return msg.reply('Indica la sección a mostrar. Ejemplo: .enablesection diversion');
        const groupDb = readGroupDB(chat.id._serialized);
        if (!Array.isArray(groupDb.disabledMenuSections)) groupDb.disabledMenuSections = [];
        if (!groupDb.disabledMenuSections.includes(section)) return msg.reply('La sección ya está visible.');
        groupDb.disabledMenuSections = groupDb.disabledMenuSections.filter(s => s !== section);
        saveGroupDB(chat.id._serialized, groupDb);
        return msg.reply(`Sección '${section}' visible en el menú.`);
    }
};
