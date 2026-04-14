const { isAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { auditAction } = require('../../utils/audit');

module.exports = {
    name: 'warn',
    category: 'admin',

    async execute(client, msg) {
        try {
            const chat = await msg.getChat();

            if (!chat.isGroup) {
                return msg.reply('Solo en grupos');
            }

            const { hasModeratorAccess } = require('../../utils/permissions');
            if (!hasModeratorAccess(msg) && !await isAdmin(client, msg)) {
                return msg.reply('Solo admins o moderadores pueden usar este comando');
            }

            const groupDb = readGroupDB(chat.id._serialized);
            let target;

            if (msg.mentionedIds.length > 0) {
                target = msg.mentionedIds[0];
            } else if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                target = quoted.author || quoted.from;
            } else {
                return msg.reply('Usa: .warn @usuario o responde');
            }

            if (!groupDb.warns[target]) {
                groupDb.warns[target] = 0;
            }

            groupDb.warns[target]++;

            const warns = groupDb.warns[target];
            const maxWarns = 3;

            saveGroupDB(chat.id._serialized, groupDb);
            auditAction(msg, 'WARN', {
                target,
                chatId: chat.id._serialized,
                warns,
                maxWarns
            });

            await msg.reply(
                `Advertencia para @${target.split('@')[0]}\n\nWarns: ${warns}/${maxWarns}`,
                undefined,
                { mentions: [target] }
            );

            if (warns >= maxWarns) {
                await msg.reply('Usuario supero el limite de advertencias');
                await chat.removeParticipants([target]);
                groupDb.warns[target] = 0;
                saveGroupDB(chat.id._serialized, groupDb);
                auditAction(msg, 'WARN_AUTO_REMOVE', {
                    target,
                    chatId: chat.id._serialized,
                    maxWarns
                });
            }
        } catch (err) {
            console.error('ERROR WARN:', err);
            msg.reply('Error en warn');
        }
    }
};
