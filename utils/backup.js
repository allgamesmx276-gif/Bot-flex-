const fs = require('fs');
const path = require('path');
const { DB_FILE } = require('./db');
const logger = require('./logger');

const BACKUP_ROOT = path.join(process.cwd(), 'storage', 'backups');
const GROUPS_DIR = path.join(process.cwd(), 'storage', 'groups');

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupNow(label = 'startup') {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });

    const backupDir = path.join(BACKUP_ROOT, `${timestamp()}-${label}`);
    fs.mkdirSync(backupDir, { recursive: true });

    const dbPath = path.resolve(process.cwd(), DB_FILE);
    if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, path.join(backupDir, 'data.json'));
    }

    if (fs.existsSync(GROUPS_DIR)) {
        fs.cpSync(GROUPS_DIR, path.join(backupDir, 'groups'), { recursive: true });
    }

    logger.info('Backup creado', { backupDir: path.relative(process.cwd(), backupDir) });
    return backupDir;
}

module.exports = {
    BACKUP_ROOT,
    backupNow
};
