const { getDB, saveDB, logEvent } = require('../../utils/db');
const { ok, warn, error } = require('../../utils/style');

module.exports = {
    name: 'claimowner',
    category: 'owner',
    hidden: true,

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (chat.isGroup) {
            return msg.reply(warn('Este comando solo funciona en privado con el bot.'));
        }

        const db = getDB();
        const sender = msg.author || msg.from;

        // If owner is already claimed, only the current owner can re-claim
        if (db.config.ownerClaimed && db.config.ownerNumber) {
            if (sender !== db.config.ownerNumber) {
                return msg.reply(error('Ya hay un owner registrado. Solo el owner actual puede usar este comando.'));
            }
            // Owner re-confirming themselves
            return msg.reply(ok(`Ya eres el owner registrado.\nNúmero: ${db.config.ownerNumber}`));
        }

        // First time claim
        db.config.ownerNumber = sender;
        db.config.ownerClaimed = true;
        saveDB();
        logEvent(`OWNER CLAIMED: ${sender}`);

        return msg.reply(
            ok(`✅ Owner registrado exitosamente.\n\n` +
            `Número: ${sender}\n\n` +
            `A partir de ahora tienes acceso completo al bot.\n` +
            `Usa *.setowner* para transferir el ownership a otro número.`)
        );
    }
};
