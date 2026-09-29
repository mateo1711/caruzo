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
  HOME_USER = '', PORT = 3000, DISCORD_BOT_TOKEN = '', SITE_PASSWORD = '0x5c28182!',
  SUPABASE_URL = '', SUPABASE_SERVICE_ROLE_KEY = '', SUPABASE_BUCKET = 'caruzo-uploads',
} = process.env;
const REDIRECT = `${BASE_URL}/auth/callback`;
// Set DATA_DIR=/var/data and UPLOAD_DIR=/var/data/uploads on Render with a Persistent Disk.
// This keeps profiles and uploaded media across deploys.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UP_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'users.json');
[DATA_DIR, UP_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
const SUPABASE_ENABLED = !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const sbHeaders = (extra = {}) => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  ...extra,
});

async function hydrateFromSupabase() {
  if (!SUPABASE_ENABLED) return;
  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles?select=id,data`, { headers: sbHeaders() });
    if (!r.ok) throw new Error(`Supabase load ${r.status}`);
    const rows = await r.json();
    for (const row of rows) if (row && row.id && row.data) db[String(row.id)] = row.data;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    console.log(`Supabase: ${rows.length} Profil(e) geladen.`);
  } catch (e) {
    console.error('Supabase konnte nicht geladen werden:', e.message);
  }
}

async function saveUser(user) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  if (!SUPABASE_ENABLED || !user?.id) return;
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles?on_conflict=id`;
  await fetch(endpoint, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([{ id: String(user.id), data: user }]),
  }).then(r => { if (!r.ok) console.error('Supabase save:', r.status); }).catch(e => console.error('Supabase save:', e.message));
}

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

