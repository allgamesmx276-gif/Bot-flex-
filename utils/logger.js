const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'storage', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_LOG_SIZE_BYTES = 1024 * 1024;

// LOG_LEVEL: error | warn | info (default: warn)
const LEVELS = { error: 0, warn: 1, info: 2 };
const currentLevel = LEVELS[String(process.env.LOG_LEVEL || 'warn').toLowerCase()] ?? LEVELS.warn;

function ensureLogDir() {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateIfNeeded() {
    try {
        if (!fs.existsSync(LOG_FILE)) return;

        const stats = fs.statSync(LOG_FILE);
        if (stats.size < MAX_LOG_SIZE_BYTES) return;

        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = path.join(LOG_DIR, `app.${stamp}.log`);
        fs.renameSync(LOG_FILE, rotatedFile);
    } catch (err) {
        console.error('LOGGER_ROTATE_ERROR', err.message);
    }
}

function write(level, message, meta) {
    const levelKey = level.toLowerCase();
    if ((LEVELS[levelKey] ?? 2) > currentLevel) return;

    const timestamp = new Date().toISOString();
    const serializedMeta = meta ? ` ${JSON.stringify(meta)}` : '';
    const line = `[${timestamp}] [${level}] ${message}${serializedMeta}`;

    if (level === 'ERROR') {
        console.error(line);
    } else if (level === 'WARN') {
        console.warn(line);
    }
    // INFO only goes to file, not console

    try {
        ensureLogDir();
        rotateIfNeeded();
        fs.appendFileSync(LOG_FILE, `${line}\n`);
    } catch (err) {
        console.error('LOGGER_WRITE_ERROR', err.message);
    }
}

function info(message, meta) {
    write('INFO', message, meta);
}

function warn(message, meta) {
    write('WARN', message, meta);
}

function error(message, meta) {
    write('ERROR', message, meta);
}

module.exports = {
    LOG_FILE,
    info,
    warn,
    error,
    clearLog() {
        try {
            ensureLogDir();
            fs.writeFileSync(LOG_FILE, '');
        } catch (err) {
            console.error('LOGGER_CLEAR_ERROR', err.message);
        }
    }
};
