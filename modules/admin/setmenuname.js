const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { isOwner, isAdmin } = require('../../utils/permissions');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'setmenuname',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(warn('Este comando solo funciona en grupos'));
        }

        if (!isOwner(msg) && !await isAdmin(client, msg)) {
            return msg.reply(error('Solo admins del grupo u owner pueden cambiar el nombre del menu'));
        }

        const name = args.join(' ').trim();
        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);

        if (!name) {
            return msg.reply(warn('Uso: .setmenuname <texto>\nPara restaurar: .setmenuname reset'));
        }

        if (name.toLowerCase() === 'reset') {
            groupDb.menuTitle = '';
            saveGroupDB(chatId, groupDb);
            return msg.reply(ok('Nombre del menú restablecido para este grupo'));
        }

        if (name.length > 40) {
            return msg.reply(warn('El nombre del menú no debe superar 40 caracteres'));
        }

        groupDb.menuTitle = name;
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Nombre del menú actualizado a: ${name}`));
    }
};
