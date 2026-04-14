const { getDB, saveDB } = require('../../utils/db');
const { isAdmin } = require('../../utils/permissions');

function normalizeId(id) {
    return String(id || '').replace(/@.*/, '');
}

function formatMinutes(minutes) {
    const n = Math.max(1, Number(minutes) || 1);
    if (n % 60 === 0) {
        const h = n / 60;
        return `${h} ${h === 1 ? 'hora' : 'horas'}`;
    }
    return `${n} ${n === 1 ? 'minuto' : 'minutos'}`;
}

async function getManageableGroups(client, sender, db) {
    const owner = db.config.ownerNumber && normalizeId(sender) === normalizeId(db.config.ownerNumber);
    const isRegisteredAdmin = Array.isArray(db.admins) && db.admins.includes(sender);
    const chats = await client.getChats();
    const groups = [];

    for (const chat of chats) {
        if (!chat.isGroup) continue;

        if (owner || isRegisteredAdmin) {
            groups.push(chat);
            continue;
        }

        const participant = (chat.participants || []).find(p => normalizeId(p.id._serialized) === normalizeId(sender));
        if (participant && (participant.isAdmin || participant.isSuperAdmin)) {
            groups.push(chat);
        }
    }

    return groups.slice(0, 25);
}

module.exports = {
    name: 'cofre',
    category: 'general',
    minPlan: 'free',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        const db = getDB();
        const sender = msg.author || msg.from;
        const sub = String(args[0] || '').toLowerCase();

        if (!db.cofreGames || typeof db.cofreGames !== 'object') {
            db.cofreGames = {};
        }

        if (!chat.isGroup) {
            if (!['activar', 'programar', 'iniciar'].includes(sub)) {
                return msg.reply(
                    'Uso desde privado:\n' +
                    '• .cofre activar\n\n' +
                    'Inicia un flujo para programar cofres aleatorios por grupo.'
                );
            }

            if (db.awaiting[sender]) {
                return msg.reply('Termina el proceso actual o escribe "cancelar".');
            }

            const groups = await getManageableGroups(client, sender, db);
            if (!groups.length) {
                return msg.reply('No encontré grupos donde puedas programar cofres.');
            }

            if (groups.length === 1) {
                const g = groups[0];
                db.awaiting[sender] = {
                    step: 'cofre_cantidad',
                    chatId: g.id._serialized,
                    chatName: g.name
                };
                saveDB();

                return msg.reply(
                    `🎁 Grupo seleccionado: *${g.name}*\n\n` +
                    '1/6 ¿Cuántos cofres quieres programar?\n' +
                    'Ejemplo: 5'
                );
            }

            let list = '🎁 Selecciona grupo para programar cofres:\n\n';
            groups.forEach((g, i) => {
                list += `${i + 1}. ${g.name}\n`;
            });
            list += '\nResponde con el número del grupo.';

            db.awaiting[sender] = {
                step: 'cofre_elegir_grupo',
                grupos: groups.map(g => ({ id: g.id._serialized, name: g.name }))
            };
            saveDB();
            return msg.reply(list);
        }

        const chatId = chat.id._serialized;
        const campaign = db.cofreGames[chatId];
        const admin = await isAdmin(client, msg);

        if (sub === 'detener' || sub === 'stop' || sub === 'cerrar') {
            if (!admin) return msg.reply('Solo admins pueden detener cofres en este grupo.');
            if (!campaign || !campaign.enabled) return msg.reply('No hay campaña de cofres activa.');

            campaign.enabled = false;
            campaign.activeDrop = null;
            campaign.nextAt = null;
            saveDB();
            return msg.reply('🛑 Campaña de cofres detenida en este grupo.');
        }

        if (sub === 'ver' || sub === 'estado' || !sub) {
            if (!campaign || !campaign.enabled) {
                return msg.reply(
                    'No hay campaña de cofres activa.\n' +
                    'Inicia desde privado con *.cofre activar*.'
                );
            }

            const now = Date.now();
            const nextMin = campaign.nextAt ? Math.max(0, Math.ceil((campaign.nextAt - now) / 60000)) : 0;
            const active = campaign.activeDrop;

            return msg.reply(
                `🎁 *COFRE PROGRAMADO*\n\n` +
                `Grupo: ${campaign.chatName || chat.name}\n` +
                `Palabra: *${campaign.config.keyword}*\n` +
                `Tiempo aleatorio: *${formatMinutes(campaign.config.minMinutes)} a ${formatMinutes(campaign.config.maxMinutes)}*\n` +
                `Enviados: *${campaign.progress.sent}/${campaign.config.totalDrops}*\n` +
                `Ganados: *${campaign.progress.claimed}*\n` +
                `Próximo en: *${formatMinutes(nextMin)}*\n` +
                (active ? `\nCofre activo: #${active.index} (premio ${active.prizeLabel || active.prize || 'sorpresa'})` : '\nSin cofre activo en este momento.')
            );
        }

        return msg.reply(
            'Uso:\n' +
            '• .cofre (o .cofre estado)\n' +
            '• .cofre detener\n\n' +
            'Para crear campaña nueva usa *.cofre activar* desde privado.'
        );
    }
};
