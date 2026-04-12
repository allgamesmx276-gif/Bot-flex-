const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn } = require('../../utils/style');
const DEFAULT_BANNED_WORDS = require('../../utils/defaultBannedWords');

module.exports = {
    name: 'resetbannedwords',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(error('Solo en grupos'));
        }

        if (!isRegisteredAdmin(msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);

        groupDb.bannedWords = [...DEFAULT_BANNED_WORDS];
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Palabras prohibidas reseteadas a las predefinidas (${DEFAULT_BANNED_WORDS.length})`));
    }
};
