const { getDB, saveDB } = require('../../utils/db');
const { isAdmin } = require('../../utils/permissions');

const DEFAULT_COFRE = {
    modo: 'suerte',  // 'primero' | 'suerte' | 'todos'
    prob: 30,
    premio: 50,
    tiempo: 10,
    active: false,
    openedAt: null,
    expiresAt: null,
    intentos: [],
    ganadores: []
};

const MODO_DESC = {
    primero: 'El primero que lo intenta gana (sin RNG)',
    suerte: 'Cada intento tiene prob% de ganar — 1 ganador',
    todos: 'Cada intento tiene prob% de ganar — multiples ganadores'
};

function getCofre(db, chatId) {
    if (!db.cofreGames) db.cofreGames = {};
    if (!db.cofreGames[chatId]) {
        db.cofreGames[chatId] = { ...DEFAULT_COFRE, intentos: [], ganadores: [] };
    }
    return db.cofreGames[chatId];
}

function normalizeId(id) {
    return String(id || '').replace(/@.*/, '');
}

module.exports = {
    name: 'cofre',
    category: 'general',
    minPlan: 'basic',

    async execute(client, msg, args) {
        const chat = await msg.getChat();
        const db = getDB();
        const sender = msg.author || msg.from;
        const isPrivate = !chat.isGroup;
        const sub = (args[0] || '').toLowerCase();
        const owner = db.config.ownerNumber &&
            normalizeId(sender) === normalizeId(db.config.ownerNumber);

        // ── DESDE PRIVADO: .cofre activar → flujo guiado ──────────────────
        if (isPrivate && sub === 'activar') {
            // Buscar grupos donde el usuario es admin
            const allChats = await client.getChats();
            const adminGroups = [];

            for (const c of allChats) {
                if (!c.isGroup) continue;
                const isRegisteredAdmin = Array.isArray(db.admins) && db.admins.includes(sender);
                const isGroupOwner = owner;
                if (isGroupOwner || isRegisteredAdmin) {
                    // Owner o admin registrado tiene acceso a todos los grupos
                    adminGroups.push(c);
                } else {
                    // Verificar si es admin real del grupo
                    const participant = (c.participants || []).find(p => {
                        return normalizeId(p.id._serialized) === normalizeId(sender);
                    });
                    if (participant && (participant.isAdmin || participant.isSuperAdmin)) {
                        adminGroups.push(c);
                    }
                }
            }

            if (!adminGroups.length) {
                return msg.reply('❌ No eres admin en ningún grupo activo del bot.');
            }

            if (adminGroups.length === 1) {
                // Un solo grupo: ir directo al flujo de configuracion
                const target = adminGroups[0];
                const game = getCofre(db, target.id._serialized);

                if (game.active && game.expiresAt && Date.now() < game.expiresAt) {
                    return msg.reply(`⚠️ Ya hay un cofre activo en *${target.name}*. Ciérralo primero desde el grupo con *.cofre cerrar*.`);
                }

                db.awaiting[sender] = {
                    step: 'cofre_modo',
                    chatId: target.id._serialized,
                    chatName: target.name
                };
                saveDB();

                return msg.reply(
                    `🎁 *Lanzar cofre en:* ${target.name}\n\n` +
                    `1/4 — ¿Qué modo quieres?\n\n` +
                    `• *primero* — ${MODO_DESC.primero}\n` +
                    `• *suerte* — ${MODO_DESC.suerte}\n` +
                    `• *todos* — ${MODO_DESC.todos}\n\n` +
                    `Escribe el modo o "cancelar" para salir.`
                );
            }

            // Varios grupos: preguntar en cuál
            let list = `🎁 *Selecciona el grupo para el cofre:*\n\n`;
            adminGroups.slice(0, 15).forEach((g, i) => {
                list += `${i + 1}. ${g.name}\n`;
            });
            list += `\nEscribe el número del grupo o "cancelar".`;

            db.awaiting[sender] = {
                step: 'cofre_elegir_grupo',
                grupos: adminGroups.slice(0, 15).map(g => ({
                    id: g.id._serialized,
                    name: g.name
                }))
            };
            saveDB();
            return msg.reply(list);
        }

        // ── DESDE GRUPO ────────────────────────────────────────────────────
        if (!chat.isGroup) {
            return msg.reply(
                `Uso desde privado: *.cofre activar* para lanzar un cofre guided.\n` +
                `Desde grupo: *.cofre abrir* | *.cofre cerrar* | *.cofre config* | *.cofre*`
            );
        }

        const chatId = chat.id._serialized;
        const admin = await isAdmin(client, msg);
        const game = getCofre(db, chatId);

        // Auto expirar
        if (game.active && game.expiresAt && Date.now() > game.expiresAt) {
            game.active = false;
            saveDB();
        }

        // ── STATUS ─────────────────────────────────────────────────────────
        if (!sub) {
            if (!game.active) {
                return msg.reply(
                    `🎁 *COFRE* — Sin cofre activo\n\n` +
                    `⚙️ *Config actual:*\n` +
                    `• Modo: *${game.modo}*\n` +
                    `• Probabilidad: *${game.prob}%*\n` +
                    `• Premio: *+${game.premio} pts*\n` +
                    `• Tiempo: *${game.tiempo} min*\n\n` +
                    `Admin: *.cofre activar* para abrir\n` +
                    `Admin: *.cofre config* para ajustar`
                );
            }
            const remaining = Math.max(0, Math.ceil((game.expiresAt - Date.now()) / 60000));
            return msg.reply(
                `🎁 *COFRE ACTIVO* ✅\n\n` +
                `• Modo: *${game.modo}*\n` +
                `• Probabilidad: *${game.prob}%*\n` +
                `• Premio: *+${game.premio} pts*\n` +
                `• Tiempo restante: *${remaining} min*\n` +
                `• Intentos: ${game.intentos.length}\n` +
                `• Ganadores: ${game.ganadores.length}\n\n` +
                `Usa *.cofre abrir* para intentarlo`
            );
        }

        // ── ACTIVAR desde grupo (rápido, usa config actual) ────────────────
        if (sub === 'activar') {
            if (!admin && !owner) return msg.reply('Solo admins pueden activar el cofre.');
            if (game.active && game.expiresAt && Date.now() < game.expiresAt) {
                return msg.reply('Ya hay un cofre activo. Usa *.cofre cerrar* primero.');
            }

            game.active = true;
            game.openedAt = Date.now();
            game.expiresAt = Date.now() + game.tiempo * 60 * 1000;
            game.intentos = [];
            game.ganadores = [];
            saveDB();

            return msg.reply(
                `🎁✨ *¡COFRE DISPONIBLE!* ✨🎁\n\n` +
                `🎯 Modo: *${game.modo}* — ${MODO_DESC[game.modo]}\n` +
                `🎲 Probabilidad: *${game.prob}%*\n` +
                `🏆 Premio: *+${game.premio} puntos*\n` +
                `⏱️ Tiempo: *${game.tiempo} min*\n\n` +
                `¡Usa *.cofre abrir* para intentarlo!`
            );
        }

        // ── CERRAR ─────────────────────────────────────────────────────────
        if (sub === 'cerrar') {
            if (!admin && !owner) return msg.reply('Solo admins pueden cerrar el cofre.');
            if (!game.active) return msg.reply('No hay cofre activo.');

            game.active = false;
            saveDB();

            return msg.reply(
                `🔒 *Cofre cerrado*\n\n` +
                `• Intentos: ${game.intentos.length}\n` +
                `• Ganadores: ${game.ganadores.length}`
            );
        }

        // ── ABRIR ──────────────────────────────────────────────────────────
        if (sub === 'abrir') {
            if (!game.active) {
                return msg.reply('🎁 No hay cofre activo. Espera a que un admin active uno.');
            }
            if (Date.now() > game.expiresAt) {
                game.active = false;
                saveDB();
                return msg.reply('⌛ El cofre expiró. Llega más rápido la próxima vez.');
            }

            const alreadyTried = game.intentos.some(i => i.user === sender);
            const alreadyWon = game.ganadores.includes(sender);

            if ((game.modo === 'primero' || game.modo === 'suerte') && alreadyTried) {
                return msg.reply('Ya intentaste abrir este cofre. Espera el siguiente 👀');
            }
            if (game.modo === 'todos' && alreadyWon) {
                return msg.reply('Ya ganaste en este cofre 🎉 Deja que otros intenten.');
            }

            game.intentos.push({ user: sender, ts: Date.now() });

            const won = game.modo === 'primero' ? true : Math.random() * 100 < game.prob;

            if (won) {
                if (!db.userReactions[chatId]) db.userReactions[chatId] = {};
                if (!db.userReactions[chatId][sender]) db.userReactions[chatId][sender] = { pos: 0, neg: 0 };
                db.userReactions[chatId][sender].pos += game.premio;

                game.ganadores.push(sender);

                if (game.modo === 'primero' || game.modo === 'suerte') {
                    game.active = false;
                }

                saveDB();

                return msg.reply(
                    `🎁💥 *¡@${sender.split('@')[0]} abrió el cofre!*\n\n` +
                    `🏆 ¡Ganaste *+${game.premio} puntos*!\n` +
                    (game.modo !== 'todos' ? `\n🔒 El cofre se ha cerrado.` : '\n🎁 El cofre sigue abierto.'),
                    undefined,
                    { mentions: [sender] }
                );
            } else {
                saveDB();
                return msg.reply(
                    `🎁 @${sender.split('@')[0]} intentó abrir el cofre... *¡Sin suerte!* (${game.prob}% de prob)`,
                    undefined,
                    { mentions: [sender] }
                );
            }
        }

        // ── CONFIG ─────────────────────────────────────────────────────────
        if (sub === 'config') {
            if (!admin && !owner) return msg.reply('Solo admins pueden cambiar la configuracion del cofre.');

            const key = (args[1] || '').toLowerCase();
            const value = args[2];

            if (!key) {
                return msg.reply(
                    `⚙️ *COFRE — Configuracion*\n\n` +
                    `• *modo:* ${game.modo}\n` +
                    `  → *.cofre config modo <primero|suerte|todos>*\n` +
                    `• *prob:* ${game.prob}%\n` +
                    `  → *.cofre config prob <1-100>*\n` +
                    `• *premio:* ${game.premio} pts\n` +
                    `  → *.cofre config premio <puntos>*\n` +
                    `• *tiempo:* ${game.tiempo} min\n` +
                    `  → *.cofre config tiempo <1-1440>*\n\n` +
                    `*Modos:*\n` +
                    `• primero — ${MODO_DESC.primero}\n` +
                    `• suerte  — ${MODO_DESC.suerte}\n` +
                    `• todos   — ${MODO_DESC.todos}`
                );
            }

            if (key === 'modo') {
                if (!['primero', 'suerte', 'todos'].includes(value)) {
                    return msg.reply('Modos validos: *primero* | *suerte* | *todos*');
                }
                game.modo = value; saveDB();
                return msg.reply(`✅ Modo: *${value}*\n${MODO_DESC[value]}`);
            }
            if (key === 'prob') {
                const n = parseInt(value);
                if (isNaN(n) || n < 1 || n > 100) return msg.reply('Probabilidad entre 1 y 100.');
                game.prob = n; saveDB();
                return msg.reply(`✅ Probabilidad: *${n}%*`);
            }
            if (key === 'premio') {
                const n = parseInt(value);
                if (isNaN(n) || n < 1) return msg.reply('Premio debe ser mayor a 0.');
                game.premio = n; saveDB();
                return msg.reply(`✅ Premio: *+${n} puntos*`);
            }
            if (key === 'tiempo') {
                const n = parseInt(value);
                if (isNaN(n) || n < 1 || n > 1440) return msg.reply('Tiempo entre 1 y 1440 minutos.');
                game.tiempo = n; saveDB();
                return msg.reply(`✅ Tiempo: *${n} minutos*`);
            }

            return msg.reply('Opcion no reconocida. Usa *.cofre config* para ver opciones.');
        }

        return msg.reply(
            `Uso:\n` +
            `• *.cofre* — ver estado\n` +
            `• *.cofre abrir* — intentar abrir el cofre activo\n` +
            `• *.cofre activar* — (admin) iniciar cofre\n` +
            `• *.cofre cerrar* — (admin) cerrar cofre\n` +
            `• *.cofre config* — (admin) configurar opciones`
        );
    }
};
