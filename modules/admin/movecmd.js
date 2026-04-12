const { getDB, saveDB } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');
const { isOwner, isRegisteredAdmin } = require('../../utils/permissions');
const { moveMenuCommand } = require('../../utils/menuOrder');

module.exports = {
    name: 'movecmd',
    category: 'admin',

    async execute(client, msg, args) {
        if (!isOwner(msg) && !isRegisteredAdmin(msg)) {
            return msg.reply('Solo owner o admins registrados pueden mover comandos.');
        }

        if (args.length < 2) {
            return msg.reply('Uso: movecmd <comando> <1|0>\nOpcional si se repite: movecmd <seccion>:<comando> <1|0>\n1 = subir un lugar\n0 = bajar un lugar');
        }

        const direction = String(args[args.length - 1] || '').trim();
        const rawTarget = args.slice(0, -1).join(' ').trim().toLowerCase();
        const separatorIndex = rawTarget.indexOf(':');
        const sectionKey = separatorIndex >= 0 ? rawTarget.slice(0, separatorIndex).trim() : '';
        const label = separatorIndex >= 0 ? rawTarget.slice(separatorIndex + 1).trim() : rawTarget;
        const db = getDB();
        const result = moveMenuCommand(db, label, direction, sectionKey);

        if (!result.ok) {
            if (result.reason === 'invalid-direction') {
                return msg.reply('Usa 1 para subir un lugar o 0 para bajar un lugar.');
            }

            if (result.reason === 'invalid-section') {
                return msg.reply('Seccion invalida. Usa una seccion existente del menu, por ejemplo adminmsg, adminctrl, utilidades o una seccion personalizada.');
            }

            if (result.reason === 'not-found') {
                return msg.reply('Ese comando no existe dentro del menu configurable.');
            }

            if (result.reason === 'ambiguous') {
                return msg.reply(`Ese comando aparece en varias secciones: ${result.sections.join(', ')}. Usa movecmd <seccion>:<comando> <1|0>.`);
            }

            if (result.reason === 'edge') {
                return msg.reply('Ese comando ya esta en el limite y no puede moverse mas en esa direccion.');
            }

            return msg.reply('No se pudo mover el comando.');
        }

        saveDB();
        auditAction(msg, 'MOVE_MENU_CMD', {
            commandName: result.label,
            section: result.sectionKey,
            direction,
            fromIndex: result.fromIndex,
            toIndex: result.toIndex,
            swappedWith: result.swappedWith
        });

        return msg.reply(
            `Comando movido: ${result.label}\n` +
            `Seccion: ${result.sectionKey}\n` +
            `Nueva posicion: ${result.toIndex + 1}\n` +
            `Intercambio con: ${result.swappedWith}`
        );
    }
};