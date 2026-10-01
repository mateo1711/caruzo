/* Caruzo animierte Hintergründe – gemeinsame Engine für Hauptseite und Dashboard.
   Nutzung: CaruzoBG.mount('landing') bzw. CaruzoBG.mount('dashboard').
   Die Auswahl kommt von /api/site-settings und wird im Admin Panel geändert.
   17 Presets je Seite auf 10 GPU-Effektmodi, jeweils mit eigener Farbwelt, Helligkeit und Tempo. */
(function () {
  'use strict';
  var MODE_LABEL = ['Nebula', 'Topografie', 'Caustics', 'Halftone', 'Lichtstrahlen', 'Data Rain', 'Sonar', 'Mesh Gradient', 'Hex Grid', 'Bokeh'];
  // P(name, mode, [hell, akzent, dunkel], helligkeit, tempo, mitten-abdunklung)
  function P(n, m, c, i, sp, z) { return { name: n, mode: m, c: c, i: i, sp: sp, z: z }; }
  var PRESETS = {
    landing: {
      1: P('Nebula Violett',   0, ['#b79cff', '#ff4fd8', '#2a1466'], 1.0, 1.0, .25),
      2: P('Topo Rosé',        1, ['#ff7ab8', '#ff2e88', '#5a1236'], 1.0, 1.0, .25),
      3: P('Caustics Ozean',   2, ['#8ff3ff', '#2b9dff', '#06324a'], 1.0, 1.0, .25),
      4: P('Halftone Sunset',  3, ['#ffb454', '#ff3d81', '#4a1230'], 1.0, 1.0, .25),
      5: P('Lichtstrahlen Gold', 4, ['#ffe2a0', '#ff9a3c', '#3a2410'], 1.0, 1.0, .2),
      6: P('Data Rain',        5, ['#c8ffe0', '#22e58a', '#06301f'], 1.0, 1.0, .3),
      7: P('Sonar Blau',       6, ['#7fd0ff', '#3b6bff', '#0a1f52'], 1.0, 1.0, .2),
      8: P('Mesh Aurora',      7, ['#2bffc0', '#8b5cf6', '#ff3d9a'], 1.0, 1.0, .25),
      9: P('Hex Neon',         8, ['#ff4fd8', '#22e5ff', '#3a1060'], 1.0, 1.0, .25),
      10: P('Bokeh Nacht',     9, ['#ff8fc4', '#ffd27a', '#4a1030'], 1.0, 1.0, .2),
      11: P('Fluid Gradient',   7, ['#8fffe0', '#8b5cf6', '#ff66b7'], 1.04, .82, .18),
      12: P('Velvet Aurora',    0, ['#d7c4ff', '#ff7ad9', '#24134b'], .96, .72, .18),
      13: P('Liquid Glass',     2, ['#c4fbff', '#58b6ff', '#11294a'], .95, .65, .16),
      14: P('Prism Rays',       4, ['#fff1d5', '#ff89c9', '#30184d'], .94, .74, .14),
      15: P('Soft Radar',       6, ['#bfe8ff', '#7d8cff', '#151b48'], .90, .64, .18),
      16: P('Contour Bloom',    1, ['#ffe0ef', '#ff65a8', '#45152e'], .93, .66, .20),
      17: P('Glass Bokeh',      9, ['#d8fff5', '#c7a1ff', '#1f214d'], .94, .58, .14)
    },
    dashboard: {
      1: P('Nebula Indigo',    0, ['#8b5cf6', '#4f7bff', '#1a1050'], .85, .7, 1),
      2: P('Topo Graphit',     1, ['#c9c6e0', '#8b5cf6', '#221a44'], .95, .7, 1),
      3: P('Caustics Petrol',  2, ['#7fe8d8', '#2aa6c8', '#062e38'], .62, .7, 1),
      4: P('Halftone Violett', 3, ['#b9a4ff', '#7c5cf6', '#1c1240'], .8, .7, 1),
      5: P('Strahlen Eisblau', 4, ['#cfe6ff', '#5f9bff', '#0f2247'], .62, .7, 1),
      6: P('Data Mint',        5, ['#d2ffe9', '#3ddc97', '#06281c'], .58, .7, 1),
      7: P('Sonar Violett',    6, ['#c4b0ff', '#8b5cf6', '#1c1050'], .62, .7, 1),
      8: P('Mesh Twilight',    7, ['#5b7cff', '#b25cff', '#ff5c9e'], .62, .7, 1),
      9: P('Hex Cyan',         8, ['#5ee7ff', '#4d7cff', '#0c2a55'], .62, .7, 1),
      10: P('Bokeh Amber',     9, ['#ffd27a', '#ff8a3c', '#3a2010'], .62, .7, 1),
      11: P('Fluid Gradient',  7, ['#8cc8ff', '#8b5cf6', '#291f55'], .70, .56, .92),
      12: P('Midnight Aurora', 0, ['#9bb7ff', '#7d5cff', '#17132f'], .66, .52, .96),
      13: P('Liquid Slate',    2, ['#a8e9f0', '#4f8ca6', '#0f252c'], .58, .50, .96),
      14: P('Prism Graphite',  4, ['#e4ebff', '#7f8dff', '#14192c'], .60, .48, .96),
      15: P('Soft Sonar',      6, ['#b9a8ff', '#6d7cff', '#171537'], .56, .50, .98),
      16: P('Contour Smoke',   1, ['#d9d8ef', '#8b5cf6', '#1b1831'], .66, .48, .98),
      17: P('Bokeh Steel',     9, ['#cdd9ff', '#7c8cff', '#151b34'], .58, .46, .98)
    },
    login: {
      1: P('Invite Violet', 0, ['#c4b5fd','#8b5cf6','#180f35'], .72, .54, .82),
      2: P('Midnight Blue', 7, ['#7dd3fc','#3b82f6','#07172f'], .64, .48, .86),
      3: P('Rose Noir', 9, ['#f9a8d4','#ec4899','#2f0b1f'], .66, .48, .84),
      4: P('Emerald Gate', 6, ['#a7f3d0','#10b981','#06231a'], .60, .46, .88),
      5: P('Amber Signal', 4, ['#fde68a','#f59e0b','#2f1c05'], .62, .44, .86),
      6: P('Graphite Mesh', 7, ['#d4d4d8','#71717a','#111116'], .46, .42, .92),
      7: P('Cyan Terminal', 5, ['#a5f3fc','#06b6d4','#07232b'], .58, .48, .88),
      8: P('Aurora Glass', 2, ['#bae6fd','#a78bfa','#1d173c'], .64, .44, .82)
    }
  };

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  var FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R,M;uniform float T,S,E,K,I,Z;uniform vec3 A,B,C;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 h2(vec2 p){return vec2(h(p),h(p+37.7));}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.02+vec2(17.3,9.1);a*=.5;}return v;}

