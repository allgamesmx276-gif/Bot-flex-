const { getDB, saveDB, logEvent } = require('../../utils/db');
const { ok, warn, error, info } = require('../../utils/style');

module.exports = {
    name: 'bulksetplan',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg, args) {
        const db = getDB();
        const ownerNumber = db.config.ownerNumber;
        const admins = db.admins || [];

        const planArg = (args[0] || 'premium').toLowerCase();
        const days = parseInt(args[1] || '30', 10);

        const { normalizePlan, PLAN_ORDER } = require('../../utils/planAccess');
        const plan = normalizePlan(planArg);

        if (!plan) {
            return msg.reply(warn(`Plan inválido. Uso: .bulksetplan <${PLAN_ORDER.join('|')}> <días>\nEjemplo: .bulksetplan premium 30`));
        }

        if (isNaN(days) || days < 1) {
            return msg.reply(warn('Días inválidos. Ejemplo: .bulksetplan premium 30'));
        }

        if (!admins.length) {
            return msg.reply(info('No hay admins registrados en la base de datos.'));
        }

        await msg.reply(`⏳ Buscando grupos de ${admins.length} admin(s)... espera.`);

        let chats;
        try {
            chats = await client.getChats();
        } catch (err) {
            return msg.reply(error('No se pudo obtener la lista de chats.'));
        }

        const grupos = chats.filter(c => c.isGroup);
        const expiryMs = Date.now() + days * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(expiryMs).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'long', year: 'numeric'
        });

        const normalizeId = id => String(id || '').split('@')[0];
        const ownerBase = normalizeId(ownerNumber);
        const adminBases = admins.map(a => normalizeId(a));

        const updated = [];
        const skipped = [];

        for (const grupo of grupos) {
            const chatId = grupo.id._serialized;
            const participants = grupo.participants || [];
            const participantIds = participants.map(p => p.id && p.id._serialized ? normalizeId(p.id._serialized) : '');

            // Skip if owner is a participant
            if (participantIds.includes(ownerBase)) {
                skipped.push(`${grupo.name || chatId} (owner presente)`);
                continue;
            }

            // Check if any registered admin is a participant
            const hasAdmin = adminBases.some(a => participantIds.includes(a));
            if (!hasAdmin) {
                skipped.push(`${grupo.name || chatId} (sin admin registrado)`);
                continue;
            }

            // Assign plan
            db.groupPlans[chatId] = plan;
            db.groupPlanExpiry[chatId] = expiryMs;
            logEvent(`BULK_PLAN ${chatId}: -> ${plan} (${days}d)`);
            updated.push(grupo.name || chatId);
        }

        saveDB();

        const lines = [ok(`Bulk plan completado`)];
        lines.push(`Plan: *${plan}* por *${days} días* (vence ${expiryDate})`);
        lines.push('');

        if (updated.length) {
            lines.push(`✅ Actualizados (${updated.length}):`);
            updated.forEach(g => lines.push(`  • ${g}`));
        }

        if (skipped.length) {
            lines.push('');
            lines.push(`⏭️ Omitidos (${skipped.length}):`);
            skipped.forEach(g => lines.push(`  • ${g}`));
        }

        return msg.reply(lines.join('\n'));
    }
};
