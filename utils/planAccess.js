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

function getChatPlan(db, chatId, senderNumber) {
    // 🔥 TODOS LOS GRUPOS TIENEN PLAN PREMIUM SIN EXPIRACIÓN
    return 'premium';

    if (!chatId || !chatId.endsWith('@g.us')) {
        return 'premium';
    }

    // Check expiry
    const expiry = db.groupPlanExpiry && db.groupPlanExpiry[chatId];
    if (expiry && Date.now() > expiry) {
        // Expired — treat as free (scheduler will clean up)
        return 'free';
    }

    const groupPlan = normalizePlan(db.groupPlans && db.groupPlans[chatId]) || 'free';

    if (senderNumber && db.adminPlans && db.adminPlans[senderNumber]) {
        const adminPlan = normalizePlan(db.adminPlans[senderNumber]) || 'free';
        const groupIdx = PLAN_ORDER.indexOf(groupPlan);
        const adminIdx = PLAN_ORDER.indexOf(adminPlan);
        return PLAN_ORDER[Math.max(groupIdx, adminIdx)];
    }

    return groupPlan;
}

function isPlanExpired(db, chatId) {
    if (!chatId || !chatId.endsWith('@g.us')) return false;
    const expiry = db.groupPlanExpiry && db.groupPlanExpiry[chatId];
    return expiry ? Date.now() > expiry : false;
}

function getRequiredPlan(command) {
    if (!command) return 'free';
    const commandName = String(command.name || '').trim().toLowerCase();
    if (!commandName) return 'free';

    const db = getDB();
    const fromDb = normalizePlan(db.commandPlans && db.commandPlans[commandName]);
    if (fromDb) return fromDb;

    const fromCommand = normalizePlan(command.minPlan);
    if (fromCommand) return fromCommand;

    const fromDefaultMap = normalizePlan(DEFAULT_COMMAND_PLAN[commandName]);
    if (fromDefaultMap) return fromDefaultMap;

    const fromCategory = normalizePlan(command.category ? DEFAULT_CATEGORY_PLAN[command.category] : null);
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
    isPlanExpired,
    getRequiredPlan,
    isPlanAllowed
};
