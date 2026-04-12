const path = require('path');
const { backupNow } = require('../../utils/backup');
const { isOwner, isRegisteredAdmin } = require('../../utils/permissions');

module.exports = {
    name: 'backupnow',
    category: 'admin',

    async execute(client, msg) {
        if (!isOwner(msg) && !isRegisteredAdmin(msg)) {
            return msg.reply('Solo owner o admins registrados pueden crear backups.');
        }

        const backupDir = backupNow('manual');
        return msg.reply(`Backup creado: ${path.relative(process.cwd(), backupDir)}`);
    }
};
