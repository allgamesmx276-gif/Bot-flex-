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

        if (chat.isGroup) {
            // Desde grupo: .setplan <plan> — inicia flujo de días
            const requested = normalizePlan(args[0]);

            if (!requested) {
                return msg.reply(warn(`Uso: .setplan <${PLAN_ORDER.join('|')}>`));
            }

            const targetChatId = chat.id._serialized;
            db.awaiting[sender] = {
                step: 'setplan_days',
                chatId: targetChatId,
                plan: requested
            };
            saveDB();

            return msg.reply(
                `⏳ ¿Cuántos días tendrá el plan *${requested}*?\n\n` +
                `Escribe el número de días (ej: 30) o *0* para sin expiración.\n` +
                `Escribe "cancelar" para salir.`
            );
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

        return msg.reply(
            `⏳ ¿Cuántos días tendrá el plan *${requested}* el grupo?\n\n` +
            `Escribe el número de días (ej: 30) o *0* para sin expiración.\n` +
            `Escribe "cancelar" para salir.`
        );
    }
};

