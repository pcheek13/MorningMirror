const http = require("http");
const https = require("https");
const { URL } = require("url");
const zlib = require("zlib");
const NodeHelper = require("node_helper");

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT = 15000;
const DEFAULT_USER_AGENT = "MMM-BBCticker MorningMirror Module";

function requestFeed(urlString, redirectCount = 0, forcePlainText = false) {
  return new Promise((resolve, reject) => {
    let parsedUrl;

    try {
      parsedUrl = new URL(urlString);
    } catch (error) {
      reject(new Error(`Invalid feed URL: ${error.message}`));
      return;
    }

    const protocol = parsedUrl.protocol === "http:" ? http : https;
    const request = protocol.request(
      parsedUrl,
      {
        method: "GET",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,

          Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
          "Accept-Encoding": forcePlainText
            ? "identity"
            : "gzip, deflate, br"
        }
      },
      (response) => {
        const statusCode = response.statusCode || 0;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location &&
          redirectCount < MAX_REDIRECTS
        ) {
          const redirectUrl = new URL(response.headers.location, parsedUrl).toString();
          response.resume();
          requestFeed(redirectUrl, redirectCount + 1, forcePlainText)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(new Error(`Request failed with status ${statusCode}`));
          return;
        }

        const encoding = (response.headers["content-encoding"] || "").toLowerCase();
        let stream = response;
        let decoded = "";

        const handleStreamError = (error) => {
          if (stream && typeof stream.destroy === "function") {
            stream.destroy();
          }

          if (response && typeof response.destroy === "function") {
            response.destroy();
          }

          if (!forcePlainText && encoding && encoding !== "identity") {
            requestFeed(urlString, redirectCount, true)
              .then(resolve)
              .catch(reject);
            return;
          }

          reject(error);
        };

        if (encoding.includes("br") && typeof zlib.createBrotliDecompress === "function") {
          stream = zlib.createBrotliDecompress();
          response.pipe(stream);
        } else if (encoding.includes("gzip")) {
          stream = zlib.createGunzip();
          response.pipe(stream);
        } else if (encoding.includes("deflate")) {
          stream = zlib.createInflate();
          response.pipe(stream);
        }

        stream.setEncoding("utf8");
        stream.on("data", (chunk) => {
          decoded += chunk;
        });
        stream.on("end", () => {
          resolve(decoded);
        });
        stream.on("error", handleStreamError);
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
    });

    request.end();
  });
}

function stripCDATA(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)]]>/gi, "$1");
}

function stripTags(value = "") {
  return value.replace(/<[^>]+>/g, "");
}

const ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};

function decodeHTMLEntities(value = "") {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();

    if (ENTITY_MAP[lower]) {
      return ENTITY_MAP[lower];
    }

    if (lower.startsWith("#x")) {
      const hex = lower.slice(2);
      const codePoint = Number.parseInt(hex, 16);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }

    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }

    return match;
  });
}

function sanitizeText(value = "") {
  return decodeHTMLEntities(stripTags(stripCDATA(value))).replace(/\s+/g, " ").trim();
}

function getTagContent(block, tagName) {
  const escaped = tagName.replace(/([.*+?^${}()|\[\]\\])/g, "\\$1");
  const regex = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i");
  const match = block.match(regex);
  return match ? match[1] : "";
}

function extractFirst(block, tagNames) {
  for (const name of tagNames) {
    const value = getTagContent(block, name);
    if (value) {
      return value;
    }
  }
  return "";
}

function parseFeed(xml, maxItems) {
  const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const items = [];

  for (const match of matches) {
    const title = sanitizeText(extractFirst(match, ["title"]));

    if (!title) {
      continue;
    }

    let link = sanitizeText(
      extractFirst(match, ["link", "guid", "atom:link", "dc:identifier"])
    );

    if (!link) {
      const linkAttributeMatch = match.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      if (linkAttributeMatch) {
        link = decodeHTMLEntities(linkAttributeMatch[1].trim());
      }
    }

    const pubDateRaw = extractFirst(match, ["pubDate", "updated", "dc:date", "atom:updated"]);
    const pubDate = sanitizeText(pubDateRaw) || null;

    items.push({
      title,
      link,
      pubDate
    });

    if (items.length >= maxItems) {
      break;
    }
  }

  return items;
}

module.exports = NodeHelper.create({
  start() {
    this.config = null;
    this.updateTimer = null;
  },

  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "MMM_BBCTICKER_CONFIG") {
      this.config = payload;
      this.scheduleUpdates();
      this.fetchNews();
    }
  },

  scheduleUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    const parsedInterval = parseInt(this.config.updateInterval, 10);
    const updateInterval = Math.max(
      Number.isNaN(parsedInterval) ? 10 * 60 * 1000 : parsedInterval,
      60 * 1000
    );

    this.updateTimer = setInterval(() => {
      this.fetchNews();
    }, updateInterval);
  },

  async fetchNews() {
    if (!this.config || !this.config.feedUrl) {
      return;
    }

    try {
      const xml = await requestFeed(this.config.feedUrl);
      const maxItems = Math.max(parseInt(this.config.maxItems, 10) || 0, 1);
      const items = parseFeed(xml, maxItems);

      this.sendSocketNotification("MMM_BBCTICKER_NEWS", { items });
    } catch (error) {
      this.sendSocketNotification("MMM_BBCTICKER_ERROR", {
        message: `BBC news update failed: ${error.message}`
      });
    }
  }
});
