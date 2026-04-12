const { getCommands } = require('../../handler');
const { getDB, saveDB, logEvent } = require('../../utils/db');
const { PLAN_ORDER, normalizePlan } = require('../../utils/planAccess');
const { auditAction } = require('../../utils/audit');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'setcmdplan',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg, args) {
        const commandName = String(args[0] || '').trim().toLowerCase();
        const requested = String(args[1] || '').trim().toLowerCase();

        if (!commandName || !requested) {
            return msg.reply(warn(`Uso: setcmdplan <comando> <${PLAN_ORDER.join('|')}|default>`));
        }

        const command = getCommands().find(item => item && item.name === commandName);
        if (!command) {
            return msg.reply(warn(`No existe el comando: ${commandName}`));
        }

        const db = getDB();
        const previousPlan = db.commandPlans && db.commandPlans[commandName] ? db.commandPlans[commandName] : 'default';

        if (requested === 'default') {
            if (db.commandPlans) {
                delete db.commandPlans[commandName];
            }

            saveDB();
            logEvent(`CMD_PLAN ${commandName}: ${previousPlan} -> default`);
            auditAction(msg, 'SET_CMD_PLAN', {
                commandName,
                previousPlan,
                newPlan: 'default'
            });

            return msg.reply(ok(`Plan de ${commandName} restablecido a default`));
        }

        const plan = normalizePlan(requested);
        if (!plan) {
            return msg.reply(warn(`Plan invalido. Usa: ${PLAN_ORDER.join(', ')} o default`));
        }

        if (!db.commandPlans || typeof db.commandPlans !== 'object') {
            db.commandPlans = {};
        }

        db.commandPlans[commandName] = plan;
        saveDB();
        logEvent(`CMD_PLAN ${commandName}: ${previousPlan} -> ${plan}`);
        auditAction(msg, 'SET_CMD_PLAN', {
            commandName,
            previousPlan,
            newPlan: plan
        });

        return msg.reply(ok(`Plan de ${commandName} actualizado a ${plan}`));
    }
};
