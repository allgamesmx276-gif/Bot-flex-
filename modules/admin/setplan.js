const { getDB, saveDB, logEvent } = require('../../utils/db');
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
        const sender = msg.author || msg.from;

        // Desde grupo: .setplan <plan> (sin expiración)
        if (chat.isGroup) {
            const requested = normalizePlan(args[0]);

            if (!requested) {
                return msg.reply(warn(`Uso: .setplan <${PLAN_ORDER.join('|')}>`));
            }

            const chatId = chat.id._serialized;
            const previousPlan = normalizePlan(db.groupPlans[chatId]) || 'free';
            db.groupPlans[chatId] = requested;
            delete db.groupPlanExpiry[chatId];
            saveDB();
            logEvent(`PLAN ${chatId}: ${previousPlan} -> ${requested} (sin expiración)`);
            auditAction(msg, 'SET_GROUP_PLAN', { chatId, previousPlan, newPlan: requested });
            return msg.reply(ok(`Plan actualizado: ${requested} (sin expiración)`));
        }

        // Desde privado: .setplan <groupId> <plan>
        const [targetId, planArg] = args;

        if (!targetId || !planArg) {
            return msg.reply(warn(`Uso desde privado:\n.setplan <grupoId> <${PLAN_ORDER.join('|')}>\n\nEjemplo:\n.setplan 120363...@g.us pro`));
        }

        if (!targetId.endsWith('@g.us')) {
            return msg.reply(warn('El ID del grupo debe terminar en @g.us'));
        }

        const requested = normalizePlan(planArg);

        if (!requested) {
            return msg.reply(warn(`Plan inválido. Opciones: ${PLAN_ORDER.join(', ')}`));
        }

        // Iniciar flujo: preguntar días
        db.awaiting[sender] = {
            step: 'setplan_days',
            chatId: targetId,
            plan: requested
        };
        saveDB();

        return msg.reply(`⏳ ¿Cuántos días tendrá el plan *${requested}* el grupo?\n\nEscribe el número de días (ej: 30) o "cancelar" para salir.`);
    }
};

