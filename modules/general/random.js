module.exports = {
    name: 'random',
    category: 'general',

    async execute(client, msg, args) {
        const minArg = Number(args[0]);
        const maxArg = Number(args[1]);

        if (Number.isNaN(minArg) || Number.isNaN(maxArg)) {
            const value = Math.floor(Math.random() * 100) + 1;
            return msg.reply(`Numero aleatorio: ${value} (usa .random <min> <max>)`);
        }

        let min = minArg;
        let max = maxArg;

        if (min > max) {
            const tmp = min;
            min = max;
            max = tmp;
        }

        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        return msg.reply(`Numero aleatorio entre ${min} y ${max}: ${value}`);
    }
};
