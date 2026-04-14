const { getDB, saveDB } = require('../../utils/db');

function randomBetweenMinutes(minMinutes, maxMinutes) {
    const min = Math.max(1, Number(minMinutes) || 1);
    const max = Math.max(min, Number(maxMinutes) || min);
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return value;
}

module.exports = {
    name: 'cofre-engine',
    category: 'system',
    auto: true,
    hidden: true,

    async execute(client, msg) {
        const db = getDB();
        if (!db.cofreGames || typeof db.cofreGames !== 'object') return;

        const now = Date.now();
        let changed = false;

        for (const [chatId, campaign] of Object.entries(db.cofreGames)) {
            if (!campaign || !campaign.enabled || !campaign.config) continue;

            if (!campaign.progress) {
                campaign.progress = { sent: 0, claimed: 0 };
                changed = true;
            }

            const total = Number(campaign.config.totalDrops || 0);
            if (total <= 0) {
                campaign.enabled = false;
                changed = true;
                continue;
            }

            if (campaign.activeDrop && campaign.activeDrop.expiresAt && now >= campaign.activeDrop.expiresAt) {
                campaign.activeDrop = null;
                changed = true;
            }

            const canSendNext = !campaign.activeDrop && campaign.nextAt && now >= campaign.nextAt;
            const hasRemaining = campaign.progress.sent < total;

            if (canSendNext && hasRemaining) {
                const dropNumber = campaign.progress.sent + 1;
                const prize = Array.isArray(campaign.prizes) && campaign.prizes.length
                    ? Number(campaign.prizes[dropNumber - 1] || campaign.prizes[0] || 1)
                    : 1;

                const moreAfterThis = dropNumber < total;
                const nextDelayMinutes = moreAfterThis
                    ? randomBetweenMinutes(campaign.config.minMinutes, campaign.config.maxMinutes)
                    : null;

                const expiresAt = moreAfterThis
                    ? now + nextDelayMinutes * 60 * 1000
                    : now + Number(campaign.config.maxMinutes || 10) * 60 * 1000;

                campaign.activeDrop = {
                    index: dropNumber,
                    prize,
                    keyword: campaign.config.keyword,
                    sentAt: now,
                    expiresAt
                };
                campaign.progress.sent = dropNumber;
                campaign.nextAt = moreAfterThis ? now + nextDelayMinutes * 60 * 1000 : null;
                changed = true;

                await client.sendMessage(
                    chatId,
                    `🎁 *COFRE #${dropNumber}*\n\n` +
                    `Premio: *+${prize} puntos*\n` +
                    `Para ganar, escribe exactamente:\n` +
                    `*cofre ${campaign.config.keyword}*\n\n` +
                    `🏁 Gana el primero en escribirlo.`
                ).catch(() => {});
            }

            if (!campaign.activeDrop && campaign.progress.sent >= total) {
                campaign.enabled = false;
                changed = true;
                await client.sendMessage(
                    chatId,
                    `✅ Campaña de cofres finalizada.\n` +
                    `Enviados: ${campaign.progress.sent}\n` +
                    `Ganados: ${campaign.progress.claimed}`
                ).catch(() => {});
            }
        }

        const chatId = msg.from;
        const campaign = db.cofreGames[chatId];
        const body = String(msg.body || '').trim().toLowerCase();

        if (campaign && campaign.enabled && campaign.activeDrop && chatId.endsWith('@g.us')) {
            const expected = `cofre ${String(campaign.activeDrop.keyword || '').trim().toLowerCase()}`;
            if (body === expected) {
                const winner = msg.author || msg.from;
                const prize = Number(campaign.activeDrop.prize || 1);

                if (!db.userReactions[chatId]) db.userReactions[chatId] = {};
                if (!db.userReactions[chatId][winner]) db.userReactions[chatId][winner] = { pos: 0, neg: 0 };
                db.userReactions[chatId][winner].pos += prize;

                campaign.progress.claimed = Number(campaign.progress.claimed || 0) + 1;
                const cofreNum = campaign.activeDrop.index;
                campaign.activeDrop = null;
                changed = true;

                await msg.reply(
                    `🏆 @${winner.split('@')[0]} ganó el *cofre #${cofreNum}*\n` +
                    `Premio: *+${prize} puntos*`,
                    undefined,
                    { mentions: [winner] }
                ).catch(() => {});
            }
        }

        if (changed) saveDB();
    }
};
