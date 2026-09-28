#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─────────── colors ───────────
const C = {
  r: s => `\x1b[31m${s}\x1b[0m`,
  g: s => `\x1b[32m${s}\x1b[0m`,
  y: s => `\x1b[33m${s}\x1b[0m`,
  b: s => `\x1b[34m${s}\x1b[0m`,
  m: s => `\x1b[35m${s}\x1b[0m`,
  c: s => `\x1b[36m${s}\x1b[0m`,
  w: s => `\x1b[37m${s}\x1b[0m`,
  gr: s => `\x1b[90m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`
};

// ─────────── constants ───────────
const BASE = 'https://prod.sible.network/api/v1';
const ORIGIN = 'https://mine.sible.network';

const UAS = [
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; Redmi Note 9S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Infinix X6819) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36'
];

const LANGS = [
  'en-GB,en;q=0.9',
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9,fr;q=0.8',
  'fr-FR,fr;q=0.9,en;q=0.8',
  'ar-MA,ar;q=0.9,fr;q=0.8,en;q=0.7',
  'ar-SA,ar;q=0.9,en;q=0.8'
];

const CH_VERSIONS = ['118','119','120','121','122','123','124','125','126','127','128','129','130','131','132','133','134','135','136','137','138','139','140'];
const CH_PLATFORMS = ['"Android"', '"Android"', '"Android"', '"iOS"', '"Windows"', '"macOS"'];

const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => (typeof n === 'number' ? n.toFixed(8) : n);
const pad = (s, n) => String(s).padEnd(n);

function randomUA() {
  return rnd(UAS);
}

function randomSecUA(ua) {
  const major = rnd(CH_VERSIONS);
  const mobile = /Mobile|Android|iPhone/i.test(ua || '') ? '?1' : '?0';
  return {
    'sec-ch-ua': `"Chromium";v="${major}", "Not?A_Brand";v="24"`,
    'sec-ch-ua-mobile': mobile,
    'sec-ch-ua-platform': rnd(CH_PLATFORMS)
  };
}

// ─────────── CLI flags ───────────
const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const f = argv.find(a => a.startsWith(`--${n}=`));
  return f ? f.split('=').slice(1).join('=') : d;
};
const has = n => argv.includes(`--${n}`);

const AUTH_FILE = flag('file', 'accounts-auth.json');
const PROXY_FILE = flag('proxy', 'proxy.txt');
const CONFIG_FILE = flag('config', 'config.json');
const ACCOUNTS_FILE = flag('accounts', 'accounts.json');
const ONLY = flag('only');
const EXCLUDE = flag('exclude');

// ─────────── config ───────────
const defaults = {
  referralCode: '',
  interval: 3600,
  jitterSec: 3,
  minDelayBetweenAccountsSec: 2,
  maxDelayBetweenAccountsSec: 6,
  rateLimitBackoffSec: 30,
  refreshEndpoint: '/auth/refresh',
  autoRelogin: true,
  reloginOn401: true,
  logCsv: true,
  csvFile: 'mining-log.csv',
  discordWebhook: '',
  quiet: false,
  debugRefresh: true
};

