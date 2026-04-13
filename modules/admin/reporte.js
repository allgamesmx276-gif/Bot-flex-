const { getDB } = require('../../utils/db');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'reporte',
    category: 'admin',
    minPlan: 'basic',

    async execute(client, msg, args) {
        const db = getDB();
        const sender = msg.author || msg.from;
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;
        const context = chat.isGroup ? (chat.name || chatId) : 'chat privado';

        const comando = args[0];
        const descripcion = args.slice(1).join(' ').trim();

        if (!comando) {
            return msg.reply(warn('Uso: .reporte <comando> <descripción del problema>\nEjemplo: .reporte ban no expulsa al usuario'));
        }

        if (!descripcion) {
            return msg.reply(warn('Agrega una descripción del problema.\nEjemplo: .reporte ban no expulsa al usuario'));
        }

        const ownerId = db.config && db.config.ownerNumber;

        if (ownerId) {
            const text = [
                '🐛 Reporte de error',
                '',
                `Comando: .${comando}`,
                `Problema: ${descripcion}`,
                `Reportado por: ${sender}`,
                `Grupo/Chat: ${context}`,
                `Fecha: ${new Date().toLocaleString('es-MX')}`
            ].join('\n');

            await client.sendMessage(ownerId, text).catch(() => false);
        }

        return msg.reply(ok('Reporte enviado al owner. Gracias por reportarlo.'));
    }
};
