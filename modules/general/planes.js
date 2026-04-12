const { getCommands } = require('../../handler');
const { PLAN_ORDER, getRequiredPlan } = require('../../utils/planAccess');

function buildByPlan(commands) {
    const byPlan = {
        free: [],
        basic: [],
        pro: [],
        premium: []
    };

    for (const command of commands) {
        const required = getRequiredPlan(command);
        if (!byPlan[required]) continue;
        byPlan[required].push(command.name);
    }

    for (const plan of PLAN_ORDER) {
        byPlan[plan].sort((a, b) => a.localeCompare(b));
    }

    return byPlan;
}

module.exports = {
    name: 'planes',
    category: 'general',

    async execute(client, msg) {
        const commands = getCommands().filter(command =>
            command &&
            command.name &&
            !command.auto &&
            !command.hidden
        );

        const byPlan = buildByPlan(commands);
        const lines = [];

        lines.push('PLANES FLEXBOT (catalogo por comando)');
        lines.push('');
        lines.push('Notas:');
        lines.push('- Basic incluye todo Free');
        lines.push('- Pro incluye Free + Basic');
        lines.push('- Premium incluye todos');
        lines.push('');

        for (const plan of PLAN_ORDER) {
            const names = byPlan[plan];
            lines.push(`${plan.toUpperCase()} (${names.length})`);
            if (!names.length) {
                lines.push('- Sin comandos asignados');
            } else {
                names.forEach(name => lines.push(`- ${name}`));
            }
            lines.push('');
        }

        return msg.reply(lines.join('\n').trim());
    }
};
