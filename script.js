// Replace with your OpenWeather API key
const API_KEY = '6a633594926b717a091cc517098a2e50';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

async function getForecast(city) {
    const response = await fetch(`${FORECAST_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=en`);
    if (!response.ok) {
        throw new Error(`Forecast HTTP error! status: ${response.status}`);
    }
    return response.json();
}

function summarizeTodayTomorrow(forecastData) {
    const now = new Date();
    const todayStamp = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStamp = tomorrow.toISOString().split('T')[0];

    const days = {
        [todayStamp]: {min: Infinity, max: -Infinity, pop: 0, conditions: []},
        [tomorrowStamp]: {min: Infinity, max: -Infinity, pop: 0, conditions: []}
    };

    (forecastData.list || []).forEach(item => {
        const dateKey = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!days[dateKey]) return;

        const temp = item.main?.temp;
        if (typeof temp === 'number') {
            days[dateKey].min = Math.min(days[dateKey].min, temp);
            days[dateKey].max = Math.max(days[dateKey].max, temp);
        }
        const pop = item.pop || 0;
        days[dateKey].pop = Math.max(days[dateKey].pop, pop);
        const desc = item.weather?.[0]?.description;
        if (desc) days[dateKey].conditions.push(desc);
    });

    const formatDay = dayKey => {
        const d = days[dayKey];
        if (!d || d.min === Infinity) {
            return `<p><strong>${dayKey}:</strong> no data</p>`;
        }
        const most = d.conditions.reduce((a,b)=>(d.conditions.filter(x=>x===a).length>=d.conditions.filter(x=>x===b).length?a:b), d.conditions[0] || 'N/A');
        return `<p><strong>${dayKey}:</strong> ${most ? most.charAt(0).toUpperCase() + most.slice(1) : 'N/A'} | min ${d.min.toFixed(1)}°C | max ${d.max.toFixed(1)}°C | pop ${(d.pop*100).toFixed(0)}%</p>`;
    };

    return `
        <div class="forecast-box">
            <h3>Today & Tomorrow forecast</h3>
            ${formatDay(todayStamp)}
            ${formatDay(tomorrowStamp)}
        </div>
    `;
}

async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) {
        alert('Please enter a city name.');
        return;
    }

    const resultDiv = document.getElementById('weatherResult');
    resultDiv.innerHTML = 'Loading...';

    try {
        const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=en`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const forecastData = await getForecast(city);
        displayWeather(data, forecastData);
    } catch (error) {
        document.body.className = 'default';
        resultDiv.innerHTML = `Error: ${error.message}`;
    }
}

function getTimePeriod() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'morning';
    if (hour >= 10 && hour < 14) return 'noon';
    if (hour >= 14 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'night';
}

function displayWeather(data, forecastData) {
    const main = data.main || {};
    const weather = data.weather && data.weather[0] || {};

    // Set background based on weather condition and time of day
    const condition = weather.main ? weather.main.toLowerCase() : 'default';
    let bgClass = 'default';
    if (condition === 'clear') bgClass = 'sunny';
    else if (condition === 'clouds' || condition === 'mist' || condition === 'haze' || condition === 'fog' || condition === 'smoke') bgClass = 'cloudy';
    else if (condition === 'rain' || condition === 'drizzle' || condition === 'shower rain') bgClass = 'rainy';
    else if (condition === 'snow') bgClass = 'snowy';
    else if (condition === 'thunderstorm') bgClass = 'thunderstorm';
    else if (condition === 'tornado' || condition === 'squall') bgClass = 'storm';

    const timePeriod = getTimePeriod();
    document.body.className = `${timePeriod} ${bgClass}`;

    const forecastHtml = forecastData ? summarizeTodayTomorrow(forecastData) : '<p>No forecast available</p>';

    const iconUrl = weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : '';

    const html = `
        <div class="weather-header">
            <img src="${iconUrl}" alt="${weather.description}" class="weather-icon">
            <div>
                <h2>Weather for ${data.name || 'Unknown'}</h2>
                <p class="weather-desc">${weather.description ? weather.description.charAt(0).toUpperCase() + weather.description.slice(1) : 'N/A'}</p>
            </div>
        </div>
        <div class="weather-details">
            <div class="detail-item">
                <span class="label">Temperature:</span>
                <span class="value">${main.temp !== undefined ? main.temp + '°C' : 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="label">Feels like:</span>
                <span class="value">${main.feels_like !== undefined ? main.feels_like + '°C' : 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="label">Humidity:</span>
                <span class="value">${main.humidity !== undefined ? main.humidity + '%' : 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="label">Pressure:</span>
                <span class="value">${main.pressure !== undefined ? main.pressure + ' hPa' : 'N/A'}</span>
            </div>
        </div>
        ${forecastHtml}
    `;
    document.getElementById('weatherResult').innerHTML = html;
}