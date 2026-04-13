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
        const db = getDB();

        // Desde privado: .setplan <groupId> <plan>
        if (!chat.isGroup) {
            const [targetId, planArg] = args;

            if (!targetId || !planArg) {
                return msg.reply(warn(`Uso desde privado: .setplan <grupoId> <${PLAN_ORDER.join('|')}>\nEjemplo: .setplan 120363...@g.us pro`));
            }

            const requested = normalizePlan(planArg);

            if (!requested) {
                return msg.reply(warn(`Plan inválido. Opciones: ${PLAN_ORDER.join(', ')}`));
            }

            const previousPlan = normalizePlan(db.groupPlans[targetId]) || 'free';
            db.groupPlans[targetId] = requested;
            saveDB();
            logEvent(`PLAN ${targetId}: ${previousPlan} -> ${requested}`);
            auditAction(msg, 'SET_GROUP_PLAN', { chatId: targetId, previousPlan, newPlan: requested });

            return msg.reply(ok(`Plan del grupo ${targetId} actualizado: ${requested}`));
        }

        // Desde grupo: .setplan <plan>
        const requested = normalizePlan(args[0]);

        if (!requested) {
            return msg.reply(warn(`Uso: .setplan <${PLAN_ORDER.join('|')}>`));
        }

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
