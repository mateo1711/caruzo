require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  DISCORD_CLIENT_ID: CID, DISCORD_CLIENT_SECRET: SECRET,
  BASE_URL = 'http://localhost:3000', SESSION_SECRET = 'change-me',
  HOME_USER = '', PORT = 3000,
} = process.env;
const REDIRECT = `${BASE_URL}/auth/callback`;
const DATA_DIR = path.join(__dirname, 'data');
const UP_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'users.json');
[DATA_DIR, UP_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

/* ------------------------------------------------------------------ */
/* Discord Badges (Bit-Flags aus public_flags)                         */
/* icon = Hash im Discord-CDN, emoji = Fallback falls Hash nicht lädt  */
/* ------------------------------------------------------------------ */
const BADGES = [
  { key: 'staff',        flag: 1 << 0,  name: 'Discord Staff',            icon: '5e74e9b61934fc1f67c65515d1f7e60d', emoji: '🛡️' },
  { key: 'partner',      flag: 1 << 1,  name: 'Partnered Server Owner',   icon: '3f9748e53446a137a052f3454e2de41e', emoji: '🤝' },
  { key: 'hypesquad',    flag: 1 << 2,  name: 'HypeSquad Events',         icon: 'bf01d1073931f921909045f3a39fd264', emoji: '🎉' },
  { key: 'bug1',         flag: 1 << 3,  name: 'Bug Hunter',               icon: '2717692c7dca7289b35297368a940dd0', emoji: '🐛' },
  { key: 'bravery',      flag: 1 << 6,  name: 'HypeSquad Bravery',        icon: '8a88d63823d8a71cd5e390baa45efa02', emoji: '🟣' },
  { key: 'brilliance',   flag: 1 << 7,  name: 'HypeSquad Brilliance',     icon: '011940fd013da3f7fb926e4a1cd2e618', emoji: '🟠' },
  { key: 'balance',      flag: 1 << 8,  name: 'HypeSquad Balance',        icon: '3aa41de486fa12454c3761e8e223442e', emoji: '🟢' },
  { key: 'early',        flag: 1 << 9,  name: 'Early Supporter',          icon: '7060786766c9c840eb3019e725d2b358', emoji: '⭐' },
  { key: 'bug2',         flag: 1 << 14, name: 'Bug Hunter Gold',          icon: '848f79194d4be5ff5f81505cbd0ce1e6', emoji: '🐞' },
  { key: 'verified_dev', flag: 1 << 17, name: 'Early Verified Bot Dev',   icon: '6df5892e37d40b1e0a1e0a8e2b1a2f4',  emoji: '🤖' },
  { key: 'cert_mod',     flag: 1 << 18, name: 'Certified Moderator',      icon: 'fee1624003e2fee35cb398e125dc479b', emoji: '🔨' },
  { key: 'active_dev',   flag: 1 << 22, name: 'Active Developer',         icon: '6bdc42827a38498929a4920da12695d9', emoji: '💻' },
];
const NITRO = { key: 'nitro', name: 'Discord Nitro', icon: '2ba85e8026a8614b640c2837bcdfe21b', emoji: '💎' };
// Nitro-Laufzeit-Badges. Discord liefert die Laufzeit nicht über die API -> Stufe wird aus dem
// im Dashboard angegebenen Nitro-Startmonat berechnet. Ohne Angabe: Beginner.
// Fällt ein Icon-Hash aus, zeigt das Profil automatisch das Emoji.
const NITRO_TIERS = [
  { min: 72, key: 'opal',     name: 'Nitro Opal',     icon: '5b154df19c53dce2af92c9b61e6be5e2', emoji: '🔮' },
  { min: 36, key: 'ruby',     name: 'Nitro Rubin',    icon: 'cd5e2cfd9d7f27a707b6a7ff1e07f5e9', emoji: '♦️' },
  { min: 24, key: 'emerald',  name: 'Nitro Smaragd',  icon: '11e2d339068b55d3a506cff34d3780f3', emoji: '💚' },
  { min: 12, key: 'diamond',  name: 'Nitro Diamant',  icon: '0d61871f72bb9a33a7ae568c1fb4f20a', emoji: '💠' },
  { min: 6,  key: 'platinum', name: 'Nitro Platin',   icon: '0334688279c8359120922938dcb1d6f8', emoji: '🥈' },
  { min: 3,  key: 'gold',     name: 'Nitro Gold',     icon: '2895086c18d5531d499862e41d1155a6', emoji: '🥇' },
  { min: 2,  key: 'silver',   name: 'Nitro Silber',   icon: '4514fab914bdbfb4ad2fa23df76121a6', emoji: '⚪' },
  { min: 1,  key: 'bronze',   name: 'Nitro Bronze',   icon: '4f33c4a9c64ce221936bd256c356f91f', emoji: '🥉' },
  { min: 0,  key: 'beginner', name: 'Nitro Beginner', icon: NITRO.icon,                        emoji: '💎' },
];
const monthsSince = ym => {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!m) return 0;
  const n = new Date();
  return Math.max(0, (n.getFullYear() - +m[1]) * 12 + (n.getMonth() + 1 - +m[2]));
};
const nitroTier = ym => NITRO_TIERS.find(t => monthsSince(ym) >= t.min);
// Kann die API nicht liefern -> im Dashboard manuell schaltbar
const MANUAL_BADGES = { boost: { key: 'boost', name: 'Server Booster', icon: '', emoji: '🚀' } };

