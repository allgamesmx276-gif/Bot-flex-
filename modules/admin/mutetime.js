const { getDB, saveDB } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
    name: 'mutetime',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply('Solo en grupos');
        }

        const { hasModeratorAccess } = require('../../utils/permissions');
        if (!hasModeratorAccess(msg) && !await isAdmin(client, msg)) {
            return msg.reply('Solo admins o moderadores pueden usar este comando');
        }

        let target;

        if (msg.mentionedIds.length > 0) {
            target = msg.mentionedIds[0];
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            target = quoted.author || quoted.from;
        } else {
            return msg.reply('Usa: .mutetime 10m @usuario o responde');
        }

        // No permitir silenciar admins reales
        const chat = await msg.getChat();
        const adminTarget = chat.participants.find(p => p.id._serialized === target && (p.isAdmin || p.isSuperAdmin));
        if (adminTarget) {
            return msg.reply('No puedes silenciar a un admin del grupo.');
        }

        const input = (args[0] || '').toLowerCase();
        const num = parseInt(input, 10);

        if (isNaN(num)) {
            return msg.reply('Tiempo invalido');
        }

        let ms = 0;

        if (input.endsWith('s')) ms = num * 1000;
        if (input.endsWith('m')) ms = num * 60000;
        if (input.endsWith('h')) ms = num * 3600000;

        if (!ms) {
            return msg.reply('Usa formatos como 10s, 5m, 1h');
        }

        const db = getDB();
        db.mutedUsers[target] = Date.now() + ms;
        saveDB();
        auditAction(msg, 'MUTE_TIME', {
            target,
            duration: input,
            until: new Date(db.mutedUsers[target]).toISOString(),
            chatId: chat.id._serialized
        });

        return msg.reply(`Usuario silenciado @${target.split('@')[0]} por ${input}`, undefined, {
            mentions: [target]
        });
    }
};
