const https = require('https');
const { addHistoryEntry } = require('../../utils/db');

const WMO_CODES = {
    0: 'Despejado', 1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla con escarcha',
    51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
    61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
    71: 'Nieve ligera', 73: 'Nieve moderada', 75: 'Nieve intensa',
    80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos',
    95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo intenso'
};

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
                `☁️ Clima en ${weather.area}, ${weather.country}:\n` +
                `🌡️ Temperatura: ${weather.tempC}°C (sensación ${weather.feelsLikeC}°C)\n` +
                `🌤️ Estado: ${weather.description}\n` +
                `💧 Humedad: ${weather.humidity}%\n` +
                `💨 Viento: ${weather.windKmph} km/h\n` +
                `🌧️ Precipitación: ${weather.precipitation} mm`
            );
        } catch (err) {
            console.error('ERROR CLIMA:', err.message);
            return msg.reply('No pude consultar el clima. Verifica el nombre de la ciudad.');
        }
    }
};

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => req.destroy(new Error('Timeout')));
    });
}

async function getWeather(city) {
    // 1. Geocoding: buscar coordenadas de la ciudad
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
    const geoData = await httpsGet(geoUrl);

    if (!geoData.results || !geoData.results.length) {
        throw new Error('Ciudad no encontrada');
    }

    const location = geoData.results[0];
    const { latitude, longitude, name, country } = location;

    // 2. Clima actual con Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&wind_speed_unit=kmh&timezone=auto`;
    const weatherData = await httpsGet(weatherUrl);

    const c = weatherData.current;

    return {
        area: name,
        country: country || '',
        tempC: c.temperature_2m,
        feelsLikeC: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        windKmph: c.wind_speed_10m,
        precipitation: c.precipitation,
        description: WMO_CODES[c.weather_code] || `Código ${c.weather_code}`
    };
}

