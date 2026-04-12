module.exports = {
    name: 'caraocruz',
    category: 'general',

    async execute(client, msg) {
        const result = Math.random() < 0.5 ? 'cara' : 'cruz';
        return msg.reply(`Resultado: ${result}`);
    }
};
