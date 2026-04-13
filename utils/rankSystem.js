const POSITIVE_REACTIONS = ['❤️', '🔥', '👍', '😍', '💯', '🎉', '👏', '⭐', '🥳', '😂'];
const NEGATIVE_REACTIONS = ['👎', '💔', '🤮', '😒', '😡', '🤦', '🙄'];

const RANKS = [
    { min: -Infinity, max: -1,       emoji: '💀', name: 'Tóxico'     },
    { min: 0,         max: 19,       emoji: '🌱', name: 'Nuevo'      },
    { min: 20,        max: 59,       emoji: '⭐', name: 'Popular'    },
    { min: 60,        max: 149,      emoji: '💎', name: 'Influyente' },
    { min: 150,       max: Infinity, emoji: '👑', name: 'Leyenda'    }
];

function getPoints(reactionData) {
    if (!reactionData) return 0;
    return (reactionData.pos || 0) - (reactionData.neg || 0);
}

function getRank(points) {
    return RANKS.find(r => points >= r.min && points <= r.max) || RANKS[1];
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'nunca';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 2)    return 'justo ahora';
    if (mins < 60)   return `hace ${mins} min`;
    if (hours < 24)  return `hace ${hours}h`;
    if (days === 1)  return 'hace 1 día';
    return `hace ${days} días`;
}

function formatDetail(detail) {
    if (!detail || !Object.keys(detail).length) return null;
    return Object.entries(detail)
        .sort((a, b) => b[1] - a[1])
        .map(([emoji, count]) => `(${emoji} x${count})`)
        .join(' ');
}

module.exports = {
    POSITIVE_REACTIONS,
    NEGATIVE_REACTIONS,
    RANKS,
    getPoints,
    getRank,
    formatTimeAgo,
    formatDetail
};
