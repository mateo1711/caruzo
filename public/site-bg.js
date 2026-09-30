/* Caruzo animierte Hintergründe – gemeinsame Engine für Hauptseite und Dashboard.
   Nutzung: CaruzoBG.mount('landing') bzw. CaruzoBG.mount('dashboard').
   Die Auswahl kommt von /api/site-settings und wird im Admin Panel geändert. */
(function () {
  'use strict';
  // mode: 0 Wellen, 1 Aurora, 2 Plasma, 3 Neon-Grid, 4 Sternenstaub
  var PRESETS = {
    landing: {
      1: { name: 'Rosé Wellen',    mode: 0, c: ['#f0dfe4', '#ff2e88', '#5a1236'], i: 1.0 },
      2: { name: 'Aurora Grün',    mode: 1, c: ['#2bffb0', '#1fb8ff', '#0c4a3f'], i: 1.0 },
      3: { name: 'Violet Plasma',  mode: 2, c: ['#8b5cf6', '#ff4fd8', '#2a1a6e'], i: 1.0 },
      4: { name: 'Neon Grid Cyan', mode: 3, c: ['#22e5ff', '#3b6bff', '#0b2a55'], i: 1.0 },
      5: { name: 'Sternenstaub Gold', mode: 4, c: ['#ffd27a', '#ff8a3c', '#4a2a10'], i: 1.0 }
    },
    dashboard: {
      1: { name: 'Violett Wellen', mode: 0, c: ['#d9ccff', '#8b5cf6', '#2c1a66'], i: .7 },
      2: { name: 'Ocean Aurora',   mode: 1, c: ['#4fd1ff', '#3b82f6', '#0a2f5e'], i: .7 },
      3: { name: 'Ember Plasma',   mode: 2, c: ['#ff7a3c', '#ff2e5a', '#5a1a10'], i: .7 },
      4: { name: 'Emerald Grid',   mode: 3, c: ['#3dff9a', '#16c6a0', '#0a3a2c'], i: .7 },
      5: { name: 'Rosé Sterne',    mode: 4, c: ['#ffe6f0', '#ff6fae', '#4a1030'], i: .7 }
    }
  };
  var MODE_LABEL = ['Wellen', 'Aurora', 'Plasma', 'Neon Grid', 'Sterne'];

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
    'uniform vec2 R,M;uniform float T,S,E,K,I;uniform vec3 A,B,C;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'vec2 h2(vec2 p){return vec2(h(p),h(p+37.7));}',
    // 0 Wellen
    'vec3 waves(vec2 p,vec2 uv,vec2 m){vec3 acc=vec3(0.);',
    ' acc+=C*smoothstep(.45,1.,uv.y)*(.9+.5*S);',
    ' for(int i=0;i<7;i++){float fi=float(i);float f=1.5+.28*fi;',
    '  float y0=.60-.085*fi+.20*S+(.05+.012*fi+.035*S)*sin(p.x*f+T*(.16+.03*fi)+fi*1.9+S*5.)+.03*sin(p.x*f*2.1-T*.22+fi*.7-S*3.);',
    '  float dx=p.x-m.x;float w=exp(-dx*dx*6.)*exp(-pow(y0-m.y,2.)*35.);',
    '  y0+=w*E*.11*sin(dx*13.-T*4.+fi*.6);',
    '  vec3 cc=mix(A,B,clamp(fi/6.*.55+S*.75,0.,1.));float md=.55+.45*sin(p.x*2.2+fi+T*.25);',
    '  for(int j=0;j<3;j++){float off=(float(j)-1.)*.0065*(1.+.7*sin(p.x*3.+fi));float d=abs(p.y-(y0+off));',
    '   acc+=cc*(exp(-d*d*5.5e5)*.32+exp(-d*38.)*.035)*md;}',
    '  acc+=cc*exp(-abs(p.y-y0)*7.)*.012;}',
    ' return acc;}',
    // 1 Aurora
    'vec3 aurora(vec2 p,vec2 uv,vec2 m){vec3 acc=vec3(0.);',
    ' for(int i=0;i<4;i++){float fi=float(i);float x=p.x;',
    '  float dx=x-m.x;',
    '  float w=sin(x*1.6+T*.18+fi*2.1+S*3.)+.6*sin(x*3.9-T*.27+fi)+E*exp(-dx*dx*7.)*sin(dx*10.-T*4.)*.9;',
    '  float yc=.50+.07*fi+.09*w+.22*S;',
    '  float env=smoothstep(yc-.03,yc+.02,uv.y)*exp(-(uv.y-yc)*4.6);',
    '  float rays=.5+.5*sin(x*34.+w*5.+T*.6+fi*3.);rays=.35+.65*rays*rays;',
    '  acc+=mix(A,B,clamp(uv.y*1.1+fi*.12,0.,1.))*env*rays*.30;}',
    ' acc+=C*.5*exp(-uv.y*2.2);return acc;}',
    // 2 Plasma
    'vec3 plasma(vec2 p,vec2 uv,vec2 m){float f=0.;',
    ' for(int i=0;i<6;i++){float fi=float(i);',
    '  vec2 c=vec2(R.x/R.y*(.5+.42*sin(T*.13*(fi+1.)+fi*2.3+S*2.)),.5+.36*cos(T*.11*(fi+1.3)+fi*1.7-S*3.));',
    '  float r=.10+.03*fi*.5;f+=r*r/(dot(p-c,p-c)+.0008);}',
    ' f+=(.014+E*.05)/(dot(p-m,p-m)+.0012);',
    ' float g=smoothstep(.6,3.2,f);vec3 col=mix(C,A,smoothstep(0.,.55,g));col=mix(col,B,smoothstep(.55,1.,g));',
    ' return col*g*.85+C*.10;}',
    // 3 Neon Grid
    'vec3 grid(vec2 p,vec2 uv,vec2 m){float hz=.44+.10*S;vec3 col=vec3(0.);',
    ' if(uv.y<hz){float z=.16/(hz-uv.y);float gx=(p.x-R.x/R.y*.5)*z*.9;',
    '  float dm=length(vec2((p.x-m.x)*.9,(uv.y-m.y)*1.4));',
    '  float gz=z+T*.55+S*9.+E*exp(-dm*dm*9.)*sin(dm*24.-T*6.)*.35;',
    '  gx+=E*exp(-dm*dm*9.)*sin(dm*18.-T*5.)*.18;',
    '  float lw=.03+z*.008;float l=(1.-smoothstep(0.,lw,.5-abs(fract(gx)-.5)))+(1.-smoothstep(0.,lw,.5-abs(fract(gz)-.5)));',
    '  float fade=exp(-z*.09);col+=mix(B,A,clamp(z*.05,0.,1.))*l*fade*.9;',
    '  col+=C*.5*exp(-(hz-uv.y)*7.);}',
    ' else{float d=uv.y-hz;col+=mix(B,C,clamp(d*2.4,0.,1.))*exp(-d*5.)*.42;',
    '  vec2 sp=(p-vec2(R.x/R.y*.5,hz+.14+.05*S));float sd=length(sp);',
    '  col+=A*(1.-smoothstep(.09,.11,sd))*.5+A*exp(-sd*7.)*.16;',
    '  vec2 q=floor(p*vec2(46.,38.));col+=A*step(.985,h(q))*smoothstep(hz+.06,1.,uv.y)*.5*(.6+.4*sin(T*2.+h(q)*20.));}',
    ' return col;}',
    // 4 Sternenstaub
    'vec3 stars(vec2 p,vec2 uv,vec2 m){vec3 acc=vec3(0.);',
    ' vec2 dm=p-m;float push=E*.14*exp(-dot(dm,dm)*10.);p+=normalize(dm+1e-4)*push;',
    ' acc+=C*.5*exp(-length(uv-vec2(.7,.85+.1*S))*2.4)+B*.16*exp(-length(uv-vec2(.2,.2))*2.6);',
    ' for(int l=0;l<3;l++){float fl=float(l);float sc=9.+fl*11.;',
    '  vec2 q=p*sc+vec2(T*.10*(fl+1.),-S*(fl+1.)*6.+T*.05);vec2 id=floor(q);vec2 f=fract(q)-.5;',
    '  vec2 o=(h2(id+fl*19.)-.5)*.7;float d=length(f-o);float r=.05+.035*h(id+3.);',
    '  float tw=.6+.4*sin(T*(1.+h(id)*2.)+h(id)*30.);',
    '  vec3 sc3=mix(A,B,h(id+9.));acc+=sc3*((1.-smoothstep(0.,r,d))*1.1+exp(-d*d*90.)*.18)*tw*step(.45,h(id+5.));}',
    ' return acc;}',
    'void main(){vec2 uv=gl_FragCoord.xy/R;float ar=R.x/R.y;vec2 p=vec2(uv.x*ar,uv.y);vec2 m=vec2(M.x*ar,M.y);',
    ' vec3 col=vec3(.020,.020,.026);',
    ' if(K<.5)col+=waves(p,uv,m);else if(K<1.5)col+=aurora(p,uv,m);else if(K<2.5)col+=plasma(p,uv,m);else if(K<3.5)col+=grid(p,uv,m);else col+=stars(p,uv,m);',
    ' col*=I;col*=1.-.55*smoothstep(.45,1.15,length((uv-.5)*vec2(1.,1.15)));',
    ' col+=(h(gl_FragCoord.xy+fract(T)*100.)-.5)*.02;gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  var st = { cv: null, gl: null, U: null, cur: 'none', raf: 0, mx: .5, my: .4, tx: .5, ty: .4, en: 0, s: 0, stt: 0, t: 0, last: 0, page: 'landing', ok: false };
  var slow = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? .25 : 1;

  function css() {
    if (document.getElementById('caruzoBgCss')) return;
    var s = document.createElement('style'); s.id = 'caruzoBgCss';
    s.textContent = '#caruzoBg{position:fixed;inset:0;width:100%;height:100%;z-index:-6;pointer-events:none;opacity:0;transition:opacity .8s ease}' +
      '#caruzoBg.on{opacity:1}html body.has-bg{background:transparent!important}body.has-bg:before{opacity:.22}body.has-bg .ambient{display:none}';
    document.head.appendChild(s);
  }
  function sh(g, t, src) { var o = g.createShader(t); g.shaderSource(o, src); g.compileShader(o); return o; }
  function init() {
    if (st.ok) return true;
    css();
    var cv = document.createElement('canvas'); cv.id = 'caruzoBg'; cv.setAttribute('aria-hidden', 'true');
    var g = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!g) { console.warn('CaruzoBG: WebGL nicht verfügbar'); return false; }
    var pr = g.createProgram(); g.attachShader(pr, sh(g, g.VERTEX_SHADER, VS)); g.attachShader(pr, sh(g, g.FRAGMENT_SHADER, FS)); g.linkProgram(pr);
    if (!g.getProgramParameter(pr, g.LINK_STATUS)) { console.warn('CaruzoBG shader:', g.getProgramInfoLog(pr)); return false; }
    g.useProgram(pr);
    g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    var loc = g.getAttribLocation(pr, 'a'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
    st.U = {}; ['R', 'M', 'T', 'S', 'E', 'K', 'I', 'A', 'B', 'C'].forEach(function (n) { st.U[n] = g.getUniformLocation(pr, n); });
    st.cv = cv; st.gl = g; st.ok = true;
    document.body.insertBefore(cv, document.body.firstChild);
    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', function (e) {
      var nx = e.clientX / innerWidth, ny = 1 - e.clientY / innerHeight;
      st.en = Math.min(1, st.en + Math.hypot(nx - st.tx, ny - st.ty) * 9); st.tx = nx; st.ty = ny;
    }, { passive: true });
    addEventListener('scroll', sc, { passive: true }); sc();
    document.addEventListener('visibilitychange', function () { if (!document.hidden && st.cur !== 'none') loop(performance.now()); });
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
    var dt = Math.min(.05, (now - (st.last || now)) / 1000); st.last = now; st.t += dt * slow;
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
    g.uniform1f(U.K, p.mode); g.uniform1f(U.I, p.i);
    g.uniform3fv(U.A, hex(p.c[0])); g.uniform3fv(U.B, hex(p.c[1])); g.uniform3fv(U.C, hex(p.c[2]));
    st.cur = id; st.last = 0;
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
