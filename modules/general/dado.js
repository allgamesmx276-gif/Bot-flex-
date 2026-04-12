module.exports = {
    name: 'dado',
    category: 'general',

    async execute(client, msg, args) {
        const sides = Number(args[0] || 6);

        if (!Number.isInteger(sides) || sides < 2 || sides > 1000) {
            return msg.reply('Uso: .dado [caras]. Ejemplo: .dado 20');
        }

        const roll = Math.floor(Math.random() * sides) + 1;
        return msg.reply(`Salio: ${roll} (1-${sides})`);
    }
};
