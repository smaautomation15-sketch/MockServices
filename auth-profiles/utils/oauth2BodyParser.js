'use strict';

const querystring = require('querystring');
const { Readable } = require('stream');
const Busboy = require('busboy');

let FXParser;
try {
  FXParser = require('fast-xml-parser').XMLParser;
} catch (e) {
  FXParser = null;
}

/**
 * Get the base MIME type from Content-Type header (strip charset and other params).
 * @param {string} contentType - Raw Content-Type header
 * @returns {string} Normalized type, e.g. 'application/json'
 */
function getBaseContentType(contentType) {
  if (!contentType || typeof contentType !== 'string') return '';
  return contentType.split(';')[0].trim().toLowerCase();
}

/**
 * Parse application/json body.
 */
function parseJSON(buffer) {
  const str = buffer.toString('utf8');
  if (!str.trim()) return {};
  const obj = JSON.parse(str);
  return typeof obj === 'object' && obj !== null ? obj : {};
}

/**
 * Parse application/x-www-form-urlencoded body (URL Encoded JSON / Twitter Encoded JSON).
 */
function parseUrlEncoded(buffer) {
  const str = buffer.toString('utf8');
  return querystring.parse(str);
}

/**
 * Parse XML or RSS/Atom into a flat object (root's direct children become keys).
 * Convention: <request><grant_type>password</grant_type><username>user1</username></request>
 */
function parseXML(buffer) {
  if (!FXParser) throw new Error('fast-xml-parser not available');
  const str = buffer.toString('utf8');
  const parser = new FXParser({ ignoreAttributes: true });
  const parsed = parser.parse(str);
  if (!parsed || typeof parsed !== 'object') return {};
  let root = parsed.request || parsed.tokenRequest || parsed.body || parsed.rss || parsed.feed || parsed;
  if (typeof root !== 'object' || root === null) return {};
  if (Array.isArray(root)) root = root[0] || {};
  const result = {};
  for (const [key, value] of Object.entries(root)) {
    if (key.startsWith('@') || key === '#text') continue;
    if (value !== undefined && value !== null && typeof value === 'string') {
      result[key] = value;
    } else if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const text = value['#text'];
      result[key] = text !== undefined ? String(text) : (value.value !== undefined ? String(value.value) : '');
    }
  }
  return result;
}

/**
 * Parse text/csv: first row = keys, second row = values.
 * Convention: grant_type,username,password\npassword,user1,password1
 */
function parseCSV(buffer) {
  const str = buffer.toString('utf8').trim();
  const lines = str.split(/\r?\n/);
  if (lines.length < 2) return {};
  const keys = lines[0].split(',').map((k) => k.trim());
  const values = lines[1].split(',').map((v) => v.trim());
  const result = {};
  keys.forEach((k, i) => {
    if (values[i] !== undefined) result[k] = values[i];
  });
  return result;
}

/**
 * Parse text/plain: key=value per line, or single-line JSON.
 */
function parseText(buffer) {
  const str = buffer.toString('utf8').trim();
  if (!str) return {};
  if (str.startsWith('{')) {
    try {
      return JSON.parse(str);
    } catch (_) {
      // fall through to key=value
    }
  }
  const result = {};
  const lines = str.split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

/**
 * Parse multipart (form-data or related) from buffer using busboy.
 * Returns a Promise that resolves with { grant_type, username?, password?, refresh_token? }.
 */
function parseMultipart(buffer, contentType) {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer);
    const fields = {};
    const parts = [];
    let currentPart = null;

    const busboy = Busboy({ headers: { 'content-type': contentType } });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, file, info) => {
      file.resume();
    });

    busboy.on('partsLimit', () => {});

    busboy.on('part', (part) => {
      const chunks = [];
      part.on('data', (chunk) => chunks.push(chunk));
      part.on('end', () => {
        const partBody = Buffer.concat(chunks);
        const partContentType = part.headers['content-type'] || '';
        parts.push({ body: partBody, contentType: partContentType });
      });
    });

    busboy.on('finish', () => {
      if (Object.keys(fields).length > 0) {
        return resolve(fields);
      }
      if (parts.length > 0) {
        const part = parts[0];
        const base = getBaseContentType(part.contentType);
        try {
          if (base === 'application/json') {
            return resolve(parseJSON(part.body));
          }
          if (base === 'application/x-www-form-urlencoded') {
            return resolve(parseUrlEncoded(part.body));
          }
          if (base === 'text/plain' || base === 'text/csv') {
            return resolve(base === 'text/csv' ? parseCSV(part.body) : parseText(part.body));
          }
          if (/\+json$/.test(base) || base === 'application/json') {
            return resolve(parseJSON(part.body));
          }
          if (/xml/.test(base)) {
            return resolve(parseXML(part.body));
          }
          return resolve(parseText(part.body));
        } catch (e) {
          return reject(e);
        }
      }
      resolve({});
    });

    busboy.on('error', (err) => reject(err));
    stream.pipe(busboy);
  });
}

/**
 * Oracle ADF: JSON (or XML) with optional envelope like { "tokenRequest": { "grant_type": "password", ... } }.
 */
function parseOracleADF(buffer, contentType) {
  const base = getBaseContentType(contentType);
  if (/\+json$/.test(base) || base === 'application/json') {
    const obj = parseJSON(buffer);
    const inner = obj.tokenRequest || obj.request || obj.body || obj.payload || obj;
    return typeof inner === 'object' && inner !== null ? inner : obj;
  }
  if (/xml/.test(base)) {
    return parseXML(buffer);
  }
  return parseJSON(buffer);
}

/**
 * Main entry: parse request body by Content-Type and return normalized object.
 * @param {Buffer} rawBuffer - Raw request body
 * @param {string} contentType - Content-Type header
 * @param {string} path - Request path ('/token' or '/refresh_token')
 * @returns {Promise<object>} Normalized { grant_type, username?, password?, refresh_token? }
 */
async function parseBody(rawBuffer, contentType, path) {
  if (!Buffer.isBuffer(rawBuffer) || rawBuffer.length === 0) {
    return {};
  }

  const base = getBaseContentType(contentType);
  console.log(
    '[OAuth2 Password Grant] Parsing body | Content-Type: ' +
      (base || '(none)') +
      ' | Endpoint: ' +
      path
  );

  try {
    if (base === 'application/json') {
      return parseJSON(rawBuffer);
    }

    if (base === 'application/x-www-form-urlencoded') {
      return parseUrlEncoded(rawBuffer);
    }

    if (base === 'application/xml' || base === 'text/xml') {
      return parseXML(rawBuffer);
    }

    if (base === 'application/rss+xml' || base === 'application/atom+xml') {
      return parseXML(rawBuffer);
    }

    if (base === 'text/csv') {
      return parseCSV(rawBuffer);
    }

    if (base === 'text/plain') {
      return parseText(rawBuffer);
    }

    if (base === 'multipart/form-data') {
      return await parseMultipart(rawBuffer, contentType);
    }

    if (base === 'multipart/related') {
      return await parseMultipart(rawBuffer, contentType);
    }

    if (base.indexOf('vnd.oracle.adf') !== -1 || base === 'application/vnd.oracle.adf+json') {
      return parseOracleADF(rawBuffer, contentType);
    }

    if (base.indexOf('twitter') !== -1 || base === 'application/x-www-form-urlencoded') {
      return parseUrlEncoded(rawBuffer);
    }

    return parseJSON(rawBuffer);
  } catch (err) {
    throw err;
  }
}

module.exports = { parseBody, getBaseContentType };