const cdn = 'https://cdn.discordapp.com';
function mapDiscord(u) {
  const ext = h => (h && h.startsWith('a_') ? 'gif' : 'png');
  const flags = u.public_flags || 0;
  const badges = BADGES.filter(b => (flags & b.flag) !== 0).map(({ key, name, icon, emoji }) => ({ key, name, icon, emoji }));
  if (u.premium_type > 0) badges.unshift(NITRO);
  const pg = u.primary_guild;
  return {
    id: u.id,
    username: u.username,
    globalName: u.global_name || u.username,
    avatar: u.avatar
      ? `${cdn}/avatars/${u.id}/${u.avatar}.${ext(u.avatar)}?size=512`
      : `${cdn}/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`,
    banner: u.banner ? `${cdn}/banners/${u.id}/${u.banner}.${ext(u.banner)}?size=1024` : null,
    bannerColor: u.accent_color != null ? '#' + u.accent_color.toString(16).padStart(6, '0') : null,
    decoration: u.avatar_decoration_data
      ? `${cdn}/avatar-decoration-presets/${u.avatar_decoration_data.asset}.png?size=160&passthrough=true` : null,
    nitro: u.premium_type > 0,
    badges,
    serverTag: pg && pg.identity_enabled && pg.tag
      ? { tag: pg.tag, badge: pg.badge ? `${cdn}/guild-tag-badges/${pg.identity_guild_id}/${pg.badge}.png?size=64` : null }
      : null,
    syncedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const str = (v, n = 200) => (typeof v === 'string' ? v.slice(0, n) : '');
const url = v => {
  v = str(v, 500).trim();
  if (!v) return '';
  if (/^\/uploads\/[a-f0-9]+\.[a-z0-9]+$/.test(v)) return v;
  try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) ? u.toString() : ''; } catch { return ''; }
};
const num = (v, min, max, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d; };
const slug = v => str(v, 24).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
const RESERVED = ['api', 'auth', 'u', 'uploads', 'dashboard', 'logout', 'login', 'admin', 'static', 'landing', 'profile', 'favicon.ico', 'robots.txt', 'health'];

function defaults(dc) {
  return {
    id: dc.id,
    username: slug(dc.username) || 'user' + dc.id.slice(-4),
    displayName: dc.globalName,
    tagline: 'the end is never the end is never the end',
    about: '',
    enterText: 'click to enter...',
    tags: { label: '', location: '', age: '' },
    cta: { label: '', url: '' },
    settings: { showBanner: false, showDecoration: true, showBadges: true, showTag: true, showStatus: true, boost: false },
    background: { type: 'image', url: '', blur: 6, dim: 55 },
    music: { url: '', title: '', volume: 40 },
    spotify: '',
    nitro: { since: '' },
    links: { steam: [], twitch: '', tiktok: '', custom: [] },
    views: 0,
    createdAt: Date.now(),
  };
}

