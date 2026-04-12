const fs = require('fs');
const path = require('path');
const { loadCommands } = require('../../handler');
const { auditAction } = require('../../utils/audit');

const GENERAL_DIR = path.join(process.cwd(), 'modules', 'general');

module.exports = {
    name: 'enablecmd',
    category: 'owner',
    ownerOnly: true,

    async execute(client, msg, args) {
        const commandName = (args[0] || '').trim().toLowerCase();

        if (!commandName) {
            return msg.reply('Uso: enablecmd <nombre-comando>');
        }

        const activePath = path.join(GENERAL_DIR, `${commandName}.js`);
        const disabledPath = path.join(GENERAL_DIR, `${commandName}.disabled.js`);

        if (fs.existsSync(activePath)) {
            return msg.reply('Ese comando ya esta activo.');
        }

        if (!fs.existsSync(disabledPath)) {
            return msg.reply('No existe un comando desactivado con ese nombre.');
        }

        fs.renameSync(disabledPath, activePath);
        loadCommands();
        auditAction(msg, 'ENABLE_CMD', { commandName });

        return msg.reply('comando activado correctamente, recargando lista de comandos');
    }
};