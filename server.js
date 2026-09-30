require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const {
  DISCORD_CLIENT_ID: CID, DISCORD_CLIENT_SECRET: SECRET,
  BASE_URL: BASE_URL_RAW = 'http://localhost:3000', SESSION_SECRET = 'change-me',
  HOME_USER = '', PORT = 3000, DISCORD_BOT_TOKEN = '', SITE_PASSWORD = '0x5c28182!',
  SUPABASE_URL = '', SUPABASE_SERVICE_ROLE_KEY = '', SUPABASE_BUCKET = 'caruzo-uploads',
  ADMIN_DISCORD_IDS = '219224335670312960',
  DISCORD_BOOST_GUILD_ID = '',
  SPOTIFY_CLIENT_ID = '', SPOTIFY_CLIENT_SECRET = '',
} = process.env;
const BASE_URL = String(BASE_URL_RAW || 'http://localhost:3000').trim().replace(/\/+$/, '');
const REDIRECT = `${BASE_URL}/auth/callback`;
const SPOTIFY_REDIRECT = String(process.env.SPOTIFY_REDIRECT_URI || `${BASE_URL}/auth/spotify/callback`).trim().replace(/\/+$/, '');
const SPOTIFY_ID = String(SPOTIFY_CLIENT_ID || '').trim();
const SPOTIFY_SECRET = String(SPOTIFY_CLIENT_SECRET || '').trim();
// Set DATA_DIR=/var/data and UPLOAD_DIR=/var/data/uploads on Render with a Persistent Disk.
// This keeps profiles and uploaded media across deploys.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UP_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin-state.json');
const ADMIN_STATE_ROW_ID = '__caruzo_admin_state__';
[DATA_DIR, UP_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
let adminState = fs.existsSync(ADMIN_FILE) ? JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8')) : { keys: [], audit: [], changelog: [] };
adminState.keys ||= []; adminState.audit ||= []; adminState.changelog ||= []; adminState.marketplace ||= [];
function ensureAdminSettings() {
  adminState.settings ||= {};
  adminState.settings.backgrounds ||= {};
  for (const pg of ['landing', 'dashboard']) if (!/^(none|[1-9]|1[0-7])$/.test(String(adminState.settings.backgrounds[pg] ?? ''))) adminState.settings.backgrounds[pg] = 'none';
  if (!/^(none|[1-8])$/.test(String(adminState.settings.backgrounds.login ?? ''))) adminState.settings.backgrounds.login = 'none';
  if (!/^[1-8]$/.test(String(adminState.settings.page404Design || ''))) adminState.settings.page404Design = '1';
  adminState.settings.scrollAnimations ||= {};
  if (!['none','fade-rise','slide-sides','scale-soft','blur-focus','stagger-cards','depth-flip','clip-reveal','glide-skew'].includes(String(adminState.settings.scrollAnimations.landing || ''))) adminState.settings.scrollAnimations.landing = 'fade-rise';
  if (!['none','neon-dot','halo-ring','precision','diamond','spark','pixel','orbit','minimal-arrow'].includes(String(adminState.settings.landingCursor || ''))) adminState.settings.landingCursor = 'none';
}
ensureAdminSettings();
const ADMIN_IDS = new Set(String(ADMIN_DISCORD_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
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
    let profileCount = 0;
    for (const row of rows) {
      if (!row || !row.id || !row.data) continue;
      if (String(row.id) === ADMIN_STATE_ROW_ID) { adminState = row.data; adminState.keys ||= []; adminState.audit ||= []; adminState.changelog ||= []; adminState.marketplace ||= []; ensureAdminSettings(); continue; }
      db[String(row.id)] = row.data; profileCount++;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminState, null, 2));
    console.log(`Supabase: ${profileCount} Profil(e) geladen.`);
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

async function saveAdminState() {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminState, null, 2));
  if (!SUPABASE_ENABLED) return;
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles?on_conflict=id`;
  await fetch(endpoint, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([{ id: ADMIN_STATE_ROW_ID, data: adminState }]),
  }).then(r => { if (!r.ok) console.error('Supabase admin save:', r.status); }).catch(e => console.error('Supabase admin save:', e.message));
}

function isAdminId(id) { return ADMIN_IDS.has(String(id || '')); }
function metaFor(user) {
  user.adminMeta ||= { premium: false, banned: false, bannedReason: '', bannedAt: 0, premiumAt: 0, moderator: false, moderatorAt: 0, inviteKeyId: '', lastLoginAt: 0 };
  if (user.adminMeta.moderator == null) user.adminMeta.moderator = false;
  if (user.adminMeta.moderatorAt == null) user.adminMeta.moderatorAt = 0;
  return user.adminMeta;
}
function isModerator(user) { return !!user && !!metaFor(user).moderator && !isAdminId(user.id); }
function isBanned(user) { return !!user && !!metaFor(user).banned; }
function audit(type, details = {}) {
  adminState.audit.unshift({ id: crypto.randomUUID(), type, at: Date.now(), ...details });
  adminState.audit = adminState.audit.slice(0, 250);
}
function normalizeInviteKey(v) { return String(v || '').trim().toUpperCase().replace(/\s+/g, ''); }
function keyRecordByValue(v) { const k = normalizeInviteKey(v); return adminState.keys.find(x => x.key === k); }
function makeInviteKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let raw = '';
  for (let i = 0; i < 12; i++) raw += alphabet[bytes[i] % alphabet.length];
  return `CRZ-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}`;
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
const RESERVED = ['api', 'auth', 'u', 'uploads', 'dashboard', 'logout', 'login', 'admin', 'static', 'landing', 'profile', 'favicon.ico', 'robots.txt', 'health', 'banned'];

function defaults(dc) {
  return {
    id: dc.id,
    username: slug(dc.username) || 'user' + dc.id.slice(-4),
    displayName: dc.globalName,
    tagline: 'the end is never the end is never the end',
    about: '',
    enterText: 'click to enter...',
    tags: { label: '', location: '', age: '' },
    highlights: [],
    privacy: { visibility: 'public', noIndex: false },
    share: { title: '', description: '', imageMode: 'avatar', image: '' },
    reactions: { enabled: true, title: 'React', position: 'profile-bottom', animation: 'pop', showCounts: true, items: [
      { id: 'fire', emoji: '🔥', label: 'Fire' }, { id: 'heart', emoji: '❤️', label: 'Love' }, { id: 'music', emoji: '🎧', label: 'Music' }, { id: 'game', emoji: '🎮', label: 'Gaming' }
    ] },
    reactionStats: { total: 0, byItem: {}, daily: {} },
    design: {
      nameEffect: 'standard', nameColor: '#f6eff2', accentColor: '#8b5cf6',
      avatarFrameEffect: 'glow', avatarFrameColor: '#8b5cf6', avatarFrameWidth: 2, avatarShape: 'circle',
      cardStyle: 'glass', cardOpacity: 72, cardBlur: 22, cardRadius: 26, borderOpacity: 12,
      cardGlow: 18, glassSaturation: 120, avatarSize: 132, socialRadius: 18, profileWidth: 1000,
      contentAlign: 'left', socialLayout: 'grid', socialEffect: 'lift', badgeStyle: 'icon',
      profileHover: 'tilt', hoverIntensity: 55, hoverGlow: 35,
    },
    viewsStyle: { visible: true, placement: 'profile', corner: 'top-right', effect: 'glow', backgroundOpacity: 22, borderOpacity: 14, eyeOpacity: 92, countOpacity: 88 },
    pageFx: { type: 'grid', color: '#8b5cf6', secondary: '#ff2e93', opacity: 18, density: 44, speed: 9 },
    cursor: { effect: 'none', image: 'system', svg: '' },
    browser: { effect: 'rotate', speed: 1500, messages: [] },
    settings: { showBanner: false, showDecoration: true, showBadges: true, showTag: true, showStatus: true, showActivity: false, showSpotifyNowPlaying: true, showProfileBrand: true, showPremiumBadge: true, showAdminBadge: true, showModeratorBadge: true, showBoostBadge: true, manualNitro: false, nitroTier: '' },
    background: { type: 'image', url: '', blur: 6, dim: 55, effect: 'none', videoSound: true, videoVolume: 30, videoStart: 0 },
    music: { url: '', title: '', volume: 40 },
    musicPlayer: { enabled:false, title:'My Playlist', style:'glass-wave', position:'below-profile', accent:'#8b5cf6', secondary:'#22d3ee', volume:65, showCover:true, sources:[] },
    analytics: { viewsDaily:{}, eventsDaily:{}, socialClicks:{}, highlightClicks:{}, musicPlays:0, musicSkips:0, referrers:{}, devices:{} },
    soundMode: 'auto',
    spotify: '',
    spotifyStyle: { blur: 26, glow: 24, layout: 'compact' },
    spotifyAccount: null,
    spotifyAuth: null,
    floating: [],
    premiumSections: [],
    links: { steam: [], twitch: '', tiktok: '', x: '', epic: '', valorant: '', discordServerName: '', discordServer: '', instagram: '', youtube: '', github: '', bluesky: '', spotifyProfile: '', order: [], custom: [] },
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
  user.highlights = (Array.isArray(b.highlights) ? b.highlights : []).slice(0, 6).map((x, i) => ({
    id: str(x?.id, 48) || `highlight-${i + 1}`,
    icon: str(x?.icon, 8) || '✦',
    label: str(x?.label, 28),
    value: str(x?.value, 80),
    url: url(x?.url),
  })).filter(x => x.label || x.value);
  const pr = b.privacy || {};
  user.privacy = {
    visibility: ['public','unlisted','disabled'].includes(pr.visibility) ? pr.visibility : 'public',
    noIndex: !!pr.noIndex,
  };
  const sh = b.share || {};
  user.share = {
    title: str(sh.title, 70),
    description: str(sh.description, 180),
    imageMode: ['avatar','background','custom'].includes(sh.imageMode) ? sh.imageMode : 'avatar',
    image: url(sh.image),
  };
  if (b.reactions !== undefined) {
    const rr = b.reactions || {};
    const reactionItems = (Array.isArray(rr.items) ? rr.items : (Array.isArray(user.reactions?.items) ? user.reactions.items : [])).slice(0, 8).map((x, i) => ({
      id: str(x?.id, 48) || `reaction-${i + 1}`,
      emoji: str(x?.emoji, 16) || '✨',
      label: str(x?.label, 24) || `Reaction ${i + 1}`,
    })).filter(x => x.emoji);
    user.reactions = {
      enabled: rr.enabled !== false,
      title: str(rr.title, 28) || 'React',
      position: ['profile-bottom','before-highlights','after-highlights','before-socials','floating-left','floating-right'].includes(rr.position) ? rr.position : 'profile-bottom',
      animation: ['pop','bounce','float','burst','ripple','shake','glow','confetti'].includes(rr.animation) ? rr.animation : 'pop',
      showCounts: rr.showCounts !== false,
      items: reactionItems.length ? reactionItems : [{ id:'fire', emoji:'🔥', label:'Fire' }],
    };
  } else if (!user.reactions) {
    user.reactions = { enabled:true, title:'React', position:'profile-bottom', animation:'pop', showCounts:true, items:[{id:'fire',emoji:'🔥',label:'Fire'},{id:'heart',emoji:'❤️',label:'Love'},{id:'music',emoji:'🎧',label:'Music'},{id:'game',emoji:'🎮',label:'Gaming'}] };
  }
  user.reactionStats ||= { total: 0, byItem: {}, daily: {} };
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
    socialEffect:['none','lift','glow','shine','tilt','magnetic','neon','border-flow'].includes(des.socialEffect)?des.socialEffect:'lift',
    badgeStyle:['icon','pill','glass'].includes(des.badgeStyle)?des.badgeStyle:'icon',
    profileHover:['none','tilt','soft-follow','magnetic','spotlight','depth','prism','float-zoom','elastic','glow-track','micro-parallax','snap-tilt'].includes(des.profileHover)?des.profileHover:'tilt',
    hoverIntensity:num(des.hoverIntensity,0,100,55),
    hoverGlow:num(des.hoverGlow,0,100,35),
  };
  const vs=b.viewsStyle||{}; user.viewsStyle={visible:vs.visible!==false,placement:['profile','page-bottom'].includes(vs.placement)?vs.placement:'profile',corner:['top-left','top-right','bottom-left','bottom-right'].includes(vs.corner)?vs.corner:'top-right',effect:['none','glow','pulse','scan','blur'].includes(vs.effect)?vs.effect:'glow',backgroundOpacity:num(vs.backgroundOpacity,0,100,22),borderOpacity:num(vs.borderOpacity,0,100,14),eyeOpacity:num(vs.eyeOpacity,0,100,92),countOpacity:num(vs.countOpacity,0,100,88)};
  const pf=b.pageFx||{}; user.pageFx={type:['none','grid','matrix','snow','particles','constellation','rays','scanlines','stars','mesh','nebula','noise','orbs','rain'].includes(pf.type)?pf.type:'grid',color:color(pf.color,'#8b5cf6'),secondary:color(pf.secondary,'#ff2e93'),opacity:num(pf.opacity,0,80,18),density:num(pf.density,16,96,44),speed:num(pf.speed,2,30,9)};
  const cur=b.cursor||{}; user.cursor={effect:['none','spark','trail','snow','hearts','fire','magic','orbit','matrix','comet','ripple','bubbles','cyber','twinkle'].includes(cur.effect)?cur.effect:'none',image:['system','crosshair','dot','ring','cross','arrow','star','diamond','triangle','beam','neon'].includes(cur.image)?cur.image:'system',svg:str(cur.svg,4000)};
  const br=b.browser||{}; user.browser={effect:['rotate','type','marquee','pulse'].includes(br.effect)?br.effect:'rotate',speed:num(br.speed,300,6000,1500),messages:(Array.isArray(br.messages)?br.messages:[]).slice(0,10).map(x=>str(x,80)).filter(Boolean)};
  const s = b.settings || {};
  const prevSettings = user.settings || {};
  const settingDefaults = { showBanner:false, showDecoration:true, showBadges:true, showTag:true, showStatus:true, showActivity:false, showSpotifyNowPlaying:true, showProfileBrand:true, showPremiumBadge:true, showAdminBadge:true, showModeratorBadge:true, showBoostBadge:true, manualNitro:false };
  user.settings = {};
  for (const [k, def] of Object.entries(settingDefaults)) user.settings[k] = s[k] !== undefined ? !!s[k] : (prevSettings[k] !== undefined ? !!prevSettings[k] : def);
  user.settings.nitroTier = ['','beginner','bronze','silver','gold','platinum','diamond','emerald','ruby','opal'].includes(s.nitroTier) ? s.nitroTier : (prevSettings.nitroTier || '');
  const bg = b.background || {};
  user.background = { type: ['image','video','youtube'].includes(bg.type) ? bg.type : 'image', url: url(bg.url), blur: num(bg.blur, 0, 30, 6), dim: num(bg.dim, 0, 90, 55), effect: ['none','aurora','plasma','dither','float','tilt','zoom','pulse','levitate','breathe','sway','glitch','shimmer'].includes(bg.effect) ? bg.effect : 'none', videoSound: bg.videoSound !== false, videoVolume: num(bg.videoVolume, 0, 100, 30), videoStart: num(bg.videoStart, 0, 21600, 0) };
  const m = b.music || {};
  user.music = { url: url(m.url), title: str(m.title, 80), volume: num(m.volume, 0, 100, 40) };
  if (metaFor(user).premium && b.musicPlayer !== undefined) {
    const mp = b.musicPlayer || {};
    const mpColor=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:d;
    const sources=(Array.isArray(mp.sources)?mp.sources:[]).slice(0,12).map((x,i)=>({
      id:str(x?.id,48)||`source-${i+1}`,
      url:url(x?.url),
      title:str(x?.title,80),
      artist:str(x?.artist,80),
      cover:url(x?.cover),
    })).filter(x=>x.url);
    user.musicPlayer={
      enabled:mp.enabled!==false,
      title:str(mp.title,60)||'My Playlist',
      style:['glass-wave','vinyl','neon-deck','compact-bar','minimal','cover-flow'].includes(mp.style)?mp.style:'glass-wave',
      position:['below-profile','before-highlights','before-socials','after-socials','floating-bottom'].includes(mp.position)?mp.position:'below-profile',
      accent:mpColor(mp.accent,'#8b5cf6'), secondary:mpColor(mp.secondary,'#22d3ee'),
      volume:num(mp.volume,0,100,65), showCover:mp.showCover!==false, sources,
    };
  } else if (!user.musicPlayer) {
    user.musicPlayer={enabled:false,title:'My Playlist',style:'glass-wave',position:'below-profile',accent:'#8b5cf6',secondary:'#22d3ee',volume:65,showCover:true,sources:[]};
  }
  user.soundMode = ['auto','music','video','mute'].includes(b.soundMode) ? b.soundMode : 'auto';
  user.spotify = url(b.spotify);
  const sp = b.spotifyStyle || {};
  user.spotifyStyle = { blur: num(sp.blur, 0, 50, 26), glow: num(sp.glow, 0, 100, 24), layout: ['compact','full'].includes(sp.layout) ? sp.layout : 'compact' };
  user.floating = (Array.isArray(b.floating) ? b.floating : []).slice(0, 8).map(x => str(x, 32)).filter(Boolean);
  if (metaFor(user).premium) {
    user.premiumSections = (Array.isArray(b.premiumSections) ? b.premiumSections : []).slice(0, 6).map((x, index) => {
      const type = x?.type === 'gallery' ? 'gallery' : 'text';
      const legacyText = str(x?.text, 1800);
      let tabs = (Array.isArray(x?.tabs) ? x.tabs : []).slice(0, 5).map((tab, ti) => ({
        id: str(tab?.id, 48) || `tab-${index + 1}-${ti + 1}`,
        label: str(tab?.label, 28) || `Tab ${ti + 1}`,
        text: str(tab?.text, 1200),
        fields: (Array.isArray(tab?.fields) ? tab.fields : []).slice(0, 4).map(f => ({ label: str(f?.label, 24), value: str(f?.value, 140) })).filter(f => f.label || f.value),
      }));
      if (type === 'text' && !tabs.length) tabs = [{ id: `tab-${index + 1}-1`, label: 'About Me', text: legacyText, fields: [] }];
      return {
        id: str(x?.id, 48) || `section-${index + 1}`,
        title: str(x?.title, 60) || (type === 'gallery' ? 'Gallery' : 'Section'),
        type,
        text: legacyText,
        tabs,
        images: (Array.isArray(x?.images) ? x.images : []).slice(0, 12).map(url).filter(Boolean),
      };
    });
  } else if (!Array.isArray(user.premiumSections)) user.premiumSections = [];
  const l = b.links || {};
  const allowedOrder = new Set(['discord','steam','twitch','tiktok','x','instagram','youtube','github','bluesky','epic','valorant','discordServer','spotifyProfile','custom']);
  user.links = {
    steam: (Array.isArray(l.steam) ? l.steam : []).slice(0, 10).map(x => ({ name: str(x.name, 40), url: url(x.url) })).filter(x => x.url),
    twitch: url(l.twitch),
    tiktok: url(l.tiktok),
    x: url(l.x),
    epic: str(l.epic, 64).trim(),
    valorant: str(l.valorant, 64).trim(),
    discordServerName: str(l.discordServerName, 48).trim(),
    discordServer: discordInvite(l.discordServer),
    instagram: url(l.instagram), youtube: url(l.youtube), github: url(l.github), bluesky: url(l.bluesky), spotifyProfile: url(l.spotifyProfile),
    order: (Array.isArray(l.order) ? l.order : []).map(x => str(x, 32)).filter(x => allowedOrder.has(x)).slice(0, 24),
    custom: (Array.isArray(l.custom) ? l.custom : []).slice(0, 12).map(x => ({ label: str(x.label, 30), url: url(x.url) })).filter(x => x.url),
  };
  return null;
}

function publicView(u) {
  const { auth, adminMeta, spotifyAuth, spotifyDiag, reactionStats, analytics, ...rest } = u; // Tokens, Analytics-Rohdaten und interne Moderationsdaten niemals ausliefern
  const d = { ...rest.discord };
  const manualNitro = !!rest.settings?.manualNitro;
  const tier = NITRO_TIERS[rest.settings?.nitroTier || ''];
  d.nitroVerified = !!d.nitro;
  d.nitro = manualNitro || d.nitroVerified;
  d.badges = Array.isArray(d.badges) ? [...d.badges].filter(b => !['nitro','server_booster'].includes(b.key)) : [];
  if (d.nitro) {
    d.badges.unshift(tier
      ? { key: 'nitro', name: `Discord Nitro · ${tier.label}`, asset: tier.asset, emoji: '💎', tier: tier.key }
      : NITRO);
  }
  if (d.booster && rest.settings?.showBoostBadge !== false) {
    d.badges.push({ key: 'server_booster', name: 'Discord Server Booster', asset: '/discord-boost.png', emoji: '💗' });
  }
  const platform = { premium: !!metaFor(u).premium, admin: isAdminId(u.id), moderator: isModerator(u) };
  const premiumSections = platform.premium && Array.isArray(rest.premiumSections) ? rest.premiumSections : [];
  const musicPlayer = platform.premium ? (rest.musicPlayer || {enabled:false,sources:[]}) : {enabled:false,sources:[]};
  const spotifyAccount = rest.spotifyAccount?.connected ? { connected: true, displayName: str(rest.spotifyAccount.displayName, 80), url: url(rest.spotifyAccount.url), image: url(rest.spotifyAccount.image) } : null;
  const reactionCfg = rest.reactions || { enabled:true, title:'React', position:'profile-bottom', animation:'pop', showCounts:true, items:[] };
  const byItem = u.reactionStats?.byItem || {};
  const reactions = { ...reactionCfg, items: (Array.isArray(reactionCfg.items) ? reactionCfg.items : []).map(x => ({ ...x, count: Number(byItem[x.id] || 0) })) };
  return { ...rest, reactions, spotifyAccount, premiumSections, musicPlayer, platform, discord: d };
}

/* ------------------------------------------------------------------ */
/* Preset marketplace                                                  */
/* ------------------------------------------------------------------ */
const MARKET_MAX_PER_USER = 30;
const MARKET_VIS = new Set(['private','public']);
const deepClone = v => JSON.parse(JSON.stringify(v ?? null));
function privatePresetSnapshot(user) {
  const src = publicView(user);
  const keys = ['username','displayName','tagline','about','enterText','tags','highlights','privacy','share','reactions','design','viewsStyle','pageFx','cursor','browser','settings','background','music','musicPlayer','soundMode','spotify','spotifyStyle','floating','premiumSections','links'];
  const out = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = deepClone(src[k]);
  return out;
}
function publicPresetSnapshot(userOrSnapshot) {
  const src = userOrSnapshot?.id ? publicView(userOrSnapshot) : (userOrSnapshot || {});
  const bg = src.background || {};
  const cur = src.cursor || {};
  const music = src.music || {};
  return {
    design: deepClone(src.design || {}),
    viewsStyle: deepClone(src.viewsStyle || {}),
    pageFx: deepClone(src.pageFx || {}),
    cursor: { effect: str(cur.effect, 32), image: str(cur.image, 32), svg: '' },
    background: {
      type: ['image','video','youtube'].includes(bg.type) ? bg.type : 'image', url: url(bg.url), blur: num(bg.blur,0,30,6), dim: num(bg.dim,0,90,55),
      effect: str(bg.effect, 32) || 'none', videoSound: bg.videoSound !== false, videoVolume: num(bg.videoVolume,0,100,30), videoStart: num(bg.videoStart,0,21600,0),
    },
    music: { url: url(music.url), title: str(music.title,80), volume: num(music.volume,0,100,40) },
    soundMode: ['auto','music','video','mute'].includes(src.soundMode) ? src.soundMode : 'auto',
    spotifyStyle: deepClone(src.spotifyStyle || {}),
  };
}
function marketplaceMeta(rec, viewerId = '') {
  const owner = db[String(rec.ownerId || '')];
  const snap = rec.snapshot || {};
  const design = snap.design || {};
  return {
    id: rec.id,
    name: rec.name,
    description: rec.description || '',
    visibility: rec.visibility,
    scope: rec.scope || (rec.visibility === 'public' ? 'style' : 'full'),
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt || rec.createdAt,
    savedCount: Number(rec.savedCount || 0),
    loadCount: Number(rec.loadCount || 0),
    mine: String(rec.ownerId || '') === String(viewerId || ''),
    author: rec.visibility === 'public' ? {
      username: owner?.username || rec.authorUsername || 'user',
      displayName: owner?.displayName || rec.authorDisplayName || 'Caruzo User',
      avatar: owner?.discord?.avatar || rec.authorAvatar || '',
    } : undefined,
    preview: {
      accentColor: /^#[0-9a-f]{6}$/i.test(design.accentColor || '') ? design.accentColor : '#8b5cf6',
      frameColor: /^#[0-9a-f]{6}$/i.test(design.avatarFrameColor || '') ? design.avatarFrameColor : '#8b5cf6',
      secondaryColor: /^#[0-9a-f]{6}$/i.test(snap.pageFx?.secondary || '') ? snap.pageFx.secondary : '#ff2e93',
      cardStyle: str(design.cardStyle, 24) || 'glass',
      nameEffect: str(design.nameEffect, 24) || 'standard',
      socialEffect: str(design.socialEffect, 24) || 'lift',
      pageFx: str(snap.pageFx?.type, 24) || 'none',
      backgroundEffect: str(snap.background?.effect, 24) || 'none',
      backgroundType: ['image','video','youtube'].includes(snap.background?.type) ? snap.background.type : 'image',
      backgroundUrl: url(snap.background?.url),
      avatar: owner?.discord?.avatar || rec.authorAvatar || '',
      username: owner?.username || rec.authorUsername || 'user',
      displayName: owner?.displayName || rec.authorDisplayName || 'Caruzo User',
    },
  };
}
function presetOwned(rec, uid) { return !!rec && String(rec.ownerId || '') === String(uid || ''); }
function applyPresetSnapshot(user, snapshot, scope = 'full') {
  if (!snapshot || typeof snapshot !== 'object') return;
  const styleKeys = ['design','viewsStyle','pageFx','cursor','background','music','soundMode','spotifyStyle'];
  if (scope === 'style') {
    for (const k of styleKeys) if (snapshot[k] !== undefined) user[k] = deepClone(snapshot[k]);
    return;
  }
  if (snapshot.username !== undefined) {
    const s = slug(snapshot.username);
    const taken = Object.values(db).some(x => x && x.id !== user.id && x.username === s);
    if (s.length >= 2 && !RESERVED.includes(s) && !taken) user.username = s;
  }
  const keys = ['displayName','tagline','about','enterText','tags','highlights','privacy','share','design','viewsStyle','pageFx','cursor','browser','settings','background','music','musicPlayer','soundMode','spotify','spotifyStyle','floating','links'];
  for (const k of keys) if (snapshot[k] !== undefined) user[k] = deepClone(snapshot[k]);
  if (metaFor(user).premium && snapshot.premiumSections !== undefined) user.premiumSections = deepClone(snapshot.premiumSections);
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
/* Spotify OAuth + Now Playing                                        */
/* ------------------------------------------------------------------ */
const spotifyNowCache = new Map();
// V15.2 uses Spotify Authorization Code + PKCE for new connections. This removes
// Client-Secret mistakes from the normal login flow and follows Spotify's current
// OAuth recommendations. Existing legacy connections keep using their old flow.
function spotifyConfigured() { return !!SPOTIFY_ID; }
function spotifyPkceVerifier() { return crypto.randomBytes(64).toString('base64url').slice(0, 96); }
function spotifyPkceChallenge(verifier) { return crypto.createHash('sha256').update(String(verifier)).digest('base64url'); }
function setSpotifyDiag(user, stage, ok, message = '', extra = {}) {
  if (!user) return;
  user.spotifyDiag = {
    stage: str(stage, 48), ok: !!ok, message: str(message, 260), at: Date.now(),
    ...Object.fromEntries(Object.entries(extra || {}).filter(([k]) => ['status','flow'].includes(k)).map(([k,v]) => [k, typeof v === 'number' ? v : str(v, 32)])),
  };
}
async function spotifyTokenRequest(params, flow = 'legacy') {
  if (!SPOTIFY_ID) return { ok: false, status: 0, error: 'SPOTIFY_CLIENT_ID fehlt' };
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const body = { ...params };
  if (flow === 'pkce') {
    body.client_id = SPOTIFY_ID;
  } else {
    if (!SPOTIFY_SECRET) return { ok: false, status: 0, error: 'SPOTIFY_CLIENT_SECRET fehlt für eine alte Spotify-Verknüpfung' };
    headers.Authorization = 'Basic ' + Buffer.from(`${SPOTIFY_ID}:${SPOTIFY_SECRET}`).toString('base64');
  }
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers, body: new URLSearchParams(body),
    });
    let data = null, raw = '';
    const txt = await r.text();
    if (txt) { try { data = JSON.parse(txt); } catch { raw = txt; } }
    if (!r.ok) {
      const detail = String(data?.error_description || data?.error || raw || `HTTP ${r.status}`).slice(0, 300);
      console.error('Spotify token:', r.status, detail);
      return { ok: false, status: r.status, error: detail };
    }
    return { ok: true, status: r.status, data };
  } catch (e) {
    console.error('Spotify token:', e.message);
    return { ok: false, status: 0, error: e.message || 'network_error' };
  }
}
async function spotifyApi(token, endpoint) {
  try {
    const r = await fetch(`https://api.spotify.com/v1${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 204) return { ok: true, status: 204, data: null };
    let data = null; try { data = await r.json(); } catch {}
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: null, error: e.message }; }
}
async function ensureSpotifyAccess(user) {
  const a = user?.spotifyAuth;
  if (!a?.access) return '';
  if (Number(a.expiresAt || 0) > Date.now() + 60000) return a.access;
  if (!a.refresh) return '';
  const flow = a.flow === 'pkce' ? 'pkce' : 'legacy';
  const tr = await spotifyTokenRequest({ grant_type: 'refresh_token', refresh_token: a.refresh }, flow);
  const tok = tr?.ok ? tr.data : null;
  if (!tok?.access_token) {
    setSpotifyDiag(user, 'refresh', false, tr?.error || 'Spotify Token konnte nicht erneuert werden.', { status: tr?.status || 0, flow });
    if (String(tr?.error || '').includes('invalid_grant')) { user.spotifyAuth = null; user.spotifyAccount = null; }
    await saveUser(user);
    return '';
  }
  user.spotifyAuth = {
    ...a,
    access: tok.access_token,
    refresh: tok.refresh_token || a.refresh,
    expiresAt: Date.now() + Number(tok.expires_in || 3600) * 1000,
    scope: tok.scope || a.scope || '',
    flow,
  };
  setSpotifyDiag(user, 'refresh', true, 'Spotify Access Token aktualisiert.', { flow });
  await saveUser(user);
  return user.spotifyAuth.access;
}
function spotifyAccountView(me) {
  if (!me) return null;
  return {
    connected: true,
    accountId: String(me.account_id || me.id || ''),
    id: String(me.id || ''),
    displayName: str(me.display_name || 'Spotify', 80),
    url: url(me.external_urls?.spotify || ''),
    image: url(me.images?.[0]?.url || ''),
    connectedAt: Date.now(),
  };
}
function spotifyNowView(data) {
  const item = data?.item;
  if (!item) return { active: false, isPlaying: false };
  const isEpisode = item.type === 'episode';
  const artists = isEpisode
    ? [item.show?.name].filter(Boolean)
    : (Array.isArray(item.artists) ? item.artists.map(x => x?.name).filter(Boolean) : []);
  const image = isEpisode ? item.images?.[0]?.url : item.album?.images?.[0]?.url;
  return {
    active: true,
    isPlaying: !!data.is_playing,
    type: isEpisode ? 'episode' : 'track',
    name: str(item.name, 180),
    artists: artists.slice(0, 5).map(x => str(x, 100)),
    album: str(isEpisode ? (item.show?.name || '') : (item.album?.name || ''), 180),
    image: url(image || ''),
    url: url(item.external_urls?.spotify || ''),
    progressMs: num(data.progress_ms, 0, 1000 * 60 * 60 * 24, 0),
    durationMs: num(item.duration_ms, 0, 1000 * 60 * 60 * 24, 0),
    fetchedAt: Date.now(),
  };
}
async function getSpotifyNowForUser(user, force = false) {
  if (!user?.spotifyAuth?.access || !user?.spotifyAccount?.connected) return { active: false, connected: false };
  const key = String(user.id);
  const cached = spotifyNowCache.get(key);
  if (!force && cached && Date.now() - cached.at < 12000) return cached.value;
  let token = await ensureSpotifyAccess(user);
  if (!token) return { active: false, connected: true, error: 'spotify-auth-expired' };
  let r = await spotifyApi(token, '/me/player/currently-playing');
  if (r.status === 401 && user.spotifyAuth?.refresh) {
    user.spotifyAuth.expiresAt = 0;
    token = await ensureSpotifyAccess(user);
    if (token) r = await spotifyApi(token, '/me/player/currently-playing');
  }
  let value;
  if (r.status === 204) value = { active: false, isPlaying: false, connected: true, fetchedAt: Date.now() };
  else if (r.ok) value = { ...spotifyNowView(r.data), connected: true };
  else value = { active: false, connected: true, error: r.status === 403 ? 'spotify-forbidden' : 'spotify-unavailable', status: r.status };
  spotifyNowCache.set(key, { at: Date.now(), value });
  return value;
}

