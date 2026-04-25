module.exports = {
    name: 'prueba-intro',
    category: 'system',
    auto: true,
    hidden: true,

    async execute(client, msg) {
        if (!msg.body) return;
        if (msg.fromMe) return;

        // Verificar si es un chat privado (no termina en @g.us)
        const isPrivate = !msg.from.endsWith('@g.us');
        if (!isPrivate) return;

        const text = msg.body.trim().toLowerCase();
        
        // Coincidencia exacta o que contenga la frase clave
        if (text === 'hola quiero probar el bot' || text.includes('hola quiero probar el bot')) {
            try {
                const chatId = '120363406979829868@g.us';
                let inviteLink = ''; 
                
                try {
                    const chat = await client.getChatById(chatId);
                    const code = await chat.getInviteCode();
                    inviteLink = `https://chat.whatsapp.com/${code}`;
                } catch (e) {
                    console.log('Error obteniendo link de invitación:', e.message);
                    // Si no es admin o falla, devolvemos un mensaje pidiendo que lo agregue
                    inviteLink = '(Pídele al admin que me haga administrador en el grupo de pruebas para generar el enlace automático)';
                }

                await msg.reply(
                    `👋 ¡Hola! Qué bueno que quieras probar el bot.\n\n` +
                    `Puedes unirte al grupo de pruebas aquí:\n${inviteLink}\n\n` +
                    `Ahí podrás probar los comandos y las respuestas automáticas configuradas anteriormente.`
                );
                
                msg._flexHandled = true;
            } catch (err) {
                console.error('ERROR EN PRUEBA-INTRO:', err);
            }
        }
    }
};
