const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'delbannedword',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(error('Solo en grupos'));
        }

        const { hasModeratorAccess } = require('../../utils/permissions');
        if (!hasModeratorAccess(msg) && !isRegisteredAdmin(msg)) {
            return msg.reply(error('Solo admins o moderadores pueden usar este comando'));
        }

        const word = args.join(' ').trim().toLowerCase();

        if (!word) {
            return msg.reply(warn('Usa: .delbannedword palabra'));
        }

        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);

        const index = groupDb.bannedWords.indexOf(word);
        if (index === -1) {
            return msg.reply(warn('Esa palabra no está en la lista'));
        }

        groupDb.bannedWords.splice(index, 1);
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Palabra eliminada: "${word}"`));
    }
};
