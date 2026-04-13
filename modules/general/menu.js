const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { getDB } = require('../../utils/db');
const { isAdmin, isModerator, isOwner } = require('../../utils/permissions');
const { readGroupDB } = require('../../utils/groupDb');
const { getCustomSections, getOrderedMenuLabels, getOrderedUtilityEntries } = require('../../utils/menuOrder');
const { getCommands } = require('../../handler');
const { getChatPlan, getRequiredPlan, isPlanAllowed } = require('../../utils/planAccess');

const GENERAL_DIR = path.join(process.cwd(), 'modules', 'general');
const DEFAULT_MENU_HEADER_PATH = path.join(process.cwd(), 'storage', 'assets', 'menu-header.jpg');

module.exports = {
    name: 'menu',
    category: 'general',

    async execute(client, msg) {
        const db = getDB();
        const admin = await isAdmin(client, msg);
        const owner = isOwner(msg);
        const moderator = isModerator(msg);
        const chat = await msg.getChat();
        const groupDb = chat.isGroup ? readGroupDB(chat.id._serialized) : null;
        const now = new Date();
        const requestTime = now.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const role = owner ? 'OWNER' : admin ? 'ADMIN' : moderator ? 'MOD' : 'USUARIO';
        const prefix = db.config.prefix || '.';
        const sender = msg.author || msg.from;
        const plan = getChatPlan(db, chat.isGroup ? chat.id._serialized : null, sender);
        const hasPaidPlan = isPlanAllowed(plan, 'basic');
        const canUseAdminMenu = owner || admin || hasPaidPlan;
        const canUseModeratorMenu = canUseAdminMenu || moderator;
        const headerLines = [];
        const bodyLines = [];
        const stateIcon = value => (value ? '🟢 ON' : '🔴 OFF');
        const stateText = value => (groupDb ? stateIcon(Boolean(value)) : '⚪ N/A');
        const cmd = value => `${prefix}${value}`;
        const hasGeneralCommand = fileBase => fs.existsSync(path.join(GENERAL_DIR, `${fileBase}.js`));
        const commandMap = new Map(
            getCommands()
                .filter(command => command && command.name && !command.auto)
                .map(command => [command.name, command])
        );

        const isCommandEnabledByPlan = (commandName, fallbackCategory) => {
            const name = String(commandName || '').trim().toLowerCase();
            if (!name) return false;

            const command = commandMap.get(name) || { name, category: fallbackCategory || 'general' };
            if (command.ownerOnly && !owner) return false;
            const requiredPlan = getRequiredPlan(command);
            return isPlanAllowed(plan, requiredPlan);
        };

        const filterLabelsByPlan = (labels, fallbackCategory) =>
            labels.filter(label => isCommandEnabledByPlan(label, fallbackCategory));

        const addBoxSection = (title, commands) => {
            if (!commands.length) return;
            bodyLines.push(`┌ ${title}`);
            commands.forEach(command => bodyLines.push(`│ ${command}`));
            bodyLines.push('└');
            bodyLines.push('');
        };

        const menuTitle = (groupDb && groupDb.menuTitle) || 'FLEXBOT MODULAR';
        headerLines.push(`🤖 ${menuTitle}`);
        headerLines.push(`🏷️ ROL: ${role}`);
        headerLines.push(`⚙️ PREFIJO: ${prefix}`);
        headerLines.push(`🕒 HORA: ${requestTime}`);
        bodyLines.push('');
        headerLines.push(`💼 PLAN: ${plan.toUpperCase()}`);

        if (canUseAdminMenu) {
            if (isPlanAllowed(plan, 'basic')) {
                addBoxSection('🛡️ STATUS', [
                    `${stateText(groupDb && groupDb.welcome)} welcome`,
                    `${stateText(groupDb && groupDb.goodbye)} goodbye`,
                    `${stateText(groupDb && groupDb.antiLinkEnabled)} anti-link`,
                    `${stateText(groupDb && groupDb.antiDeleteEnabled)} anti-delete`,
                    `${stateText(groupDb && groupDb.autoResponderEnabled)} auto-responder`,
                    `${stateText(groupDb && groupDb.msgAutoEnabled)} msg-auto`,
                    `${stateText(groupDb && groupDb.bannedWordsEnabled)} bannedwords`
                ]);
            }

            addBoxSection(
                '🛡️ ADMIN MSG',
                filterLabelsByPlan(getOrderedMenuLabels(db, 'adminMsg'), 'admin').map(cmd)
            );

            addBoxSection(
                '🛡️ ADMIN MOD',
                filterLabelsByPlan(getOrderedMenuLabels(db, 'adminMod'), 'admin').map(cmd)
            );

            addBoxSection(
                '🛡️ ADMIN CTRL',
                filterLabelsByPlan(getOrderedMenuLabels(db, 'adminCtrl'), 'admin').map(cmd)
            );

            const customAdminSections = getCustomSections(db, 'admin')
                .map(section => ({
                    title: `🛡️ ${section.title.toUpperCase()}`,
                    commands: filterLabelsByPlan(section.commands, 'admin').map(cmd)
                }))
                .filter(section => section.commands.length > 0);

            customAdminSections.forEach(section => addBoxSection(section.title, section.commands));
        }

        const utilEntries = getOrderedUtilityEntries(db);

        const utilCommands = utilEntries
            .filter(([, fileBase]) => hasGeneralCommand(fileBase))
            .filter(([, fileBase]) => isCommandEnabledByPlan(fileBase, 'general'))
            .map(([label]) => cmd(label));

        addBoxSection('🌐 UTILIDADES', utilCommands);

        const userLabelToFileBase = new Map(utilEntries.map(([label, fileBase]) => [label, fileBase]));
        const customUserSections = getCustomSections(db, 'user')
            .map(section => {
                const commands = section.commands
                    .filter(label => hasGeneralCommand(userLabelToFileBase.get(label)))
                    .filter(label => isCommandEnabledByPlan(userLabelToFileBase.get(label), 'general'))
                    .map(label => cmd(label));

                return {
                    title: `🌐 ${section.title.toUpperCase()}`,
                    commands
                };
            })
            .filter(section => section.commands.length > 0);

        customUserSections.forEach(section => addBoxSection(section.title, section.commands));

        if (owner) {
            addBoxSection(
                '👑 OWNER SYS',
                filterLabelsByPlan(getOrderedMenuLabels(db, 'ownerSys'), 'owner').map(cmd)
            );
        }

        bodyLines.push('FlexBot Modular v1.0');
        const headerText = headerLines.join('\n');
        const bodyText = bodyLines.join('\n');
        const fullText = `${headerText}\n\n${bodyText}`;

        const configuredImage = groupDb && groupDb.menuHeaderImage
            ? path.resolve(process.cwd(), groupDb.menuHeaderImage)
            : db.config.menuHeaderImage
                ? path.resolve(process.cwd(), db.config.menuHeaderImage)
                : DEFAULT_MENU_HEADER_PATH;

        if (fs.existsSync(configuredImage)) {
            const media = MessageMedia.fromFilePath(configuredImage);
            await msg.reply(media, undefined, { caption: fullText });
        } else {
            await msg.reply(fullText);
        }
    }
};
