const { getDB, saveDB, logEvent } = require('../../utils/db');
const { auditAction } = require('../../utils/audit');
const { ok, warn } = require('../../utils/style');

module.exports = {
    name: 'setowner',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg, args) {
        const db = getDB();
        let ownerId = args[0];

        if (msg.mentionedIds.length > 0) {
            ownerId = msg.mentionedIds[0];
        } else if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            ownerId = quoted.author || quoted.from;
        }

        if (!ownerId) {
            return msg.reply(warn('Uso: .setowner 521XXXXXXXXXX@c.us o menciona/responde al usuario'));
        }

        if (!ownerId.includes('@')) {
            ownerId = `${ownerId}@c.us`;
        }

        const previousOwner = db.config.ownerNumber;
        db.config.ownerNumber = ownerId;
        saveDB();
        logEvent(`OWNER ${previousOwner} -> ${ownerId}`);
        auditAction(msg, 'SET_OWNER', {
            previousOwner,
            newOwner: ownerId
        });

        return msg.reply(ok(`Owner actualizado a ${ownerId}`));
    }
};
