const https = require('https');
const { addHistoryEntry } = require('../../utils/db');

module.exports = {
    name: 'clima',
    category: 'general',

    async execute(client, msg, args) {
        const city = args.join(' ').trim();

        if (!city) {
            return msg.reply('Uso: .clima <ciudad>\nEjemplo: .clima Monterrey');
        }

        try {
            const weather = await getWeather(city);
            const sender = msg.author || msg.from;
            addHistoryEntry(sender, 'clima', `${weather.area} ${weather.tempC}C ${weather.description}`);

            return msg.reply(
                `Clima en ${weather.area}:\n` +
                `Temperatura: ${weather.tempC} C\n` +
                `Sensacion: ${weather.feelsLikeC} C\n` +
                `Estado: ${weather.description}\n` +
                `Humedad: ${weather.humidity}%\n` +
                `Viento: ${weather.windKmph} km/h`
            );
        } catch (err) {
            console.error('ERROR CLIMA:', err);
            return msg.reply('No pude consultar el clima en este momento.');
        }
    }
};

function getWeather(city) {
    return new Promise((resolve, reject) => {
        const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
        const req = https.get(url, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const current = json && json.current_condition && json.current_condition[0];
                    const nearest = json && json.nearest_area && json.nearest_area[0];
                    const area = nearest && nearest.areaName && nearest.areaName[0] && nearest.areaName[0].value;
                    const description = current && current.weatherDesc && current.weatherDesc[0] && current.weatherDesc[0].value;

                    if (!current || !area || !description) {
                        return reject(new Error('Weather data not found'));
                    }

                    resolve({
                        area,
                        tempC: current.temp_C,
                        feelsLikeC: current.FeelsLikeC,
                        description,
                        humidity: current.humidity,
                        windKmph: current.windspeedKmph
                    });
                } catch (parseErr) {
                    reject(parseErr);
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy(new Error('Weather request timeout'));
        });
    });
}