// 0 Nebula: fliessender Rauch (Domain Warping), Maus wirbelt
vec3 nebula(vec2 p,vec2 uv,vec2 m){
 vec2 q=p*1.5;q.y+=S*1.4;float t=T*.05;
 vec2 dm=p-m;float mw=E*exp(-dot(dm,dm)*7.);
 q+=vec2(-dm.y,dm.x)*mw*1.4;
 vec2 a=vec2(fbm(q+t),fbm(q+vec2(5.2,1.3)-t));
 vec2 b=vec2(fbm(q+3.*a+vec2(1.7,9.2)+t*1.3),fbm(q+3.*a+vec2(8.3,2.8)-t*1.1));
 float f=fbm(q+3.*b);
 vec3 col=mix(C,A,smoothstep(.25,.8,f));
 col=mix(col,B,smoothstep(.35,1.0,length(b))*.75);
 col*=smoothstep(.12,.80,f)*1.05+.05;
 return col*.78;}

// 1 Topografie: Hoehenlinien wie die Cover-Kunst, Maus formt Huegel
vec3 topo(vec2 p,vec2 uv,vec2 m){
 vec2 dm=p-m;
 float hg=fbm(p*1.35+vec2(T*.02,T*.012-S*1.1))*1.25+E*.40*exp(-dot(dm,dm)*8.);
 float v=hg*24.;
 float d=.5-abs(fract(v)-.5);
 float line=1.-smoothstep(0.,.075,d);
 float maj=1.-smoothstep(0.,.035,.5-abs(fract(v/5.)-.5));
 vec3 col=mix(B,A,clamp(hg*1.1,0.,1.))*line*(.48+1.0*maj);
 col+=C*hg*.55+B*exp(-d*7.)*.05;
 return col;}

