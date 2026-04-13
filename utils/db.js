const fs = require('fs');

const DB_FILE = './data.json';

const DEFAULT_DB = {
    awaiting: {},
    config: {
        prefix: '.',
        registerKey: 'A9X7K2P4',
        logsKey: 'A1B2C3D4E5F6G7H8',
        ownerNumber: '',
        ownerClaimed: false,
        botNumber: '',
        menuHeaderImage: ''
    },
    menuOrder: {
        utilities: []
    },
    menuSections: {
        custom: []
    },
    groupPlans: {},
    groupPlanExpiry: {},
    commandPlans: {},
    adminPlans: {},
    admins: [],
    moderators: [],
    pendingRegister: {},
    logs: [],
    mutedUsers: {},
    msgAuto: {},
    msgAutoEnabled: {},
    welcome: {},
    welcomeMsg: {},
    autoResponses: {},
    autoResponderEnabled: {},
    warns: {},
    antiLinkEnabled: {},
    antiDeleteEnabled: {},
    offlineUsers: {},
    afkUsers: {},
    reminders: {},
    userHistory: {},
    polls: {}
};

function normalizeDB(data = {}) {
    return {
        awaiting: data.awaiting || {},
        config: {
            ...DEFAULT_DB.config,
            ...(data.config || {})
        },
        menuOrder: {
            ...DEFAULT_DB.menuOrder,
            ...(data.menuOrder || {})
        },
        menuSections: {
            ...DEFAULT_DB.menuSections,
            ...(data.menuSections || {})
        },
        groupPlans: data.groupPlans && typeof data.groupPlans === 'object' ? data.groupPlans : {},
        groupPlanExpiry: data.groupPlanExpiry && typeof data.groupPlanExpiry === 'object' ? data.groupPlanExpiry : {},
        commandPlans: data.commandPlans && typeof data.commandPlans === 'object' ? data.commandPlans : {},
        adminPlans: data.adminPlans && typeof data.adminPlans === 'object' ? data.adminPlans : {},
        admins: Array.isArray(data.admins) ? data.admins : [],
        moderators: Array.isArray(data.moderators) ? data.moderators : [],
        pendingRegister: data.pendingRegister || {},
        logs: Array.isArray(data.logs) ? data.logs : [],
        mutedUsers: data.mutedUsers || {},
        msgAuto: data.msgAuto || {},
        msgAutoEnabled: data.msgAutoEnabled || {},
        welcome: data.welcome || {},
        welcomeMsg: data.welcomeMsg || {},
        autoResponses: data.autoResponses || {},
        autoResponderEnabled: data.autoResponderEnabled || {},
        warns: data.warns || {},
        antiLinkEnabled: data.antiLinkEnabled || {},
        antiDeleteEnabled: data.antiDeleteEnabled || {},
        offlineUsers: data.offlineUsers || {},
        afkUsers: data.afkUsers || {},
        reminders: data.reminders || {},
        userHistory: data.userHistory || {},
        polls: data.polls || {}
    };
}

function readDBFile() {
    if (!fs.existsSync(DB_FILE)) {
        return { ...DEFAULT_DB };
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (err) {
        console.log('JSON corrupto, reiniciando DB');
        return { ...DEFAULT_DB };
    }
}

let db = normalizeDB(readDBFile());

function getDB() {
    return db;
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function ensureDB() {
    db = normalizeDB(db);
    saveDB();
    return db;
}

function logEvent(text) {
    db.logs.push({
        time: new Date().toISOString(),
        text
    });

    if (db.logs.length > 1000) {
        db.logs.shift();
    }

    saveDB();
}

function addHistoryEntry(userId, type, text) {
    if (!userId) return;
    if (!db.userHistory || typeof db.userHistory !== 'object') {
        db.userHistory = {};
    }

    if (!Array.isArray(db.userHistory[userId])) {
        db.userHistory[userId] = [];
    }

    db.userHistory[userId].unshift({
        time: Date.now(),
        type,
        text
    });

    if (db.userHistory[userId].length > 20) {
        db.userHistory[userId] = db.userHistory[userId].slice(0, 20);
    }

    saveDB();
}

module.exports = {
    DB_FILE,
    DEFAULT_DB,
    getDB,
    saveDB,
    ensureDB,
    logEvent,
    addHistoryEntry
};
