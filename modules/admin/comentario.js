const { getDB } = require('../../utils/db');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'comentario',
    category: 'admin',
    minPlan: 'basic',

    async execute(client, msg, args) {
        const db = getDB();
        const sender = msg.author || msg.from;
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;
        const context = chat.isGroup ? (chat.name || chatId) : 'chat privado';

        const texto = args.join(' ').trim();

        if (!texto) {
            return msg.reply(warn('Uso: .comentario <tu comentario o sugerencia>\nEjemplo: .comentario sería útil tener un comando de sorteo'));
        }

        const ownerId = db.config && db.config.ownerNumber;

        if (ownerId) {
            const text = [
                '💬 Comentario/Sugerencia',
                '',
                `Mensaje: ${texto}`,
                `De: ${sender}`,
                `Grupo/Chat: ${context}`,
                `Fecha: ${new Date().toLocaleString('es-MX')}`
            ].join('\n');

            await client.sendMessage(ownerId, text).catch(() => false);
        }

        return msg.reply(ok('Comentario enviado al owner. ¡Gracias por tu sugerencia!'));
    }
};
