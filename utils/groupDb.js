const fs = require('fs');
const path = require('path');
const { getDB } = require('./db');
const DEFAULT_BANNED_WORDS = require('./defaultBannedWords');

const GROUP_DB_DIR = path.join(process.cwd(), 'storage', 'groups');

const DEFAULT_GROUP_DB = {
    menuTitle: '',
    menuHeaderImage: '',
    welcome: false,
    welcomeMsg: '🎉 Bienvenido al grupo @user 🎉\nPreséntate y disfruta de la conversación.',
    goodbye: false,
    goodbyeMsg: '👋 Adiós @user\nEsperamos verte pronto de nuevo.',
    autoResponses: [],
    autoResponderEnabled: false,
    msgAuto: [],
    msgAutoEnabled: false,
    warns: {},
    antiLinkEnabled: false,
    antiDeleteEnabled: false,
    bannedWords: [...DEFAULT_BANNED_WORDS],
    bannedWordsEnabled: false,
    disabledMenuSections: []
};

const FEATURE_FILES = {
    menuTitle: 'menu-title.json',
    menuHeaderImage: 'menu-header-image.json',
    welcome: 'welcome.json',
    goodbye: 'goodbye.json',
    goodbyeMsg: 'goodbye-msg.json',
    autoResponses: 'auto-responses.json',
    msgAuto: 'msg-auto.json',
    warns: 'warns.json',
    autoResponder: 'auto-responder.json',
    msgAutoEnabled: 'msg-auto-enabled.json',
    antiLink: 'anti-link.json',
    antiDelete: 'anti-delete.json',
    bannedWords: 'banned-words.json',
    bannedWordsEnabled: 'banned-words-enabled.json'
};

function ensureGroupDir() {
    fs.mkdirSync(GROUP_DB_DIR, { recursive: true });
}

function ensureChatDir(chatId) {
    const chatDir = path.join(GROUP_DB_DIR, encodeURIComponent(chatId));
    fs.mkdirSync(chatDir, { recursive: true });
    return chatDir;
}

function isValidGroupChatId(value) {
    return /^\d+@g\.us$/.test(String(value || ''));
}

function normalizeGroupDB(data = {}) {
    return {
        menuTitle: String(data.menuTitle || '').trim(),
        menuHeaderImage: String(data.menuHeaderImage || '').trim(),
        welcome: Boolean(data.welcome),
        welcomeMsg: data.welcomeMsg || DEFAULT_GROUP_DB.welcomeMsg,
        goodbye: Boolean(data.goodbye),
        goodbyeMsg: data.goodbyeMsg || DEFAULT_GROUP_DB.goodbyeMsg,
        autoResponses: Array.isArray(data.autoResponses) ? data.autoResponses : [],
        autoResponderEnabled: Boolean(data.autoResponderEnabled),
        msgAuto: Array.isArray(data.msgAuto) ? data.msgAuto : [],
        msgAutoEnabled: Boolean(data.msgAutoEnabled),
        warns: data.warns || {},
        antiLinkEnabled: Boolean(data.antiLinkEnabled),
        antiDeleteEnabled: Boolean(data.antiDeleteEnabled),
        bannedWords: Array.isArray(data.bannedWords) ? data.bannedWords : [],
        bannedWordsEnabled: Boolean(data.bannedWordsEnabled),
        disabledMenuSections: Array.isArray(data.disabledMenuSections) ? data.disabledMenuSections : []
    };
}

function getLegacyGroupFile(chatId) {
    ensureGroupDir();
    return path.join(GROUP_DB_DIR, `${encodeURIComponent(chatId)}.json`);
}