function loadConfig() {
  let user = {};
  try { user = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
  return { ...defaults, ...user };
}

const CFG = loadConfig();
const INTERVAL = Number(flag('interval', CFG.interval)) * 1000;
const LOOP = has('loop') || !has('once');
const QUIET = has('quiet') || CFG.quiet;
const DEBUG_REFRESH = has('debug-refresh') || CFG.debugRefresh;

// ─────────── proxy ───────────
function parseProxy(line) {
  line = line.trim();
  if (!line || line.startsWith('#')) return null;
  if (/^(https?|socks[45]):\/\//i.test(line)) return line;
  const parts = line.split(':');
  if (parts.length === 2) return `http://${parts[0]}:${parts[1]}`;
  if (parts.length === 4) return `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
  if (line.includes('@')) return `http://${line}`;
  return null;
}

function loadProxies(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(parseProxy).filter(Boolean);
}

async function proxyFetch(url, options = {}, proxy = null) {
  if (!proxy) return fetch(url, options);

  if (/^socks[45]:\/\//i.test(proxy)) {
    const { SocksProxyAgent } = require('socks-proxy-agent');
    const nodeFetch = require('node-fetch');
    const agent = new SocksProxyAgent(proxy);
    return nodeFetch(url, { ...options, agent });
  }

  const { ProxyAgent } = require('undici');
  return await fetch(url, { ...options, dispatcher: new ProxyAgent(proxy) });
}

async function testProxy(proxy, timeoutMs = 8000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await proxyFetch('https://api.ipify.org?format=json', { signal: ctrl.signal }, proxy);
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

async function healthCheckProxies(proxies) {
  if (!proxies.length) return [];
  console.log(C.c(`  🔍 testing ${proxies.length} proxy(ies)...`));
  const results = await Promise.all(proxies.map(async p => ({ p, ok: await testProxy(p) })));
  const live = results.filter(r => r.ok).map(r => r.p);
  const dead = results.filter(r => !r.ok).length;
  console.log(C.g(`  ✅ live: ${live.length}`) + (dead ? C.r(`  ❌ dead: ${dead}`) : ''));
  return live;
}

// ─────────── storage ───────────
function loadStore() {
  if (!fs.existsSync(AUTH_FILE)) return { createdAt: new Date().toISOString(), accounts: [] };
  try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); }
  catch { return { createdAt: new Date().toISOString(), accounts: [] }; }
}

function saveStore(data) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function loadAccounts(file) {
  if (!fs.existsSync(file)) return [];
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new Error(`cannot parse ${file}: ${e.message}`); }

  const list = Array.isArray(data) ? data : (data.accounts || []);
  const out = [];

  for (const a of list) {
    if (!a || typeof a !== 'object') continue;

    const label = (a.label || a.email || '?').trim();
    const email = (a.email || a.sibleEmail || a.identifier || '').trim();
    const password = (a.password || a.siblePassword || '').trim();
    const gmailAddress = (a.gmailAddress || a.gmailUser || email).trim();
    const gmailAppPassword = (a.gmailAppPassword || a.gmailPass || '').replace(/\s+/g, '');

    const missing = [];
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (!gmailAddress) missing.push('gmailAddress');
    if (!gmailAppPassword) missing.push('gmailAppPassword');

    if (missing.length) {
      throw new Error(
        `account "${label}" missing fields: ${missing.join(', ')}\n` +
        `  gmailAppPassword = 16-char App Password from https://myaccount.google.com/apppasswords`
      );
    }
    if (gmailAppPassword.length !== 16) {
      throw new Error(
        `account "${label}": gmailAppPassword must be exactly 16 characters (got ${gmailAppPassword.length}).\n` +
        `  Get it from https://myaccount.google.com/apppasswords — NOT your Gmail login password.`
      );
    }

    out.push({ label, email, password, gmailAddress, gmailAppPassword });
  }
  return out;
}

function appendCsv(account, status, claimed) {
  if (!CFG.logCsv) return;
  const f = CFG.csvFile;
  if (!fs.existsSync(f)) {
    fs.writeFileSync(f, 'timestamp,label,username,balance,accumulated,rate,ads,boost,claimed,session,running\n');
  }
  const line = [
    new Date().toISOString(),
    account.label || '',
    account.username || '',
    status.balance ?? '',
    status.accumulatedAmount ?? '',
    status.currentHourlyReward ?? '',
    `${status.session?.adsWatched ?? 0}/${status.session?.adMaxPerSession ?? 0}`,
    status.session?.adBoostPct ?? 0,
    claimed ?? 0,
    status.session?.status ?? '',
    status.session?.isRunning ? 1 : 0
  ].join(',');
  fs.appendFileSync(f, line + '\n');
}

