const { getDB, saveDB } = require('../../utils/db');

module.exports = {
    name: 'afk',
    category: 'general',

    async execute(client, msg, args) {
        const db = getDB();
        const sender = msg.author || msg.from;
        const reason = args.join(' ').trim() || 'Ausente por el momento';

        if (!db.afkUsers || typeof db.afkUsers !== 'object') {
            db.afkUsers = {};
        }

        db.afkUsers[sender] = {
            reason,
            since: Date.now()
        };

        saveDB();
        return msg.reply(`Modo AFK activado. Motivo: ${reason}`);
    }
};
