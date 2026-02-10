import React from 'react';
import { Cloud, CloudRain, Sun, Wind, Thermometer, CloudSnow } from 'lucide-react';

const weatherCodeMap = {
  0: { label: 'Clear sky', Icon: Sun },
  1: { label: 'Mainly clear', Icon: Sun },
  2: { label: 'Partly cloudy', Icon: Cloud },
  3: { label: 'Overcast', Icon: Cloud },
  45: { label: 'Foggy', Icon: Cloud },
  48: { label: 'Depositing rime fog', Icon: Cloud },
  51: { label: 'Light drizzle', Icon: CloudRain },
  53: { label: 'Moderate drizzle', Icon: CloudRain },
  55: { label: 'Dense drizzle', Icon: CloudRain },
  61: { label: 'Slight rain', Icon: CloudRain },
  63: { label: 'Moderate rain', Icon: CloudRain },
  65: { label: 'Heavy rain', Icon: CloudRain },
  71: { label: 'Slight snowfall', Icon: CloudSnow },
  73: { label: 'Moderate snowfall', Icon: CloudSnow },
  75: { label: 'Heavy snowfall', Icon: CloudSnow },
  80: { label: 'Slight showers', Icon: CloudRain },
  81: { label: 'Moderate showers', Icon: CloudRain },
  82: { label: 'Violent showers', Icon: CloudRain },
  95: { label: 'Thunderstorm', Icon: CloudRain },
};

export default function WeatherCard({ weather }) {
  if (!weather) return null;

  const code = weather.weathercode?.[0] ?? 0;
  const info = weatherCodeMap[code] || { label: 'Unknown', Icon: Cloud };
  const WeatherIcon = info.Icon;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm" data-testid="weather-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-ocean-50 rounded-xl flex items-center justify-center">
          <WeatherIcon className="w-6 h-6 text-ocean-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Weather</p>
          <p className="text-lg font-bold text-primary">{info.label}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-accent" />
          <div>
            <p className="text-xs text-stone-400">Temp</p>
            <p className="text-sm font-mono font-bold">
              {weather.temperature_2m_min?.[0]}° - {weather.temperature_2m_max?.[0]}°C
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-xs text-stone-400">Rain</p>
            <p className="text-sm font-mono font-bold">{weather.precipitation_sum?.[0]}mm</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-stone-500" />
          <div>
            <p className="text-xs text-stone-400">Wind</p>
            <p className="text-sm font-mono font-bold">{weather.windspeed_10m_max?.[0]}km/h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
