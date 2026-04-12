const path = require('path');
const { execFileSync } = require('child_process');
const { ok, warn, error } = require('../../utils/style');

module.exports = {
    name: 'cleanup-groups',
    category: 'owner',
    ownerOnly: true,

    async execute(client, msg, args) {
        const apply = (args[0] || '').toLowerCase() === 'apply';
        const scriptPath = path.join(process.cwd(), 'scripts', 'cleanup-groups-storage.js');

        try {
            const scriptArgs = [scriptPath];
            if (apply) {
                scriptArgs.push('--apply');
            }

            const output = execFileSync(process.execPath, scriptArgs, {
                encoding: 'utf8',
                timeout: 20000,
                windowsHide: true
            });

            const trimmed = String(output || '').trim();
            const lines = trimmed.split(/\r?\n/).filter(Boolean);
            const preview = lines.slice(0, 12).join('\n');
            const footer = lines.length > 12 ? `\n... (${lines.length - 12} lineas mas)` : '';

            if (!apply) {
                return msg.reply(
                    `${ok('Simulacion completada')}\n` +
                    `${preview}${footer}\n\n` +
                    `${warn('Para aplicar: .cleanup-groups apply')}`
                );
            }

            return msg.reply(`${ok('Limpieza aplicada')}\n${preview}${footer}`);
        } catch (err) {
            console.error('ERROR CLEANUP GROUPS:', err);
            const detail = err && err.message ? err.message : 'Error desconocido';
            return msg.reply(error(`No se pudo ejecutar limpieza: ${detail}`));
        }
    }
};
