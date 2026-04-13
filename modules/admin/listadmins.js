const { getDB } = require('../../utils/db');
const { ok, info } = require('../../utils/style');

module.exports = {
    name: 'listadmins',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg) {
        const db = getDB();
        const admins = db.admins || [];

        if (!admins.length) {
            return msg.reply(info('No hay admins registrados.'));
        }

        const lines = ['👥 Admins registrados:\n'];

        admins.forEach((num, i) => {
            const plan = (db.adminPlans && db.adminPlans[num]) || 'free';
            lines.push(`${i + 1}. ${num}\n   Plan: ${plan}`);
        });

        lines.push('\nPara cambiar plan:\n.setadminplan <numero> <plan>');

        return msg.reply(ok(lines.join('\n')));
    }
};
