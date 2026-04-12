const { getDB, saveDB } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
    name: 'unmute',
    category: 'admin',

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Solo en grupos');
        }

        if (!await isAdmin(client, msg)) {
            return msg.reply('Solo admins del grupo pueden usar este comando');
        }

        let target;

        if (msg.mentionedIds.length > 0) {
            target = msg.mentionedIds[0];
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            target = quoted.author || quoted.from;
        } else {
            return msg.reply('Usa: .unmute @usuario o responde al mensaje del usuario');
        }

        const db = getDB();

        if (!db.mutedUsers || typeof db.mutedUsers !== 'object') {
            db.mutedUsers = {};
        }

        if (!db.mutedUsers[target]) {
            return msg.reply(`El usuario @${target.split('@')[0]} no esta muteado.`, undefined, {
                mentions: [target]
            });
        }

        delete db.mutedUsers[target];
        saveDB();
        auditAction(msg, 'UNMUTE', {
            target,
            chatId: chat.id._serialized
        });

        return msg.reply(`Usuario desmuteado @${target.split('@')[0]}`, undefined, {
            mentions: [target]
        });
    }
};