async function notifyWebhook(msg) {
  if (!CFG.discordWebhook) return;
  try {
    await fetch(CFG.discordWebhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: msg })
    });
  } catch {}
}

// ─────────── rate limit ───────────
let rateLimitUntil = 0;
async function rateLimitWait() {
  const now = Date.now();
  if (rateLimitUntil > now) {
    const wait = rateLimitUntil - now;
    console.log(C.y(`  🛑 rate-limited, waiting ${Math.ceil(wait / 1000)}s`));
    await sleep(wait);
  }
}

// ─────────── HTTP ───────────
async function raw(pathname, { method = 'GET', body = null, token = null, proxy = null, headers: extraHeaders = {} } = {}) {
  await rateLimitWait();
  const ua = extraHeaders['user-agent'] || randomUA();
  const ch = randomSecUA(ua);
  const headers = {
    accept: '*/*',
    'accept-language': rnd(LANGS),
    'content-type': 'application/json',
    origin: ORIGIN,
    referer: ORIGIN + '/',
    'sec-ch-ua': ch['sec-ch-ua'],
    'sec-ch-ua-mobile': ch['sec-ch-ua-mobile'],
    'sec-ch-ua-platform': ch['sec-ch-ua-platform'],
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': ua,
    'x-client-type': 'web',
    ...extraHeaders
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await proxyFetch(`${BASE}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  }, proxy);

  if (res.status === 429) {
    rateLimitUntil = Date.now() + CFG.rateLimitBackoffSec * 1000;
    const err = new Error('HTTP 429 rate-limited');
    err.status = 429;
    throw err;
  }

  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} on ${pathname}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// ─────────── JWT ───────────
function secondsLeft(jwt) {
  try {
    const p = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
    return p.exp - Math.floor(Date.now() / 1000);
  } catch { return 0; }
}

// ─────────── Gmail OTP ───────────
async function fetchOtpFromGmail(gmailAddress, gmailAppPassword, maxWaitMs = 120000) {
  if (!gmailAddress || !gmailAppPassword) throw new Error('gmail credentials missing for this account');

  const { ImapFlow } = require('imapflow');
  const { simpleParser } = require('mailparser');

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: gmailAddress, pass: gmailAppPassword.replace(/\s+/g, '') },
    logger: false
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt < maxWaitMs) {
      const since = new Date(Date.now() - 15 * 60 * 1000);
      const candidates = [];

      for await (const msg of client.fetch({ since }, { source: true })) {
        const parsed = await simpleParser(msg.source);
        const from = (parsed.from?.text || '').toLowerCase();
        const subject = (parsed.subject || '').toLowerCase();
        const body = ((parsed.text || '') + ' ' + (parsed.html || '')).toLowerCase();

        console.log(C.gr(`  📨 from="${parsed.from?.text}" subject="${parsed.subject}"`));

        if (from.includes('google.com')) continue;
        if (!from.includes('sible')) continue;
        if (subject.includes('reset') || subject.includes('password') || subject.includes('welcome')) continue;

        const looksLikeOtp = subject.includes('verification') || subject.includes('code')
                          || body.includes('verification code');
        if (!looksLikeOtp) continue;

        const match = body.match(/\b(\d{6})\b/);
        if (match) {
          candidates.push({ code: match[1], date: parsed.date || new Date(0), subject: parsed.subject });
        }
      }

      if (candidates.length) {
        candidates.sort((a, b) => new Date(b.date) - new Date(a.date));
        const pick = candidates[0];
        console.log(C.g(`  ✅ using code ${pick.code} from "${pick.subject}"`));
        try { await client.logout(); } catch {}
        return pick.code;
      }

      await sleep(3000);
    }
    throw new Error('OTP email timeout');
  } finally {
    try { lock.release(); } catch {}
  }
}

// ─────────── auto login ───────────
async function loginOne(cfg, proxy = null) {
  const { label, email, password, gmailAddress, gmailAppPassword } = cfg;

  console.log(C.m('  ─────────────────────────────────'));
  console.log(C.bold(C.b('  🔐 ') + C.w(label) + C.gr(` (${email})`)));

  const ua = randomUA();

  let loginResp;
  try {
    loginResp = await raw('/auth/login', {
      method: 'POST',
      body: { identifier: email, password },
      proxy,
      headers: { 'user-agent': ua }
    });
  } catch (e) {
    console.log(C.r(`  ❌ login: ${e.message}`));
    if (e.body) console.log(C.gr('  ' + JSON.stringify(e.body)));
    return null;
  }

  if (!loginResp.data?.needsOtp) {
    console.log(C.y(`  ℹ️  unexpected: ${JSON.stringify(loginResp.data)}`));
    return null;
  }

  const otpEmail = loginResp.data.email || email;
  console.log(C.c(`  📧 OTP → ${otpEmail}`));

  let code;
  try {
    console.log(C.gr(`  📬 fetching OTP from ${gmailAddress}...`));
    code = await fetchOtpFromGmail(gmailAddress, gmailAppPassword);
    console.log(C.g(`  ✅ OTP: ${code}`));
  } catch (e) {
    console.log(C.r(`  ❌ auto-OTP failed: ${e.message}`));
    return null;
  }

  let verifyResp;
  try {
    verifyResp = await raw('/auth/verify-otp', {
      method: 'POST',
      body: { email: otpEmail, code, purpose: 'login' },
      proxy,
      headers: { 'user-agent': ua }
    });
  } catch (e) {
    console.log(C.r(`  ❌ verify: ${e.message}`));
    if (e.body) console.log(C.gr('  ' + JSON.stringify(e.body)));
    return null;
  }

  const d = verifyResp.data;
  if (!d?.accessToken) {
    console.log(C.r('  ❌ no accessToken'));
    return null;
  }

  console.log(C.g(`  ✅ ${d.user.username}  bal=${d.user.balance}`));

  return {
    label,
    identifier: email,
    email: d.user.email,
    username: d.user.username,
    userId: d.user.id,
    accessToken: d.accessToken,
    refreshToken: d.refreshToken,
    savedAt: new Date().toISOString(),
    refreshedAt: new Date().toISOString(),
    user: d.user
  };
}

// ─────────── refresh ───────────
const refreshLocks = new Map();

async function refreshAccount(account, store, proxy) {
  const key = account.label || account.username;
  while (refreshLocks.get(key)) await refreshLocks.get(key);
  let release;
  const lock = new Promise(r => release = r);
  refreshLocks.set(key, lock);

  try {
    const left = secondsLeft(account.accessToken);
    if (left > 60) return account;

    const endpoint = CFG.refreshEndpoint || '/auth/refresh';
    const r = await raw(endpoint, {
      method: 'POST',
      body: { refreshToken: account.refreshToken },
      proxy
    });

    const d = r.data;
    if (!d?.accessToken) throw new Error('refresh: no accessToken');

    account.accessToken = d.accessToken;
    if (d.refreshToken) account.refreshToken = d.refreshToken;
    account.refreshedAt = new Date().toISOString();

    saveStore(store);
    return account;
  } finally {
    refreshLocks.delete(key);
    release();
  }
}

async function ensureFresh(account, store, proxy) {
  const left = secondsLeft(account.accessToken);
  if (left > 300) return;
  if (!QUIET) console.log(C.gr(`  🔄 refreshing (exp ${left}s)`));

  try {
    await refreshAccount(account, store, proxy);
  } catch (e) {
    if (e.status === 401 && CFG.reloginOn401 && CFG.autoRelogin) {
      console.log(C.y(`  🔁 refresh dead → full relogin via Gmail OTP`));
      await reloginAccount(account, store, proxy);
    } else {
      throw e;
    }
  }
}

// ─────────── auto relogin ───────────
async function reloginAccount(account, store, proxy) {
  const accounts = loadAccounts(ACCOUNTS_FILE);
  const cfg = accounts.find(a =>
    a.email === account.email ||
    a.email === account.identifier ||
    a.label === account.label
  );
  if (!cfg) throw new Error(`no matching entry in ${ACCOUNTS_FILE} for ${account.email || account.label}`);

  const fresh = await loginOne(cfg, proxy);
  if (!fresh) throw new Error('relogin failed');

  Object.assign(account, fresh);
  saveStore(store);
  console.log(C.g(`  ✅ relogged in as ${account.username}`));
  return account;
}

// ─────────── referral ───────────
async function silentReferral(account, proxy) {
  if (!CFG.referralCode) return false;
  try {
    const me = await raw('/users/me', { token: account.accessToken, proxy });
    if (me.data?.referredBy) return false;
    await raw('/referral/apply', {
      method: 'POST',
      body: { code: CFG.referralCode },
      token: account.accessToken,
      proxy
    });
    account.referralAppliedAt = new Date().toISOString();
    return true;
  } catch { return false; }
}

// ─────────── authenticated call ───────────
async function callWithAuth(pathname, account, store, proxy, opts = {}) {
  try {
    return await raw(pathname, { ...opts, token: account.accessToken, proxy });
  } catch (e) {
    if (e.status !== 401) throw e;

    try {
      if (!QUIET) console.log(C.gr(`  🔄 401 → refresh`));
      await refreshAccount(account, store, proxy);
      return await raw(pathname, { ...opts, token: account.accessToken, proxy });
    } catch (e2) {
      if (!CFG.reloginOn401 || !CFG.autoRelogin) throw e2;
      console.log(C.y(`  🔁 refresh dead → full relogin`));
      await reloginAccount(account, store, proxy);
      return await raw(pathname, { ...opts, token: account.accessToken, proxy });
    }
  }
}

// ─────────── cycle ───────────
async function cycle(account, store, proxy) {
  const tag = account.label || account.username;
  const t = C.c(pad(`[${tag}]`, 14));

  await ensureFresh(account, store, proxy);
  await silentReferral(account, proxy);

  const d0 = (await callWithAuth('/mining/status', account, store, proxy)).data;
  const s0 = d0.session || {};

  if (d0.canActivate && !s0.isRunning) {
    try {
      await callWithAuth('/mining/start', account, store, proxy, { method: 'POST' });
      console.log(`${t} ${C.g('🚀')} session started`);
    } catch (e) {
      console.log(`${t} ${C.y('⚠️')}  start: ${e.message}`);
    }
  }

  const cap = s0.adMaxPerSession ?? d0.adMaxPerSession ?? 3;
  let watched = s0.adsWatched ?? 0;

  while (watched < cap) {
    try {
      const r = await callWithAuth('/mining/ad', account, store, proxy, { method: 'POST' });
      watched = r.data.session?.adsWatched ?? watched + 1;
      const boost = r.data.session?.adBoostPct ?? 0;
      console.log(`${t} ${C.m('📺')} ad ${watched}/${cap}  ${C.g('+' + boost + '%')}`);
    } catch (e) {
      if (e.status === 429) {
        console.log(`${t} ${C.y('🛑 429 — waiting 30s')}`);
        await sleep(30000);
        continue;
      }
      if (e.status === 409) {
        console.log(`${t} ${C.y('⏳ 409 — next ad not ready, waiting 15s')}`);
        await sleep(15000);
        continue;
      }
      console.log(`${t} ${C.y('⚠️')}  ad: ${e.message}`);
      break;
    }
    await sleep(randInt(600, 1800));
  }

  const fresh = (await callWithAuth('/mining/status', account, store, proxy)).data;
  let claimed = 0;
  if (fresh.canClaim && fresh.claimableAmount > 0) {
    try {
      const start = await callWithAuth('/mining/claim', account, store, proxy, { method: 'POST' });
      const claimId = start.data.claimId;
      let final = null;
      for (let i = 0; i < 10; i++) {
        await sleep(3000);
        const r = await callWithAuth(`/mining/claim/${claimId}`, account, store, proxy);
        final = r.data;
        if (final.status === 'completed' || final.status === 'failed') break;
      }
      if (final?.status === 'completed') {
        account.user.balance = final.balanceAfter;
        claimed = final.amount;
        console.log(`${t} ${C.g('💰')} claimed ${C.bold(fmt(final.amount))} → ${C.bold(fmt(final.balanceAfter))}`);
        notifyWebhook(`💰 **${tag}** claimed ${fmt(final.amount)} → ${fmt(final.balanceAfter)}`);
      } else {
        console.log(`${t} ${C.y('⚠️')}  claim status=${final?.status}`);
      }
    } catch (e) {
      console.log(`${t} ${C.y('⚠️')}  claim: ${e.message}`);
    }
  }

  const after = (await callWithAuth('/mining/status', account, store, proxy)).data;
  const run = after.session?.isRunning ? C.g('✓') : C.r('✗');
  const ads = `${after.session?.adsWatched ?? 0}/${after.session?.adMaxPerSession ?? 3}`;
  const boost = `+${after.session?.adBoostPct ?? 0}%`;
  console.log(
    `${t} ${C.w('bal=' + C.bold(fmt(after.balance)))}  ${run}  ` +
    `${C.m('ads=' + ads)}  ${C.g(boost)}  ${C.c(fmt(after.currentHourlyReward) + '/hr')}`
  );

  appendCsv(account, after, claimed);
  saveStore(store);

  const s = after.session || {};
  const events = [];
  if (s.nextAdAt) events.push(new Date(s.nextAdAt).getTime());
  if (s.endsAt)   events.push(new Date(s.endsAt).getTime());
  if (after.canClaim && s.endsAt) events.push(new Date(s.endsAt).getTime());

  const soonest = events.filter(x => x > Date.now()).sort((a, b) => a - b)[0];
  return soonest || null;
}

// ─────────── main ───────────
async function main() {
  console.log('');
  console.log(C.bold(C.c('╔════════════════════════════════════════════════╗')));
  console.log(C.bold(C.c('║   ⛏️   Sible Mining Runner (auto-OTP)         ║')));
  console.log(C.bold(C.c('╚════════════════════════════════════════════════╝')));
  console.log('');

  console.log(C.gr('  ℹ️  gmailAppPassword = 16-char App Password from'));
  console.log(C.gr('     https://myaccount.google.com/apppasswords'));
  console.log(C.gr('     (NOT your normal Gmail password)'));
  console.log('');

  // load accounts.json
  let accountCfg;
  try { accountCfg = loadAccounts(ACCOUNTS_FILE); }
  catch (e) { console.log(C.r(`❌ ${e.message}`)); process.exit(1); }

  if (!accountCfg.length) {
    console.log(C.r(`❌ no accounts in ${ACCOUNTS_FILE}`));
    process.exit(1);
  }
  console.log(C.c(`📋 ${accountCfg.length} account(s) in ${ACCOUNTS_FILE}`));
  console.log('');

  // ───── Connection Mode Menu ─────
  const proxies = loadProxies(PROXY_FILE);

  console.log(C.w('  ┌─ Connection Mode ─────────────────────────┐'));
  console.log(C.w('  │  [1] Direct (no proxy)                    │'));
  console.log(C.w(`  │  [2] Proxy (${proxies.length} in ${PROXY_FILE})`.padEnd(46) + '│'));
  console.log(C.w('  └───────────────────────────────────────────┘'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const choice = (await new Promise(r => rl.question(C.y('  choose [1/2]: '), r))).trim();
  rl.close();

  let useProxy = false;
  let liveProxies = [];

  if (choice === '2') {
    if (!proxies.length) {
      console.log(C.r(`  ❌ no proxies in ${PROXY_FILE} — falling back to direct`));
    } else {
      liveProxies = await healthCheckProxies(proxies);
      if (!liveProxies.length) {
        console.log(C.r('  ❌ all proxies dead — falling back to direct'));
      } else {
        useProxy = true;
        console.log(C.g(`  ✅ using ${liveProxies.length} live proxy(ies)`));
      }
    }
  } else {
    console.log(C.gr('  🚫 direct mode'));
  }
  console.log('');

  // load or bootstrap tokens
  const store = loadStore();
  let accounts = store.accounts || [];

  const needLogin = accountCfg.filter(cfg => {
    return !accounts.find(a =>
      a.email === cfg.email || a.identifier === cfg.email || a.label === cfg.label
    );
  });

  if (needLogin.length) {
    console.log(C.c(`🔐 logging in ${needLogin.length} account(s) via Gmail OTP...`));
    for (const cfg of needLogin) {
      const proxy = useProxy ? rnd(liveProxies) : null;
      const acc = await loginOne(cfg, proxy);
      if (acc) { accounts.push(acc); store.accounts = accounts; saveStore(store); }
      await sleep(randInt(2000, 5000));
    }
  }

  if (ONLY) {
    accounts = accounts.filter(a => a.label === ONLY || a.username === ONLY || a.email === ONLY || a.identifier === ONLY);
    if (!accounts.length) { console.log(C.r(`❌ no match for "${ONLY}"`)); process.exit(1); }
  }
  if (EXCLUDE) {
    accounts = accounts.filter(a => a.label !== EXCLUDE && a.username !== EXCLUDE && a.email !== EXCLUDE && a.identifier !== EXCLUDE);
  }
  if (!accounts.length) { console.log(C.r('❌ no accounts')); process.exit(1); }

  console.log('');
  console.log(C.c(`🎯 ${accounts.length} account(s) · adaptive loop (max ${INTERVAL / 1000}s)${QUIET ? ' · quiet' : ''}`));
  console.log('');

  let stop = false;
  process.on('SIGINT', () => {
    console.log(C.y('\n⏸️  stopping after current cycle...'));
    stop = true;
  });

  do {
    const t0 = Date.now();
    console.log(C.gr(`──── ${new Date().toISOString()} ────`));

    const shuffled = [...accounts].sort(() => Math.random() - 0.5);
    let nextWakeMs = Infinity;

    for (const acc of shuffled) {
      if (stop) break;
      let proxy = useProxy ? rnd(liveProxies) : null;
      try {
        const soonest = await cycle(acc, store, proxy);
        if (soonest && soonest < nextWakeMs) nextWakeMs = soonest;
      } catch (e) {
        console.log(C.r(`[${acc.label || acc.username}] ❌ ${e.message}`));
        if (DEBUG_REFRESH && e.body) console.log(C.gr('   ' + JSON.stringify(e.body).slice(0, 200)));
        notifyWebhook(`❌ **${acc.label || acc.username}** ${e.message}`);
      }
      const wait = randInt(CFG.minDelayBetweenAccountsSec * 1000, CFG.maxDelayBetweenAccountsSec * 1000);
      if (!QUIET) console.log(C.gr(`[${acc.label || acc.username}] 💤 ${(wait / 1000).toFixed(1)}s`));
      await sleep(wait);
    }

    saveStore(store);
    if (!LOOP || stop) break;

    const fallback = INTERVAL;
    let sleepMs;
    if (Number.isFinite(nextWakeMs)) {
      sleepMs = Math.max(10_000, nextWakeMs - Date.now() + randInt(2000, 8000));
    } else {
      sleepMs = fallback;
    }
    sleepMs = Math.min(sleepMs, fallback);

    const jitter = randInt(-CFG.jitterSec * 1000, CFG.jitterSec * 1000);
    const wait = Math.max(10_000, sleepMs + jitter);

    console.log('');
    console.log(C.gr(`💤 sleeping ${Math.ceil(wait / 1000)}s...`));
    console.log('');
    await sleep(wait);
  } while (!stop);

  console.log(C.g('\n👋 done.'));
}

main().catch(e => { console.error(C.r(e.message || e)); process.exit(1); });