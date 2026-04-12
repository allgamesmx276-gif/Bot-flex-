const { loadCommands } = require('../../handler');
const { ok, error } = require('../../utils/style');

module.exports = {
    name: 'reload',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg) {
        try {
            loadCommands();
            msg.reply(ok('Recargado correctamente'));
        } catch (err) {
            console.error('ERROR RELOAD:', err);
            msg.reply(error('Error al recargar'));
        }
    }
};
