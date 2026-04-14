const { isAdmin, isBotAdmin } = require('../../utils/permissions');
const { auditAction } = require('../../utils/audit');

module.exports = {
    name: 'ban',
    category: 'admin',

    async execute(client, msg) {
        try {
            const chat = await msg.getChat();

            if (!chat.isGroup) {
                return msg.reply('Este comando solo funciona en grupos');
            }

            const { hasModeratorAccess } = require('../../utils/permissions');
            if (!hasModeratorAccess(msg) && !await isAdmin(client, msg)) {
                return msg.reply('Solo admins o moderadores pueden usar este comando');
            }

            if (!await isBotAdmin(client, msg)) {
                return msg.reply('El bot necesita ser admin');
            }

            const botId = client.info.wid._serialized;
            let target;

            if (msg.mentionedIds.length > 0) {
                target = msg.mentionedIds[0];
            } else if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                target = quoted.author || quoted.from;
            } else {
                return msg.reply('Usa: .ban @usuario o responde a un mensaje');
            }

            const senderId = msg.author || msg.from;

            if (target === senderId) {
                return msg.reply('No puedes banearte a ti mismo');
            }

            if (target === botId) {
                return msg.reply('No puedes banear al bot');
            }

            await msg.reply(`Usuario eliminado @${target.split('@')[0]}`, undefined, {
                mentions: [target]
            });

            await chat.removeParticipants([target]);
            auditAction(msg, 'BAN', {
                target,
                chatId: chat.id._serialized
            });
        } catch (err) {
            console.error('ERROR BAN:', err);
            msg.reply('Error al ejecutar ban');
        }
    }
};
