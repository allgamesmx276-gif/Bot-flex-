const { getDB, saveDB } = require('../../utils/db');
const { isAdmin, hasRegisteredAdminAccess } = require('../../utils/permissions');

const DEFAULT_OFFLINE_MESSAGE = 'El Administrador que buscas contactar no se encuentra activo en este momento, espera a que vuelva a conectarse';

module.exports = {
    name: 'offline',
    category: 'general',

    async execute(client, msg, args) {
        const db = getDB();
        const sender = msg.author || msg.from;
        const action = (args[0] || '').toLowerCase();

        if (!hasRegisteredAdminAccess(msg) && !await isAdmin(client, msg)) {
            return msg.reply('Solo admins pueden usar este comando.');
        }

        if (!db.offlineUsers || typeof db.offlineUsers !== 'object') {
            db.offlineUsers = {};
        }

        if (action === 'off' || action === 'desactivar') {
            if (db.offlineUsers[sender]) {
                delete db.offlineUsers[sender];
                saveDB();
            }

            return msg.reply('El administrador se encuentra activo nuevamente.');
        }

        if (action === 'estado') {
            if (!db.offlineUsers[sender]) {
                return msg.reply('No tienes modo offline activo.');
            }

            return msg.reply(`Modo offline activo.\nMensaje: ${db.offlineUsers[sender].message}`);
        }

        const customMessage = args.join(' ').trim();
        const message = customMessage || DEFAULT_OFFLINE_MESSAGE;

        db.offlineUsers[sender] = {
            message,
            since: Date.now()
        };

        saveDB();
        return msg.reply('Modo offline activado. Responderé cuando te mencionen.');
    }
};
