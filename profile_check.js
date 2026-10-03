window.onSpotifyIframeApiReady=api=>{window.__caruzoSpotifyApi=api;window.dispatchEvent(new CustomEvent('caruzo:spotify-api-ready'))}


const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v != null && v !== false) e.setAttribute(k, v);
  }
  kids.flat().forEach(c => e.append(c?.nodeType ? c : document.createTextNode(c ?? '')));
  return e;
};
const svg = (d, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); if (cls) s.setAttribute('class', cls); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p); return s; };
const PATH = {
  tag: 'M21.4 11.6l-9-9A2 2 0 0010 2H4a2 2 0 00-2 2v6a2 2 0 00.6 1.4l9 9a2 2 0 002.8 0l6-6a2 2 0 000-2.8zM6.5 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3z',
  pin: 'M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1114.5 9 2.5 2.5 0 0112 11.5z',
  cake: 'M12 6a2 2 0 002-2c0-.4-.2-.8-.4-1.1L12 1l-1.6 1.9c-.2.3-.4.7-.4 1.1a2 2 0 002 2zm4.6 9.99l-1.34-1.34a2.16 2.16 0 00-3.04 0L10.9 16a2.2 2.2 0 01-3.05 0l-1.36-1.35-1.48 1.35V21h14v-5l-1.4 1zM18 9h-5V7h-2v2H6a3 3 0 00-3 3v1.5c.9.8 2.3.7 3.1-.1l1.4-1.4 1.4 1.4a3.4 3.4 0 004.8 0l1.4-1.4 1.4 1.4c.8.8 2.2.9 3.1.1V12a3 3 0 00-3-3z',
  link: 'M3.9 12a3.1 3.1 0 013.1-3.1h4V7H7a5 5 0 000 10h4v-1.9H7A3.1 3.1 0 013.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 010 6.2h-4V17h4a5 5 0 000-10z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z',
  ext: 'M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7zM5 5h6V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-6h-2v6H5V5z',
  play: 'M8 5v14l11-7z', pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  prev: 'M18 6v12h-2V6h2zM6 12l8 6V6z', next: 'M6 6h2v12H6zM18 12l-8 6V6z'
};
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const STATUS = { online: ['#23a55a', 'ONLINE'], idle: ['#f0b232', 'ABWESEND'], dnd: ['#f23f43', 'BESCHÄFTIGT'], offline: ['#80848e', 'OFFLINE'] };
const SOCIAL_META = {
  discord:{title:'Discord'}, steam:{title:'Steam'}, twitch:{title:'Twitch',icon:'twitch',color:'9146FF',tint:'rgba(145,70,255,.16)'}, tiktok:{title:'TikTok',icon:'tiktok',color:'ffffff',tint:'rgba(255,255,255,.08)'}, x:{title:'X',icon:'x',color:'ffffff',tint:'rgba(255,255,255,.08)'}, instagram:{title:'Instagram',icon:'instagram',color:'E4405F',tint:'rgba(228,64,95,.16)'}, youtube:{title:'YouTube',icon:'youtube',color:'FF0000',tint:'rgba(255,0,0,.14)'}, spotifyProfile:{title:'Spotify',icon:'spotify',color:'1ED760',tint:'rgba(30,215,96,.14)'}, github:{title:'GitHub',icon:'github',color:'ffffff',tint:'rgba(255,255,255,.08)'}, bluesky:{title:'Bluesky',icon:'bluesky',color:'0285FF',tint:'rgba(2,133,255,.12)'}, epic:{title:'Epic Games',icon:'epicgames',color:'ffffff',tint:'rgba(255,255,255,.08)'}, valorant:{title:'Valorant',icon:'valorant',color:'ff4655',tint:'rgba(255,70,85,.14)'}, discordServer:{title:'Discord Server',icon:'discord',color:'5865F2',tint:'rgba(88,101,242,.16)'}
};
function extractYouTubeId(raw){
  const v=String(raw||'').trim(); if(!v) return '';
  try{
    const u=new URL(v);
    if(/youtu\.be$/i.test(u.hostname)) return u.pathname.replace(/^\//,'').split('/')[0]||'';
    if(/youtube\.com$/i.test(u.hostname)||/youtube-nocookie\.com$/i.test(u.hostname)){
      if(u.searchParams.get('v')) return u.searchParams.get('v');
      const m=u.pathname.match(/\/(embed|shorts|live)\/([^/?#]+)/i); if(m) return m[2];
    }
  }catch{}
  return '';
}
function socialOrder(u){
  const raw=Array.isArray(u.links?.order)?u.links.order:[];
  return [...raw,'discord','steam','twitch','tiktok','x','instagram','youtube','github','bluesky','epic','valorant','discordServer','spotifyProfile','custom'].filter((x,i,a)=>a.indexOf(x)===i);
}

const path = location.pathname.length > 1 ? decodeURIComponent(location.pathname.slice(1).split('/')[0]) : '__home__';
let audio;
let spotifyPlaying = false;
let spotifyApiPromise = null;
let backgroundYouTubeFrame = null;
let backgroundYouTubePlayer = null;
let backgroundYouTubePlayers = [null, null];
let backgroundYouTubeSlots = [null, null];
let backgroundYouTubeActiveIndex = 0;
let backgroundYouTubePreparingIndex = -1;
let backgroundYouTubeLoopTimer = 0;
let backgroundYouTubeStart = 0;
let backgroundYouTubeVideoId = '';
let backgroundYouTubeSound = false;
let backgroundYouTubeVolume = 30;
let backgroundYouTubeRevealTimer = 0;
let backgroundYouTubeRecoveryTimer = 0;
let backgroundYouTubeHasStarted = false;
let backgroundYouTubeLastLoopAt = 0;
let backgroundYouTubeMaskedUntil = 0;
let backgroundYouTubeSwapInProgress = false;
const BACKGROUND_YOUTUBE_INITIAL_PROGRESS = .55;
let profileEntered = false;
let premiumPlaylistActive=false, playlistYT=null, playlistSpotifyController=null, playlistIndex=0, playlistUser=null, playlistShell=null, playlistAutoplayWanted=true, standaloneSpotifyController=null, standaloneSpotifyAutoplayWanted=true, profileLayoutEnabled=false, globalMute=false;
function activeBackgroundYouTubePlayer(){
  return backgroundYouTubePlayers[backgroundYouTubeActiveIndex] || backgroundYouTubePlayer;
}
function syncActiveBackgroundYouTubeRefs(){
  backgroundYouTubePlayer=activeBackgroundYouTubePlayer();
  try{backgroundYouTubeFrame=backgroundYouTubePlayer?.getIframe?.()||null}catch{backgroundYouTubeFrame=null}
}
function muteAllBackgroundYouTubePlayers(){
  for(const p of backgroundYouTubePlayers){try{p?.mute?.()}catch{}}
}
function applyBackgroundYouTubeAudio(){
  syncActiveBackgroundYouTubeRefs();
  const active=backgroundYouTubePlayer;
  if(!active)return;
  muteAllBackgroundYouTubePlayers();
  try{
    if(profileEntered&&backgroundYouTubeSound&&!globalMute){
      active.unMute?.();
      active.setVolume?.(backgroundYouTubeVolume);
    }
  }catch{}
}
function maskBackgroundYouTube(ms=0){
  clearTimeout(backgroundYouTubeRevealTimer);
  const bg=$('#bg');
  bg?.classList.add('yt-mask');
  bg?.classList.remove('yt-ready');
  backgroundYouTubeMaskedUntil=Math.max(backgroundYouTubeMaskedUntil,performance.now()+Math.max(0,Number(ms)||0));
}
function revealBackgroundYouTube(){
  const bg=$('#bg');
  bg?.classList.remove('yt-mask');
  bg?.classList.add('yt-ready');
  backgroundYouTubeMaskedUntil=0;
}
function revealBackgroundYouTubeWhenStable(index=backgroundYouTubeActiveIndex,minProgress=BACKGROUND_YOUTUBE_INITIAL_PROGRESS,maxWait=2400){
  clearTimeout(backgroundYouTubeRevealTimer);
  const started=performance.now();
  let previous=-1, advancing=0;
  const check=()=>{
    if(index!==backgroundYouTubeActiveIndex)return;
    const p=backgroundYouTubePlayers[index];
    if(!p)return;
    try{
      const YT=window.YT;
      const state=p.getPlayerState?.();
      const cur=Number(p.getCurrentTime?.()||0);
      if(state===YT?.PlayerState?.PLAYING){
        if(previous>=0&&cur>previous+.015)advancing++;else if(previous>=0)advancing=0;
        const progressed=cur>=backgroundYouTubeStart+Math.max(.18,minProgress);
        const minimumMaskDone=performance.now()>=backgroundYouTubeMaskedUntil;
        if(progressed&&advancing>=2&&minimumMaskDone){
          revealBackgroundYouTube();
          return;
        }
      }
      previous=cur;
    }catch{}
    if(performance.now()-started>=maxWait){
      try{
        const p2=backgroundYouTubePlayers[index];
        if(p2?.getPlayerState?.()===window.YT?.PlayerState?.PLAYING)revealBackgroundYouTube();
      }catch{}
      return;
    }
    backgroundYouTubeRevealTimer=setTimeout(check,70);
  };
  backgroundYouTubeRevealTimer=setTimeout(check,50);
}
function commandBackgroundYouTube(){
  syncActiveBackgroundYouTubeRefs();
  const p=backgroundYouTubePlayer;
  if(!p)return;
  applyBackgroundYouTubeAudio();
  try{
    const YT=window.YT;
    const state=p.getPlayerState?.();
    // PLAYING, BUFFERING and UNSTARTED are intentionally left alone. Re-sending
    // playVideo during startup is what makes YouTube paint its native center UI.
    if([YT?.PlayerState?.PAUSED,YT?.PlayerState?.CUED].includes(state)){
      maskBackgroundYouTube(500);
      p.playVideo?.();
      revealBackgroundYouTubeWhenStable(backgroundYouTubeActiveIndex,.35,2200);
    }
  }catch{}
}
function resetHiddenBackgroundYouTube(index){
  const p=backgroundYouTubePlayers[index];
  if(!p)return;
  try{p.mute?.()}catch{}
  try{p.pauseVideo?.()}catch{}
  try{p.seekTo?.(backgroundYouTubeStart,true)}catch{}
}
function switchBackgroundYouTubeTo(index){
  if(index===backgroundYouTubeActiveIndex||backgroundYouTubeSwapInProgress)return;
  const next=backgroundYouTubePlayers[index], oldIndex=backgroundYouTubeActiveIndex, old=backgroundYouTubePlayers[oldIndex];
  if(!next)return;
  try{if(next.getPlayerState?.()!==window.YT?.PlayerState?.PLAYING)return}catch{return}
  backgroundYouTubeSwapInProgress=true;
  try{next.mute?.()}catch{}
  backgroundYouTubeSlots[index]?.classList.add('is-active');
  backgroundYouTubeSlots[oldIndex]?.classList.remove('is-active');
  backgroundYouTubeActiveIndex=index;
  backgroundYouTubePreparingIndex=-1;
  backgroundYouTubeLastLoopAt=performance.now();
  syncActiveBackgroundYouTubeRefs();
  applyBackgroundYouTubeAudio();
  // Only touch the old player after it is already invisible. Native YouTube UI
  // may appear there, but it can no longer be seen by the visitor.
  setTimeout(()=>{
    try{old?.mute?.()}catch{}
    resetHiddenBackgroundYouTube(oldIndex);
    backgroundYouTubeSwapInProgress=false;
  },180);
}
function prepareNextBackgroundYouTube(){
  if(backgroundYouTubePreparingIndex>=0||backgroundYouTubeSwapInProgress)return;
  const nextIndex=backgroundYouTubeActiveIndex===0?1:0;
  const p=backgroundYouTubePlayers[nextIndex];
  if(!p)return;
  backgroundYouTubePreparingIndex=nextIndex;
  try{p.mute?.()}catch{}
  try{
    const cur=Number(p.getCurrentTime?.()||0);
    if(Math.abs(cur-backgroundYouTubeStart)>.75)p.seekTo?.(backgroundYouTubeStart,true);
    p.playVideo?.();
  }catch{backgroundYouTubePreparingIndex=-1}
}
function recoverBackgroundYouTube({hard=false}={}){
  clearTimeout(backgroundYouTubeRecoveryTimer);
  syncActiveBackgroundYouTubeRefs();
  const p=backgroundYouTubePlayer;
  if(!p)return;
  maskBackgroundYouTube(350);
  muteAllBackgroundYouTubePlayers();
  try{
    if(hard&&backgroundYouTubeVideoId&&p.loadVideoById)p.loadVideoById({videoId:backgroundYouTubeVideoId,startSeconds:backgroundYouTubeStart});
    else{p.seekTo?.(backgroundYouTubeStart,true);p.playVideo?.()}
  }catch{}
  backgroundYouTubeRecoveryTimer=setTimeout(()=>{
    revealBackgroundYouTubeWhenStable(backgroundYouTubeActiveIndex,.45,2600);
    applyBackgroundYouTubeAudio();
  },80);
}
function startBackgroundYouTubeSeamlessLoop(){
  clearInterval(backgroundYouTubeLoopTimer);
  backgroundYouTubeLoopTimer=setInterval(()=>{
    const active=activeBackgroundYouTubePlayer();
    if(!active)return;
    try{
      const YT=window.YT;
      const state=active.getPlayerState?.();
      const dur=Number(active.getDuration?.()||0);
      const cur=Number(active.getCurrentTime?.()||0);
      const now=performance.now();
      if(state===YT?.PlayerState?.PLAYING&&dur>2){
        const remaining=dur-cur;
        const prepLead=Math.min(3.2,Math.max(1.8,dur*.045));
        if(remaining<=prepLead&&backgroundYouTubePreparingIndex<0&&now-backgroundYouTubeLastLoopAt>1000)prepareNextBackgroundYouTube();
        const nextIndex=backgroundYouTubePreparingIndex;
        if(nextIndex>=0){
          const next=backgroundYouTubePlayers[nextIndex];
          const nextState=next?.getPlayerState?.();
          const nextCur=Number(next?.getCurrentTime?.()||0);
          // Swap while the old player is still naturally PLAYING. The new player
          // has already started hidden, so neither seek/start/end UI is visible.
          if(nextState===YT?.PlayerState?.PLAYING&&nextCur>=backgroundYouTubeStart+.22&&remaining<=Math.max(.95,prepLead-.45)){
            switchBackgroundYouTubeTo(nextIndex);
            return;
          }
        }
        // Emergency guard only. Normally the prepared second player takes over
        // before this point. Mask before any hard recovery so YouTube UI cannot flash.
        if(remaining<=.28&&now-backgroundYouTubeLastLoopAt>700){
          backgroundYouTubeLastLoopAt=now;
          recoverBackgroundYouTube({hard:true});
        }
        return;
      }
      if([YT?.PlayerState?.PAUSED,YT?.PlayerState?.CUED,YT?.PlayerState?.ENDED].includes(state)&&now-backgroundYouTubeLastLoopAt>900){
        backgroundYouTubeLastLoopAt=now;
        recoverBackgroundYouTube({hard:state===YT?.PlayerState?.ENDED});
      }
    }catch{}
  },80);
}

const externalRef=(()=>{try{return document.referrer?new URL(document.referrer).hostname:''}catch{return ''}})();
fetch('/api/profile/' + encodeURIComponent(path)+(externalRef?'?ref='+encodeURIComponent(externalRef):'')).then(r => r.ok ? r.json() : Promise.reject()).then(render).catch(() => {
  document.body.replaceChildren(el('p', { style: 'padding:60px;text-align:center' }, 'Profil nicht gefunden.'));
});



function trackProfileEvent(u,type,key=''){
  if(!u?.username)return;try{fetch('/api/profile/'+encodeURIComponent(u.username)+'/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,key:String(key||'').slice(0,48)}),keepalive:true}).catch(()=>{})}catch{}
}
function parseSpotifySource(raw){const m=String(raw||'').match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)/i);return m?{kind:m[1],id:m[2]}:null}
function parseYouTubePlaylist(raw){try{return new URL(String(raw||'')).searchParams.get('list')||''}catch{return ''}}
function musicProviderInfo(raw){
  if(parseSpotifySource(raw))return {key:'spotify',name:'Spotify',asset:'/social-icons/spotify.png'};
  if(extractYouTubeId(raw)||parseYouTubePlaylist(raw))return {key:'youtube',name:'YouTube',asset:'/social-icons/youtube.png'};
  return {key:'audio',name:'Audio',asset:''};
}
function genericSourceTitle(title){return /^(?:spotify(?: track \/ playlist)?|youtube(?: track \/ playlist)?|track|playlist|nothing playing yet|audio)$/i.test(String(title||'').trim())}
const mediaMetaClientCache=new Map();
async function resolveMediaMeta(raw){
  const key=String(raw||'').trim();if(!key)return null;
  if(mediaMetaClientCache.has(key))return mediaMetaClientCache.get(key);
  const promise=fetch('/api/media-meta?url='+encodeURIComponent(key),{cache:'force-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
  mediaMetaClientCache.set(key,promise);return promise;
}
function sourcePresentation(src,meta=null){
  const provider=musicProviderInfo(src?.url),sp=parseSpotifySource(src?.url),ytList=parseYouTubePlaylist(src?.url);
  const storedTitle=String(src?.title||'').trim(),storedArtist=String(src?.artist||'').trim(),storedCover=String(src?.cover||'').trim();
  const title=(!storedTitle||genericSourceTitle(storedTitle))?(meta?.title||provider.name+(sp?.kind==='playlist'||ytList?' Playlist':'')):storedTitle;
  const artist=storedArtist||(meta?.author||((sp?.kind||ytList)?`${provider.name} ${sp?.kind==='playlist'||ytList?'Playlist':sp?.kind||''}`.trim():provider.name));
  const cover=storedCover||meta?.thumbnail||'';
  return {provider,title,artist,cover};
}
function premiumMusicTarget(pos){if(pos==='floating-bottom')return $('#musicPlayerFloating');if(profileLayoutEnabled)return $('#musicLayoutSlot');if(pos==='before-highlights')return $('#musicPlayerBeforeHighlights');if(pos==='before-socials')return $('#musicPlayerBeforeSocials');if(pos==='after-socials')return $('#musicPlayerAfterSocials');return $('#musicPlayerBelowProfile')}
function playlistCover(src){if(src?.cover)return src.cover;const id=extractYouTubeId(src?.url);return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:''}
function timeLabel(sec){sec=Math.max(0,Number(sec||0));const m=Math.floor(sec/60),s=Math.floor(sec%60);return `${m}:${String(s).padStart(2,'0')}`}
function setPlaylistPlaying(on){const root=playlistShell?.root;if(!root)return;root.classList.toggle('playing',!!on);if(playlistShell.playIcon)playlistShell.playIcon.setAttribute('d',on?PATH.pause:PATH.play);if(playlistShell.play)playlistShell.play.setAttribute('aria-label',on?'Pause':'Play')}
function updatePlaylistProgress(cur=0,dur=0){if(!playlistShell)return;playlistShell.cur.textContent=timeLabel(cur);playlistShell.dur.textContent=timeLabel(dur);playlistShell.bar.style.width=(dur?Math.max(0,Math.min(100,cur/dur*100)):0)+'%'}
function applyPremiumMusicPresentation(src,meta=null){
  if(!playlistShell)return;
  const view=sourcePresentation(src,meta),p=view.provider,root=playlistShell.root;
  root.classList.remove('provider-spotify','provider-youtube','provider-audio');root.classList.add('provider-'+p.key);
  if(playlistShell.providerIcon){playlistShell.providerIcon.src=p.asset||'';playlistShell.providerIcon.hidden=!p.asset}
  if(playlistShell.providerName)playlistShell.providerName.textContent=p.name;
  if(playlistShell.sourceIcon){playlistShell.sourceIcon.src=p.asset||'';playlistShell.sourceIcon.hidden=!p.asset}
  if(playlistShell.sourceName)playlistShell.sourceName.textContent=p.name;
  playlistShell.title.textContent=view.title||p.name;
  playlistShell.artist.textContent=view.artist||p.name;
  if(playlistShell.cover){
    const image=view.cover||p.asset||'';
    playlistShell.cover.src=image;
    playlistShell.cover.hidden=!image;
    playlistShell.cover.classList.toggle('provider-fallback',!view.cover&&!!p.asset);
  }
  if(playlistShell.sourceCount)playlistShell.sourceCount.textContent=`${playlistIndex+1} / ${(playlistUser?.musicPlayer?.sources||[]).length}`;
}
function requestPremiumPlaylistAutoplay(fromGesture=false){
  if(!premiumPlaylistActive||globalMute)return;
  playlistAutoplayWanted=true;
  try{
    if(playlistSpotifyController){const r=playlistSpotifyController.play?.();if(r?.catch)r.catch(()=>{});return}
    if(playlistYT){playlistYT.playVideo?.();return}
  }catch{}
}
async function mountPremiumMusicSource(index=0){
  const mp=playlistUser?.musicPlayer||{},sources=mp.sources||[];if(!sources.length||!playlistShell)return;
  playlistIndex=(index+sources.length)%sources.length;const src=sources[playlistIndex],sp=parseSpotifySource(src.url),ytId=extractYouTubeId(src.url),ytList=parseYouTubePlaylist(src.url);
  try{playlistYT?.destroy?.()}catch{}playlistYT=null;try{playlistSpotifyController?.pause?.()}catch{}playlistSpotifyController=null;
  playlistShell.embed.replaceChildren();playlistShell.hiddenMount.replaceChildren();setPlaylistPlaying(false);updatePlaylistProgress(0,0);applyPremiumMusicPresentation(src);
  resolveMediaMeta(src.url).then(meta=>{if((playlistUser?.musicPlayer?.sources||[])[playlistIndex]?.url===src.url&&meta)applyPremiumMusicPresentation(src,meta)});
  if(sp){
    // Render Spotify's real embed immediately without a visible intermediate loading state.
    // The IFrame API then replaces this mount with its controllable player as soon as it is ready.
    const target=el('div',{class:'mp-spotify-target'});
    target.append(el('iframe',{
      src:`https://open.spotify.com/embed/${sp.kind}/${sp.id}?utm_source=generator`,
      allow:'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
      loading:'eager',fetchpriority:'high',title:'Spotify',height:'152'
    }));
    playlistShell.embed.append(target);playlistShell.embed.hidden=false;
    try{
      const api=await getSpotifyIframeApi();
      api.createController(target,{uri:`spotify:${sp.kind}:${sp.id}`,width:'100%',height:152},controller=>{
        playlistSpotifyController=controller;
        controller.addListener('playback_update',e=>{
          const d=e?.data||{},playing=d.isPaused===false;setPlaylistPlaying(playing);updatePlaylistProgress((d.position||0)/1000,(d.duration||0)/1000);
          if(playing){if(globalMute){try{controller.pause?.()}catch{};setPlaylistPlaying(false);return}silenceSiteSoundForSpotify();trackProfileEvent(playlistUser,'music_play',src.id)}
        });
        if(playlistAutoplayWanted&&!globalMute){setTimeout(()=>{try{const r=controller.play?.();if(r?.catch)r.catch(()=>{})}catch{}},30)}
      });
    }catch{
      // The already-rendered official embed remains usable if Spotify's API is unavailable.
    }
    return;
  }
  playlistShell.embed.hidden=true;
  if(ytId||ytList){
    const mount=el('div',{id:'premiumPlaylistYT'+Date.now()});playlistShell.hiddenMount.append(mount);
    try{
      const YT=await getYouTubeApi();const vars={autoplay:playlistAutoplayWanted?1:0,controls:0,modestbranding:1,playsinline:1,rel:0};if(ytList){vars.listType='playlist';vars.list=ytList}
      playlistYT=new YT.Player(mount,{width:'1',height:'1',videoId:ytId||undefined,playerVars:vars,events:{onReady:e=>{try{e.target.setVolume(globalMute?0:Number(mp.volume??65));if(playlistAutoplayWanted&&!globalMute)e.target.playVideo?.()}catch{}},onStateChange:e=>{const on=e.data===YT.PlayerState.PLAYING;setPlaylistPlaying(on);if(on)trackProfileEvent(playlistUser,'music_play',src.id);if(e.data===YT.PlayerState.ENDED&&!ytList&&playlistAutoplayWanted)mountPremiumMusicSource(playlistIndex+1)}}});
    }catch{}
  }
}
function playlistSkip(dir){
  if(!playlistUser||!playlistShell)return;trackProfileEvent(playlistUser,'music_skip',String(dir));playlistAutoplayWanted=true;
  const src=playlistUser.musicPlayer.sources?.[playlistIndex]||{},sp=parseSpotifySource(src.url),ytList=parseYouTubePlaylist(src.url);
  if(sp&&['playlist','album'].includes(sp.kind)&&playlistSpotifyController){try{dir>0?playlistSpotifyController.next?.():playlistSpotifyController.previous?.();return}catch{}}
  if(ytList&&playlistYT){try{dir>0?playlistYT.nextVideo():playlistYT.previousVideo();return}catch{}}
  mountPremiumMusicSource(playlistIndex+dir)
}
function renderPremiumMusicPlayer(u){
  const mp=u.musicPlayer||{},sources=Array.isArray(mp.sources)?mp.sources:[];if(!u.platform?.premium||mp.enabled===false||!sources.length)return;
  playlistUser=u;playlistAutoplayWanted=true;const host=premiumMusicTarget(mp.position);if(!host)return;host.className=mp.position==='floating-bottom'?'music-floating-bottom':'premium-music-host';host.replaceChildren();
  const root=el('section',{class:`premium-music-player style-${mp.style||'glass-wave'}`});root.style.setProperty('--mp-a',mp.accent||'#8b5cf6');root.style.setProperty('--mp-b',mp.secondary||'#22d3ee');if(globalMute){root.classList.add('global-muted');root.dataset.muted='1'}
  const src=sources[0]||{},initial=sourcePresentation(src),provider=initial.provider;
  const coverEl=el('img',{class:'mp-cover'+(!initial.cover&&provider.asset?' provider-fallback':''),alt:'',src:initial.cover||provider.asset||''});if(mp.showCover===false)coverEl.style.display='none';
  const providerIcon=el('img',{class:'mp-provider-icon',src:provider.asset||'',alt:'',hidden:provider.asset?null:''});const providerName=el('span',{class:'mp-provider-name'},provider.name);const playlistName=el('em',{class:'mp-playlist-name'},mp.title||'Playlist');
  const kicker=el('span',{class:'mp-kicker'},providerIcon,providerName,playlistName);const title=el('b',{class:'mp-title'},initial.title||provider.name);const artist=el('span',{class:'mp-artist'},initial.artist||provider.name);const copy=el('div',{class:'mp-copy'},kicker,title,artist);
  const prev=el('button',{type:'button','aria-label':'Vorheriger Titel'},svg(PATH.prev));
  const play=el('button',{type:'button',class:'mp-play','aria-label':'Play'},svg(PATH.play));
  const next=el('button',{type:'button','aria-label':'Nächster Titel'},svg(PATH.next));
  const controls=el('div',{class:'mp-controls'},el('div',{class:'mp-control-cluster'},prev,play,next));const head=el('div',{class:'mp-head'},coverEl,copy,controls);
  const cur=el('span',{},'0:00'),bar=el('i'),dur=el('span',{},'0:00'),progress=el('div',{class:'mp-progress'},cur,el('div',{class:'mp-track'},bar),dur);
  const sourceIcon=el('img',{src:provider.asset||'',alt:'',hidden:provider.asset?null:''}),sourceName=el('strong',{},provider.name),sourceCount=el('span',{},`1 / ${sources.length}`);const source=el('span',{class:'mp-source'},el('b',{},sourceIcon,sourceName),sourceCount);
  const vol=el('input',{type:'range',min:'0',max:'100',value:String(mp.volume??65),'aria-label':'Playlist volume'}),bottom=el('div',{class:'mp-bottom'},source,el('label',{class:'mp-volume'},el('span',{},'VOL'),vol));const embed=el('div',{class:'mp-embed'}),hiddenMount=el('div',{class:'mp-hidden'});
  if(globalMute){play.disabled=true;prev.disabled=true;next.disabled=true;vol.disabled=true;source.prepend(el('span',{},'GLOBAL MUTE · '))}
  root.append(head,progress,bottom,embed,hiddenMount);host.append(root);playlistShell={root,cover:coverEl,title,artist,play,playIcon:play.querySelector('path'),source,sourceIcon,sourceName,sourceCount,providerIcon,providerName,cur,dur,bar,embed,hiddenMount};
  prev.onclick=()=>playlistSkip(-1);next.onclick=()=>playlistSkip(1);play.onclick=()=>{
    const src=sources[playlistIndex]||{},sp=parseSpotifySource(src.url);
    if(sp&&playlistSpotifyController){try{const isOn=root.classList.contains('playing');playlistAutoplayWanted=!isOn;playlistSpotifyController.togglePlay?.();return}catch{}}
    if(playlistYT){try{const st=playlistYT.getPlayerState?.();if(st===YT.PlayerState.PLAYING){playlistAutoplayWanted=false;playlistYT.pauseVideo()}else{playlistAutoplayWanted=true;playlistYT.playVideo()}return}catch{}}
  };
  vol.oninput=e=>{try{playlistYT?.setVolume?.(Number(e.target.value)||0)}catch{}};
  mountPremiumMusicSource(0);if(window.__premiumMusicProgressTimer)clearInterval(window.__premiumMusicProgressTimer);window.__premiumMusicProgressTimer=setInterval(()=>{if(playlistYT){try{updatePlaylistProgress(playlistYT.getCurrentTime?.()||0,playlistYT.getDuration?.()||0)}catch{}}},500);
}

function reactionPlacementTarget(position, profileCard){
  if(profileLayoutEnabled && !position.startsWith('floating')) return $('#reactionLayoutSlot');
  if(position==='profile-bottom') return profileCard;
  if(position==='before-highlights') return $('#reactionBeforeHighlights');
  if(position==='after-highlights') return $('#reactionAfterHighlights');
  if(position==='before-socials') return $('#reactionBeforeSocials');
  return document.body;
}
function reactionBurst(button,emoji,kind){
  const fx=el('span',{class:'reaction-fx'});button.append(fx);
  const pieces=kind==='confetti'?10:kind==='burst'?7:0;
  for(let i=0;i<pieces;i++){
    const p=el('span',{class:'reaction-particle'},kind==='confetti'?['✦','•','◆','+'][i%4]:emoji);
    const ang=(Math.PI*2*i/Math.max(1,pieces))+(Math.random()*.45-.22),dist=kind==='confetti'?38+Math.random()*26:28+Math.random()*20;
    p.style.setProperty('--x',`${Math.cos(ang)*dist}px`);p.style.setProperty('--y',`${Math.sin(ang)*dist}px`);p.style.setProperty('--r',`${Math.round(Math.random()*100-50)}deg`);fx.append(p);
  }
  setTimeout(()=>fx.remove(),900);
}
function playReactionAnimation(button,emoji,kind='pop'){
  button.classList.remove(...[...button.classList].filter(x=>x.startsWith('reaction-anim-')));
  void button.offsetWidth;button.classList.add('reaction-anim-'+kind);
  if(kind==='burst'||kind==='confetti')reactionBurst(button,emoji,kind);
  setTimeout(()=>button.classList.remove('reaction-anim-'+kind),900);
}
function renderProfileReactions(u,profileCard){
  const cfg=u.reactions||{};if(cfg.enabled===false)return;const items=(Array.isArray(cfg.items)?cfg.items:[]).slice(0,8);if(!items.length)return;
  const position=cfg.position||'profile-bottom';
  const wrap=el('div',{class:'reaction-wrap '+(profileLayoutEnabled&&!position.startsWith('floating')?'section-placement':position==='profile-bottom'?'profile-bottom':position.startsWith('floating')?'floating '+position:'section-placement')});
  const label=el('span',{class:'reaction-label'},cfg.title||'React');const buttons=el('div',{class:'reaction-buttons'});wrap.append(label,buttons);
  items.forEach(item=>{
    const count=el('span',{class:'count'},Number(item.count||0).toLocaleString('de-CH'));if(cfg.showCounts===false)count.hidden=true;
    const b=el('button',{class:'reaction-btn',type:'button',title:item.label||'Reaction','aria-label':item.label||'Reaction'},el('span',{class:'emoji'},item.emoji||'✨'),count);
    b.onclick=async()=>{
      if(b.dataset.busy)return;b.dataset.busy='1';playReactionAnimation(b,item.emoji||'✨',cfg.animation||'pop');
      try{
        const r=await fetch('/api/profile/'+encodeURIComponent(u.username)+'/reaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})});
        const data=await r.json().catch(()=>({}));
        if(!r.ok){if(r.status===429){b.classList.add('reacted');toast(data.error||'Schon reagiert')}else toast(data.error||'Reaction fehlgeschlagen');return}
        b.classList.add('reacted');item.count=Number(data.count||item.count||0);count.textContent=Number(item.count).toLocaleString('de-CH');
      }catch{toast('Reaction konnte nicht gesendet werden')}finally{setTimeout(()=>delete b.dataset.busy,450)}
    };buttons.append(b);
  });
  const target=reactionPlacementTarget(position,profileCard);target?.append(wrap);
}

function applyProfileLayout(u){
  const layout=u.profileLayout;if(!layout||!Array.isArray(layout.order))return;const flow=$('#moduleFlow');if(!flow)return;const hidden=new Set(Array.isArray(layout.hidden)?layout.hidden:[]);
  const musicPos=u.musicPlayer?.position||'below-profile',reactionPos=u.reactions?.position||'profile-bottom';
  const reactionNode=document.querySelector('.reaction-wrap');
  const map={
    'status-card':$('#premiumStatusCard'),activity:$('#activity'),'spotify-now':$('#spotifyNow'),spotify:$('#spotify'),'music-player':musicPos==='floating-bottom'?$('#musicPlayerFloating'):$('#musicLayoutSlot'),highlights:$('#highlights'),reactions:reactionPos.startsWith('floating')?reactionNode:$('#reactionLayoutSlot'),socials:$('#socials'),premium:$('#premiumCustom'),about:$('#about')
  };
  const order=[...layout.order,...['reactions','music-player','status-card','activity','spotify-now','spotify','highlights','socials','premium','about'].filter(x=>!layout.order.includes(x))];
  order.forEach(id=>{const node=map[id];if(!node)return;node.classList.toggle('layout-hidden',hidden.has(id));if((id==='music-player'&&musicPos==='floating-bottom')||(id==='reactions'&&reactionPos.startsWith('floating')))return;flow.append(node)});
}
const PC_BRAND_LOGOS=[
  [/ryzen|amd/i,'amd'],[/nvidia|geforce/i,'nvidia'],[/intel/i,'intel'],[/asus|rog/i,'asus'],[/msi/i,'msi'],[/gigabyte|aorus/i,'gigabyte'],[/asrock/i,'asrock'],[/corsair/i,'corsair'],[/kingston/i,'kingstontechnology'],[/crucial/i,'crucial'],[/samsung/i,'samsung'],[/western digital|wd/i,'westerndigital'],[/hyperx/i,'hyperx'],[/zotac/i,'zotac'],[/sapphire/i,'sapphire'],[/powercolor/i,'powercolor'],[/evga/i,'evga'],[/xfx/i,'xfx'],[/patriot/i,'patriotmemory'],[/teamgroup|team group|t-force/i,'teamgroup']
];
function pcBrandSlug(name){const v=String(name||'').trim();for(const [rx,slug] of PC_BRAND_LOGOS)if(rx.test(v))return slug;return ''}
function pcBrandInitials(name){const words=String(name||'').trim().split(/\s+/).filter(Boolean);return (words.slice(0,2).map(x=>x[0]).join('')||'PC').toUpperCase().slice(0,3)}
function renderPcSpecs(u){
  const host=$('#pcSpecsSection');if(!host)return;host.replaceChildren();host.hidden=true;
  if(!u?.platform?.admin)return;
  const specs=u?.pcSpecs||{};
  const items=[['mainboard','Mainboard'],['cpu','CPU'],['gpu','GPU'],['ram','RAM']].map(([key,label])=>({key,label,value:String(specs[key]||'').trim()})).filter(x=>x.value);
  if(!items.length)return;
  const head=el('div',{class:'pc-specs-head'},el('div',{class:'pc-specs-title'},el('i',{},'⌁'),el('span',{},el('b',{},'PC Specs'),el('small',{},'Hardware brands'))),el('span',{class:'pc-specs-beta'},'Beta'));
  const grid=el('div',{class:'pc-specs-grid'});
  items.forEach(item=>{
    const mark=el('span',{class:'pc-brand-mark'}),slug=pcBrandSlug(item.value),fallback=el('span',{},pcBrandInitials(item.value));
    if(slug){const img=el('img',{src:`https://cdn.simpleicons.org/${slug}/ffffff`,alt:''});img.onerror=()=>mark.replaceChildren(fallback);mark.append(img)}else mark.append(fallback);
    grid.append(el('article',{class:'pc-spec-item'},mark,el('span',{class:'pc-spec-copy'},el('small',{},item.label),el('b',{},item.value))));
  });
  host.append(el('div',{class:'pc-specs-card'},head,grid));host.hidden=false;
}

function render(u) {
  const d = u.discord, s = u.settings, des = u.design || {}, vs = u.viewsStyle || {}, pf = u.pageFx || {};
  profileLayoutEnabled=!!u.profileLayout;globalMute=!!u.music?.globalMute;
  premiumPlaylistActive=!!u.platform?.premium&&u.musicPlayer?.enabled!==false&&Array.isArray(u.musicPlayer?.sources)&&u.musicPlayer.sources.length>0;
  const hexToRgb = h => { const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h||''); return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '139,92,246'; };
  const accent = des.accentColor || '#8b5cf6';
  document.documentElement.style.setProperty('--pink', accent); document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--frame', des.avatarFrameColor || accent); document.documentElement.style.setProperty('--frame-width', (des.avatarFrameWidth ?? 2) + 'px');
  document.documentElement.style.setProperty('--card-alpha', (des.cardOpacity ?? 72) / 100); document.documentElement.style.setProperty('--card-blur', (des.cardBlur ?? 22) + 'px'); document.documentElement.style.setProperty('--card-radius', (des.cardRadius ?? 26) + 'px'); document.documentElement.style.setProperty('--border-alpha', (des.borderOpacity ?? 12) / 100);
  document.documentElement.style.setProperty('--card-glow-size', Math.round((des.cardGlow ?? 18) * .55) + 'px'); document.documentElement.style.setProperty('--glass-saturation', (des.glassSaturation ?? 120) + '%'); document.documentElement.style.setProperty('--avatar-size', (des.avatarSize ?? 132) + 'px'); document.documentElement.style.setProperty('--social-radius', (des.socialRadius ?? 18) + 'px'); document.documentElement.style.setProperty('--profile-width', (des.profileWidth ?? 1000) + 'px');
  document.body.classList.add('card-style-' + (des.cardStyle || 'glass'), 'social-' + (des.socialLayout || 'grid'), 'social-effect-' + (des.socialEffect || 'lift'), 'badge-style-' + (des.badgeStyle || 'icon'));
  if (des.contentAlign === 'center') document.body.classList.add('content-center');
  document.title = u.displayName; setupBrowserTab(u);
  $('#logoName').append(u.username, el('i', {}, '.lol'));
  if (s.showProfileBrand === false) $('#profileBrand').hidden = true;
  $('#enterText').textContent = u.enterText;

  // Hintergrund
  document.documentElement.style.setProperty('--blur', u.background.blur + 'px');
  document.documentElement.style.setProperty('--dim', u.background.dim / 100);
  if (pf.type && pf.type !== 'none') {
    if (['matrix','snow','particles','constellation'].includes(pf.type)) setupAmbientCanvas(pf);
    else {
      const layer = el('div', { class: 'page-fx page-fx-' + pf.type });
      layer.style.setProperty('--fx-color', pf.color || accent); layer.style.setProperty('--fx-secondary', pf.secondary || '#ff2e93');
      layer.style.setProperty('--fx-opacity', (pf.opacity ?? 18) / 100); layer.style.setProperty('--fx-density', (pf.density ?? 44) + 'px'); layer.style.setProperty('--fx-speed', (pf.speed ?? 9) + 's');
      $('#bg').append(layer);
    }
  }
  if (u.background.url) {
    let bg = null;
    if (u.background.type === 'youtube') {
      const ytId = extractYouTubeId(u.background.url);
      if (ytId) {
        const start = Math.max(0, Number(u.background.videoStart || 0));
        const sm=(u.soundMode||'auto'); const mute = (globalMute || premiumPlaylistActive || u.background.videoSound === false || sm === 'music' || sm === 'mute' || (sm==='auto' && !!u.music?.url)) ? 1 : 0;
        const ytPoster=el('img',{class:'bg-yt-poster',src:`https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`,alt:'','aria-hidden':'true'});
        ytPoster.onerror=()=>{if(!/hqdefault/.test(ytPoster.src))ytPoster.src=`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`};
        $('#bg').prepend(ytPoster);
        // Two YouTube players are used as a visual double buffer. Player A starts
        // hidden; Player B is prepared invisibly before A reaches the end. At each
        // loop Caruzo swaps to the already-playing hidden player, so the visible
        // iframe never receives seek/play/end commands that could paint YouTube UI.
        bg = el('div', { class: 'bg-yt', 'aria-hidden':'true' });
        const mounts=[];
        backgroundYouTubeSlots=[0,1].map(i=>{
          const slot=el('div',{class:'bg-yt-slot'+(i===0?' is-active':'')});
          const mount=el('div',{'aria-hidden':'true'});
          slot.append(mount);bg.append(slot);mounts.push(mount);return slot;
        });
        backgroundYouTubePlayers=[null,null];
        backgroundYouTubeActiveIndex=0;
        backgroundYouTubePreparingIndex=-1;
        backgroundYouTubeSwapInProgress=false;
        backgroundYouTubeHasStarted=false;
        clearTimeout(backgroundYouTubeRevealTimer);
        backgroundYouTubeStart=start;
        backgroundYouTubeVideoId=ytId;
        maskBackgroundYouTube(120);
        backgroundYouTubeSound=!mute;
        backgroundYouTubeVolume=Math.max(0,Math.min(100,Number(u.background.videoVolume ?? 30)));
        $('#bg').classList.add('youtube-bg');
        queueMicrotask(async()=>{
          try{
            const YT=await getYouTubeApi();
            const createPlayer=(index)=>new YT.Player(mounts[index],{
              width:'100%',height:'100%',videoId:ytId,
              playerVars:{autoplay:index===0?1:0,mute:1,controls:0,disablekb:1,fs:0,iv_load_policy:3,modestbranding:1,playsinline:1,rel:0,start,enablejsapi:1,origin:location.origin},
              events:{
                onReady:e=>{
                  backgroundYouTubePlayers[index]=e.target;
                  try{e.target.mute?.()}catch{}
                  if(index===0){
                    syncActiveBackgroundYouTubeRefs();
                    startBackgroundYouTubeSeamlessLoop();
                    // Do not call playVideo here. autoplay=1 is allowed because the
                    // player is muted; a delayed hidden fallback handles rare failures.
                    setTimeout(()=>{
                      try{
                        const st=e.target.getPlayerState?.();
                        if(![YT.PlayerState.PLAYING,YT.PlayerState.BUFFERING].includes(st)){
                          maskBackgroundYouTube(300);e.target.playVideo?.();
                          revealBackgroundYouTubeWhenStable(0,.45,2400);
                        }
                      }catch{}
                    },1300);
                  }else resetHiddenBackgroundYouTube(index);
                },
                onStateChange:e=>{
                  backgroundYouTubePlayers[index]=e.target;
                  if(index===backgroundYouTubeActiveIndex&&e.data===YT.PlayerState.PLAYING){
                    syncActiveBackgroundYouTubeRefs();
                    if(!backgroundYouTubeHasStarted){
                      backgroundYouTubeHasStarted=true;
                      revealBackgroundYouTubeWhenStable(index,BACKGROUND_YOUTUBE_INITIAL_PROGRESS,2200);
                    }
                    applyBackgroundYouTubeAudio();
                  }else if(index===backgroundYouTubeActiveIndex&&e.data===YT.PlayerState.ENDED){
                    recoverBackgroundYouTube({hard:true});
                  }
                },
                onError:()=>{if(index===backgroundYouTubeActiveIndex)recoverBackgroundYouTube({hard:true})}
              }
            });
            backgroundYouTubePlayers[0]=createPlayer(0);
            backgroundYouTubePlayers[1]=createPlayer(1);
            syncActiveBackgroundYouTubeRefs();
          }catch{}
        });
      }
    }
    if (!bg) {
      bg = u.background.type === 'video'
        ? el('video', { src: u.background.url, playsinline: '' })
        : el('img', { src: u.background.url, alt: '' });
      if (bg.tagName === 'VIDEO') {
        bg.muted = true;
        const requestedStart = Math.max(0, Number(u.background.videoStart || 0));
        const seekToStart = () => {
          const max = Number.isFinite(bg.duration) && bg.duration > .35 ? Math.max(0, bg.duration - .25) : requestedStart;
          const target = Math.min(requestedStart, max);
          try { bg.currentTime = target; } catch {}
        };
        bg.addEventListener('loadedmetadata', seekToStart, { once: true });
        bg.addEventListener('ended', () => { seekToStart(); bg.play().catch(() => {}); });
      }
    }
    if (bg) $('#bg').prepend(bg);
  }
  const fx = u.background.effect || 'none';
  if (['aurora','plasma','dither'].includes(fx)) $('#bg').classList.add('fx-' + fx);
  else if (fx !== 'none') $('#profile').classList.add('fx-' + fx);
  (u.floating || []).forEach((txt,i)=>{ const w=el('span',{class:'float-word'},txt); w.style.left=(8+(i*17)%82)+'%'; w.style.top=(10+(i*23)%75)+'%'; w.style.animationDelay=-(i*1.7)+'s'; $('#floatLayer').append(w); });

  // Profil-Karte
  const p = $('#profile');
  const showBanner = s.showBanner && (d.banner || d.bannerColor);
  const bannerHeight=Math.max(72,Math.min(260,Number(s.bannerHeight||120)));p.style.setProperty('--banner-h',bannerHeight+'px');
  if (showBanner) { p.classList.add('has-banner'); p.append(el('div', { class: 'banner', style: d.banner ? `background-image:url("${d.banner}")` : `background:${d.bannerColor}` })); }

  const avatar = el('div', { class: `avatar avatar-frame-${des.avatarFrameEffect || 'glow'} avatar-shape-${des.avatarShape || 'circle'}` }, el('img', { class: 'pfp', src: d.avatar, alt: '' }));
  if (s.showDecoration && d.decoration) avatar.append(el('img', { class: 'deco', src: d.decoration, alt: '' }));
  if (s.showStatus) avatar.append(el('span', { class: 'dot', id: 'dot' }));

  const chips = el('div', { class: 'chips' });
  const addChip = (icon, text) => text && chips.append(el('span', { class: 'chip' }, svg(PATH[icon]), text));
  addChip('tag', u.tags.label); addChip('pin', u.tags.location); addChip('cake', u.tags.age);
  if (s.showTag && d.serverTag) chips.append(el('span', { class: 'chip', title: 'Server-Tag' }, d.serverTag.badge ? el('img', { src: d.serverTag.badge, alt: '' }) : '', d.serverTag.tag));

  const name=el('h1',{},u.displayName); applyNameEffect(name,u); const info = el('div', { class: 'info' }, name, chips);
  const profileBadges = [];
  if (s.showBadges && Array.isArray(d.badges)) profileBadges.push(...d.badges.map(b => {
    const fb = el('span', { title: b.name }, b.emoji);
    const src = b.asset || (b.icon ? `https://cdn.discordapp.com/badge-icons/${b.icon}.png` : '');
    if (!src) return fb;
    const img = el('img', { src, alt: b.name });
    const w = el('span', { title: b.name }, img);
    img.onerror = () => w.replaceChildren(b.emoji);
    return w;
  }));
  if (u.platform?.premium && s.showPremiumBadge !== false) profileBadges.push(el('span', { class: 'platform-badge premium', title: 'Caruzo Premium' }, el('i',{},'✦'), 'Premium'));
  if (u.platform?.admin && s.showAdminBadge !== false) profileBadges.push(el('span', { class: 'platform-badge admin', title: 'Caruzo Admin' }, el('i',{},'◆'), 'Admin'));
  if (u.platform?.moderator && s.showModeratorBadge !== false) profileBadges.push(el('span', { class: 'platform-badge moderator', title: 'Caruzo Moderator' }, el('i',{},'◇'), 'Moderator'));
  if (profileBadges.length) info.append(el('div', { class: 'badges' }, profileBadges));
  const tl = el('div', { class: 'tagline', id: 'tagline' });
  info.append(tl);
  if (u.about) info.append(el('div', { class: 'btns' }, el('a', { class: 'btn', href: '#about' }, svg(PATH.user), 'About Me')));
  p.append(el('div', { class: 'inner' }, avatar, info));
  setupProfileHover(p, u);
  typewriter(tl, u.tagline);
  renderProfileReactions(u, p);

  // Highlights
  const highlightSection=$('#highlights'),highlightGrid=$('#highlightGrid');
  const highlights=(Array.isArray(u.highlights)?u.highlights:[]).filter(x=>x&&(x.label||x.value)).slice(0,6);
  if(highlights.length){
    highlightGrid.replaceChildren();
    highlights.forEach(x=>{
      const body=el('div',{class:'highlight-copy'},el('small',{},x.label||'Highlight'),el('b',{},x.value||'—'));
      const open=x.url?el('span',{class:'highlight-open'},svg(PATH.ext)):'';
      const children=[el('span',{class:'highlight-icon'},x.icon||'✦'),body,open];
      if(x.url){const a=el('a',{class:'highlight-card',href:x.url,target:'_blank',rel:'noopener noreferrer'},children);a.addEventListener('click',()=>trackProfileEvent(u,'highlight',x.id||x.label||'highlight'));highlightGrid.append(a)}else highlightGrid.append(el('div',{class:'highlight-card'},children));
    });
    highlightSection.hidden=false;
  }

  // Main Spotify profile card: show a branded loading shell immediately, then
  // attach Spotify's IFrame controller so Caruzo can request autoplay safely.
  const m = String(u.spotify || '').match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track)\/([A-Za-z0-9]+)/);
  if (m) {
    const sp = $('#spotify'), ss = u.spotifyStyle || {}, layout = (ss.layout || 'compact');
    sp.hidden = false;
    sp.dataset.kind = m[1]; sp.dataset.layout = layout;
    sp.style.setProperty('--spotify-blur', (ss.blur ?? 26) + 'px');
    sp.style.setProperty('--spotify-glow', Math.max(0, Math.min(1, (ss.glow ?? 24) / 100)));
    setupSpotifyEmbed(sp, m[1], m[2], layout);
  }


  if (s.showSpotifyNowPlaying !== false) startSpotifyNowPlaying(u.username);

  // Socials
  const grid = $('#grid');
  const icon = (slugName, color, tint) => {
    const wrap = el('div', { class: 'ico', style: tint ? `--tint:${tint}` : '' });
    const img = el('img', { src: `https://cdn.simpleicons.org/${slugName}/${color}`, alt: '' });
    img.addEventListener('error', () => { img.remove(); wrap.textContent = '◇'; });
    wrap.append(img);
    return wrap;
  };
  const card = (ico, title, sub, href, onclick, statKey='') => {
    const inner = [ico, el('div', { class: 't' }, el('b', {}, title), el('small', {}, sub)), href ? svg(PATH.ext, 'ext') : ''];
    if(href){const a=el('a',{class:'link',href,target:'_blank',rel:'noopener noreferrer'},inner);a.addEventListener('click',()=>trackProfileEvent(u,'social',statKey||title));return a}
    if(typeof onclick==='function')return el('button', { class: 'link', onclick }, inner);
    return el('div',{class:'link social-placeholder','aria-disabled':'true'},inner);
  };
  const isPlaceholder=v=>String(v||'').trim()==='@';
  const copyAccount=(label,value)=>{navigator.clipboard?.writeText(value);toast(label+' kopiert')};
  socialOrder(u).forEach(key=>{
    if(key==='discord') return grid.append(card(icon('discord', '5865F2', 'rgba(88,101,242,.16)'), 'Discord', d.username, null, () => { trackProfileEvent(u,'social','discord');navigator.clipboard?.writeText(d.username); toast('Discord-Name kopiert'); }));
    if(key==='steam') return u.links.steam.forEach((x, i) => grid.append(card(icon('steam', '66c0f4', 'rgba(102,192,244,.14)'), 'Steam', isPlaceholder(x.url)?'@':(x.name || host(x.url) || `Steam ${i+1}`), isPlaceholder(x.url)?null:x.url,null,'steam')));
    if(key==='custom') return u.links.custom.forEach(x => grid.append(card(el('div', { class: 'ico' }, svg(PATH.link, '')), x.label || 'Link', isPlaceholder(x.url)?'@':host(x.url), isPlaceholder(x.url)?null:x.url,null,'custom')));
    if(key==='discordServer' && u.links.discordServer) return grid.append(card(icon('discord','5865F2','rgba(88,101,242,.16)'),u.links.discordServerName||'Discord Server',isPlaceholder(u.links.discordServer)?'@':'Discord Server · beitreten',isPlaceholder(u.links.discordServer)?null:u.links.discordServer,null,'discordServer'));
    if(key==='spotifyProfile' && u.links.spotifyProfile) return grid.append(card(icon('spotify','1ED760','rgba(30,215,96,.14)'),'Spotify',isPlaceholder(u.links.spotifyProfile)?'@':'Spotify Profil',isPlaceholder(u.links.spotifyProfile)?null:u.links.spotifyProfile,null,'spotify'));
    if(key==='epic' && u.links.epic) return grid.append(card(icon('epicgames','ffffff','rgba(255,255,255,.08)'),'Epic Games',u.links.epic,null,isPlaceholder(u.links.epic)?null:()=>{trackProfileEvent(u,'social','epic');copyAccount('Epic Benutzername',u.links.epic)}));
    if(key==='valorant' && u.links.valorant) return grid.append(card(icon('valorant','ff4655','rgba(255,70,85,.14)'),'Valorant',u.links.valorant,null,isPlaceholder(u.links.valorant)?null:()=>{trackProfileEvent(u,'social','valorant');copyAccount('Valorant / Riot ID',u.links.valorant)}));
    const meta=SOCIAL_META[key], v=u.links[key];
    if(meta&&v) grid.append(card(icon(meta.icon,meta.color,meta.tint),meta.title,isPlaceholder(v)?'@':v.split('/').filter(Boolean).pop(),isPlaceholder(v)?null:v,null,key));
  });
  grid.querySelectorAll('.ico svg').forEach(s => { s.style.cssText = 'width:20px;height:20px;fill:#e9dde3'; });
  setupSocialHover(grid, des.socialEffect || 'lift');

  const views = $('#views');
  if (vs.visible === false) views.hidden = true; else {
    views.hidden = false; views.replaceChildren(el('span',{class:'viewEye'},'◉'),el('span',{class:'viewCount'},Number(u.views || 0).toLocaleString('de-CH')));
    const atBottom = vs.placement === 'page-bottom';
    views.className = `views ${atBottom ? 'page-bottom' : 'corner-' + (vs.corner || 'top-right')} view-${vs.effect || 'glow'}`;
    views.style.background = `rgba(15,10,12,${(vs.backgroundOpacity ?? 22)/100})`; views.style.borderColor = `rgba(255,255,255,${(vs.borderOpacity ?? 14)/100})`;
    views.querySelector('.viewEye').style.opacity=(vs.eyeOpacity ?? 92)/100; views.querySelector('.viewCount').style.opacity=(vs.countOpacity ?? 88)/100;
    if (!atBottom) p.append(views);
  }

  // Premium Status Card + custom sections
  renderPremiumStatusCard(u);
  renderPremiumSections(u);

  // About
  if (u.about) { $('#about').hidden = false; $('#aboutText').textContent = u.about; }

  // PC Specs · always placed at the bottom of the regular profile content.
  renderPcSpecs(u);

  // Musik / Video-Ton: Musik hat in 'auto' immer Vorrang.
  const video = document.querySelector('#bg video');
  const mode = u.soundMode || 'auto';
  const useMusic = !globalMute && !premiumPlaylistActive && !!u.music.url && (mode === 'auto' || mode === 'music');
  const useVideoSound = !globalMute && !premiumPlaylistActive && !!video && u.background.videoSound !== false && (mode === 'video' || (mode === 'auto' && !u.music.url));
  if (useMusic) setupMusic(u.music);
  if (video) { video.muted = !useVideoSound; video.volume = Math.max(0,Math.min(1,Number(u.background.videoVolume ?? 30)/100)); }
  if(premiumPlaylistActive)renderPremiumMusicPlayer(u);
  applyProfileLayout(u);

  // Status via Lanyard
  if (s.showStatus || s.showActivity) startPresenceSync(d.id, !!s.showStatus, !!s.showActivity);

  setupCursor(u.cursor || {});

  // Enter
  const enter = $('#enter');
  const go = () => {
    enter.classList.add('gone');
    profileEntered = true;
    requestPremiumPlaylistAutoplay(true);
    requestStandaloneSpotifyAutoplay();
    audio?.play().catch(() => {});
    try{youtubePlayer?.playVideo?.()}catch{}
    document.querySelector('#bg video')?.play().catch(() => {});
    commandBackgroundYouTube();
  };
  enter.onclick = go; enter.onkeydown = e => (e.key === 'Enter' || e.key === ' ') && go();
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&activeBackgroundYouTubePlayer()){
      applyBackgroundYouTubeAudio();
      try{
        const p=activeBackgroundYouTubePlayer(), st=p?.getPlayerState?.(), YT=window.YT;
        if([YT?.PlayerState?.PAUSED,YT?.PlayerState?.CUED].includes(st)){
          maskBackgroundYouTube(350);p.playVideo?.();revealBackgroundYouTubeWhenStable(backgroundYouTubeActiveIndex,.35,2200);
        }
      }catch{}
    }
  },{passive:true});


}



let spotifyNowTimer=0;
function formatSpotifyTime(ms){const s=Math.max(0,Math.floor(Number(ms||0)/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
function renderSpotifyNow(data){
  const box=$('#spotifyNow');if(!box)return;
  if(!data?.active){box.hidden=true;box.replaceChildren();return}
  box.hidden=false;box.classList.toggle('paused',!data.isPlaying);
  const cover=data.image?el('img',{class:'spotify-now-cover',src:data.image,alt:''}):el('div',{class:'spotify-now-cover',style:'background:#171717'});
  const kicker=el('span',{class:'spotify-now-kicker'},data.isPlaying?'Now playing via Discord':'Spotify activity');
  const title=el('b',{class:'spotify-now-title'},data.name||'Spotify');
  const artists=el('span',{class:'spotify-now-artists'},(data.artists||[]).join(', '));
  const album=data.album?el('span',{class:'spotify-now-album'},data.album):'';
  const progress=el('div',{class:'spotify-now-progress',title:`${formatSpotifyTime(data.progressMs)} / ${formatSpotifyTime(data.durationMs)}`},el('i'));
  const pct=data.durationMs?Math.max(0,Math.min(100,Number(data.progressMs||0)/Number(data.durationMs)*100)):0;progress.querySelector('i').style.width=pct+'%';
  const info=el('div',{class:'spotify-now-info'},kicker,title,artists,album,progress);
  const open=data.url?el('a',{class:'spotify-now-open',href:data.url,target:'_blank',rel:'noopener noreferrer',title:'Auf Spotify öffnen'},svg(PATH.ext)):el('span');
  box.replaceChildren(cover,info,open);
}
async function refreshSpotifyNow(username){
  try{const r=await fetch('/api/spotify/now/'+encodeURIComponent(username)+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return renderSpotifyNow(null);renderSpotifyNow(await r.json())}catch{renderSpotifyNow(null)}
}
function startSpotifyNowPlaying(username){clearInterval(spotifyNowTimer);refreshSpotifyNow(username);spotifyNowTimer=setInterval(()=>refreshSpotifyNow(username),15000)}

function setupProfileHover(card,u){
  const d=u.design||{}, preset=d.profileHover||'tilt';
  if(preset==='none'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  card.classList.add('hover-reactive');
  card.style.setProperty('--hover-a',Math.min(.24,(Number(d.hoverGlow??35))/420));
  const layer=el('div',{class:'profile-hover-layer','aria-hidden':'true'});card.append(layer);
  const k=Math.max(0,Math.min(1,Number(d.hoverIntensity??55)/100));
  let frame=0;
  const reset=()=>{cancelAnimationFrame(frame);card.style.transform='';card.style.filter='';card.style.boxShadow='';card.style.setProperty('--hover-x','50%');card.style.setProperty('--hover-y','50%')};
  card.addEventListener('pointermove',e=>{
    const r=card.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;
    card.style.setProperty('--hover-x',((nx+.5)*100)+'%');card.style.setProperty('--hover-y',((ny+.5)*100)+'%');
    cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      let rx=0,ry=0,tx=0,ty=0,scale=1;
      if(['tilt','depth','prism','snap-tilt','micro-parallax'].includes(preset)){rx=-ny*9*k;ry=nx*12*k;scale=1+.008*k}
      if(preset==='soft-follow'){tx=nx*11*k;ty=ny*8*k;rx=-ny*2.4*k;ry=nx*3.2*k}
      if(preset==='magnetic'){tx=nx*22*k;ty=ny*15*k;scale=1+.006*k}
      if(preset==='spotlight'){rx=-ny*2.2*k;ry=nx*2.2*k}
      if(preset==='depth'){tx=nx*6*k;ty=ny*5*k;rx*=1.18;ry*=1.18;scale=1+.014*k}
      if(preset==='float-zoom'){tx=nx*8*k;ty=ny*7*k;rx=-ny*2.2*k;ry=nx*2.2*k;scale=1+.022*k}
      if(preset==='elastic'){tx=nx*26*k;ty=ny*18*k;rx=-ny*3.4*k;ry=nx*4.6*k;scale=1+.007*k}
      if(preset==='glow-track'){rx=-ny*1.6*k;ry=nx*1.6*k;scale=1+.006*k}
      if(preset==='micro-parallax'){tx=nx*4*k;ty=ny*4*k;rx*=.55;ry*=.55;scale=1+.004*k}
      if(preset==='snap-tilt'){rx=Math.round(rx/2)*2;ry=Math.round(ry/2)*2;scale=1+.01*k}
      card.style.transform=`perspective(980px) translate3d(${tx}px,${ty}px,0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
      if(preset==='prism')card.style.filter=`hue-rotate(${nx*22*k}deg) saturate(${1+k*.22})`;
      const glow=Math.max(0,Number(d.hoverGlow??35))/100;
      const glowBoost=preset==='glow-track'?1.55:1;
      card.style.boxShadow=`0 30px 90px rgba(0,0,0,.34),${-nx*18}px ${-ny*14}px ${32+glow*34}px color-mix(in srgb,var(--accent) ${Math.round((12+glow*24)*glowBoost)}%,transparent)`;
    });
  },{passive:true});
  card.addEventListener('pointerleave',reset);
}

function setupSocialHover(grid,effect){
  if(!['tilt','magnetic'].includes(effect)||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  grid.querySelectorAll('.link').forEach(link=>{
    link.addEventListener('pointermove',e=>{
      const r=link.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;
      if(effect==='tilt')link.style.transform=`perspective(650px) rotateX(${-ny*7}deg) rotateY(${nx*9}deg) translateY(-3px)`;
      else link.style.transform=`translate3d(${nx*10}px,${ny*7}px,0) scale(1.012)`;
      link.style.borderColor='color-mix(in srgb,var(--accent) 48%,rgba(255,255,255,.12))';
    },{passive:true});
    link.addEventListener('pointerleave',()=>{link.style.transform='';link.style.borderColor=''});
  });
}

function setupAmbientCanvas(fx){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const bg=$('#bg'),canvas=el('canvas',{class:'ambient-canvas','aria-hidden':'true'}),ctx=canvas.getContext('2d',{alpha:true});
  bg.append(canvas);
  const toRgb=hex=>{const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex||'');return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[139,92,246]};
  const c1=toRgb(fx.color||'#8b5cf6'),c2=toRgb(fx.secondary||'#ff2e93');
  const alpha=Math.max(.04,Math.min(.8,Number(fx.opacity??18)/100)),density=Math.max(16,Math.min(96,Number(fx.density??44))),speed=Math.max(2,Math.min(30,Number(fx.speed??9)));
  let w=0,h=0,dpr=1,items=[],last=0,pointer={x:.5,y:.5};
  const rand=(a,b)=>a+Math.random()*(b-a);
  function resize(){
    dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    seed();
  }
  function seed(){
    items=[];
    if(fx.type==='matrix'){
      const step=Math.max(12,32-density*.18),cols=Math.ceil(w/step);items=Array.from({length:cols},(_,i)=>({x:i*step,y:rand(-h,0),step,trail:Math.floor(rand(8,22))}));
    }else if(['halo','pulse-grid','ribbons','bubbles','trail','wavefield','lightscape'].includes(fx.type)){
      const count=Math.round((w*h/18000)*(density/32));
      items=Array.from({length:Math.max(18,Math.min(140,count))},()=>({x:rand(0,w),y:rand(0,h),r:rand(1,3.6),vx:rand(-.2,.2),vy:rand(-.16,.16),phase:rand(0,Math.PI*2),life:rand(.4,1),amp:rand(12,40)}));
    }else{
      const count=Math.round((w*h/12000)*(density/44));
      items=Array.from({length:Math.max(28,Math.min(220,count))},()=>({x:rand(0,w),y:rand(0,h),r:fx.type==='snow'?rand(1,3.2):rand(.7,2.2),vx:rand(-.16,.16),vy:fx.type==='snow'?rand(.25,.85):rand(-.18,.18),phase:rand(0,Math.PI*2)}));
    }
  }
  function rgba(c,a){return `rgba(${c[0]},${c[1]},${c[2]},${a})`}
  const glyphs='01アイウエオカキクケコサシスセソタチツテトABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function draw(t){
    const dt=Math.min(40,t-last||16);last=t;ctx.clearRect(0,0,w,h);
    const rate=10/speed;
    if(fx.type==='matrix'){
      ctx.font=`${Math.max(11,15-density*.02)}px JetBrains Mono, monospace`;ctx.textAlign='center';
      items.forEach((it,idx)=>{
        for(let j=0;j<it.trail;j++){
          const yy=it.y-j*17;if(yy<0||yy>h)continue;
          const a=alpha*(1-j/it.trail)*(.42+(j===0?.58:0));ctx.fillStyle=rgba(idx%3===0?c2:c1,a);
          ctx.fillText(glyphs[(idx*7+j+Math.floor(t/120))%glyphs.length],it.x,yy);
        }
        it.y+=dt*.055*rate*(1+(idx%5)*.08);if(it.y-it.trail*17>h)it.y=rand(-180,-20);
      });
    }else if(fx.type==='snow'){
      items.forEach(it=>{it.phase+=dt*.0015;it.x+=Math.sin(it.phase)*.18*rate;it.y+=it.vy*dt*.045*rate;if(it.y>h+8){it.y=-8;it.x=rand(0,w)};ctx.beginPath();ctx.fillStyle=rgba(c1,alpha*rand(.55,1));ctx.shadowBlur=8;ctx.shadowColor=rgba(c1,alpha);ctx.arc(it.x,it.y,it.r,0,Math.PI*2);ctx.fill()});ctx.shadowBlur=0;
    }else if(fx.type==='halo'){
      const px=pointer.x*w, py=pointer.y*h;
      const rg=ctx.createRadialGradient(px,py,0,px,py,Math.max(w,h)*.35);rg.addColorStop(0,rgba(c1,alpha*1.4));rg.addColorStop(.45,rgba(c2,alpha*.5));rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,w,h);
      items.forEach(it=>{it.phase+=dt*.002*rate;const ox=Math.cos(it.phase)*it.amp*.18,oy=Math.sin(it.phase*1.2)*it.amp*.18;ctx.beginPath();ctx.fillStyle=rgba(it.r>2?c2:c1,alpha*.6);ctx.arc(it.x+ox,it.y+oy,it.r,0,Math.PI*2);ctx.fill()});
    }else if(fx.type==='pulse-grid'){
      const step=Math.max(26,70-density*.35), ox=(pointer.x-.5)*step, oy=(pointer.y-.5)*step;ctx.lineWidth=1;
      for(let x=-step*2;x<w+step*2;x+=step){ctx.strokeStyle=rgba(c1,alpha*.45);ctx.beginPath();ctx.moveTo(x+ox,-20);ctx.lineTo(x-ox*.35,h+20);ctx.stroke()}
      for(let y=-step*2;y<h+step*2;y+=step){ctx.strokeStyle=rgba(c2,alpha*.24);ctx.beginPath();ctx.moveTo(-20,y+oy);ctx.lineTo(w+20,y-oy*.35);ctx.stroke()}
    }else if(fx.type==='ribbons'){
      for(let i=0;i<4;i++){
        ctx.beginPath(); const baseY=h*(.2+i*.18)+Math.sin(t*.00035*rate+i)*18; ctx.moveTo(-40,baseY);
        for(let x=0;x<=w+40;x+=24){const y=baseY+Math.sin(x*.008+t*.001*rate+i*1.7)*18+(pointer.y-.5)*22;ctx.lineTo(x,y)}
        ctx.strokeStyle=rgba(i%2?c2:c1,alpha*(.35+i*.03)); ctx.lineWidth=8-i; ctx.stroke();
      }
    }else if(fx.type==='bubbles'){
      items.forEach(it=>{it.y-=dt*.03*rate*(.5+it.r*.15);it.x+=Math.sin(it.phase+t*.001)*.22; if(it.y<-16){it.y=h+16;it.x=rand(0,w)}; ctx.beginPath(); ctx.strokeStyle=rgba(it.r>2?c2:c1,alpha*.55); ctx.lineWidth=1; ctx.arc(it.x,it.y,it.r*4.4,0,Math.PI*2); ctx.stroke();});
    }else if(fx.type==='trail'){
      const px=pointer.x*w, py=pointer.y*h;
      items.forEach((it,i)=>{it.phase+=dt*.002*rate; const tx=px+Math.cos(it.phase+i)*it.amp, ty=py+Math.sin(it.phase*1.15+i)*it.amp; ctx.strokeStyle=rgba(i%3?c1:c2,alpha*.26); ctx.beginPath(); ctx.moveTo(it.x,it.y); ctx.lineTo(tx,ty); ctx.stroke(); it.x+=(tx-it.x)*.035; it.y+=(ty-it.y)*.035; ctx.beginPath(); ctx.fillStyle=rgba(c1,alpha*.8); ctx.arc(it.x,it.y,1.2+it.r*.4,0,Math.PI*2); ctx.fill()});
    }else if(fx.type==='wavefield'){
      const rows=Math.max(6,Math.round(density/8)); ctx.lineWidth=1.2;
      for(let r=0;r<rows;r++){
        const yBase=(h/(rows+1))*(r+1); ctx.beginPath(); ctx.moveTo(0,yBase);
        for(let x=0;x<=w;x+=18){const y=yBase+Math.sin(x*.012+t*.0011*rate+r*.7)*10+(pointer.x-.5)*18*Math.sin(r*.5+t*.0005); ctx.lineTo(x,y)}
        ctx.strokeStyle=rgba(r%2?c2:c1,alpha*.45); ctx.stroke();
      }
    }else if(fx.type==='lightscape'){
      for(let i=0;i<7;i++){
        const x=(i/6)*w+(pointer.x-.5)*30, width=w*.08, grad=ctx.createLinearGradient(x,0,x,h); grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(.5,rgba(i%2?c2:c1,alpha*.55)); grad.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=grad; ctx.fillRect(x-width*.5,0,width,h);
      }
    }else{
      items.forEach(it=>{it.x+=it.vx*dt*.05*rate;it.y+=it.vy*dt*.05*rate;if(it.x<-10)it.x=w+10;if(it.x>w+10)it.x=-10;if(it.y<-10)it.y=h+10;if(it.y>h+10)it.y=-10;ctx.beginPath();ctx.fillStyle=rgba(c1,alpha*.85);ctx.arc(it.x,it.y,it.r,0,Math.PI*2);ctx.fill()});
      if(fx.type==='constellation'){
        ctx.lineWidth=.6;
        for(let i=0;i<items.length;i++)for(let j=i+1;j<Math.min(items.length,i+18);j++){const a=items[i],b=items[j],dx=a.x-b.x,dy=a.y-b.y,dist=Math.hypot(dx,dy);if(dist<115){ctx.strokeStyle=rgba((i+j)%4===0?c2:c1,alpha*(1-dist/115)*.36);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
      }else{
        items.forEach((it,i)=>{if(i%5===0){ctx.beginPath();ctx.strokeStyle=rgba(c2,alpha*.22);ctx.arc(it.x,it.y,it.r*4.5,0,Math.PI*2);ctx.stroke()}});
      }
    }
    requestAnimationFrame(draw);
  }
  addEventListener('resize',resize,{passive:true});
  addEventListener('pointermove',e=>{pointer.x=e.clientX/Math.max(1,innerWidth);pointer.y=e.clientY/Math.max(1,innerHeight)},{passive:true});
  resize();requestAnimationFrame(draw);
}

function applyNameEffect(node,u){
  const d=u.design||{}; node.style.color=d.nameColor||'#f6eff2';
  if(d.nameEffect==='gradient')node.classList.add('name-gradient');
  if(d.nameEffect==='neon')node.classList.add('name-neon');
  if(d.nameEffect==='toon')node.classList.add('name-toon');
  if(d.nameEffect==='rubber')node.classList.add('name-rubber');
  if(d.nameEffect==='chrome')node.classList.add('name-chrome');
  if(d.nameEffect==='shimmer')node.classList.add('name-shimmer');
  if(d.nameEffect==='glitch')node.classList.add('name-glitch');
  if(d.nameEffect==='wave')node.classList.add('name-wave');
  if(d.nameEffect==='typewriter')typewriter(node,u.displayName);
}
function setupBrowserTab(u){
  const b=u.browser||{}, msgs=(b.messages||[]).filter(Boolean); if(!msgs.length)return;
  let i=0,pos=0,dir=1; const speed=Number(b.speed)||1500;
  if(b.effect==='rotate') return setInterval(()=>document.title=msgs[i++%msgs.length],speed);
  if(b.effect==='pulse') return setInterval(()=>{const m=msgs[i++%msgs.length];document.title=m+' '+'.'.repeat((i%3)+1)},speed);
  if(b.effect==='marquee'){let text=msgs.join('   ✦   ')+'   ';return setInterval(()=>{text=text.slice(1)+text[0];document.title=text.slice(0,28)},Math.max(120,speed/8));}
  const tick=()=>{const m=msgs[i%msgs.length];document.title=m.slice(0,pos);pos+=dir;if(pos>m.length){dir=-1;setTimeout(tick,speed)}else if(pos<0){dir=1;pos=0;i++;setTimeout(tick,350)}else setTimeout(tick,90)};tick();
}
function setupCursor(c){
  const image=String(c.image||'system');
  if(c.svg&&c.svg.startsWith('data:image/svg+xml')){
    document.body.style.cursor=`url("${c.svg}"), auto`;
  }else if(image!=='system'){
    document.body.classList.add('custom-pointer-on');
    const pointer=el('span',{class:'custom-pointer '+image,'aria-hidden':'true'});document.body.append(pointer);
    let px=innerWidth/2,py=innerHeight/2,tx=px,ty=py,raf=0;
    const animate=()=>{px+=(tx-px)*.36;py+=(ty-py)*.36;pointer.style.left=px+'px';pointer.style.top=py+'px';raf=requestAnimationFrame(animate)};raf=requestAnimationFrame(animate);
    addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;pointer.style.opacity='1'},{passive:true});
    addEventListener('pointerleave',()=>pointer.style.opacity='0',{passive:true});
    addEventListener('pointerenter',()=>pointer.style.opacity='1',{passive:true});
    addEventListener('pointerdown',()=>{pointer.style.width='13px';pointer.style.height='13px'},{passive:true});
    addEventListener('pointerup',()=>{pointer.style.width='';pointer.style.height=''},{passive:true});
    addEventListener('beforeunload',()=>cancelAnimationFrame(raf),{once:true});
  }
  if(!c.effect||c.effect==='none'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let last=0, hue=190;
  const glyph={spark:'✦',snow:'❄',hearts:'♥',fire:'✦',magic:'✧',orbit:'◌',matrix:'▪',comet:'◆',ripple:'◯',bubbles:'○',cyber:'◇',twinkle:'✦'};
  addEventListener('pointermove',e=>{
    const now=performance.now(); if(now-last<24)return; last=now; hue=(hue+7)%360;
    const p=document.createElement('span');
    if(c.effect==='trail'||c.effect==='comet'){
      p.className='cursor-trail-dot';p.style.color=`hsl(${hue} 90% 65%)`;
      if(c.effect==='comet'){p.style.width='10px';p.style.height='4px';p.style.borderRadius='999px';p.style.transform='translate(-50%,-50%) rotate(-24deg)';}
    } else {
      p.className='cursor-particle';p.textContent=glyph[c.effect]||'✦';p.style.color=`hsl(${hue} 92% 68%)`;p.style.textShadow='0 0 12px currentColor';
      let size=10+Math.random()*8;
      if(c.effect==='matrix')size=8;
      if(c.effect==='ripple'){size=20+Math.random()*9;p.style.fontWeight='200';p.style.opacity='.65'}
      if(c.effect==='bubbles'){size=12+Math.random()*16;p.style.opacity='.55'}
      if(c.effect==='cyber'){size=8+Math.random()*8;p.style.transform='translate(-50%,-50%) rotate(45deg)'}
      if(c.effect==='twinkle'){size=9+Math.random()*13}
      p.style.fontSize=size+'px';
    }
    p.style.left=(e.clientX+(c.effect==='bubbles'?(Math.random()-.5)*18:0))+'px';
    p.style.top=(e.clientY+(c.effect==='bubbles'?(Math.random()-.5)*18:0))+'px';
    document.body.append(p);setTimeout(()=>p.remove(),900);
  },{passive:true});
}
function typewriter(node, text) {
  if (!text) return node.remove();
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return node.textContent = text;
  let i = 0, dir = 1;
  (function tick() {
    node.textContent = text.slice(0, i);
    i += dir;
    let wait = 70;
    if (i > text.length) { dir = -1; wait = 2200; }
    else if (i < 0) { dir = 1; i = 0; wait = 600; }
    setTimeout(tick, wait);
  })();
}

function silenceSiteSoundForSpotify(){
  spotifyPlaying = true;
  if (audio && !audio.paused) audio.pause();
  try{youtubePlayer?.pauseVideo?.()}catch{}
  const video=document.querySelector('#bg video');
  if(video && !video.muted){video.muted=true;video.dataset.spotifyMuted='1'}
}
function getSpotifyIframeApi(){
  if(window.__caruzoSpotifyApi)return Promise.resolve(window.__caruzoSpotifyApi);
  if(spotifyApiPromise)return spotifyApiPromise;
  spotifyApiPromise=new Promise((resolve,reject)=>{
    const previous=window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady=api=>{window.__caruzoSpotifyApi=api;try{previous?.(api)}catch{}resolve(api)};
    if(!document.querySelector('script[data-caruzo-spotify-api]')){
      const sc=document.createElement('script');sc.src='https://open.spotify.com/embed/iframe-api/v1';sc.async=true;sc.dataset.caruzoSpotifyApi='1';sc.onerror=()=>reject(new Error('Spotify API konnte nicht geladen werden'));document.head.append(sc);
    }
    setTimeout(()=>{if(!window.__caruzoSpotifyApi)reject(new Error('Spotify API Timeout'))},2500);
  });
  return spotifyApiPromise;
}
function requestStandaloneSpotifyAutoplay(){
  if(globalMute||premiumPlaylistActive||!standaloneSpotifyAutoplayWanted)return;
  try{const r=standaloneSpotifyController?.play?.();if(r?.catch)r.catch(()=>{})}catch{}
}
function setupSpotifyEmbed(shell,kind,id,layout){
  const height=kind==='track'?(layout==='full'?352:152):(layout==='full'?420:352);
  const target=el('div',{class:'spotify-target'});target.style.minHeight=height+'px';
  // Show the real Spotify player immediately instead of a Caruzo loading message.
  target.append(el('iframe',{
    src:`https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`,loading:'eager',fetchpriority:'high',
    allow:'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',allowfullscreen:'',title:'Spotify',height:String(height)
  }));
  shell.append(target);
  standaloneSpotifyController=null;standaloneSpotifyAutoplayWanted=true;
  getSpotifyIframeApi().then(api=>{
    api.createController(target,{uri:`spotify:${kind}:${id}`,width:'100%',height},controller=>{
      standaloneSpotifyController=controller;
      controller.addListener?.('playback_update',e=>{if(e?.data?.isPaused===false){silenceSiteSoundForSpotify();trackProfileEvent(playlistUser||{username:path},'music_play','spotify')}});
      // Best-effort autoplay immediately; the click-to-enter gesture retries it synchronously.
      setTimeout(requestStandaloneSpotifyAutoplay,20);
    });
  }).catch(()=>{
    // Keep the official embed already on screen if Spotify's controller API fails or is slow.
  });
}
let youtubeApiPromise=null,youtubePlayer=null;
function getYouTubeApi(){
  if(window.YT?.Player) return Promise.resolve(window.YT);
  if(youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise=new Promise((resolve,reject)=>{
    const prev=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{try{prev?.()}catch{} resolve(window.YT)};
    if(!document.querySelector('script[data-caruzo-yt-api]')){
      const sc=document.createElement('script');sc.src='https://www.youtube.com/iframe_api';sc.async=true;sc.dataset.caruzoYtApi='1';sc.onerror=()=>reject(new Error('YouTube API konnte nicht geladen werden'));document.head.append(sc);
    }
    setTimeout(()=>{if(!window.YT?.Player)reject(new Error('YouTube API Timeout'))},9000);
  });
  return youtubeApiPromise;
}
function renderPremiumStatusCard(u){
  const host=$('#premiumStatusCard');if(!host)return;host.replaceChildren();host.hidden=true;const sc=u.platform?.premium?u.premiumStatusCard:null;if(!sc||sc.enabled!==true)return;
  if(sc.expiresAt){const end=new Date(sc.expiresAt).getTime();if(Number.isFinite(end)&&end<=Date.now())return;}
  const root=el('div',{class:'premium-status-card '+(sc.style||'glass')});root.style.setProperty('--sc',/^#[0-9a-f]{6}$/i.test(sc.accent||'')?sc.accent:'#8b5cf6');
  const icon=el('span',{class:'psc-icon'});if(/^https:\/\/cdn\.discordapp\.com\/emojis\//i.test(sc.iconUrl||''))icon.append(el('img',{src:sc.iconUrl,alt:''}));else icon.textContent=sc.icon||'✨';const copy=el('div',{class:'psc-copy'},el('span',{class:'psc-eye'},sc.eyebrow||'STATUS'),el('b',{class:'psc-title'},sc.title||'Status'));root.append(el('div',{class:'psc-top'},icon,copy));if(sc.text)root.append(el('p',{class:'psc-text'},sc.text));
  if(sc.showCountdown&&sc.expiresAt){const out=el('span',{class:'psc-countdown'});root.append(out);const update=()=>{const ms=new Date(sc.expiresAt).getTime()-Date.now();if(ms<=0){host.hidden=true;return}const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000);out.textContent=d>0?`${d}d ${h}h ${m}m`:`${h}h ${m}m`;};update();setInterval(update,60000);}
  host.append(root);host.hidden=false;
}
function renderPremiumSections(u){
  const host=$('#premiumCustom'),list=$('#premiumSectionsList');if(!host||!list)return;
  const sections=u.platform?.premium&&Array.isArray(u.premiumSections)?u.premiumSections:[];
  list.replaceChildren();
  sections.forEach(sec=>{
    const section=el('div',{class:'premium-custom-section'}),title=el('h2',{},sec.title||'Section');section.append(title);
    if(sec.type==='gallery'){
      const images=(Array.isArray(sec.images)?sec.images:[]).filter(Boolean);if(!images.length)return;
      const gallery=el('div',{class:'premium-gallery'});images.forEach(src=>gallery.append(el('div',{class:'premium-gallery-item'},el('img',{src,alt:'',loading:'lazy',draggable:'false'}))));section.append(gallery);
    }else{
      const tabs=Array.isArray(sec.tabs)&&sec.tabs.length?sec.tabs:[{label:'About Me',text:sec.text||'',fields:[]}];
      if(!tabs.some(t=>t.text||(Array.isArray(t.fields)&&t.fields.some(f=>f.label||f.value))))return;
      const box=el('div',{class:'premium-tabbed'}),nav=el('div',{class:'premium-tabs'}),panel=el('div',{class:'premium-tab-panel'});
      const show=i=>{[...nav.children].forEach((b,n)=>b.classList.toggle('on',n===i));const tab=tabs[i]||tabs[0];panel.replaceChildren();const fields=(Array.isArray(tab.fields)?tab.fields:[]).filter(f=>f.label||f.value).slice(0,4);if(fields.length){const grid=el('div',{class:'premium-info-grid'});fields.forEach(f=>grid.append(el('div',{class:'premium-info-cell'},el('small',{},f.label||'INFO'),el('b',{},f.value||'—'))));panel.append(grid)}if(tab.text)panel.append(el('div',{class:'premium-tab-copy'},tab.text));};
      tabs.forEach((tab,i)=>{const b=el('button',{class:'premium-tab'+(i===0?' on':''),type:'button'},tab.label||`Tab ${i+1}`);b.onclick=()=>show(i);nav.append(b)});box.append(nav,panel);show(0);section.append(box);
    }
    list.append(section);
  });
  host.hidden=!list.children.length;
}


async function setupMusic(m) {
  const startVolume = Number.isFinite(Number(m.volume)) ? Number(m.volume) : 30;
  const icon = $('#ppIcon'), player=$('#player'), providerIcon=$('#playerProviderIcon'), providerName=$('#trackProviderName'), track=$('#trackName');
  $('#player').style.display = 'flex';
  const provider=musicProviderInfo(m.url), storedTitle=String(m.title||'').trim();
  player.dataset.provider=provider.key;providerName.textContent=provider.name;
  if(providerIcon){providerIcon.src=provider.asset||'';providerIcon.hidden=!provider.asset}
  track.textContent = storedTitle || (provider.key==='youtube'?'YouTube Audio':'Audio');
  if(provider.key!=='audio') resolveMediaMeta(m.url).then(meta=>{if(meta&&(!storedTitle||genericSourceTitle(storedTitle)))track.textContent=meta.title||provider.name});
  $('#vol').value = startVolume;
  const ytId = extractYouTubeId(m.url);
  if(ytId){
    const mount = el('div',{id:'ytAudioMount',hidden:''}); document.body.append(mount);
    try{
      const YT = await getYouTubeApi();
      youtubePlayer = new YT.Player('ytAudioMount', {
        width: '1', height: '1', videoId: ytId,
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: ytId, modestbranding: 1, playsinline: 1, rel: 0, start: 0 },
        events: {
          onReady: ev => { try{ev.target.setVolume(startVolume);if(profileEntered)ev.target.playVideo()}catch{} },
          onStateChange: ev => {
            if(ev.data===YT.PlayerState.PLAYING){ if(spotifyPlaying){try{ev.target.pauseVideo()}catch{}; return} icon.setAttribute('d', PATH.pause); }
            if([YT.PlayerState.PAUSED,YT.PlayerState.ENDED,YT.PlayerState.CUED].includes(ev.data)) icon.setAttribute('d', PATH.play);
          }
        }
      });
      $('#vol').oninput = e => { try{youtubePlayer?.setVolume(Number(e.target.value)||0)}catch{} };
      $('#pp').onclick = () => {
        if(spotifyPlaying){toast('Spotify läuft · Hintergrundmusik bleibt pausiert');return}
        try{
          const state=youtubePlayer?.getPlayerState?.();
          if(state===YT.PlayerState.PLAYING) youtubePlayer.pauseVideo(); else youtubePlayer.playVideo();
        }catch{}
      };
      return;
    }catch{}
  }
  audio = new Audio(m.url); audio.loop = true; audio.volume = Math.max(0,Math.min(1,startVolume/100));
  $('#vol').oninput = e => audio.volume = e.target.value / 100;
  $('#pp').onclick = () => { if(spotifyPlaying){toast('Spotify läuft · Hintergrundmusik bleibt pausiert');return} audio.paused ? audio.play() : audio.pause(); };
  audio.onplay = () => { if(spotifyPlaying){audio.pause();return} icon.setAttribute('d', PATH.pause); };
  audio.onpause = () => icon.setAttribute('d', PATH.play);
}

function renderActivity(data) {
  const box = $('#activity'); if (!box) return;
  const acts = Array.isArray(data?.activities) ? data.activities : [];
  // Prefer a game/stream/watch activity. Spotify is used as fallback.
  const primary = acts.find(a => a && a.type !== 4 && String(a.name || '').toLowerCase() !== 'spotify')
    || acts.find(a => a && a.type !== 4);
  if (!primary) { box.hidden = true; box.replaceChildren(); return; }
  const labels = {0:'Spielt gerade',1:'Streamt gerade',2:'Hört gerade',3:'Schaut gerade',5:'Im Wettkampf'};
  const label = labels[primary.type] || 'Aktivität';
  const detail = [primary.details, primary.state].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');
  const gamepad = svg('M7 6h10a5 5 0 014.7 6.7l-1.4 4.1a2.3 2.3 0 01-3.7 1l-2.1-1.8h-5l-2.1 1.8a2.3 2.3 0 01-3.7-1l-1.4-4.1A5 5 0 017 6zm1 4H6v2H4v2h2v2h2v-2h2v-2H8v-2zm8.7 1.3a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm2.6 2.6a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z');
  box.replaceChildren(
    el('div',{class:'activity-icon'},gamepad),
    el('div',{class:'activity-copy'},el('small',{},label),el('b',{},primary.name || 'Discord Activity'),detail?el('span',{},detail):''),
    el('div',{class:'activity-live'},el('i'), 'LIVE')
  );
  box.hidden = false;
}
function applyPresence(data,showStatus=true,showActivity=false){
  const status=String(data?.discord_status||'offline').toLowerCase();
  const [color,label]=STATUS[status]||STATUS.offline;
  document.documentElement.style.setProperty('--st',color);document.querySelector('.avatar')?.style.setProperty('--st',color);
  const st=$('#status');if(showStatus){st.style.display='inline-flex';st.textContent=label;st.dataset.state=status}else st.style.display='none';
  if(showActivity)renderActivity(data);else{const box=$('#activity');if(box){box.hidden=true;box.replaceChildren()}}
}
async function pollStatus(id,showStatus=true,showActivity=false){
  try{const resp=await fetch('/api/presence/'+encodeURIComponent(id)+'?t='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});const r=await resp.json();if(r.success)applyPresence(r.data,showStatus,showActivity)}catch{}
}
function startLanyardPresenceSocket(id,showStatus,showActivity){
  let ws=null,hb=null,retry=null,closed=false;
  const connect=()=>{if(closed)return;try{ws=new WebSocket('wss://api.lanyard.rest/socket')}catch{return schedule()}
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.op===1){clearInterval(hb);const every=Number(m.d?.heartbeat_interval||30000);hb=setInterval(()=>{if(ws?.readyState===1)ws.send(JSON.stringify({op:3}))},every);ws.send(JSON.stringify({op:2,d:{subscribe_to_id:String(id)}}));return}if((m.t==='INIT_STATE'||m.t==='PRESENCE_UPDATE')&&m.d)applyPresence({...m.d,source:'lanyard-live'},showStatus,showActivity)};
    ws.onclose=()=>{clearInterval(hb);hb=null;schedule()};ws.onerror=()=>{try{ws.close()}catch{}};
  };
  const schedule=()=>{if(closed||retry)return;retry=setTimeout(()=>{retry=null;connect()},5000)};connect();
  addEventListener('beforeunload',()=>{closed=true;clearInterval(hb);clearTimeout(retry);try{ws?.close()}catch{}},{once:true});
}
function startPresenceSync(id,showStatus=true,showActivity=false){
  // Single source of truth: our server merges Discord Gateway + Lanyard fallback.
  // Avoid a second browser-side Lanyard socket overwriting a fresher Discord Gateway state.
  applyPresence({discord_status:'offline',activities:[]},showStatus,showActivity);
  pollStatus(id,showStatus,showActivity);
  setInterval(()=>pollStatus(id,showStatus,showActivity),5000);
}

