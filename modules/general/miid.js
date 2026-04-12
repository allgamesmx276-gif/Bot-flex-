module.exports = {
    name: 'miid',
    category: 'general',

    async execute(client, msg) {
        const sender = msg.author || msg.from;
        return msg.reply(`Tu ID es: ${sender}`);
    }
};
