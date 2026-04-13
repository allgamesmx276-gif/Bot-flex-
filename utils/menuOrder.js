const DEFAULT_UTILITY_ENTRIES = [
    ['perfil', 'perfil'],
    ['miranking', 'miranking'],
    ['rangos', 'rangos'],
    ['convert', 'convert'],
    ['ayuda', 'ayuda'],
    ['tips', 'tips'],
    ['historial', 'historial'],
    ['8ball', '8ball'],
    ['calc', 'calc'],
    ['caraocruz', 'caraocruz'],
    ['recordar', 'recordar'],
    ['clima', 'clima'],
    ['qr', 'qr'],
    ['traducir', 'traducir'],
    ['meme', 'meme'],
    ['frase', 'frase'],
    ['chiste', 'chiste'],
    ['encuesta', 'encuesta'],
    ['encuesta sorteo', 'encuesta'],
    ['encuesta votar', 'encuesta'],
    ['encuesta resultados', 'encuesta'],
    ['encuesta resumen', 'encuesta'],
    ['encuesta cerrar', 'encuesta'],
    ['elige', 'elige'],
    ['dado', 'dado'],
    ['fecha', 'fecha'],
    ['hora', 'hora'],
    ['miid', 'miid'],
    ['random', 'random'],
    ['userinfo', 'userinfo'],
    ['afk', 'afk'],
    ['s', 's']
];

const DEFAULT_MENU_SECTIONS = {
    mod: [
        'statusbot',
        'menulogs',
        'logs',
        'dellogs',
        'cleanup-groups'
    ],
    adminMsg: [
        'setwelcome',
        'setgoodbye',
        'add-auto-responder',
        'list-auto-responder',
        'del-auto-responder',
        'add-msg-auto',
        'list-msg-auto',
        'del-msg-auto'
    ],
    adminMod: [
        'ranking',
        'inactivos',
        'expulsar-inactivos',
        'ban',
        'warn',
        'mutetime',
        'unmute',
        'open',
        'close',
        'bannedwords',
        'addbannedword',
        'delbannedword',
        'resetbannedwords'
    ],
    adminCtrl: [
        'checkcmds',
        'offline',
        'online'
    ],
    ownerSys: [
        'claimowner',
        'reload',
        'setowner',
        'setprefix',
        'addmod',
        'delmod',
        'listmods',
        'listadmins',
        'delcmd',
        'disablecmd',
        'enablecmd',
        'setcmdplan',
        'menusection',
        'movecmd',
        'checkcmds',
        'setplan',
        'bulksetplan',
        'broadcast',
        'setregisterkey',
        'verregisterkey',
        'setlogskey',
        'cleanup-groups',
        'backupnow'
    ]
};

const DEFAULT_SECTION_META = {
    utilities: { title: '🌐 UTILIDADES', domain: 'user', kind: 'default' },
    mod: { title: '🧰 MOD', domain: 'admin', kind: 'default' },
    adminMsg: { title: '🛡️ ADMIN MSG', domain: 'admin', kind: 'default' },
    adminMod: { title: '🛡️ ADMIN MOD', domain: 'admin', kind: 'default' },
    adminCtrl: { title: '🛡️ ADMIN CTRL', domain: 'admin', kind: 'default' },
    ownerSys: { title: '👑 OWNER SYS', domain: 'owner', kind: 'default' }
};

const SECTION_ALIASES = {
    mod: 'mod',
    adminmsg: 'adminMsg',
    'admin-msg': 'adminMsg',
    adminmod: 'adminMod',
    'admin-mod': 'adminMod',
    adminctrl: 'adminCtrl',
    'admin-ctrl': 'adminCtrl',
    owner: 'ownerSys',
    ownersys: 'ownerSys',
    'owner-sys': 'ownerSys',
    util: 'utilities',
    utils: 'utilities',
    utilidades: 'utilities',
    utilities: 'utilities'
};

