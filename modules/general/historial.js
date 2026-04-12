const { getDB, saveDB } = require('../../utils/db');

module.exports = {
    name: 'historial',
    category: 'general',

    async execute(client, msg, args) {
        const db = getDB();
        const sender = msg.author || msg.from;
        const action = (args[0] || '').toLowerCase();

        if (!db.userHistory || typeof db.userHistory !== 'object') {
            db.userHistory = {};
        }

        if (action === 'borrar' || action === 'limpiar') {
            delete db.userHistory[sender];
            saveDB();
            return msg.reply('Historial borrado.');
        }

        const items = Array.isArray(db.userHistory[sender]) ? db.userHistory[sender] : [];

        if (!items.length) {
            return msg.reply('No tienes historial guardado todavia.');
        }

        const lines = ['Tu historial reciente:', ''];

        items.slice(0, 10).forEach((item, index) => {
            const when = new Date(item.time).toLocaleString('es-MX');
            lines.push(`${index + 1}. [${item.type}] ${item.text}`);
            lines.push(`   ${when}`);
        });

        lines.push('');
        lines.push('Usa .historial borrar para limpiar.');

        return msg.reply(lines.join('\n'));
    }
};