function readJSON(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) {
        return defaultValue;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        return defaultValue;
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function migrateLegacyGroupData(chatId) {
    if (!isValidGroupChatId(chatId)) {
        return null;
    }

    const legacyFile = getLegacyGroupFile(chatId);

    if (!fs.existsSync(legacyFile)) {
        return null;
    }

    try {
        const legacyData = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
        const normalized = normalizeGroupDB(legacyData);
        const chatDir = ensureChatDir(chatId);

        writeJSON(path.join(chatDir, FEATURE_FILES.menuTitle), normalized.menuTitle);
        writeJSON(path.join(chatDir, FEATURE_FILES.menuHeaderImage), normalized.menuHeaderImage);

        writeJSON(path.join(chatDir, FEATURE_FILES.welcome), {
            welcome: normalized.welcome,
            welcomeMsg: normalized.welcomeMsg
        });
        writeJSON(path.join(chatDir, FEATURE_FILES.goodbye), normalized.goodbye);
        writeJSON(path.join(chatDir, FEATURE_FILES.goodbyeMsg), normalized.goodbyeMsg);
        writeJSON(path.join(chatDir, FEATURE_FILES.autoResponses), normalized.autoResponses);
        writeJSON(path.join(chatDir, FEATURE_FILES.msgAuto), normalized.msgAuto);
        writeJSON(path.join(chatDir, FEATURE_FILES.warns), normalized.warns);
        writeJSON(path.join(chatDir, FEATURE_FILES.autoResponder), normalized.autoResponderEnabled);
        writeJSON(path.join(chatDir, FEATURE_FILES.msgAutoEnabled), normalized.msgAutoEnabled);
        writeJSON(path.join(chatDir, FEATURE_FILES.antiLink), normalized.antiLinkEnabled);
        writeJSON(path.join(chatDir, FEATURE_FILES.antiDelete), normalized.antiDeleteEnabled);
        writeJSON(path.join(chatDir, FEATURE_FILES.bannedWords), normalized.bannedWords);
        writeJSON(path.join(chatDir, FEATURE_FILES.bannedWordsEnabled), normalized.bannedWordsEnabled);

        const backupFile = `${legacyFile}.legacy.json`;
        if (!fs.existsSync(backupFile)) {
            fs.renameSync(legacyFile, backupFile);
        }

        return normalized;
    } catch (err) {
        return null;
    }
}

function readGroupDB(chatId) {
    if (!isValidGroupChatId(chatId)) {
        return { ...DEFAULT_GROUP_DB };
    }

    ensureGroupDir();
    const chatDir = ensureChatDir(chatId);
    const legacyData = migrateLegacyGroupData(chatId);

    if (legacyData) {
        return legacyData;
    }

    const welcomeData = readJSON(path.join(chatDir, FEATURE_FILES.welcome), {
        welcome: DEFAULT_GROUP_DB.welcome,
        welcomeMsg: DEFAULT_GROUP_DB.welcomeMsg
    });
    const menuTitle = readJSON(path.join(chatDir, FEATURE_FILES.menuTitle), DEFAULT_GROUP_DB.menuTitle);
    const menuHeaderImage = readJSON(path.join(chatDir, FEATURE_FILES.menuHeaderImage), DEFAULT_GROUP_DB.menuHeaderImage);
    const goodbye = readJSON(path.join(chatDir, FEATURE_FILES.goodbye), DEFAULT_GROUP_DB.goodbye);
    const goodbyeMsg = readJSON(path.join(chatDir, FEATURE_FILES.goodbyeMsg), DEFAULT_GROUP_DB.goodbyeMsg);
    const autoResponses = readJSON(path.join(chatDir, FEATURE_FILES.autoResponses), DEFAULT_GROUP_DB.autoResponses);
    const msgAuto = readJSON(path.join(chatDir, FEATURE_FILES.msgAuto), DEFAULT_GROUP_DB.msgAuto);
    const warns = readJSON(path.join(chatDir, FEATURE_FILES.warns), DEFAULT_GROUP_DB.warns);
    const autoResponderEnabled = readJSON(path.join(chatDir, FEATURE_FILES.autoResponder), DEFAULT_GROUP_DB.autoResponderEnabled);
    const msgAutoEnabled = readJSON(path.join(chatDir, FEATURE_FILES.msgAutoEnabled), DEFAULT_GROUP_DB.msgAutoEnabled);
    const antiLinkEnabled = readJSON(path.join(chatDir, FEATURE_FILES.antiLink), DEFAULT_GROUP_DB.antiLinkEnabled);
    const antiDeleteEnabled = readJSON(path.join(chatDir, FEATURE_FILES.antiDelete), DEFAULT_GROUP_DB.antiDeleteEnabled);
    const bannedWords = readJSON(path.join(chatDir, FEATURE_FILES.bannedWords), DEFAULT_GROUP_DB.bannedWords);
    const bannedWordsEnabled = readJSON(path.join(chatDir, FEATURE_FILES.bannedWordsEnabled), DEFAULT_GROUP_DB.bannedWordsEnabled);

    return normalizeGroupDB({
        menuTitle,
        menuHeaderImage,
        ...welcomeData,
        goodbye,
        goodbyeMsg,
        autoResponses,
        msgAuto,
        warns,
        autoResponderEnabled,
        msgAutoEnabled,
        antiLinkEnabled,
        antiDeleteEnabled,
        bannedWords,
        bannedWordsEnabled
    });
}

function saveGroupDB(chatId, data) {
    if (!isValidGroupChatId(chatId)) {
        return normalizeGroupDB(data);
    }

    const normalized = normalizeGroupDB(data);
    const chatDir = ensureChatDir(chatId);

    writeJSON(path.join(chatDir, FEATURE_FILES.menuTitle), normalized.menuTitle);
    writeJSON(path.join(chatDir, FEATURE_FILES.menuHeaderImage), normalized.menuHeaderImage);

    writeJSON(path.join(chatDir, FEATURE_FILES.welcome), {
        welcome: normalized.welcome,
        welcomeMsg: normalized.welcomeMsg
    });
    writeJSON(path.join(chatDir, FEATURE_FILES.goodbye), normalized.goodbye);
    writeJSON(path.join(chatDir, FEATURE_FILES.goodbyeMsg), normalized.goodbyeMsg);
    writeJSON(path.join(chatDir, FEATURE_FILES.autoResponses), normalized.autoResponses);
    writeJSON(path.join(chatDir, FEATURE_FILES.msgAuto), normalized.msgAuto);
    writeJSON(path.join(chatDir, FEATURE_FILES.warns), normalized.warns);
    writeJSON(path.join(chatDir, FEATURE_FILES.autoResponder), normalized.autoResponderEnabled);
    writeJSON(path.join(chatDir, FEATURE_FILES.msgAutoEnabled), normalized.msgAutoEnabled);
    writeJSON(path.join(chatDir, FEATURE_FILES.antiLink), normalized.antiLinkEnabled);
    writeJSON(path.join(chatDir, FEATURE_FILES.antiDelete), normalized.antiDeleteEnabled);
    writeJSON(path.join(chatDir, FEATURE_FILES.bannedWords), normalized.bannedWords);
    writeJSON(path.join(chatDir, FEATURE_FILES.bannedWordsEnabled), normalized.bannedWordsEnabled);

    return normalized;
}

function updateGroupDB(chatId, updater) {
    const current = readGroupDB(chatId);
    const next = updater({ ...current }) || current;
    return saveGroupDB(chatId, next);
}

function getAllGroupIds() {
    ensureGroupDir();

    const entries = fs.readdirSync(GROUP_DB_DIR, { withFileTypes: true });
    const ids = new Set();

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const decoded = decodeURIComponent(entry.name);
            if (isValidGroupChatId(decoded)) {
                ids.add(decoded);
            }
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            const decoded = decodeURIComponent(entry.name.replace(/\.json$/, ''));
            if (isValidGroupChatId(decoded)) {
                ids.add(decoded);
            }
        }
    }

    return Array.from(ids);
}

module.exports = {
    GROUP_DB_DIR,
    DEFAULT_GROUP_DB,
    readGroupDB,
    saveGroupDB,
    updateGroupDB,
    getAllGroupIds
};
