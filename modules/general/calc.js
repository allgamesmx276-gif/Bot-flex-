module.exports = {
    name: 'calc',
    category: 'general',

    async execute(client, msg, args) {
        const expr = args.join(' ').trim();

        if (!expr) {
            return msg.reply('Uso: .calc 2 + 2 * 5');
        }

        // Allow only basic arithmetic characters.
        if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
            return msg.reply('Solo se permiten numeros y operadores basicos (+ - * /).');
        }

        try {
            const value = Function(`"use strict"; return (${expr});`)();

            if (!Number.isFinite(value)) {
                return msg.reply('Resultado invalido.');
            }

            return msg.reply(`Resultado: ${value}`);
        } catch (err) {
            return msg.reply('Expresion invalida.');
        }
    }
};