function applyUpdate(user, b) {
  if (typeof b !== 'object' || !b) return 'Ungültige Daten';
  if (b.username !== undefined) {
    const s = slug(b.username);
    if (s.length < 2) return 'Username: mindestens 2 Zeichen (a-z, 0-9, _ . -)';
    if (RESERVED.includes(s)) return 'Dieser Username ist reserviert';
    if (Object.values(db).some(x => x.id !== user.id && x.username === s)) return 'Username ist schon vergeben';
    user.username = s;
  }
  user.displayName = str(b.displayName, 40) || user.displayName;
  user.tagline = str(b.tagline, 160);
  user.about = str(b.about, 1500);
  user.enterText = str(b.enterText, 60) || 'click to enter...';
  const t = b.tags || {};
  user.tags = { label: str(t.label, 24), location: str(t.location, 24), age: str(t.age, 4) };
  const c = b.cta || {};
  user.cta = { label: str(c.label, 30), url: url(c.url) };
  const s = b.settings || {};
  user.settings = Object.fromEntries(['showBanner', 'showDecoration', 'showBadges', 'showTag', 'showStatus', 'boost'].map(k => [k, !!s[k]]));
  const bg = b.background || {};
  user.background = { type: bg.type === 'video' ? 'video' : 'image', url: url(bg.url), blur: num(bg.blur, 0, 30, 6), dim: num(bg.dim, 0, 90, 55) };
  const m = b.music || {};
  user.music = { url: url(m.url), title: str(m.title, 80), volume: num(m.volume, 0, 100, 40) };
  user.spotify = url(b.spotify);
  const ns = b.nitro && typeof b.nitro.since === 'string' ? b.nitro.since : '';
  const nm = /^(\d{4})-(\d{2})$/.exec(ns);
  const nOk = nm && +nm[1] >= 2015 && +nm[2] >= 1 && +nm[2] <= 12 && ns <= new Date().toISOString().slice(0, 7);
  user.nitro = { since: nOk ? ns : '' };
  const l = b.links || {};
  user.links = {
    steam: (Array.isArray(l.steam) ? l.steam : []).slice(0, 10).map(x => ({ name: str(x.name, 40), url: url(x.url) })).filter(x => x.url),
    twitch: url(l.twitch),
    tiktok: url(l.tiktok),
    custom: (Array.isArray(l.custom) ? l.custom : []).slice(0, 12).map(x => ({ label: str(x.label, 30), url: url(x.url) })).filter(x => x.url),
  };
  return null;
}

function publicView(u) {
  const { auth, ...rest } = u; // Tokens niemals ausliefern
  const d = { ...rest.discord };
  const tier = d.nitro ? nitroTier(u.nitro && u.nitro.since) : null;
  d.badges = (d.badges || []).map(b => (b.key === 'nitro' && tier ? { key: tier.key, name: tier.name, icon: tier.icon, emoji: tier.emoji } : b));
  d.badges = [...d.badges, ...(u.settings.boost ? [MANUAL_BADGES.boost] : [])];
  return { ...rest, nitro: { since: (u.nitro && u.nitro.since) || '' }, nitroTier: tier ? tier.name : null, discord: d };
}