const NITRO_TIERS = {
  beginner: { key: 'beginner', label: 'Beginner', asset: '/nitro/nitro-beginner.png' },
  bronze: { key: 'bronze', label: 'Bronze · 1 Monat', asset: '/nitro/nitro-bronze.png' },
  silver: { key: 'silver', label: 'Silber · 3 Monate', asset: '/nitro/nitro-silver.png' },
  gold: { key: 'gold', label: 'Gold · 6 Monate', asset: '/nitro/nitro-gold.png' },
  platinum: { key: 'platinum', label: 'Platin · 1 Jahr', asset: '/nitro/nitro-platinum.png' },
  diamond: { key: 'diamond', label: 'Diamant · 2 Jahre', asset: '/nitro/nitro-diamond.png' },
  emerald: { key: 'emerald', label: 'Smaragd · 3 Jahre', asset: '/nitro/nitro-emerald.png' },
  ruby: { key: 'ruby', label: 'Rubin · 5 Jahre', asset: '/nitro/nitro-ruby.png' },
  opal: { key: 'opal', label: 'Opal · 6+ Jahre', asset: '/nitro/nitro-opal.png' },
};

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
const discordInvite = v => {
  v = str(v, 180).trim();
  if (!v) return '';
  if (/^[A-Za-z0-9_-]{2,64}$/.test(v)) return `https://discord.gg/${v}`;
  if (/^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9_-]+\/?$/i.test(v)) {
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }
  return url(v);
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
    design: {
      nameEffect: 'standard', nameColor: '#f6eff2', accentColor: '#8b5cf6',
      avatarFrameEffect: 'glow', avatarFrameColor: '#8b5cf6', avatarFrameWidth: 2, avatarShape: 'circle',
      cardStyle: 'glass', cardOpacity: 72, cardBlur: 22, cardRadius: 26, borderOpacity: 12,
      cardGlow: 18, glassSaturation: 120, avatarSize: 132, socialRadius: 18, profileWidth: 1000,
      contentAlign: 'left', socialLayout: 'grid', socialEffect: 'lift', badgeStyle: 'icon',
    },
    viewsStyle: { visible: true, corner: 'top-right', effect: 'glow', backgroundOpacity: 22, borderOpacity: 14, eyeOpacity: 92, countOpacity: 88 },
    pageFx: { type: 'grid', color: '#8b5cf6', secondary: '#ff2e93', opacity: 18, density: 44, speed: 9 },
    cursor: { effect: 'none', image: 'system', svg: '' },
    browser: { effect: 'rotate', speed: 1500, messages: [] },
    settings: { showBanner: false, showDecoration: true, showBadges: true, showTag: true, showStatus: true, manualNitro: false, nitroTier: '' },
    background: { type: 'image', url: '', blur: 6, dim: 55, effect: 'none', videoSound: true, videoVolume: 30 },
    music: { url: '', title: '', volume: 40 },
    soundMode: 'auto',
    spotify: '',
    spotifyStyle: { blur: 26, glow: 24 },
    floating: [],
    links: { steam: [], twitch: '', tiktok: '', x: '', epic: '', valorant: '', discordServer: '', instagram: '', youtube: '', github: '', bluesky: '', custom: [] },
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
  const des=b.design||{};
  const color=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:d;
  user.design={
    nameEffect:['standard','gradient','neon','toon','rubber','typewriter','chrome','shimmer','glitch','wave'].includes(des.nameEffect)?des.nameEffect:'standard',
    nameColor:color(des.nameColor,'#f6eff2'), accentColor:color(des.accentColor,'#8b5cf6'),
    avatarFrameEffect:['none','glow','pulse','spin','rainbow','electric','scan','hologram','orbit','comet','dual','ripple','eclipse','glitch'].includes(des.avatarFrameEffect)?des.avatarFrameEffect:'glow',
    avatarFrameColor:color(des.avatarFrameColor,'#8b5cf6'), avatarFrameWidth:num(des.avatarFrameWidth,0,8,2),
    avatarShape:['circle','squircle','rounded','square'].includes(des.avatarShape)?des.avatarShape:'circle',
    cardStyle:['glass','solid','outline','frosted','minimal'].includes(des.cardStyle)?des.cardStyle:'glass',
    cardOpacity:num(des.cardOpacity,20,100,72), cardBlur:num(des.cardBlur,0,50,22), cardRadius:num(des.cardRadius,8,40,26), borderOpacity:num(des.borderOpacity,0,60,12),
    cardGlow:num(des.cardGlow,0,100,18), glassSaturation:num(des.glassSaturation,70,180,120), avatarSize:num(des.avatarSize,92,160,132),
    socialRadius:num(des.socialRadius,8,28,18), profileWidth:num(des.profileWidth,680,1100,1000),
    contentAlign:['left','center'].includes(des.contentAlign)?des.contentAlign:'left',
    socialLayout:['grid','list','compact'].includes(des.socialLayout)?des.socialLayout:'grid',
    socialEffect:['none','lift','glow','shine'].includes(des.socialEffect)?des.socialEffect:'lift',
    badgeStyle:['icon','pill','glass'].includes(des.badgeStyle)?des.badgeStyle:'icon',
  };
  const vs=b.viewsStyle||{}; user.viewsStyle={visible:vs.visible!==false,corner:['top-left','top-right','bottom-left','bottom-right'].includes(vs.corner)?vs.corner:'top-right',effect:['none','glow','pulse','scan','blur'].includes(vs.effect)?vs.effect:'glow',backgroundOpacity:num(vs.backgroundOpacity,0,100,22),borderOpacity:num(vs.borderOpacity,0,100,14),eyeOpacity:num(vs.eyeOpacity,0,100,92),countOpacity:num(vs.countOpacity,0,100,88)};
  const pf=b.pageFx||{}; user.pageFx={type:['none','grid','matrix','rays','scanlines','stars','mesh','nebula','noise','orbs','rain'].includes(pf.type)?pf.type:'grid',color:color(pf.color,'#8b5cf6'),secondary:color(pf.secondary,'#ff2e93'),opacity:num(pf.opacity,0,80,18),density:num(pf.density,16,96,44),speed:num(pf.speed,2,30,9)};
  const cur=b.cursor||{}; user.cursor={effect:['none','spark','trail','snow','hearts','fire','magic','orbit','matrix'].includes(cur.effect)?cur.effect:'none',image:['system','crosshair','dot','ring','cross','arrow','star'].includes(cur.image)?cur.image:'system',svg:str(cur.svg,4000)};
  const br=b.browser||{}; user.browser={effect:['rotate','type','marquee','pulse'].includes(br.effect)?br.effect:'rotate',speed:num(br.speed,300,6000,1500),messages:(Array.isArray(br.messages)?br.messages:[]).slice(0,10).map(x=>str(x,80)).filter(Boolean)};
  const s = b.settings || {};
  user.settings = Object.fromEntries(['showBanner', 'showDecoration', 'showBadges', 'showTag', 'showStatus', 'manualNitro'].map(k => [k, !!s[k]]));
  user.settings.nitroTier = ['','beginner','bronze','silver','gold','platinum','diamond','emerald','ruby','opal'].includes(s.nitroTier) ? s.nitroTier : '';
  const bg = b.background || {};
  user.background = { type: bg.type === 'video' ? 'video' : 'image', url: url(bg.url), blur: num(bg.blur, 0, 30, 6), dim: num(bg.dim, 0, 90, 55), effect: ['none','aurora','plasma','dither','float','tilt','zoom','pulse','levitate','breathe','sway','glitch','shimmer'].includes(bg.effect) ? bg.effect : 'none', videoSound: bg.videoSound !== false, videoVolume: num(bg.videoVolume, 0, 100, 30) };
  const m = b.music || {};
  user.music = { url: url(m.url), title: str(m.title, 80), volume: num(m.volume, 0, 100, 40) };
  user.soundMode = ['auto','music','video','mute'].includes(b.soundMode) ? b.soundMode : 'auto';
  user.spotify = url(b.spotify);
  const sp = b.spotifyStyle || {};
  user.spotifyStyle = { blur: num(sp.blur, 0, 50, 26), glow: num(sp.glow, 0, 100, 24) };
  user.floating = (Array.isArray(b.floating) ? b.floating : []).slice(0, 8).map(x => str(x, 32)).filter(Boolean);
  const l = b.links || {};
  user.links = {
    steam: (Array.isArray(l.steam) ? l.steam : []).slice(0, 10).map(x => ({ name: str(x.name, 40), url: url(x.url) })).filter(x => x.url),
    twitch: url(l.twitch),
    tiktok: url(l.tiktok),
    x: url(l.x),
    epic: str(l.epic, 64).trim(),
    valorant: str(l.valorant, 64).trim(),
    discordServer: discordInvite(l.discordServer),
    instagram: url(l.instagram), youtube: url(l.youtube), github: url(l.github), bluesky: url(l.bluesky),
    custom: (Array.isArray(l.custom) ? l.custom : []).slice(0, 12).map(x => ({ label: str(x.label, 30), url: url(x.url) })).filter(x => x.url),
  };
  return null;
}

