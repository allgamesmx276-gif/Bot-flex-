const { getDB, saveDB, logEvent } = require('../../utils/db');
const { isOwner } = require('../../utils/permissions');
const { normalizePlan, PLAN_ORDER } = require('../../utils/planAccess');
const { auditAction } = require('../../utils/audit');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'setplan',
    category: 'owner',
    ownerOnly: true,

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(warn('Usa este comando dentro del grupo a configurar'));
        }

        if (!isOwner(msg)) {
            return msg.reply(warn('Solo el owner puede cambiar el plan'));
        }

        const requested = normalizePlan(args[0]);

        if (!requested) {
            return msg.reply(warn(`Uso: setplan <${PLAN_ORDER.join('|')}>`));
        }

        const db = getDB();
        const chatId = chat.id._serialized;
        const previousPlan = normalizePlan(db.groupPlans[chatId]) || 'free';

        db.groupPlans[chatId] = requested;
        saveDB();
        logEvent(`PLAN ${chatId}: ${previousPlan} -> ${requested}`);
        auditAction(msg, 'SET_GROUP_PLAN', {
            chatId,
            previousPlan,
            newPlan: requested
        });

        return msg.reply(ok(`Plan del grupo actualizado: ${requested}`));
    }
};
