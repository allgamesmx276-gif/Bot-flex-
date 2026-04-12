const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'menulogs',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg) {
        const chat = await msg.getChat();

        if (chat.isGroup) return;

        if (!isOwner(msg)) {
            return msg.reply('❌ Solo el owner puede usar este menú');
        }

        return msg.reply(`╔══════════════════════╗
🔐 PANEL PRIVADO OWNER
╚══════════════════════╝

Comandos privados:
.logs
.dellogs
.verlogskey
.setlogskey
.verregisterkey
.setregisterkey
.ayudalogs

Nota:
- Usa .ayudalogs para ver sintaxis y ejemplos.`);
    }
};
