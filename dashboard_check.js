


const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let me=null,dirty=false,current='profil',canAdmin=false,canModerator=false,isPremium=false,marketScope='public',marketQuery='';
const get=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);
const set=(o,p,v)=>{const ks=p.split('.'),last=ks.pop();ks.reduce((a,k)=>(a[k]??={}),o)[last]=v};
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)};
const api=async(u,opt)=>{const r=await fetch(u,opt);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Fehler');return j};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SOCIAL_CATALOG=[
  ['discord','Discord','immer sichtbar'],['twitch','Twitch','Social'],['tiktok','TikTok','Social'],['x','X / Twitter','Social'],['instagram','Instagram','Social'],['youtube','YouTube','Social'],['spotifyProfile','Spotify','Social'],['github','GitHub','Social'],['bluesky','Bluesky','Social'],['epic','Epic Games','Account'],['valorant','Valorant','Account'],['discordServer','Discord Server','Invite'],['steam','Steam','Liste'],['custom','Custom Links','Liste']
];
const SOCIAL_ICON_ASSETS={discord:'/social-icons/discord.gif',discordServer:'/social-icons/discord.gif',twitch:'/social-icons/twitch.png',tiktok:'/social-icons/tiktok.png',x:'/social-icons/x.png',instagram:'/social-icons/instagram.gif',youtube:'/social-icons/youtube.png',spotifyProfile:'/social-icons/spotify.png',github:'/social-icons/github.png',bluesky:'/social-icons/bluesky.png',epic:'/social-icons/epicgames.png',valorant:'/social-icons/valorant.png'};
const PROFILE_MODULES=[['reactions','Reactions','smile-plus','Emoji Reactions'],['music-player','Music Player','list-music','Premium Playlist Player'],['status-card','Status Card','badge-info','Premium Status'],['activity','Discord Activity','gamepad-2','Status & aktuelle Aktivität'],['spotify-now','Spotify Now','radio-tower','Aktuell gehörter Song'],['spotify','Spotify Embed','audio-lines','Track, Album oder Playlist'],['highlights','Highlights','sparkles','Deine Highlight Cards'],['socials','Socials','share-2','Links & Accounts'],['premium','Premium Sections','gem','Text & Gallery Sections'],['about','About','user-round','Über mich Text']];
const PROFILE_MODULE_IDS=PROFILE_MODULES.map(x=>x[0]);
let profileModuleActiveSignature='';
function hasRenderablePremiumSections(){
  if(!isPremium||!Array.isArray(me?.premiumSections))return false;
  return me.premiumSections.some(sec=>{
    if(sec?.type==='gallery')return Array.isArray(sec.images)&&sec.images.some(Boolean);
    const tabs=Array.isArray(sec?.tabs)&&sec.tabs.length?sec.tabs:[{text:sec?.text||'',fields:[]}];
    return tabs.some(tab=>String(tab?.text||'').trim()||(Array.isArray(tab?.fields)&&tab.fields.some(f=>String(f?.label||'').trim()||String(f?.value||'').trim())));
  });
}
function isPreviewModuleActive(id){
  if(!me)return false;
  if(id==='reactions')return me.reactions?.enabled===true&&Array.isArray(me.reactions?.items)&&me.reactions.items.length>0;
  if(id==='music-player')return !!isPremium&&me.musicPlayer?.enabled!==false&&Array.isArray(me.musicPlayer?.sources)&&me.musicPlayer.sources.length>0;
  if(id==='status-card'){const sc=me.premiumStatusCard||{},end=sc.expiresAt?new Date(sc.expiresAt).getTime():0;return !!isPremium&&sc.enabled===true&&(!end||end>Date.now())&&!!(String(sc.title||'').trim()||String(sc.text||'').trim());}
  if(id==='activity')return me.settings?.showActivity===true;
  if(id==='spotify-now')return me.settings?.showSpotifyNowPlaying!==false;
  if(id==='spotify')return /open\.spotify\.com\/(?:intl-[a-z]+\/)?(?:playlist|album|track)\/[A-Za-z0-9]+/i.test(String(me.spotify||''));
  if(id==='highlights')return Array.isArray(me.highlights)&&me.highlights.some(x=>x&&(String(x.label||'').trim()||String(x.value||'').trim()));
  if(id==='socials')return ensureSocialOrder().some(socialEnabled);
  if(id==='premium')return hasRenderablePremiumSections();
  if(id==='about')return !!String(me.about||'').trim();
  return false;
}
function activePreviewModuleIds(){
  const order=me?.profileLayout?.order||PROFILE_MODULE_IDS;
  return order.filter(id=>PROFILE_MODULE_IDS.includes(id)&&isPreviewModuleActive(id));
}
function markDirty(v=true){dirty=v;document.body.classList.toggle('is-dirty',v)}
function rgb(hex){const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||'');return m?`${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}`:'139,92,246'}
function ensure(o,k,v){if(o[k]==null)o[k]=v}
function socialEnabled(key){
  if(key==='discord')return true;
  if(key==='steam')return Array.isArray(me.links?.steam)&&me.links.steam.some(x=>x?.url);
  if(key==='custom')return Array.isArray(me.links?.custom)&&me.links.custom.some(x=>x?.url);
  if(key==='discordServer')return !!me.links?.discordServer;
  if(key==='spotifyProfile')return !!me.links?.spotifyProfile;
  return !!me.links?.[key];
}
function ensureSocialOrder(){
  me.links??={};
  const current=Array.isArray(me.links.order)?me.links.order.filter(Boolean):[];
  const merged=[...current,...SOCIAL_CATALOG.map(x=>x[0])].filter((x,i,a)=>a.indexOf(x)===i);
  me.links.order=merged;
  return merged;
}
function extractYouTubeId(raw){
  const v=String(raw||'').trim(); if(!v) return '';
  try{
    const u=new URL(v);
    if(/youtu\.be$/i.test(u.hostname))return u.pathname.replace(/^\//,'').split('/')[0]||'';
    if(/youtube\.com$/i.test(u.hostname)||/youtube-nocookie\.com$/i.test(u.hostname)){
      if(u.searchParams.get('v'))return u.searchParams.get('v');
      const m=u.pathname.match(/\/(embed|shorts|live)\/([^/?#]+)/i); if(m) return m[2];
    }
  }catch{}
  return '';
}
function defaults(){
  me.settings??={};
  ['showBanner','showDecoration','showBadges','showTag','showStatus','showProfileBrand','showPremiumBadge','showAdminBadge','showModeratorBadge','showBoostBadge'].forEach(k=>ensure(me.settings,k,true));ensure(me.settings,'showActivity',false);
  ensure(me.settings,'manualNitro',false);ensure(me.settings,'nitroTier','');

  me.design??={};
  const dd={nameEffect:'standard',nameColor:'#f6eff2',accentColor:'#8b5cf6',avatarFrameEffect:'glow',avatarFrameColor:'#8b5cf6',avatarFrameWidth:2,avatarShape:'circle',cardStyle:'glass',cardOpacity:72,cardBlur:22,cardRadius:26,borderOpacity:12,cardGlow:18,glassSaturation:120,avatarSize:132,socialRadius:18,profileWidth:1000,contentAlign:'left',socialLayout:'grid',socialEffect:'lift',badgeStyle:'icon',profileHover:'tilt',hoverIntensity:55,hoverGlow:35};
  Object.entries(dd).forEach(([k,v])=>ensure(me.design,k,v));

  me.viewsStyle??={visible:true,placement:'profile',corner:'top-right',effect:'glow',backgroundOpacity:22,borderOpacity:14,eyeOpacity:92,countOpacity:88};ensure(me.viewsStyle,'placement','profile');
  me.pageFx??={type:'grid',color:'#8b5cf6',secondary:'#ff2e93',opacity:18,density:44,speed:9};
  me.browser??={effect:'rotate',speed:1500,messages:[]};
  me.cursor??={effect:'none',image:'system',svg:''};
  me.music??={url:'',title:'',volume:30,globalMute:false};ensure(me.music,'volume',30);ensure(me.music,'globalMute',false);
  me.profileLayout??={order:[...PROFILE_MODULE_IDS],hidden:[]};me.profileLayout.order=[...(Array.isArray(me.profileLayout.order)?me.profileLayout.order:[]).filter((x,i,a)=>PROFILE_MODULE_IDS.includes(x)&&a.indexOf(x)===i),...PROFILE_MODULE_IDS.filter(x=>!(me.profileLayout.order||[]).includes(x))];me.profileLayout.hidden=(Array.isArray(me.profileLayout.hidden)?me.profileLayout.hidden:[]).filter((x,i,a)=>PROFILE_MODULE_IDS.includes(x)&&a.indexOf(x)===i);
  me.musicPlayer??={enabled:false,title:'My Playlist',style:'glass-wave',position:'below-profile',accent:'#8b5cf6',secondary:'#22d3ee',volume:65,showCover:true,sources:[]};ensure(me.musicPlayer,'enabled',false);ensure(me.musicPlayer,'title','My Playlist');ensure(me.musicPlayer,'style','glass-wave');ensure(me.musicPlayer,'position','below-profile');ensure(me.musicPlayer,'accent','#8b5cf6');ensure(me.musicPlayer,'secondary','#22d3ee');ensure(me.musicPlayer,'volume',65);ensure(me.musicPlayer,'showCover',true);me.musicPlayer.sources??=[];
  me.premiumStatusCard??={enabled:false,icon:'✨',iconUrl:'',eyebrow:'STATUS',title:'Open for collabs',text:'Available for projects, gaming and creative work.',accent:'#8b5cf6',style:'glass',expiresAt:'',showCountdown:false};ensure(me.premiumStatusCard,'enabled',false);ensure(me.premiumStatusCard,'icon','✨');ensure(me.premiumStatusCard,'iconUrl','');ensure(me.premiumStatusCard,'eyebrow','STATUS');ensure(me.premiumStatusCard,'title','Open for collabs');ensure(me.premiumStatusCard,'text','');ensure(me.premiumStatusCard,'accent','#8b5cf6');ensure(me.premiumStatusCard,'style','glass');ensure(me.premiumStatusCard,'expiresAt','');ensure(me.premiumStatusCard,'showCountdown',false);
  me.background??={type:'image',url:'',blur:6,dim:55,effect:'none',videoSound:true,videoVolume:30,videoStart:0};ensure(me.background,'videoVolume',30);ensure(me.background,'videoStart',0);
  me.spotifyStyle??={blur:26,glow:24,layout:'compact'};ensure(me.spotifyStyle,'blur',26);ensure(me.spotifyStyle,'glow',24);ensure(me.spotifyStyle,'layout','compact');
  me.pcSpecs??={mainboard:'',cpu:'',gpu:'',ram:''};ensure(me.pcSpecs,'mainboard','');ensure(me.pcSpecs,'cpu','');ensure(me.pcSpecs,'gpu','');ensure(me.pcSpecs,'ram','');
  me.settings??={};ensure(me.settings,'showSpotifyNowPlaying',true);ensure(me.settings,'bannerHeight',120);
  me.links??={};me.links.steam??=[];me.links.custom??=[];ensure(me.links,'epic','');ensure(me.links,'valorant','');ensure(me.links,'discordServerName','');ensure(me.links,'discordServer','');ensure(me.links,'spotifyProfile','');ensureSocialOrder();
  me.highlights??=[];
  me.privacy??={visibility:'public',noIndex:false};ensure(me.privacy,'visibility','public');ensure(me.privacy,'noIndex',false);
  me.share??={title:'',description:'',imageMode:'avatar',image:''};ensure(me.share,'title','');ensure(me.share,'description','');ensure(me.share,'imageMode','avatar');ensure(me.share,'image','');
  me.reactions??={enabled:true,title:'React',position:'profile-bottom',animation:'pop',showCounts:true,items:[{id:'fire',emoji:'🔥',label:'Fire'},{id:'heart',emoji:'❤️',label:'Love'},{id:'music',emoji:'🎧',label:'Music'},{id:'game',emoji:'🎮',label:'Gaming'}]};ensure(me.reactions,'enabled',true);ensure(me.reactions,'title','React');ensure(me.reactions,'position','profile-bottom');ensure(me.reactions,'animation','pop');ensure(me.reactions,'showCounts',true);me.reactions.items??=[];
  me.floating??=[];me.tags??={};me.premiumSections??=[];
}
function openTab(name){
  if(name==='admin'&&!canAdmin&&!canModerator)name='profil';
  if(name==='pcbeta'&&!canAdmin)name='profil';
  if(!$(`[data-panel="${name}"]`))name='profil';current=name;
  document.body.classList.toggle('admin-mode',name==='admin');
  $$('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==name);
  $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  const groups={profil:'profile',views:'profile',badges:'profile',labels:'profile',browser:'profile',entrance:'profile',highlights:'profile',privacy:'profile',reactions:'profile',presence:'profile',media:'spotify',musik:'spotify',socials:'socials',premium:'profile',appearance:'style',presets:'style',marketplace:'style',statistics:'public',background:'style',placement:'style',effects:'style',discord:'content',pcbeta:'style',admin:'admin'};
  history.replaceState(null,'','#'+name);
  if(name==='admin'){loadAdminOverview();loadAdminKeys();loadAdminUsers();loadAdminFaq();if(canAdmin)loadAdminChangelog();selectAdminTab('overview');window.scrollTo({top:0,behavior:'smooth'})}
  else {if(name==='marketplace')loadMarketplace();if(name==='reactions')loadReactionStats();if(name==='statistics'){applyStatisticsAccess();if(isPremium)loadStatistics()}window.scrollTo({top:Math.max(0,$('.editorHead').offsetTop-10),behavior:'smooth'});}
}
$$('[data-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));

const accountToggle=$('#accountToggle'),accountMenu=$('#accountMenu');
if(accountToggle&&accountMenu){
  const closeAccount=()=>{accountMenu.classList.remove('open');accountToggle.setAttribute('aria-expanded','false')};
  accountToggle.onclick=e=>{e.stopPropagation();const open=!accountMenu.classList.contains('open');accountMenu.classList.toggle('open',open);accountToggle.setAttribute('aria-expanded',String(open))};
  accountMenu.onclick=e=>e.stopPropagation();
  const accountAdmin=$('#accountAdmin');if(accountAdmin)accountAdmin.onclick=e=>{e.preventDefault();closeAccount();openTab('admin')};
  document.addEventListener('click',closeAccount);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAccount()});
}

function formatOut(path,v){
  if(/Opacity|volume|dim|cardGlow|glassSaturation|spotifyStyle\.glow|hoverIntensity|hoverGlow/i.test(path))return `${v}%`;
  if(/Blur|Radius|Width|Height|avatarSize|socialRadius|profileWidth|spotifyStyle\.blur/i.test(path))return `${v}px`;
  return v;
}
function updateOutputs(){
  $$('[data-out]').forEach(o=>{const v=get(me,o.dataset.out);o.textContent=formatOut(o.dataset.out,v)});
  $$('[data-swatch]').forEach(sw=>sw.style.setProperty('--sw',get(me,sw.dataset.swatch)||'#fff'));
  $$('[data-segment]').forEach(box=>{const v=get(me,box.dataset.segment);box.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(b.dataset.value)===String(v)))});
}

const NITRO_TIERS=[
  ['beginner','Beginner','', '/nitro/nitro-beginner.png'],
  ['bronze','Bronze','1 Monat','/nitro/nitro-bronze.png'],
  ['silver','Silber','3 Monate','/nitro/nitro-silver.png'],
  ['gold','Gold','6 Monate','/nitro/nitro-gold.png'],
  ['platinum','Platin','1 Jahr','/nitro/nitro-platinum.png'],
  ['diamond','Diamant','2 Jahre','/nitro/nitro-diamond.png'],
  ['emerald','Smaragd','3 Jahre','/nitro/nitro-emerald.png'],
  ['ruby','Rubin','5 Jahre','/nitro/nitro-ruby.png'],
  ['opal','Opal','6+ Jahre','/nitro/nitro-opal.png']
];
function nitroTierMeta(){return NITRO_TIERS.find(x=>x[0]===me.settings.nitroTier)}
function badgeSrc(x){return x?.asset||(x?.icon?`https://cdn.discordapp.com/badge-icons/${x.icon}.png`:'')}
function displayBadges(){
  const raw=Array.isArray(me.discord?.badges)?me.discord.badges:[];
  const base=raw.filter(x=>x.key!=='nitro'&&(x.key!=='server_booster'||me.settings.showBoostBadge!==false));
  const oldNitro=raw.find(x=>x.key==='nitro');
  const on=!!me.settings.manualNitro||!!me.discord?.nitroVerified;
  if(!on)return base;
  const tier=nitroTierMeta();
  const nitro=tier?{key:'nitro',name:`Discord Nitro · ${tier[1]}${tier[2]?' · '+tier[2]:''}`,asset:tier[3],emoji:'💎'}:(oldNitro||{key:'nitro',name:'Discord Nitro',icon:'2ba85e8026a8614b640c2837bcdfe21b',emoji:'💎'});
  return [nitro,...base];
}
function renderNitroGrid(){
  const box=$('#nitroGrid');if(!box)return;box.replaceChildren();
  NITRO_TIERS.forEach(([key,name,age,asset])=>{
    const b=document.createElement('button');b.type='button';b.className='nitroOption'+(me.settings.nitroTier===key?' on':'');
    const img=new Image();img.src=asset;img.alt='';
    const label=document.createElement('b');label.textContent=name;
    const sub=document.createElement('small');sub.textContent=age||'Start';
    b.append(img,label,sub);
    b.onclick=()=>{
      me.settings.nitroTier=key;me.settings.manualNitro=true;
      const toggle=$('[data-p="settings.manualNitro"]');if(toggle)toggle.checked=true;
      markDirty();renderNitroGrid();renderBadges();renderPreview();
    };
    box.append(b);
  });
}
function renderBadges(){
  const box=$('#badgeList');box.replaceChildren();
  const arr=displayBadges();
  if(!arr.length&&!isPremium&&!canAdmin&&!canModerator){box.textContent='Keine öffentlichen Badges erkannt.';return}
  arr.forEach(x=>{
    const c=document.createElement('span');c.className='badgeChip';
    const src=badgeSrc(x);
    if(src){const i=new Image();i.src=src;i.alt='';i.onerror=()=>i.replaceWith(document.createTextNode(x.emoji||'◆'));c.append(i)}else c.append(document.createTextNode(x.emoji||'◆'));
    c.append(document.createTextNode(x.name||'Badge'));box.append(c);
  });
  if(isPremium){const c=document.createElement('span');c.className='badgeChip';c.textContent='✦ Caruzo Premium';box.append(c)}
  if(canAdmin){const c=document.createElement('span');c.className='badgeChip';c.textContent='◆ Caruzo Admin';box.append(c)}
  if(canModerator){const c=document.createElement('span');c.className='badgeChip';c.textContent='◇ Caruzo Moderator';box.append(c)}
}

const HIGHLIGHT_TEMPLATES={
  game:{icon:'🎮',label:'Game',value:'Mein Lieblingsspiel'},project:{icon:'◇',label:'Projekt',value:'Mein aktuelles Projekt'},music:{icon:'♫',label:'Musik',value:'Was ich gerade höre'},status:{icon:'●',label:'Status',value:'Aktuell aktiv'},website:{icon:'↗',label:'Website',value:'Meine Website'},fact:{icon:'✦',label:'Fact',value:'Etwas über mich'}
};
function addHighlight(template='fact'){
  me.highlights??=[];if(me.highlights.length>=6)return toast('Maximal 6 Highlights');
  const t=HIGHLIGHT_TEMPLATES[template]||HIGHLIGHT_TEMPLATES.fact;
  me.highlights.push({id:(crypto?.randomUUID?.()||('highlight-'+Date.now())),icon:t.icon,label:t.label,value:t.value,url:''});
  markDirty();renderHighlightsEditor();renderPreview();
}
function renderHighlightsEditor(){
  const box=$('#highlightEditor'),count=$('#highlightCount');if(!box||!me)return;me.highlights??=[];box.replaceChildren();if(count)count.textContent=`${me.highlights.length} / 6`;
  if(!me.highlights.length){const empty=document.createElement('div');empty.className='highlightEmpty';empty.innerHTML='<b style="display:block;color:#a6a7af;margin-bottom:4px">Noch keine Highlights</b><span>Wähle oben eine Vorlage oder füge ein eigenes Highlight hinzu.</span>';box.append(empty);return}
  let dragging=-1;
  me.highlights.forEach((item,i)=>{
    const row=document.createElement('div');row.className='highlightItem';row.draggable=true;
    const drag=document.createElement('span');drag.className='highlightDrag';drag.textContent='↕';drag.title='Ziehen zum Sortieren';
    const icon=document.createElement('input');icon.className='highlightEmoji';icon.type='text';icon.maxLength=8;icon.value=item.icon||'✦';icon.title='Emoji / Symbol';icon.oninput=()=>{item.icon=icon.value;markDirty();renderPreview()};
    const label=document.createElement('input');label.type='text';label.maxLength=28;label.placeholder='Label';label.value=item.label||'';label.oninput=()=>{item.label=label.value;markDirty();renderPreview()};
    const value=document.createElement('input');value.type='text';value.maxLength=80;value.placeholder='Wert / Text';value.value=item.value||'';value.oninput=()=>{item.value=value.value;markDirty();renderPreview()};
    const link=document.createElement('input');link.type='url';link.placeholder='Optionaler Link';link.value=item.url||'';link.oninput=()=>{item.url=link.value;markDirty()};
    const del=document.createElement('button');del.type='button';del.className='remove';del.textContent='×';del.title='Highlight entfernen';del.onclick=()=>{me.highlights.splice(i,1);markDirty();renderHighlightsEditor();renderPreview()};
    row.addEventListener('dragstart',()=>{dragging=i;row.classList.add('dragging')});row.addEventListener('dragend',()=>{dragging=-1;row.classList.remove('dragging')});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();if(dragging<0||dragging===i)return;const moved=me.highlights.splice(dragging,1)[0];me.highlights.splice(i,0,moved);markDirty();renderHighlightsEditor();renderPreview()});
    row.append(drag,icon,label,value,link,del);box.append(row);
  });
}
function updatePrivacyStatus(){
  const box=$('#privacyStatus'),link=$('#privacyLink');if(!box||!me)return;
  const v=me.privacy?.visibility||'public';box.classList.toggle('warn',v==='unlisted');box.classList.toggle('off',v==='disabled');
  const data=v==='public'?['Öffentlich','Dein Profil ist normal erreichbar und kann geteilt werden.','globe-2']:v==='unlisted'?['Ungelisted','Dein Profil funktioniert über den direkten Link, soll aber nicht gelistet werden.','link-2']:['Deaktiviert','Besucher erhalten eine 404-Seite. Du selbst kannst dein Profil weiterhin prüfen.','eye-off'];
  box.innerHTML=`<span class="privacyStatusIcon"><i data-lucide="${data[2]}"></i></span><div><b>${data[0]}</b><small>${data[1]}</small></div>`;
  if(link)link.innerHTML=`<i data-lucide="link-2" style="width:15px"></i><span>Direktlink: <b>${escapeHtml(location.origin+'/'+encodeURIComponent(me.username))}</b></span>`;
  window.lucide?.createIcons?.();
}
function sharePreviewImage(){
  const mode=me.share?.imageMode||'avatar';
  if(mode==='custom'&&me.share?.image)return me.share.image;
  if(mode==='background'&&me.background?.url){
    const y=extractYouTubeId(me.background.url);if(y)return `https://i.ytimg.com/vi/${y}/maxresdefault.jpg`;
    if(me.background.type==='image')return me.background.url;
  }
  return me.discord?.avatar||'';
}
function renderSharePreview(){
  const media=$('#sharePreviewMedia');if(!media||!me)return;
  const img=sharePreviewImage();media.style.backgroundImage=img?`linear-gradient(to bottom,transparent 45%,rgba(7,7,10,.88)),url("${String(img).replace(/"/g,'')}")`:'radial-gradient(circle at 30% 20%,rgba(var(--accent-rgb),.28),transparent 36%),linear-gradient(145deg,#111118,#08080c)';
  $('#sharePreviewTitle').textContent=me.share?.title||`${me.displayName||me.username} · Caruzo`;
  $('#sharePreviewDescription').textContent=me.share?.description||me.tagline||`Profil von ${me.displayName||me.username} auf Caruzo.`;
  $('#sharePreviewUrl').textContent=location.origin+'/'+(me.username||'username');
}
$('#addHighlight').onclick=()=>addHighlight('fact');
$$('[data-highlight-template]').forEach(b=>b.onclick=()=>addHighlight(b.dataset.highlightTemplate));
if($('#copyShareLink'))$('#copyShareLink').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/'+encodeURIComponent(me.username));toast('Profil-Link kopiert')}catch{toast('Link konnte nicht kopiert werden')}};


