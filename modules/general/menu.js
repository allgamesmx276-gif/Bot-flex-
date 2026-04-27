const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { getDB } = require('../../utils/db');
const { readGroupDB } = require('../../utils/groupDb');
const { isAdmin, isModerator, isOwner } = require('../../utils/permissions');
const { getCommands } = require('../../handler');
const { getChatPlan, isPlanAllowed, getRequiredPlan } = require('../../utils/planAccess');

module.exports = {
    name: 'menu',
    category: 'general',

    async execute(client, msg) {
        try {
            const db = getDB();
            const chatId = msg.from;
            const groupDb = readGroupDB(chatId);
            const prefix = db.config?.prefix || '.';

            const owner = isOwner(msg);
            const admin = await isAdmin(client, msg);
            const moderator = isModerator(msg);
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

            // 📝 Construir texto del menú (Dinamizado por grupo)
            const menuTitle = groupDb.menuTitle || 'FLEXBOT v1.0';
            let text = `🤖 *${menuTitle}*\n`;
            text += `🏷️ *ROL:* ${role}\n`;
            text += `⚙️ *PREFIJO:* ${prefix}\n`;
            text += `🕒 *HORA:* ${time}\n`;
            text += `💼 *PLAN:* ${currentPlan.toUpperCase()}\n\n`;

            // 🛡️ STATUS (Dinamizando estados comunes)
            const getStatus = (key) => groupDb[key + 'Enabled'] ? '🟢 ON' : '🔴 OFF';
            text += `┌ 🛡️ *STATUS*\n`;
            text += `│ welcome: ${groupDb.welcome ? '🟢 ON' : '🔴 OFF'}\n`;
            text += `│ goodbye: ${groupDb.goodbye ? '🟢 ON' : '🔴 OFF'}\n`;
            text += `│ anti-link: ${groupDb.antiLinkEnabled ? '🟢 ON' : '🔴 OFF'}\n`;
            text += `│ auto-responder: ${groupDb.autoResponderEnabled ? '🟢 ON' : '🔴 OFF'}\n`;
            text += `│ msg-auto: ${groupDb.msgAutoEnabled ? '🟢 ON' : '🔴 OFF'}\n`;
            text += `└\n\n`;

            // 🛡️ SECCIONES DE COMANDOS (Respetando disablesection)
            const disabledSections = groupDb.disabledMenuSections || [];
            
            const buildSection = (title, list, sectionKey) => {
                if (disabledSections.includes(sectionKey.toLowerCase())) return '';
                
                const available = list.filter(c => cmdNames.includes(c));
                if (available.length === 0) return '';
                let section = `┌ 🛡️ *${title}*\n`;
                section += available.map(c => `│ ${prefix}${c}`).join('\n');
                section += `\n└\n\n`;
                return section;
            };

            // Definición de grupos
            text += buildSection('ADMIN MSG', ['setwelcome', 'setgoodbye', 'add-auto-responder', 'list-auto-responder', 'del-auto-responder', 'add-msg-auto', 'list-msg-auto', 'del-msg-auto'], 'admin_msg');
            text += buildSection('ADMIN MOD', ['ban', 'warn', 'mutetime', 'unmute', 'open', 'close', 'bannedwords', 'addbannedword', 'delbannedword', 'resetbannedwords', 'ranking', 'inactivos', 'expulsar-inactivos'], 'admin_mod');
            text += buildSection('ADMIN CTRL', ['checkcmds', 'offline', 'online', 'setmenuname', 'setmenuimg', 'bot', 'reporte', 'comentario', 'disablesection', 'enablesection'], 'admin_ctrl');
            text += buildSection('DIVERSION', ['matar', 'casarse', 'gay', 'lesbiana', 'ship', 'simulador', 'ruleta', 'batalla', 'trivia', 'respuesta', 'cofre'], 'diversion');
            text += buildSection('UTILIDADES', ['convert', 'ayuda', 'tips', 'historial', '8ball', 'calc', 'caraocruz', 'recordar', 'clima', 'qr', 'traducir', 'frase', 'chiste', 'dado', 'miid', 'random', 'userinfo', 'afk', 's', 'perfil', 'miranking', 'rangos'], 'utilidades');
            
            if (owner) {
                text += buildSection('OWNER SYS', ['reload', 'setowner', 'setprefix', 'addmod', 'delmod', 'listmods', 'delcmd', 'disablecmd', 'enablecmd', 'backupnow', 'claimowner', 'listadmins', 'setcmdplan', 'setplan', 'bulksetplan', 'broadcast', 'setregisterkey', 'verregisterkey', 'setlogskey', 'menusection', 'movecmd'], 'owner_sys');
            }

            text += `*FlexBot Modular v1.0*`;

            text = text.trim();

            // ===============================
            // IMAGEN ENCABEZADO (Prioridad por grupo)
            // ===============================
            let media = null;
            let finalPath = '';

            if (groupDb.menuHeaderImage) {
                const groupPath = path.resolve(process.cwd(), groupDb.menuHeaderImage);
                if (fs.existsSync(groupPath)) {
                    finalPath = groupPath;
                }
            }

            if (!finalPath) {
                const globalPath = path.join(process.cwd(), 'storage', 'assets', 'menu-header.jpg');
                if (fs.existsSync(globalPath)) {
                    finalPath = globalPath;
                }
            }

            if (finalPath) {
                media = MessageMedia.fromFilePath(finalPath);
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

        } catch (err) {
            console.log('❌ Error menu:', err.message);
            await client.sendMessage(msg.from, '❌ Error mostrando menú');
        }
    }
};