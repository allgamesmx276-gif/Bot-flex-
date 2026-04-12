const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'ayudalogs',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (chat.isGroup) return;

        if (!isOwner(msg)) {
            return msg.reply('❌ Solo el owner puede usar esta ayuda');
        }

        return msg.reply(`╔══════════════════════╗
🆘 AYUDA LOGS OWNER
╚══════════════════════╝

Uso de comandos privados:

1) Ver logs recientes
.logs

2) Borrar un log
.dellogs NUMERO CLAVE
Ejemplo: .dellogs 1 A1B2C3D4E5F6G7H8

3) Ver/cambiar clave de borrado
.verlogskey
.setlogskey NUEVA_CLAVE

4) Ver/cambiar clave de registro admin
.verregisterkey
.setregisterkey NUEVA_CLAVE

Nota:
- Todos estos comandos se usan por privado con el bot.`);
    }
};