/* ------------------------------------------------------------------ */
/* Discord Presence Gateway                                            */
/* Live source: Discord Gateway. Lanyard is only a fallback.            */
/* Requires GUILDS + GUILD_PRESENCES. Targeted user_ids do not need a full member-list fetch. */
/* ------------------------------------------------------------------ */
const presenceCache = new Map();
const presenceGuildForUser = new Map();
const discordGuildIds = new Set();
const pendingPresenceRequests = new Map();
const boostCache = new Map();
let gatewayReady = false;
let discordGatewaySocket = null;
let discordGatewayIssue = '';
let discordGatewaySeq = null;

function normalizeGatewayPresence(d, source = 'discord-bot') {
  return {
    discord_status: ['online','idle','dnd'].includes(d?.status) ? d.status : 'offline',
    activities: Array.isArray(d?.activities) ? d.activities.map(a => ({
      id: str(a?.id, 80), name: str(a?.name, 120), type: Number(a?.type ?? 0),
      application_id: str(a?.application_id, 80), details: str(a?.details, 180), state: str(a?.state, 180),
      sync_id: str(a?.sync_id, 120), url: url(a?.url), timestamps: a?.timestamps || null,
      assets: a?.assets && typeof a.assets === 'object' ? {
        large_image: str(a.assets.large_image, 180), large_text: str(a.assets.large_text, 180),
        small_image: str(a.assets.small_image, 180), small_text: str(a.assets.small_text, 180),
      } : null,
    })) : [],
    updated_at: Date.now(), source,
  };
}
function gatewaySend(payload) {
  if (discordGatewaySocket?.readyState !== WebSocket.OPEN) return false;
  try { discordGatewaySocket.send(JSON.stringify(payload)); return true; } catch { return false; }
}
async function discordGuildMember(guildId, userId) {
  if (!DISCORD_BOT_TOKEN || !guildId || !userId) return { ok:false, status:0, data:null };
  try {
    const r = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(String(guildId))}/members/${encodeURIComponent(String(userId))}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'User-Agent': 'Caruzo/1.0' }
    });
    const data = r.ok ? await r.json() : null;
    return { ok:r.ok, status:r.status, data };
  } catch { return { ok:false, status:0, data:null }; }
}
async function getBoostStatus(userId, force = false) {
  const id = String(userId || '');
  if (!id || !DISCORD_BOT_TOKEN) return { available:false, boosted:false, reason:'bot-unavailable', checkedAt:Date.now() };
  const cached = boostCache.get(id);
  if (!force && cached && Date.now() - Number(cached.checkedAt || 0) < 120000) return cached;
  const preferred = String(DISCORD_BOOST_GUILD_ID || '').trim();
  const known = presenceGuildForUser.get(id);
  const guilds = [...new Set([preferred, known, ...discordGuildIds].filter(Boolean))].slice(0, 30);
  if (!guilds.length) {
    const value = { available:false, boosted:false, reason:'no-mutual-guild', checkedAt:Date.now() };
    boostCache.set(id, value); return value;
  }
  let sawMember = false, sawForbidden = false;
  for (let i = 0; i < guilds.length; i += 4) {
    const batch = guilds.slice(i, i + 4);
    const results = await Promise.all(batch.map(gid => discordGuildMember(gid, id).then(r => ({ gid, ...r }))));
    for (const r of results) {
      if (r.status === 403) sawForbidden = true;
      if (!r.ok || !r.data) continue;
      sawMember = true;
      if (r.data.premium_since) {
        const value = { available:true, boosted:true, guildId:r.gid, premiumSince:String(r.data.premium_since), checkedAt:Date.now() };
        boostCache.set(id, value); return value;
      }
    }
  }
  const value = { available:sawMember, boosted:false, reason:sawMember?'not-boosting':(sawForbidden?'forbidden':'not-mutual'), checkedAt:Date.now() };
  boostCache.set(id, value); return value;
}
async function syncUserBoostState(user, force = false) {
  if (!user) return null;
  const st = await getBoostStatus(user.discord?.id || user.id, force);
  user.discord ||= {};
  user.discord.booster = !!st.boosted;
  user.discord.boosterSince = st.premiumSince || '';
  user.discord.boosterGuildId = st.guildId || '';
  user.discord.boosterCheckAvailable = !!st.available;
  user.discord.boosterCheckedAt = st.checkedAt || Date.now();
  return st;
}
function finishPresenceProbe(nonce, value) {
  const p = pendingPresenceRequests.get(nonce); if (!p) return;
  clearTimeout(p.timer); pendingPresenceRequests.delete(nonce); p.resolve(value || null);
}
function requestGuildPresence(guildId, userId, timeoutMs = 1200) {
  return new Promise(resolve => {
    if (!gatewayReady || !gatewaySend) return resolve(null);
    const nonce = `crz_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
    const timer = setTimeout(() => finishPresenceProbe(nonce, null), timeoutMs);
    pendingPresenceRequests.set(nonce, { resolve, timer, userId: String(userId), guildId: String(guildId) });
    const ok = gatewaySend({ op: 8, d: { guild_id: String(guildId), user_ids: [String(userId)], presences: true, nonce } });
    if (!ok) finishPresenceProbe(nonce, null);
  });
}
async function requestPresenceFromGateway(userId) {
  const id = String(userId || ''); if (!id || !gatewayReady) return null;
  const knownGuild = presenceGuildForUser.get(id);
  const guilds = knownGuild ? [knownGuild] : [...discordGuildIds].slice(0, 60);
  if (!guilds.length) return null;
  // Probe known mutual guild first; otherwise small batches to avoid a burst of opcode 8 requests.
  for (let i = 0; i < guilds.length; i += 6) {
    const batch = guilds.slice(i, i + 6);
    const results = await Promise.all(batch.map(gid => requestGuildPresence(gid, id)));
    const hit = results.find(Boolean);
    if (hit) return hit;
  }
  return null;
}
function startDiscordGateway() {
  if (!DISCORD_BOT_TOKEN) { discordGatewayIssue = 'DISCORD_BOT_TOKEN fehlt'; return; }
  let heartbeat = null, reconnectTimer = null, shuttingDown = false;
  // 1 GUILDS + 256 GUILD_PRESENCES. We request specific user_ids via Opcode 8.
  const intents = (1 << 0) | (1 << 8);
  const scheduleReconnect = (delay = 5000) => {
    if (shuttingDown || reconnectTimer) return;
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, delay);
  };
  const connect = () => {
    clearInterval(heartbeat); heartbeat = null; gatewayReady = false; discordGatewayIssue = 'Verbinde mit Discord …';
    try { discordGatewaySocket = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json'); }
    catch (e) { discordGatewayIssue = e.message; return scheduleReconnect(); }
    discordGatewaySocket.on('message', raw => {
      let packet; try { packet = JSON.parse(raw.toString()); } catch { return; }
      if (packet.s != null) discordGatewaySeq = packet.s;
      if (packet.op === 10) {
        const every = Number(packet.d?.heartbeat_interval || 45000);
        const beat = () => gatewaySend({ op: 1, d: discordGatewaySeq });
        heartbeat = setInterval(beat, every); setTimeout(beat, Math.min(1000, Math.floor(every * .25)));
        gatewaySend({ op: 2, d: { token: DISCORD_BOT_TOKEN, intents, properties: { os: 'linux', browser: 'caruzo', device: 'caruzo' }, large_threshold: 250 } });
      } else if (packet.op === 1) gatewaySend({ op: 1, d: discordGatewaySeq });
      else if (packet.op === 7) { try { discordGatewaySocket.close(); } catch {} }
      else if (packet.op === 9) { discordGatewayIssue = 'Discord Session ungültig – reconnect'; try { discordGatewaySocket.close(); } catch {} scheduleReconnect(6000); }

      if (packet.t === 'READY') { gatewayReady = true; discordGatewayIssue = ''; }
      if (packet.t === 'GUILD_CREATE' && packet.d?.id) {
        const gid = String(packet.d.id); discordGuildIds.add(gid);
        if (Array.isArray(packet.d?.presences)) packet.d.presences.forEach(pr => {
          const uid = String(pr?.user?.id || ''); if (!uid) return;
          presenceGuildForUser.set(uid, gid); presenceCache.set(uid, normalizeGatewayPresence(pr));
        });
      }
      if (packet.t === 'GUILD_DELETE' && packet.d?.id) discordGuildIds.delete(String(packet.d.id));
      if (packet.t === 'PRESENCE_UPDATE' && packet.d?.user?.id) {
        const uid = String(packet.d.user.id); if (packet.d.guild_id) presenceGuildForUser.set(uid, String(packet.d.guild_id));
        presenceCache.set(uid, normalizeGatewayPresence(packet.d));
      }
      if (packet.t === 'GUILD_MEMBERS_CHUNK') {
        const nonce = String(packet.d?.nonce || ''); const probe = pendingPresenceRequests.get(nonce);
        if (probe) {
          const members = Array.isArray(packet.d?.members) ? packet.d.members : [];
          const memberFound = members.some(m => String(m?.user?.id || '') === probe.userId);
          const presences = Array.isArray(packet.d?.presences) ? packet.d.presences : [];
          const pr = presences.find(x => String(x?.user?.id || '') === probe.userId);
          if (memberFound) {
            presenceGuildForUser.set(probe.userId, probe.guildId);
            const normalized = pr ? normalizeGatewayPresence(pr) : normalizeGatewayPresence({status:'offline',activities:[]});
            presenceCache.set(probe.userId, normalized); finishPresenceProbe(nonce, normalized);
          } else if (Number(packet.d?.chunk_index || 0) >= Number(packet.d?.chunk_count || 1) - 1) finishPresenceProbe(nonce, null);
        }
      }
    });
    discordGatewaySocket.on('close', (code, reason) => {
      clearInterval(heartbeat); heartbeat = null; gatewayReady = false;
      discordGatewayIssue = code === 4014 ? 'Discord blockiert den Presence Intent (im Developer Portal aktivieren)' : `Gateway getrennt (${code || 'unknown'}) ${String(reason || '')}`.trim();
      for (const nonce of [...pendingPresenceRequests.keys()]) finishPresenceProbe(nonce, null);
      scheduleReconnect(code === 4014 ? 30000 : 5000);
    });
    discordGatewaySocket.on('error', e => { discordGatewayIssue = e.message; console.error('Discord Gateway:', e.message); });
  };
  connect();
  process.once('SIGTERM', () => { shuttingDown = true; clearInterval(heartbeat); try { discordGatewaySocket?.close(); } catch {} });
}


/* ------------------------------------------------------------------ */
/* Spotify Now Playing via Discord Presence                            */
/* No Spotify Developer API / Premium subscription is required.        */
/* ------------------------------------------------------------------ */
function discordSpotifyImage(asset) {
  const v = String(asset || '');
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return url(v);
  if (v.startsWith('spotify:')) {
    const id = v.slice('spotify:'.length).replace(/[^A-Za-z0-9]/g, '');
    return id ? `https://i.scdn.co/image/${id}` : '';
  }
  return '';
}
function splitSpotifyArtists(value) {
  const s = String(value || '').replace(/^by\s+/i, '').trim();
  if (!s) return [];
  return s.split(/\s*[;,]\s*/).map(x => str(x, 100)).filter(Boolean).slice(0, 6);
}
function spotifyNowFromDiscordPresence(data) {
  if (!data) return { active: false, connected: true, source: 'discord' };

  // Lanyard exposes a normalized Spotify object when Discord reports Spotify activity.
  const ly = data.spotify;
  if (ly && (data.listening_to_spotify || ly.song || ly.track_id)) {
    const start = Number(ly.timestamps?.start || 0);
    const end = Number(ly.timestamps?.end || 0);
    return {
      active: true, connected: true, isPlaying: true, source: 'discord-lanyard',
      name: str(ly.song, 180), artists: splitSpotifyArtists(ly.artist), album: str(ly.album, 180),
      image: url(ly.album_art_url || ''),
      url: ly.track_id ? `https://open.spotify.com/track/${encodeURIComponent(String(ly.track_id))}` : '',
      progressMs: start ? Math.max(0, Date.now() - start) : 0,
      durationMs: start && end > start ? end - start : 0,
      fetchedAt: Date.now(),
    };
  }

  // Native Discord Gateway activity. Spotify is activity type 2 (Listening).
  const a = (Array.isArray(data.activities) ? data.activities : []).find(x =>
    x && Number(x.type) === 2 && String(x.name || '').toLowerCase() === 'spotify'
  );
  if (!a) return { active: false, connected: true, source: data.source || 'discord' };
  const start = Number(a.timestamps?.start || 0);
  const end = Number(a.timestamps?.end || 0);
  const trackId = String(a.sync_id || '').replace(/[^A-Za-z0-9]/g, '');
  return {
    active: true, connected: true, isPlaying: true, source: 'discord-gateway',
    name: str(a.details || 'Spotify', 180), artists: splitSpotifyArtists(a.state),
    album: str(a.assets?.large_text || '', 180), image: discordSpotifyImage(a.assets?.large_image),
    url: trackId ? `https://open.spotify.com/track/${trackId}` : '',
    progressMs: start ? Math.max(0, Date.now() - start) : 0,
    durationMs: start && end > start ? end - start : 0,
    fetchedAt: Date.now(),
  };
}
async function spotifyPresenceSnapshot(userId) {
  const id = String(userId || '');
  if (!id) return null;
  let cached = presenceCache.get(id) || null;
  const age = cached ? Date.now() - Number(cached.updated_at || 0) : Infinity;
  if (gatewayReady && (!cached || age > 12000 || !(cached.activities || []).some(a => Number(a?.type) === 2 && String(a?.name || '').toLowerCase() === 'spotify'))) {
    try { const hit = await requestPresenceFromGateway(id); if (hit) cached = hit; } catch {}
  }
  const gatewayFresh = cached && Date.now() - Number(cached.updated_at || 0) < 90000 ? cached : null;
  // If Gateway already has Spotify, use it immediately.
  if (gatewayFresh && (gatewayFresh.activities || []).some(a => Number(a?.type) === 2 && String(a?.name || '').toLowerCase() === 'spotify')) return gatewayFresh;
  // Lanyard can expose Discord's Spotify object and is a useful fallback.
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 1800);
    const r = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(id)}`, { headers: { 'User-Agent':'Caruzo/1.0', 'Cache-Control':'no-cache' }, signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) { const j = await r.json(); if (j?.success && j?.data) {
      const ly = { ...j.data, updated_at: Date.now(), source: 'lanyard' };
      if (ly.spotify || ly.listening_to_spotify) return ly;
      if (!gatewayFresh) return ly;
    }}
  } catch {}
  return gatewayFresh;
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

// Invite-Gate: neue Accounts benötigen einen einmaligen Invite Key.
// Das bestehende SITE_PASSWORD bleibt als Owner-/Master-Zugang erhalten.
const siteUnlocked = (req, res, next) => {
  const user = req.session.uid && db[req.session.uid] ? db[req.session.uid] : null;
  if (user && isBanned(user)) return res.redirect('/banned');
  if (req.session.siteUnlocked || user) return next();
  return res.redirect('/login');
};
app.get('/login', (req, res) => (req.session.siteUnlocked || (req.session.uid && db[req.session.uid])) ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'private-login.html')));
app.get('/private-login', (req, res) => res.redirect(301, '/login'));

function ownerPasswordMatches(value) {
  const supplied = String(value || '');
  const expected = String(SITE_PASSWORD || '');
  if (!expected) return false;
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
app.get('/api/invite/check', (req, res) => {
  const rec = keyRecordByValue(req.query.key);
  if (!rec) return res.json({ valid: false, status: 'invalid' });
  const status = rec.revokedAt ? 'revoked' : rec.redeemedAt ? 'redeemed' : 'valid';
  res.json({ valid: status === 'valid', status });
});
app.post('/api/invite-login', async (req, res) => {
  const supplied = String(req.body?.key || req.body?.password || '');
  if (ownerPasswordMatches(supplied)) {
    req.session.siteUnlocked = true;
    req.session.ownerBypass = true;
    delete req.session.pendingInviteKeyId;
    return res.json({ ok: true, owner: true });
  }
  const rec = keyRecordByValue(supplied);
  if (!rec) return res.status(401).json({ error: 'Invite Key ist ungültig.' });
  if (rec.revokedAt) return res.status(410).json({ error: 'Dieser Invite Key wurde deaktiviert.' });
  if (rec.redeemedAt) return res.status(409).json({ error: 'Dieser Invite Key wurde bereits eingelöst.' });
  req.session.siteUnlocked = true;
  req.session.ownerBypass = false;
  req.session.pendingInviteKeyId = rec.id;
  res.json({ ok: true });
});
// Alte API bleibt als Alias erhalten, damit bestehende Clients nicht brechen.
app.post('/api/private-login', (req, res, next) => {
  req.body = { key: req.body?.password || req.body?.key || '' };
  const supplied = String(req.body.key || '');
  if (ownerPasswordMatches(supplied)) {
    req.session.siteUnlocked = true; req.session.ownerBypass = true; delete req.session.pendingInviteKeyId;
    return res.json({ ok: true, owner: true });
  }
  const rec = keyRecordByValue(supplied);
  if (!rec) return res.status(401).json({ error: 'Invite Key ist ungültig.' });
  if (rec.revokedAt) return res.status(410).json({ error: 'Dieser Invite Key wurde deaktiviert.' });
  if (rec.redeemedAt) return res.status(409).json({ error: 'Dieser Invite Key wurde bereits eingelöst.' });
  req.session.siteUnlocked = true; req.session.pendingInviteKeyId = rec.id; req.session.ownerBypass = false;
  res.json({ ok: true });
});
app.post('/api/private-logout', (req, res) => { req.session.siteUnlocked = false; delete req.session.pendingInviteKeyId; delete req.session.ownerBypass; res.json({ ok: true }); });
app.get('/api/session-info', (req, res) => {
  const user = req.session.uid && db[req.session.uid] ? db[req.session.uid] : null;
  if (!user) return res.json({ authenticated: false, isAdmin: false });
  const view = publicView(user);
  res.json({ authenticated: true, isAdmin: isAdminId(user.id), isModerator: isModerator(user), premium: !!metaFor(user).premium, user: { id: user.id, username: view.username, name: view.displayName || view.discord?.globalName || view.discord?.username || view.username, avatar: view.discord?.avatar || '' } });
});
app.get('/private-login.html', (req, res) => res.redirect(301, '/login'));
app.get('/dashboard.html', (req, res) => res.redirect(302, '/dashboard'));
app.use('/uploads', express.static(UP_DIR, { setHeaders: r => r.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const auth = (req, res, next) => {
  const user = req.session.uid && db[req.session.uid] ? db[req.session.uid] : null;
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  if (isBanned(user)) return res.status(403).json({ error: 'Account gesperrt', banned: true });
  next();
};
const adminOnly = (req, res, next) => {
  const user = req.session.uid && db[req.session.uid] ? db[req.session.uid] : null;
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  if (isBanned(user)) return res.status(403).json({ error: 'Account gesperrt', banned: true });
  if (!isAdminId(user.id)) return res.status(403).json({ error: 'Keine Admin-Berechtigung' });
  next();
};
const keyManagerOnly = (req, res, next) => {
  const user = req.session.uid && db[req.session.uid] ? db[req.session.uid] : null;
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  if (isBanned(user)) return res.status(403).json({ error: 'Account gesperrt', banned: true });
  if (!isAdminId(user.id) && !isModerator(user)) return res.status(403).json({ error: 'Keine Moderator-Berechtigung' });
  next();
};

// --- Discord OAuth ---
app.get('/auth/discord', (req, res) => {
  if (!CID || !SECRET) return res.status(500).send('DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET fehlen in der .env');
  req.session.state = crypto.randomBytes(16).toString('hex');
  req.session.oauthStartedAt = Date.now();
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
    let user = db[dc.id];
    const isNew = !user;
    if (isNew) {
      let invite = null;
      if (req.session.pendingInviteKeyId) invite = adminState.keys.find(x => x.id === req.session.pendingInviteKeyId);
      const ownerBypass = !!req.session.ownerBypass || isAdminId(dc.id);
      if (!ownerBypass && (!invite || invite.revokedAt || invite.redeemedAt)) {
        req.session.siteUnlocked = false;
        return res.redirect('/login?error=invite-required');
      }
      user = db[dc.id] = defaults(dc);
      metaFor(user);
      if (invite && !ownerBypass) {
        invite.redeemedAt = Date.now(); invite.redeemedBy = dc.id; invite.redeemedUsername = dc.globalName || dc.username;
        user.adminMeta.inviteKeyId = invite.id;
        audit('key_redeemed', { keyId: invite.id, userId: dc.id });
        await saveAdminState();
      }
      audit('signup', { userId: dc.id });
    } else { metaFor(user); }
    if (isBanned(user)) {
      req.session.uid = dc.id; req.session.siteUnlocked = false;
      user.adminMeta.lastLoginAt = Date.now(); user.discord = dc; user.auth = { access: tok.access_token, refresh: tok.refresh_token }; await saveUser(user);
      return res.redirect('/banned');
    }
    user.discord = dc;
    user.auth = { access: tok.access_token, refresh: tok.refresh_token };
    user.adminMeta.lastLoginAt = Date.now();
    await saveUser(user);
    req.session.uid = dc.id;
    req.session.siteUnlocked = true;
    delete req.session.pendingInviteKeyId; delete req.session.ownerBypass;
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

// --- Public profile statistics ---
function analyticsDayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function ensureAnalytics(user) {
  user.analytics ||= { viewsDaily:{}, eventsDaily:{}, socialClicks:{}, highlightClicks:{}, musicPlays:0, musicSkips:0, referrers:{}, devices:{} };
  const a=user.analytics;
  a.viewsDaily ||= {}; a.eventsDaily ||= {}; a.socialClicks ||= {}; a.highlightClicks ||= {}; a.referrers ||= {}; a.devices ||= {};
  a.musicPlays=Number(a.musicPlays||0);a.musicSkips=Number(a.musicSkips||0);
  const cutoff=Date.now()-370*86400000;
  for(const bucket of [a.viewsDaily,a.eventsDaily]) for(const k of Object.keys(bucket)){const t=Date.parse(`${k}T00:00:00Z`);if(!Number.isFinite(t)||t<cutoff)delete bucket[k]}
  return a;
}
function deviceBucket(req){const ua=String(req.get('user-agent')||'');if(/ipad|tablet/i.test(ua))return 'Tablet';if(/mobile|android|iphone/i.test(ua))return 'Mobile';return 'Desktop'}
function referrerBucket(req){try{const supplied=str(req.query?.ref,80).trim().toLowerCase().replace(/^www\./,'');if(supplied&&/^[a-z0-9.-]+$/i.test(supplied)){const own=new URL(BASE_URL).hostname.replace(/^www\./,'');return supplied===own?'Caruzo':supplied}const raw=String(req.get('referer')||'');if(!raw)return 'Direct';const h=new URL(raw).hostname.replace(/^www\./,'');if(!h||h===new URL(BASE_URL).hostname)return 'Caruzo';return h.slice(0,80)}catch{return 'Direct'}}
function recordProfileView(user, req){
  const a=ensureAnalytics(user),key=analyticsDayKey();a.viewsDaily[key]=Number(a.viewsDaily[key]||0)+1;
  const dev=deviceBucket(req);a.devices[dev]=Number(a.devices[dev]||0)+1;
  const ref=referrerBucket(req);a.referrers[ref]=Number(a.referrers[ref]||0)+1;
}
function recordProfileEvent(user,type,key=''){
  const a=ensureAnalytics(user),day=analyticsDayKey();a.eventsDaily[day]||={social:0,highlight:0,musicPlay:0,musicSkip:0};const d=a.eventsDaily[day];
  if(type==='social'){d.social=Number(d.social||0)+1;key=str(key,48)||'other';a.socialClicks[key]=Number(a.socialClicks[key]||0)+1}
  if(type==='highlight'){d.highlight=Number(d.highlight||0)+1;key=str(key,48)||'highlight';a.highlightClicks[key]=Number(a.highlightClicks[key]||0)+1}
  if(type==='music_play'){d.musicPlay=Number(d.musicPlay||0)+1;a.musicPlays++}
  if(type==='music_skip'){d.musicSkip=Number(d.musicSkip||0)+1;a.musicSkips++}
}
function statisticsSummary(user,days=30){
  const allowed=[7,30,90,365];days=allowed.includes(Number(days))?Number(days):30;const a=ensureAnalytics(user),r=ensureReactionStats(user);
  const daily=[];let viewsPeriod=0,reactionsPeriod=0,socialPeriod=0,musicPeriod=0,highlightPeriod=0;
  for(let i=days-1;i>=0;i--){const key=analyticsDayKey(Date.now()-i*86400000),ev=a.eventsDaily[key]||{},rv=Number(a.viewsDaily[key]||0),rr=Number(r.daily?.[key]?.total||0),sc=Number(ev.social||0),mp=Number(ev.musicPlay||0),hc=Number(ev.highlight||0);viewsPeriod+=rv;reactionsPeriod+=rr;socialPeriod+=sc;musicPeriod+=mp;highlightPeriod+=hc;daily.push({date:key,views:rv,reactions:rr,social:sc,music:mp,highlights:hc})}
  const topMap=(obj,limit=6)=>Object.entries(obj||{}).map(([key,value])=>({key,value:Number(value||0)})).sort((x,y)=>y.value-x.value).slice(0,limit);
  const totalReactions=Number(r.total||0),totalViews=Number(user.views||0),totalSocial=Object.values(a.socialClicks).reduce((n,v)=>n+Number(v||0),0),totalHighlights=Object.values(a.highlightClicks).reduce((n,v)=>n+Number(v||0),0);
  const today=daily[daily.length-1]||{};
  return {days,totalViews,viewsToday:Number(today.views||0),viewsPeriod,totalReactions,reactionsPeriod,totalSocial,socialPeriod,totalHighlights,highlightPeriod,musicPlays:Number(a.musicPlays||0),musicPeriod,musicSkips:Number(a.musicSkips||0),engagementRate:totalViews?Math.round(((totalReactions+totalSocial+totalHighlights)/totalViews)*1000)/10:0,daily,topSocials:topMap(a.socialClicks),topHighlights:topMap(a.highlightClicks),topReferrers:topMap(a.referrers),devices:topMap(a.devices),topReactions:reactionSummary(user,days).breakdown.slice(0,6)};
}
app.get('/api/statistics', auth, (req,res)=>res.json(statisticsSummary(db[req.session.uid],req.query.days)));
app.post('/api/profile/:name/event', async (req,res)=>{
  const user=findByName(req.params.name);if(!user||isBanned(user)||user.privacy?.visibility==='disabled')return res.status(404).json({error:'Profil nicht verfügbar'});
  const type=str(req.body?.type,24),key=str(req.body?.key,48);if(!['social','highlight','music_play','music_skip'].includes(type))return res.status(400).json({error:'Unbekanntes Event'});
  req.session.profileEvents ||= {};const lock=`${user.id}:${type}:${key}`;const last=Number(req.session.profileEvents[lock]||0);if(Date.now()-last<1200)return res.json({ok:true,ignored:true});req.session.profileEvents[lock]=Date.now();
  recordProfileEvent(user,type,key);await saveUser(user);res.json({ok:true});
});

// --- Profile Reactions ---
function reactionDayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function ensureReactionStats(user) {
  user.reactionStats ||= { total: 0, byItem: {}, daily: {} };
  user.reactionStats.byItem ||= {}; user.reactionStats.daily ||= {};
  if (!Number.isFinite(Number(user.reactionStats.total))) user.reactionStats.total = 0;
  const cutoff = Date.now() - 370 * 86400000;
  for (const k of Object.keys(user.reactionStats.daily)) {
    const t = Date.parse(`${k}T00:00:00Z`);
    if (!Number.isFinite(t) || t < cutoff) delete user.reactionStats.daily[k];
  }
  return user.reactionStats;
}
function reactionSummary(user, days = 30) {
  const stats = ensureReactionStats(user);
  const allowed = [7,30,90,365];
  days = allowed.includes(Number(days)) ? Number(days) : 30;
  const items = Array.isArray(user.reactions?.items) ? user.reactions.items : [];
  const dates = [];
  const byItemRange = {};
  let periodTotal = 0;
  for (let i = days - 1; i >= 0; i--) {
    const ts = Date.now() - i * 86400000;
    const key = reactionDayKey(ts);
    const day = stats.daily[key] || { total:0, byItem:{} };
    const total = Number(day.total || 0);
    periodTotal += total;
    for (const [id, n] of Object.entries(day.byItem || {})) byItemRange[id] = (byItemRange[id] || 0) + Number(n || 0);
    dates.push({ date:key, value:total });
  }
  const today = Number(stats.daily[reactionDayKey()]?.total || 0);
  const breakdown = items.map(x => ({ id:x.id, emoji:x.emoji, label:x.label, total:Number(stats.byItem[x.id] || 0), period:Number(byItemRange[x.id] || 0) })).sort((a,b)=>b.period-a.period || b.total-a.total);
  const top = breakdown[0] || null;
  return {
    days, total:Number(stats.total || 0), today, periodTotal, views:Number(user.views || 0),
    rate:Number(user.views || 0) > 0 ? Math.round((Number(stats.total || 0) / Number(user.views || 1)) * 1000) / 10 : 0,
    top, breakdown, daily:dates,
  };
}

app.get('/api/reactions/stats', auth, (req, res) => {
  const user = db[req.session.uid];
  res.json(reactionSummary(user, req.query.days));
});

app.post('/api/profile/:name/reaction', async (req, res) => {
  const user = findByName(req.params.name);
  if (!user || isBanned(user) || user.privacy?.visibility === 'disabled') return res.status(404).json({ error:'Profil nicht verfügbar' });
  if (user.reactions?.enabled === false) return res.status(400).json({ error:'Reactions sind deaktiviert' });
  const itemId = str(req.body?.id, 48);
  const item = (Array.isArray(user.reactions?.items) ? user.reactions.items : []).find(x => x.id === itemId);
  if (!item) return res.status(400).json({ error:'Reaction nicht gefunden' });
  req.session.reactionVotes ||= {};
  const lockKey = `${user.id}:${itemId}`;
  const last = Number(req.session.reactionVotes[lockKey] || 0);
  if (Date.now() - last < 12 * 3600000) return res.status(429).json({ error:'Diese Reaction hast du vor Kurzem bereits verwendet.', cooldown:true });
  req.session.reactionVotes[lockKey] = Date.now();
  const stats = ensureReactionStats(user);
  stats.total = Number(stats.total || 0) + 1;
  stats.byItem[itemId] = Number(stats.byItem[itemId] || 0) + 1;
  const key = reactionDayKey();
  stats.daily[key] ||= { total:0, byItem:{} };
  stats.daily[key].total = Number(stats.daily[key].total || 0) + 1;
  stats.daily[key].byItem ||= {};
  stats.daily[key].byItem[itemId] = Number(stats.daily[key].byItem[itemId] || 0) + 1;
  await saveUser(user);
  res.json({ ok:true, count:Number(stats.byItem[itemId] || 0), total:Number(stats.total || 0) });
});

// --- Preset Marketplace ---
app.get('/api/marketplace', auth, (req, res) => {
  adminState.marketplace ||= [];
  const uid = String(req.session.uid || '');
  const scope = String(req.query.scope || 'public');
  const q = str(req.query.q, 80).trim().toLowerCase();
  let items = adminState.marketplace.filter(x => x && x.id);
  if (scope === 'mine') items = items.filter(x => presetOwned(x, uid));
  else items = items.filter(x => x.visibility === 'public');
  if (q) items = items.filter(x => `${x.name || ''} ${x.description || ''} ${x.authorUsername || ''} ${x.authorDisplayName || ''}`.toLowerCase().includes(q));
  items.sort((a,b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  res.json({ items: items.slice(0, 200).map(x => marketplaceMeta(x, uid)) });
});

app.post('/api/marketplace', auth, async (req, res) => {
  adminState.marketplace ||= [];
  const uid = String(req.session.uid || '');
  const user = db[uid];
  const owned = adminState.marketplace.filter(x => presetOwned(x, uid));
  if (owned.length >= MARKET_MAX_PER_USER) return res.status(400).json({ error: `Maximal ${MARKET_MAX_PER_USER} eigene Presets.` });
  const visibility = MARKET_VIS.has(String(req.body?.visibility || '')) ? String(req.body.visibility) : 'private';
  const name = str(req.body?.name, 48).trim();
  if (name.length < 2) return res.status(400).json({ error: 'Preset-Name: mindestens 2 Zeichen.' });
  const description = str(req.body?.description, 180).trim();
  const snapshot = visibility === 'public' ? publicPresetSnapshot(user) : privatePresetSnapshot(user);
  const rec = {
    id: crypto.randomUUID(), ownerId: uid, name, description, visibility,
    scope: visibility === 'public' ? 'style' : 'full', snapshot,
    authorUsername: user.username, authorDisplayName: user.displayName, authorAvatar: user.discord?.avatar || '',
    savedCount: 0, loadCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
  };
  adminState.marketplace.unshift(rec);
  audit('market_preset_created', { presetId: rec.id, visibility, by: uid });
  await saveAdminState();
  res.json({ ok: true, item: marketplaceMeta(rec, uid) });
});

app.patch('/api/marketplace/:id', auth, async (req, res) => {
  adminState.marketplace ||= [];
  const uid = String(req.session.uid || '');
  const rec = adminState.marketplace.find(x => x.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Preset nicht gefunden.' });
  if (!presetOwned(rec, uid)) return res.status(403).json({ error: 'Nur der Besitzer kann dieses Preset ändern.' });
  if (req.body?.name !== undefined) {
    const name = str(req.body.name, 48).trim();
    if (name.length < 2) return res.status(400).json({ error: 'Preset-Name: mindestens 2 Zeichen.' });
    rec.name = name;
  }
  if (req.body?.description !== undefined) rec.description = str(req.body.description, 180).trim();
  if (req.body?.visibility !== undefined) {
    const vis = String(req.body.visibility);
    if (!MARKET_VIS.has(vis)) return res.status(400).json({ error: 'Ungültige Sichtbarkeit.' });
    if (vis !== rec.visibility) {
      if (vis === 'public') {
        rec.snapshot = publicPresetSnapshot(rec.snapshot);
        rec.scope = 'style';
      }
      rec.visibility = vis;
    }
  }
  rec.updatedAt = Date.now();
  audit('market_preset_updated', { presetId: rec.id, visibility: rec.visibility, by: uid });
  await saveAdminState();
  res.json({ ok: true, item: marketplaceMeta(rec, uid) });
});

app.post('/api/marketplace/:id/update-from-profile', auth, async (req, res) => {
  adminState.marketplace ||= [];
  const uid = String(req.session.uid || '');
  const rec = adminState.marketplace.find(x => x.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Preset nicht gefunden.' });
  if (!presetOwned(rec, uid)) return res.status(403).json({ error: 'Nur der Besitzer kann dieses Preset aktualisieren.' });
  const user = db[uid];
  rec.snapshot = rec.visibility === 'public' ? publicPresetSnapshot(user) : privatePresetSnapshot(user);
  rec.scope = rec.visibility === 'public' ? 'style' : 'full';
  rec.updatedAt = Date.now();
  audit('market_preset_resnapshotted', { presetId: rec.id, visibility: rec.visibility, by: uid });
  await saveAdminState();
  res.json({ ok: true, item: marketplaceMeta(rec, uid) });
});

app.post('/api/marketplace/:id/apply', auth, async (req, res) => {
  adminState.marketplace ||= [];
  const uid = String(req.session.uid || '');
  const rec = adminState.marketplace.find(x => x.id === req.params.id);
  if (!rec || (rec.visibility !== 'public' && !presetOwned(rec, uid))) return res.status(404).json({ error: 'Preset nicht gefunden.' });
  const user = db[uid];
  applyPresetSnapshot(user, rec.snapshot, rec.scope || (rec.visibility === 'public' ? 'style' : 'full'));
  if (rec.visibility === 'public') rec.loadCount = Number(rec.loadCount || 0) + 1;
  rec.updatedAt ||= rec.createdAt;
  await Promise.all([saveUser(user), rec.visibility === 'public' ? saveAdminState() : Promise.resolve()]);
  res.json({ ok: true, user: publicView(user), item: marketplaceMeta(rec, uid) });
});

app.post('/api/marketplace/:id/save', auth, async (req, res) => {
  adminState.marketplace ||= [];
  const uid = String(req.session.uid || '');
  const source = adminState.marketplace.find(x => x.id === req.params.id && x.visibility === 'public');
  if (!source) return res.status(404).json({ error: 'Öffentliches Preset nicht gefunden.' });
  const owned = adminState.marketplace.filter(x => presetOwned(x, uid));
  if (owned.length >= MARKET_MAX_PER_USER) return res.status(400).json({ error: `Maximal ${MARKET_MAX_PER_USER} eigene Presets.` });
  const user = db[uid];
  const rec = {
    id: crypto.randomUUID(), ownerId: uid, name: str(source.name,48) || 'Gespeichertes Preset',
    description: str(source.description,180), visibility: 'private', scope: 'style', snapshot: deepClone(source.snapshot),
    sourcePresetId: source.id, authorUsername: user.username, authorDisplayName: user.displayName, authorAvatar: user.discord?.avatar || '',
    savedCount: 0, loadCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
  };
  source.savedCount = Number(source.savedCount || 0) + 1;
  adminState.marketplace.unshift(rec);
  audit('market_preset_saved', { presetId: source.id, copyId: rec.id, by: uid });
  await saveAdminState();
  res.json({ ok: true, item: marketplaceMeta(rec, uid) });
});

app.delete('/api/marketplace/:id', auth, async (req, res) => {
  adminState.marketplace ||= [];
  const uid = String(req.session.uid || '');
  const i = adminState.marketplace.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Preset nicht gefunden.' });
  if (!presetOwned(adminState.marketplace[i], uid)) return res.status(403).json({ error: 'Nur der Besitzer kann dieses Preset löschen.' });
  const [rec] = adminState.marketplace.splice(i, 1);
  audit('market_preset_deleted', { presetId: rec.id, by: uid });
  await saveAdminState();
  res.json({ ok: true });
});


// --- Spotify OAuth ---
// Encrypted state keeps the PKCE verifier off the URL while still surviving a
// lost Express session during the external Spotify redirect.
function spotifyStateKey() { return crypto.createHash('sha256').update(String(SESSION_SECRET)).digest(); }
function spotifyStateSeal(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', spotifyStateKey(), iv);
  const plain = Buffer.from(JSON.stringify(payload));
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}
function spotifyStateOpen(value) {
  try {
    const [ivB64, tagB64, encB64] = String(value || '').split('.');
    if (!ivB64 || !tagB64 || !encB64) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', spotifyStateKey(), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const plain = Buffer.concat([decipher.update(Buffer.from(encB64, 'base64url')), decipher.final()]);
    const data = JSON.parse(plain.toString('utf8'));
    if (!data?.uid || !data?.at || !data?.verifier || Date.now() - Number(data.at) > 15 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}
function spotifyDashboardRedirect(status, detail = '') {
  const q = new URLSearchParams({ spotify: status });
  if (detail) q.set('detail', String(detail).slice(0, 260));
  return `/dashboard?${q.toString()}#media`;
}
app.get('/auth/spotify', auth, (req, res) => {
  if (!spotifyConfigured()) return res.redirect(spotifyDashboardRedirect('not-configured', 'SPOTIFY_CLIENT_ID fehlt auf Render.'));
  const uid = String(req.session.uid || '');
  const user = db[uid];
  if (!uid || !user) return res.redirect('/login');
  const verifier = spotifyPkceVerifier();
  const challenge = spotifyPkceChallenge(verifier);
  const state = spotifyStateSeal({ uid, at: Date.now(), nonce: crypto.randomBytes(12).toString('hex'), verifier });
  setSpotifyDiag(user, 'authorize', true, 'Weiterleitung zu Spotify gestartet.', { flow: 'pkce' });
  // Do not make a failed diagnostic save block the redirect.
  saveUser(user).catch(() => {});
  const q = new URLSearchParams({
    client_id: SPOTIFY_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT,
    state,
    scope: 'user-read-private user-read-currently-playing user-read-playback-state',
    show_dialog: 'true',
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${q}`);
});

app.get('/auth/spotify/callback', async (req, res) => {
  let user = null;
  try {
    const { code, state, error, error_description: errorDescription } = req.query;
    const verified = spotifyStateOpen(state);
    if (!verified) return res.redirect(spotifyDashboardRedirect('state-error', 'OAuth State/PKCE konnte nicht validiert werden. Bitte erneut verbinden.'));
    const uid = String(verified.uid);
    user = db[uid];
    if (!user) return res.redirect('/login');
    req.session.uid = uid;
    req.session.siteUnlocked = true;

    if (error) {
      const detail = errorDescription || error;
      setSpotifyDiag(user, 'authorize', false, detail, { flow: 'pkce' });
      await saveUser(user);
      return res.redirect(spotifyDashboardRedirect('denied', detail));
    }
    if (!code) {
      setSpotifyDiag(user, 'callback', false, 'Spotify hat keinen Authorization Code zurückgegeben.', { flow: 'pkce' });
      await saveUser(user);
      return res.redirect(spotifyDashboardRedirect('error', 'Spotify hat keinen Authorization Code zurückgegeben.'));
    }

    const tr = await spotifyTokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT,
      code_verifier: verified.verifier,
    }, 'pkce');
    const tok = tr?.ok ? tr.data : null;
    if (!tok?.access_token) {
      const detail = tr?.error || `Token HTTP ${tr?.status || 0}`;
      setSpotifyDiag(user, 'token', false, detail, { status: tr?.status || 0, flow: 'pkce' });
      await saveUser(user);
      return res.redirect(spotifyDashboardRedirect('token-error', detail));
    }

    const meResp = await spotifyApi(tok.access_token, '/me');
    if (!meResp.ok || !meResp.data) {
      const detail = meResp.data?.error?.message || `Spotify Profil HTTP ${meResp.status || 0}`;
      setSpotifyDiag(user, 'profile', false, detail, { status: meResp.status || 0, flow: 'pkce' });
      await saveUser(user);
      return res.redirect(spotifyDashboardRedirect('profile-error', detail));
    }

    user.spotifyAuth = {
      access: tok.access_token,
      refresh: tok.refresh_token || '',
      expiresAt: Date.now() + Number(tok.expires_in || 3600) * 1000,
      scope: tok.scope || '',
      flow: 'pkce',
      authorizedAt: Date.now(),
    };
    user.spotifyAccount = spotifyAccountView(meResp.data);
    setSpotifyDiag(user, 'connected', true, `Spotify verbunden: ${user.spotifyAccount?.displayName || 'Account'}`, { flow: 'pkce' });
    spotifyNowCache.delete(String(user.id));
    await saveUser(user);

    return req.session.save(err => {
      if (err) console.error('Spotify callback session save:', err.message);
      res.redirect(spotifyDashboardRedirect('connected'));
    });
  } catch (e) {
    console.error('Spotify callback:', e);
    if (user) { setSpotifyDiag(user, 'callback', false, e?.message || 'Unbekannter Callback-Fehler', { flow: 'pkce' }); await saveUser(user).catch(()=>{}); }
    return res.redirect(spotifyDashboardRedirect('error', e?.message || 'Unbekannter Callback-Fehler'));
  }
});

app.get('/api/spotify/status', auth, async (req, res) => {
  const user = db[req.session.uid];
  const presence = await spotifyPresenceSnapshot(user.discord?.id || user.id);
  const now = spotifyNowFromDiscordPresence(presence);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    connected: true,
    configured: true,
    authMode: 'discord-presence',
    account: null,
    diagnostic: null,
    now,
    source: now.source || presence?.source || 'discord',
    message: 'Spotify Now Playing wird automatisch aus deiner Discord-Aktivität gelesen.'
  });
});
app.post('/api/spotify/disconnect', auth, async (req, res) => {
  const user = db[req.session.uid];
  user.spotifyAuth = null; user.spotifyAccount = null; spotifyNowCache.delete(String(user.id));
  setSpotifyDiag(user, 'disconnected', true, 'Spotify-Verknüpfung getrennt.', { flow: 'pkce' });
  await saveUser(user); res.json({ ok: true });
});

app.get('/api/spotify/now/:name', async (req, res) => {
  const user = findByName(req.params.name === '__home__' ? HOME_USER : req.params.name);
  if (!user || isBanned(user)) return res.status(404).json({ active: false });
  res.set('Cache-Control', 'no-store');
  if (user.settings?.showSpotifyNowPlaying === false) return res.json({ active: false, connected: true, source: 'discord' });
  const presence = await spotifyPresenceSnapshot(user.discord?.id || user.id);
  res.json(spotifyNowFromDiscordPresence(presence));
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
  await syncUserBoostState(user, true);
  await saveUser(user);
  res.json(publicView(user));
});

app.get('/api/discord/boost-status', auth, async (req, res) => {
  const user = db[req.session.uid];
  const before = !!user.discord?.booster;
  const beforeCheckedAt = Number(user.discord?.boosterCheckedAt || 0);
  const st = await syncUserBoostState(user, false);
  if (before !== !!user.discord?.booster || beforeCheckedAt !== Number(user.discord?.boosterCheckedAt || 0)) await saveUser(user);
  res.set('Cache-Control', 'no-store');
  res.json({
    available: !!st?.available,
    boosted: !!st?.boosted,
    premiumSince: st?.premiumSince || '',
    guildId: st?.guildId || '',
    reason: st?.reason || '',
    asset: '/discord-boost.png',
    discord: publicView(user).discord,
  });
});

const EXT = {
  background: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm'],
  music: ['.mp3', '.ogg', '.wav', '.m4a'],
  share: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  premium: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
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
  if (req.params.kind === 'premium' && !metaFor(db[req.session.uid]).premium) return res.status(403).json({ error: 'Premium erforderlich' });
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


// --- Admin Panel ----------------------------------------------------
function adminUserView(user) {
  const m = metaFor(user);
  return {
    id: String(user.id), username: user.username || '', displayName: user.displayName || user.discord?.globalName || user.discord?.username || '',
    avatar: user.discord?.avatar || '', views: Number(user.views || 0), createdAt: Number(user.createdAt || 0), lastLoginAt: Number(m.lastLoginAt || 0),
    banned: !!m.banned, bannedReason: m.bannedReason || '', bannedAt: Number(m.bannedAt || 0), premium: !!m.premium, premiumAt: Number(m.premiumAt || 0),
    moderator: isModerator(user), moderatorAt: Number(m.moderatorAt || 0), admin: isAdminId(user.id), inviteKeyId: m.inviteKeyId || ''
  };
}
function dayKey(ts) { const d = new Date(ts); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`; }
app.get('/api/admin/overview', keyManagerOnly, (req, res) => {
  const users = Object.values(db).filter(u => u && u.id);
  const totalViews = users.reduce((n,u)=>n+Number(u.views||0),0);
  const banned = users.filter(u=>metaFor(u).banned).length;
  const premium = users.filter(u=>metaFor(u).premium).length;
  const activeKeys = adminState.keys.filter(k=>!k.revokedAt&&!k.redeemedAt).length;
  const now = Date.now(), days=[];
  for(let i=13;i>=0;i--){ const t=now-i*86400000; const key=dayKey(t); days.push({ key, label:new Date(t).toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'}), value:0 }); }
  const map=new Map(days.map(d=>[d.key,d]));
  users.forEach(u=>{ const d=map.get(dayKey(Number(u.createdAt||0))); if(d)d.value++; });
  const recentUsers = [...users].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,8).map(adminUserView);
  res.json({ stats:{ totalUsers:users.length,totalViews,banned,premium,keys:activeKeys }, signups:days, recentUsers, audit:adminState.audit.slice(0,12) });
});
app.get('/api/admin/users', keyManagerOnly, (req, res) => {
  const q=String(req.query.q||'').trim().toLowerCase();
  let users=Object.values(db).filter(u=>u&&u.id);
  if(q) users=users.filter(u=>[u.id,u.username,u.displayName,u.discord?.username,u.discord?.globalName].some(v=>String(v||'').toLowerCase().includes(q)));
  users.sort((a,b)=>Number(metaFor(b).lastLoginAt||b.createdAt||0)-Number(metaFor(a).lastLoginAt||a.createdAt||0));
  res.json({ users:users.slice(0,100).map(adminUserView) });
});
app.post('/api/admin/users/:id/ban', adminOnly, async (req,res)=>{
  const user=db[String(req.params.id)]; if(!user)return res.status(404).json({error:'User nicht gefunden'});
  if(isAdminId(user.id))return res.status(400).json({error:'Der Owner-Admin kann nicht gebannt werden.'});
  const m=metaFor(user); m.banned=true; m.bannedReason=str(req.body?.reason,180)||'Von der Administration gesperrt.'; m.bannedAt=Date.now();
  audit('user_banned',{userId:user.id,by:req.session.uid}); await Promise.all([saveUser(user),saveAdminState()]); res.json({ok:true,user:adminUserView(user)});
});
app.post('/api/admin/users/:id/unban', adminOnly, async (req,res)=>{
  const user=db[String(req.params.id)]; if(!user)return res.status(404).json({error:'User nicht gefunden'});
  const m=metaFor(user); m.banned=false; m.bannedReason=''; m.bannedAt=0;
  audit('user_unbanned',{userId:user.id,by:req.session.uid}); await Promise.all([saveUser(user),saveAdminState()]); res.json({ok:true,user:adminUserView(user)});
});
app.post('/api/admin/users/:id/premium', adminOnly, async (req,res)=>{
  const user=db[String(req.params.id)]; if(!user)return res.status(404).json({error:'User nicht gefunden'});
  const m=metaFor(user); m.premium=!!req.body?.enabled; m.premiumAt=m.premium?Date.now():0;
  audit(m.premium?'premium_granted':'premium_removed',{userId:user.id,by:req.session.uid}); await Promise.all([saveUser(user),saveAdminState()]); res.json({ok:true,user:adminUserView(user)});
});
app.post('/api/admin/users/:id/moderator', adminOnly, async (req,res)=>{
  const user=db[String(req.params.id)]; if(!user)return res.status(404).json({error:'User nicht gefunden'});
  if(isAdminId(user.id))return res.status(400).json({error:'Der Owner-Admin benötigt keine Moderator-Rolle.'});
  const m=metaFor(user); m.moderator=!!req.body?.enabled; m.moderatorAt=m.moderator?Date.now():0;
  audit(m.moderator?'moderator_granted':'moderator_removed',{userId:user.id,by:req.session.uid}); await Promise.all([saveUser(user),saveAdminState()]); res.json({ok:true,user:adminUserView(user)});
});
app.get('/api/admin/keys', keyManagerOnly, (req,res)=>{
  const owner=isAdminId(req.session.uid);
  const keys=[...adminState.keys].filter(k=>owner||String(k.createdBy||'')===String(req.session.uid)).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
  res.json({keys,canManage:owner});
});
app.post('/api/admin/keys', keyManagerOnly, async (req,res)=>{
  let key; do{key=makeInviteKey()}while(adminState.keys.some(x=>x.key===key));
  const rec={id:crypto.randomUUID(),key,label:str(req.body?.label,60)||'Invite',createdAt:Date.now(),createdBy:req.session.uid,redeemedAt:0,redeemedBy:'',redeemedUsername:'',revokedAt:0};
  adminState.keys.unshift(rec); audit('key_created',{keyId:rec.id,by:req.session.uid}); await saveAdminState(); res.json({ok:true,key:rec});
});
app.post('/api/admin/keys/:id/revoke', adminOnly, async (req,res)=>{
  const rec=adminState.keys.find(x=>x.id===req.params.id); if(!rec)return res.status(404).json({error:'Key nicht gefunden'});
  if(rec.redeemedAt)return res.status(400).json({error:'Eingelöste Keys können nicht deaktiviert werden.'});
  rec.revokedAt=rec.revokedAt?0:Date.now(); audit(rec.revokedAt?'key_revoked':'key_reactivated',{keyId:rec.id,by:req.session.uid}); await saveAdminState(); res.json({ok:true,key:rec});
});
app.post('/api/admin/keys/:id/replace', adminOnly, async (req,res)=>{
  const old=adminState.keys.find(x=>x.id===req.params.id); if(!old)return res.status(404).json({error:'Key nicht gefunden'});
  if(!old.redeemedAt)old.revokedAt=Date.now();
  let key; do{key=makeInviteKey()}while(adminState.keys.some(x=>x.key===key));
  const rec={id:crypto.randomUUID(),key,label:(old.label||'Invite')+' · replacement',createdAt:Date.now(),createdBy:req.session.uid,replaces:old.id,redeemedAt:0,redeemedBy:'',redeemedUsername:'',revokedAt:0};
  adminState.keys.unshift(rec); audit('key_replaced',{keyId:old.id,newKeyId:rec.id,by:req.session.uid}); await saveAdminState(); res.json({ok:true,key:rec});
});
// --- Site-Hintergründe (Hauptseite + Dashboard) -----------------------
app.get('/api/site-settings', (req, res) => {
  ensureAdminSettings();
  res.set('Cache-Control', 'no-store');
  res.json({
    backgrounds: { ...adminState.settings.backgrounds },
    scrollAnimations: { ...adminState.settings.scrollAnimations },
    landingCursor: adminState.settings.landingCursor || 'none',
    page404Design: adminState.settings.page404Design || '1',
  });
});
app.post('/api/admin/backgrounds', adminOnly, async (req, res) => {
  const page = String(req.body?.page || ''), preset = String(req.body?.preset ?? '');
  if (!['landing', 'dashboard', 'login'].includes(page)) return res.status(400).json({ error: 'Ungültige Seite' });
  const valid = page === 'login' ? /^(none|[1-8])$/.test(preset) : /^(none|[1-9]|1[0-7])$/.test(preset);
  if (!valid) return res.status(400).json({ error: 'Ungültiges Preset' });
  ensureAdminSettings();
  adminState.settings.backgrounds[page] = preset;
  audit('background_changed', { page, preset, by: req.session.uid });
  await saveAdminState();
  res.json({ ok: true, backgrounds: { ...adminState.settings.backgrounds } });
});
app.post('/api/admin/404-design', adminOnly, async (req, res) => {
  const design = String(req.body?.design || '1');
  if (!/^[1-8]$/.test(design)) return res.status(400).json({ error: 'Ungültiges 404-Design' });
  ensureAdminSettings();
  adminState.settings.page404Design = design;
  audit('404_design_changed', { design, by: req.session.uid });
  await saveAdminState();
  res.json({ ok:true, page404Design:design });
});
app.post('/api/admin/scroll-animation', adminOnly, async (req, res) => {
  const page = String(req.body?.page || 'landing');
  const animation = String(req.body?.animation || 'none');
  if (page !== 'landing') return res.status(400).json({ error: 'Scroll Animation ist nur für die Hauptseite verfügbar' });
  if (!['none','fade-rise','slide-sides','scale-soft','blur-focus','stagger-cards','depth-flip','clip-reveal','glide-skew'].includes(animation)) return res.status(400).json({ error: 'Ungültige Scroll Animation' });
  ensureAdminSettings();
  adminState.settings.scrollAnimations[page] = animation;
  audit('scroll_animation_changed', { page, animation, by: req.session.uid });
  await saveAdminState();
  res.json({ ok:true, scrollAnimations:{ ...adminState.settings.scrollAnimations } });
});
app.post('/api/admin/landing-cursor', adminOnly, async (req, res) => {
  const cursor = String(req.body?.cursor || 'none');
  const allowed = ['none','neon-dot','halo-ring','precision','diamond','spark','pixel','orbit','minimal-arrow'];
  if (!allowed.includes(cursor)) return res.status(400).json({ error: 'Ungültiger Cursor' });
  ensureAdminSettings();
  adminState.settings.landingCursor = cursor;
  audit('landing_cursor_changed', { cursor, by: req.session.uid });
  await saveAdminState();
  res.json({ ok:true, landingCursor:cursor });
});
// --- Changelog ------------------------------------------------------
app.get('/api/changelog', (req,res)=>{
  const limit=Math.max(1,Math.min(5,Number(req.query.limit||5)));
  const items=[...adminState.changelog].filter(x=>x&&x.published!==false).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,limit);
  res.json({items});
});
app.get('/api/admin/changelog', adminOnly, (req,res)=>{
  res.json({items:[...adminState.changelog].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))});
});
app.post('/api/admin/changelog', adminOnly, async (req,res)=>{
  const type=['update','new','fix','maintenance'].includes(req.body?.type)?req.body.type:'update';
  const title=str(req.body?.title,80).trim(); const body=str(req.body?.body,1200).trim();
  if(!title||!body)return res.status(400).json({error:'Titel und Text sind erforderlich'});
  const rec={id:crypto.randomUUID(),type,version:str(req.body?.version,24).trim(),title,body,published:req.body?.published!==false,createdAt:Date.now(),createdBy:req.session.uid};
  adminState.changelog.unshift(rec); adminState.changelog=adminState.changelog.slice(0,100); audit('changelog_created',{changelogId:rec.id,by:req.session.uid}); await saveAdminState(); res.json({ok:true,item:rec});
});
app.post('/api/admin/changelog/:id/toggle', adminOnly, async (req,res)=>{
  const rec=adminState.changelog.find(x=>x.id===req.params.id);if(!rec)return res.status(404).json({error:'Eintrag nicht gefunden'});
  rec.published=!rec.published; audit('changelog_toggled',{changelogId:rec.id,by:req.session.uid}); await saveAdminState(); res.json({ok:true,item:rec});
});
app.delete('/api/admin/changelog/:id', adminOnly, async (req,res)=>{
  const i=adminState.changelog.findIndex(x=>x.id===req.params.id);if(i<0)return res.status(404).json({error:'Eintrag nicht gefunden'});
  const [rec]=adminState.changelog.splice(i,1); audit('changelog_deleted',{changelogId:rec.id,by:req.session.uid}); await saveAdminState(); res.json({ok:true});
});

app.get('/api/ban-info', (req,res)=>{
  const user=req.session.uid&&db[req.session.uid]?db[req.session.uid]:null;
  if(!user||!isBanned(user))return res.json({banned:false});
  const m=metaFor(user); res.json({banned:true,reason:m.bannedReason||'Account gesperrt',at:m.bannedAt||0});
});

// Presence endpoint: Discord Gateway with targeted member/presence refresh + Lanyard fallback.
// A direct OAuth user token cannot expose normal Discord presence; Gateway presence is the authoritative source.
app.get('/api/presence/:id', async (req, res) => {
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  const id = String(req.params.id || '');
  const user = db[id];
  if (!user || isBanned(user)) return res.status(404).json({ success: false, error: 'User nicht gefunden' });

  let cached = presenceCache.get(id) || null;
  const cacheAge = cached ? Date.now() - Number(cached.updated_at || 0) : Infinity;
  let gatewayProbe = null;
  // Refresh aggressively if missing, stale, or offline. The targeted Opcode 8 request is what fixes
  // users who were not included in the initial GUILD_CREATE presence payload.
  if (gatewayReady && (!cached || cacheAge > 15000 || cached.discord_status === 'offline')) {
    try { gatewayProbe = await requestPresenceFromGateway(id); } catch {}
    if (gatewayProbe) cached = gatewayProbe;
  }

  let lanyard = null;
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 1800);
    const r = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(id)}`, { headers: { 'User-Agent': 'Caruzo/1.0', 'Cache-Control':'no-cache' }, signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) { const j = await r.json(); if (j?.success && j?.data) lanyard = { ...j.data, updated_at: Date.now(), source: 'lanyard' }; }
  } catch {}

  const gatewayFresh = cached && Date.now() - Number(cached.updated_at || 0) < 90000 ? cached : null;
  let data = gatewayFresh || lanyard;
  if (gatewayFresh && lanyard) {
    const gwOnline = gatewayFresh.discord_status && gatewayFresh.discord_status !== 'offline';
    const lyOnline = lanyard.discord_status && lanyard.discord_status !== 'offline';
    // Discord Gateway wins whenever it has a real online state/activity. Lanyard can rescue a stale/offline bot view.
    if (gwOnline || (gatewayFresh.activities || []).length) data = gatewayFresh;
    else if (lyOnline || (lanyard.activities || []).length) data = lanyard;
    else data = gatewayFresh;
  }
  if (!data) data = { discord_status:'offline', activities:[], updated_at:Date.now(), source: gatewayReady ? 'discord-bot-no-mutual-user' : 'unavailable' };

  res.json({
    success: true, data, gatewayReady,
    available: !!gatewayFresh || !!lanyard,
    diagnostics: {
      gatewayReady,
      gatewayIssue: discordGatewayIssue || '',
      guildsSeen: discordGuildIds.size,
      mutualGuildKnown: !!presenceGuildForUser.get(id),
      lanyardAvailable: !!lanyard,
      note: (!presenceGuildForUser.get(id) && !lanyard) ? 'Bot braucht einen gemeinsamen Server mit dem User; Lanyard funktioniert nur für von Lanyard überwachte Nutzer.' : ''
    }
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
function youtubeIdFromUrl(raw) {
  try {
    const u = new URL(String(raw || ''));
    if (/youtu\.be$/i.test(u.hostname)) return u.pathname.replace(/^\//,'').split('/')[0] || '';
    if (/youtube\.com$/i.test(u.hostname) || /youtube-nocookie\.com$/i.test(u.hostname)) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/i);
      return m ? m[1] : '';
    }
  } catch {}
  return '';
}
function absolutePublicUrl(v) {
  const clean = url(v);
  if (!clean) return '';
  return clean.startsWith('/') ? `${BASE_URL}${clean}` : clean;
}
function shareImageFor(user) {
  const mode = user.share?.imageMode || 'avatar';
  if (mode === 'custom' && url(user.share?.image)) return absolutePublicUrl(user.share.image);
  if (mode === 'background') {
    const bg = user.background || {};
    if (bg.type === 'image' && url(bg.url)) return absolutePublicUrl(bg.url);
    if (bg.type === 'youtube') {
      const id = youtubeIdFromUrl(bg.url);
      if (id) return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    }
  }
  return absolutePublicUrl(user.discord?.avatar) || `${BASE_URL}/caruzo-logo.png`;
}
function escHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function profilePageHtml(user) {
  const file = path.join(__dirname, 'public', 'profile.html');
  let html = fs.readFileSync(file, 'utf8');
  const title = str(user.share?.title, 70) || `${user.displayName || user.username} · Caruzo`;
  const description = str(user.share?.description, 180) || str(user.tagline, 160) || `Profil von ${user.displayName || user.username} auf Caruzo.`;
  const image = shareImageFor(user);
  const canonical = `${BASE_URL}/${encodeURIComponent(user.username)}`;
  const accent = /^#[0-9a-f]{6}$/i.test(user.design?.accentColor || '') ? user.design.accentColor : '#8b5cf6';
  const robots = user.privacy?.visibility === 'unlisted' || user.privacy?.noIndex ? 'noindex,nofollow' : 'index,follow';
  const metas = `\n<meta name="description" content="${escHtml(description)}">\n<meta name="theme-color" content="${escHtml(accent)}">\n<meta name="robots" content="${robots}">\n<link rel="canonical" href="${escHtml(canonical)}">\n<meta property="og:type" content="profile">\n<meta property="og:title" content="${escHtml(title)}">\n<meta property="og:description" content="${escHtml(description)}">\n<meta property="og:url" content="${escHtml(canonical)}">\n<meta property="og:image" content="${escHtml(image)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${escHtml(title)}">\n<meta name="twitter:description" content="${escHtml(description)}">\n<meta name="twitter:image" content="${escHtml(image)}">\n`;
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escHtml(title)}</title>`).replace('</head>', metas + '</head>');
  return html;
}
app.get('/api/profile/:name', async (req, res) => {
  const user = req.params.name === '__home__' ? findByName(HOME_USER) : findByName(req.params.name);
  if (!user) return res.status(404).json({ error: 'Profil nicht gefunden' });
  if (isBanned(user)) return res.status(403).json({ error: 'Profil gesperrt', banned: true });
  if (user.privacy?.visibility === 'disabled' && String(req.session?.uid || '') !== String(user.id)) return res.status(404).json({ error: 'Profil nicht verfügbar' });
  const beforeBooster = !!user.discord?.booster;
  const beforeBoostChecked = Number(user.discord?.boosterCheckedAt || 0);
  await syncUserBoostState(user, false);
  let shouldSave = beforeBooster !== !!user.discord?.booster || beforeBoostChecked !== Number(user.discord?.boosterCheckedAt || 0);
  if (shouldCountView(req, user)) {
    user.views = (user.views || 0) + 1;
    recordProfileView(user, req);
    shouldSave = true;
  }
  if (shouldSave) await saveUser(user);
  res.json(publicView(user));
});