// 2 Caustics: Licht unter Wasser
float caustic(vec2 p,float t){
 vec2 i=p;float c=1.;float inten=.006;
 for(int n=0;n<5;n++){float tt=t*(1.-(3.5/float(n+1)));
  i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
  c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
 c/=5.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}
vec3 caust(vec2 p,vec2 uv,vec2 m){
 vec2 dm=p-m;p+=dm*E*exp(-dot(dm,dm)*7.)*.35;
 vec2 cp=mod((p+vec2(0.,S*.6))*6.28318*.9,6.28318)-250.;
 float c=caustic(cp,T*.42+23.);
 c=clamp(c,0.,1.);
 vec3 col=C*(.55+.9*uv.y)+A*c*.75+B*c*c*.45;
 col*=.60+.5*uv.y;
 return col;}

// 3 Halftone: Punktraster als Welle
vec3 halftone(vec2 p,vec2 uv,vec2 m){
 float sc=30.;vec2 gp=p*sc;float stag=mod(floor(gp.y),2.)*.5;gp.x+=stag;
 vec2 id=floor(gp);vec2 f=fract(gp)-.5;vec2 c=((id+.5)-vec2(stag,0.))/sc;
 vec2 dm=c-m;
 float w=.5+.5*sin(c.x*3.2+T*.45+sin(c.y*5.+T*.3+S*4.)*1.4+S*5.);
 w=w*.7+.3*fbm(c*3.+T*.05);
 w+=E*.6*exp(-dot(dm,dm)*14.);
 float r=.05+.42*clamp(w,0.,1.);
 float d=length(f);
 float dt=1.-smoothstep(r-.08,r,d);
 vec3 col=mix(B,A,clamp(w*1.3-.15,0.,1.))*dt*(.24+.80*w);
 col+=C*.55*(1.-uv.y)*(.5+.5*w);
 return col;}

// 4 Lichtstrahlen: Volumenstrahlen von oben
vec3 rays(vec2 p,vec2 uv,vec2 m){
 float ar=R.x/R.y;vec2 src=vec2(ar*.5+(m.x-.5)*ar*.6,1.28);
 vec2 d=p-src;float r=length(d);float ang=atan(d.x,-d.y)+S*.5;
 float a1=pow(.5+.5*sin(ang*26.+sin(ang*9.+T*.22)*2.4+T*.18),2.4);
 float a2=pow(.5+.5*sin(ang*13.-T*.14+sin(ang*5.-T*.1)*1.7),1.8);
 float shim=.6+.4*sin(r*5.-T*.4);
 float ray=(a1*.75+a2*.55)*exp(-r*1.30)*shim;
 vec2 dm=p-m;ray*=1.+E*.7*exp(-dot(dm,dm)*5.);
 vec3 col=mix(B,A,clamp(a1,0.,1.))*ray*.95+A*exp(-r*2.6)*.30+C*.40*exp(-uv.y*1.4);
 vec2 q=p*20.+vec2(0.,-T*.35)+vec2(0.,-S*8.);vec2 id=floor(q);vec2 f=fract(q)-.5;
 float mote=step(.92,h(id))*(1.-smoothstep(0.,.14,length(f-(h2(id)-.5)*.6)));
 col+=A*mote*ray*2.2;
 return col;}

// 5 Data Rain: fallende Datenstroeme
vec3 rain(vec2 p,vec2 uv,vec2 m){
 float sc=38.;vec2 gp=p*sc;float cx=floor(gp.x);
 float rnd=h(vec2(cx,3.));float on=step(.28,rnd);
 float sp=.30+rnd*.85;float len=.22+.55*h(vec2(cx,9.));
 float phase=fract(p.y*.75+T*sp*.16+rnd*7.+S*sp*1.5);
 float b=pow(clamp(1.-phase/len,0.,1.),2.);
 float row=floor(gp.y);vec2 f=fract(gp)-.5;
 float g=step(abs(f.x),.21)*step(abs(f.y),.31)*step(.30,h(vec2(cx,row+floor(T*sp*2.5))));
 float head=step(.965,b);
 float boost=1.+E*2.4*exp(-pow(p.x-m.x,2.)*45.);
 vec3 col=mix(B,A,b*b)*b*g*on*boost+A*head*g*on*.9;
 col+=B*b*.10*on*(1.-smoothstep(.0,.5,abs(f.x)))*boost;
 col+=C*.45*exp(-uv.y*2.);
 return col;}

// 6 Sonar: Radar mit Ping-Ringen, Maus sendet Impulse
vec3 sonar(vec2 p,vec2 uv,vec2 m){
 float ar=R.x/R.y;vec2 c=vec2(ar*.5,.46+.14*S);vec2 d=p-c;float r=length(d);
 float ring=0.;
 for(int i=0;i<3;i++){float w=fract(r*1.7-T*.10-float(i)*.33+S*.4);ring+=smoothstep(0.,.012,w)*(1.-smoothstep(.012,.05,w));}
 ring*=exp(-r*1.05);
 float sr=1.-smoothstep(.47,.5,abs(fract(r*4.)-.5));
 float ang=atan(d.y,d.x);float sw=mod(ang-T*.45,6.28318);float sweep=exp(-sw*3.6)*exp(-r*.9);
 vec2 dm=p-m;float mr=length(dm);float mp=fract(mr*3.-T*.35);
 float ping=smoothstep(0.,.03,mp)*(1.-smoothstep(.03,.25,mp))*exp(-mr*3.)*(.22+E*1.3);
 vec2 bq=p*15.;vec2 bid=floor(bq);vec2 bo=(h2(bid)-.5)*.5;float blip=step(.90,h(bid+7.))*(1.-smoothstep(.0,.09,length(fract(bq)-.5-bo)))*smoothstep(.06,.7,sweep)*3.;
 vec3 col=A*ring*.55+B*sr*exp(-r*1.3)*.30+A*sweep*.55+B*ping+A*blip;
 col+=C*.55*exp(-r*1.4);
 return col;}

// 7 Mesh Gradient: weiche, wandernde Farbflaechen
vec3 mesh(vec2 p,vec2 uv,vec2 m){
 float ar=R.x/R.y;vec3 acc=vec3(0.);float ws=0.;
 for(int i=0;i<5;i++){float fi=float(i);
  vec2 c=vec2(ar*(.5+.46*sin(T*.07*(fi+1.)+fi*2.4+S*1.5)),.5+.44*cos(T*.06*(fi+1.4)+fi*1.9-S*2.));
  if(i==0)c=mix(c,m,.55*clamp(E+.2,0.,1.));
  vec3 cc=i==0?A:(i==1?B:(i==2?C:(i==3?mix(A,B,.5):mix(B,C,.5))));
  float d=dot(p-c,p-c);float w=1./(d+.10);w=w*w*.5+w;acc+=cc*w;ws+=w;}
 vec3 col=acc/ws;
 float br=smoothstep(4.,22.,ws);
 col*=.08+.40*br+.16*fbm(p*2.+T*.03);
 return col;}

// 8 Hex Grid: Sechseck-Netz mit Impulswellen
vec3 hexg(vec2 p,vec2 uv,vec2 m){
 float ar=R.x/R.y;float sc=8.;vec2 hp=p*sc;hp.y+=S*3.;
 vec2 r=vec2(1.,1.7320508);vec2 hh=r*.5;
 vec2 a=mod(hp,r)-hh;vec2 b=mod(hp-hh,r)-hh;
 vec2 g=dot(a,a)<dot(b,b)?a:b;vec2 id=hp-g;
 vec2 ap=abs(g);float d=max(dot(ap,vec2(.5,.8660254)),ap.x);
 float edge=1.-smoothstep(0.,.05,.5-d);
 vec2 cw=(id-vec2(0.,S*3.))/sc;vec2 dm=cw-m;
 float md=exp(-dot(dm,dm)*12.)*(.35+E*1.4);
 float wave=pow(.5+.5*sin(length(id-vec2(sc*ar*.5,sc*.5))*.55-T*1.1),6.);
 float pulse=pow(.5+.5*sin(T*.5+h(id)*6.2831),10.);
 float en=clamp(wave*.85+pulse*.9+md*1.3,0.,1.5);
 vec3 col=A*edge*(.08+.95*en)+B*(1.-smoothstep(0.,.5,d))*en*en*.30+C*edge*.30;
 col+=C*.25*exp(-uv.y*2.);
 return col;}

// 9 Bokeh: weiche Lichtkreise in Ebenen, Parallax beim Scrollen
vec3 bokeh(vec2 p,vec2 uv,vec2 m){
 vec3 acc=vec3(0.);
 for(int l=0;l<3;l++){float fl=float(l);float sc=3.5+fl*3.2;
  vec2 q=p*sc+vec2(T*.02*(fl+1.)+fl*7.,-S*(fl+1.)*3.+T*.015*(fl+1.));
  vec2 id=floor(q);vec2 f=fract(q)-.5;
  vec2 o=(h2(id+fl*31.)-.5)*.30;
  float r=.20+.14*h(id+3.);float d=length(f-o);float soft=.10+.05*fl;
  float disc=1.-smoothstep(r-soft,r,d);
  float rim=smoothstep(r-.09,r-.01,d)*(1.-smoothstep(r-.01,r+.02,d));
  vec3 cc=mix(A,B,h(id+9.));float alive=step(.35,h(id+5.));
  vec2 wc=(id+.5+o)/sc;vec2 dm=wc-m;float near=1.+E*1.6*exp(-dot(dm,dm)*10.);
  float tw=.65+.35*sin(T*.5+h(id)*30.);
  acc+=cc*(disc*.24+rim*.32)*alive*tw*near*(1.-.2*fl);}
 acc+=C*.65*exp(-uv.y*2.2)+B*.05;
 return acc;}

void main(){
 vec2 uv=gl_FragCoord.xy/R;float ar=R.x/R.y;vec2 p=vec2(uv.x*ar,uv.y);vec2 m=vec2(M.x*ar,M.y);
 vec3 col=vec3(.020,.020,.026);
 if(K<.5)col+=nebula(p,uv,m);else if(K<1.5)col+=topo(p,uv,m);else if(K<2.5)col+=caust(p,uv,m);
 else if(K<3.5)col+=halftone(p,uv,m);else if(K<4.5)col+=rays(p,uv,m);else if(K<5.5)col+=rain(p,uv,m);
 else if(K<6.5)col+=sonar(p,uv,m);else if(K<7.5)col+=mesh(p,uv,m);else if(K<8.5)col+=hexg(p,uv,m);else col+=bokeh(p,uv,m);
 col*=I;
 float mid=1.-smoothstep(0.,.45,abs(uv.x-.5));col*=1.-Z*mid*.5;
 col*=1.-.55*smoothstep(.45,1.15,length((uv-.5)*vec2(1.,1.15)));
 col+=(h(gl_FragCoord.xy+fract(T)*100.)-.5)*.02;
 gl_FragColor=vec4(col,1.);
}`;
  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  // Fuer Tests/Thumbnails ausserhalb des Browsers
  if (typeof module !== 'undefined' && module.exports) { module.exports = { FS: FS, VS: VS, PRESETS: PRESETS, MODE_LABEL: MODE_LABEL, hex: hex }; return; }

  var st = { cv: null, gl: null, U: null, cur: 'none', raf: 0, mx: .5, my: .4, tx: .5, ty: .4, en: 0, s: 0, stt: 0, t: 0, last: 0, page: 'landing', sp: 1, ok: false };
  var slow = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? .25 : 1;

  function css() {
    if (document.getElementById('caruzoBgCss')) return;
    var s = document.createElement('style'); s.id = 'caruzoBgCss';
    s.textContent = '#caruzoBg{position:fixed;inset:0;width:100%;height:100%;z-index:-6;pointer-events:none;opacity:0;transition:opacity .8s ease}' +
      '#caruzoBg.on{opacity:1}html body.has-bg{background:transparent!important}body.has-bg:before{opacity:.22}body.has-bg .ambient{display:none}';
    document.head.appendChild(s);
  }
  function sh(g, t, src) { var o = g.createShader(t); g.shaderSource(o, src); g.compileShader(o); if (!g.getShaderParameter(o, g.COMPILE_STATUS)) console.warn('CaruzoBG shader:', g.getShaderInfoLog(o)); return o; }
  function init() {
    if (st.ok) return true;
    css();
    var cv = document.createElement('canvas'); cv.id = 'caruzoBg'; cv.setAttribute('aria-hidden', 'true');
    var g = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!g) { console.warn('CaruzoBG: WebGL nicht verfügbar'); return false; }
    var pr = g.createProgram(); g.attachShader(pr, sh(g, g.VERTEX_SHADER, VS)); g.attachShader(pr, sh(g, g.FRAGMENT_SHADER, FS)); g.linkProgram(pr);
    if (!g.getProgramParameter(pr, g.LINK_STATUS)) { console.warn('CaruzoBG link:', g.getProgramInfoLog(pr)); return false; }
    g.useProgram(pr);
    g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    var loc = g.getAttribLocation(pr, 'a'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
    st.U = {}; ['R', 'M', 'T', 'S', 'E', 'K', 'I', 'Z', 'A', 'B', 'C'].forEach(function (n) { st.U[n] = g.getUniformLocation(pr, n); });
    st.cv = cv; st.gl = g; st.ok = true;
    document.body.insertBefore(cv, document.body.firstChild);
    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', function (e) {
      var nx = e.clientX / innerWidth, ny = 1 - e.clientY / innerHeight;
      st.en = Math.min(1, st.en + Math.hypot(nx - st.tx, ny - st.ty) * 9); st.tx = nx; st.ty = ny;
    }, { passive: true });
    addEventListener('scroll', sc, { passive: true }); sc();
    document.addEventListener('visibilitychange', function () { if (!document.hidden && st.cur !== 'none') { st.last = 0; loop(performance.now()); } });
    return true;
  }
  function resize() {
    if (!st.ok) return;
    var k = Math.min(window.devicePixelRatio || 1, 1.5) * .7;
    st.cv.width = Math.max(2, Math.round(innerWidth * k)); st.cv.height = Math.max(2, Math.round(innerHeight * k));
    st.gl.viewport(0, 0, st.cv.width, st.cv.height); st.gl.uniform2f(st.U.R, st.cv.width, st.cv.height);
  }
  function sc() { var m = document.documentElement.scrollHeight - innerHeight; st.stt = m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0; }
  function loop(now) {
    cancelAnimationFrame(st.raf);
    if (st.cur === 'none' || document.hidden) return;
    var dt = Math.min(.05, (now - (st.last || now)) / 1000); st.last = now; st.t += dt * slow * st.sp;
    st.mx += (st.tx - st.mx) * Math.min(1, dt * 10); st.my += (st.ty - st.my) * Math.min(1, dt * 10);
    st.en *= Math.pow(.25, dt); st.s += (st.stt - st.s) * Math.min(1, dt * 3);
    var g = st.gl, U = st.U;
    g.uniform1f(U.T, st.t + 7.5); g.uniform2f(U.M, st.mx, st.my); g.uniform1f(U.S, st.s); g.uniform1f(U.E, st.en);
    g.drawArrays(g.TRIANGLES, 0, 3);
    st.raf = requestAnimationFrame(loop);
  }
  function apply(page, id) {
    id = String(id || 'none'); st.page = page || st.page;
    var p = PRESETS[st.page] && PRESETS[st.page][id];
    if (!p) { // "Keiner"
      st.cur = 'none'; cancelAnimationFrame(st.raf);
      if (st.cv) st.cv.classList.remove('on');
      document.body.classList.remove('has-bg'); return;
    }
    if (!init()) return;
    var g = st.gl, U = st.U;
    g.uniform1f(U.K, p.mode); g.uniform1f(U.I, p.i); g.uniform1f(U.Z, p.z || 0);
    g.uniform3fv(U.A, hex(p.c[0])); g.uniform3fv(U.B, hex(p.c[1])); g.uniform3fv(U.C, hex(p.c[2]));
    st.sp = p.sp || 1; st.cur = id; st.last = 0;
    document.body.classList.add('has-bg'); st.cv.classList.add('on');
    loop(performance.now());
  }
  function mount(page) {
    st.page = page;
    return fetch('/api/site-settings', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { apply(page, j && j.backgrounds && j.backgrounds[page]); })
      .catch(function () { /* ohne Hintergrund weiterlaufen */ });
  }
  window.CaruzoBG = { mount: mount, apply: apply, presets: PRESETS, modeLabel: MODE_LABEL };
})();
