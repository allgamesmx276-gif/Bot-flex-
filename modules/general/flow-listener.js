const { getDB, saveDB, logEvent } = require('../../utils/db');
const { readGroupDB, saveGroupDB } = require('../../utils/groupDb');
const { startMsgAuto } = require('../../utils/msgAuto');
const { isAdmin, hasRegisteredAdminAccess } = require('../../utils/permissions');

const DEFAULT_OFFLINE_MESSAGE = 'El Administrador que buscas contactar no se encuentra activo en este momento, espera a que vuelva a conectarse';

module.exports = {
    name: 'flow-listener',
    category: 'system',
    auto: true,
    hidden: true,

    async execute(client, msg) {
        const db = getDB();
        if (!db.offlineUsers || typeof db.offlineUsers !== 'object') {
            db.offlineUsers = {};
        }
        if (!db.afkUsers || typeof db.afkUsers !== 'object') {
            db.afkUsers = {};
        }
        const chat = await msg.getChat();
        const sender = msg.author || msg.from;
        const chatId = chat.id._serialized;
        const body = (msg.body || '').trim();
        const text = body.toLowerCase();
        const isPrivate = !chat.isGroup;
        const replyText = async message => {
            if (msg.fromMe) {
                return client.sendMessage(chatId, message);
            }

            return msg.reply(message);
        };
        const cleanupPrivateChat = async () => {
            if (!isPrivate) return;

            setTimeout(async () => {
                try {
                    await chat.clearMessages().catch(() => false);
                    await chat.delete().catch(() => false);
                } catch (err) {
                    console.error('ERROR CLEANUP PRIVATE CHAT:', err);
                }
            }, 3000);
        };

        if (!body) return;

        if (db.afkUsers[sender] && text !== '.afk') {
            delete db.afkUsers[sender];
            saveDB();
            await replyText('Ya no estas en modo AFK.');
        }

        if (db.mutedUsers[sender]) {
            if (Date.now() < db.mutedUsers[sender]) {
                await msg.delete(true).catch(() => {});
                msg._flexHandled = true;
                return;
            }

            delete db.mutedUsers[sender];
            saveDB();
        }

        // Modo offline sin prefijo: solo admins/owner.
        if (text === 'offline' || text === 'online') {
            if (!hasRegisteredAdminAccess(msg) && !await isAdmin(client, msg)) {
                msg._flexHandled = true;
                return replyText('Solo admins pueden usar offline/online.');
            }

            if (text === 'offline') {
                db.offlineUsers[sender] = {
                    message: DEFAULT_OFFLINE_MESSAGE,
                    since: Date.now()
                };
                saveDB();
                msg._flexHandled = true;
                return replyText('Modo offline activado. Responderé cuando te mencionen.');
            }

            if (db.offlineUsers[sender]) {
                delete db.offlineUsers[sender];
                saveDB();
            }

            msg._flexHandled = true;
            return replyText('El administrador se encuentra activo nuevamente.');
        }

        if (chat.isGroup && Array.isArray(msg.mentionedIds) && msg.mentionedIds.length > 0) {
            const mentionedIds = [...new Set(msg.mentionedIds)];

            for (const mentionedId of mentionedIds) {
                if (mentionedId === sender) continue;

                const offlineData = db.offlineUsers[mentionedId];

                if (offlineData && offlineData.message) {
                    await msg.reply(offlineData.message);
                    break;
                }

                const afkData = db.afkUsers[mentionedId];

                if (!afkData || !afkData.reason) continue;

                await msg.reply(`Ese usuario esta AFK: ${afkData.reason}`);
                break;
            }
        }

        if (chat.isGroup && (text === 'mejorar plan' || text === 'mejorarplan')) {
            const ownerId = db.config && db.config.ownerNumber;

            const currentPlan = (db.groupPlans && db.groupPlans[chatId]) || 'free';
            const requester = sender;
            const groupName = chat.name || chatId;
            const now = Date.now();
            const trialDays = 30;
            const trialExpiry = now + trialDays * 24 * 60 * 60 * 1000;
            const existingExpiry = db.groupPlanExpiry && db.groupPlanExpiry[chatId];

            // Do not overwrite a longer existing premium period.
            if (currentPlan === 'premium' && existingExpiry && existingExpiry > trialExpiry) {
                msg._flexHandled = true;
                return replyText('✅ Este grupo ya tiene un plan *premium* activo con mayor vigencia.');
            }

            db.groupPlans[chatId] = 'premium';
            db.groupPlanExpiry[chatId] = trialExpiry;
            saveDB();

            const expiryDate = new Date(trialExpiry).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'long', year: 'numeric'
            });

            if (ownerId) {
                await client.sendMessage(
                    ownerId,
                    `🎁 Promo activada automáticamente\n` +
                    `Grupo: ${groupName}\n` +
                    `ID: ${chatId}\n` +
                    `Plan anterior: ${currentPlan}\n` +
                    `Plan nuevo: premium (${trialDays} días)\n` +
                    `Vence: ${expiryDate}\n` +
                    `Solicitado por: ${requester}`
                ).catch(() => false);
            }

            logEvent(`PLAN_PROMO ${chatId}: ${currentPlan} -> premium (${trialDays}d), requester=${requester}`);
            msg._flexHandled = true;
            return replyText(
                `🎉 *¡Plan PREMIUM activado!*\n\n` +
                `Este grupo recibió *1 mes premium* por promo temporal.\n` +
                `📅 Vence: ${expiryDate}\n\n` +
                `Disfruten todas las funciones avanzadas 🚀`
            );
        }

        if (text === 'registrar admin') {
            if (!isPrivate) {
                msg._flexHandled = true;
                return replyText('El registro admin solo se hace por privado con el bot');
            }

            db.pendingRegister[sender] = true;
            saveDB();
            msg._flexHandled = true;
            return replyText('Ingresa clave');
        }

        if (db.pendingRegister[sender]) {
            if (!isPrivate) {
                msg._flexHandled = true;
                return replyText('Continua el registro por privado con el bot');
            }

            if (body.startsWith('.')) {
                delete db.pendingRegister[sender];
                saveDB();
                return;
            }

            if (text === 'cancelar') {
                delete db.pendingRegister[sender];
                saveDB();
                msg._flexHandled = true;
                await replyText('❌ Registro cancelado');
                await cleanupPrivateChat();
                return;
            }

            if (body !== db.config.registerKey) {
                msg._flexHandled = true;
                return replyText('Clave incorrecta\nEscribe "cancelar" para salir');
            }

            const alreadyAdmin = db.admins.includes(sender);

            if (!alreadyAdmin) {
                db.admins.push(sender);
            }

            const isNewAdmin = !alreadyAdmin;

            delete db.pendingRegister[sender];
            saveDB();
            logEvent(`ADMIN ${sender}`);

            if (isNewAdmin) {
                const ownerId = db.config && db.config.ownerNumber;

                if (ownerId && ownerId !== sender) {
                    await client.sendMessage(
                        ownerId,
                        `🔔 Nuevo admin registrado\nUsuario: ${sender}\nPlan asignado: ${(db.adminPlans && db.adminPlans[sender]) || 'ninguno (free)'}\n\nPara asignar plan:\n.setadminplan ${sender} basic`
                    ).catch(() => false);
                }
            }

            msg._flexHandled = true;
            await replyText('✅ Registrado');
            await cleanupPrivateChat();
            return;
        }

        // ── COFRE: flujo desde privado para campaña aleatoria ───────────────────
        if (isPrivate && db.awaiting[sender] && !body.startsWith('.') &&
            typeof db.awaiting[sender].step === 'string' &&
            db.awaiting[sender].step.startsWith('cofre_')) {

            const state = db.awaiting[sender];

            if (text === 'cancelar') {
                delete db.awaiting[sender];
                saveDB();
                msg._flexHandled = true;
                return msg.reply('❌ Cancelado');
            }

            const randomDelayMinutes = () => {
                const min = Math.max(1, Number(state.minMinutes) || 1);
                const max = Math.max(min, Number(state.maxMinutes) || min);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            };

            const parseDurationToMinutes = input => {
                const raw = String(input || '').trim().toLowerCase();
                if (!raw) return NaN;

                const compact = raw
                    .replace(/\s+/g, '')
                    .replace(/minutos?|mins?/g, 'm')
                    .replace(/horas?|hrs?/g, 'h');

                const match = compact.match(/^(\d+)([mh])?$/);
                if (!match) return NaN;

                const value = parseInt(match[1], 10);
                const unit = match[2] || 'm';
                return unit === 'h' ? value * 60 : value;
            };

            const formatMinutes = minutes => {
                const n = Math.max(1, Number(minutes) || 1);
                if (n % 60 === 0) {
                    const h = n / 60;
                    return `${h} ${h === 1 ? 'hora' : 'horas'}`;
                }
                return `${n} ${n === 1 ? 'minuto' : 'minutos'}`;
            };

            const normalizePrizeLabel = input => {
                const raw = String(input || '').trim();
                if (!raw) return '';

                if (/^\d+$/.test(raw)) {
                    return `${raw} puntos`;
                }

                return raw;
            };

            const finishCampaign = () => {
                if (!db.cofreGames || typeof db.cofreGames !== 'object') {
                    db.cofreGames = {};
                }

                const firstDelay = randomDelayMinutes();
                db.cofreGames[state.chatId] = {
                    enabled: true,
                    chatName: state.chatName,
                    owner: sender,
                    config: {
                        keyword: state.keyword,
                        totalDrops: state.totalDrops,
                        minMinutes: state.minMinutes,
                        maxMinutes: state.maxMinutes
                    },
                    prizes: state.prizes,
                    progress: {
                        sent: 0,
                        claimed: 0
                    },
                    nextAt: Date.now() + firstDelay * 60 * 1000,
                    activeDrop: null,
                    createdAt: Date.now()
                };

                delete db.awaiting[sender];
                saveDB();

                client.sendMessage(
                    state.chatId,
                    `📢 *Se creó una campaña de cofres*\n\n` +
                    `• Cofres programados: *${state.totalDrops}*\n` +
                    `• Aparición: *aleatoria* entre ${formatMinutes(state.minMinutes)} y ${formatMinutes(state.maxMinutes)}\n` +
                    `• Palabra para reclamar: *cofre ${state.keyword}*\n\n` +
                    `Cuando veas un cofre, escribe esa frase exacta para intentar ganarlo.`
                ).catch(() => {});

                return msg.reply(
                    `✅ Campaña de cofres programada en *${state.chatName}*\n\n` +
                    `• Cofres: ${state.totalDrops}\n` +
                    `• Palabra: ${state.keyword}\n` +
                    `• Intervalo aleatorio: ${formatMinutes(state.minMinutes)} a ${formatMinutes(state.maxMinutes)}\n` +
                    `• Primer cofre en aprox: ${formatMinutes(firstDelay)}`
                );
            };

            if (state.step === 'cofre_elegir_grupo') {
                const n = parseInt(text, 10);
                if (isNaN(n) || n < 1 || n > state.grupos.length) {
                    msg._flexHandled = true;
                    return msg.reply(`Elige un número entre 1 y ${state.grupos.length}.`);
                }

                const grupo = state.grupos[n - 1];
                state.chatId = grupo.id;
                state.chatName = grupo.name;
                state.step = 'cofre_cantidad';
                saveDB();
                msg._flexHandled = true;
                return msg.reply(
                    `🎁 Grupo: *${grupo.name}*\n\n` +
                    '1/6 ¿Cuántos cofres quieres programar?\n' +
                    'Ejemplo: 5'
                );
            }

            if (state.step === 'cofre_cantidad') {
                const n = parseInt(text, 10);
                if (isNaN(n) || n < 1 || n > 100) {
                    msg._flexHandled = true;
                    return msg.reply('Cantidad inválida. Debe ser entre 1 y 100.');
                }

                state.totalDrops = n;
                state.step = 'cofre_min_tiempo';
                saveDB();
                msg._flexHandled = true;
                return msg.reply('2/6 Tiempo mínimo entre cofres. Ejemplo: 10 minutos o 1h');
            }

            if (state.step === 'cofre_min_tiempo') {
                const n = parseDurationToMinutes(body);
                if (isNaN(n) || n < 1 || n > 1440) {
                    msg._flexHandled = true;
                    return msg.reply('Tiempo mínimo inválido. Usa minutos u horas (ej: 10 minutos, 30m, 3 horas). Rango: 1 min a 24h.');
                }

                state.minMinutes = n;
                state.step = 'cofre_max_tiempo';
                saveDB();
                msg._flexHandled = true;
                return msg.reply(`3/6 Tiempo máximo entre cofres (>= ${formatMinutes(n)}). Ejemplo: 3 horas`);
            }

            if (state.step === 'cofre_max_tiempo') {
                const n = parseDurationToMinutes(body);
                if (isNaN(n) || n < state.minMinutes || n > 10080) {
                    msg._flexHandled = true;
                    return msg.reply(`Tiempo máximo inválido. Debe ser mayor o igual a ${formatMinutes(state.minMinutes)} y hasta 7 días.`);
                }

                state.maxMinutes = n;
                state.step = 'cofre_keyword';
                saveDB();
                msg._flexHandled = true;
                return msg.reply('4/6 Escribe la palabra clave del cofre (ej: oro).\nSe usará así: *cofre oro*');
            }

            if (state.step === 'cofre_keyword') {
                const keyword = String(text || '').trim().toLowerCase();
                if (!/^[a-z0-9_-]{2,20}$/.test(keyword)) {
                    msg._flexHandled = true;
                    return msg.reply('Palabra inválida. Usa 2-20 caracteres: letras, números, guion o guion bajo.');
                }

                state.keyword = keyword;
                state.step = 'cofre_premio_modo';
                saveDB();
                msg._flexHandled = true;
                return msg.reply(
                    '5/6 ¿Premio único o varios premios?\n' +
                    'Responde: *1* (mismo premio para todos) o *varios* (uno por cofre).'
                );
            }

            if (state.step === 'cofre_premio_modo') {
                if (text === '1') {
                    state.step = 'cofre_premio_unico';
                    saveDB();
                    msg._flexHandled = true;
                    return msg.reply('6/6 Escribe el premio único (texto). Ejemplo: Nitro, VIP 1 día, 50 puntos');
                }

                if (text === 'varios') {
                    state.prizeIndex = 0;
                    state.prizes = [];
                    state.step = 'cofre_premio_item';
                    saveDB();
                    msg._flexHandled = true;
                    return msg.reply(`6/6 Premio del cofre #1 (texto) de ${state.totalDrops}.`);
                }

                msg._flexHandled = true;
                return msg.reply('Responde *1* o *varios*.');
            }

            if (state.step === 'cofre_premio_unico') {
                const label = normalizePrizeLabel(body);
                if (!label) {
                    msg._flexHandled = true;
                    return msg.reply('Premio inválido. Escribe una palabra o frase corta.');
                }

                state.prizes = new Array(state.totalDrops).fill(label);
                msg._flexHandled = true;
                return finishCampaign();
            }

            if (state.step === 'cofre_premio_item') {
                const label = normalizePrizeLabel(body);
                if (!label) {
                    msg._flexHandled = true;
                    return msg.reply('Premio inválido. Escribe una palabra o frase corta.');
                }

                state.prizes.push(label);
                state.prizeIndex += 1;

                if (state.prizeIndex >= state.totalDrops) {
                    msg._flexHandled = true;
                    return finishCampaign();
                }

                saveDB();
                msg._flexHandled = true;
                return msg.reply(`Premio del cofre #${state.prizeIndex + 1} (texto) de ${state.totalDrops}.`);
            }
        }

        if (db.awaiting[sender] && !body.startsWith('.') && db.awaiting[sender].chatId === chatId) {
            const state = db.awaiting[sender];

            if (text === 'cancelar') {
                delete db.awaiting[sender];
                saveDB();
                msg._flexHandled = true;
                return msg.reply('❌ Cancelado');
            }

            if (state.step === 'word') {
                state.word = text;
                state.step = 'response';
                saveDB();
                msg._flexHandled = true;
                return msg.reply('✨ Envia la respuesta');
            }

            if (state.step === 'setplan_days') {
                const days = parseInt(body, 10);

                if (isNaN(days) || days < 0) {
                    msg._flexHandled = true;
                    return msg.reply('❌ Ingresa un número válido de días (mínimo 1, o 0 para sin expiración).');
                }

                const { normalizePlan } = require('../../utils/planAccess');
                const { logEvent } = require('../../utils/db');
                const { auditAction } = require('../../utils/audit');

                const targetChatId = state.chatId;
                const plan = state.plan;
                const previousPlan = normalizePlan(db.groupPlans[targetChatId]) || 'free';
                db.groupPlans[targetChatId] = plan;
                delete db.awaiting[sender];

                let replyText;
                if (days === 0) {
                    delete db.groupPlanExpiry[targetChatId];
                    logEvent(`PLAN ${targetChatId}: ${previousPlan} -> ${plan} (sin expiración)`);
                    auditAction({ author: sender, from: sender }, 'SET_GROUP_PLAN', {
                        chatId: targetChatId, previousPlan, newPlan: plan, expiry: 'never'
                    });
                    replyText = `✅ Plan *${plan}* activado *sin expiración*\n🆔 Grupo: ${targetChatId}`;
                } else {
                    const expiryMs = Date.now() + days * 24 * 60 * 60 * 1000;
                    const expiryDate = new Date(expiryMs).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'long', year: 'numeric'
                    });
                    db.groupPlanExpiry[targetChatId] = expiryMs;
                    logEvent(`PLAN ${targetChatId}: ${previousPlan} -> ${plan} expira ${expiryDate}`);
                    auditAction({ author: sender, from: sender }, 'SET_GROUP_PLAN', {
                        chatId: targetChatId, previousPlan, newPlan: plan, expiryDate
                    });
                    replyText = `✅ Plan *${plan}* activado por *${days} día(s)*\n📅 Vence: ${expiryDate}\n🆔 Grupo: ${targetChatId}`;
                }

                saveDB();
                msg._flexHandled = true;
                return msg.reply(replyText);
            }

            if (state.step === 'response') {
                const targetChatId = state.chatId || chatId;
                const groupDb = readGroupDB(targetChatId);

                groupDb.autoResponses.push({
                    trigger: state.word,
                    response: body
                });

                saveGroupDB(targetChatId, groupDb);
                delete db.awaiting[sender];
                saveDB();
                msg._flexHandled = true;
                return msg.reply('✅ Guardado');
            }

            if (state.step === 'msgauto_text') {
                state.text = body;
                state.step = 'msgauto_time';
                saveDB();
                msg._flexHandled = true;
                return msg.reply('⏱ Envia tiempo (ej: 10s, 5m, 1h)');
            }

            if (state.step === 'msgauto_time') {
                const num = parseInt(text, 10);

                if (isNaN(num)) {
                    msg._flexHandled = true;
                    return msg.reply('❌ Tiempo invalido');
                }

                let ms = 0;
                if (text.endsWith('s')) ms = num * 1000;
                if (text.endsWith('m')) ms = num * 60000;
                if (text.endsWith('h')) ms = num * 3600000;

                if (!ms) {
                    msg._flexHandled = true;
                    return msg.reply('❌ Tiempo invalido');
                }

                const targetChatId = state.chatId || chatId;
                const groupDb = readGroupDB(targetChatId);

                groupDb.msgAuto.push({
                    text: state.text,
                    time: ms
                });

                saveGroupDB(targetChatId, groupDb);
                delete db.awaiting[sender];
                saveDB();
                startMsgAuto(client, targetChatId);

                msg._flexHandled = true;
                return msg.reply('✅ MsgAuto agregado');
            }

            if (state.step === 'poll_sorteo_prize') {
                state.prize = body;
                state.question = `Sorteo: ${body}`;
                state.step = 'poll_sorteo_option';
                saveDB();
                msg._flexHandled = true;
                return msg.reply('2) Envia la primera opcion del sorteo.');
            }

            if (state.step === 'poll_sorteo_option') {
                if (!Array.isArray(state.options)) {
                    state.options = [];
                }

                state.options.push(body);

                if (state.options.length >= 10) {
                    if (!db.polls || typeof db.polls !== 'object') {
                        db.polls = {};
                    }

                    const targetChatId = state.chatId || chatId;
                    db.polls[targetChatId] = {
                        question: state.question,
                        options: state.options.slice(0, 10),
                        votes: {},
                        createdAt: Date.now(),
                        prize: state.prize,
                        mode: 'sorteo'
                    };

                    delete db.awaiting[sender];
                    saveDB();

                    const lines = [
                        'SORTEO INICIADO',
                        '',
                        `Premio: ${state.prize}`,
                        `Pregunta: ${state.question}`,
                        ''
                    ];

                    state.options.slice(0, 10).forEach((option, index) => {
                        lines.push(`${index + 1}. ${option}`);
                    });

                    lines.push('');
                    lines.push('Vota con: .encuesta votar <numero> o enviando solo el numero');
                    lines.push('Ganador provisional: Sin votos aun');

                    msg._flexHandled = true;
                    return msg.reply(lines.join('\n'));
                }

                if (state.options.length < 2) {
                    state.step = 'poll_sorteo_option';
                    saveDB();
                    msg._flexHandled = true;
                    return msg.reply('Envia otra opcion (minimo 2 opciones).');
                }

                state.step = 'poll_sorteo_more_confirm';
                saveDB();
                msg._flexHandled = true;
                return msg.reply('Quieres anadir otra opcion? (si/no)');
            }

            if (state.step === 'poll_sorteo_more_confirm') {
                if (text === 'si' || text === 's') {
                    state.step = 'poll_sorteo_option';
                    saveDB();
                    msg._flexHandled = true;
                    return msg.reply('Envia la siguiente opcion.');
                }

                if (text === 'no' || text === 'n') {
                    if (!Array.isArray(state.options) || state.options.length < 2) {
                        state.step = 'poll_sorteo_option';
                        saveDB();
                        msg._flexHandled = true;
                        return msg.reply('Necesitas al menos 2 opciones. Envia otra opcion.');
                    }

                    if (!db.polls || typeof db.polls !== 'object') {
                        db.polls = {};
                    }

                    const targetChatId = state.chatId || chatId;
                    db.polls[targetChatId] = {
                        question: state.question,
                        options: state.options.slice(0, 10),
                        votes: {},
                        createdAt: Date.now(),
                        prize: state.prize,
                        mode: 'sorteo'
                    };

                    delete db.awaiting[sender];
                    saveDB();

                    const lines = [
                        'SORTEO INICIADO',
                        '',
                        `Premio: ${state.prize}`,
                        `Pregunta: ${state.question}`,
                        ''
                    ];

                    state.options.slice(0, 10).forEach((option, index) => {
                        lines.push(`${index + 1}. ${option}`);
                    });

                    lines.push('');
                    lines.push('Vota con: .encuesta votar <numero> o enviando solo el numero');
                    lines.push('Ganador provisional: Sin votos aun');

                    msg._flexHandled = true;
                    return msg.reply(lines.join('\n'));
                }

                msg._flexHandled = true;
                return msg.reply('Responde con "si" o "no".');
            }
        }

        // Voto rapido: si hay encuesta activa, permite votar enviando solo el numero.
        if (!body.startsWith('.') && db.polls && db.polls[chatId]) {
            const poll = db.polls[chatId];
            const optionNumber = Number(body);

            if (Number.isInteger(optionNumber)) {
                const optionIndex = optionNumber - 1;

                if (optionIndex < 0 || optionIndex >= poll.options.length) {
                    msg._flexHandled = true;
                    return msg.reply(`Opcion invalida. Elige entre 1 y ${poll.options.length}.`);
                }

                if (Object.prototype.hasOwnProperty.call(poll.votes || {}, sender)) {
                    msg._flexHandled = true;
                    return msg.reply('Ya registraste tu voto. Solo se permite 1 voto por usuario.');
                }

                poll.votes[sender] = optionIndex;
                const uniqueVoters = Object.keys(poll.votes || {}).length;
                const counts = new Array(poll.options.length).fill(0);

                Object.values(poll.votes || {}).forEach(v => {
                    if (Number.isInteger(v) && v >= 0 && v < counts.length) {
                        counts[v] += 1;
                    }
                });

                if (Number.isInteger(poll.maxVotes) && poll.maxVotes > 0 && uniqueVoters >= poll.maxVotes) {
                    const total = counts.reduce((a, b) => a + b, 0);
                    const lines = [
                        `Se alcanzo el limite de ${poll.maxVotes} votantes. Encuesta cerrada automaticamente.`,
                        '',
                        `Pregunta: ${poll.question}`,
                        ''
                    ];

                    poll.options.forEach((option, idx) => {
                        const votes = counts[idx];
                        const pct = total > 0 ? ((votes * 100) / total).toFixed(1) : '0.0';
                        lines.push(`${idx + 1}. ${option} - ${votes} voto(s) (${pct}%)`);
                    });

                    lines.push('');
                    lines.push(`Total de votos: ${total}`);

                    delete db.polls[chatId];
                    saveDB();
                    msg._flexHandled = true;
                    return msg.reply(lines.join('\n'));
                }

                saveDB();

                const lines = [
                    'Voto registrado.',
                    '',
                    `Pregunta: ${poll.question}`,
                    ''
                ];

                poll.options.forEach((option, idx) => {
                    lines.push(`${idx + 1}. ${option} - ${counts[idx]} voto(s)`);
                });

                if (Number.isInteger(poll.maxVotes) && poll.maxVotes > 0) {
                    lines.push('');
                    lines.push(`Votantes: ${uniqueVoters}/${poll.maxVotes}`);
                }

                msg._flexHandled = true;
                return msg.reply(lines.join('\n'));
            }
        }

        if (chat.isGroup) {
            const groupDb = readGroupDB(chatId);

            if (groupDb.autoResponderEnabled) {
                const match = groupDb.autoResponses.find(item =>
                    text === String(item.trigger || '').trim().toLowerCase()
                );

                if (match) {
                    msg._flexHandled = true;
                    return msg.reply(match.response);
                }
            }
        }
    }
};
