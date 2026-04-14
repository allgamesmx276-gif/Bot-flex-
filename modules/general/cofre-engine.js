const { MessageMedia } = require('whatsapp-web.js');
const { getDB, saveDB } = require('../../utils/db');

const CONGRATS_STICKER_URLS = [
    'https://media.tenor.com/mCiM7CmGGI4AAAAi/kiss-bear.gif',
    'https://media.tenor.com/On7kvXhzml4AAAAi/loading-gif.gif'
];

async function sendCongratsStickers(client, chatId) {
    for (const url of CONGRATS_STICKER_URLS) {
        try {
            const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
            await client.sendMessage(chatId, media, {
                sendMediaAsSticker: true,
                stickerAuthor: 'FlexBot',
                stickerName: 'Cofre Winner'
            });
        } catch (_) {
            // Ignore sticker failures and keep winner flow working.
        }
    }
}

function randomBetweenMinutes(minMinutes, maxMinutes) {
    const min = Math.max(1, Number(minMinutes) || 1);
    const max = Math.max(min, Number(maxMinutes) || min);
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return value;
}

function getPrizeLabel(rawPrize) {
    const value = String(rawPrize || '').trim();
    if (!value) return 'Premio sorpresa';
    if (/^\d+$/.test(value)) return `${value} puntos`;
    return value;
}

function extractPointsFromPrizeLabel(label) {
    const text = String(label || '').trim().toLowerCase();
    if (!text) return 0;

    if (/^\d+$/.test(text)) {
        return parseInt(text, 10) || 0;
    }

    const match = text.match(/(\d+)\s*(puntos?|pts?)/i);
    if (!match) return 0;
    return parseInt(match[1], 10) || 0;
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
                const prizeLabel = Array.isArray(campaign.prizes) && campaign.prizes.length
                    ? getPrizeLabel(campaign.prizes[dropNumber - 1] || campaign.prizes[0] || 'Premio sorpresa')
                    : 'Premio sorpresa';

                const moreAfterThis = dropNumber < total;
                const nextDelayMinutes = moreAfterThis
                    ? randomBetweenMinutes(campaign.config.minMinutes, campaign.config.maxMinutes)
                    : null;

                const expiresAt = moreAfterThis
                    ? now + nextDelayMinutes * 60 * 1000
                    : now + Number(campaign.config.maxMinutes || 10) * 60 * 1000;

                campaign.activeDrop = {
                    index: dropNumber,
                    prizeLabel,
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
                    `Premio: *${prizeLabel}*\n` +
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
                const prizeLabel = getPrizeLabel(campaign.activeDrop.prizeLabel || campaign.activeDrop.prize);
                const points = extractPointsFromPrizeLabel(prizeLabel);

                if (points > 0) {
                    if (!db.userReactions[chatId]) db.userReactions[chatId] = {};
                    if (!db.userReactions[chatId][winner]) db.userReactions[chatId][winner] = { pos: 0, neg: 0 };
                    db.userReactions[chatId][winner].pos += points;
                }

                campaign.progress.claimed = Number(campaign.progress.claimed || 0) + 1;
                const cofreNum = campaign.activeDrop.index;
                campaign.activeDrop = null;
                changed = true;

                await msg.reply(
                    `🏆🎉 *¡Felicidades @${winner.split('@')[0]}!*\n` +
                    `Ganaste el *cofre #${cofreNum}*\n` +
                    `Premio: *${prizeLabel}*` +
                    (points > 0 ? `\nPuntos sumados: *+${points}*` : ''),
                    undefined,
                    { mentions: [winner] }
                ).catch(() => {});

                await sendCongratsStickers(client, chatId);

                const ownerId = campaign.owner;
                if (ownerId) {
                    await client.sendMessage(
                        ownerId,
                        `🎁 Cofre ganado\n` +
                        `Grupo: ${campaign.chatName || chatId}\n` +
                        `Cofre: #${cofreNum}\n` +
                        `Ganador: @${winner.split('@')[0]}\n` +
                        `Premio: ${prizeLabel}` +
                        (points > 0 ? `\nPuntos otorgados: +${points}` : ''),
                        { mentions: [winner] }
                    ).catch(() => false);
                }
            }
        }

        if (changed) saveDB();
    }
};