// --- Seiten ---
const page = f => (req, res) => res.sendFile(path.join(__dirname, 'public', f));
app.get('/banned', (req,res)=>res.status(403).sendFile(path.join(__dirname,'public','banned.html')));
app.get('/', (req, res) => {
  const home = HOME_USER && findByName(HOME_USER);
  if (!home) return page('landing.html')(req, res);
  if (home.privacy?.visibility === 'disabled' && String(req.session?.uid || '') !== String(home.id)) return page('landing.html')(req, res);
  return res.status(200).type('html').send(profilePageHtml(home));
});
app.get('/u/:name', (req, res) => res.redirect(301, '/' + encodeURIComponent(req.params.name)));
app.get('/dashboard', siteUnlocked, (req, res) => {
  const user=req.session.uid&&db[req.session.uid]?db[req.session.uid]:null;
  if(user&&isBanned(user))return res.redirect('/banned');
  return user?page('dashboard.html')(req,res):res.redirect('/auth/discord');
});
// Profil unter /name – muss ganz am Ende stehen, damit alle anderen Routen Vorrang haben
app.get('/:name', (req, res, next) => {
  const n = req.params.name.toLowerCase();
  if (!/^[a-z0-9_.-]{2,24}$/.test(n) || RESERVED.includes(n)) return next();
  const user=findByName(n);
  if(user&&isBanned(user))return res.status(403).sendFile(path.join(__dirname,'public','banned.html'));
  if(!user)return res.status(404).sendFile(path.join(__dirname,'public','404.html'));
  if(user.privacy?.visibility==='disabled'&&String(req.session?.uid||'')!==String(user.id))return res.status(404).sendFile(path.join(__dirname,'public','404.html'));
  return res.status(200).type('html').send(profilePageHtml(user));
});
app.use((req,res)=>res.status(404).sendFile(path.join(__dirname,'public','404.html')));

hydrateFromSupabase().finally(() => { startDiscordGateway(); app.listen(PORT, '0.0.0.0', () => console.log(`Läuft auf ${BASE_URL} (Port ${PORT})`)); });
