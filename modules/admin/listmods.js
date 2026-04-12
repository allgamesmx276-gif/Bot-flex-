const { getDB } = require('../../utils/db');

module.exports = {
    name: 'listmods',
    category: 'owner',
    ownerOnly: true,

    async execute(client, msg) {
        const db = getDB();
        const moderators = Array.isArray(db.moderators) ? db.moderators : [];

        if (!moderators.length) {
            return msg.reply('No hay moderadores registrados.');
        }

        const text = ['MODERADORES', '']
            .concat(moderators.map((item, index) => `${index + 1}. ${item}`))
            .join('\n');

        return msg.reply(text);
    }
};
