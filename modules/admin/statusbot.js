const { getCommands } = require('../../handler');
const { isOwner } = require('../../utils/permissions');

function formatUptime(totalSeconds) {
    const s = Math.floor(totalSeconds % 60);
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor((totalSeconds / 3600) % 24);
    const d = Math.floor(totalSeconds / 86400);
    return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = {
    name: 'statusbot',
    category: 'admin',
    ownerOnly: true,

    async execute(client, msg) {
        if (!isOwner(msg)) {
            return msg.reply('Solo owner puede usar este comando.');
        }

        const mem = process.memoryUsage();
        const chats = await client.getChats().catch(() => []);
        const commands = getCommands();
        const text = [
            'STATUS BOT',
            `Uptime: ${formatUptime(process.uptime())}`,
            `Memoria RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
            `Memoria Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
            `Chats cargados: ${Array.isArray(chats) ? chats.length : 0}`,
            `Comandos cargados: ${commands.length}`,
            `Hora servidor: ${new Date().toISOString()}`
        ].join('\n');

        return msg.reply(text);
    }
};
