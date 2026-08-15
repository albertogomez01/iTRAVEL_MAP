export interface CityWeather {
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  emoji: string;
  condition: string;
}

const weatherCache = new Map<string, CityWeather>();

const getCacheKey = (lat: number, lng: number): string => {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
};

export const fetchCityWeather = async (lat: number, lng: number): Promise<CityWeather | null> => {
  const key = getCacheKey(lat, lng);

  // 1. Memory cache check
  if (weatherCache.has(key)) {
    return weatherCache.get(key)!;
  }

  // 2. LocalStorage cache check
  try {
    const cachedStr = localStorage.getItem(`weather_${key}`);
    if (cachedStr) {
      const { data, timestamp } = JSON.parse(cachedStr);
      // Cache valid for 3 hours
      if (Date.now() - timestamp < 3 * 60 * 60 * 1000) {
        weatherCache.set(key, data);
        return data;
      }
    }
  } catch (e) {}

  // 3. Open-Meteo API Fetch
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.daily && data.daily.temperature_2m_max) {
      const max = Math.round(data.daily.temperature_2m_max[0]);
      const min = Math.round(data.daily.temperature_2m_min[0]);
      const code = data.daily.weathercode[0];
      const { emoji, label } = getWeatherEmoji(code);

      const result: CityWeather = {
        tempMax: max,
        tempMin: min,
        weatherCode: code,
        emoji,
        condition: label
      };

      weatherCache.set(key, result);
      try {
        localStorage.setItem(`weather_${key}`, JSON.stringify({ data: result, timestamp: Date.now() }));
      } catch (e) {}

      return result;
    }
  } catch (e) {
    console.warn("No se pudo obtener el clima de Open-Meteo:", e);
  }

  return null;
};

export const getWeatherEmoji = (code: number): { emoji: string; label: string } => {
  if (code === 0) return { emoji: '☀️', label: 'Soleado' };
  if (code >= 1 && code <= 3) return { emoji: '🌤️', label: 'Nublado' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: 'Niebla' };
  if (code >= 51 && code <= 67) return { emoji: '🌧️', label: 'Lluvia' };
  if (code >= 71 && code <= 77) return { emoji: '❄️', label: 'Nieve' };
  if (code >= 80 && code <= 82) return { emoji: '🌦️', label: 'Chubascos' };
  if (code >= 95 && code <= 99) return { emoji: '🌩️', label: 'Tormenta' };
  return { emoji: '🌡️', label: 'Templado' };
};
