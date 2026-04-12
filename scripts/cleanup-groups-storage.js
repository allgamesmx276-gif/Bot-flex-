const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'storage', 'groups');
const BACKUP_DIR = path.join(ROOT, '_legacy_backups');
const APPLY = process.argv.includes('--apply');

function isValidGroupChatId(value) {
    return /^\d+@g\.us$/.test(String(value || ''));
}

function decodeName(name) {
    try {
        return decodeURIComponent(name);
    } catch {
        return null;
    }
}

function classify(entry) {
    const decoded = decodeName(entry.name);
    if (!decoded) return 'invalid-encoding';

    if (entry.isDirectory()) {
        if (isValidGroupChatId(decoded)) return 'canonical-dir';
        if (/^\d+@g\.us\.json\.legacy(\.json\.legacy)*$/.test(decoded)) return 'legacy-dir';
        return 'other-dir';
    }

    if (entry.isFile()) {
        if (/^\d+@g\.us\.json$/.test(decoded)) return 'legacy-file';
        if (/^\d+@g\.us\.json\.legacy(\.json\.legacy)*\.json$/.test(decoded)) return 'legacy-file-chain';
        return 'other-file';
    }

    return 'other';
}

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function uniqueBackupPath(baseName) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    let candidate = path.join(BACKUP_DIR, `${baseName}.${stamp}`);
    let i = 1;

    while (fs.existsSync(candidate)) {
        candidate = path.join(BACKUP_DIR, `${baseName}.${stamp}.${i}`);
        i++;
    }

    return candidate;
}

function moveToBackup(fullPath, baseName) {
    const target = uniqueBackupPath(baseName);
    fs.renameSync(fullPath, target);
    return target;
}

function main() {
    if (!fs.existsSync(ROOT)) {
        console.log('No existe storage/groups, nada por limpiar.');
        return;
    }

    const entries = fs.readdirSync(ROOT, { withFileTypes: true });
    const report = [];

    for (const entry of entries) {
        if (entry.name === '_legacy_backups') continue;

        const kind = classify(entry);
        const fullPath = path.join(ROOT, entry.name);

        if (kind === 'canonical-dir' || kind === 'legacy-file') {
            report.push({ action: 'keep', kind, name: entry.name });
            continue;
        }

        if (kind === 'legacy-dir' || kind === 'legacy-file-chain' || kind === 'other-dir' || kind === 'other-file' || kind === 'invalid-encoding') {
            if (!APPLY) {
                report.push({ action: 'would-move', kind, name: entry.name });
                continue;
            }

            ensureBackupDir();
            const movedTo = moveToBackup(fullPath, entry.name);
            report.push({ action: 'moved', kind, name: entry.name, movedTo: path.relative(process.cwd(), movedTo) });
        }
    }

    console.log(APPLY ? 'Limpieza aplicada' : 'Simulacion (dry-run)');
    for (const item of report) {
        if (item.action === 'moved') {
            console.log(`[${item.action}] ${item.kind} ${item.name} -> ${item.movedTo}`);
        } else {
            console.log(`[${item.action}] ${item.kind} ${item.name}`);
        }
    }

    if (!APPLY) {
        console.log('Para aplicar cambios ejecuta: node scripts/cleanup-groups-storage.js --apply');
    }
}

main();
