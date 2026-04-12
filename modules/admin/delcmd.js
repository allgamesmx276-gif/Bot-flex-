const fs = require('fs');
const path = require('path');
const { loadCommands } = require('../../handler');
const { auditAction } = require('../../utils/audit');

const GENERAL_DIR = path.join(process.cwd(), 'modules', 'general');
const PROTECTED = new Set(['menu', 'ayuda']);

module.exports = {
    name: 'delcmd',
    category: 'owner',
    ownerOnly: true,

    async execute(client, msg, args) {
        const commandName = (args[0] || '').trim().toLowerCase();

        if (!commandName) {
            return msg.reply('Uso: delcmd <nombre-comando>');
        }

        if (PROTECTED.has(commandName)) {
            return msg.reply('Ese comando esta protegido y no se puede eliminar.');
        }

        const filename = `${commandName}.js`;
        const targetPath = path.join(GENERAL_DIR, filename);
        const disabledPath = path.join(GENERAL_DIR, `${commandName}.disabled.js`);

        if (!fs.existsSync(targetPath)) {
            if (fs.existsSync(disabledPath)) {
                return msg.reply('Ese comando esta desactivado. Usa enablecmd para activarlo o disablecmd para mantenerlo oculto.');
            }

            return msg.reply('Ese comando ya fue eliminado o no existe en la lista de comandos user.');
        }

        fs.rmSync(targetPath, { force: true });
        loadCommands();
        auditAction(msg, 'DEL_CMD', { commandName });

        return msg.reply('comando eliminado correctamente, recargando lista de comandos');
    }
};