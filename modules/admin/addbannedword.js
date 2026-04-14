const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'addbannedword',
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
            return msg.reply(warn('Usa: .addbannedword palabra'));
        }

        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);

        if (groupDb.bannedWords.includes(word)) {
            return msg.reply(warn('Esa palabra ya está en la lista'));
        }

        groupDb.bannedWords.push(word);
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Palabra agregada: "${word}"`));
    }
};
