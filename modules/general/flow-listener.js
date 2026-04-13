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

                if (isNaN(days) || days < 1) {
                    msg._flexHandled = true;
                    return msg.reply('❌ Ingresa un número válido de días (mínimo 1).');
                }

                const { normalizePlan } = require('../../utils/planAccess');
                const { logEvent } = require('../../utils/db');
                const { auditAction } = require('../../utils/audit');

                const targetChatId = state.chatId;
                const plan = state.plan;
                const expiryMs = Date.now() + days * 24 * 60 * 60 * 1000;
                const expiryDate = new Date(expiryMs).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'long', year: 'numeric'
                });

                const previousPlan = normalizePlan(db.groupPlans[targetChatId]) || 'free';
                db.groupPlans[targetChatId] = plan;
                db.groupPlanExpiry[targetChatId] = expiryMs;
                delete db.awaiting[sender];
                saveDB();
                logEvent(`PLAN ${targetChatId}: ${previousPlan} -> ${plan} expira ${expiryDate}`);
                auditAction({ author: sender, from: sender }, 'SET_GROUP_PLAN', {
                    chatId: targetChatId, previousPlan, newPlan: plan, expiryDate
                });

                msg._flexHandled = true;
                return msg.reply(
                    `✅ Plan *${plan}* activado por *${days} día(s)*\n` +
                    `📅 Vence: ${expiryDate}\n` +
                    `🆔 Grupo: ${targetChatId}`
                );
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
                    text.includes(item.trigger.toLowerCase())
                );

                if (match) {
                    msg._flexHandled = true;
                    return msg.reply(match.response);
                }
            }
        }
    }
};
