const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_WEATHER") {
      this.fetchWeather(payload);
    }
  },

  async fetchWeather(config) {
    const { location, units } = config;

    if (!location) {
      this.sendError("Location required");
      return;
    }

    try {
      const coordinates = await this.lookupLocation(location);
      const weather = await this.fetchForecast(coordinates, units);
      this.sendSocketNotification("WEATHER_RESULT", weather);
    } catch (error) {
      this.sendError(error.message || "Unable to reach weather service");
    }
  },

  async lookupLocation(location) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const response = await fetch(geoUrl);

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error("Location not found");
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      displayName: `${result.name}${result.admin1 ? `, ${result.admin1}` : ""}, ${result.country_code}`
    };
  },

  async fetchForecast(coords, units) {
    const useMetric = units === "metric";
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&temperature_unit=${useMetric ? "celsius" : "fahrenheit"}&wind_speed_unit=${useMetric ? "kmh" : "mph"}&forecast_days=5`;

    const response = await fetch(weatherUrl);
    if (!response.ok) {
      throw new Error(`Weather request failed: ${response.status}`);
    }

    const data = await response.json();

    return this.transformWeather(coords.displayName, data, units);
  },

  transformWeather(locationName, data, units) {
    const current = data.current || {};
    const daily = data.daily || {};

    const high = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null;
    const low = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null;

    const forecast = this.buildForecast(daily);

    return {
      locationName,
      summary: this.describeWeather(current.weather_code),
      temperature: this.round(current.temperature_2m),
      high: this.round(high),
      low: this.round(low),
      feelsLike: this.round(current.apparent_temperature),
      humidity: this.round(current.relative_humidity_2m),
      windSpeed: this.round(current.wind_speed_10m),
      windUnit: units === "metric" ? "km/h" : "mph",
      updated: this.formatTime(current.time),
      icon: null,
      forecast
    };
  },

  buildForecast(daily) {
    const times = Array.isArray(daily.time) ? daily.time : [];
    const highs = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
    const lows = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
    const codes = Array.isArray(daily.weather_code) ? daily.weather_code : [];

    return times.slice(0, 5).map((time, index) => ({
      label: this.formatDay(time, index),
      high: this.round(highs[index]),
      low: this.round(lows[index]),
      summary: this.describeWeather(codes[index])
    }));
  },

  describeWeather(code) {
    const map = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Freezing drizzle",
      57: "Freezing drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Freezing rain",
      67: "Freezing rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Slight showers",
      81: "Moderate showers",
      82: "Violent showers",
      85: "Snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Thunderstorm with hail"
    };

    return map[code] || "";
  },

  round(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "--";
    }
    return Math.round(value);
  },

  formatTime(unixTime) {
    const date = typeof unixTime === "string" ? new Date(unixTime) : new Date((unixTime || Date.now() / 1000) * 1000);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  },

  formatDay(dateString, index) {
    if (index === 0) {
      return "Today";
    }
    if (!dateString) {
      return "--";
    }
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString([], { weekday: "short" });
    return dayName || "--";
  },

  sendError(message) {
    this.sendSocketNotification("WEATHER_RESULT", { error: message });
  }
});