async function discordMe(token) {
  const r = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${token}` } });
  return r.ok ? r.json() : null;
}
async function tokenRequest(params) {
  const r = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: SECRET, ...params }),
  });
  return r.ok ? r.json() : null;
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '200kb' }));
app.use(session({
  secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: BASE_URL.startsWith('https'), maxAge: 30 * 24 * 3600 * 1000 },
}));
app.use('/uploads', express.static(UP_DIR, { setHeaders: r => r.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const auth = (req, res, next) => (req.session.uid && db[req.session.uid] ? next() : res.status(401).json({ error: 'Nicht eingeloggt' }));

// --- Discord OAuth ---
app.get('/auth/discord', (req, res) => {
  if (!CID || !SECRET) return res.status(500).send('DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET fehlen in der .env');
  req.session.state = crypto.randomBytes(16).toString('hex');
  const q = new URLSearchParams({ client_id: CID, redirect_uri: REDIRECT, response_type: 'code', scope: 'identify', state: req.session.state });
  res.redirect(`https://discord.com/oauth2/authorize?${q}`);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.state) return res.status(400).send('Ungültiger Login (state). Bitte erneut versuchen.');
    delete req.session.state;
    const tok = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT });
    if (!tok) return res.status(400).send('Discord hat den Login abgelehnt.');
    const me = await discordMe(tok.access_token);
    if (!me) return res.status(400).send('Discord-Profil konnte nicht geladen werden.');
    const dc = mapDiscord(me);
    const user = db[dc.id] || (db[dc.id] = defaults(dc));
    user.discord = dc;
    user.auth = { access: tok.access_token, refresh: tok.refresh_token };
    save();
    req.session.uid = dc.id;
    res.redirect('/dashboard');
  } catch (e) { console.error(e); res.status(500).send('Login fehlgeschlagen.'); }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

// --- Dashboard-API ---
app.get('/api/me', auth, (req, res) => res.json(publicView(db[req.session.uid])));

app.post('/api/me', auth, (req, res) => {
  const user = db[req.session.uid];
  const err = applyUpdate(user, req.body);
  if (err) return res.status(400).json({ error: err });
  save();
  res.json(publicView(user));
});

// Discord-Daten (Avatar, Banner, Badges, Tag, Decoration) neu laden
app.post('/api/sync', auth, async (req, res) => {
  const user = db[req.session.uid];
  let me = await discordMe(user.auth.access);
  if (!me && user.auth.refresh) {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: user.auth.refresh });
    if (t) { user.auth = { access: t.access_token, refresh: t.refresh_token }; me = await discordMe(t.access_token); }
  }
  if (!me) return res.status(401).json({ error: 'Token abgelaufen – bitte neu einloggen.' });
  user.discord = mapDiscord(me);
  save();
  res.json(publicView(user));
});

const EXT = {
  background: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm'],
  music: ['.mp3', '.ogg', '.wav', '.m4a'],
};
const upload = multer({
  storage: multer.diskStorage({
    destination: UP_DIR,
    filename: (r, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(f.originalname).toLowerCase()),
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, f, cb) => {
    const ok = (EXT[req.params.kind] || []).includes(path.extname(f.originalname).toLowerCase());
    cb(ok ? null : new Error('Dateityp nicht erlaubt'), ok);
  },
});
app.post('/api/upload/:kind', auth, (req, res) => {
  upload.single('file')(req, res, err => {
    if (err || !req.file) return res.status(400).json({ error: err ? err.message : 'Keine Datei' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

// --- Öffentliche API ---
const findByName = n => Object.values(db).find(u => u.username === String(n).toLowerCase());
app.get('/api/profile/:name', (req, res) => {
  const user = req.params.name === '__home__' ? findByName(HOME_USER) : findByName(req.params.name);
  if (!user) return res.status(404).json({ error: 'Profil nicht gefunden' });
  user.views = (user.views || 0) + 1;
  save();
  res.json(publicView(user));
});

// --- Seiten ---
const page = f => (req, res) => res.sendFile(path.join(__dirname, 'public', f));
app.get('/', (req, res) => (HOME_USER && findByName(HOME_USER) ? page('profile.html')(req, res) : page('landing.html')(req, res)));
app.get('/u/:name', (req, res) => res.redirect(301, '/' + encodeURIComponent(req.params.name)));
app.get('/dashboard', (req, res) => (req.session.uid && db[req.session.uid] ? page('dashboard.html')(req, res) : res.redirect('/auth/discord')));
// Profil unter /name – muss ganz am Ende stehen, damit alle anderen Routen Vorrang haben
app.get('/:name', (req, res, next) => {
  const n = req.params.name.toLowerCase();
  if (!/^[a-z0-9_.-]{2,24}$/.test(n) || RESERVED.includes(n)) return next();
  res.status(findByName(n) ? 200 : 404).sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.listen(PORT, () => console.log(`Läuft auf ${BASE_URL} (Port ${PORT})`));
