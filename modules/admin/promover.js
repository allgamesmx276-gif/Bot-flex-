const { isAdmin, isBotAdmin, isOwner } = require('../../utils/permissions');
const { ok, error, warn } = require('../../utils/style');

module.exports = {
    name: 'promover',
    category: 'admin',
    description: 'Promueve a un usuario a administrador del grupo (sin costo)',

    async execute(client, msg) {
        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply(error('Solo en grupos'));

        // Permisos del que ejecuta
        if (!isOwner(msg) && !await isAdmin(client, msg)) {
            return msg.reply(error('Solo admins del grupo u owner pueden usar este comando'));
        }

        // Permisos del bot
        if (!await isBotAdmin(client, msg)) {
            return msg.reply(error('El bot necesita ser admin para promover usuarios'));
        }

        let target;
        if (msg.mentionedIds.length > 0) {
            target = msg.mentionedIds[0];
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            target = quoted.author || quoted.from;
        } else {
            return msg.reply(warn('Menciona a alguien o responde a su mensaje. Ejemplo: .promover @usuario'));
        }

        try {
            await chat.promoteParticipants([target]);
            return msg.reply(ok(`Usuario promovido a administrador correctamente.`));
        } catch (err) {
            console.error('[PROMOTE] Error:', err.message);
            return msg.reply(error('No se pudo promover al usuario. Verifica que no sea ya un administrador.'));
        }
    }
};