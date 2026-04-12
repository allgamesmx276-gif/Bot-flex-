const { getDB, saveDB } = require('../../utils/db');

module.exports = {
    name: 'recordar',
    category: 'general',

    async execute(client, msg, args) {
        const db = getDB();
        const sender = msg.author || msg.from;
        const action = (args[0] || '').toLowerCase();

        if (!db.reminders || typeof db.reminders !== 'object') {
            db.reminders = {};
        }

        if (action === 'ver') {
            const reminder = db.reminders[sender];
            if (!reminder) {
                return msg.reply('No tienes recordatorio guardado.');
            }

            return msg.reply(`Tu recordatorio: ${reminder.text}`);
        }

        if (action === 'borrar' || action === 'delete') {
            if (!db.reminders[sender]) {
                return msg.reply('No tienes recordatorio guardado.');
            }

            delete db.reminders[sender];
            saveDB();
            return msg.reply('Recordatorio borrado.');
        }

        const text = args.join(' ').trim();
        if (!text) {
            return msg.reply('Uso: .recordar <texto>\nOpciones: .recordar ver | .recordar borrar');
        }

        db.reminders[sender] = {
            text,
            createdAt: Date.now()
        };
        saveDB();
        return msg.reply('Recordatorio guardado. Usa .recordar ver para consultarlo.');
    }
};