const MUSIC_PLAYER_STYLES=[
 ['glass-wave','Glass Wave','Glas + weiche Gradient-Wave'],['vinyl','Vinyl Deck','Rundes Artwork im Vinyl-Look'],['neon-deck','Neon Deck','Kräftiger Glow mit dunklem Deck'],['compact-bar','Compact Bar','Flacher Player für wenig Platz'],['minimal','Minimal','Sehr clean und reduziert'],['cover-flow','Cover Flow','Artwork steht stärker im Fokus']
];
function parseDashboardSpotifySource(raw){const m=String(raw||'').match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)/i);return m?{kind:m[1].toLowerCase(),id:m[2]}:null}
function parseDashboardYouTubePlaylist(raw){try{const u=new URL(String(raw||''));const host=u.hostname.toLowerCase().replace(/^www\./,'');const list=(u.searchParams.get('list')||'').trim();if(!list)return '';if(host==='youtube.com'||host.endsWith('.youtube.com')||host==='youtu.be')return list.replace(/[^A-Za-z0-9_-]/g,'');}catch{}return ''}
function musicProvider(url){if(parseDashboardSpotifySource(url))return 'spotify';if(parseDashboardYouTubePlaylist(url))return 'youtube';const v=String(url||'').toLowerCase();if(v.includes('youtu.be')||v.includes('youtube.com'))return 'youtube-invalid';return 'audio'}
function musicProviderMeta(url){const p=musicProvider(url);return p==='spotify'?{key:p,name:'Spotify',asset:'/social-icons/spotify.png'}:p==='youtube'?{key:p,name:'YouTube Playlist',asset:'/social-icons/youtube.png'}:p==='youtube-invalid'?{key:'youtube',name:'YouTube Playlist',asset:'/social-icons/youtube.png'}:{key:'audio',name:'Audio',asset:''}}
function genericMusicSourceTitle(v){return /^(?:spotify(?: track \/ playlist)?|youtube(?: track \/ playlist)?|track|playlist|nothing playing yet|audio)$/i.test(String(v||'').trim())}
const dashboardMusicMetaCache=new Map(),dashboardMusicMetaPending=new Set();
async function fetchMusicSourceMeta(url){const key=String(url||'').trim();if(!key)return null;if(dashboardMusicMetaCache.has(key))return dashboardMusicMetaCache.get(key);try{const r=await api('/api/media-meta?url='+encodeURIComponent(key));dashboardMusicMetaCache.set(key,r);return r}catch{return null}}
async function hydrateMusicSource(x,{force=false}={}){
  if(!x?.url||musicProvider(x.url)==='audio'||dashboardMusicMetaPending.has(x.url))return;
  if(!force&&!genericMusicSourceTitle(x.title)&&x.artist&&x.cover)return;
  dashboardMusicMetaPending.add(x.url);
  const meta=await fetchMusicSourceMeta(x.url);dashboardMusicMetaPending.delete(x.url);if(!meta)return;
  let changed=false;
  if((!x.title||genericMusicSourceTitle(x.title))&&meta.title){x.title=meta.title;changed=true}
  if(!x.artist&&meta.author){x.artist=meta.author;changed=true}
  if(!x.cover&&meta.thumbnail){x.cover=meta.thumbnail;changed=true}
  if(changed){markDirty();renderMusicSourceList();renderMusicPlayerPreview()}
}
function renderMusicStyleGrid(){const box=$('#musicStyleGrid');if(!box||!me)return;box.replaceChildren();MUSIC_PLAYER_STYLES.forEach(([id,name,sub])=>{const b=document.createElement('button');b.type='button';b.className='musicStyleCard'+(me.musicPlayer?.style===id?' on':'');b.dataset.style=id;b.innerHTML=`<div class="musicStyleMock"><span class="cover"></span><span class="lines"><i></i><i></i></span><span class="controls"><i></i><i></i><i></i></span></div><b>${escapeHtml(name)}</b><small>${escapeHtml(sub)}</small>`;b.onclick=()=>{if(!isPremium)return toast('Premium erforderlich');me.musicPlayer.style=id;markDirty();renderMusicStyleGrid();renderMusicPlayerPreview()};box.append(b)});}
function addMusicSource(){
  if(!isPremium)return toast('Premium erforderlich');const input=$('#musicSourceUrl'),v=input?.value.trim();if(!v)return toast('Spotify-Link oder YouTube-Playlist eingeben');if(!/^https?:\/\//i.test(v))return toast('Bitte einen gültigen Link eingeben');
  const sp=parseDashboardSpotifySource(v), ytPlaylist=parseDashboardYouTubePlaylist(v);
  if(!sp && !ytPlaylist){
    if(/youtu(?:\.be|be\.com)|youtube\.com/i.test(v)) return toast('Bitte hier nur YouTube-Playlisten mit ?list=... verwenden');
    return toast('Nur Spotify-Links oder YouTube-Playlisten werden unterstützt');
  }
  me.musicPlayer.sources??=[];if(me.musicPlayer.sources.length>=12)return toast('Maximal 12 Playlist-Einträge');const id=crypto?.randomUUID?.()||('music-'+Date.now());const x={id,url:v,title:'',artist:'',cover:''};me.musicPlayer.sources.push(x);me.musicPlayer.enabled=true;const enabled=$('[data-p="musicPlayer.enabled"]');if(enabled)enabled.checked=true;input.value='';markDirty();renderMusicSourceList();renderMusicPlayerPreview();hydrateMusicSource(x,{force:true});
}
function renderMusicSourceList(){
  const box=$('#musicSourceList'),count=$('#musicSourceCount');if(!box||!me)return;me.musicPlayer.sources??=[];if(count)count.textContent=`${me.musicPlayer.sources.length} / 12`;box.replaceChildren();
  if(!me.musicPlayer.sources.length){const e=document.createElement('div');e.className='adminEmpty';e.textContent='Noch keine Playlist-Inhalte. Füge einen Spotify-Link oder eine YouTube-Playlist hinzu.';box.append(e);return}
  let dragging=-1;me.musicPlayer.sources.forEach((x,i)=>{
    const row=document.createElement('div');row.className='musicSourceItem';row.draggable=true;const drag=document.createElement('span');drag.className='musicSourceDrag';drag.textContent='↕';
    const pm=musicProviderMeta(x.url),provider=document.createElement('span');provider.className='musicProvider '+pm.key;provider.title=pm.name;if(pm.asset){const img=document.createElement('img');img.src=pm.asset;img.alt='';provider.append(img)}else provider.textContent='♫';
    const fields=document.createElement('div');fields.className='musicSourceFields';const title=document.createElement('input');title.value=x.title||'';title.placeholder=`${pm.name} Titel wird automatisch erkannt`;title.oninput=()=>{x.title=title.value;markDirty();renderMusicPlayerPreview()};const artist=document.createElement('input');artist.value=x.artist||'';artist.placeholder='Artist / Kanal wird automatisch erkannt';artist.oninput=()=>{x.artist=artist.value;markDirty();renderMusicPlayerPreview()};const cover=document.createElement('input');cover.value=x.cover||'';cover.placeholder='Cover wird automatisch erkannt · optional überschreiben';cover.className='wide';cover.oninput=()=>{x.cover=cover.value;markDirty();renderMusicPlayerPreview()};fields.append(title,artist,cover);
    const del=document.createElement('button');del.type='button';del.className='musicSourceRemove';del.textContent='×';del.onclick=()=>{me.musicPlayer.sources.splice(i,1);markDirty();renderMusicSourceList();renderMusicPlayerPreview()};row.addEventListener('dragstart',()=>{dragging=i;row.classList.add('dragging')});row.addEventListener('dragend',()=>{dragging=-1;row.classList.remove('dragging')});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();if(dragging<0||dragging===i)return;const moved=me.musicPlayer.sources.splice(dragging,1)[0];me.musicPlayer.sources.splice(i,0,moved);markDirty();renderMusicSourceList();renderMusicPlayerPreview()});row.append(drag,provider,fields,del);box.append(row);
    if((!x.title||genericMusicSourceTitle(x.title)||!x.cover)&&pm.key!=='audio')hydrateMusicSource(x);
  });
}
function previewCoverForSource(x){if(x?.cover)return x.cover;const id=extractYouTubeId(x?.url);if(id)return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;return musicProviderMeta(x?.url).asset||''}
function renderMusicPlayerPreview(){
  const host=$('#musicPlayerPreview');if(!host||!me)return;const mp=me.musicPlayer||{},src=mp.sources?.[0]||{},pm=musicProviderMeta(src.url);host.className='musicPlayerPreview mp-style-'+(mp.style||'glass-wave');host.dataset.provider=pm.key;host.style.setProperty('--mp-a',mp.accent||'#8b5cf6');host.style.setProperty('--mp-b',mp.secondary||'#22d3ee');const cover=previewCoverForSource(src),fallback=!src.cover&&!extractYouTubeId(src?.url)&&!!pm.asset;const title=src.title||pm.name+(pm.key==='audio'?'':' Playlist'),artist=src.artist||pm.name;
  host.innerHTML=`<div class="mpPreviewShell">${mp.showCover!==false?(cover?`<img class="mpPreviewCover${fallback?' providerFallback':''}" src="${escapeHtml(cover)}" alt="">`:`<div class="mpPreviewCover"></div>`):''}<div class="mpPreviewCopy"><small>${pm.asset?`<img src="${escapeHtml(pm.asset)}" alt="">`:''}${escapeHtml(pm.name)} · ${escapeHtml(mp.title||'MY PLAYLIST')}</small><b>${escapeHtml(title)}</b><span>${escapeHtml(artist)}</span><div class="mpPreviewProgress"><i></i></div></div><div class="mpPreviewControls"><button type="button">‹</button><button type="button" class="main">▶</button><button type="button">›</button></div></div>`;
}
if($('#addMusicSource'))$('#addMusicSource').onclick=addMusicSource;

