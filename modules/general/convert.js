const https = require('https');
const { addHistoryEntry } = require('../../utils/db');

const HELP_TEXT = [
    'Uso: .convert <monto> <origen> <destino>',
    'Ejemplos:',
    '• .convert 100 usd mxn',
    '• .convert 100 mxn usd',
    '• .convert 50 eur usd',
    'Tip: .convert 0.6  (atajo USD -> MXN)',
    'Ver monedas ejemplo: .convert list'
].join('\n');

module.exports = {
    name: 'convert',
    category: 'general',

    async execute(client, msg, args) {
        if (!args.length) {
            return msg.reply(HELP_TEXT);
        }

        const action = (args[0] || '').toLowerCase();

        if (action === 'help' || action === 'ayuda') {
            return msg.reply(HELP_TEXT);
        }

        if (action === 'list' || action === 'monedas') {
            return msg.reply('Monedas ejemplo: USD, MXN, EUR, GBP, JPY, CAD, BRL, ARS, COP, CLP\n\n' + HELP_TEXT);
        }

        const rawAmount = (args[0] || '').replace(',', '.').trim();
        const amount = Number(rawAmount);

        if (!rawAmount || Number.isNaN(amount) || amount <= 0) {
            return msg.reply(HELP_TEXT);
        }

        const from = (args[1] || 'USD').toUpperCase();
        const to = (args[2] || 'MXN').toUpperCase();

        try {
            const rates = await getRatesFromUsd();
            const fromRate = from === 'USD' ? 1 : rates[from];
            const toRate = to === 'USD' ? 1 : rates[to];

            if (!fromRate || !toRate) {
                return msg.reply('Moneda no soportada. Usa .convert list para ver ejemplos.');
            }

            const amountInUsd = amount / Number(fromRate);
            const converted = amountInUsd * Number(toRate);
            const pairRate = Number(toRate) / Number(fromRate);
            const sender = msg.author || msg.from;
            addHistoryEntry(sender, 'convert', `${from} ${amount} -> ${to} ${converted.toFixed(2)}`);

            return msg.reply(
                `${from} ${amount} = ${to} ${converted.toFixed(2)}\n` +
                `Tasa actual: 1 ${from} = ${pairRate.toFixed(6)} ${to}`
            );
        } catch (err) {
            console.error('Error convert:', err);
            return msg.reply('No pude obtener la tasa de cambio en este momento.');
        }
    }
};

function getRatesFromUsd() {
    return new Promise((resolve, reject) => {
        const req = https.get('https://open.er-api.com/v6/latest/USD', (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const rates = json && json.rates;

                    if (!rates || typeof rates !== 'object') {
                        return reject(new Error('Rates not found'));
                    }

                    resolve(rates);
                } catch (parseErr) {
                    reject(parseErr);
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(7000, () => {
            req.destroy(new Error('Exchange rate request timeout'));
        });
    });
}
