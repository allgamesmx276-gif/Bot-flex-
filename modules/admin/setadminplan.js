const { getDB, saveDB, logEvent } = require('../../utils/db');
const { normalizePlan, PLAN_ORDER } = require('../../utils/planAccess');
const { ok, warn, error } = require('../../utils/style');

module.exports = {
    name: 'setadminplan',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg, args) {
        const db = getDB();
        let [targetNumber, planArg] = args;

        if (!targetNumber || !planArg) {
            return msg.reply(warn(`Uso: .setadminplan <numero@c.us> <${PLAN_ORDER.join('|')}|default>`));
        }

        if (!targetNumber.includes('@')) {
            targetNumber = `${targetNumber}@c.us`;
        }

        if (!db.admins.includes(targetNumber)) {
            return msg.reply(error(`${targetNumber} no está registrado como admin.`));
        }

        if (!db.adminPlans) db.adminPlans = {};

        if (planArg.toLowerCase() === 'default' || planArg.toLowerCase() === 'free') {
            delete db.adminPlans[targetNumber];
            saveDB();
            logEvent(`ADMIN_PLAN ${targetNumber}: eliminado`);
            return msg.reply(ok(`Plan de ${targetNumber} restablecido a free`));
        }

        const plan = normalizePlan(planArg);

        if (!plan) {
            return msg.reply(warn(`Plan inválido. Opciones: ${PLAN_ORDER.join(', ')}`));
        }

        const previous = db.adminPlans[targetNumber] || 'free';
        db.adminPlans[targetNumber] = plan;
        saveDB();
        logEvent(`ADMIN_PLAN ${targetNumber}: ${previous} -> ${plan}`);

        return msg.reply(ok(`Plan de ${targetNumber} actualizado: ${plan}`));
    }
};
