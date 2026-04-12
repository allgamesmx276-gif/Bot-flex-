module.exports = {
    name: 'userinfo',
    category: 'general',

    async execute(client, msg) {
        const chat = await msg.getChat();
        const sender = msg.author || msg.from;
        const isGroup = chat.isGroup ? 'Grupo' : 'Privado';

        return msg.reply(
            `Usuario: ${sender}\n` +
            `Chat: ${isGroup}\n` +
            `Fecha: ${new Date().toLocaleString('es-MX')}`
        );
    }
};
