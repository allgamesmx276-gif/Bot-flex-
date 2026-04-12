const fs = require('fs');
const path = require('path');
const { getDB, saveDB } = require('../../utils/db');
const { isOwner, isRegisteredAdmin } = require('../../utils/permissions');
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

    async execute(client, msg) {
        if (!isOwner(msg) && !isRegisteredAdmin(msg)) {
            return msg.reply(error('Solo owner o admins registrados pueden cambiar la imagen del menu'));
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
            return msg.reply(warn('Responde a una imagen con el comando setmenuimg'));
        }

        const media = await sourceMessage.downloadMedia();

        if (!media || !String(media.mimetype || '').startsWith('image/')) {
            return msg.reply(warn('Solo puedes usar una imagen para la cabecera del menu'));
        }

        fs.mkdirSync(ASSETS_DIR, { recursive: true });

        const db = getDB();
        const previousPath = db.config.menuHeaderImage
            ? path.resolve(process.cwd(), db.config.menuHeaderImage)
            : null;

        if (previousPath && fs.existsSync(previousPath)) {
            fs.rmSync(previousPath, { force: true });
        }

        const extension = getExtension(media.mimetype);
        const filePath = path.join(ASSETS_DIR, `menu-header.${extension}`);

        fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));

        db.config.menuHeaderImage = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
        saveDB();

        return msg.reply(ok('Imagen de cabecera del menu actualizada'));
    }
};