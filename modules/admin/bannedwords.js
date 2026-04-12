const { isRegisteredAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { ok, error, warn, info } = require('../../utils/style');
const DEFAULT_BANNED_WORDS = require('../../utils/defaultBannedWords');

module.exports = {
    name: 'bannedwords',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(error('Solo en grupos'));
        }

        if (!isRegisteredAdmin(msg)) {
            return msg.reply(error('Debes registrarte como admin primero'));
        }

        const option = (args[0] || 'ver').toLowerCase();
        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);

        if (option === 'ver' || option === 'view' || option === 'list') {
            const list = groupDb.bannedWords || [];
            const custom = list.filter(w => !DEFAULT_BANNED_WORDS.includes(w));
            const predefined = list.filter(w => DEFAULT_BANNED_WORDS.includes(w));

            if (list.length === 0) {
                return msg.reply(info('No hay palabras prohibidas registradas'));
            }

            let text = [
                info('Palabras prohibidas'),
                `• Estado: ${groupDb.bannedWordsEnabled ? '🟢 ON' : '🔴 OFF'}`,
                `• Total: ${list.length}`,
                `  - Predefinidas: ${predefined.length}`,
                `  - Personalizadas: ${custom.length}`,
                ''
            ];

            if (predefined.length > 0) {
                text.push('*📋 Predefinidas:*');
                text.push(predefined.slice(0, 10).map((w, i) => `${i + 1}. ${w}`).join('\n'));
                if (predefined.length > 10) text.push(`... y ${predefined.length - 10} más`);
                text.push('');
            }

            if (custom.length > 0) {
                text.push('*➕ Personalizadas:*');
                text.push(custom.map((w, i) => `${i + 1}. ${w}`).join('\n'));
            }

            return msg.reply(text.join('\n'));
        }

        if (!['on', 'off'].includes(option)) {
            return msg.reply(warn('Usa: .bannedwords on | off | ver'));
        }

        groupDb.bannedWordsEnabled = option === 'on';
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok(`Palabras prohibidas ${option === 'on' ? '🟢 ON' : '🔴 OFF'}`));
    }
};
