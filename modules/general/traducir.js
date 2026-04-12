const https = require('https');
const { addHistoryEntry } = require('../../utils/db');

module.exports = {
    name: 'traducir',
    category: 'general',

    async execute(client, msg, args) {
        const targetLang = (args[0] || '').toLowerCase();
        const text = args.slice(1).join(' ').trim();

        if (!targetLang || !text) {
            return msg.reply('Uso: .traducir <idioma> <texto>\nEjemplos:\n• .traducir en hola mundo\n• .traducir es hello');
        }

        try {
            const result = await translateText(text, targetLang);
            const sender = msg.author || msg.from;
            addHistoryEntry(sender, 'traducir', `${text.slice(0, 40)} -> ${targetLang.toUpperCase()}`);

            return msg.reply(
                `Idioma destino: ${targetLang.toUpperCase()}\n` +
                `Original: ${text}\n` +
                `Traduccion: ${result}`
            );
        } catch (err) {
            console.error('ERROR TRADUCIR:', err);
            return msg.reply('No se pudo traducir el texto en este momento.');
        }
    }
};

function translateText(text, targetLang) {
    return new Promise((resolve, reject) => {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(targetLang)}`;
        const req = https.get(url, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const translatedText = json && json.responseData && json.responseData.translatedText;

                    if (!translatedText) {
                        return reject(new Error('Translated text not found'));
                    }

                    resolve(String(translatedText));
                } catch (parseErr) {
                    reject(parseErr);
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy(new Error('Translate request timeout'));
        });
    });
}