function publicView(u) {
  const { auth, ...rest } = u; // Tokens niemals ausliefern
  const d = { ...rest.discord };
  const manualNitro = !!rest.settings?.manualNitro;
  const tier = NITRO_TIERS[rest.settings?.nitroTier || ''];
  d.nitroVerified = !!d.nitro;
  d.nitro = manualNitro || d.nitroVerified;
  d.badges = Array.isArray(d.badges) ? [...d.badges].filter(b => b.key !== 'nitro') : [];
  if (d.nitro) {
    d.badges.unshift(tier
      ? { key: 'nitro', name: `Discord Nitro · ${tier.label}`, asset: tier.asset, emoji: '💎', tier: tier.key }
      : NITRO);
  }
  return { ...rest, discord: d };
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

// Private Hauptseite: Passwort wird nur auf dem Server geprüft.
const siteUnlocked = (req, res, next) => req.session.siteUnlocked ? next() : res.redirect('/login');
app.get('/login', (req, res) => req.session.siteUnlocked ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'private-login.html')));
app.get('/private-login', (req, res) => res.redirect(301, '/login'));
app.post('/api/private-login', (req, res) => {
  const supplied = String(req.body?.password || '');
  const expected = String(SITE_PASSWORD || '');
  if (!expected) return res.status(503).json({ error: 'SITE_PASSWORD ist nicht konfiguriert' });
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ error: 'Falsches Passwort' });
  req.session.siteUnlocked = true;
  res.json({ ok: true });
});
app.post('/api/private-logout', (req, res) => { req.session.siteUnlocked = false; res.json({ ok: true }); });
app.get('/api/session-info', siteUnlocked, (req, res) => {
  const user = req.session.uid && db[req.session.uid] ? db[req.session.uid] : null;
  if (!user) return res.json({ authenticated: false });
  const view = publicView(user);
  res.json({ authenticated: true, user: { username: view.username, name: view.displayName || view.discord?.globalName || view.discord?.username || view.username, avatar: view.discord?.avatar || '' } });
});
app.get('/private-login.html', (req, res) => res.redirect(301, '/login'));
app.get('/dashboard.html', (req, res) => res.redirect(302, '/dashboard'));
app.use((req, res, next) => req.path === '/landing.html' ? siteUnlocked(req, res, next) : next());
app.use('/uploads', express.static(UP_DIR, { setHeaders: r => r.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const auth = (req, res, next) => (req.session.uid && db[req.session.uid] ? next() : res.status(401).json({ error: 'Nicht eingeloggt' }));

// --- Discord OAuth ---
app.get('/auth/discord', siteUnlocked, (req, res) => {
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
    await saveUser(user);
    req.session.uid = dc.id;
    res.redirect('/dashboard');
  } catch (e) { console.error(e); res.status(500).send('Login fehlgeschlagen.'); }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

// --- Dashboard-API ---
app.get('/api/me', auth, (req, res) => res.json(publicView(db[req.session.uid])));

app.post('/api/me', auth, async (req, res) => {
  const user = db[req.session.uid];
  const err = applyUpdate(user, req.body);
  if (err) return res.status(400).json({ error: err });
  await saveUser(user);
  res.json(publicView(user));
});

// Bot Verify: validates that the Discord user ID exists via a bot token.
// Important: Discord's bot User object does not expose premium_type, so Nitro itself remains OAuth-verified.
app.post('/api/bot-verify', auth, async (req,res)=>{
  if(!DISCORD_BOT_TOKEN) return res.status(400).json({error:'DISCORD_BOT_TOKEN fehlt in .env'});
  const id=db[req.session.uid].discord.id;
  const r=await fetch('https://discord.com/api/v10/users/'+id,{headers:{Authorization:'Bot '+DISCORD_BOT_TOKEN}});
  if(!r.ok) return res.status(r.status).json({error:'Bot konnte User-ID nicht verifizieren'});
  const u=await r.json();
  res.json({verified:true,id:u.id,username:u.username,nitro:db[req.session.uid].discord.nitro, nitroSource:'oauth'});
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
  await saveUser(user);
  res.json(publicView(user));
});

const EXT = {
  background: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm'],
  music: ['.mp3', '.ogg', '.wav', '.m4a'],
};
const localUpload = multer({
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
const cloudUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, f, cb) => {
    const ok = (EXT[req.params.kind] || []).includes(path.extname(f.originalname).toLowerCase());
    cb(ok ? null : new Error('Dateityp nicht erlaubt'), ok);
  },
});
app.post('/api/upload/:kind', auth, (req, res) => {
  const handler = SUPABASE_ENABLED ? cloudUpload.single('file') : localUpload.single('file');
  handler(req, res, async err => {
    if (err || !req.file) return res.status(400).json({ error: err ? err.message : 'Keine Datei' });
    if (!SUPABASE_ENABLED) return res.json({ url: '/uploads/' + req.file.filename });
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const key = `${req.session.uid}/${req.params.kind}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const base = SUPABASE_URL.replace(/\/$/, '');
      const r = await fetch(`${base}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST',
        headers: sbHeaders({ 'Content-Type': req.file.mimetype || 'application/octet-stream', 'x-upsert': 'true' }),
        body: req.file.buffer,
      });
      if (!r.ok) throw new Error(`Storage Upload ${r.status}: ${await r.text()}`);
      res.json({ url: `${base}/storage/v1/object/public/${encodeURIComponent(SUPABASE_BUCKET)}/${key.split('/').map(encodeURIComponent).join('/')}` });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Cloud-Upload fehlgeschlagen. Prüfe Supabase-Bucket und Environment Variablen.' }); }
  });
});

// --- Öffentliche API ---
const VIEW_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const recentViews = new Map();
function shouldCountView(req, user) {
  const ua = String(req.get('user-agent') || '').slice(0, 220);
  if (/bot|crawler|spider|preview|discordbot|twitterbot|slackbot|whatsapp/i.test(ua)) return false;
  const now = Date.now();
  req.session.profileViews ||= {};
  const sessionLast = Number(req.session.profileViews[user.id] || 0);
  req.session.profileViews[user.id] = now;
  const fp = crypto.createHash('sha256').update(`${req.ip || ''}|${ua}|${user.id}`).digest('hex').slice(0, 32);
  const fingerprintLast = Number(recentViews.get(fp) || 0);
  recentViews.set(fp, now);
  if (recentViews.size > 5000) {
    for (const [k, t] of recentViews) if (now - t > VIEW_COOLDOWN_MS) recentViews.delete(k);
  }
  return now - sessionLast >= VIEW_COOLDOWN_MS && now - fingerprintLast >= VIEW_COOLDOWN_MS;
}
const findByName = n => Object.values(db).find(u => u.username === String(n).toLowerCase());
app.get('/api/profile/:name', async (req, res) => {
  const user = req.params.name === '__home__' ? findByName(HOME_USER) : findByName(req.params.name);
  if (!user) return res.status(404).json({ error: 'Profil nicht gefunden' });
  if (shouldCountView(req, user)) {
    user.views = (user.views || 0) + 1;
    await saveUser(user);
  }
  res.json(publicView(user));
});

// --- Seiten ---
const page = f => (req, res) => res.sendFile(path.join(__dirname, 'public', f));
app.get('/', siteUnlocked, (req, res) => (HOME_USER && findByName(HOME_USER) ? page('profile.html')(req, res) : page('landing.html')(req, res)));
app.get('/u/:name', (req, res) => res.redirect(301, '/' + encodeURIComponent(req.params.name)));
app.get('/dashboard', siteUnlocked, (req, res) => (req.session.uid && db[req.session.uid] ? page('dashboard.html')(req, res) : res.redirect('/auth/discord')));
// Profil unter /name – muss ganz am Ende stehen, damit alle anderen Routen Vorrang haben
app.get('/:name', (req, res, next) => {
  const n = req.params.name.toLowerCase();
  if (!/^[a-z0-9_.-]{2,24}$/.test(n) || RESERVED.includes(n)) return next();
  res.status(findByName(n) ? 200 : 404).sendFile(path.join(__dirname, 'public', 'profile.html'));
});

hydrateFromSupabase().finally(() => app.listen(PORT, '0.0.0.0', () => console.log(`Läuft auf ${BASE_URL} (Port ${PORT})`)));
