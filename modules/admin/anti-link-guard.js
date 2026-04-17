const { isAdmin } = require('../../utils/permissions');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');

module.exports = {
    name: 'anti-link-guard',
    category: 'system',
    auto: true,
    hidden: true,

    async execute(client, msg) {
        try {
            // Optimización: verificación rápida antes de getChat()
            if (!msg.from.endsWith('@g.us')) return;

            const text = (msg.body || '').toLowerCase();
            if (!text.includes('http') && !text.includes('wa.me') && !text.includes('.com')) {
                return;
            }

            const chat = await msg.getChat();
            const chatId = chat.id._serialized;
            const groupDb = readGroupDB(chatId);

            if (!groupDb.antiLinkEnabled) return;
            if (await isAdmin(client, msg)) return;
            
            const contact = await msg.getContact();
            const user = contact.id._serialized;

            if (!groupDb.warns[user]) {
                groupDb.warns[user] = 0;
            }

            groupDb.warns[user]++;

            const warns = groupDb.warns[user];
            const maxWarns = 3;

            saveGroupDB(chatId, groupDb);

            await msg.delete(true).catch(() => {});
            await msg.reply(
                `Links no permitidos @${user.split('@')[0]}\nWarns: ${warns}/${maxWarns}`,
                undefined,
                { mentions: [user] }
            );

            if (warns >= maxWarns) {
                await msg.reply('Expulsado por spam');
                await chat.removeParticipants([user]);
                groupDb.warns[user] = 0;
                saveGroupDB(chatId, groupDb);
            }

            msg._flexHandled = true;
        } catch (err) {
            console.error('ERROR ANTILINK:', err);
        }
    }
};
