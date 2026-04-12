const { getDB, saveDB } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'setprefix',
    category: 'owner',
    ownerOnly: true,

    async execute(client, msg, args) {
        const newPrefix = (args[0] || '').trim();

        if (!newPrefix) {
            return msg.reply(warn('Uso: setprefix <prefijo>'));
        }

        if (/\s/.test(newPrefix)) {
            return msg.reply(warn('El prefijo no puede contener espacios'));
        }

        if (newPrefix.length > 3) {
            return msg.reply(warn('Usa un prefijo corto de 1 a 3 caracteres'));
        }

        const db = getDB();
        const previousPrefix = db.config.prefix;
        db.config.prefix = newPrefix;
        saveDB();
        auditAction(msg, 'SET_PREFIX', {
            previousPrefix,
            newPrefix
        });

        return msg.reply(ok(`Prefijo actualizado a ${newPrefix}`));
    }
};