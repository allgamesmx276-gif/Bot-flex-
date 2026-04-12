const { getCommands } = require('../../handler');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'checkcmds',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg) {
        const commands = getCommands();
        const names = new Map();
        const issues = [];

        for (const command of commands) {
            if (!command || !command.name) {
                issues.push('Hay un comando cargado sin nombre');
                continue;
            }

            if (typeof command.execute !== 'function') {
                issues.push(`.${command.name} no tiene execute()`);
            }

            names.set(command.name, (names.get(command.name) || 0) + 1);
        }

        const duplicates = [...names.entries()]
            .filter(([, count]) => count > 1)
            .map(([name]) => name);

        if (duplicates.length) {
            issues.push(`Comandos duplicados: ${duplicates.map(name => `.${name}`).join(', ')}`);
        }

        const autoCount = commands.filter(command => command.auto).length;
        const hiddenCount = commands.filter(command => command.hidden).length;
        const ownerOnlyCount = commands.filter(command => command.ownerOnly).length;

        let text = `${issues.length ? warn('Chequeo de comandos') : ok('Chequeo de comandos')}\n`;
        text += `- Total cargados: ${commands.length}\n`;
        text += `- Automaticos: ${autoCount}\n`;
        text += `- Ocultos: ${hiddenCount}\n`;
        text += `- Solo owner: ${ownerOnlyCount}\n`;

        if (!issues.length) {
            text += '- Estado: OK\n';
            text += 'Todos los comandos cargados tienen estructura valida.';
            return msg.reply(text);
        }

        text += `- Estado: ${issues.length} problema(s)\n`;
        issues.forEach((issue, index) => {
            text += `${index + 1}. ${issue}\n`;
        });

        return msg.reply(text.trim());
    }
};
