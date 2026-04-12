const { logEvent } = require('./db');
const logger = require('./logger');
const {
    getPossibleSenderIds,
    isModerator,
    isOwner,
    isRegisteredAdmin
} = require('./permissions');

function getActorId(msg) {
    return getPossibleSenderIds(msg)[0] || 'unknown';
}

function getActorRole(msg) {
    if (isOwner(msg)) return 'owner';
    if (isRegisteredAdmin(msg)) return 'admin';
    if (isModerator(msg)) return 'mod';
    return 'user';
}

function cleanDetails(details = {}) {
    return Object.fromEntries(
        Object.entries(details).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
}

function buildText(action, payload) {
    const pairs = Object.entries(payload).map(([key, value]) => {
        const normalizedValue = Array.isArray(value) ? value.join(',') : String(value);
        return `${key}=${normalizedValue}`;
    });

    return `AUDIT ${action}${pairs.length ? ` | ${pairs.join(' | ')}` : ''}`;
}

function auditAction(msg, action, details = {}) {
    const payload = cleanDetails({
        actor: getActorId(msg),
        actorRole: getActorRole(msg),
        chatId: msg.from,
        ...details
    });

    logEvent(buildText(action, payload));
    logger.info('AUDIT', { action, ...payload });
}

module.exports = {
    auditAction
};