let statisticsDays=30;
const STAT_NAMES={x:'X / Twitter',twitch:'Twitch',tiktok:'TikTok',instagram:'Instagram',youtube:'YouTube',spotify:'Spotify',github:'GitHub',bluesky:'Bluesky',steam:'Steam',custom:'Custom Link',discordServer:'Discord Server',discord:'Discord',epic:'Epic Games',valorant:'Valorant',Desktop:'Desktop',Mobile:'Mobile',Tablet:'Tablet',Direct:'Direct',Caruzo:'Caruzo'};
function statsRank(hostId,items,icon='↗'){const host=$(hostId);if(!host)return;host.replaceChildren();if(!items?.length){const e=document.createElement('div');e.className='adminEmpty';e.textContent='Noch keine Daten';host.append(e);return}const max=Math.max(1,...items.map(x=>Number(x.value||x.period||0)));items.forEach((x,i)=>{const val=Number(x.value??x.period??0),row=document.createElement('div');row.className='statsRankRow';const ic=document.createElement('span');ic.className='statsRankIcon';ic.textContent=x.emoji||icon;const cp=document.createElement('span');cp.className='statsRankCopy';const b=document.createElement('b');b.textContent=x.label||STAT_NAMES[x.key]||x.key||'Unknown';const sm=document.createElement('small');sm.textContent=`${Math.round(val/max*100)}% vom Top-Wert`;cp.append(b,sm);const n=document.createElement('span');n.className='statsRankValue';n.textContent=fmtNum(val);row.append(ic,cp,n);host.append(row)})}
function statsPath(values,w=760,h=250,pad=18,maxVal){const max=Math.max(1,maxVal!=null?Number(maxVal):Math.max(...values.map(v=>Number(v||0))));const pts=values.map((v,i)=>[pad+(i*(w-pad*2)/Math.max(1,values.length-1)),h-pad-(Number(v||0)/max)*(h-pad*2)]);return pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')}
function renderStatistics(data){if(!data)return;$('#statViews').textContent=fmtNum(data.totalViews);$('#statViewsMeta').textContent=`${fmtNum(data.viewsToday)} heute · ${fmtNum(data.viewsPeriod)} im Zeitraum`;$('#statReactions').textContent=fmtNum(data.totalReactions);$('#statReactionMeta').textContent=`${fmtNum(data.reactionsPeriod)} im Zeitraum`;$('#statSocial').textContent=fmtNum(data.totalSocial);$('#statSocialMeta').textContent=`${fmtNum(data.socialPeriod)} im Zeitraum`;$('#statEngagement').textContent=`${Number(data.engagementRate||0).toFixed(1)}%`;$('#statMusic').textContent=fmtNum(data.musicPlays);$('#statMusicMeta').textContent=`${fmtNum(data.musicPeriod)} im Zeitraum · ${fmtNum(data.musicSkips)} skips`;$('#statHighlights').textContent=fmtNum(data.totalHighlights);$('#statHighlightsMeta').textContent=`${fmtNum(data.highlightPeriod)} im Zeitraum`;$('#statsChartSub').textContent=`Views · Reactions · Clicks · ${data.days} Tage`;
 const days=data.daily||[],chart=$('#statsChart'),labels=$('#statsChartLabels');if(chart&&labels&&days.length){const views=days.map(x=>x.views||0),react=days.map(x=>x.reactions||0),clicks=days.map(x=>(x.social||0)+(x.highlights||0)),max=Math.max(1,...views,...react,...clicks),w=760,h=250;chart.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="lineViews" d="${statsPath(views,w,h,18,max)}"/><path class="lineReactions" d="${statsPath(react,w,h,18,max)}"/><path class="lineClicks" d="${statsPath(clicks,w,h,18,max)}"/></svg>`;labels.replaceChildren();const step=Math.max(1,Math.ceil(days.length/7));days.filter((_,i)=>i%step===0).slice(0,7).forEach(d=>{const e=document.createElement('span');e.textContent=new Date(d.date+'T00:00:00Z').toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'});labels.append(e)})}
 statsRank('#statsTopReactions',data.topReactions||[],'☺');statsRank('#statsTopSocials',data.topSocials||[],'↗');statsRank('#statsTopHighlights',data.topHighlights||[],'✦');statsRank('#statsReferrers',data.topReferrers||[],'⌁');statsRank('#statsDevices',data.devices||[],'▣');}
function applyStatisticsAccess(){const panel=$('[data-panel="statistics"]');if(!panel)return;panel.classList.toggle('premiumStatsLocked',!isPremium);const refresh=$('#statsRefresh');if(refresh)refresh.disabled=!isPremium;$$('[data-stat-days]').forEach(b=>b.disabled=!isPremium);window.lucide?.createIcons?.()}
async function loadStatistics(){if(!isPremium){applyStatisticsAccess();return}try{renderStatistics(await api('/api/statistics?days='+statisticsDays))}catch(e){toast(e.message)}}
$$('[data-stat-days]').forEach(b=>b.onclick=()=>{if(!isPremium)return;statisticsDays=Number(b.dataset.statDays||30);$$('[data-stat-days]').forEach(x=>x.classList.toggle('on',x===b));loadStatistics()});if($('#statsRefresh'))$('#statsRefresh').onclick=()=>{if(isPremium)loadStatistics()};

let reactionStatsDays=30;
function addReactionEmoji(emoji='✨'){
  me.reactions??={items:[]};me.reactions.items??=[];if(me.reactions.items.length>=8)return toast('Maximal 8 Reactions');
  const labels={'🔥':'Fire','❤️':'Love','😂':'Funny','🎧':'Music','🎮':'Gaming','⚡':'Energy','🖤':'Dark','✨':'Spark','👀':'Eyes','💀':'Dead','🫶':'Love it','😮':'Wow'};
  me.reactions.items.push({id:(crypto?.randomUUID?.()||('reaction-'+Date.now())),emoji,label:labels[emoji]||'Reaction'});markDirty();renderReactionsEditor();renderReactionMiniPreview();renderPreview();
}
function renderReactionsEditor(){
  const box=$('#reactionEditor'),count=$('#reactionCount');if(!box||!me)return;me.reactions??={items:[]};me.reactions.items??=[];box.replaceChildren();if(count)count.textContent=`${me.reactions.items.length} / 8`;
  if(!me.reactions.items.length){const e=document.createElement('div');e.className='highlightEmpty';e.innerHTML='<b style="display:block;color:#a6a7af;margin-bottom:4px">Noch keine Reactions</b><span>Klicke oben auf ein Emoji oder füge ein eigenes hinzu.</span>';box.append(e);return}
  let dragging=-1;
  me.reactions.items.forEach((item,i)=>{
    const row=document.createElement('div');row.className='reactionItem';row.draggable=true;
    const drag=document.createElement('span');drag.className='reactionDrag';drag.textContent='↕';drag.title='Ziehen zum Sortieren';
    const emoji=document.createElement('input');emoji.type='text';emoji.maxLength=16;emoji.className='reactionEmojiInput';emoji.value=item.emoji||'✨';emoji.title='Eigenes Emoji';emoji.oninput=()=>{item.emoji=emoji.value;markDirty();renderReactionMiniPreview();renderPreview()};
    const label=document.createElement('input');label.type='text';label.maxLength=24;label.placeholder='Bezeichnung, z. B. Fire';label.value=item.label||'';label.oninput=()=>{item.label=label.value;markDirty()};
    const del=document.createElement('button');del.type='button';del.className='remove';del.textContent='×';del.title='Reaction entfernen';del.onclick=()=>{me.reactions.items.splice(i,1);markDirty();renderReactionsEditor();renderReactionMiniPreview();renderPreview()};
    row.addEventListener('dragstart',()=>{dragging=i;row.classList.add('dragging')});row.addEventListener('dragend',()=>{dragging=-1;row.classList.remove('dragging')});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();if(dragging<0||dragging===i)return;const moved=me.reactions.items.splice(dragging,1)[0];me.reactions.items.splice(i,0,moved);markDirty();renderReactionsEditor();renderReactionMiniPreview();renderPreview()});
    row.append(drag,emoji,label,del);box.append(row);
  });
}
function renderReactionMiniPreview(){
  const box=$('#reactionPreviewButtons'),title=$('#reactionPreviewTitle');if(!box||!me)return;box.replaceChildren();if(title)title.textContent=(me.reactions?.title||'React').toUpperCase();
  (me.reactions?.items||[]).slice(0,8).forEach(x=>{const b=document.createElement('span');b.className='reactionMiniBtn';b.innerHTML=`<span>${escapeHtml(x.emoji||'✨')}</span>${me.reactions.showCounts!==false?`<em>${Number(x.count||0)}</em>`:''}`;box.append(b)});
}
function renderReactionAnalytics(data){
  if(!data)return;$('#reactionStatTotal').textContent=fmtNum(data.total||0);$('#reactionStatToday').textContent=fmtNum(data.today||0);$('#reactionStatPeriod').textContent=fmtNum(data.periodTotal||0);$('#reactionStatRate').textContent=`${Number(data.rate||0).toFixed(1)}%`;$('#reactionPeriodMeta').textContent=`letzte ${data.days} Tage`;$('#reactionChartSub').textContent=`Letzte ${data.days} Tage`;
  const days=data.daily||[],chart=$('#reactionChart'),labels=$('#reactionChartLabels');if(chart&&labels){const vals=days.map(x=>Number(x.value||0)),max=Math.max(1,...vals),w=700,h=210,pad=18;const pts=vals.map((v,i)=>{const x=pad+(i*(w-pad*2)/Math.max(1,vals.length-1)),y=h-pad-(v/max)*(h-pad*2);return[x,y]});const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');const area=path+` L ${pts.at(-1)?.[0]||pad} ${h-pad} L ${pts[0]?.[0]||pad} ${h-pad} Z`;chart.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="reactionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path class="chartArea" style="fill:url(#reactionArea)" d="${area}"/><path class="chartLine" d="${path}"/>${pts.map((p,i)=>`<circle class="chartDot" cx="${p[0]}" cy="${p[1]}" r="3"><title>${days[i]?.date||''}: ${vals[i]}</title></circle>`).join('')}</svg>`;labels.replaceChildren();const step=Math.max(1,Math.ceil(days.length/7));days.filter((_,i)=>i%step===0).slice(0,7).forEach(d=>{const e=document.createElement('span');const dt=new Date(d.date+'T00:00:00Z');e.textContent=dt.toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'});labels.append(e)})}
  const breakdown=$('#reactionBreakdown');if(breakdown){breakdown.replaceChildren();const arr=data.breakdown||[],max=Math.max(1,...arr.map(x=>Number(x.period||0)));arr.forEach(x=>{const row=document.createElement('div');row.className='reactionBreakRow';const em=document.createElement('span');em.className='reactionBreakEmoji';em.textContent=x.emoji||'✨';const mid=document.createElement('div');mid.className='reactionBreakText';const b=document.createElement('b');b.textContent=x.label||'Reaction';const sm=document.createElement('small');sm.textContent=`${Number(x.total||0).toLocaleString('de-CH')} insgesamt`;const tr=document.createElement('div');tr.className='reactionBreakTrack';const fill=document.createElement('i');fill.style.width=`${Math.max(3,(Number(x.period||0)/max)*100)}%`;tr.append(fill);mid.append(b,sm,tr);const val=document.createElement('span');val.className='reactionBreakValue';val.textContent=Number(x.period||0).toLocaleString('de-CH');row.append(em,mid,val);breakdown.append(row)});if(!arr.length){const e=document.createElement('div');e.className='adminEmpty';e.textContent='Noch keine Reactions vorhanden.';breakdown.append(e)}}
}
async function loadReactionStats(){try{const data=await api('/api/reactions/stats?days='+reactionStatsDays);renderReactionAnalytics(data)}catch(e){toast(e.message)}}
if($('#addReaction'))$('#addReaction').onclick=()=>addReactionEmoji('✨');
$$('[data-reaction-emoji]').forEach(b=>b.onclick=()=>addReactionEmoji(b.dataset.reactionEmoji));
$$('[data-reaction-days]').forEach(b=>b.onclick=()=>{reactionStatsDays=Number(b.dataset.reactionDays||30);$$('[data-reaction-days]').forEach(x=>x.classList.toggle('on',x===b));loadReactionStats()});
if($('#reactionRefresh'))$('#reactionRefresh').onclick=loadReactionStats;
function bind(){
  defaults();
  $$('[data-p]').forEach(e=>{
    const v=get(me,e.dataset.p);if(e.type==='checkbox')e.checked=!!v;else e.value=v??'';
    e.oninput=()=>{
      let val=e.type==='checkbox'?e.checked:(e.type==='range'||e.type==='number')?Number(e.value):e.value;
      set(me,e.dataset.p,val);markDirty();updateOutputs();renderPreview();
      if(e.dataset.p==='username')updateUrl();
      if(e.dataset.p==='background.url' && extractYouTubeId(val) && me.background.type!=='youtube'){me.background.type='youtube';const sel=$('[data-p="background.type"]');if(sel)sel.value='youtube'}
      if(e.dataset.p==='music.url' && musicProvider(val)==='youtube'){const current=String(val);fetchMusicSourceMeta(current).then(meta=>{if(!meta||String(me.music?.url||'')!==current)return;if(!me.music.title||genericMusicSourceTitle(me.music.title)){me.music.title=meta.title||'YouTube';const titleInput=$('[data-p="music.title"]');if(titleInput)titleInput.value=me.music.title;markDirty();renderPreview()}})}
      if(e.dataset.p==='settings.manualNitro'){renderBadges();renderNitroGrid()}
      if(['settings.showPremiumBadge','settings.showAdminBadge','settings.showModeratorBadge','settings.showBoostBadge','settings.showBadges'].includes(e.dataset.p))renderBadges();
      if(e.dataset.p.startsWith('links.'))renderSocialSort();
      if(e.dataset.p.startsWith('privacy.')||['viewsStyle.visible','settings.showStatus','settings.showActivity','settings.showSpotifyNowPlaying'].includes(e.dataset.p))updatePrivacyStatus();
      if(e.dataset.p.startsWith('share.')||e.dataset.p==='tagline'||e.dataset.p==='displayName'||e.dataset.p.startsWith('background.'))renderSharePreview();
      if(e.dataset.p.startsWith('reactions.')){renderReactionMiniPreview();renderPreview();}if(e.dataset.p.startsWith('musicPlayer.')){renderMusicStyleGrid();renderMusicPlayerPreview();}if(e.dataset.p.startsWith('premiumStatusCard.'))renderStatusCardPreview();
    };
  });
  $$('[data-segment] button').forEach(b=>b.onclick=()=>{set(me,b.parentElement.dataset.segment,b.dataset.value);markDirty();updateOutputs();renderPreview();if(b.parentElement.dataset.segment==='privacy.visibility')updatePrivacyStatus()});
  $('#hAvatar').src=me.discord.avatar;$('#accountName').textContent=me.discord.globalName||me.discord.username;$('#accountProfile').href='/'+encodeURIComponent(me.username);
  $('#discordState').textContent=`${me.discord.globalName||me.discord.username} · ${me.discord.id}`;
  updateUrl();renderNitroGrid();renderBadges();repeaters();renderHighlightsEditor();renderReactionsEditor();renderReactionMiniPreview();renderMusicStyleGrid();renderMusicSourceList();renderMusicPlayerPreview();renderStatusEmojiPicker();renderStatusCardPreview();renderPremiumSections();renderProfileModuleSort();applyPremiumAccess();applyBoostAccess();updateOutputs();renderPreview();updatePrivacyStatus();renderSharePreview();refreshPresenceDiagnostic();refreshSpotifyAccount();refreshBoostStatus();window.lucide?.createIcons?.();
}
function updateUrl(){const h=location.host+'/';$('#hostPrefix').textContent=h;$('#view').href='/'+encodeURIComponent(me.username);updatePrivacyStatus();renderSharePreview()}

function renderProfileModuleSort(){
  const box=$('#profileModuleSort');if(!box||!me)return;box.replaceChildren();
  me.profileLayout??={order:[...PROFILE_MODULE_IDS],hidden:[]};const hidden=new Set(me.profileLayout.hidden||[]);let dragging='';
  const activeIds=activePreviewModuleIds();profileModuleActiveSignature=activeIds.join('|');
  if(!activeIds.length){const empty=document.createElement('div');empty.className='moduleEmptyState';empty.textContent='Aktiviere zuerst ein Profil-Modul. Nur aktive Inhalte erscheinen hier und in der Live Preview.';box.append(empty);return}
  activeIds.forEach(id=>{const meta=PROFILE_MODULES.find(x=>x[0]===id);if(!meta)return;const row=document.createElement('div');row.className='moduleSortItem'+(hidden.has(id)?' off':'');row.draggable=true;row.dataset.id=id;
    const drag=document.createElement('span');drag.className='moduleDrag';drag.textContent='↕';const ico=document.createElement('span');ico.className='moduleIcon';ico.innerHTML=`<i data-lucide="${meta[2]}"></i>`;const copy=document.createElement('div');copy.innerHTML=`<b>${escapeHtml(meta[1])}</b><small>${escapeHtml(meta[3])}</small>`;const eye=document.createElement('button');eye.type='button';eye.className='moduleEye';eye.title=hidden.has(id)?'Modul einblenden':'Modul ausblenden';eye.innerHTML=`<i data-lucide="${hidden.has(id)?'eye-off':'eye'}" style="width:13px"></i>`;
    eye.onclick=e=>{e.stopPropagation();const h=new Set(me.profileLayout.hidden||[]);h.has(id)?h.delete(id):h.add(id);me.profileLayout.hidden=[...h];markDirty();renderProfileModuleSort();renderPreview()};
    row.addEventListener('dragstart',()=>{dragging=id;row.classList.add('dragging')});row.addEventListener('dragend',()=>{dragging='';row.classList.remove('dragging')});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();if(!dragging||dragging===id)return;const a=me.profileLayout.order;const from=a.indexOf(dragging),to=a.indexOf(id);if(from<0||to<0)return;const [m]=a.splice(from,1);a.splice(to,0,m);markDirty();renderProfileModuleSort();renderPreview()});row.append(drag,ico,copy,eye);box.append(row)});window.lucide?.createIcons?.();
}
function previewModuleContent(id){
  const muted=!!me.music?.globalMute, firstMusic=me.musicPlayer?.sources?.[0]||{};
  if(id==='activity')return `<span class="pvMiniPulse"></span><div><b>${escapeHtml(me.settings?.showActivity===false?'Activity ausgeblendet':'Discord Activity')}</b><div style="color:#72747d;margin-top:2px">${escapeHtml(me.settings?.showStatus===false?'Status verborgen':'Online / Game / Stream')}</div></div>`;
  if(id==='spotify-now')return `<div class="pvMiniCover"></div><div><b>Spotify Now Playing</b><div style="color:#72747d;margin-top:2px">${me.settings?.showSpotifyNowPlaying===false?'ausgeblendet':'Discord Spotify Presence'}</div></div>`;
  if(id==='spotify')return `<div class="pvMiniChips"><span>Spotify</span><span>${escapeHtml(me.spotifyStyle?.layout||'compact')}</span><span>${me.spotify?'verbunden':'kein Embed'}</span></div>`;
  if(id==='music-player')return `<div class="pvMiniCover"></div><div><b>${escapeHtml(me.musicPlayer?.title||'Playlist')}</b><div style="color:#72747d;margin-top:2px">${escapeHtml(firstMusic.title||'Spotify / YouTube')} · ${Number(me.musicPlayer?.sources?.length||0)} Tracks ${muted?' · MUTED':''}</div></div>`;
  if(id==='status-card'){const sc=me.premiumStatusCard||{},iconHtml=/^https:\/\/cdn\.discordapp\.com\/emojis\//i.test(sc.iconUrl||'')?`<img src="${escapeHtml(sc.iconUrl)}" alt="" style="width:22px;height:22px;object-fit:contain">`:`<span style="font-size:20px">${escapeHtml(sc.icon||'✨')}</span>`;return `<div style="display:flex;align-items:center;gap:9px">${iconHtml}<div><b>${escapeHtml(sc.title||'Status')}</b><div style="color:#72747d;margin-top:2px">${escapeHtml((sc.text||sc.eyebrow||'Premium Status').slice(0,90))}</div></div></div>`}
  if(id==='highlights'){const hs=(me.highlights||[]).slice(0,4);return hs.length?`<div class="pvMiniChips">${hs.map(x=>`<span>${escapeHtml(x.icon||'✦')} ${escapeHtml(x.label||'Highlight')}</span>`).join('')}</div>`:'<span style="color:#686a73">Noch keine Highlights</span>'}
  if(id==='reactions'){const rs=(me.reactions?.items||[]).slice(0,8);return `<div class="pvMiniChips">${rs.map(x=>`<span>${escapeHtml(x.emoji||'✨')} ${me.reactions?.showCounts!==false?Number(x.count||0):''}</span>`).join('')||'<span>Keine Reactions</span>'}</div>`}
  if(id==='socials'){const active=ensureSocialOrder().filter(socialEnabled).slice(0,6);return `<div class="pvMiniChips">${active.map(x=>`<span>${escapeHtml(SOCIAL_CATALOG.find(m=>m[0]===x)?.[1]||x)}</span>`).join('')||'<span>Discord</span>'}</div>`}
  if(id==='premium'){const secs=Array.isArray(me.premiumSections)?me.premiumSections:[];const gallery=secs.find(x=>x.type==='gallery');if(gallery?.images?.length)return `<div class="pvMiniGallery">${gallery.images.slice(0,4).map(()=>'<i></i>').join('')}</div>`;return `<span style="color:#747680">${isPremium?`${secs.length} Premium Section${secs.length===1?'':'s'}`:'Premium nicht aktiv'}</span>`}
  if(id==='about')return `<span>${escapeHtml((me.about||'Noch kein About-Text').slice(0,180))}</span>`;
  return '';
}
function renderPreviewModules(){
  const box=$('#pvModules');if(!box||!me)return;box.replaceChildren();
  const hidden=new Set(me.profileLayout?.hidden||[]),activeIds=activePreviewModuleIds(),sig=activeIds.join('|');
  if(sig!==profileModuleActiveSignature)renderProfileModuleSort();
  activeIds.forEach(id=>{if(hidden.has(id))return;const meta=PROFILE_MODULES.find(x=>x[0]===id);if(!meta)return;const m=document.createElement('div');m.className='pvModule '+id;const muted=id==='music-player'&&me.music?.globalMute;const badge=muted?'<span class="pvMutedPill">Muted</span>':`<span>${escapeHtml(meta[3])}</span>`;m.innerHTML=`<div class="pvModuleHead"><b>${escapeHtml(meta[1])}</b>${badge}</div><div class="pvModuleBody">${previewModuleContent(id)}</div>`;box.append(m)});
}
function renderPreview(){
  if(!me)return;
  const d=me.design,accent=d.accentColor||'#8b5cf6';
  document.documentElement.style.setProperty('--accent',accent);document.documentElement.style.setProperty('--accent-rgb',rgb(accent));
  $('#pvAvatar').src=me.discord.avatar;$('#pvHandle').textContent='@'+(me.username||'username');$('#pvViews').textContent=Number(me.views||0).toLocaleString('de-CH');

  const name=$('#pvName');name.textContent=me.displayName||me.discord.globalName||'Your name';
  name.className='pvName';if(d.nameEffect&&d.nameEffect!=='standard'&&d.nameEffect!=='typewriter')name.classList.add('pv-name-'+d.nameEffect);name.style.color=d.nameColor||'#f6eff2';

  const tag=$('#pvTagline');tag.textContent=me.tagline||'';tag.style.display=me.tagline?'block':'none';
  renderPreviewModules();

  const wrap=$('#pvAvatarWrap');wrap.className=`pvAvatarWrap frame-${d.avatarFrameEffect||'glow'} avatar-${d.avatarShape||'circle'}`;wrap.style.setProperty('--frame',d.avatarFrameColor||accent);
  const previewAvatarSize=Math.max(50,Math.min(80,Math.round((d.avatarSize||132)*.5)));wrap.style.width=previewAvatarSize+'px';wrap.style.height=previewAvatarSize+'px';$('#pvAvatar').style.borderWidth=(d.avatarFrameWidth??2)+'px';

  const card=$('#pvCard');
  card.style.background=d.cardStyle==='solid'?`rgba(9,9,12,${Math.max(.75,d.cardOpacity/100)})`:d.cardStyle==='outline'?'rgba(0,0,0,.12)':`rgba(8,10,10,${d.cardOpacity/100})`;
  card.style.backdropFilter=`blur(${d.cardBlur}px) saturate(${d.glassSaturation||120}%)`;
  card.style.borderRadius=d.cardRadius+'px';card.style.borderColor=`rgba(255,255,255,${d.borderOpacity/100})`;
  card.style.boxShadow=`0 22px 70px rgba(0,0,0,.38),0 0 ${Math.round((d.cardGlow||0)*.45)}px rgba(${rgb(accent)},${Math.min(.5,(d.cardGlow||0)/180)})`;
  card.dataset.baseShadow=card.style.boxShadow;
  card.classList.toggle('align-center',d.contentAlign==='center');card.classList.toggle('social-list',d.socialLayout==='list');card.classList.toggle('social-compact',d.socialLayout==='compact');
  const pvBanner=$('#pvBanner');
  const showBanner=me.settings?.showBanner!==false&&(me.discord?.banner||me.discord?.bannerColor);
  card.classList.toggle('has-banner',!!showBanner);pvBanner.hidden=!showBanner;
  const bannerH=Math.max(72,Math.min(260,Number(me.settings?.bannerHeight||120)));card.style.setProperty('--pv-banner-h',Math.round(bannerH*.6)+'px');
  if(showBanner){pvBanner.style.backgroundImage=me.discord.banner?`url("${me.discord.banner}")`:'none';pvBanner.style.backgroundColor=me.discord.bannerColor||'#16161d'}
  setupPreviewHover(card,d);

  const view=$('#pvView'),footerView=$('#pvFooterView'),vs=me.viewsStyle;
  const showViews=vs.visible!==false,atBottom=vs.placement==='page-bottom';
  view.style.display=showViews&&!atBottom?'flex':'none';footerView.style.display=showViews&&atBottom?'flex':'none';
  $('#pvFooterViews').textContent=Number(me.views||0).toLocaleString('de-CH');
  [view,footerView].forEach(v=>{v.style.background=`rgba(0,0,0,${vs.backgroundOpacity/100})`;v.style.borderColor=`rgba(255,255,255,${vs.borderOpacity/100})`;v.style.boxShadow=vs.effect==='glow'?`0 0 14px rgba(${rgb(accent)},.25)`:'none';v.style.animation=vs.effect==='pulse'?'framePulse 1.8s ease-in-out infinite':'none';v.style.backdropFilter=vs.effect==='blur'?'blur(8px)':'none'});
  view.querySelector('svg')?.style.setProperty('opacity',vs.eyeOpacity/100);$('#pvViews').style.opacity=vs.countOpacity/100;footerView.querySelector('svg')?.style.setProperty('opacity',vs.eyeOpacity/100);$('#pvFooterViews').style.opacity=vs.countOpacity/100;
  const corners={'top-left':['10px','auto','auto','12px'],'top-right':['10px','12px','auto','auto'],'bottom-left':['auto','auto','10px','12px'],'bottom-right':['auto','12px','10px','auto']}[vs.corner]||['10px','12px','auto','auto'];[view.style.top,view.style.right,view.style.bottom,view.style.left]=corners;

  $('#previewBg').style.filter=`blur(${me.background.blur||0}px)`;$('#previewBg').style.opacity=1-(me.background.dim||0)/150;
  const bgKind=me.background.type==='youtube'?'YouTube background':me.background.type==='video'?'Video background':'Image / GIF';
  const bgLabel=extractYouTubeId(me.background.url)?'YouTube Link':(me.background.url?'Custom media':'Default gradient');
  const musicKind=extractYouTubeId(me.music.url)?'YouTube audio':(me.music.url?'Audio file / URL':'No music');
  const fxLabel=me.pageFx?.type||'none';
  renderPreviewModules();

  const badges=$('#pvBadges');badges.replaceChildren();
  displayBadges().slice(0,4).forEach(x=>{const src=badgeSrc(x);if(!src)return;const i=new Image();i.src=src;i.alt='';badges.append(i)});
  if(isPremium&&me.settings.showPremiumBadge!==false){const b=document.createElement('span');b.className='platformBadgePreview premium';b.textContent='✦ Premium';badges.append(b)}
  if(canAdmin&&me.settings.showAdminBadge!==false){const b=document.createElement('span');b.className='platformBadgePreview admin';b.textContent='◆ Admin';badges.append(b)}
  if(canModerator&&me.settings.showModeratorBadge!==false){const b=document.createElement('span');b.className='platformBadgePreview admin';b.textContent='◇ Moderator';badges.append(b)}
}

let previewHoverBound=false;
function setupPreviewHover(card,d){
  card.classList.toggle('hover-preview',(d.profileHover||'tilt')!=='none');
  card.style.setProperty('--pv-hover-alpha',Math.min(.22,(d.hoverGlow||35)/450));
  card.dataset.hoverPreset=d.profileHover||'tilt';
  card.dataset.hoverIntensity=String(d.hoverIntensity??55);
  if(previewHoverBound)return;previewHoverBound=true;
  const reset=()=>{card.style.setProperty('--pv-rx','0deg');card.style.setProperty('--pv-ry','0deg');card.style.setProperty('--pv-tx','0px');card.style.setProperty('--pv-ty','0px')};
  card.addEventListener('pointermove',e=>{
    const preset=card.dataset.hoverPreset||'tilt';if(preset==='none'||matchMedia('(prefers-reduced-motion:reduce)').matches)return reset();
    const r=card.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5,k=(Number(card.dataset.hoverIntensity)||55)/100;
    card.style.setProperty('--pv-mx',((nx+.5)*100)+'%');card.style.setProperty('--pv-my',((ny+.5)*100)+'%');
    let rx=0,ry=0,tx=0,ty=0;
    if(['tilt','depth','prism','snap-tilt','micro-parallax'].includes(preset)){rx=-ny*8*k;ry=nx*11*k}
    if(preset==='depth'){tx=nx*5*k;ty=ny*5*k;rx*=1.2;ry*=1.2}
    if(preset==='soft-follow'){tx=nx*8*k;ty=ny*6*k;rx=-ny*2*k;ry=nx*3*k}
    if(preset==='magnetic'){tx=nx*15*k;ty=ny*11*k}
    if(preset==='spotlight'){rx=-ny*2*k;ry=nx*2*k}
    if(preset==='float-zoom'){tx=nx*6*k;ty=ny*6*k;rx=-ny*2*k;ry=nx*2*k;card.style.scale=String(1+.018*k)}
    else card.style.scale='';
    if(preset==='elastic'){tx=nx*18*k;ty=ny*14*k;rx=-ny*3*k;ry=nx*4*k}
    if(preset==='glow-track'){rx=-ny*1.5*k;ry=nx*1.5*k;card.style.boxShadow=`0 24px 70px rgba(0,0,0,.4),${-nx*14}px ${-ny*12}px 34px rgba(var(--accent-rgb),.25)`}
    if(preset==='micro-parallax'){tx=nx*4*k;ty=ny*4*k;rx*=.55;ry*=.55}
    if(preset==='snap-tilt'){rx=Math.round(rx/2)*2;ry=Math.round(ry/2)*2}
    if(preset==='prism')card.style.filter=`hue-rotate(${nx*18*k}deg) saturate(${1+k*.18})`;
    else card.style.filter='';
    card.style.setProperty('--pv-rx',rx+'deg');card.style.setProperty('--pv-ry',ry+'deg');card.style.setProperty('--pv-tx',tx+'px');card.style.setProperty('--pv-ty',ty+'px');
  });
  card.addEventListener('pointerleave',()=>{card.style.filter='';card.style.scale='';card.style.boxShadow=card.dataset.baseShadow||'';reset()});
}

function applyPremiumAccess(){
  const panel=$('#premiumPanel'),tile=$('#premiumTile'),status=$('#premiumStatus'),pRow=$('#premiumBadgeRow'),aRow=$('#adminBadgeRow'),mRow=$('#moderatorBadgeRow');
  panel?.classList.toggle('is-locked',!isPremium);tile?.classList.toggle('locked',!isPremium);
  if(status){status.className='premiumStatus '+(isPremium?'on':'off');status.innerHTML=`<i data-lucide="gem" style="width:13px"></i>${isPremium?'PREMIUM':'FREE'}`}
  if(pRow){pRow.classList.toggle('locked',!isPremium);const input=pRow.querySelector('input');if(input)input.disabled=!isPremium}
  if(aRow){aRow.hidden=!canAdmin;const input=aRow.querySelector('input');if(input)input.disabled=!canAdmin}
  if(mRow){mRow.hidden=!canModerator;const input=mRow.querySelector('input');if(input)input.disabled=!canModerator}
  const mp=$('#musicPlayerPremium'),mpl=$('#musicPlayerLock'),mpe=$('#musicPlayerEditor');if(mp){mp.classList.toggle('premiumMusicLocked',!isPremium);if(mpl)mpl.hidden=isPremium;mp.querySelectorAll('input,select,button').forEach(x=>x.disabled=!isPremium)}
  window.lucide?.createIcons?.();
}
function applyBoostAccess(){
  const row=$('#boostBadgeRow'),input=row?.querySelector('input'),help=$('#boostBadgeHelp');if(!row||!input)return;
  const boosted=!!me?.discord?.booster,available=me?.discord?.boosterCheckAvailable!==false;
  row.classList.toggle('locked',!boosted);input.disabled=!boosted;
  if(!boosted) input.checked=false; else input.checked=me.settings.showBoostBadge!==false;
  if(help){
    if(boosted) help.textContent='Server Boost erkannt. Du kannst den Badge auf deinem Profil ein- oder ausblenden.';
    else if(!available) help.textContent='Boost-Status konnte nicht geprüft werden. Der Bot muss den Discord-Server gemeinsam mit dir sehen.';
    else help.textContent='Kein aktiver Server Boost erkannt. Der Schalter bleibt deshalb deaktiviert.';
  }
}
function premiumSectionId(){return (crypto?.randomUUID?.()||('section-'+Date.now()+'-'+Math.random().toString(16).slice(2)))}
function addPremiumSection(type){
  if(!isPremium)return toast('Premium erforderlich');
  me.premiumSections??=[];if(me.premiumSections.length>=6)return toast('Maximal 6 Premium Sections');
  me.premiumSections.push({id:premiumSectionId(),title:type==='gallery'?'Gallery':'New section',type:type==='gallery'?'gallery':'text',text:'',tabs:type==='gallery'?[]:[{id:premiumSectionId(),label:'About Me',text:'',fields:[]}],images:[]});markDirty();renderPremiumSections();
}
async function uploadPremiumImages(sec,files){
  if(!isPremium||!files?.length)return;sec.images??=[];
  const left=12-sec.images.length;if(left<=0)return toast('Maximal 12 Bilder pro Gallery');
  for(const f of [...files].slice(0,left)){
    const fd=new FormData();fd.append('file',f);try{toast('Gallery Upload …');const r=await api('/api/upload/premium',{method:'POST',body:fd});sec.images.push(r.url)}catch(e){toast(e.message);break}
  }
  markDirty();renderPremiumSections();toast('Bilder hinzugefügt · speichern nicht vergessen');
}
function renderPremiumTextPreview(sec,host){
  if(!host)return;
  sec.tabs=Array.isArray(sec.tabs)&&sec.tabs.length?sec.tabs:[{label:'About Me',text:sec.text||'',fields:[]}];
  sec._previewTab=Math.max(0,Math.min(sec.tabs.length-1,Number(sec._previewTab??sec._activeTab??0)));
  const tab=sec.tabs[sec._previewTab]||sec.tabs[0];
  host.replaceChildren();
  const head=document.createElement('div');head.className='premiumTabPreviewHead';head.textContent='LIVE SECTION PREVIEW';host.append(head);
  const title=document.createElement('div');title.className='premiumTabPreviewTitle';title.textContent=sec.title||'Section';host.append(title);
  const tabs=document.createElement('div');tabs.className='premiumTabPreviewTabs';
  sec.tabs.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.className=i===sec._previewTab?'on':'';b.textContent=t.label||`Tab ${i+1}`;b.onclick=()=>{sec._previewTab=i;renderPremiumTextPreview(sec,host)};tabs.append(b)});host.append(tabs);
  const fields=(Array.isArray(tab.fields)?tab.fields:[]).filter(f=>f.label||f.value).slice(0,4);
  if(fields.length){const grid=document.createElement('div');grid.className='premiumTabPreviewFields';fields.forEach(f=>{const c=document.createElement('div');c.className='premiumTabPreviewField';const sm=document.createElement('small');sm.textContent=f.label||'INFO';const b=document.createElement('b');b.textContent=f.value||'—';c.append(sm,b);grid.append(c)});host.append(grid)}
  if(tab.text){const body=document.createElement('div');body.className='premiumTabPreviewText';body.textContent=tab.text;host.append(body)}
  else if(!fields.length){const empty=document.createElement('div');empty.className='premiumTabPreviewEmpty';empty.textContent='Hier siehst du live, wie dieser Text-Bereich später im Profil aussieht.';host.append(empty)}
}

const STATUS_EMOJI_GROUPS=[{"name":"Beliebt","items":[["✨","sparkle glitzer shine magic"],["🔥","feuer fire hot"],["❤️","herz heart love rot"],["🖤","herz heart black schwarz"],["🤍","herz heart white weiss"],["💜","herz heart purple lila"],["💙","herz heart blue blau"],["💚","herz heart green grün"],["💛","herz heart yellow gelb"],["🧡","herz heart orange"],["🩷","herz heart pink rosa"],["⭐","stern star favorite"],["🌟","stern star glowing"],["💫","dizzy star spark"],["👑","krone crown king queen"],["💎","diamant diamond gem"],["⚡","blitz lightning energy"],["🌈","regenbogen rainbow"],["🎉","party celebration"],["🎊","konfetti confetti"],["💯","hundert 100 perfect"],["✅","check richtig done"],["❌","x falsch close"],["🚀","rakete rocket launch"]]},{"name":"Smileys","items":[["😀","grinsen happy smile"],["😃","happy smile froh"],["😄","lachen laugh happy"],["😁","grin teeth"],["😆","laugh lachen"],["😅","sweat lachen"],["🤣","rofl laugh"],["😂","tears joy lachen"],["🙂","smile lächeln"],["🙃","upside down"],["😉","wink zwinkern"],["😊","blush smile"],["😇","angel engel"],["🥰","love hearts"],["😍","heart eyes liebe"],["🤩","star eyes wow"],["😘","kiss kuss"],["😗","kiss"],["😚","kiss closed eyes"],["😋","yum lecker"],["😛","tongue zunge"],["😜","wink tongue"],["🤪","crazy verrückt"],["🤨","raised eyebrow"],["🧐","monocle"],["🤓","nerd geek"],["😎","cool sunglasses"],["🥸","disguise"],["🤠","cowboy"],["🥳","party birthday"],["😏","smirk"],["😒","unamused"],["😔","sad traurig"],["😢","cry weinen"],["😭","cry laut"],["😤","steam angry"],["😡","angry wütend"],["🤬","swear wütend"],["😱","scream schock"],["🥶","cold frozen"],["🥵","hot warm"],["😴","sleep schlafen"],["🤯","mind blown"],["🫠","melting"],["🫡","salute"],["🤫","quiet leise"],["🤭","giggle"],["🫢","oops"],["🤔","thinking denken"],["🫶","heart hands"]]},{"name":"Gesten & Menschen","items":[["👍","thumb up like"],["👎","thumb down dislike"],["👌","ok hand"],["✌️","peace victory"],["🤞","crossed fingers luck"],["🤟","love you hand"],["🤘","rock hand"],["🤙","call me"],["👋","wave hallo bye"],["👏","clap applause"],["🙌","raise hands"],["👐","open hands"],["🤲","palms"],["🙏","pray danke please"],["💪","muscle strong"],["🦾","robot arm"],["👀","eyes schauen"],["👁️","eye"],["🧠","brain gehirn"],["🫀","heart organ"],["👻","ghost geist"],["💀","skull tot"],["☠️","skull danger"],["🤖","robot bot"],["👽","alien"],["😈","devil"],["👿","angry devil"],["💩","poop"],["🥷","ninja"],["🧙","wizard magier"]]},{"name":"Gaming & Tech","items":[["🎮","gaming controller game"],["🕹️","joystick arcade"],["🎲","dice würfel"],["♟️","chess schach"],["🎯","target dart"],["🏆","trophy winner"],["🥇","gold medal"],["🥈","silver medal"],["🥉","bronze medal"],["🏅","medal"],["🎧","headphones music"],["🎤","microphone mic"],["🎵","music note"],["🎶","music notes"],["💻","computer laptop tech"],["🖥️","desktop monitor"],["⌨️","keyboard tastatur"],["🖱️","mouse maus"],["📱","phone handy"],["📸","camera foto"],["📷","camera photo"],["🎥","video camera"],["🔋","battery akku"],["🔌","plug stecker"],["💡","idea light"],["🧩","puzzle"],["🛠️","tools werkzeug"],["⚙️","gear settings"],["🔧","wrench"],["🔐","lock security"],["🔑","key schlüssel"],["📡","satellite antenna"],["🤖","robot bot"],["🧑‍💻","coder developer"]]},{"name":"Natur & Wetter","items":[["☀️","sun sonne"],["🌤️","sun cloud"],["⛅","cloud sun"],["☁️","cloud wolke"],["🌧️","rain regen"],["⛈️","storm gewitter"],["❄️","snow schnee"],["☃️","snowman"],["🌙","moon mond night"],["🌚","new moon face"],["🌝","full moon face"],["🌍","earth world"],["🌎","earth america"],["🌏","earth asia"],["🌊","wave wasser"],["💧","water drop"],["🌸","flower blossom"],["🌹","rose"],["🌺","hibiscus"],["🌻","sunflower"],["🌷","tulip"],["🍀","clover luck"],["🌿","herb green"],["🍁","maple leaf"],["🍂","autumn leaves"],["🌲","tree pine"],["🌴","palm tree"],["🌵","cactus"],["🪴","plant topf"],["🍄","mushroom pilz"],["🦋","butterfly"],["🐝","bee biene"],["🐉","dragon"],["🐲","dragon face"],["🦄","unicorn"]]},{"name":"Tiere","items":[["🐶","dog hund"],["🐱","cat katze"],["🐭","mouse maus"],["🐹","hamster"],["🐰","rabbit hase"],["🦊","fox fuchs"],["🐻","bear bär"],["🐼","panda"],["🐨","koala"],["🐯","tiger"],["🦁","lion löwe"],["🐮","cow kuh"],["🐷","pig schwein"],["🐸","frog frosch"],["🐵","monkey affe"],["🐔","chicken huhn"],["🐧","penguin"],["🐦","bird vogel"],["🦅","eagle adler"],["🦉","owl eule"],["🐺","wolf"],["🐗","boar"],["🐴","horse pferd"],["🦎","lizard"],["🐍","snake schlange"],["🐢","turtle schildkröte"],["🐙","octopus"],["🦈","shark hai"],["🐬","dolphin delfin"],["🐳","whale wal"]]},{"name":"Essen & Drinks","items":[["🍕","pizza"],["🍔","burger"],["🍟","fries pommes"],["🌭","hotdog"],["🥪","sandwich"],["🌮","taco"],["🌯","burrito"],["🍜","noodles ramen"],["🍝","pasta spaghetti"],["🍣","sushi"],["🍱","bento"],["🍿","popcorn"],["🥨","pretzel brezel"],["🥐","croissant"],["🍞","bread brot"],["🧀","cheese käse"],["🥓","bacon"],["🥚","egg ei"],["🍳","fried egg"],["🥗","salad salat"],["🍎","apple apfel"],["🍓","strawberry erdbeere"],["🍒","cherry kirsche"],["🍉","watermelon"],["🍇","grapes trauben"],["🍌","banana"],["🍋","lemon zitrone"],["🥝","kiwi"],["🍪","cookie keks"],["🍩","donut"],["🍫","chocolate schokolade"],["🍬","candy"],["🍭","lollipop"],["🎂","cake birthday"],["☕","coffee kaffee"],["🧋","bubble tea"],["🥤","drink soda"],["🧃","juice saft"],["🍺","beer bier"],["🥂","cheers toast"]]},{"name":"Sport & Freizeit","items":[["⚽","football fussball"],["🏀","basketball"],["🏈","american football"],["⚾","baseball"],["🎾","tennis"],["🏐","volleyball"],["🏉","rugby"],["🥏","frisbee"],["🎳","bowling"],["🏓","table tennis ping pong"],["🏸","badminton"],["🥊","boxing boxen"],["🥋","martial arts"],["⛳","golf"],["⛸️","ice skate"],["🎿","ski"],["🏂","snowboard"],["🏋️","weights gym"],["🚴","bike fahrrad"],["🏎️","race car"],["🚗","car auto"],["🏍️","motorcycle motorrad"],["✈️","plane flugzeug travel"],["🏖️","beach strand"],["⛺","camping"],["🎣","fishing angeln"]]},{"name":"Objekte & Symbole","items":[["🔔","bell glocke"],["🔕","mute bell"],["📌","pin"],["📍","location pin"],["📎","paperclip"],["✏️","pencil stift"],["📝","note schreiben"],["📖","book buch"],["📚","books bücher"],["📦","package paket"],["🎁","gift geschenk"],["💰","money geld"],["💸","money fly"],["💳","card karte"],["💵","dollar"],["🪙","coin münze"],["📈","chart up"],["📉","chart down"],["🔗","link"],["🔒","lock geschlossen"],["🔓","unlock offen"],["🛡️","shield schutz"],["⚠️","warning warnung"],["🚨","siren alarm"],["💥","boom explosion"],["💬","chat message"],["💭","thought denken"],["🗨️","speech"],["📢","announcement lautsprecher"],["🎬","movie film"],["🎨","art palette"],["🪄","magic wand"],["🔮","crystal ball"],["🧿","evil eye"],["♾️","infinity unendlich"],["☯️","yin yang"],["☮️","peace"],["✔️","check"],["➕","plus"],["➖","minus"],["❗","exclamation"],["❓","question"],["‼️","double exclamation"],["⁉️","question exclamation"]]}];
let statusDiscordEmojis=[];
let statusDiscordMember=false;
let statusEmojiTab='standard';
let statusEmojiQuery='';
let statusEmojiDiscordLoaded=false;
let statusDiscordInfo={};
let statusEmojiRecent=(()=>{try{const a=JSON.parse(localStorage.getItem('caruzo-status-emoji-recent-v1')||'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string').slice(0,18):[]}catch{return []}})();
function rememberStatusEmoji(emoji){const e=String(emoji||'').trim();if(!e)return;statusEmojiRecent=[e,...statusEmojiRecent.filter(x=>x!==e)].slice(0,18);try{localStorage.setItem('caruzo-status-emoji-recent-v1',JSON.stringify(statusEmojiRecent))}catch{}}
function isDiscordEmojiUrl(url=''){return /^https:\/\/cdn\.discordapp\.com\/emojis\/[0-9]+\.(?:webp|gif)(?:\?.*)?$/i.test(String(url||''))}
function closeStatusEmojiPicker(){const picker=$('#statusEmojiPicker'),trigger=$('#statusEmojiCurrent');if(!picker||picker.hidden)return;picker.hidden=true;trigger?.setAttribute('aria-expanded','false');$('#premiumPanel')?.classList.remove('emoji-menu-open');statusEmojiQuery='';const search=$('#statusEmojiSearch');if(search)search.value='';renderStatusEmojiPicker()}
function openStatusEmojiPicker(){const picker=$('#statusEmojiPicker'),trigger=$('#statusEmojiCurrent');if(!picker)return;picker.hidden=false;trigger?.setAttribute('aria-expanded','true');$('#premiumPanel')?.classList.add('emoji-menu-open');renderStatusEmojiPicker();requestAnimationFrame(()=>$('#statusEmojiSearch')?.focus({preventScroll:true}));if(!statusEmojiDiscordLoaded)loadStatusDiscordEmojis()}
function selectStatusEmoji(emoji='', iconUrl=''){
  if(!me?.premiumStatusCard)return;if(!iconUrl)rememberStatusEmoji(emoji);me.premiumStatusCard.icon=emoji||'✨';me.premiumStatusCard.iconUrl=iconUrl||'';const a=$('[data-p="premiumStatusCard.icon"]'),u=$('[data-p="premiumStatusCard.iconUrl"]');if(a)a.value=me.premiumStatusCard.icon;if(u)u.value=me.premiumStatusCard.iconUrl;markDirty();renderStatusEmojiPicker();renderStatusCardPreview();renderPreview();closeStatusEmojiPicker();
}
function statusEmojiMatches(emoji,keywords=''){const q=statusEmojiQuery.trim().toLowerCase();return !q||String(emoji).includes(q)||String(keywords).toLowerCase().includes(q)}
function renderStatusEmojiPicker(){
  if(!me)return;const sc=me.premiumStatusCard||{},current=$('#statusEmojiCurrentVisual'),currentLabel=$('#statusEmojiCurrentLabel');
  const discordIconAllowed=isDiscordEmojiUrl(sc.iconUrl)&&statusDiscordMember;
  if(current){current.replaceChildren();if(discordIconAllowed){const img=document.createElement('img');img.src=sc.iconUrl;img.alt='';current.append(img)}else current.textContent=isDiscordEmojiUrl(sc.iconUrl)?'✨':(sc.icon||'✨')}
  if(currentLabel)currentLabel.textContent=discordIconAllowed?String(sc.icon||'Discord Emoji').replace(/^:|:$/g,''):'Standard Emoji';
  const sections=$('#statusEmojiStandardSections');if(sections){sections.replaceChildren();let shown=0;const groups=statusEmojiRecent.length?[{name:'Zuletzt verwendet',items:statusEmojiRecent.map(x=>[x,'recent zuletzt'])},...STATUS_EMOJI_GROUPS]:STATUS_EMOJI_GROUPS;groups.forEach(group=>{const hits=group.items.filter(([em,kw])=>statusEmojiMatches(em,kw));if(!hits.length)return;shown+=hits.length;const section=document.createElement('div');section.className='statusEmojiSection';const head=document.createElement('div');head.className='statusEmojiHead';const b=document.createElement('b');b.textContent=group.name;const small=document.createElement('small');small.textContent=`${hits.length} Emojis`;head.append(b,small);const grid=document.createElement('div');grid.className='statusEmojiGrid';hits.forEach(([em])=>{const btn=document.createElement('button');btn.type='button';btn.className='statusEmojiBtn'+(!sc.iconUrl&&sc.icon===em?' on':'');btn.textContent=em;btn.title=em;btn.setAttribute('aria-label',`Emoji ${em}`);btn.onclick=()=>selectStatusEmoji(em,'');grid.append(btn)});section.append(head,grid);sections.append(section)});const empty=$('#statusEmojiStandardEmpty');if(empty)empty.hidden=!!shown}
  const discordTab=$('#statusEmojiDiscordTab'),discordPanel=$('#statusDiscordEmoji'),standardPanel=$('#statusEmojiStandardPanel'),memberBadge=$('#statusEmojiMemberBadge'),memberNote=$('#statusEmojiMemberNote');
  if(discordTab)discordTab.hidden=!statusDiscordMember;if(memberBadge)memberBadge.hidden=!statusDiscordMember;if(memberNote)memberNote.hidden=statusDiscordMember;
  const memberText=$('#statusEmojiMemberText');if(memberText&&!statusDiscordMember){const r=statusDiscordInfo?.reason||'';memberText.textContent=r==='bot-unavailable'?'Discord-Bot ist noch nicht vollständig konfiguriert.':r==='no-bot-guilds'?'Der Discord-Bot sieht aktuell keinen gemeinsamen Server. Prüfe Bot-Verbindung und Server.':r==='forbidden'?'Der Bot darf die Server-Mitgliedschaft aktuell nicht prüfen.':'Dein verbundenes Discord-Konto wurde noch nicht auf einem gemeinsamen Server erkannt.';}
  if(!statusDiscordMember&&statusEmojiTab==='discord')statusEmojiTab='standard';
  $$('.statusEmojiTab').forEach(btn=>btn.classList.toggle('on',btn.dataset.statusEmojiTab===statusEmojiTab));
  if(standardPanel)standardPanel.hidden=statusEmojiTab!=='standard';if(discordPanel)discordPanel.hidden=statusEmojiTab!=='discord'||!statusDiscordMember;
  const dg=$('#statusDiscordEmojiGrid');if(dg){dg.replaceChildren();const q=statusEmojiQuery.trim().toLowerCase();const filtered=statusDiscordEmojis.filter(x=>!q||String(x.name||'').toLowerCase().includes(q));filtered.forEach(x=>{const btn=document.createElement('button');btn.type='button';btn.className='statusEmojiBtn'+(x.animated?' animated':'')+(sc.iconUrl===x.url?' on':'');btn.title=`:${x.name}:`+(x.animated?' · animiert':'');btn.setAttribute('aria-label',`${x.name}${x.animated?' animiert':''}`);const img=document.createElement('img');img.src=x.url;img.alt=`:${x.name}:`;img.loading='lazy';img.decoding='async';btn.append(img);btn.onclick=()=>selectStatusEmoji(`:${x.name}:`,x.url);dg.append(btn)});const empty=$('#statusDiscordEmojiEmpty');if(empty)empty.hidden=!!filtered.length;const count=$('#statusDiscordEmojiCount');if(count){const animated=statusDiscordEmojis.filter(x=>x.animated).length;count.textContent=`${statusDiscordEmojis.length} Emojis · ${animated} animiert`}}
  const footer=$('#statusEmojiFooterText');if(footer){if(statusEmojiTab==='discord'&&statusDiscordMember)footer.textContent=(statusDiscordInfo.guildName?statusDiscordInfo.guildName+' · ':'')+'Discord Server Emojis';else footer.textContent=`Standard-Emojis · ${STATUS_EMOJI_GROUPS.reduce((n,g)=>n+g.items.length,0)} verfügbar`;}
  if(window.lucide)lucide.createIcons();
}
async function loadStatusDiscordEmojis(force=false){
  statusDiscordEmojis=[];statusDiscordMember=false;statusDiscordInfo={};try{const r=await api('/api/discord/status-emojis'+(force?'?refresh=1&t='+Date.now():''));statusDiscordInfo=r||{};statusDiscordMember=!!r?.member;if(statusDiscordMember&&Array.isArray(r.emojis))statusDiscordEmojis=r.emojis.filter(x=>x&&x.url&&x.name).sort((a,b)=>Number(b.animated)-Number(a.animated)||String(a.name).localeCompare(String(b.name)))}catch(e){statusDiscordInfo={reason:'request-failed',error:String(e?.message||'')};}statusEmojiDiscordLoaded=true;renderStatusEmojiPicker();
}
if($('#statusEmojiCurrent'))$('#statusEmojiCurrent').onclick=e=>{e.stopPropagation();const picker=$('#statusEmojiPicker');picker?.hidden?openStatusEmojiPicker():closeStatusEmojiPicker()};
if($('#statusEmojiClose'))$('#statusEmojiClose').onclick=()=>closeStatusEmojiPicker();
if($('#statusEmojiRefreshDiscord'))$('#statusEmojiRefreshDiscord').onclick=e=>{e.stopPropagation();statusEmojiDiscordLoaded=false;loadStatusDiscordEmojis(true)};
if($('#statusDiscordEmojiRefresh'))$('#statusDiscordEmojiRefresh').onclick=e=>{e.stopPropagation();statusEmojiDiscordLoaded=false;loadStatusDiscordEmojis(true)};
if($('#statusEmojiSearch'))$('#statusEmojiSearch').oninput=e=>{statusEmojiQuery=String(e.target.value||'');renderStatusEmojiPicker()};
$$('[data-status-emoji-tab]').forEach(btn=>btn.onclick=()=>{if(btn.dataset.statusEmojiTab==='discord'&&!statusDiscordMember)return;statusEmojiTab=btn.dataset.statusEmojiTab;renderStatusEmojiPicker();requestAnimationFrame(()=>$('#statusEmojiSearch')?.focus({preventScroll:true}))});
document.addEventListener('click',e=>{const picker=$('#statusEmojiPicker'),field=e.target.closest?.('.statusEmojiField');if(picker&&!picker.hidden&&!field)closeStatusEmojiPicker()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeStatusEmojiPicker()});

function renderStatusCardPreview(){
  const box=$('#statusCardPreview');if(!box||!me)return;const sc=me.premiumStatusCard||{};box.style.setProperty('--sc',/^#[0-9a-f]{6}$/i.test(sc.accent||'')?sc.accent:'#8b5cf6');box.replaceChildren();
  const card=document.createElement('div');card.className='statusCardDemo '+(sc.style||'glass');const top=document.createElement('div');top.className='statusCardDemoTop';const icon=document.createElement('span');icon.className='statusCardDemoIcon';if(statusDiscordMember&&/^https:\/\/cdn\.discordapp\.com\/emojis\//i.test(sc.iconUrl||'')){const im=document.createElement('img');im.src=sc.iconUrl;im.alt='';icon.append(im)}else icon.textContent=/^https:\/\/cdn\.discordapp\.com\/emojis\//i.test(sc.iconUrl||'')?'✨':(sc.icon||'✨');const copy=document.createElement('div');const eye=document.createElement('small');eye.textContent=sc.eyebrow||'STATUS';const title=document.createElement('b');title.textContent=sc.title||'Your status';copy.append(eye,title);top.append(icon,copy);card.append(top);if(sc.text){const pp=document.createElement('p');pp.textContent=sc.text;card.append(pp)}if(sc.showCountdown&&sc.expiresAt){const t=document.createElement('div');t.className='statusCardCountdown';const d=new Date(sc.expiresAt);t.textContent=Number.isNaN(d.getTime())?'Countdown':`Bis ${d.toLocaleString('de-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`;card.append(t)}box.append(card);
}
function renderPremiumSections(){
  const box=$('#premiumSections');if(!box||!me)return;box.replaceChildren();me.premiumSections??=[];
  if(!me.premiumSections.length){const empty=document.createElement('div');empty.className='premiumEmpty';empty.textContent='Noch keine eigenen Abschnitte. Erstelle einen Text- oder Gallery-Bereich.';box.append(empty);return}
  me.premiumSections.forEach((sec,index)=>{
    sec.images??=[];sec.type=sec.type==='gallery'?'gallery':'text';
    const card=document.createElement('div');card.className='premiumSectionCard';
    const top=document.createElement('div');top.className='premiumSectionTop';
    const title=document.createElement('label');title.className='field';title.innerHTML='<span>Section title</span>';const ti=document.createElement('input');ti.type='text';ti.value=sec.title||'';ti.maxLength=60;title.append(ti);
    const type=document.createElement('label');type.className='field';type.innerHTML='<span>Type</span>';const sel=document.createElement('select');[['text','Text'],['gallery','Gallery']].forEach(([v,n])=>{const o=document.createElement('option');o.value=v;o.textContent=n;sel.append(o)});sel.value=sec.type;sel.onchange=()=>{sec.type=sel.value;markDirty();renderPremiumSections()};type.append(sel);
    const acts=document.createElement('div');acts.className='premiumSectionActions';
    const up=document.createElement('button');up.type='button';up.title='Nach oben';up.textContent='↑';up.disabled=index===0;up.onclick=()=>{[me.premiumSections[index-1],me.premiumSections[index]]=[me.premiumSections[index],me.premiumSections[index-1]];markDirty();renderPremiumSections()};
    const down=document.createElement('button');down.type='button';down.title='Nach unten';down.textContent='↓';down.disabled=index===me.premiumSections.length-1;down.onclick=()=>{[me.premiumSections[index+1],me.premiumSections[index]]=[me.premiumSections[index],me.premiumSections[index+1]];markDirty();renderPremiumSections()};
    const del=document.createElement('button');del.type='button';del.title='Entfernen';del.textContent='×';del.onclick=()=>{me.premiumSections.splice(index,1);markDirty();renderPremiumSections()};acts.append(up,down,del);top.append(title,type,acts);card.append(top);
    if(sec.type==='text'){
      sec.tabs=Array.isArray(sec.tabs)&&sec.tabs.length?sec.tabs:[{id:premiumSectionId(),label:'About Me',text:sec.text||'',fields:[]}];
      sec.tabs=sec.tabs.slice(0,5);sec._activeTab=Math.max(0,Math.min(sec.tabs.length-1,Number(sec._activeTab||0)));
      const editor=document.createElement('div');editor.className='premiumTabEditor';
      const strip=document.createElement('div');strip.className='premiumTabStrip';
      sec.tabs.forEach((tab,ti)=>{const b=document.createElement('button');b.type='button';b.className='premiumTabBtn'+(ti===sec._activeTab?' on':'');b.textContent=tab.label||`Tab ${ti+1}`;b.onclick=()=>{sec._activeTab=ti;sec._previewTab=ti;renderPremiumSections()};strip.append(b)});
      if(sec.tabs.length<5){const addTab=document.createElement('button');addTab.type='button';addTab.className='premiumTabBtn';addTab.textContent='+ Tab';addTab.onclick=()=>{sec.tabs.push({id:premiumSectionId(),label:`Tab ${sec.tabs.length+1}`,text:'',fields:[]});sec._activeTab=sec.tabs.length-1;sec._previewTab=sec._activeTab;markDirty();renderPremiumSections()};strip.append(addTab)}
      editor.append(strip);
      const tab=sec.tabs[sec._activeTab];tab.fields??=[];
      const preview=document.createElement('div');preview.className='premiumTabPreview';
      const refreshPreview=()=>renderPremiumTextPreview(sec,preview);
      ti.oninput=()=>{sec.title=ti.value;markDirty();refreshPreview()};
      const meta=document.createElement('div');meta.className='grid2';meta.style.marginTop='10px';
      const name=document.createElement('label');name.className='field';name.innerHTML='<span>Tab name</span>';const nameIn=document.createElement('input');nameIn.value=tab.label||'';nameIn.maxLength=28;nameIn.oninput=()=>{tab.label=nameIn.value;markDirty();strip.children[sec._activeTab].textContent=nameIn.value||`Tab ${sec._activeTab+1}`;refreshPreview()};name.append(nameIn);
      const remove=document.createElement('button');remove.type='button';remove.className='btn ghost';remove.style.alignSelf='end';remove.textContent='Tab entfernen';remove.disabled=sec.tabs.length===1;remove.onclick=()=>{sec.tabs.splice(sec._activeTab,1);sec._activeTab=Math.max(0,sec._activeTab-1);sec._previewTab=sec._activeTab;markDirty();renderPremiumSections()};meta.append(name,remove);editor.append(meta);
      const body=document.createElement('label');body.className='field';body.style.marginTop='9px';body.innerHTML='<span>Text</span>';const ta=document.createElement('textarea');ta.maxLength=1200;ta.placeholder='Optionaler Text für diesen Tab …';ta.value=tab.text||'';ta.oninput=()=>{tab.text=ta.value;sec.text=sec.tabs[0]?.text||'';markDirty();refreshPreview()};body.append(ta);editor.append(body);
      const rows=document.createElement('div');rows.className='premiumInfoRows';tab.fields.slice(0,4).forEach((f,fi)=>{const row=document.createElement('div');row.className='premiumInfoRow';const l=document.createElement('input');l.placeholder='Label · z. B. NAME';l.value=f.label||'';l.maxLength=24;l.oninput=()=>{f.label=l.value;markDirty();refreshPreview()};const v=document.createElement('input');v.placeholder='Wert · z. B. Online';v.value=f.value||'';v.maxLength=140;v.oninput=()=>{f.value=v.value;markDirty();refreshPreview()};const rm=document.createElement('button');rm.type='button';rm.textContent='×';rm.onclick=()=>{tab.fields.splice(fi,1);markDirty();renderPremiumSections()};row.append(l,v,rm);rows.append(row)});editor.append(rows);
      if(tab.fields.length<4){const addField=document.createElement('button');addField.type='button';addField.className='btn ghost';addField.style.marginTop='8px';addField.textContent='+ Info field';addField.onclick=()=>{tab.fields.push({label:'',value:''});markDirty();renderPremiumSections()};editor.append(addField)}
      card.append(editor,preview);refreshPreview();
    }else{
      ti.oninput=()=>{sec.title=ti.value;markDirty()};
      const ed=document.createElement('div');ed.className='galleryEditor';const tools=document.createElement('div');tools.className='galleryTools';
      const urlField=document.createElement('label');urlField.className='field';urlField.innerHTML='<span>Image URL</span>';const urlIn=document.createElement('input');urlIn.type='url';urlIn.placeholder='https://…';urlField.append(urlIn);
      const add=document.createElement('button');add.type='button';add.className='btn';add.textContent='URL hinzufügen';add.onclick=()=>{const v=urlIn.value.trim();if(!/^https?:\/\//i.test(v))return toast('Gültige Bild-URL eingeben');if(sec.images.length>=12)return toast('Maximal 12 Bilder');sec.images.push(v);urlIn.value='';markDirty();renderPremiumSections()};
      const upload=document.createElement('label');upload.className='btn';upload.style.cursor='pointer';upload.innerHTML='<span>Upload</span>';const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/gif,image/webp';file.multiple=true;file.hidden=true;file.onchange=()=>uploadPremiumImages(sec,file.files);upload.append(file);tools.append(urlField,add,upload);ed.append(tools);
      const hint=document.createElement('div');hint.className='premiumGalleryHint';hint.textContent='4 Bilder pro Reihe · Ziehen zum Sortieren · Reihenfolge entspricht dem Profil.';ed.append(hint);
      const thumbs=document.createElement('div');thumbs.className='galleryThumbs';let dragIndex=-1;
      sec.images.forEach((src,i)=>{const w=document.createElement('div');w.className='galleryThumb';w.draggable=true;w.dataset.index=String(i);const img=new Image();img.src=src;img.alt='';
        w.addEventListener('dragstart',()=>{dragIndex=i;w.classList.add('dragging')});
        w.addEventListener('dragend',()=>{dragIndex=-1;thumbs.querySelectorAll('.galleryThumb').forEach(x=>x.classList.remove('dragging','dragover'))});
        w.addEventListener('dragover',e=>{e.preventDefault();w.classList.add('dragover')});
        w.addEventListener('dragleave',()=>w.classList.remove('dragover'));
        w.addEventListener('drop',e=>{e.preventDefault();w.classList.remove('dragover');if(dragIndex<0||dragIndex===i)return;const moved=sec.images.splice(dragIndex,1)[0];sec.images.splice(i,0,moved);markDirty();renderPremiumSections()});
        const rm=document.createElement('button');rm.type='button';rm.textContent='×';rm.onclick=e=>{e.stopPropagation();sec.images.splice(i,1);markDirty();renderPremiumSections()};w.append(img,rm);thumbs.append(w)});ed.append(thumbs);card.append(ed);
    }
    box.append(card);
  });
}
$('#addPremiumText').onclick=()=>addPremiumSection('text');
$('#addPremiumGallery').onclick=()=>addPremiumSection('gallery');

function repeaters(){
  simpleRepeater('#tabMessages',me.browser.messages,'Add tab text');
  simpleRepeater('#floating',me.floating,'Add floating element');
  objectRepeater('#steam',me.links.steam,[['name','Name'],['url','Steam URL']],'Add Steam account');
  objectRepeater('#custom',me.links.custom,[['label','Title'],['url','URL']],'Add custom link');
  renderSocialSort();
}
function renderSocialSort(){
  const box=$('#socialSort'); if(!box||!me) return; box.replaceChildren();
  const order=ensureSocialOrder();
  let dragging='';
  order.forEach(key=>{
    const meta=SOCIAL_CATALOG.find(x=>x[0]===key); if(!meta) return;
    const row=document.createElement('div'); row.className='sortItem'; row.draggable=true; row.dataset.key=key;
    const asset=SOCIAL_ICON_ASSETS[key]||''; const logo=asset?`<span class="sortLogo"><img src="${asset}" alt=""></span>`:`<span class="sortLogo"><i data-lucide="${key==='steam'?'gamepad-2':key==='custom'?'link':'circle'}"></i></span>`; row.innerHTML=`<span class="sortHandle">↕</span>${logo}<div class="sortMeta"><b>${escapeHtml(meta[1])}</b><small>${escapeHtml(meta[2])}</small></div><span class="sortState ${socialEnabled(key)?'on':''}">${socialEnabled(key)?'aktiv':'leer'}</span>`;
    row.addEventListener('dragstart',()=>{dragging=key;row.classList.add('dragging')});
    row.addEventListener('dragend',()=>{dragging='';box.querySelectorAll('.sortItem').forEach(x=>x.classList.remove('dragging'))});
    row.addEventListener('dragover',e=>{e.preventDefault()});
    row.addEventListener('drop',e=>{
      e.preventDefault(); if(!dragging||dragging===key) return;
      const arr=ensureSocialOrder().filter(Boolean); const from=arr.indexOf(dragging), to=arr.indexOf(key); if(from<0||to<0) return;
      arr.splice(to,0,arr.splice(from,1)[0]); me.links.order=arr; markDirty(); renderSocialSort(); renderPreview();
    });
    box.append(row);
  });
  window.lucide?.createIcons?.();
}
function simpleRepeater(sel,arr,label){
  const box=$(sel);box.replaceChildren();
  arr.forEach((v,i)=>{
    const row=document.createElement('div');row.className='repeatRow single';
    const inp=document.createElement('input');inp.value=v;inp.placeholder='Text';inp.oninput=()=>{arr[i]=inp.value;markDirty();renderSocialSort();renderPreview()};
    const del=document.createElement('button');del.type='button';del.className='remove';del.innerHTML='×';del.onclick=()=>{arr.splice(i,1);markDirty();simpleRepeater(sel,arr,label);renderPreview()};
    row.append(inp,del);box.append(row)
  });
  const add=document.createElement('button');add.type='button';add.className='btn ghost';add.textContent='+ '+label;add.onclick=()=>{arr.push('');markDirty();simpleRepeater(sel,arr,label);renderPreview()};box.append(add)
}
function objectRepeater(sel,arr,fields,label){
  const box=$(sel);box.replaceChildren();
  arr.forEach((it,i)=>{
    const row=document.createElement('div');row.className='repeatRow';
    fields.forEach(([k,ph])=>{const inp=document.createElement('input');inp.placeholder=ph;inp.value=it[k]||'';inp.oninput=()=>{it[k]=inp.value;markDirty();renderSocialSort();renderPreview()};row.append(inp)});
    const del=document.createElement('button');del.type='button';del.className='remove';del.innerHTML='×';del.onclick=()=>{arr.splice(i,1);markDirty();objectRepeater(sel,arr,fields,label);renderPreview()};row.append(del);box.append(row)
  });
  const add=document.createElement('button');add.type='button';add.className='btn ghost';add.textContent='+ '+label;add.onclick=()=>{arr.push({});markDirty();objectRepeater(sel,arr,fields,label);renderPreview()};box.append(add)
}

/* Custom color engine */
const cp=$('#colorPopover'),cpSV=$('#cpSV'),cpCursor=$('#cpCursor'),cpHue=$('#cpHue'),cpHex=$('#cpHex'),cpPreview=$('#cpPreview'),cpLabel=$('#cpLabel');
const cpState={path:'',h:270,s:.62,v:.96};
const cpNames={'design.accentColor':'Accent color','design.nameColor':'Name color','design.avatarFrameColor':'Frame color','pageFx.color':'Primary FX','pageFx.secondary':'Secondary FX'};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function hexArr(hex){const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex||'');return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[139,92,246]}
function rgbHsv([r,g,b]){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return[h,mx?d/mx:0,mx]}
function hsvHex(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let a=[0,0,0];if(h<60)a=[c,x,0];else if(h<120)a=[x,c,0];else if(h<180)a=[0,c,x];else if(h<240)a=[0,x,c];else if(h<300)a=[x,0,c];else a=[c,0,x];return '#'+a.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('')}
function cpPaint(){
  const hex=hsvHex(cpState.h,cpState.s,cpState.v);
  cp.style.setProperty('--picker-hue',cpState.h);cp.style.setProperty('--cp-color',hex);cpPreview.style.setProperty('--cp-color',hex);cpHex.value=hex.toUpperCase();
  cpCursor.style.left=(cpState.s*100)+'%';cpCursor.style.top=((1-cpState.v)*100)+'%';cpHue.value=Math.round(cpState.h)
}
function cpApply(hex){
  if(!/^#[0-9a-f]{6}$/i.test(hex)||!cpState.path)return;
  set(me,cpState.path,hex.toLowerCase());
  const field=$(`[data-p="${cpState.path}"]`);if(field)field.value=hex.toLowerCase();
  markDirty();updateOutputs();renderPreview()
}
function cpFromHex(hex,apply=false){const [h,s,v]=rgbHsv(hexArr(hex));Object.assign(cpState,{h,s,v});cpPaint();if(apply)cpApply(hsvHex(h,s,v))}
function openColorPicker(path,anchor){
  cpState.path=path;cpLabel.textContent=cpNames[path]||path;cp.hidden=false;cpFromHex(get(me,path)||'#8b5cf6');
  const r=anchor.getBoundingClientRect(),w=306;let left=clamp(r.left,12,window.innerWidth-w-12),top=r.bottom+8;
  if(top+390>window.innerHeight)top=Math.max(72,r.top-390);cp.style.left=left+'px';cp.style.top=top+'px';
}
$$('[data-color-picker]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openColorPicker(b.dataset.colorPicker,b)}));
$('#cpClose').onclick=()=>cp.hidden=true;cp.onclick=e=>e.stopPropagation();document.addEventListener('click',()=>{if(!cp.hidden)cp.hidden=true});
function cpSVUpdate(e){const r=cpSV.getBoundingClientRect();cpState.s=clamp((e.clientX-r.left)/r.width,0,1);cpState.v=1-clamp((e.clientY-r.top)/r.height,0,1);cpPaint();cpApply(hsvHex(cpState.h,cpState.s,cpState.v))}
cpSV.addEventListener('pointerdown',e=>{cpSV.setPointerCapture(e.pointerId);cpSVUpdate(e)});cpSV.addEventListener('pointermove',e=>{if(cpSV.hasPointerCapture(e.pointerId))cpSVUpdate(e)});
cpHue.oninput=()=>{cpState.h=Number(cpHue.value);cpPaint();cpApply(hsvHex(cpState.h,cpState.s,cpState.v))};
cpHex.oninput=()=>{let v=cpHex.value.trim();if(!v.startsWith('#'))v='#'+v;if(/^#[0-9a-f]{6}$/i.test(v))cpFromHex(v,true)};
const cpColors=['#8b5cf6','#6d5dfc','#22d3ee','#00e676','#ff2e93','#ff5c7a','#ff8a3d','#f5d90a','#f4f4f5','#a3a3a3','#111827','#7c3aed','#0ea5e9','#14b8a6','#ef4444','#f97316'];
cpColors.forEach(c=>{const b=document.createElement('button');b.type='button';b.style.setProperty('--c',c);b.title=c;b.onclick=()=>cpFromHex(c,true);$('#cpPresets').append(b)});


/* Admin control center */
function selectAdminTab(name){
  $$('[data-admin-tab]').forEach(x=>x.classList.toggle('on',x.dataset.adminTab===name));
  $$('[data-admin-pane]').forEach(p=>p.hidden=p.dataset.adminPane!==name);
}
let adminOverview=null,adminKeys=[],adminUsers=[],adminFaq=[],banTarget='';
const fmtNum=n=>Number(n||0).toLocaleString('de-CH');
const fmtDate=t=>t?new Date(Number(t)).toLocaleString('de-CH',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
function animateStat(el,to){const end=Number(to||0),start=Number(String(el.textContent).replace(/[^0-9]/g,'')||0),t0=performance.now(),dur=560;const step=t=>{const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);el.textContent=fmtNum(Math.round(start+(end-start)*e));if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
function adminStatusPill(text,type=''){const s=document.createElement('span');s.className='statusPill '+type;s.textContent=text;return s}
function userIdentityCell(u){const wrap=document.createElement('div');wrap.className='userCell';const link=document.createElement('a');link.href='/'+encodeURIComponent(u.username||'');link.target='_blank';link.rel='noopener';link.title='Profil öffnen';const img=new Image();img.className='userAvatar';img.src=u.avatar||'/caruzo-logo.png';img.alt='';link.append(img);const n=document.createElement('div');n.className='userName';const b=document.createElement('b');b.textContent=u.displayName||u.username||'User';const sm=document.createElement('small');sm.textContent='@'+(u.username||'user');n.append(b,sm);wrap.append(link,n);return wrap}
function renderAdminOverview(){if(!adminOverview)return;Object.entries(adminOverview.stats||{}).forEach(([k,v])=>{const el=$(`[data-admin-stat="${k}"]`);if(el)animateStat(el,v)});renderSignupChart(adminOverview.signups||[]);const box=$('#recentUsers');box.replaceChildren();(adminOverview.recentUsers||[]).forEach(u=>{const row=document.createElement('div');row.className='recentUser';const img=new Image();img.src=u.avatar||'/caruzo-logo.png';img.alt='';const nm=document.createElement('div');const b=document.createElement('b');b.textContent=u.displayName||u.username;const sm=document.createElement('small');sm.textContent='@'+u.username+' · '+fmtDate(u.createdAt);nm.append(b,sm);const status=u.banned?adminStatusPill('BANNED','bad'):u.premium?adminStatusPill('PREMIUM','good'):adminStatusPill('ACTIVE');row.append(img,nm,status);box.append(row)});if(!box.children.length){const e=document.createElement('div');e.className='adminEmpty';e.textContent='Noch keine User';box.append(e)}window.lucide?.createIcons?.()}
function renderSignupChart(days){const chart=$('#signupChart'),labels=$('#chartLabels');if(!chart||!labels)return;const vals=days.map(x=>Number(x.value||0)),max=Math.max(1,...vals),w=700,h=210,pad=18;const pts=vals.map((v,i)=>{const x=pad+(i*(w-pad*2)/Math.max(1,vals.length-1)),y=h-pad-(v/max)*(h-pad*2);return[x,y]});const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');const area=path+` L ${pts.at(-1)?.[0]||pad} ${h-pad} L ${pts[0]?.[0]||pad} ${h-pad} Z`;chart.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path class="chartArea" d="${area}"/><path class="chartLine" d="${path}"/>${pts.map((p,i)=>`<circle class="chartDot" cx="${p[0]}" cy="${p[1]}" r="3"><title>${days[i]?.label||''}: ${vals[i]}</title></circle>`).join('')}</svg>`;labels.replaceChildren();days.filter((_,i)=>i%2===0).slice(0,7).forEach(d=>{const e=document.createElement('span');e.textContent=d.label;labels.append(e)})}
async function loadAdminOverview(){if(!canAdmin&&!canModerator)return;try{adminOverview=await api('/api/admin/overview');renderAdminOverview()}catch(e){toast(e.message)}}
function keyStatus(k){if(k.revokedAt)return['DEAKTIVIERT','bad'];if(k.redeemedAt)return['EINGELÖST',''];return['GÜLTIG','good']}
function renderAdminKeys(){const body=$('#keysBody');if(!body)return;body.replaceChildren();adminKeys.forEach(k=>{const tr=document.createElement('tr');const c1=document.createElement('td');const code=document.createElement('span');code.className='keyCode';code.textContent=k.key;c1.append(code);const c2=document.createElement('td');c2.textContent=k.label||'Invite';const c3=document.createElement('td');const [st,cl]=keyStatus(k);c3.append(adminStatusPill(st,cl));const c4=document.createElement('td');c4.textContent=k.redeemedUsername?`${k.redeemedUsername} · ${k.redeemedBy}`:'—';const c5=document.createElement('td');c5.textContent=fmtDate(k.createdAt);const c6=document.createElement('td');c6.className='keyActions';const copy=document.createElement('button');copy.className='miniBtn';copy.textContent='Copy';copy.onclick=async()=>{try{await navigator.clipboard.writeText(k.key);toast('Key kopiert')}catch{toast('Kopieren nicht möglich')}};c6.append(copy);if(canAdmin){const rep=document.createElement('button');rep.className='miniBtn';rep.textContent='Ersetzen';rep.onclick=()=>replaceAdminKey(k.id);c6.append(rep);if(!k.redeemedAt){const rev=document.createElement('button');rev.className='miniBtn '+(k.revokedAt?'good':'danger');rev.textContent=k.revokedAt?'Aktivieren':'Sperren';rev.onclick=()=>toggleAdminKey(k.id);c6.append(rev)}}tr.append(c1,c2,c3,c4,c5,c6);body.append(tr)});if(!body.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.className='adminEmpty';td.textContent='Noch keine Invite Keys erstellt.';tr.append(td);body.append(tr)}}
async function loadAdminKeys(){if(!canAdmin&&!canModerator)return;try{const r=await api('/api/admin/keys');adminKeys=r.keys||[];renderAdminKeys()}catch(e){toast(e.message)}}
async function createAdminKey(){try{const r=await api('/api/admin/keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:$('#inviteLabel').value.trim()})});$('#inviteLabel').value='';await navigator.clipboard?.writeText?.(r.key.key).catch?.(()=>{});toast('Invite Key erstellt');await Promise.all([loadAdminKeys(),loadAdminOverview()])}catch(e){toast(e.message)}}
async function toggleAdminKey(id){try{await api(`/api/admin/keys/${encodeURIComponent(id)}/revoke`,{method:'POST'});await Promise.all([loadAdminKeys(),loadAdminOverview()]);toast('Key Status aktualisiert')}catch(e){toast(e.message)}}
async function replaceAdminKey(id){try{const r=await api(`/api/admin/keys/${encodeURIComponent(id)}/replace`,{method:'POST'});try{await navigator.clipboard.writeText(r.key.key)}catch{}toast('Key ersetzt · neuer Key kopiert');await Promise.all([loadAdminKeys(),loadAdminOverview()])}catch(e){toast(e.message)}}
function renderAdminUsers(){const body=$('#usersBody');if(!body)return;body.replaceChildren();adminUsers.forEach(u=>{const tr=document.createElement('tr');const c1=document.createElement('td');c1.append(userIdentityCell(u));const c2=document.createElement('td');const id=document.createElement('span');id.className='keyCode';id.textContent=u.id;c2.append(id);const c3=document.createElement('td');c3.textContent=fmtNum(u.views);const c4=document.createElement('td');c4.append(adminStatusPill(u.premium?'PREMIUM':'FREE',u.premium?'good':''));const c5=document.createElement('td');c5.append(adminStatusPill(u.admin?'ADMIN':u.moderator?'MODERATOR':'USER',u.admin||u.moderator?'good':''));const c6=document.createElement('td');c6.append(adminStatusPill(u.banned?'BANNED':'ACTIVE',u.banned?'bad':'good'));const c7=document.createElement('td');c7.textContent=fmtDate(u.createdAt);const c8=document.createElement('td');c8.className='userActions';
  const open=document.createElement('a');open.className='miniBtn';open.href='/'+encodeURIComponent(u.username||'');open.target='_blank';open.rel='noopener';open.title='Profil öffnen';open.setAttribute('aria-label','Profil öffnen');open.innerHTML='↗';c8.append(open);
  const locked=!canAdmin;
  if(!u.admin){const mod=document.createElement('button');mod.className='miniBtn '+(u.moderator?'danger':'good')+(locked?' disabled':'');mod.textContent=u.moderator?'Moderator entfernen':'Moderator geben';mod.disabled=locked;if(!locked)mod.onclick=()=>setAdminModerator(u.id,!u.moderator);c8.append(mod)}
  const prem=document.createElement('button');prem.className='miniBtn '+(u.premium?'danger':'good')+(locked?' disabled':'');prem.textContent=u.premium?'Premium entfernen':'Premium geben';prem.disabled=locked;if(!locked)prem.onclick=()=>setAdminPremium(u.id,!u.premium);c8.append(prem);
  if(!u.admin){const ban=document.createElement('button');ban.className='miniBtn '+(u.banned?'good':'danger')+(locked?' disabled':'');ban.textContent=u.banned?'Entbannen':'Bannen';ban.disabled=locked;if(!locked)ban.onclick=()=>u.banned?unbanAdminUser(u.id):openBanModal(u);c8.append(ban)}tr.append(c1,c2,c3,c4,c5,c6,c7,c8);body.append(tr)});if(!body.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=8;td.className='adminEmpty';td.textContent='Keine User gefunden.';tr.append(td);body.append(tr)}}
async function loadAdminUsers(){if(!canAdmin&&!canModerator)return;try{const q=$('#adminUserSearch')?.value?.trim()||'';const r=await api('/api/admin/users'+(q?'?q='+encodeURIComponent(q):''));adminUsers=r.users||[];renderAdminUsers()}catch(e){toast(e.message)}}
async function setAdminPremium(id,enabled){try{await api(`/api/admin/users/${encodeURIComponent(id)}/premium`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})});if(String(id)===String(me?.id)){isPremium=!!enabled;me.platform??={};me.platform.premium=!!enabled;applyPremiumAccess();applyStatisticsAccess();renderBadges();renderPreview()}toast(enabled?'Premium aktiviert':'Premium entfernt');await Promise.all([loadAdminUsers(),loadAdminOverview()])}catch(e){toast(e.message)}}
async function setAdminModerator(id,enabled){try{await api(`/api/admin/users/${encodeURIComponent(id)}/moderator`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})});toast(enabled?'Moderator aktiviert':'Moderator entfernt');await Promise.all([loadAdminUsers(),loadAdminOverview()])}catch(e){toast(e.message)}}
function openBanModal(u){banTarget=u.id;$('#banModalUser').textContent=`${u.displayName||u.username} · ${u.id}`;$('#banReason').value='';$('#banModal').hidden=false;setTimeout(()=>$('#banReason').focus(),20)}
function closeBanModal(){banTarget='';$('#banModal').hidden=true}
async function confirmBan(){if(!banTarget)return;try{await api(`/api/admin/users/${encodeURIComponent(banTarget)}/ban`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:$('#banReason').value.trim()})});closeBanModal();toast('User wurde gebannt');await Promise.all([loadAdminUsers(),loadAdminOverview()])}catch(e){toast(e.message)}}
async function unbanAdminUser(id){try{await api(`/api/admin/users/${encodeURIComponent(id)}/unban`,{method:'POST'});toast('User wurde entbannt');await Promise.all([loadAdminUsers(),loadAdminOverview()])}catch(e){toast(e.message)}}
let editingFaqId='',editingChangelogId='';
const FAQ_COLORS=['#38bdf8','#a78bfa','#34d399','#fb7185','#f59e0b','#22d3ee'];
function resetFaqComposer(){editingFaqId='';if($('#faqQuestion'))$('#faqQuestion').value='';if($('#faqAnswer'))$('#faqAnswer').value='';if($('#faqComposerTitle'))$('#faqComposerTitle').textContent='Neue FAQ-Frage';if($('#saveFaq'))$('#saveFaq').innerHTML='<i data-lucide="plus"></i>FAQ hinzufügen';if($('#cancelFaqEdit'))$('#cancelFaqEdit').hidden=true;window.lucide?.createIcons?.()}
function editFaq(item){if(!canAdmin)return;editingFaqId=item.id;$('#faqQuestion').value=item.question||'';$('#faqAnswer').value=item.answer||'';$('#faqComposerTitle').textContent='FAQ bearbeiten';$('#saveFaq').innerHTML='<i data-lucide="save"></i>Änderungen speichern';$('#cancelFaqEdit').hidden=false;$('#faqQuestion').focus();window.lucide?.createIcons?.()}
async function moveFaq(index,dir){if(!canAdmin)return;const to=index+dir;if(to<0||to>=adminFaq.length)return;const next=[...adminFaq];[next[index],next[to]]=[next[to],next[index]];try{const r=await api('/api/admin/faq/reorder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:next.map(x=>x.id)})});adminFaq=r.items||next;renderAdminFaq()}catch(e){toast(e.message)}}
function renderAdminFaq(){const box=$('#faqAdminList');if(!box)return;box.replaceChildren();adminFaq.forEach((x,i)=>{const row=document.createElement('div');row.className='faqAdminItem';row.style.setProperty('--faq',FAQ_COLORS[i%FAQ_COLORS.length]);const ico=document.createElement('span');ico.className='faqAdminIcon';ico.textContent=String(i+1).padStart(2,'0');const copy=document.createElement('div');const h=document.createElement('h4');h.textContent=x.question||'Frage';const p=document.createElement('p');p.textContent=x.answer||'';const meta=document.createElement('div');meta.className='faqAdminMeta';meta.textContent=`${x.published!==false?'PUBLIC':'HIDDEN'} · aktualisiert ${fmtDate(x.updatedAt||x.createdAt)}`;copy.append(h,p,meta);const actions=document.createElement('div');actions.className='changeActions';if(canAdmin){const up=document.createElement('button');up.className='miniBtn';up.textContent='↑';up.title='Nach oben';up.disabled=i===0;up.onclick=()=>moveFaq(i,-1);const down=document.createElement('button');down.className='miniBtn';down.textContent='↓';down.title='Nach unten';down.disabled=i===adminFaq.length-1;down.onclick=()=>moveFaq(i,1);const edit=document.createElement('button');edit.className='miniBtn';edit.textContent='Bearbeiten';edit.onclick=()=>editFaq(x);const toggle=document.createElement('button');toggle.className='miniBtn';toggle.textContent=x.published!==false?'Ausblenden':'Veröffentlichen';toggle.onclick=()=>toggleFaq(x);const del=document.createElement('button');del.className='miniBtn danger';del.textContent='Löschen';del.onclick=()=>deleteFaq(x.id);actions.append(up,down,edit,toggle,del)}else{actions.append(adminStatusPill(x.published!==false?'PUBLIC':'HIDDEN',x.published!==false?'good':''))}row.append(ico,copy,actions);box.append(row)});if(!box.children.length){const e=document.createElement('div');e.className='adminEmpty';e.textContent='Noch keine FAQ-Einträge.';box.append(e)}}
async function loadAdminFaq(){if(!canAdmin&&!canModerator)return;try{const r=await api('/api/admin/faq');adminFaq=r.items||[];renderAdminFaq();if($('#faqComposer'))$('#faqComposer').hidden=!canAdmin;if($('#faqReadOnly'))$('#faqReadOnly').hidden=canAdmin;if($('#faqRolePill')){$('#faqRolePill').textContent=canAdmin?'ADMIN EDIT':'MODERATOR READ';$('#faqRolePill').className='statusPill '+(canAdmin?'good':'')} }catch(e){toast(e.message)}}
async function saveFaq(){if(!canAdmin)return;const body={question:$('#faqQuestion').value.trim(),answer:$('#faqAnswer').value.trim()};try{if(editingFaqId)await api('/api/admin/faq/'+encodeURIComponent(editingFaqId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});else await api('/api/admin/faq',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});toast(editingFaqId?'FAQ aktualisiert':'FAQ hinzugefügt');resetFaqComposer();loadAdminFaq()}catch(e){toast(e.message)}}
async function toggleFaq(item){if(!canAdmin)return;try{await api('/api/admin/faq/'+encodeURIComponent(item.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({published:item.published===false})});loadAdminFaq()}catch(e){toast(e.message)}}
async function deleteFaq(id){if(!canAdmin||!confirm('FAQ-Eintrag wirklich löschen?'))return;try{await api('/api/admin/faq/'+encodeURIComponent(id),{method:'DELETE'});if(editingFaqId===id)resetFaqComposer();loadAdminFaq()}catch(e){toast(e.message)}}
let adminChangelog=[];
function resetChangelogComposer(){editingChangelogId='';$('#changelogType').value='update';$('#changelogVersion').value='';$('#changelogTitle').value='';$('#changelogBody').value='';$('#createChangelog').innerHTML='<i data-lucide="plus"></i>Eintrag veröffentlichen';$('#cancelChangelogEdit').hidden=true;window.lucide?.createIcons?.()}
function editChangelog(x){editingChangelogId=x.id;$('#changelogType').value=x.type||'update';$('#changelogVersion').value=x.version||'';$('#changelogTitle').value=x.title||'';$('#changelogBody').value=x.body||'';$('#createChangelog').innerHTML='<i data-lucide="save"></i>Änderungen speichern';$('#cancelChangelogEdit').hidden=false;$('#changelogTitle').focus();window.lucide?.createIcons?.()}
function renderAdminChangelog(){const box=$('#changelogAdminList');if(!box)return;box.replaceChildren();const types={update:['refresh-cw','#a78bfa'],new:['sparkles','#34d399'],fix:['wrench','#fb923c'],maintenance:['shield-check','#38bdf8']};adminChangelog.forEach(x=>{const row=document.createElement('div');row.className='changelogAdminItem';const tm=types[x.type]||types.update;row.style.setProperty('--change',tm[1]);const type=document.createElement('span');type.className='changeType';type.innerHTML=`<i data-lucide="${tm[0]}"></i>`;const copy=document.createElement('div');const h=document.createElement('h4');h.textContent=(x.version?x.version+' · ':'')+(x.title||'Update');const p=document.createElement('p');p.textContent=x.body||'';const meta=document.createElement('div');meta.className='changeMeta';meta.textContent=`${String(x.type||'update').toUpperCase()} · ${fmtDate(x.updatedAt||x.createdAt)} · ${x.published!==false?'PUBLIC':'HIDDEN'}`;copy.append(h,p,meta);const actions=document.createElement('div');actions.className='changeActions';const edit=document.createElement('button');edit.className='miniBtn';edit.textContent='Bearbeiten';edit.onclick=()=>editChangelog(x);const toggle=document.createElement('button');toggle.className='miniBtn';toggle.textContent=x.published!==false?'Ausblenden':'Veröffentlichen';toggle.onclick=()=>toggleChangelog(x.id);const del=document.createElement('button');del.className='miniBtn danger';del.textContent='Löschen';del.onclick=()=>deleteChangelog(x.id);actions.append(edit,toggle,del);row.append(type,copy,actions);box.append(row)});window.lucide?.createIcons?.();if(!box.children.length){const e=document.createElement('div');e.className='premiumEmpty';e.textContent='Noch keine Changelog-Einträge.';box.append(e)}}
async function loadAdminChangelog(){if(!canAdmin)return;try{const r=await api('/api/admin/changelog');adminChangelog=r.items||[];renderAdminChangelog()}catch(e){toast(e.message)}}
async function createChangelog(){const payload={type:$('#changelogType').value,version:$('#changelogVersion').value.trim(),title:$('#changelogTitle').value.trim(),body:$('#changelogBody').value.trim()};try{if(editingChangelogId)await api('/api/admin/changelog/'+encodeURIComponent(editingChangelogId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});else await api('/api/admin/changelog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});toast(editingChangelogId?'Changelog aktualisiert':'Changelog veröffentlicht');resetChangelogComposer();loadAdminChangelog()}catch(e){toast(e.message)}}
async function toggleChangelog(id){try{await api(`/api/admin/changelog/${encodeURIComponent(id)}/toggle`,{method:'POST'});loadAdminChangelog()}catch(e){toast(e.message)}}
async function deleteChangelog(id){if(!confirm('Changelog-Eintrag wirklich löschen?'))return;try{await api(`/api/admin/changelog/${encodeURIComponent(id)}`,{method:'DELETE'});if(editingChangelogId===id)resetChangelogComposer();loadAdminChangelog()}catch(e){toast(e.message)}}
$$('[data-admin-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.adminOnly&&!canAdmin)return;selectAdminTab(b.dataset.adminTab);if(b.dataset.adminTab==='keys')loadAdminKeys();if(b.dataset.adminTab==='users')loadAdminUsers();if(b.dataset.adminTab==='overview')loadAdminOverview();if(b.dataset.adminTab==='faq')loadAdminFaq();if(b.dataset.adminTab==='changelog'&&canAdmin)loadAdminChangelog();if(b.dataset.adminTab==='backgrounds')loadBgAdmin()});
/* Hintergründe (nur Admin darf ändern) */
const BG_PAGES=[['landing','Hauptseite','Öffentliche Startseite'],['dashboard','Dashboard','Editor & Admin Panel'],['login','Login','Invite- & Login-Seite']];
let bgState={landing:'none',dashboard:'none',login:'none'};
let landingModulesState={latestProfiles:true,premiumCount:true,marketplaceCount:true};
let scrollState={landing:'fade-rise'};
let cursorState='none';
let page404State='1';
const PAGE404_DESIGNS=[
  ['1','Emerald Grid','Grün · technisch · klassisch','#00e676','#7c3aed'],
  ['2','Violet Void','Violett · soft glow','#8b5cf6','#ec4899'],
  ['3','Cyan Terminal','Cyan · terminal clean','#22d3ee','#3b82f6'],
  ['4','Rose Glitch','Pink · digital','#ff2e93','#8b5cf6'],
  ['5','Amber Signal','Amber · warm','#f59e0b','#ef4444'],
  ['6','Monochrome','Schwarzweiß · minimal','#f4f4f5','#71717a'],
  ['7','Deep Ocean','Blau · teal','#38bdf8','#14b8a6'],
  ['8','Glass Pearl','Transparent · premium','#d8b4fe','#f9a8d4']
];
const SCROLL_ANIMATIONS=[
  ['none','Keine','Keine zusätzliche Reveal-Animation'],
  ['fade-rise','Fade Rise','Sanftes Einblenden von unten'],
  ['slide-sides','Slide Sides','Abschnitte kommen abwechselnd von links und rechts'],
  ['scale-soft','Scale Soft','Leichtes Zoom-In beim Erscheinen'],
  ['blur-focus','Blur Focus','Von weich/unscharf zu klar'],
  ['stagger-cards','Stagger Cards','Karten erscheinen nacheinander'],
  ['depth-flip','Depth Flip','Sanfter 3D-Kipp-Effekt beim Auftauchen'],
  ['clip-reveal','Clip Reveal','Bereiche werden wie eine Maske aufgezogen'],
  ['glide-skew','Glide Skew','Seitliches Gleiten mit dezenter Neigung']
];
const LANDING_CURSORS=[
  ['none','Standard','Browser-Cursor','↖'],
  ['neon-dot','Neon Dot','Kleiner leuchtender Punkt','●'],
  ['halo-ring','Halo Ring','Cleaner Ring mit Mittelpunkt','◎'],
  ['precision','Precision','Feines Fadenkreuz','＋'],
  ['diamond','Diamond','Minimaler Diamant','◇'],
  ['spark','Spark','Kleine Glanzspitze','✦'],
  ['pixel','Pixel','Retro Pixel-Pointer','▰'],
  ['orbit','Orbit','Ring mit Orbitpunkt','◉'],
  ['minimal-arrow','Minimal Arrow','Schlanker Caruzo-Pfeil','➤']
];
function bgCard(page,id){const P=window.CaruzoBG?.presets?.[page]?.[id];const b=document.createElement('button');b.type='button';b.className='bgCard'+(bgState[page]===String(id)?' on':'');const sw=document.createElement('span');sw.className='bgSwatch';if(P){const grad=`radial-gradient(circle at 28% 30%,${P.c[0]}cc 0,transparent 52%),radial-gradient(circle at 76% 72%,${P.c[1]} 0,transparent 58%),${P.c[2]}`;const hasThumb=page!=='login'&&Number(id)<=10;sw.style.background=hasThumb?`url(/bg-thumbs/${page}-${id}.jpg) center/cover no-repeat,${grad}`:grad}else sw.classList.add('none');const n=document.createElement('b');n.textContent=P?P.name:'Kein Hintergrund';const m=document.createElement('small');m.textContent=P?CaruzoBG.modeLabel[P.mode]:'Standard-Look';b.append(sw,n,m);b.disabled=!canAdmin;b.onclick=()=>setBg(page,String(id));return b}
function renderBgAdmin(){const box=$('#bgAdminBox');if(!box)return;box.replaceChildren();BG_PAGES.forEach(([page,title,sub])=>{const sec=document.createElement('div');sec.className='section';const h=document.createElement('div');h.className='sectionTitle';const h3=document.createElement('h3');h3.textContent=title;const sp=document.createElement('span');sp.className='miniHint';sp.textContent=sub;h.append(h3,sp);const grid=document.createElement('div');grid.className='bgGrid';const ids=page==='login'?['none',1,2,3,4,5,6,7,8]:['none',1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];ids.forEach(id=>grid.append(bgCard(page,id)));sec.append(h,grid);box.append(sec)})}
function render404Admin(){
  const box=$('#page404AdminBox');if(!box)return;box.replaceChildren();
  const sec=document.createElement('div');sec.className='section';
  const h=document.createElement('div');h.className='sectionTitle';h.innerHTML='<h3>404 Seite</h3><span class="miniHint">8 Designs</span>';sec.append(h);
  const p=document.createElement('p');p.className='desc';p.textContent='Wähle das globale Design der Caruzo-404-Seite.';sec.append(p);
  const grid=document.createElement('div');grid.className='bgGrid';
  PAGE404_DESIGNS.forEach(([id,name,desc,a,b])=>{const btn=document.createElement('button');btn.type='button';btn.className='bgCard'+(page404State===id?' on':'');const sw=document.createElement('span');sw.className='bgSwatch';sw.style.background=`radial-gradient(circle at 25% 25%,${a}bb,transparent 42%),radial-gradient(circle at 78% 70%,${b}99,transparent 48%),#07080b`;const n=document.createElement('b');n.textContent=name;const m=document.createElement('small');m.textContent=desc;btn.append(sw,n,m);btn.disabled=!canAdmin;btn.onclick=()=>set404Design(id);grid.append(btn)});
  sec.append(grid);box.append(sec);
}
function renderScrollAdmin(){
  const box=$('#scrollAdminBox');if(!box)return;box.hidden=!canAdmin;if(!canAdmin)return;box.replaceChildren();
  const sec=document.createElement('div');sec.className='section';
  const h=document.createElement('div');h.className='sectionTitle';h.innerHTML='<h3>Hauptseite · Scroll Animation</h3><span class="miniHint">nur Admin</span>';sec.append(h);
  const p=document.createElement('p');p.className='desc';p.textContent='Wähle, wie Bereiche der Hauptseite beim Herunterscrollen eingeblendet werden.';sec.append(p);
  const grid=document.createElement('div');grid.className='bgGrid';
  SCROLL_ANIMATIONS.forEach(([id,name,desc])=>{const b=document.createElement('button');b.type='button';b.className='bgCard'+(scrollState.landing===id?' on':'');const sw=document.createElement('span');sw.className='bgSwatch';sw.style.background=id==='none'?'linear-gradient(135deg,#111,#09090d)':id==='fade-rise'?'linear-gradient(180deg,#17151f,#8b5cf6)':id==='slide-sides'?'linear-gradient(90deg,#8b5cf6,#0e0e14 46%,#ff5ba8)':id==='scale-soft'?'radial-gradient(circle,#b79cff,#111 62%)':id==='blur-focus'?'linear-gradient(135deg,#d9d9ff55,#171720)': 'linear-gradient(135deg,#8b5cf6 0 33%,#1a1a20 33% 66%,#ff5ba8 66%)';const n=document.createElement('b');n.textContent=name;const m=document.createElement('small');m.textContent=desc;b.append(sw,n,m);b.onclick=()=>setScrollAnimation(id);grid.append(b)});
  sec.append(grid);box.append(sec);
}
function renderCursorAdmin(){
  const box=$('#cursorAdminBox');if(!box)return;box.hidden=!canAdmin;if(!canAdmin)return;box.replaceChildren();
  const sec=document.createElement('div');sec.className='section';
  const h=document.createElement('div');h.className='sectionTitle';h.innerHTML='<h3>Hauptseite · Custom Cursor</h3><span class="miniHint">8 Presets · nur Admin</span>';sec.append(h);
  const p=document.createElement('p');p.className='desc';p.textContent='Wähle den Cursor, der auf der öffentlichen Hauptseite für alle Besucher verwendet wird.';sec.append(p);
  const grid=document.createElement('div');grid.className='bgGrid';
  LANDING_CURSORS.forEach(([id,name,desc,symbol])=>{const b=document.createElement('button');b.type='button';b.className='bgCard'+(cursorState===id?' on':'');const sw=document.createElement('span');sw.className='bgSwatch';sw.style.cssText='display:grid;place-items:center;font-size:28px;font-weight:800;background:radial-gradient(circle at 50% 45%,rgba(139,92,246,.22),transparent 50%),linear-gradient(135deg,#0d0d12,#16131e)';sw.textContent=symbol;const n=document.createElement('b');n.textContent=name;const m=document.createElement('small');m.textContent=desc;b.append(sw,n,m);b.onclick=()=>setLandingCursor(id);grid.append(b)});
  sec.append(grid);box.append(sec);
}
function renderLandingModulesAdmin(){const box=$('#landingModulesAdminBox');if(!box)return;box.replaceChildren();const sec=document.createElement('div');sec.className='section';const h=document.createElement('div');h.className='sectionTitle';h.innerHTML='<h3>Hauptseite · Community Module</h3><span class="miniHint">Admin steuerbar</span>';sec.append(h);const p=document.createElement('p');p.className='desc';p.textContent='Schalte zuletzt erstellte Profile, Premium Count und Marketplace Count unabhängig voneinander ein oder aus.';sec.append(p);const grid=document.createElement('div');grid.className='landingModuleAdmin';[['latestProfiles','Zuletzt erstellte Profile','Zeigt die neuesten öffentlichen Caruzo-Profile direkt anklickbar auf der Hauptseite'],['premiumCount','Premium Count','Anzahl aktiver Premium-Profile'],['marketplaceCount','Marketplace Count','Anzahl öffentlicher Marketplace-Presets']].forEach(([key,title,desc])=>{const row=document.createElement('div');row.className='landingModuleToggle'+(!canAdmin?' disabled':'');const copy=document.createElement('div');const b=document.createElement('b');b.textContent=title;const sm=document.createElement('small');sm.textContent=desc;copy.append(b,sm);const lab=document.createElement('label');lab.className='switch';const input=document.createElement('input');input.type='checkbox';input.checked=landingModulesState[key]!==false;input.disabled=!canAdmin;const i=document.createElement('i');lab.append(input,i);input.onchange=()=>setLandingModule(key,input.checked);row.append(copy,lab);grid.append(row)});sec.append(grid);box.append(sec)}
async function loadBgAdmin(){try{const r=await api('/api/site-settings');bgState={...bgState,...(r.backgrounds||{})};scrollState={...scrollState,...(r.scrollAnimations||{})};cursorState=r.landingCursor||'none';page404State=String(r.page404Design||'1');landingModulesState={...landingModulesState,...(r.landingModules||{})}}catch{}renderBgAdmin();render404Admin();renderScrollAdmin();renderCursorAdmin();renderLandingModulesAdmin()}
async function setBg(page,id){if(!canAdmin)return;try{const r=await api('/api/admin/backgrounds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page,preset:id})});bgState={...bgState,...r.backgrounds};renderBgAdmin();if(page==='dashboard')CaruzoBG.apply('dashboard',id);toast(page==='landing'?'Hauptseite gespeichert':page==='dashboard'?'Dashboard gespeichert':'Login gespeichert')}catch(e){toast(e.message)}}
async function set404Design(id){if(!canAdmin)return;try{const r=await api('/api/admin/404-design',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design:id})});page404State=String(r.page404Design||id);render404Admin();toast('404-Design gespeichert')}catch(e){toast(e.message)}}
async function setScrollAnimation(id){if(!canAdmin)return;try{const r=await api('/api/admin/scroll-animation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:'landing',animation:id})});scrollState={...scrollState,...(r.scrollAnimations||{})};renderScrollAdmin();toast('Scroll Animation gespeichert')}catch(e){toast(e.message)}}
async function setLandingCursor(id){if(!canAdmin)return;try{const r=await api('/api/admin/landing-cursor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cursor:id})});cursorState=r.landingCursor||id;renderCursorAdmin();toast('Hauptseiten-Cursor gespeichert')}catch(e){toast(e.message)}}
async function setLandingModule(key,enabled){if(!canAdmin)return;try{const r=await api('/api/admin/landing-modules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,enabled})});landingModulesState={...landingModulesState,...(r.landingModules||{})};renderLandingModulesAdmin();toast('Hauptseiten-Modul gespeichert')}catch(e){toast(e.message);loadBgAdmin()}}
function initBgAdmin(){const note=$('#bgModNote');if(note)note.hidden=canAdmin;const scrollBox=$('#scrollAdminBox');if(scrollBox)scrollBox.hidden=!canAdmin;const cursorBox=$('#cursorAdminBox');if(cursorBox)cursorBox.hidden=!canAdmin;loadBgAdmin()}
$('#adminRefresh').onclick=()=>Promise.all(canAdmin?[loadAdminOverview(),loadAdminKeys(),loadAdminUsers(),loadAdminChangelog()]:[loadAdminOverview(),loadAdminKeys(),loadAdminUsers()]).then(()=>toast('Panel aktualisiert'));
$('#createInviteKey').onclick=createAdminKey;$('#createChangelog').onclick=createChangelog;if($('#cancelChangelogEdit'))$('#cancelChangelogEdit').onclick=resetChangelogComposer;if($('#saveFaq'))$('#saveFaq').onclick=saveFaq;if($('#cancelFaqEdit'))$('#cancelFaqEdit').onclick=resetFaqComposer;$('#adminUserSearchBtn').onclick=loadAdminUsers;$('#adminUserSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadAdminUsers()}});$('#banCancel').onclick=closeBanModal;$('#banConfirm').onclick=confirmBan;$('#banModal').addEventListener('click',e=>{if(e.target===$('#banModal'))closeBanModal()});

async function save(){try{me=await api('/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(me)});defaults();bind();markDirty(false);toast('Gespeichert');if(current==='reactions')loadReactionStats()}catch(e){toast(e.message)}}
$$('.saveBtn').forEach(b=>b.onclick=save);
$('#saveAll').onclick=save;

async function persistCurrentForPreset(){
  if(!dirty)return;
  me=await api('/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(me)});
  defaults();bind();markDirty(false);
}
function marketDate(ts){try{return new Date(Number(ts)||Date.now()).toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit',year:'2-digit'})}catch{return ''}}
function marketCard(item){
  const c=document.createElement('article');c.className='marketCard';
  const a=item.preview?.accentColor||'#8b5cf6',b=item.preview?.secondaryColor||'#ff2e93';
  c.style.setProperty('--mc-a',a);c.style.setProperty('--mc-b',b);
  const sw=document.createElement('div');sw.className='marketSwatch';
  const bgUrl=String(item.preview?.backgroundUrl||'');
  const bgType=String(item.preview?.backgroundType||'image');
  const yt=extractYouTubeId(bgUrl);
  if(bgUrl){
    if(yt){
      sw.style.backgroundImage=`linear-gradient(rgba(4,4,8,.18),rgba(4,4,8,.42)),url("https://i.ytimg.com/vi/${encodeURIComponent(yt)}/hqdefault.jpg")`;
      sw.style.backgroundSize='cover';sw.style.backgroundPosition='center';
    }else if(bgType==='video'){
      const vid=document.createElement('video');vid.className='marketBgMedia';vid.src=bgUrl;vid.muted=true;vid.loop=true;vid.autoplay=true;vid.playsInline=true;vid.preload='metadata';sw.append(vid);
    }else{
      sw.style.backgroundImage=`linear-gradient(rgba(4,4,8,.12),rgba(4,4,8,.36)),url("${bgUrl.replace(/"/g,'%22')}")`;
      sw.style.backgroundSize='cover';sw.style.backgroundPosition='center';
    }
  }
  const badges=document.createElement('div');badges.className='marketBadges';
  const vis=document.createElement('span');vis.className='marketPill '+(item.visibility==='public'?'public':'private');vis.textContent=item.visibility==='public'?'PUBLIC':'PRIVATE';
  const scope=document.createElement('span');scope.className='marketPill';scope.textContent=item.scope==='full'?'FULL PROFILE':item.scope==='template'?'TEMPLATE':'STYLE ONLY';badges.append(vis,scope);
  const fav=document.createElement('div');fav.className='marketFav';fav.textContent='★';
  const preview=document.createElement('div');preview.className='marketPreviewCard';
  const head=document.createElement('div');head.className='marketPreviewHead';
  const av=document.createElement('div');av.className='marketAvatar';
  const avatarSrc=item.preview?.avatar||item.author?.avatar||'';
  if(avatarSrc){const img=new Image();img.src=avatarSrc;img.alt='';av.append(img)}
  const metaWrap=document.createElement('div');metaWrap.className='marketPreviewMeta';
  const pb=document.createElement('b');pb.textContent=item.name||'Preset';
  const ps=document.createElement('small');ps.textContent='@'+(item.preview?.username||item.author?.username||'caruzo');
  metaWrap.append(pb,ps); head.append(av,metaWrap);
  const chips=document.createElement('div');chips.className='marketPreviewChips';
  [item.preview?.cardStyle||'glass', item.preview?.pageFx||'fx', item.preview?.socialEffect||'social'].slice(0,3).forEach(t=>{const s=document.createElement('span');s.textContent=String(t);chips.append(s)});
  preview.append(head,chips); sw.append(badges,fav,preview);
  const body=document.createElement('div');body.className='marketBody';
  const h=document.createElement('h3');h.textContent=item.name||'Untitled preset';
  const p=document.createElement('p');p.textContent=item.description||'Community-Vorlage für Caruzo – direkt laden oder als eigene Version speichern.';
  body.append(h,p);
  if(item.author){
    const author=document.createElement('div');author.className='marketAuthor';
    author.innerHTML=`${item.author.avatar?`<img src="${escapeHtml(item.author.avatar)}" alt="">`:''}<span>von <b style="color:#fff">${escapeHtml(item.author.username||'Unbekannt')}</b></span>`;
    body.append(author);
  }
  const stats=document.createElement('div');stats.className='marketStats';
  const views=Number(item.savedCount||0)+Number(item.loadCount||0);
  stats.innerHTML=`<div class="marketStat"><b>Nutzungen</b><span>${views.toLocaleString('de-CH')}</span></div><div class="marketStat"><b>Im</b><span>Trend</span></div><div class="marketStat"><b>★</b><span>${Number(item.savedCount||0).toLocaleString('de-CH')}</span></div>`;
  body.append(stats);
  const tags=document.createElement('div');tags.className='marketMeta';
  [item.preview?.backgroundType||'style', item.preview?.cardStyle||'glass', item.preview?.pageFx||'effects', item.author?.username||'caruzo'].slice(0,4).forEach(x=>{const s=document.createElement('span');s.textContent=String(x);tags.append(s)});
  body.append(tags);
  const actions=document.createElement('div');actions.className='marketActions';
  const apply=document.createElement('button');apply.type='button';apply.className='miniBtn good';apply.textContent='Vorlage verwenden';apply.onclick=()=>applyMarketplacePreset(item.id);
  actions.append(apply);
  if(item.visibility==='public'&&!item.mine){
    const keep=document.createElement('button');keep.type='button';keep.className='miniBtn';keep.textContent='Speichern';keep.onclick=()=>saveMarketplacePreset(item.id);actions.append(keep);
  }
  if(item.mine){
    const update=document.createElement('button');update.type='button';update.className='miniBtn';update.textContent='Aktualisieren';update.onclick=()=>updateMarketplacePreset(item.id);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='miniBtn';toggle.textContent=item.visibility==='public'?'Privat machen':'Public machen';toggle.onclick=()=>toggleMarketplacePreset(item);
    const del=document.createElement('button');del.type='button';del.className='miniBtn marketDanger';del.textContent='Löschen';del.onclick=()=>deleteMarketplacePreset(item.id);
    actions.append(update,toggle,del);
  }
  body.append(actions);c.append(sw,body);return c;
}
async function loadMarketplace(){
  const box=$('#marketGrid');if(!box)return;
  box.innerHTML='<div class="marketEmpty">Marketplace wird geladen …</div>';
  try{
    const q=new URLSearchParams({scope:marketScope});if(marketQuery)q.set('q',marketQuery);
    const r=await api('/api/marketplace?'+q.toString());
    box.replaceChildren();
    if(!r.items?.length){const e=document.createElement('div');e.className='marketEmpty';e.textContent=marketScope==='public'?'Noch keine öffentlichen Presets gefunden.':'Du hast noch keine eigenen Presets gespeichert.';box.append(e);return}
    r.items.forEach(x=>box.append(marketCard(x)));window.lucide?.createIcons?.();
  }catch(e){box.innerHTML=`<div class="marketEmpty">${escapeHtml(e.message)}</div>`}
}
async function createMarketplacePreset(){
  const name=$('#marketName').value.trim(),description=$('#marketDescription').value.trim();
  const visibility=document.querySelector('input[name="marketVisibility"]:checked')?.value||'private';
  if(name.length<2)return toast('Preset-Name fehlt');
  try{
    await persistCurrentForPreset();
    await api('/api/marketplace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,description,visibility})});
    $('#marketName').value='';$('#marketDescription').value='';marketScope='mine';$$('[data-market-scope]').forEach(b=>b.classList.toggle('on',b.dataset.marketScope==='mine'));$('#marketScopeNote').textContent='Meine Presets: Private können dein komplettes editierbares Profil enthalten. Public Presets übernehmen das komplette sichere Layout inklusive Hintergrund, Player, Module und Social-Platzhalter. Persönliche Accounts und Discord-Daten bleiben entfernt.';toast('Preset gespeichert');loadMarketplace();
  }catch(e){toast(e.message)}
}
async function applyMarketplacePreset(id){
  try{
    if(dirty&&!confirm('Ungespeicherte Änderungen werden durch das Preset überschrieben. Trotzdem laden?'))return;
    const r=await api('/api/marketplace/'+encodeURIComponent(id)+'/apply',{method:'POST'});
    me=r.user;defaults();bind();markDirty(false);toast('Preset geladen');
  }catch(e){toast(e.message)}
}
async function saveMarketplacePreset(id){
  try{await api('/api/marketplace/'+encodeURIComponent(id)+'/save',{method:'POST'});toast('In Meine Presets gespeichert');loadMarketplace()}catch(e){toast(e.message)}
}
async function updateMarketplacePreset(id){
  try{await persistCurrentForPreset();await api('/api/marketplace/'+encodeURIComponent(id)+'/update-from-profile',{method:'POST'});toast('Preset aktualisiert');loadMarketplace()}catch(e){toast(e.message)}
}
async function toggleMarketplacePreset(item){
  const visibility=item.visibility==='public'?'private':'public';
  const msg=visibility==='public'?'Public machen? Persönliche Accounts, Profiltexte und Discord-Daten werden entfernt. Das sichere Layout inklusive Hintergrund, Musik/Video, Module und Social-Struktur bleibt erhalten; Socials werden als @ Platzhalter gespeichert.':'Preset wieder privat machen?';
  if(!confirm(msg))return;
  try{await api('/api/marketplace/'+encodeURIComponent(item.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({visibility})});toast(visibility==='public'?'Preset ist jetzt Public':'Preset ist jetzt Privat');loadMarketplace()}catch(e){toast(e.message)}
}
async function deleteMarketplacePreset(id){
  if(!confirm('Dieses Preset wirklich löschen?'))return;
  try{await api('/api/marketplace/'+encodeURIComponent(id),{method:'DELETE'});toast('Preset gelöscht');loadMarketplace()}catch(e){toast(e.message)}
}
$('#marketCreate').onclick=createMarketplacePreset;$('#marketRefresh').onclick=loadMarketplace;
$$('[data-market-scope]').forEach(b=>b.onclick=()=>{marketScope=b.dataset.marketScope;$$('[data-market-scope]').forEach(x=>x.classList.toggle('on',x===b));$('#marketScopeNote').textContent=marketScope==='public'?'Public Presets übernehmen das sichere Profil-Layout inklusive Hintergrund, Musik/Video, Module und Social-Platzhalter als @. Persönliche Accounts und Discord-Daten bleiben entfernt.':'Meine Presets: Private können dein komplettes editierbares Profil enthalten. Public Presets übernehmen das komplette sichere Layout inklusive Hintergrund, Player, Module und Social-Platzhalter. Persönliche Accounts und Discord-Daten bleiben entfernt.';loadMarketplace()});
let marketSearchTimer=0;$('#marketSearch').oninput=e=>{marketQuery=e.target.value.trim();clearTimeout(marketSearchTimer);marketSearchTimer=setTimeout(loadMarketplace,240)};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save()}if(e.key==='Escape'&&!cp.hidden)cp.hidden=true});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(`${location.origin}/${me.username}`);toast('Profil-Link kopiert')}catch{toast('Kopieren nicht möglich')}};
$('#publicView').onclick=()=>window.open('/'+encodeURIComponent(me.username),'_blank');
$('#previewLayoutToggle').onclick=()=>{const box=$('#previewModuleEditor'),btn=$('#previewLayoutToggle'),open=box.hidden;box.hidden=!open;btn.setAttribute('aria-expanded',String(open))};
$('#zoom').oninput=e=>$('#pvCard').style.setProperty('--pv-scale',e.target.value/100);


async function refreshSpotifyAccount(){
  const name=$('#spotifyAccountName'),sub=$('#spotifyAccountSub'),live=$('#spotifyLiveState');
  if(!name||!live||!me?.username)return;
  name.textContent='Automatisch über Discord';
  sub.textContent='Kein Spotify Login und kein Spotify Premium für die Caruzo-Integration nötig.';
  try{
    const r=await api('/api/spotify/now/'+encodeURIComponent(me.username)+'?t='+Date.now());
    if(r.active){
      live.innerHTML=`<span class="statusDot" style="background:#1ed760"></span><span><b>JETZT LÄUFT</b> · ${escapeHtml(r.name||'Spotify')}${r.artists?.length?' · '+escapeHtml(r.artists.join(', ')):''} · <small>${escapeHtml(String(r.source||'Discord'))}</small></span>`;
    }else{
      live.innerHTML='<span class="statusDot" style="background:#80848e"></span><span>Keine Spotify-Aktivität erkannt · prüfe Discord → Verbindungen → Spotify und Aktivitätsstatus.</span>';
    }
  }catch(e){live.innerHTML='<span class="statusDot" style="background:#f0b232"></span><span>Discord Spotify Presence aktuell nicht erreichbar.</span>'}
}
async function refreshPresenceDiagnostic(){
  if(!me?.discord?.id)return;const box=$('#presenceLiveState');if(!box)return;
  try{const r=await api('/api/presence/'+encodeURIComponent(me.discord.id)+'?t='+Date.now());const st=String(r.data?.discord_status||'offline').toLowerCase();const names={online:'ONLINE',idle:'ABWESEND',dnd:'BESCHÄFTIGT',offline:'OFFLINE'};const source=r.data?.source==='discord-bot'?'Discord Gateway':String(r.data?.source||'').startsWith('lanyard')?'Lanyard Live':'Keine Live-Quelle';const act=(r.data?.activities||[]).find(a=>a&&a.type!==4&&String(a.name||'').toLowerCase()!=='spotify');const issue=r.diagnostics?.gatewayIssue||r.diagnostics?.note||'';box.innerHTML=`<span class="statusDot" style="background:${st==='online'?'#23a55a':st==='idle'?'#f0b232':st==='dnd'?'#f23f43':'#80848e'}"></span><span><b>${escapeHtml(names[st]||'OFFLINE')}</b> · ${escapeHtml(source)}${act?' · '+escapeHtml(String(act.name||'')):''}${issue?' · '+escapeHtml(String(issue)):''}</span>`}catch{box.innerHTML='<span class="statusDot" style="background:#f0b232"></span><span>Presence aktuell nicht erreichbar</span>'}
}
async function refreshBoostStatus(){
  if(!me?.discord?.id)return;
  try{
    const r=await api('/api/discord/boost-status?t='+Date.now());
    if(r.discord)me.discord=r.discord;
    applyBoostAccess();renderBadges();renderPreview();
  }catch{
    if(me?.discord){me.discord.booster=false;me.discord.boosterCheckAvailable=false}
    applyBoostAccess();
  }
}
async function syncDiscord(){try{const f=await api('/api/sync',{method:'POST'});me.discord=f.discord;bind();toast('Discord aktualisiert')}catch(e){toast(e.message)}}
$('#sync').onclick=syncDiscord;$('#sync2').onclick=syncDiscord;
$('#botVerify').onclick=async()=>{try{const r=await api('/api/bot-verify',{method:'POST'}),box=$('#botVerifyState');box.replaceChildren();const dot=document.createElement('span');dot.className='statusDot';box.append(dot,document.createTextNode(`Verified: ${String(r.username||'')} · ${String(r.id||'')}`));toast('Discord ID verifiziert')}catch(e){toast(e.message)}};
$('#clearNitroTier').onclick=()=>{me.settings.nitroTier='';markDirty();renderNitroGrid();renderBadges();renderPreview()};

$$('[data-upload]').forEach(inp=>inp.onchange=async()=>{
  const f=inp.files[0];if(!f)return;const fd=new FormData();fd.append('file',f);
  try{toast('Upload läuft …');const r=await api('/api/upload/'+inp.dataset.upload,{method:'POST',body:fd});if(inp.dataset.upload==='background'){me.background.url=r.url;me.background.type=f.type.startsWith('video')?'video':'image'}else if(inp.dataset.upload==='share'){me.share.image=r.url;me.share.imageMode='custom'}else me.music.url=r.url;bind();markDirty();toast('Upload fertig · jetzt speichern')}catch(e){toast(e.message)}
});
$$('[data-color]').forEach(b=>b.onclick=()=>{me.design.accentColor=b.dataset.color;me.design.avatarFrameColor=b.dataset.color;markDirty();bind()});

const presets={
  violet:{accentColor:'#8b5cf6',avatarFrameColor:'#8b5cf6',cardStyle:'glass',cardOpacity:72,cardBlur:22,cardGlow:22,glassSaturation:125,nameEffect:'gradient'},
  emerald:{accentColor:'#00e676',avatarFrameColor:'#00e676',cardStyle:'glass',cardOpacity:68,cardBlur:24,cardGlow:28,glassSaturation:130,nameEffect:'neon'},
  mono:{accentColor:'#d4d4d8',avatarFrameColor:'#ffffff',cardStyle:'minimal',cardOpacity:82,cardBlur:10,cardGlow:8,glassSaturation:100,nameEffect:'standard'},
  cyber:{accentColor:'#22d3ee',avatarFrameColor:'#22d3ee',cardStyle:'outline',cardOpacity:55,cardBlur:18,cardGlow:38,glassSaturation:145,nameEffect:'glitch'},
  rose:{accentColor:'#ff2e93',avatarFrameColor:'#ff2e93',cardStyle:'frosted',cardOpacity:70,cardBlur:30,cardGlow:34,glassSaturation:145,nameEffect:'shimmer'},
  amber:{accentColor:'#f59e0b',avatarFrameColor:'#f59e0b',cardStyle:'glass',cardOpacity:76,cardBlur:20,cardGlow:24,glassSaturation:118,nameEffect:'chrome'},
  ice:{accentColor:'#7dd3fc',avatarFrameColor:'#bae6fd',cardStyle:'frosted',cardOpacity:62,cardBlur:34,cardGlow:32,glassSaturation:126,nameEffect:'shimmer'},
  obsidian:{accentColor:'#71717a',avatarFrameColor:'#d4d4d8',cardStyle:'solid',cardOpacity:88,cardBlur:6,cardGlow:10,glassSaturation:92,nameEffect:'chrome'},
  sunset:{accentColor:'#fb7185',avatarFrameColor:'#f97316',cardStyle:'glass',cardOpacity:70,cardBlur:25,cardGlow:36,glassSaturation:142,nameEffect:'gradient'},
  lime:{accentColor:'#a3e635',avatarFrameColor:'#bef264',cardStyle:'outline',cardOpacity:54,cardBlur:16,cardGlow:40,glassSaturation:138,nameEffect:'neon'},
  ocean:{accentColor:'#3b82f6',avatarFrameColor:'#22d3ee',cardStyle:'frosted',cardOpacity:66,cardBlur:29,cardGlow:35,glassSaturation:150,nameEffect:'gradient'},
  pearl:{accentColor:'#e4e4e7',avatarFrameColor:'#ffffff',cardStyle:'glass',cardOpacity:58,cardBlur:32,cardGlow:20,glassSaturation:108,nameEffect:'shimmer'}
};
$$('[data-preset]').forEach(b=>b.onclick=()=>{Object.assign(me.design,presets[b.dataset.preset]);markDirty();bind();toast('Preset angewendet')});
$$('[data-reset]').forEach(b=>b.onclick=()=>{if(b.dataset.reset==='views')me.viewsStyle={visible:true,placement:'profile',corner:'top-right',effect:'glow',backgroundOpacity:22,borderOpacity:14,eyeOpacity:92,countOpacity:88};if(b.dataset.reset==='profil'){me.tagline='';me.about='';}markDirty();bind();toast('Defaults geladen · speichern nicht vergessen')});

setInterval(()=>{if(me?.discord?.id)refreshPresenceDiagnostic()},6000);
setInterval(()=>refreshSpotifyAccount(),15000);
function handleSpotifyCallbackNotice(){}

Promise.all([api('/api/me'),api('/api/session-info')]).then(([u,s])=>{me=u;canAdmin=!!s.isAdmin;canModerator=!canAdmin&&(!!s.isModerator||!!u.platform?.moderator);isPremium=!!s.premium||!!u.platform?.premium;const accountAdmin=$('#accountAdmin'),accountAdminLabel=$('#accountAdminLabel');if(accountAdmin)accountAdmin.hidden=!(canAdmin||canModerator);if(accountAdminLabel)accountAdminLabel.textContent=canAdmin?'Admin Menu':'Moderator Menu';document.body.classList.toggle('moderator-mode',canModerator&&!canAdmin);const pcSpecsTile=$('#pcSpecsTile');if(pcSpecsTile)pcSpecsTile.hidden=!canAdmin;$('#adminRoleText').textContent=canAdmin?'Admin online':'Moderator online';$('#adminHeroKicker').textContent=canAdmin?'Owner console':'Moderator console';$('#adminHeroTitle').textContent=canAdmin?'Platform overview':'Platform overview';$('#adminHeroText').textContent=canAdmin?'Live-Zahlen, Moderation, Rollen und Changelog aus deiner bestehenden Caruzo-Datenbank.':'Live-Übersicht, Recent User, User-Suche und Invite Keys. Moderations-Aktionen bleiben sichtbar, sind aber gesperrt.';const changeTab=$('[data-admin-tab="changelog"]');if(changeTab)changeTab.hidden=!canAdmin;const changePane=$('[data-admin-pane="changelog"]');if(changePane&&!canAdmin)changePane.hidden=true;const modNote=$('#moderatorUsersNote');if(modNote)modNote.hidden=!canModerator;defaults();bind();loadStatusDiscordEmojis();applyStatisticsAccess();initBgAdmin();openTab(location.hash.slice(1)||'profil');handleSpotifyCallbackNotice();if(canAdmin){loadAdminOverview();loadAdminKeys();loadAdminUsers();loadAdminFaq();loadAdminChangelog()}else if(canModerator){loadAdminOverview();loadAdminKeys();loadAdminUsers();loadAdminFaq()}}).catch(e=>{if(e.message==='Account gesperrt')location.href='/banned';else location.href='/auth/discord'});
window.CaruzoBG&&CaruzoBG.mount('dashboard');
window.lucide?.createIcons?.();
