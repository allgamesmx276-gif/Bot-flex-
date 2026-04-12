const { action } = require('../../utils/style');

module.exports = {
    name: "ping",
    category: "general",

    async execute(client, msg) {
        msg.reply(action('Pong'));
    }
};
