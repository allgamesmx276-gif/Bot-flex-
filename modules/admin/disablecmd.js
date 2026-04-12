const fs = require('fs');
const path = require('path');
const { loadCommands } = require('../../handler');
const { auditAction } = require('../../utils/audit');

const GENERAL_DIR = path.join(process.cwd(), 'modules', 'general');
const PROTECTED = new Set(['menu', 'ayuda']);

module.exports = {
    name: 'disablecmd',
    category: 'owner',
    ownerOnly: true,

    async execute(client, msg, args) {
        const commandName = (args[0] || '').trim().toLowerCase();

        if (!commandName) {
            return msg.reply('Uso: disablecmd <nombre-comando>');
        }

        if (PROTECTED.has(commandName)) {
            return msg.reply('Ese comando esta protegido y no se puede desactivar.');
        }

        const activePath = path.join(GENERAL_DIR, `${commandName}.js`);
        const disabledPath = path.join(GENERAL_DIR, `${commandName}.disabled.js`);

        if (!fs.existsSync(activePath)) {
            if (fs.existsSync(disabledPath)) {
                return msg.reply('Ese comando ya esta desactivado.');
            }
            return msg.reply('No existe ese comando en la lista de comandos user.');
        }

        fs.renameSync(activePath, disabledPath);
        loadCommands();
        auditAction(msg, 'DISABLE_CMD', { commandName });

        return msg.reply('comando desactivado correctamente, recargando lista de comandos');
    }
};