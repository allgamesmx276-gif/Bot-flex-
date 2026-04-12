const { getDB } = require('./db');

const PLAN_ORDER = ['free', 'basic', 'pro', 'premium'];

const DEFAULT_CATEGORY_PLAN = {
    general: 'free',
    admin: 'basic',
    owner: 'premium',
    system: 'free'
};

const DEFAULT_COMMAND_PLAN = {
    // Free examples (keep core experience open)
    menu: 'free',
    ayuda: 'free',
    ping: 'free',

    // Pro features
    movecmd: 'pro',
    menusection: 'pro',

    // Premium features
    backupnow: 'premium'
};

function normalizePlan(value) {
    const plan = String(value || '').trim().toLowerCase();
    return PLAN_ORDER.includes(plan) ? plan : null;
}

function getChatPlan(db, chatId) {
    if (!chatId || !chatId.endsWith('@g.us')) {
        return 'premium';
    }

    const stored = db.groupPlans && db.groupPlans[chatId];
    return normalizePlan(stored) || 'free';
}

function getRequiredPlan(command) {
    if (!command || !command.name) return 'free';

    const db = getDB();
    const commandName = String(command.name || '').trim().toLowerCase();
    const fromDb = normalizePlan(db.commandPlans && db.commandPlans[commandName]);
    if (fromDb) return fromDb;

    const fromCommand = normalizePlan(command.minPlan);
    if (fromCommand) return fromCommand;

    const fromDefaultMap = normalizePlan(DEFAULT_COMMAND_PLAN[commandName]);
    if (fromDefaultMap) return fromDefaultMap;

    const fromCategory = normalizePlan(DEFAULT_CATEGORY_PLAN[command.category]);
    return fromCategory || 'free';
}

function isPlanAllowed(currentPlan, requiredPlan) {
    const currentIndex = PLAN_ORDER.indexOf(normalizePlan(currentPlan) || 'free');
    const requiredIndex = PLAN_ORDER.indexOf(normalizePlan(requiredPlan) || 'free');
    return currentIndex >= requiredIndex;
}

module.exports = {
    PLAN_ORDER,
    DEFAULT_CATEGORY_PLAN,
    DEFAULT_COMMAND_PLAN,
    normalizePlan,
    getChatPlan,
    getRequiredPlan,
    isPlanAllowed
};
