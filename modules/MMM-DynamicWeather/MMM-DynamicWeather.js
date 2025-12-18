var Effect = /** @class */ (function () {
    function Effect() {
        this.year = 0;
        this.doDisplay = false;
    }
    Effect.prototype.getDateRanges = function () {
        return this.dateRanges ? this.dateRanges : [];
    };
    Effect.prototype.getYear = function () {
        return this.year ? this.year : 0;
    };
    Effect.prototype.getMonth = function () {
        return this.month ? this.month : 0;
    };
    Effect.prototype.getDay = function () {
        return this.day ? this.day : 0;
    };
    Effect.prototype.getSize = function () {
        return this.size ? this.size : 1;
    };
    Effect.prototype.getParticleCount = function () {
        return this.particleCount ? this.particleCount : -1;
    };
    Effect.prototype.getSpeedMax = function () {
        return this.speedMax ? this.speedMax : 100;
    };
    Effect.prototype.getSpeedMin = function () {
        return this.speedMin ? this.speedMin : 50;
    };
    Effect.prototype.getWeatherCode = function () {
        return this.weatherCode ? this.weatherCode : -99;
    };
    Effect.prototype.getMinWeatherCode = function () {
        return this.weatherCodeMin ? this.weatherCodeMin : 99999;
    };
    Effect.prototype.getMaxWeatherCode = function () {
        return this.weatherCodeMax ? this.weatherCodeMax : -99999;
    };
    Effect.prototype.hasWeatherCode = function () {
        return (this.weatherCode && this.weatherCode > 0) || (this.weatherCodeMin && this.weatherCodeMin > 0) || (this.weatherCodeMax && this.weatherCodeMax > 0) ? true : false;
    };
    Effect.prototype.hasHoliday = function () {
        return this.holiday && this.holiday.length > 0 ? true : false;
    };
    Effect.prototype.clone = function (other) {
        this.id = other.id;
        this.dateRanges = other.dateRanges;
        this.day = other.day;
        this.month = other.month;
        this.year = other.year;
        this.images = other.images;
        this.direction = other.direction;
        this.size = other.size;
        this.particleCount = other.particleCount;
        this.speedMax = other.speedMax;
        this.speedMin = other.speedMin;
        this.weatherCode = other.weatherCode;
        this.weatherCodeMin = other.weatherCodeMin;
        this.weatherCodeMax = other.weatherCodeMax;
        this.holiday = other.holiday;
        this.recurrence = other.recurrence;
        this.doDisplay = other.doDisplay;
    };
    return Effect;
}());
Module.register("MMM-DynamicWeather", {
    defaults: {
        particleCount: 100,
        api_key: "",
        locationID: 0,
        lat: 0,
        lon: 0,
        weatherInterval: 600000,
        alwaysDisplay: "",
        zIndex: 99,
        opacity: 1,
        fadeDuration: 3000,
        effectDuration: 120000,
        effectDelay: 60000,
        realisticClouds: false,
        hideSun: false,
        hideMoon: false,
        hideSnow: false,
        hideSnowman: true,
        hideRain: false,
        hideFlower: true,
        hideClouds: false,
        hideFog: false,
        hideLightning: false,
        lightning1Count: 2,
        lightning2Count: 3,
        sequential: "",
        sunImage: "sun_right",
        effects: [],
        bootPreviewInterval: 4000,
        bootPreviewOptions: [
            "snow",
            "rain",
            "cloudy",
            "sun",
            "moon",
            "fog",
            "lightning",
        ],
        showBootSpinner: true,
    },
    start: function () {
        var _this_1 = this;
        Log.info("Starting MMM-DynamicWeather");
        this.now = new Date();
        this.initialized = false;
        this.weatherLoaded = false;
        this.holidayLoaded = false;
        this.doShowEffects = true;
        this.hasDateEffectsToDisplay = false;
        this.hasHolidayEffectsToDisplay = false;
        this.hasWeatherEffectsToDisplay = true;
        this.bootPreviewActive = true;
        this.bootPreviewIndex = 0;
        this.bootPreviewQueue = [];
        this.bootPreviewTimer = null;
        this.effectDurationTimeout = null;
        this.effectDelayTimeout = null;
        this.weatherTimeout = null;
        this.holidayTimeout = null;
        this.allEffects = [];
        this.manualOverride = "";
        this.apiKey = this.config.api_key || this.config.apiKey;
        this.hasApiKey = !!this.apiKey;
        if (!this.hasApiKey) {
            Log.error("[MMM-DynamicWeather] No api_key provided. Set api_key in config or OPENWEATHERMAP_API_KEY in the environment.");
        }
        this.url = this.buildApiUrl(this.config.lat, this.config.lon, this.config.locationID);
        this.snowEffect = new Effect();
        this.snowEffect.images = ["snow1.png", "snow2.png", "snow3.png"];
        this.snowEffect.size = 1;
        this.snowEffect.direction = "down";
        this.realisticCloudsEffect = new Effect();
        this.realisticCloudsEffect.size = 15;
        this.realisticCloudsEffect.direction = "left-right";
        this.realisticCloudsEffect.images = ["cloud1.png", "cloud2.png"];
        this.weatherCode = 0;
        this.sunrise = 0;
        this.sunset = 0;
        this.allHolidays = [];
        var count = 0;
        this.config.effects.forEach(function (configEffect) {
            var effect = new Effect();
            effect.clone(configEffect);
            effect.id = count;
            count++;
            _this_1.allEffects.push(effect);
            _this_1.allHolidays.push(effect.holiday);
        });
        this.lastSequentialId = -1;
        if (this.config.sequential) {
            if (this.config.sequential == "effect" || this.config.sequential == "effect-one") {
                this.lastSequential = "weather";
            }
            else if (this.config.sequential == "weather") {
                this.lastSequential = "effect";
            }
            else {
                this.lastSequential = "";
            }
        }
        else {
            this.lastSequential = "";
        }
        this.bootPreviewQueue = this.buildBootPreviewQueue();
        if (this.bootPreviewQueue.length === 0) {
            this.bootPreviewActive = false;
        }
        else {
            this.scheduleBootPreview(true);
        }
        this.checkDates();
        if (this.allHolidays.length > 0) {
            this.getHolidays(this);
        }
        else {
            this.holidayLoaded = true;
        }
        if (!this.hasApiKey) {
            this.weatherLoaded = true;
        }
        else if (!this.config.alwaysDisplay) {
            this.getWeather(this);
        }
        else {
            this.weatherLoaded = true;
        }
        Log.info("[MMM-DynamicWeather] Finished initialization");
    },
    notificationReceived: function (notification, payload) {
        if (notification === "LOCATION_COORDINATES" && payload) {
            var lat = Number(payload.lat !== null && payload.lat !== void 0 ? payload.lat : payload.latitude);
            var lon = Number(payload.lon !== null && payload.lon !== void 0 ? payload.lon : payload.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                this.updateCoordinates(lat, lon);
            }
        }
        if (notification === "DYNAMIC_WEATHER_OVERRIDE") {
            var mode = payload && typeof payload.mode === "string" ? payload.mode.trim() : "";
            this.manualOverride = mode;
            if (mode) {
                this.finishBootPreview();
            }
            this.updateDom();
        }
        if (notification === "MIRROR_WAKE") {
            this.manualOverride = "";
            this.updateDom();
        }
    },
    buildApiUrl: function (lat, lon, locationId) {
        if (!this.hasApiKey) {
            return "";
        }
        var nextUrl = "https://api.openweathermap.org/data/2.5/weather?appid=" + this.apiKey;
        var hasLat = typeof lat === "number" && !Number.isNaN(lat);
        var hasLon = typeof lon === "number" && !Number.isNaN(lon);
        if (hasLat && hasLon) {
            nextUrl += "&lat=" + lat + "&lon=" + lon;
        }
        if (locationId) {
            nextUrl += "&id=" + locationId;
        }
        return nextUrl;
    },
    updateCoordinates: function (lat, lon) {
        this.config.lat = lat;
        this.config.lon = lon;
        this.config.locationID = 0;
        this.url = this.buildApiUrl(lat, lon, 0);
        if (!this.hasApiKey) {
            return;
        }
        if (this.weatherTimeout) {
            clearTimeout(this.weatherTimeout);
            this.weatherTimeout = null;
        }
        this.getWeather(this);
    },
    buildBootPreviewQueue: function () {
        var _this_1 = this;
        try {
            var options = Array.isArray(this.config.bootPreviewOptions)
                ? this.config.bootPreviewOptions
                : [];
            var unique_1 = new Set();
            var allowed = [];
            var canShow = function (option) {
                if (option === "snow") {
                    return _this_1.config.hideSnow !== true;
                }
                if (option === "rain") {
                    return _this_1.config.hideRain !== true;
                }
                if (option === "cloudy") {
                    return _this_1.config.hideClouds !== true;
                }
                if (option === "fog") {
                    return _this_1.config.hideFog !== true;
                }
                if (option === "lightning") {
                    return _this_1.config.hideLightning !== true;
                }
                return true;
            };
            options.forEach(function (entry) {
                var option = String(entry || "").toLowerCase();
                if (!option || unique_1.has(option) || !canShow(option)) {
                    return;
                }
                unique_1.add(option);
                allowed.push(option);
            });
            return allowed;
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error building boot preview queue", error);
            return [];
        }
    },
    scheduleBootPreview: function (initial) {
        var _this_1 = this;
        if (initial === void 0) { initial = false; }
        if (!this.bootPreviewActive || this.bootPreviewQueue.length === 0) {
            this.finishBootPreview();
            return;
        }
        if (!initial) {
            this.bootPreviewIndex += 1;
        }
        if (this.bootPreviewIndex >= this.bootPreviewQueue.length) {
            this.finishBootPreview();
            return;
        }
        clearTimeout(this.bootPreviewTimer);
        this.updateDom();
        this.bootPreviewTimer = setTimeout(function () {
            _this_1.scheduleBootPreview(false);
        }, this.config.bootPreviewInterval);
    },
    finishBootPreview: function () {
        this.bootPreviewActive = false;
        this.bootPreviewIndex = 0;
        clearTimeout(this.bootPreviewTimer);
        this.bootPreviewTimer = null;
        this.doShowEffects = true;
        this.updateDom();
    },
    renderBootSpinner: function () {
        var overlay = document.createElement("div");
        overlay.className = "mmm-dynamic-weather__boot-spinner";
        var spinner = document.createElement("div");
        spinner.className = "mmm-dynamic-weather__boot-spinner-circle";
        overlay.appendChild(spinner);
        return overlay;
    },
    renderBootPreviewEffect: function (wrapper, effectName) {
        this.renderDisplayMode(wrapper, effectName);
    },
    renderDisplayMode: function (wrapper, mode) {
        switch (mode) {
            case "snow": {
                this.showCustomEffect(wrapper, this.snowEffect);
                if (this.config.hideSnowman === false || this.config.hideSnowman === "false") {
                    this.buildSnowman(wrapper);
                }
                return true;
            }
            case "sun": {
                this.makeItSunny(wrapper);
                return true;
            }
            case "moon": {
                this.makeItMoon(wrapper);
                return true;
            }
            case "rain": {
                this.makeItRain(wrapper);
                if (this.config.hideFlower === false || this.config.hideFlower === "false") {
                    this.buildFlower(wrapper);
                }
                return true;
            }
            case "lightning": {
                this.makeItLightning(wrapper);
                return true;
            }
            case "rain-lightning": {
                this.makeItRain(wrapper);
                this.makeItLightning(wrapper);
                if (this.config.hideFlower === false || this.config.hideFlower === "false") {
                    this.buildFlower(wrapper);
                }
                return true;
            }
            case "cloudy": {
                if (this.config.realisticClouds) {
                    this.showCustomEffect(wrapper, this.realisticCloudsEffect);
                }
                else {
                    this.makeItCloudy(wrapper);
                }
                return true;
            }
            case "fog": {
                this.makeItFoggy(wrapper);
                return true;
            }
            default: {
                return false;
            }
        }
    },
    getStyles: function () {
        return ["MMM-DynamicWeather.css"];
    },
    /**
     * Checks if today is within the provided date range.
     *
     * @param {string} dateRange - The date range in the format "YYYY-MM-DD to YYYY-MM-DD".
     * @returns {boolean} - Returns true if today is within the date range, otherwise false.
     */
    isTodayInDateRange: function (dateRange) {
        // Split the input string to extract the start and end dates.
        var _a = dateRange.split(" to ").map(function (s) { return s.trim(); }), startDateStr = _a[0], endDateStr = _a[1];
        // Validate the format of the start and end dates.
        if (!startDateStr || !endDateStr || isNaN(Date.parse(startDateStr)) || isNaN(Date.parse(endDateStr))) {
            console.error("Invalid date range format. Use 'YYYY-MM-DD to YYYY-MM-DD'.", dateRange);
            throw new Error("Invalid date range format. Use 'YYYY-MM-DD to YYYY-MM-DD'.");
        }
        // Parse the dates into Date objects.
        var startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);
        var endDate = new Date(endDateStr);
        startDate.setHours(0, 0, 0, 0);
        // Get today's date with time set to midnight for comparison.
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        // Check if today falls within the range.
        return today >= startDate && today <= endDate;
    },
    /**
     * Loops through an array of date ranges and returns true if today is within any of the ranges.
     *
     * @param {string[]} dateRanges - An array of date ranges in the format "YYYY-MM-DD to YYYY-MM-DD".
     * @returns {boolean} - Returns true if today is within any date range, otherwise false.
     */
    isTodayInAnyDateRange: function (dateRanges) {
        for (var _i = 0, dateRanges_1 = dateRanges; _i < dateRanges_1.length; _i++) {
            var dateRange = dateRanges_1[_i];
            if (this.isTodayInDateRange(dateRange)) {
                return true;
            }
        }
        return false;
    },
    checkDates: function () {
        var _this_1 = this;
        try {
            this.allEffects.forEach(function (effect) {
                var effectMonth = effect.getMonth() - 1;
                if (effect.hasWeatherCode() || effect.hasHoliday()) {
                    //if there is weatherCode or holiday, dates are ignored
                    console.log("Ignoring dates for effect due to weatherCode or holiday being set. Effect: ", effect);
                    return;
                }
                if (_this_1.isTodayInAnyDateRange(effect.getDateRanges())) {
                    _this_1.hasDateEffectsToDisplay = true;
                    effect.doDisplay = true;
                    return;
                }
                if (effect.getMonth() == 0 && effect.getDay() == 0 && effect.getYear() == 0) {
                    //if no dates, then display it depending on recurrence or dateRange
                    if (effect.recurrence == "weekdays") {
                        //if its not Sunday (0) and not Saturday (6)
                        if (_this_1.now.getDay() !== 6 && _this_1.now.getDay() !== 0) {
                            _this_1.hasDateEffectsToDisplay = true;
                            effect.doDisplay = true;
                        }
                    }
                    else if (effect.recurrence == "weekends") {
                        //if its Sunday (0) or Saturday (6)
                        if (_this_1.now.getDay() == 6 || _this_1.now.getDay() == 0) {
                            _this_1.hasDateEffectsToDisplay = true;
                            effect.doDisplay = true;
                        }
                    }
                }
                else {
                    //if the month and date match or the month, date and year match
                    if (_this_1.now.getMonth() == effectMonth && _this_1.now.getDate() == effect.day) {
                        if (effect.getYear() == 0 || _this_1.now.getFullYear() == effect.getYear()) {
                            _this_1.hasDateEffectsToDisplay = true;
                            effect.doDisplay = true;
                        }
                    }
                    else if (effect.recurrence == "monthly") {
                        //ignore everything but the day
                        if (_this_1.now.getDate() == effect.getDay()) {
                            _this_1.hasDateEffectsToDisplay = true;
                            effect.doDisplay = true;
                        }
                    }
                    else if (effect.recurrence == "weekly") {
                        var effectDay = new Date(effect.getYear(), effectMonth, effect.getDay());
                        if (_this_1.now.getDay() == effectDay.getDay()) {
                            _this_1.hasDateEffectsToDisplay = true;
                            effect.doDisplay = true;
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error occurred in checkDates: ", error);
        }
    },
    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.style.zIndex = this.config.zIndex;
        wrapper.style.opacity = this.config.opacity;
        wrapper.className = "wrapper";
        try {
            if (this.bootPreviewActive && this.bootPreviewQueue.length > 0) {
                var previewEffect = this.bootPreviewQueue[this.bootPreviewIndex] || this.bootPreviewQueue[0];
                this.renderBootPreviewEffect(wrapper, previewEffect);
                if (this.config.showBootSpinner) {
                    wrapper.appendChild(this.renderBootSpinner());
                }
                return wrapper;
            }
            var manualMode = (this.manualOverride || "").trim();
            if (manualMode) {
                this.renderDisplayMode(wrapper, manualMode);
                return wrapper;
            }
            //setup the fade-out animation
            var fadeDuration = parseInt(this.config.fadeDuration);
            var animationDelay = parseInt(this.config.effectDuration) - fadeDuration;
            var fadeCSS = document.createElement("style");
            fadeCSS.innerHTML = ".fade-out {animation-name: fade; animation-duration: " + fadeDuration + "ms; animation-delay: " + animationDelay + "ms;}";
            wrapper.prepend(fadeCSS);
            wrapper.onanimationend = function (e) {
                //delay finished, elements faded out, now remove
                var thisAnimation = e.animationName;
                if (thisAnimation == "fade") {
                    wrapper.remove();
                }
            };
            if (this.config.alwaysDisplay) {
                if (this.renderDisplayMode(wrapper, this.config.alwaysDisplay)) {
                    return wrapper;
                }
                console.error("[MMM-DynamicWeather] Invalid config option 'alwaysDisplay'");
                return wrapper;
            }
            if (!this.weatherLoaded || !this.holidayLoaded)
                return wrapper; //need to wait for the weather to first be loaded
            if (!this.doShowEffects)
                return wrapper;
            wrapper.className = "wrapper fade-out";
            var showEffects = false;
            var showWeather = false;
            //check to see what should be shown based on availability and sequential
            if (this.hasDateEffectsToDisplay || this.hasHolidayEffectsToDisplay || this.hasWeatherEffectsToDisplay) {
                if (this.lastSequential == "effect" && this.hasWeatherEffectsToDisplay) {
                    //if its weather's turn and there are weather to show
                    showWeather = true;
                    this.lastSequential = "weather";
                }
                else if (this.lastSequential == "weather" && (this.hasDateEffectsToDisplay || this.hasHolidayEffectsToDisplay)) {
                    //if its effect's turn and there are effects to show
                    showEffects = true;
                    this.lastSequential = "effect";
                }
                else {
                    showWeather = true;
                    showEffects = true;
                }
            }
            if (showEffects) {
                for (var _i = 0, _a = this.allEffects; _i < _a.length; _i++) {
                    var effect = _a[_i];
                    if (effect.doDisplay) {
                        //we can display this effect
                        if (this.config.sequential == "effect-one") {
                            //only show one effect at a time. if it wasn't the last one and its next in line, then do show it
                            if (this.lastSequentialId < effect.id) {
                                this.lastSequentialId = effect.id;
                                if (this.allEffects.length - 1 == this.lastSequentialId) {
                                    //reached end of effects, reset
                                    this.lastSequentialId = -1;
                                }
                                this.showCustomEffect(wrapper, effect);
                                break;
                            }
                        }
                        else {
                            this.showCustomEffect(wrapper, effect);
                        }
                    }
                }
            }
            if (showWeather) {
                //Codes from https://openweathermap.org/weather-conditions
                if (this.weatherCode >= 600 && this.weatherCode <= 622 && !this.config.hideSnow) {
                    this.showCustomEffect(wrapper, this.snowEffect);
                    if (this.config.hideSnowman === false || this.config.hideSnowman === "false") {
                        this.buildSnowman(wrapper);
                    }
                    if (this.weatherCode >= 611 && this.weatherCode <= 622 && !this.config.hideRain) {
                        //snow/rain mix
                        this.makeItRain(wrapper);
                    }
                }
                else if (this.weatherCode >= 200 && this.weatherCode <= 531 && !this.config.hideRain) {
                    this.makeItRain(wrapper);
                    if (this.config.hideFlower === false || this.config.hideFlower === "false") {
                        this.buildFlower(wrapper);
                    }
                    if (this.weatherCode >= 200 && this.weatherCode <= 232 && !this.config.hideLightning) {
                        this.makeItLightning(wrapper);
                    }
                }
                else if (this.weatherCode >= 801 && this.weatherCode <= 804 && !this.config.hideClouds) {
                    if (this.config.realisticClouds) {
                        if (this.weatherCode == 801) {
                            this.realisticCloudsEffect.size = 8;
                            this.realisticCloudsEffect.particleCount = 30;
                            this.realisticCloudsEffect.images = ["cloud1.png"];
                        }
                        else if (this.weatherCode == 802) {
                            this.realisticCloudsEffect.size = 8;
                            this.realisticCloudsEffect.particleCount = 50;
                            this.realisticCloudsEffect.images = ["cloud1.png", "cloud2.png"];
                        }
                        else if (this.weatherCode == 803) {
                            this.realisticCloudsEffect.size = 15;
                            this.realisticCloudsEffect.particleCount = 30;
                            this.realisticCloudsEffect.images = ["cloud1.png", "cloud2.png"];
                        }
                        else if (this.weatherCode == 804) {
                            this.realisticCloudsEffect.size = 15;
                            this.realisticCloudsEffect.particleCount = 30;
                            this.realisticCloudsEffect.images = ["cloud3.png", "cloud2.png", "cloud1.png"];
                        }
                        this.showCustomEffect(wrapper, this.realisticCloudsEffect);
                    }
                    else {
                        this.makeItCloudy(wrapper);
                    }
                }
                else if (this.weatherCode >= 701 && this.weatherCode <= 781 && !this.config.hideFog) {
                    this.makeItFoggy(wrapper);
                }
                else if (this.weatherCode == 800 && !this.config.hideSun && this.sunset > (Date.now() / 1000) && this.sunrise < (Date.now() / 1000)) {
                    this.makeItSunny(wrapper);
                }
                else if (this.weatherCode == 800 && !this.config.hideMoon) {
                    this.makeItMoon(wrapper);
                }
            }
            console.info("[MMM-DynamicWeather] Displaying effects for: ", this.config.effectDuration);
            this.effectDurationTimeout = setTimeout(this.stopEffect, this.config.effectDuration, this);
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error occurred in getDom: ", error);
        }
        return wrapper;
    },
    showCustomEffect: function (wrapper, effect) {
        this.doShowEffects = false;
        var flake, jiggle, size;
        var particleCount = effect.getParticleCount();
        if (particleCount < 0) {
            particleCount = this.config.particleCount;
        }
        for (var i = 0; i < particleCount; i++) {
            size = effect.getSize(); // * (Math.random() * 0.75) + 0.25;
            var flakeImage = document.createElement("div");
            var maxNum = effect.images.length;
            var picIndex = Math.floor(Math.random() * (maxNum - 0) + 0);
            flakeImage.style.backgroundImage = "url('./modules/MMM-DynamicWeather/images/" + effect.images[picIndex] + "')";
            flakeImage.style.transform = "scale(" + size + ", " + size + ")";
            flakeImage.style.opacity = size;
            flake = document.createElement("div");
            var animationName;
            switch (effect.direction) {
                case "down": {
                    flake.className = "flake-downwards";
                    flake.style.left = Math.random() * 100 - 10 + "%";
                    animationName = "flake-jiggle";
                    break;
                }
                case "left-right": {
                    flake.className = "flake-left-right";
                    flake.style.left = -75 - size * 2 + "px";
                    flake.style.top = Math.random() * 100 - 10 + "%";
                    flake.style.animationName = "flake-jiggle-left-right";
                    break;
                }
                case "right-left": {
                    flake.className = "flake-right-left";
                    flake.style.right = 75 + size * 2 + "px";
                    flake.style.top = Math.random() * 100 - 10 + "%";
                    flake.style.animationName = "flake-jiggle-right-left";
                    break;
                }
                default: {
                    flake.className = "flake-upwards";
                    flake.style.left = Math.random() * 100 - 10 + "%";
                    animationName = "flake-jiggle";
                    break;
                }
            }
            var max = effect.getSpeedMax();
            var min = effect.getSpeedMin();
            jiggle = document.createElement("div");
            jiggle.style.animationDelay = Math.random() * max + "s";
            jiggle.style.animationDuration = max - Math.random() * min * size + "s";
            if (animationName) {
                jiggle.style.animationName = animationName;
            }
            jiggle.appendChild(flakeImage);
            size = Math.random() * 0.75 + 0.25;
            jiggle.style.transform = "scale(" + size + ", " + size + ")";
            jiggle.style.opacity = size;
            if (animationName) {
                jiggle.style.animationName = animationName;
            }
            flake.appendChild(jiggle);
            flake.style.animationDelay = Math.random() * max + "s";
            flake.style.animationDuration = max - Math.random() * min * size + "s";
            wrapper.appendChild(flake);
        }
    },
    buildSnowman: function (wrapper) {
        this.doShowEffects = false;
        var snowmanImage = document.createElement("div");
        snowmanImage.classList.add("snowman");
        snowmanImage.style.animationDuration = this.config.effectDuration - 10000 + "ms"; //subtract for 10s delay
        wrapper.appendChild(snowmanImage);
    },
    makeItRain: function (wrapper) {
        this.doShowEffects = false;
        var increment = 0;
        while (increment < this.config.particleCount) {
            var randoHundo = Math.floor(Math.random() * (98 - 1 + 1) + 1); //random number between 98 and 1
            var randoFiver = Math.floor(Math.random() * (5 - 2 + 1) + 2);
            increment += randoFiver;
            var frontDrop = document.createElement("div");
            frontDrop.classList.add("drop");
            frontDrop.style.left = increment + "%";
            frontDrop.style.bottom = randoFiver + randoFiver - 1 + 100 + "%";
            frontDrop.style.animationDelay = "1." + randoHundo + "s";
            frontDrop.style.animationDuration = "1.5" + randoHundo + "s";
            var frontStem = document.createElement("div");
            frontStem.classList.add("stem");
            frontStem.style.animationDelay = "1." + randoHundo + "s";
            frontStem.style.animationDuration = "1.5" + randoHundo + "s";
            frontDrop.appendChild(frontStem);
            var backDrop = document.createElement("div");
            backDrop.classList.add("drop");
            backDrop.style.opacity = "0.5";
            backDrop.style.right = increment + "%";
            backDrop.style.bottom = randoFiver + randoFiver - 1 + 100 + "%";
            backDrop.style.animationDelay = "1." + randoHundo + "s";
            backDrop.style.animationDuration = "1.5" + randoHundo + "s";
            var backStem = document.createElement("div");
            backStem.classList.add("stem");
            backStem.style.animationDelay = "1." + randoHundo + "s";
            backStem.style.animationDuration = "1.5" + randoHundo + "s";
            backDrop.appendChild(backStem);
            wrapper.appendChild(backDrop);
            wrapper.appendChild(frontDrop);
        }
    },
    buildFlower: function (wrapper) {
        this.doShowEffects = false;
        var flowerImage = document.createElement("div");
        flowerImage.classList.add("flower");
        flowerImage.style.animationDuration = this.config.effectDuration - 10000 + "ms"; //subtract for 10s delay
        wrapper.appendChild(flowerImage);
    },
    makeItLightning: function (wrapper) {
        this.doShowEffects = false;
        var lightningImage1 = document.createElement("div");
        lightningImage1.classList.add("lightning1");
        lightningImage1.style.animationIterationCount = this.config.lightning1Count;
        var lightningImage2 = document.createElement("div");
        lightningImage2.classList.add("lightning2");
        lightningImage2.style.animationIterationCount = this.config.lightning2Count;
        var lightningPlayer = document.createElement("div");
        lightningPlayer.classList.add("lightningPlayer");
        lightningPlayer.appendChild(lightningImage1);
        lightningPlayer.appendChild(lightningImage2);
        wrapper.appendChild(lightningPlayer);
    },
    makeItSunny: function (wrapper) {
        this.doShowEffects = false;
        var sunImage = document.createElement("div");
        sunImage.classList.add("sun");
        sunImage.style.background = "url('./modules/MMM-DynamicWeather/images/" + this.config.sunImage + ".png')  center center/cover no-repeat transparent";
        var sunPlayer = document.createElement("div");
        sunPlayer.classList.add("sunPlayer");
        sunPlayer.appendChild(sunImage);
        wrapper.appendChild(sunPlayer);
    },
    makeItMoon: function (wrapper) {
        this.doShowEffects = false;
        var moonImage = document.createElement("div");
        moonImage.classList.add("moon");
        moonImage.style.background = "url('./modules/MMM-DynamicWeather/images/moon1.png')  center center/cover no-repeat transparent";
        var moonPlayer = document.createElement("div");
        moonPlayer.classList.add("moonPlayer");
        moonPlayer.appendChild(moonImage);
        wrapper.appendChild(moonPlayer);
    },
    makeItCloudy: function (wrapper) {
        this.doShowEffects = false;
        var increment = 0;
        while (increment < this.config.particleCount) {
            var randNum = Math.floor(Math.random() * (25 - 5 + 1) + 5); //random number between 25 and 5
            var speed = Math.floor(Math.random() * (35 - 15 + 1) + 15);
            var size = Math.floor(Math.random() * (60 - 3 + 1) + 3);
            increment += randNum;
            var cloudBase = document.createElement("div");
            cloudBase.style.animation = "animateCloud " + speed + "s linear infinite";
            cloudBase.style.transform = "scale(0." + size + ")";
            var cloud = document.createElement("div");
            cloud.classList.add("cloud");
            cloudBase.appendChild(cloud);
            wrapper.appendChild(cloudBase);
        }
    },
    makeItFoggy: function (wrapper) {
        this.doShowEffects = false;
        var fogImage1 = document.createElement("div");
        fogImage1.classList.add("image01");
        var fogImage2 = document.createElement("div");
        fogImage2.classList.add("image02");
        var fogPlayer1 = document.createElement("div");
        fogPlayer1.id = "foglayer_01";
        fogPlayer1.classList.add("fog");
        fogPlayer1.appendChild(fogImage1);
        fogPlayer1.appendChild(fogImage2);
        wrapper.appendChild(fogPlayer1);
        fogImage1 = document.createElement("div");
        fogImage1.classList.add("image01");
        fogImage2 = document.createElement("div");
        fogImage2.classList.add("image02");
        var fogPlayer2 = document.createElement("div");
        fogPlayer2.id = "foglayer_02";
        fogPlayer2.classList.add("fog");
        fogPlayer2.appendChild(fogImage1);
        fogPlayer2.appendChild(fogImage2);
        wrapper.appendChild(fogPlayer2);
        fogImage1 = document.createElement("div");
        fogImage1.classList.add("image01");
        fogImage2 = document.createElement("div");
        fogImage2.classList.add("image02");
        var fogPlayer3 = document.createElement("div");
        fogPlayer3.id = "foglayer_03";
        fogPlayer3.classList.add("fog");
        fogPlayer3.appendChild(fogImage1);
        fogPlayer3.appendChild(fogImage2);
        wrapper.appendChild(fogPlayer3);
    },
    stopEffect: function (_this) {
        try {
            //wait for delay and reset
            _this.updateDom();
            var delay = _this.config.effectDelay;
            _this.effectDelayTimeout = setTimeout(function (_that, _effect) {
                _that.doShowEffects = true;
                _that.updateDom();
            }, delay, _this);
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error occurred in stopping effects: ", error);
        }
    },
    getWeather: function (_this) {
        if (!_this.hasApiKey) {
            console.error("[MMM-DynamicWeather] Skipping weather fetch because api_key is missing.");
            return;
        }
        _this.sendSocketNotification("API-Fetch", _this.url);
        _this.weatherTimeout = setTimeout(_this.getWeather, _this.config.weatherInterval, _this);
    },
    getHolidays: function (_this) {
        try {
            _this.sendSocketNotification("Holiday-Fetch", {});
            var today = new Date();
            var tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            var msTillMidnight = tomorrow.getTime() - today.getTime();
            console.info("[MMM-DynamicWeather] Holidays have been fetched, waiting till midnight (" + msTillMidnight + " ms) to reset.");
            _this.holidayTimeout = setTimeout(_this.resetHolidays, msTillMidnight, _this);
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error occurred in getHolidays: ", error);
        }
    },
    resetHolidays: function (_this) {
        try {
            console.info("[MMM-DynamicWeather] Resetting holidays...");
            //Reset all effects with a holiday to not show, we will trigger another getHolidays to see if the next day has another holiday to display next
            _this.allEffects.forEach(function (effect) {
                if (effect.holiday) {
                    effect.doDisplay = false;
                }
            });
            _this.hasHolidayEffectsToDisplay = false;
            _this.updateDom();
            console.info("[MMM-DynamicWeather] Holidays reset.");
            _this.getHolidays(_this);
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error occurred in resetting holidays: ", error);
        }
    },
    parseHolidays: function (body) {
        var today = new Date();
        var todayHolidays = [];
        todayHolidays.push("test");
        try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(body, "text/html");
            var children = doc.getElementById("holidays-table").children[1].children;
            for (var i = 0; i < children.length; i++) {
                var child1 = children[i];
                if (child1.hasAttribute("data-date")) {
                    var holidayDateStr = child1.getAttribute("data-date");
                    var child2 = child1.children;
                    for (var j = 0; j < child2.length; j++) {
                        var child3 = child2[j];
                        if (child3.hasChildNodes()) {
                            for (var k = 0; k < child3.children.length; k++) {
                                var child4 = child3.children[k];
                                for (var l = 0; l < this.allHolidays.length; l++) {
                                    var effectHoliday = this.allHolidays[l];
                                    if (child4.textContent == effectHoliday) {
                                        var holidayDate = new Date(parseInt(holidayDateStr));
                                        if (holidayDate.getUTCDate() == today.getDate() && holidayDate.getUTCMonth() == today.getMonth()) {
                                            todayHolidays.push(effectHoliday);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error occurred in parsing holidays: ", error);
        }
        return todayHolidays;
    },
    socketNotificationReceived: function (notification, payload) {
        var _this_1 = this;
        try {
            if (notification === "API-Received" && payload.url === this.url) {
                this.weatherLoaded = true;
                if (!payload.success) {
                    console.error("[MMM-DynamicWeather] API-Received failure status");
                    return;
                }
                var newCode_1 = payload.result.weather[0].id;
                //get the sunset and sunrise to switch between sun and moon when clear
                this.sunrise = payload.result.sys.sunrise;
                this.sunset = payload.result.sys.sunset;
                var doUpdate_1 = false;
                //check to see if the newCode is different than already displayed, and if so, is it going to show anything
                if (newCode_1 != this.weatherCode) {
                    this.weatherCode = newCode_1;
                    if (newCode_1 >= 600 && newCode_1 <= 622 && !this.config.hideSnow) {
                        doUpdate_1 = true;
                    }
                    if ((newCode_1 >= 200 && newCode_1 <= 531) || (newCode_1 >= 611 && newCode_1 <= 622 && !this.config.hideRain)) {
                        doUpdate_1 = true;
                    }
                    if (newCode_1 >= 200 && newCode_1 <= 232 && !this.config.hideLightning) {
                        doUpdate_1 = true;
                    }
                    if (newCode_1 >= 801 && newCode_1 <= 804 && !this.config.hideClouds) {
                        doUpdate_1 = true;
                    }
                    if (newCode_1 >= 701 && newCode_1 <= 781 && !this.config.hideFog) {
                        doUpdate_1 = true;
                    }
                    if (newCode_1 == 800 && !this.config.hideSun) {
                        doUpdate_1 = true;
                    }
                    this.allEffects.forEach(function (effect) {
                        if (effect.getWeatherCode() == newCode_1 || (effect.getMinWeatherCode() <= newCode_1 && effect.getMaxWeatherCode() >= newCode_1)) {
                            doUpdate_1 = true;
                            effect.doDisplay = true;
                            _this_1.hasWeatherEffectsToDisplay = true;
                        }
                    });
                }
                //only update the dom if the weather is different (unless holiday or date effects exist and holiday has finished loading)
                if (doUpdate_1 || (this.holidayLoaded && (this.hasDateEffectsToDisplay || this.hasHolidayEffectsToDisplay))) {
                    this.doShowEffects = true;
                    clearTimeout(this.effectDurationTimeout);
                    clearTimeout(this.effectDelayTimeout);
                    this.updateDom();
                }
            }
            if (notification === "Holiday-Received") {
                this.holidayLoaded = true;
                if (!payload.success) {
                    console.error("[MMM-DynamicWeather] Holiday-Received failure status");
                    return;
                }
                var doUpdate_2 = false;
                var todayHolidays_1 = [];
                todayHolidays_1 = this.parseHolidays(payload.result.holidayBody);
                //returned a list of holidays for today, check to see if any effects have the same holiday name, if so display them and update dom
                this.allEffects.forEach(function (effect) {
                    todayHolidays_1.forEach(function (holidayName) {
                        if (effect.holiday == holidayName) {
                            doUpdate_2 = true;
                            effect.doDisplay = true;
                            _this_1.hasHolidayEffectsToDisplay = true;
                        }
                    });
                });
                //only update the dom if the effects have a holiday to show today (unless weather and date effects exist and weather has finished loading)
                if (doUpdate_2 || (this.weatherLoaded && (this.hasDateEffectsToDisplay || this.hasWeatherEffectsToDisplay))) {
                    this.doShowEffects = true;
                    clearTimeout(this.effectDurationTimeout);
                    clearTimeout(this.effectDelayTimeout);
                    this.updateDom();
                }
            }
        }
        catch (error) {
            console.error("[MMM-DynamicWeather] Error occurred in notification received: ", error);
        }
    },
});