function normalizeLabel(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeTitle(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function slugify(value) {
    return normalizeLabel(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
}

function normalizeDomain(value) {
    const normalized = normalizeLabel(value);
    if (normalized === 'user' || normalized === 'usuario') return 'user';
    if (normalized === 'admin' || normalized === 'staff') return 'admin';
    return null;
}

function getAllowedLabelsForDomain(domain) {
    if (domain === 'user') {
        return DEFAULT_UTILITY_ENTRIES.map(([label]) => normalizeLabel(label));
    }

    if (domain === 'admin') {
        return [...new Set([
            ...DEFAULT_MENU_SECTIONS.mod,
            ...DEFAULT_MENU_SECTIONS.adminMsg,
            ...DEFAULT_MENU_SECTIONS.adminMod,
            ...DEFAULT_MENU_SECTIONS.adminCtrl
        ].map(normalizeLabel))];
    }

    if (domain === 'owner') {
        return DEFAULT_MENU_SECTIONS.ownerSys.map(normalizeLabel);
    }

    return [];
}

function sanitizeOrder(list, allowedLabels, fillMissing = true) {
    const knownLabels = new Set(allowedLabels);
    const seen = new Set();
    const sanitized = [];

    for (const label of Array.isArray(list) ? list : []) {
        const normalized = normalizeLabel(label);

        if (!knownLabels.has(normalized) || seen.has(normalized)) {
            continue;
        }

        sanitized.push(normalized);
        seen.add(normalized);
    }

    if (fillMissing) {
        for (const label of allowedLabels) {
            if (!seen.has(label)) {
                sanitized.push(label);
            }
        }
    }

    return sanitized;
}

function ensureMenuState(db) {
    if (!db.menuOrder || typeof db.menuOrder !== 'object') {
        db.menuOrder = {};
    }

    if (!db.menuSections || typeof db.menuSections !== 'object') {
        db.menuSections = {};
    }

    if (!Array.isArray(db.menuSections.custom)) {
        db.menuSections.custom = [];
    }

    db.menuSections.custom = db.menuSections.custom
        .filter(section => section && section.key && section.title)
        .map(section => ({
            key: String(section.key),
            title: normalizeTitle(section.title),
            domain: normalizeDomain(section.domain)
        }))
        .filter(section => section.domain);

    db.menuOrder.utilities = sanitizeOrder(
        db.menuOrder.utilities,
        getAllowedLabelsForDomain('user'),
        true
    );

    // Process default sections with cross-section deduplication:
    // each command can only belong to one section; first section in definition order wins.
    const globalClaimed = new Set();

    for (const sectionKey of Object.keys(DEFAULT_MENU_SECTIONS)) {
        const domain = DEFAULT_SECTION_META[sectionKey].domain;
        const allDomainSet = new Set(getAllowedLabelsForDomain(domain));
        const sectionDefaults = DEFAULT_MENU_SECTIONS[sectionKey].map(normalizeLabel);

        const seen = new Set();
        const kept = [];

        for (const raw of (Array.isArray(db.menuOrder[sectionKey]) ? db.menuOrder[sectionKey] : [])) {
            const label = normalizeLabel(raw);
            if (allDomainSet.has(label) && !seen.has(label) && !globalClaimed.has(label)) {
                kept.push(label);
                seen.add(label);
            }
        }

        for (const label of sectionDefaults) {
            if (!seen.has(label) && !globalClaimed.has(label)) {
                kept.push(label);
                seen.add(label);
            }
        }

        db.menuOrder[sectionKey] = kept;
        kept.forEach(l => globalClaimed.add(l));
    }

    for (const section of db.menuSections.custom) {
        db.menuOrder[section.key] = sanitizeOrder(db.menuOrder[section.key], getAllowedLabelsForDomain(section.domain), false);
    }

    return db;
}

function getCustomSections(db, domain) {
    ensureMenuState(db);

    return db.menuSections.custom
        .filter(section => !domain || section.domain === domain)
        .map(section => ({
            ...section,
            commands: db.menuOrder[section.key] || []
        }));
}

function getBaseSectionKeyForDomain(domain) {
    if (domain === 'user') return 'utilities';
    if (domain === 'admin') return 'adminCtrl';
    return null;
}

function getSectionMeta(db, sectionKey) {
    ensureMenuState(db);
    const normalized = normalizeLabel(sectionKey);
    const defaultKey = SECTION_ALIASES[normalized] || Object.keys(DEFAULT_SECTION_META).find(key => normalizeLabel(key) === normalized);

    if (defaultKey && DEFAULT_SECTION_META[defaultKey]) {
        return {
            key: defaultKey,
            ...DEFAULT_SECTION_META[defaultKey],
            commands: db.menuOrder[defaultKey] || []
        };
    }

    const custom = db.menuSections.custom.find(section =>
        normalizeLabel(section.key) === normalized ||
        normalizeLabel(section.title) === normalized ||
        slugify(section.title) === normalized
    );

    if (!custom) return null;

    return {
        ...custom,
        kind: 'custom',
        commands: db.menuOrder[custom.key] || []
    };
}

function getAllSectionMeta(db) {
    ensureMenuState(db);

    return [
        ...Object.keys(DEFAULT_SECTION_META).map(key => ({
            key,
            ...DEFAULT_SECTION_META[key],
            commands: db.menuOrder[key] || []
        })),
        ...getCustomSections(db)
    ];
}

function createCustomSection(db, domain, title) {
    const normalizedDomain = normalizeDomain(domain);
    const normalizedTitle = normalizeTitle(title);

    if (!normalizedDomain) {
        return { ok: false, reason: 'invalid-domain' };
    }

    if (!normalizedTitle) {
        return { ok: false, reason: 'invalid-title' };
    }

    ensureMenuState(db);

    const duplicate = db.menuSections.custom.find(section =>
        section.domain === normalizedDomain && normalizeLabel(section.title) === normalizeLabel(normalizedTitle)
    );

    if (duplicate) {
        return { ok: false, reason: 'duplicate', sectionKey: duplicate.key };
    }

    const baseSlug = slugify(normalizedTitle) || 'seccion';
    let suffix = 1;
    let key = `custom_${normalizedDomain}_${baseSlug}`;

    while (getSectionMeta(db, key)) {
        suffix += 1;
        key = `custom_${normalizedDomain}_${baseSlug}_${suffix}`;
    }

    const section = {
        key,
        title: normalizedTitle,
        domain: normalizedDomain
    };

    db.menuSections.custom.push(section);
    db.menuOrder[key] = [];

    return { ok: true, section };
}

function deleteCustomSection(db, sectionInput) {
    ensureMenuState(db);

    const section = getSectionMeta(db, sectionInput);
    if (!section) {
        return { ok: false, reason: 'invalid-section' };
    }

    if (section.kind !== 'custom') {
        return { ok: false, reason: 'default-section' };
    }

    const fallbackKey = getBaseSectionKeyForDomain(section.domain);
    const fallbackOrder = fallbackKey ? (db.menuOrder[fallbackKey] || []) : [];
    const currentOrder = db.menuOrder[section.key] || [];

    for (const label of currentOrder) {
        if (!fallbackOrder.includes(label)) {
            fallbackOrder.push(label);
        }
    }

    if (fallbackKey) {
        db.menuOrder[fallbackKey] = fallbackOrder;
    }

    db.menuSections.custom = db.menuSections.custom.filter(item => item.key !== section.key);
    delete db.menuOrder[section.key];

    return {
        ok: true,
        sectionKey: section.key,
        title: section.title,
        domain: section.domain,
        movedCommands: currentOrder,
        fallbackKey
    };
}

function moveCustomSection(db, sectionInput, direction) {
    ensureMenuState(db);

    const section = getSectionMeta(db, sectionInput);
    if (!section) {
        return { ok: false, reason: 'invalid-section' };
    }

    if (section.kind !== 'custom') {
        return { ok: false, reason: 'default-section' };
    }

    const step = direction === '1' ? -1 : direction === '0' ? 1 : null;
    if (step === null) {
        return { ok: false, reason: 'invalid-direction' };
    }

    const sameDomainSections = db.menuSections.custom.filter(item => item.domain === section.domain);
    const currentIndex = sameDomainSections.findIndex(item => item.key === section.key);
    const targetIndex = currentIndex + step;

    if (currentIndex === -1) {
        return { ok: false, reason: 'invalid-section' };
    }

    if (targetIndex < 0 || targetIndex >= sameDomainSections.length) {
        return { ok: false, reason: 'edge' };
    }

    const targetSection = sameDomainSections[targetIndex];
    const sourceGlobalIndex = db.menuSections.custom.findIndex(item => item.key === section.key);
    const targetGlobalIndex = db.menuSections.custom.findIndex(item => item.key === targetSection.key);
    const swapped = db.menuSections.custom[targetGlobalIndex];
    db.menuSections.custom[targetGlobalIndex] = db.menuSections.custom[sourceGlobalIndex];
    db.menuSections.custom[sourceGlobalIndex] = swapped;

    return {
        ok: true,
        sectionKey: section.key,
        title: section.title,
        domain: section.domain,
        fromIndex: currentIndex,
        toIndex: targetIndex,
        swappedWith: targetSection.title
    };
}

function listMenuSections(db) {
    ensureMenuState(db);

    const defaults = Object.keys(DEFAULT_SECTION_META).map(key => ({
        key,
        title: DEFAULT_SECTION_META[key].title,
        domain: DEFAULT_SECTION_META[key].domain,
        kind: 'default',
        count: (db.menuOrder[key] || []).length
    }));

    const custom = db.menuSections.custom.map(section => ({
        key: section.key,
        title: section.title,
        domain: section.domain,
        kind: 'custom',
        count: (db.menuOrder[section.key] || []).length
    }));

    return { defaults, custom };
}

function getOrderedUtilityEntries(db) {
    ensureMenuState(db);
    const order = db.menuOrder.utilities || [];
    const entryMap = new Map(DEFAULT_UTILITY_ENTRIES.map(([label, fileBase]) => [normalizeLabel(label), [label, fileBase]]));

    return order
        .map(label => entryMap.get(normalizeLabel(label)))
        .filter(Boolean);
}

function getOrderedMenuLabels(db, sectionKey) {
    const section = getSectionMeta(db, sectionKey);
    return section ? section.commands : [];
}

function moveMenuCommand(db, label, direction, sectionKey) {
    const normalized = normalizeLabel(label);
    const section = sectionKey ? getSectionMeta(db, sectionKey) : null;

    if (sectionKey && !section) {
        return { ok: false, reason: 'invalid-section' };
    }

    ensureMenuState(db);

    const targetSection = section || getAllSectionMeta(db).find(item => item.commands.includes(normalized));

    if (!targetSection) {
        return { ok: false, reason: 'not-found' };
    }

    const order = db.menuOrder[targetSection.key];
    const currentIndex = order.indexOf(normalized);

    if (currentIndex === -1) {
        return { ok: false, reason: 'not-found' };
    }

    const step = direction === '1' ? -1 : direction === '0' ? 1 : null;
    if (step === null) {
        return { ok: false, reason: 'invalid-direction' };
    }

    const targetIndex = currentIndex + step;
    if (targetIndex < 0 || targetIndex >= order.length) {
        return { ok: false, reason: 'edge' };
    }

    const swappedWith = order[targetIndex];
    order[targetIndex] = order[currentIndex];
    order[currentIndex] = swappedWith;

    return {
        ok: true,
        sectionKey: targetSection.key,
        label: normalized,
        fromIndex: currentIndex,
        toIndex: targetIndex,
        swappedWith
    };
}

function moveCommandToSection(db, sourceSectionInput, label, targetSectionInput) {
    ensureMenuState(db);

    const source = getSectionMeta(db, sourceSectionInput);
    const target = getSectionMeta(db, targetSectionInput);
    const normalizedLabel = normalizeLabel(label);

    if (!source) {
        return { ok: false, reason: 'invalid-source' };
    }

    if (!target) {
        return { ok: false, reason: 'invalid-target' };
    }

    if (!['user', 'admin'].includes(source.domain) || !['user', 'admin'].includes(target.domain)) {
        return { ok: false, reason: 'restricted-domain' };
    }

    if (source.domain !== target.domain) {
        return { ok: false, reason: 'cross-domain' };
    }

    const sourceOrder = db.menuOrder[source.key] || [];
    const targetOrder = db.menuOrder[target.key] || [];
    const sourceIndex = sourceOrder.indexOf(normalizedLabel);

    if (sourceIndex === -1) {
        return { ok: false, reason: 'not-found' };
    }

    if (targetOrder.includes(normalizedLabel)) {
        return { ok: false, reason: 'already-in-target' };
    }

    sourceOrder.splice(sourceIndex, 1);
    targetOrder.push(normalizedLabel);
    db.menuOrder[source.key] = sourceOrder;
    db.menuOrder[target.key] = targetOrder;

    return {
        ok: true,
        label: normalizedLabel,
        domain: source.domain,
        sourceSection: source.key,
        targetSection: target.key,
        targetTitle: target.title,
        newPosition: targetOrder.length
    };
}

module.exports = {
    DEFAULT_UTILITY_ENTRIES,
    DEFAULT_MENU_SECTIONS,
    createCustomSection,
    deleteCustomSection,
    ensureMenuState,
    getCustomSections,
    getOrderedMenuLabels,
    getOrderedUtilityEntries,
    getSectionMeta,
    listMenuSections,
    moveCommandToSection,
    moveCustomSection,
    moveMenuCommand
};