const { getDB, saveDB } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');
const { isOwner, isRegisteredAdmin } = require('../../utils/permissions');
const {
    createCustomSection,
    deleteCustomSection,
    listMenuSections,
    moveCommandToSection,
    moveCustomSection
} = require('../../utils/menuOrder');

module.exports = {
    name: 'menusection',
    category: 'admin',

    async execute(client, msg, args) {
        if (!isOwner(msg) && !isRegisteredAdmin(msg)) {
            return msg.reply('Solo owner o admins registrados pueden usar este comando.');
        }

        const action = String(args[0] || '').trim().toLowerCase();

        if (!action) {
            return msg.reply(
                'Uso:\n' +
                'menusection create <user|admin> <titulo>\n' +
                'menusection move <seccion-origen>:<comando> <seccion-destino>\n' +
                'menusection list\n' +
                'menusection delete <seccion>\n' +
                'menusection order <seccion> <1|0>'
            );
        }

        if (action === 'list') {
            const db = getDB();
            const sections = listMenuSections(db);
            const lines = ['SECCIONES MENU', ''];

            lines.push('BASE');
            sections.defaults.forEach(section => {
                lines.push(`- ${section.key} | ${section.domain} | ${section.count} cmds`);
            });

            lines.push('');
            lines.push('CUSTOM');

            if (sections.custom.length === 0) {
                lines.push('- sin secciones custom');
            } else {
                sections.custom.forEach(section => {
                    lines.push(`- ${section.key} | ${section.domain} | ${section.count} cmds | ${section.title}`);
                });
            }

            return msg.reply(lines.join('\n'));
        }

        if (action === 'create') {
            const domain = args[1];
            const title = args.slice(2).join(' ').trim();
            const db = getDB();
            const result = createCustomSection(db, domain, title);

            if (!result.ok) {
                if (result.reason === 'invalid-domain') {
                    return msg.reply('Dominio invalido. Usa user o admin.');
                }

                if (result.reason === 'invalid-title') {
                    return msg.reply('Debes indicar un titulo para la nueva seccion.');
                }

                if (result.reason === 'duplicate') {
                    return msg.reply('Ya existe una seccion con ese nombre en ese dominio.');
                }

                return msg.reply('No se pudo crear la seccion.');
            }

            saveDB();
            auditAction(msg, 'MENU_SECTION_CREATE', {
                domain: result.section.domain,
                sectionKey: result.section.key,
                sectionTitle: result.section.title
            });

            return msg.reply(
                `Seccion creada: ${result.section.title}\n` +
                `Dominio: ${result.section.domain}\n` +
                `Clave: ${result.section.key}`
            );
        }

        if (action === 'move') {
            const sourceToken = String(args[1] || '').trim();
            const targetSection = args.slice(2).join(' ').trim();
            const separatorIndex = sourceToken.indexOf(':');

            if (separatorIndex <= 0 || !targetSection) {
                return msg.reply('Uso: menusection move <seccion-origen>:<comando> <seccion-destino>');
            }

            const sourceSection = sourceToken.slice(0, separatorIndex).trim();
            const label = sourceToken.slice(separatorIndex + 1).trim();
            const db = getDB();
            const result = moveCommandToSection(db, sourceSection, label, targetSection);

            if (!result.ok) {
                if (result.reason === 'invalid-source') {
                    return msg.reply('La seccion de origen no existe.');
                }

                if (result.reason === 'invalid-target') {
                    return msg.reply('La seccion de destino no existe.');
                }

                if (result.reason === 'restricted-domain') {
                    return msg.reply('Solo se pueden mover comandos entre secciones user o admin.');
                }

                if (result.reason === 'cross-domain') {
                    return msg.reply('No puedes mover comandos de admin a user ni de user a admin.');
                }

                if (result.reason === 'not-found') {
                    return msg.reply('Ese comando no existe en la seccion de origen.');
                }

                if (result.reason === 'already-in-target') {
                    return msg.reply('Ese comando ya existe en la seccion destino.');
                }

                return msg.reply('No se pudo mover el comando a la nueva seccion.');
            }

            saveDB();
            auditAction(msg, 'MENU_SECTION_MOVE', {
                commandName: result.label,
                domain: result.domain,
                sourceSection: result.sourceSection,
                targetSection: result.targetSection,
                targetTitle: result.targetTitle
            });

            return msg.reply(
                `Comando movido: ${result.label}\n` +
                `Dominio: ${result.domain}\n` +
                `Origen: ${result.sourceSection}\n` +
                `Destino: ${result.targetTitle}\n` +
                `Nueva posicion: ${result.newPosition}`
            );
        }

        if (action === 'delete') {
            const sectionInput = args.slice(1).join(' ').trim();

            if (!sectionInput) {
                return msg.reply('Uso: menusection delete <seccion>');
            }

            const db = getDB();
            const result = deleteCustomSection(db, sectionInput);

            if (!result.ok) {
                if (result.reason === 'invalid-section') {
                    return msg.reply('La seccion no existe.');
                }

                if (result.reason === 'default-section') {
                    return msg.reply('Solo puedes eliminar secciones personalizadas.');
                }

                return msg.reply('No se pudo eliminar la seccion.');
            }

            saveDB();
            auditAction(msg, 'MENU_SECTION_DELETE', {
                sectionKey: result.sectionKey,
                sectionTitle: result.title,
                domain: result.domain,
                fallbackKey: result.fallbackKey,
                movedCommands: result.movedCommands.join(',')
            });

            return msg.reply(
                `Seccion eliminada: ${result.title}\n` +
                `Dominio: ${result.domain}\n` +
                `Comandos devueltos a: ${result.fallbackKey || 'ninguna'}\n` +
                `Total movidos: ${result.movedCommands.length}`
            );
        }

        if (action === 'order') {
            const sectionInput = String(args[1] || '').trim();
            const direction = String(args[2] || '').trim();

            if (!sectionInput || !direction) {
                return msg.reply('Uso: menusection order <seccion> <1|0>');
            }

            const db = getDB();
            const result = moveCustomSection(db, sectionInput, direction);

            if (!result.ok) {
                if (result.reason === 'invalid-section') {
                    return msg.reply('La seccion no existe.');
                }

                if (result.reason === 'default-section') {
                    return msg.reply('Solo puedes reordenar secciones personalizadas.');
                }

                if (result.reason === 'invalid-direction') {
                    return msg.reply('Usa 1 para subir o 0 para bajar.');
                }

                if (result.reason === 'edge') {
                    return msg.reply('Esa seccion ya esta en el limite de su dominio.');
                }

                return msg.reply('No se pudo mover la seccion.');
            }

            saveDB();
            auditAction(msg, 'MENU_SECTION_ORDER', {
                sectionKey: result.sectionKey,
                sectionTitle: result.title,
                domain: result.domain,
                direction,
                fromIndex: result.fromIndex,
                toIndex: result.toIndex,
                swappedWith: result.swappedWith
            });

            return msg.reply(
                `Seccion movida: ${result.title}\n` +
                `Dominio: ${result.domain}\n` +
                `Nueva posicion: ${result.toIndex + 1}\n` +
                `Intercambio con: ${result.swappedWith}`
            );
        }

        return msg.reply('Accion invalida. Usa create, move, list, delete o order.');
    }
};
