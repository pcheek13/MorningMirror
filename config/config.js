/* Config Sample
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
let config = {
	address: "localhost",	// Address to listen on, can be:
							// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
							// - another specific IPv4/6 to listen on a specific interface
							// - "0.0.0.0", "::" to listen on any interface
							// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",	// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
									// you must set the sub path here. basePath must end with a /
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],	// Set [] to allow all IP addresses
									// or add a specific IPv4 of 192.168.1.5 :
									// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
									// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
									// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	useHttps: false,			// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "",	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "",	// HTTPS Certificate path, only require when useHttps is true

	language: "en",
	locale: "en-US",   // this variable is provided as a consistent location
			   // it is currently only used by 3rd party modules. no MagicMirror code uses this value
			   // as we have no usage, we  have no constraints on what this field holds
			   // see https://en.wikipedia.org/wiki/Locale_(computer_software) for the possibilities

	logLevel: ["INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 12,
	units: "imperial",

	modules: [
		{
		    module: "MMM-WIFI",
		    position: "top_right",
		    config: {
			// Configuration of the module goes here
		    }
		},
		{
		  module: "MMM-DailyWeatherPrompt",
		  position: "top_left", // choose any MagicMirror position
		  config: {
		    units: "imperial", // or "metric"
		    updateInterval: 10 * 60 * 1000, // 10 minutes
		    promptText: "Enter City, ST or ZIP",
		    showFeelsLike: true,
		    showHumidity: true,
		    showWind: true,
		    allowLocationChange: true
		  }
		},
		{
		  module: "MMM-BBCticker",
		  position: "bottom_bar",
		  config: {
		    header: "World Headlines",
		    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
		    updateInterval: 1 * 60 * 1000,
		    tickerSpeed: 170,
		    maxItems: 12,
		    backgroundColor: "rgba(0, 0, 0, 0.75)",
		    textColor: "#f5f5f5",
		    fontSize: "1.5rem",
		    seperator: "-",
		    	
 			 }
		},
		{
			module: "MM-Modulebar",
			position: "bottom_right", // This can be any of the regions.
			header: "Modules", // Optional
			classes: "default everyone", // Optional
			config: {  

			buttons: {

		  	  // A number (unique for each button) lowest number will be displayed first...
		"99": {
		      // This button hides everything and uses two symbols.
		      module: "all",
		      symbol: "toggle-on",
		      symbol2: "toggle-off",
		    	},
		"4": {
			//A button for the calendar
			module: "calendar",
			symbol: "fa-solid fa-calendar",
		 	},
		"5": {
			module: "MMM-BBCticker",
			symbol: "newspaper",
			},
		"6": {
			module: "MM-DailyWeatherPrompt",
			symbol: "fa-solid fa-cloud",
			},		
		},
		},
		},
		{
			module: "clock",
			position: "top_center",
		},
		{
			module: "alendar",
			header: "Calendar",
			position: "top_right",
			config: {
				calendars: [
					{
						fetchInterval: 7 * 24 * 60 * 60 * 1000,
						symbol: "fa-solid fa-calendar-days",
						url: "http://p169-caldav.icloud.com/published/2/MTk2Njg2NjkwMzE5NjY4Nqm0NlLwtQHXx3VRYzZ2AdLAnzKHitM2ttQThnxt_eKwad26Hl2LdrjHGa7aWP6AL09j4KLorEc66t5iwKl8Bug"
					}
				]
			}
		},
		{
			 module: "MMM-DynamicWeather",
			 position: "fullscreen_above",
			 config: { // See https://github.com/scottcl88/MMM-DynamicWeather for more information.
			  api_key: "cee06176e593807e5db90809938e7e03",
			  	lat: 39.472298,
				lon: -87.401917,
			}
		},
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
