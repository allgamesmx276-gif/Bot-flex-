const { readGroupDB, getAllGroupIds } = require('./groupDb');

const timers = {};

function clearChatTimers(chatId) {
    if (!timers[chatId]) return;

    timers[chatId].forEach(timer => clearInterval(timer));
    timers[chatId] = [];
}

function startMsgAuto(client, chatId) {
    const groupDb = readGroupDB(chatId);

    clearChatTimers(chatId);

    if (!groupDb.msgAutoEnabled) return;

    const list = groupDb.msgAuto || [];
    timers[chatId] = [];

    list.forEach(item => {
        if (!item.time || item.time < 5000 || !item.text) return;

        const interval = setInterval(async () => {
            try {
                await client.sendMessage(chatId, item.text);
            } catch (err) {
                console.error(`ERROR MSG AUTO ${chatId}:`, err);
            }
        }, item.time);

        timers[chatId].push(interval);
    });
}

function stopMsgAuto(chatId) {
    clearChatTimers(chatId);
}

function restartAllMsgAuto(client) {
    getAllGroupIds().forEach(chatId => {
        startMsgAuto(client, chatId);
    });
}

module.exports = {
    startMsgAuto,
    stopMsgAuto,
    restartAllMsgAuto
};
