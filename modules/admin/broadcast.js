const { ok, warn, error } = require('../../utils/style');

module.exports = {
    name: 'broadcast',
    category: 'owner',
    ownerOnly: true,
    hidden: true,

    async execute(client, msg, args) {
        const texto = args.join(' ').trim();

        if (!texto) {
            return msg.reply(warn('Uso: .broadcast <mensaje>\nEjemplo: .broadcast El bot tendrá mantenimiento el lunes a las 10pm.\n\nOpciones:\n.broadcast [solo-plan:basic] <mensaje>  → solo grupos con plan basic o superior'));
        }

        // Filtro opcional por plan mínimo: [solo-plan:basic]
        let planFilter = null;
        let mensaje = texto;
        const planMatch = texto.match(/^\[solo-plan:(free|basic|pro|premium)\]\s*/i);

        if (planMatch) {
            const { normalizePlan, isPlanAllowed } = require('../../utils/planAccess');
            planFilter = normalizePlan(planMatch[1]);
            mensaje = texto.slice(planMatch[0].length).trim();
        }

        if (!mensaje) {
            return msg.reply(warn('El mensaje no puede estar vacío.'));
        }

        let chats;
        try {
            chats = await client.getChats();
        } catch (err) {
            return msg.reply(error('No se pudo obtener la lista de grupos.'));
        }

        const grupos = chats.filter(c => c.isGroup);

        if (!grupos.length) {
            return msg.reply(warn('El bot no está en ningún grupo.'));
        }

        let enviados = 0;
        let omitidos = 0;
        let fallidos = 0;

        const { getDB } = require('../../utils/db');
        const { normalizePlan, isPlanAllowed } = require('../../utils/planAccess');

        const db = getDB();

        for (const grupo of grupos) {
            const chatId = grupo.id._serialized;

            if (planFilter) {
                const groupPlan = normalizePlan(db.groupPlans && db.groupPlans[chatId]) || 'free';
                if (!isPlanAllowed(groupPlan, planFilter)) {
                    omitidos++;
                    continue;
                }
            }

            try {
                await client.sendMessage(chatId, `📢 *Anuncio del bot*\n\n${mensaje}`);
                enviados++;
                // Pequeña pausa para no saturar la API de WhatsApp
                await new Promise(r => setTimeout(r, 800));
            } catch (err) {
                fallidos++;
            }
        }

        const resumen = [
            ok('Broadcast completado'),
            `Enviados: ${enviados}`,
            omitidos ? `Omitidos (plan): ${omitidos}` : null,
            fallidos ? `Fallidos: ${fallidos}` : null
        ].filter(Boolean).join('\n');

        return msg.reply(resumen);
    }
};
