const fs = require('fs');
const path = require('path');
const { readGroupDB, saveGroupDB, GROUP_DB_DIR } = require('../../utils/groupDb');
const { isOwner, isAdmin } = require('../../utils/permissions');
const { ok, error, warn } = require('../../utils/style');

const ASSETS_DIR = path.join(process.cwd(), 'storage', 'assets');

function getExtension(mimetype) {
    const subtype = String(mimetype || '').split('/')[1] || 'jpg';

    if (subtype === 'jpeg') return 'jpg';
    if (subtype === 'svg+xml') return 'svg';

    return subtype.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
}

module.exports = {
    name: 'setmenuimg',
    category: 'admin',

    async execute(client, msg, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            return msg.reply(warn('Este comando solo funciona en grupos'));
        }

        if (!isOwner(msg) && !await isAdmin(client, msg)) {
            return msg.reply(error('Solo admins del grupo u owner pueden cambiar la imagen del menu'));
        }

        const chatId = chat.id._serialized;
        const groupDb = readGroupDB(chatId);

        if (String(args[0] || '').toLowerCase() === 'reset') {
            const previousPath = groupDb.menuHeaderImage
                ? path.resolve(process.cwd(), groupDb.menuHeaderImage)
                : null;

            if (previousPath && fs.existsSync(previousPath)) {
                fs.rmSync(previousPath, { force: true });
            }

            groupDb.menuHeaderImage = '';
            saveGroupDB(chatId, groupDb);
            return msg.reply(ok('Imagen del menú restablecida para este grupo'));
        }

        let sourceMessage = null;

        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            if (quoted.hasMedia) {
                sourceMessage = quoted;
            }
        }

        if (!sourceMessage && msg.hasMedia) {
            sourceMessage = msg;
        }

        if (!sourceMessage) {
            return msg.reply(warn('Responde a una imagen con el comando setmenuimg o usa .setmenuimg reset'));
        }

        const media = await sourceMessage.downloadMedia();

        if (!media || !String(media.mimetype || '').startsWith('image/')) {
            return msg.reply(warn('Solo puedes usar una imagen para la cabecera del menu'));
        }

        fs.mkdirSync(ASSETS_DIR, { recursive: true });
        fs.mkdirSync(path.join(GROUP_DB_DIR, encodeURIComponent(chatId)), { recursive: true });

        const previousPath = groupDb.menuHeaderImage
            ? path.resolve(process.cwd(), groupDb.menuHeaderImage)
            : null;

        if (previousPath && fs.existsSync(previousPath)) {
            fs.rmSync(previousPath, { force: true });
        }

        const extension = getExtension(media.mimetype);
        const filePath = path.join(GROUP_DB_DIR, encodeURIComponent(chatId), `menu-header.${extension}`);

        fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));

        groupDb.menuHeaderImage = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
        saveGroupDB(chatId, groupDb);

        return msg.reply(ok('Imagen de cabecera del menu actualizada para este grupo'));
    }
};