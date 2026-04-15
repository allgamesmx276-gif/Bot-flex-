const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { getDB } = require('../../utils/db');
const { isAdmin, isModerator, isOwner } = require('../../utils/permissions');
const { getCommands } = require('../../handler');
const { getChatPlan, isPlanAllowed, getRequiredPlan } = require('../../utils/planAccess');

module.exports = {
    name: 'menu',
    category: 'general',

    async execute(client, msg) {
        try {
            const db = getDB();
            const prefix = db.config?.prefix || '.';

            const owner = isOwner(msg);
            const admin = await isAdmin(client, msg);
            const moderator = isModerator(msg);
            const chatId = msg.from;
            const sender = msg.author || msg.from;

            const currentPlan = getChatPlan(db, chatId, sender);
            const role = owner ? 'OWNER' : admin ? 'ADMIN' : moderator ? 'MOD' : 'USUARIO';

            const now = new Date();
            const time = now.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // 📂 Agrupar comandos para armar el menú
            const allCommands = getCommands().filter(cmd => !cmd.auto && cmd.name);
            const cmdNames = allCommands.map(c => c.name);

            // 📝 Construir texto del menú con el diseño solicitado
            let text = `🤖 *FLEXBOT v1.0*\n`;
            text += `🏷️ *ROL:* ${role}\n`;
            text += `⚙️ *PREFIJO:* ${prefix}\n`;
            text += `🕒 *HORA:* ${time}\n`;
            text += `💼 *PLAN:* ${currentPlan.toUpperCase()}\n\n`;

            // 🛡️ STATUS (Dinamizando estados comunes)
            const getStatus = (key) => db[key]?.[chatId] || db[key + 'Enabled']?.[chatId] ? '🟢 ON' : '🔴 OFF';
            text += `┌ 🛡️ *STATUS*\n`;
            text += `│ ${getStatus('welcome')} welcome\n`;
            text += `│ ${getStatus('goodbye')} goodbye\n`;
            text += `│ ${getStatus('antiLink')} anti-link\n`;
            text += `│ ${getStatus('antiDelete')} anti-delete\n`;
            text += `│ ${getStatus('autoResponder')} auto-responder\n`;
            text += `│ ${getStatus('msgAuto')} msg-auto\n`;
            text += `│ ${getStatus('bannedWords')} bannedwords\n`;
            text += `└\n\n`;

            // 🛡️ SECCIONES DE COMANDOS
            const buildSection = (title, list) => {
                const available = list.filter(c => cmdNames.includes(c));
                if (available.length === 0) return '';
                let section = `┌ 🛡️ *${title}*\n`;
                section += available.map(c => `│ ${prefix}${c}`).join('\n');
                section += `\n└\n\n`;
                return section;
            };

            // Definición de grupos según el diseño del usuario
            text += buildSection('ADMIN MSG', ['setwelcome', 'setgoodbye', 'add-auto-responder', 'list-auto-responder', 'del-auto-responder', 'add-msg-auto', 'list-msg-auto', 'del-msg-auto']);
            text += buildSection('ADMIN MOD', ['ban', 'warn', 'mutetime', 'unmute', 'open', 'close', 'bannedwords', 'addbannedword', 'delbannedword', 'resetbannedwords', 'ranking', 'inactivos', 'expulsar-inactivos']);
            text += buildSection('ADMIN CTRL', ['checkcmds', 'offline', 'online', 'setmenuname', 'setmenuimg', 'bot', 'reporte', 'comentario']);
            text += buildSection('DIVERSION', ['matar', 'casarse', 'gay', 'lesbiana', 'ship', 'simulador', 'ruleta', 'batalla', 'trivia', 'respuesta', 'cofre']);
            text += buildSection('UTILIDADES', ['convert', 'ayuda', 'tips', 'historial', '8ball', 'calc', 'caraocruz', 'recordar', 'clima', 'qr', 'traducir', 'frase', 'chiste', 'dado', 'miid', 'random', 'userinfo', 'afk', 's', 'perfil', 'miranking', 'rangos']);
            text += buildSection('OWNER SYS', ['reload', 'setowner', 'setprefix', 'addmod', 'delmod', 'listmods', 'delcmd', 'disablecmd', 'enablecmd', 'backupnow', 'claimowner', 'listadmins', 'setcmdplan', 'setplan', 'bulksetplan', 'broadcast', 'setregisterkey', 'verregisterkey', 'setlogskey', 'menusection', 'movecmd']);

            text += `*FlexBot Modular v1.0*`;

            text = text.trim();

            // ===============================
            // IMAGEN ENCABEZADO
            // ===============================
            const imagePath = path.join(process.cwd(), 'storage', 'assets', 'menu-header.jpg');

            if (fs.existsSync(imagePath)) {
                const media = MessageMedia.fromFilePath(imagePath);
                await client.sendMessage(msg.from, media, { caption: text });
            } else {
                await client.sendMessage(msg.from, text);
            }

        } catch (err) {
            console.log('❌ Error menu:', err.message);
            await client.sendMessage(msg.from, '❌ Error mostrando menú');
        }
    }
};