/* Carte de poche : logique de l'application.
   Tout tourne dans le navigateur : aucune donnée n'est envoyée à un serveur. */
(function(){
"use strict";
var $ = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
var cv = $('#cv'), ctx = cv.getContext('2d');

/* ---------- analytics (Vercel Web Analytics, sans cookie) ----------
   Seuls des événements anonymes sont envoyés : jamais les textes de la carte. */
function track(name, data){
  try{ if(typeof window.va==='function') window.va('event', {name:name, data:data||{}}); }catch(e){}
}

/* ---------- i18n ---------- */
var I18N = {
  fr: {
    'title':'Carte de poche',
    'tagline':'Une carte de contact à montrer sur écran ou à imprimer, avec un QR qui ajoute vraiment la fiche au répertoire.',
    'sec.identity':'Identité','sec.contact':'Contact','sec.images':'Images','sec.qr':'Le QR','sec.format':'Format','sec.share':'Partager',
    'f.name':'Nom','f.role':'Rôle','f.company':'Société','f.phrase':'Phrase',
    'f.phone':'Téléphone','f.email':'Email','f.web':'Site web','f.address':'Adresse','f.freetext':'Texte à encoder',
    'z.photo':'Photo','z.photo.hint':'clic ou glisser','z.photo.aria':'Charger une photo','z.photo.clear':'Retirer la photo',
    'z.logo':'Logo','z.logo.hint':'haut, centré','z.logo.aria':'Charger le logo principal','z.logo.clear':'Retirer le logo',
    'z.partner':'Partenaire','z.partner.hint':'coin haut droit','z.partner.aria':'Charger le logo partenaire','z.partner.clear':'Retirer le logo partenaire',
    'z.bg':'Fond','z.bg.hint':'voile + texte blanc','z.bg.aria':'Charger une image de fond','z.bg.clear':'Retirer l\u2019image de fond',
    'bg.color':'Sans image de fond, la carte prend la couleur ci-dessous.',
    'bg.image':'Image de fond active : voile sombre et texte blanc appliqués. Retire-la pour revenir à la couleur.',
    'bg.quota':'Mémoire du navigateur pleine : les images restent utilisables maintenant mais seront à recharger à la prochaine visite.',
    'picker':'personnalisée','picker.aria':'Couleur de fond personnalisée',
    'qr.group':'Contenu du QR code',
    'qr.vcard':'Fiche contact','qr.vcard.note':'vCard 3.0 en UTF-8 : au scan, la fiche s\u2019ajoute au répertoire du téléphone.',
    'qr.tel':'Téléphone','qr.tel.note':'Le scan ouvre le clavier d\u2019appel avec le numéro pré-rempli.',
    'qr.email':'Email','qr.email.note':'Le scan ouvre un nouveau mail à cette adresse.',
    'qr.web':'Site web','qr.web.note':'Le scan ouvre l\u2019adresse dans le navigateur.',
    'qr.text':'Texte libre','qr.text.note':'Le scan affiche simplement le texte.',
    'qr.dim':'QR : ',
    'fmt.group':'Format de sortie','fmt.phone':'Téléphone','fmt.story':'Story','fmt.square':'Carré',
    'fmt.preset':'Modèle de téléphone','fmt.screen':'Mon écran','fmt.screen.label':'Mon écran','fmt.custom':'Personnalisé',
    'fmt.note':'Choisis ton modèle, ou « Mon écran » pour générer la carte pile à la résolution de l\u2019appareil que tu utilises.',
    'fmt.note.screen':'Résolution détectée sur cet appareil. Sur un ordinateur, c\u2019est celle du moniteur : ouvre cette page sur ton téléphone pour avoir la sienne.',
    'preview':'Aperçu de la carte',
    'dl':'Télécharger le PNG','share.btn':'Partager','peek.show':'Voir la vCard','peek.hide':'Masquer le contenu',
    'st.prep':'Préparation du PNG…','st.saved':'PNG enregistré : ','st.err':'Impossible de générer l\u2019image.',
    'st.shared':'Carte partagée.','st.share.cancel':'Partage annulé.',
    'st.fallback':'Téléchargement bloqué ici : clic droit (ou appui long) sur l\u2019aperçu → « Enregistrer l\u2019image ».',
    'share.note':'Envoie ce lien à ton équipe : chacun arrive avec les champs pré-remplis (société, site, couleur…), puis ajoute son nom et le logo.',
    'share.label':'Lien de pré-remplissage','share.copy':'Copier le lien',
    'share.copied':'Lien copié.','share.copyfail':'Copie impossible ici : sélectionne le lien et copie-le à la main.',
    'reset':'Tout effacer','reset.confirm':'Effacer les textes, les images et les réglages mémorisés sur cet appareil ?',
    'foot.privacy':'Le contenu de ta carte reste dans ton navigateur : rien n\u2019est envoyé à un serveur. Mesure d\u2019audience anonyme, sans cookie.',
    'peek.empty':'(rien à encoder)',
    'row.tel':'TÉL','row.mail':'MAIL','row.web':'WEB','row.adr':'ADR'
  },
  en: {
    'title':'Pocket card',
    'tagline':'A contact card to show on screen or print, with a QR code that really adds you to the address book.',
    'sec.identity':'Identity','sec.contact':'Contact','sec.images':'Images','sec.qr':'The QR','sec.format':'Format','sec.share':'Share',
    'f.name':'Name','f.role':'Role','f.company':'Company','f.phrase':'Tagline',
    'f.phone':'Phone','f.email':'Email','f.web':'Website','f.address':'Address','f.freetext':'Text to encode',
    'z.photo':'Photo','z.photo.hint':'click or drop','z.photo.aria':'Upload a photo','z.photo.clear':'Remove the photo',
    'z.logo':'Logo','z.logo.hint':'top, centred','z.logo.aria':'Upload the main logo','z.logo.clear':'Remove the logo',
    'z.partner':'Partner','z.partner.hint':'top right corner','z.partner.aria':'Upload the partner logo','z.partner.clear':'Remove the partner logo',
    'z.bg':'Background','z.bg.hint':'dark veil + white text','z.bg.aria':'Upload a background image','z.bg.clear':'Remove the background image',
    'bg.color':'Without a background image, the card takes the colour below.',
    'bg.image':'Background image active: dark veil and white text applied. Remove it to go back to the colour.',
    'bg.quota':'Browser storage is full: images still work now but will need to be loaded again on your next visit.',
    'picker':'custom','picker.aria':'Custom background colour',
    'qr.group':'QR code content',
    'qr.vcard':'Contact card','qr.vcard.note':'vCard 3.0 in UTF-8: scanning adds the contact to the phone\u2019s address book.',
    'qr.tel':'Phone','qr.tel.note':'Scanning opens the dialer with the number filled in.',
    'qr.email':'Email','qr.email.note':'Scanning opens a new email to this address.',
    'qr.web':'Website','qr.web.note':'Scanning opens the address in the browser.',
    'qr.text':'Free text','qr.text.note':'Scanning simply shows the text.',
    'qr.dim':'QR: ',
    'fmt.group':'Output format','fmt.phone':'Phone','fmt.story':'Story','fmt.square':'Square',
    'fmt.preset':'Phone model','fmt.screen':'My screen','fmt.screen.label':'My screen','fmt.custom':'Custom',
    'fmt.note':'Pick your model, or \u201cMy screen\u201d to generate the card at the exact resolution of the device you are using.',
    'fmt.note.screen':'Resolution detected on this device. On a computer that is the monitor\u2019s: open this page on your phone to get its own.',
    'preview':'Card preview',
    'dl':'Download PNG','share.btn':'Share','peek.show':'Show vCard','peek.hide':'Hide content',
    'st.prep':'Preparing the PNG…','st.saved':'PNG saved: ','st.err':'Could not generate the image.',
    'st.shared':'Card shared.','st.share.cancel':'Share cancelled.',
    'st.fallback':'Download blocked here: right-click (or long-press) the preview → \u201cSave image\u201d.',
    'share.note':'Send this link to your team: everyone lands with the fields pre-filled (company, website, colour…), then adds their name and the logo.',
    'share.label':'Pre-fill link','share.copy':'Copy link',
    'share.copied':'Link copied.','share.copyfail':'Cannot copy here: select the link and copy it by hand.',
    'reset':'Clear everything','reset.confirm':'Clear the texts, images and settings stored on this device?',
    'foot.privacy':'Your card\u2019s content stays in your browser: nothing is sent to a server. Anonymous, cookie-free audience measurement.',
    'peek.empty':'(nothing to encode)',
    'row.tel':'TEL','row.mail':'MAIL','row.web':'WEB','row.adr':'ADDR'
  }
};
var lang = 'fr';
function t(k){ var d=I18N[lang]||I18N.fr; return (k in d) ? d[k] : (I18N.fr[k]||k); }

/* ---------- formats & presets ---------- */
var FORMATS = {
  phone:  {w:1206, h:2622},
  story:  {w:1080, h:1920},
  square: {w:1080, h:1080}
};
/* Résolutions natives (pixels), fiches constructeurs : voir README. */
var PRESETS = [
  {id:'iphone-16-pro-max', label:'iPhone 16 Pro Max', w:1320, h:2868},
  {id:'iphone-16-pro',     label:'iPhone 16 Pro',     w:1206, h:2622},
  {id:'iphone-16',         label:'iPhone 16 / 15',    w:1179, h:2556},
  {id:'iphone-se',         label:'iPhone SE',         w:750,  h:1334},
  {id:'pixel-9',           label:'Pixel 9',           w:1080, h:2424},
  {id:'galaxy-s24',        label:'Galaxy S24',        w:1080, h:2340},
  {id:'android',           label:'Android',           w:1080, h:2400}
];
var QRMODES = ['vcard','tel','email','web','text'];
var SWATCHES = [
  ['#101215','Encre'],['#1b3a5c','Bleu nuit'],['#24443a','Vert bouteille'],['#6e2233','Bordeaux'],
  ['#9c5a2d','Cuivre'],['#c9a227','Laiton'],['#d9d4c7','Lin'],['#f2f2ef','Papier']
];

var DEFAULTS = {
  name:'Camille Ravine',
  role:'Directrice de création',
  company:'Atelier Vacoa',
  phrase:'Identités visuelles & impression - Saint-Pierre.',
  phone:'+262 692 45 18 07',
  email:'camille@atelier-vacoa.re',
  web:'atelier-vacoa.re',
  address:'12 rue François de Mahy, 97410 Saint-Pierre',
  freetext:'Atelier ouvert du mardi au samedi, 9h-17h.'
};

var state = {
  fields: Object.assign({}, DEFAULTS),
  format: 'phone',
  phone: {preset:'iphone-16-pro', w:1206, h:2622},   /* dimensions du format "Téléphone" */
  qrMode: 'vcard',
  bgColor: '#101215',
  images: {photo:null, logo:null, partner:null, bg:null},     /* objets Image */
  imageData: {photo:null, logo:null, partner:null, bg:null}   /* dataURL persistés */
};
var quotaHit = false;

function dims(){
  if(state.format==='phone') return {w:state.phone.w, h:state.phone.h};
  return FORMATS[state.format];
}
function phoneLabel(){
  var p=state.phone;
  if(p.preset==='screen') return t('fmt.screen.label');
  if(p.preset==='custom') return t('fmt.custom');
  for(var i=0;i<PRESETS.length;i++) if(PRESETS[i].id===p.preset) return PRESETS[i].label;
  return t('fmt.phone');
}
function screenSize(){
  var dpr = window.devicePixelRatio || 1;
  var w = Math.round(screen.width*dpr), h = Math.round(screen.height*dpr);
  if(!(w>0 && h>0)) return null;
  return {w:w, h:h};
}

/* ---------- persistence ---------- */
var KEY = 'carte-de-poche/v2', KEY_V1 = 'carte-de-poche/v1';
var IMG_KEYS = ['photo','logo','partner','bg'];
function readJSON(k){ try{ var r=localStorage.getItem(k); return r ? JSON.parse(r) : null; }catch(e){ return null; } }
function applySaved(d){
  if(!d) return;
  if(d.fields) for(var k in DEFAULTS){ if(typeof d.fields[k]==='string') state.fields[k]=d.fields[k]; }
  if(FORMATS[d.format]) state.format=d.format;
  if(d.phone && d.phone.w>0 && d.phone.h>0) state.phone={preset:String(d.phone.preset||'custom'), w:+d.phone.w, h:+d.phone.h};
  if(QRMODES.indexOf(d.qrMode)>=0) state.qrMode=d.qrMode;
  if(typeof d.bgColor==='string' && /^#[0-9a-f]{6}$/i.test(d.bgColor)) state.bgColor=d.bgColor;
  if(d.lang==='fr'||d.lang==='en') lang=d.lang;
  if(d.images) IMG_KEYS.forEach(function(k){ if(typeof d.images[k]==='string' && d.images[k].indexOf('data:image/')===0) state.imageData[k]=d.images[k]; });
}
function load(){
  var d=readJSON(KEY);
  if(!d){ d=readJSON(KEY_V1); if(d){ applySaved(d); try{ localStorage.removeItem(KEY_V1); }catch(e){} return; } }
  applySaved(d);
}
function save(){
  var base={v:2, fields:state.fields, format:state.format, phone:state.phone, qrMode:state.qrMode, bgColor:state.bgColor, lang:lang};
  var full=Object.assign({images:state.imageData}, base);
  try{ localStorage.setItem(KEY, JSON.stringify(full)); quotaHit=false; }
  catch(e){
    quotaHit=true;
    try{ localStorage.setItem(KEY, JSON.stringify(base)); }catch(e2){}
  }
  syncQuotaNote();
}
function syncQuotaNote(){
  var n=$('#quota-note');
  var hasImg = IMG_KEYS.some(function(k){ return !!state.imageData[k]; });
  n.hidden = !(quotaHit && hasImg);
  n.textContent = t('bg.quota');
}

/* ---------- URL de pré-remplissage ---------- */
var URL_FIELDS = ['name','role','company','phrase','phone','email','web','address','freetext'];
function applyParams(){
  var sp; try{ sp=new URLSearchParams(location.search); }catch(e){ return false; }
  var touched=false;
  var anyField = URL_FIELDS.some(function(k){ return sp.has(k); });
  if(anyField){ URL_FIELDS.forEach(function(k){ state.fields[k]=''; }); }
  URL_FIELDS.forEach(function(k){ if(sp.has(k)){ state.fields[k]=String(sp.get(k)).slice(0,500); touched=true; } });
  var c=sp.get('color'); if(c && /^#?[0-9a-f]{6}$/i.test(c)){ state.bgColor='#'+c.replace('#','').toLowerCase(); touched=true; }
  var f=sp.get('format'); if(f && FORMATS[f]){ state.format=f; touched=true; }
  var q=sp.get('qr'); if(q && QRMODES.indexOf(q)>=0){ state.qrMode=q; touched=true; }
  var pr=sp.get('preset');
  if(pr){
    for(var i=0;i<PRESETS.length;i++) if(PRESETS[i].id===pr){ state.phone={preset:pr,w:PRESETS[i].w,h:PRESETS[i].h}; state.format='phone'; touched=true; }
  }
  var w=parseInt(sp.get('w'),10), h=parseInt(sp.get('h'),10);
  if(w>=200 && h>=200 && w<=6000 && h<=6000){ state.phone={preset:'custom',w:w,h:h}; state.format='phone'; touched=true; }
  var l=sp.get('lang'); if(l==='fr'||l==='en'){ lang=l; touched=true; }
  return touched;
}
function buildShareUrl(){
  var sp=new URLSearchParams();
  URL_FIELDS.forEach(function(k){ var v=String(state.fields[k]||'').trim(); if(v) sp.set(k,v); });
  sp.set('color', state.bgColor.replace('#',''));
  if(state.qrMode!=='vcard') sp.set('qr', state.qrMode);
  if(state.format!=='phone') sp.set('format', state.format);
  else if(state.phone.preset==='custom' || state.phone.preset==='screen'){ sp.set('w', state.phone.w); sp.set('h', state.phone.h); }
  else if(state.phone.preset!=='iphone-16-pro') sp.set('preset', state.phone.preset);
  sp.set('lang', lang);
  return location.origin + location.pathname + '?' + sp.toString();
}
function syncShareUrl(){ $('#share-url').value = buildShareUrl(); }

/* ---------- helpers ---------- */
function lum(hex){
  var h = hex.replace('#','');
  if(h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var r=parseInt(h.substr(0,2),16)/255, g=parseInt(h.substr(2,2),16)/255, b=parseInt(h.substr(4,2),16)/255;
  var f=function(c){ return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
}
function rr(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}
function drawCover(c,img,x,y,w,h){
  var ir=img.naturalWidth/img.naturalHeight, br=w/h, sw,sh,sx,sy;
  if(ir>br){ sh=img.naturalHeight; sw=sh*br; sx=(img.naturalWidth-sw)/2; sy=0; }
  else { sw=img.naturalWidth; sh=sw/br; sx=0; sy=(img.naturalHeight-sh)/2; }
  c.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
function drawContain(c,img,cx,cy,maxW,maxH,align){
  var r=img.naturalWidth/img.naturalHeight, w=maxW, h=w/r;
  if(h>maxH){ h=maxH; w=h*r; }
  var x = align==='left' ? cx : (align==='right' ? cx-w : cx-w/2);
  c.drawImage(img,x,cy,w,h);
  return {w:w,h:h};
}
function fitFont(c,text,maxW,start,min,fam,weight,italic){
  var s=start;
  while(s>min){
    c.font=(italic?'italic ':'')+weight+' '+s+'px '+fam;
    if(c.measureText(text).width<=maxW) break;
    s-=Math.max(1,Math.round(s*0.03));
  }
  c.font=(italic?'italic ':'')+weight+' '+s+'px '+fam;
  return s;
}
function wrap(c,text,maxW){
  var words=String(text).split(/\s+/), lines=[], cur='';
  for(var i=0;i<words.length;i++){
    var tt = cur ? cur+' '+words[i] : words[i];
    if(c.measureText(tt).width>maxW && cur){ lines.push(cur); cur=words[i]; }
    else cur=tt;
  }
  if(cur) lines.push(cur);
  return lines;
}

/* ---------- vCard / payload ---------- */
function esc(v){ return String(v||'').replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'); }
function normUrl(u){
  u=String(u||'').trim(); if(!u) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : 'https://'+u;
}
function vcard(){
  var f=state.fields, parts=String(f.name||'').trim().split(/\s+/);
  var last = parts.length>1 ? parts[parts.length-1] : (parts[0]||'');
  var first = parts.length>1 ? parts.slice(0,-1).join(' ') : '';
  var L=['BEGIN:VCARD','VERSION:3.0'];
  L.push('N:'+esc(last)+';'+esc(first)+';;;');
  if(f.name) L.push('FN:'+esc(f.name));
  if(f.company) L.push('ORG:'+esc(f.company));
  if(f.role) L.push('TITLE:'+esc(f.role));
  if(f.phone) L.push('TEL;TYPE=CELL,VOICE:'+esc(f.phone));
  if(f.email) L.push('EMAIL;TYPE=INTERNET,PREF:'+esc(f.email));
  if(f.web) L.push('URL:'+esc(normUrl(f.web)));
  if(f.address) L.push('ADR;TYPE=WORK:;;'+esc(f.address)+';;;;');
  if(f.phrase) L.push('NOTE:'+esc(f.phrase));
  L.push('END:VCARD');
  return L.join('\r\n');
}
function payload(){
  var f=state.fields;
  switch(state.qrMode){
    case 'tel':   return f.phone ? 'tel:'+String(f.phone).replace(/[^\d+]/g,'') : '';
    case 'email': return f.email ? 'mailto:'+String(f.email).trim() : '';
    case 'web':   return normUrl(f.web);
    case 'text':  return String(f.freetext||'').trim();
    default:      return vcard();
  }
}

/* ---------- QR ---------- */
var qrCache = {key:null, qr:null};
function makeQR(text){
  if(!text || typeof qrcode!=='function') return null;
  if(qrCache.key===text) return qrCache.qr;
  try{
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var q = qrcode(0,'M');
    q.addData(text,'Byte');
    q.make();
    qrCache = {key:text, qr:q};
    return q;
  }catch(e){ qrCache={key:text,qr:null}; return null; }
}
function drawQR(c,qr,x,y,size){
  rr(c,x,y,size,size,size*0.055);
  c.fillStyle='#ffffff'; c.fill();
  if(!qr) return;
  var n=qr.getModuleCount(), quiet=4;
  var cell=Math.floor(size/(n+quiet*2));
  if(cell<1) cell=1;
  var total=cell*(n+quiet*2);
  var ox=Math.round(x+(size-total)/2)+quiet*cell;
  var oy=Math.round(y+(size-total)/2)+quiet*cell;
  c.fillStyle='#000000';
  for(var r=0;r<n;r++) for(var col=0;col<n;col++){
    if(qr.isDark(r,col)) c.fillRect(ox+col*cell, oy+r*cell, cell, cell);
  }
}

/* ---------- render ---------- */
function palette(){
  var onImage = !!state.images.bg;
  var light = onImage ? true : (lum(state.bgColor) < 0.5);
  return {
    fg: light ? '#ffffff' : '#14161a',
    mid: light ? 'rgba(255,255,255,0.80)' : 'rgba(20,22,26,0.72)',
    dim: light ? 'rgba(255,255,255,0.62)' : 'rgba(20,22,26,0.55)',
    hair: light ? 'rgba(255,255,255,0.26)' : 'rgba(20,22,26,0.20)'
  };
}
function contactRows(){
  var f=state.fields, rows=[];
  if(f.phone)   rows.push([t('row.tel'), f.phone]);
  if(f.email)   rows.push([t('row.mail'), f.email]);
  if(f.web)     rows.push([t('row.web'), f.web]);
  if(f.address) rows.push([t('row.adr'), f.address]);
  return rows;
}

function render(){
  var D=dims(), W=D.w, H=D.h;
  if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; }
  var p=palette(), f=state.fields, im=state.images;

  ctx.clearRect(0,0,W,H);
  if(im.bg){ drawCover(ctx,im.bg,0,0,W,H); ctx.fillStyle='rgba(8,10,12,0.48)'; ctx.fillRect(0,0,W,H); }
  else { ctx.fillStyle=state.bgColor; ctx.fillRect(0,0,W,H); }

  if(im.partner){
    var pad=W*0.055;
    drawContain(ctx,im.partner,W-pad,pad,W*0.20,W*0.075,'right');
  }

  var qr = makeQR(payload());
  if(state.format==='square') renderSquare(W,H,p,f,im,qr);
  else renderTall(W,H,p,f,im,qr);
}

function renderTall(W,H,p,f,im,qr){
  var maxW = W*0.80, cx = W/2;
  var blocks=[];

  if(im.logo){
    var lw = Math.min(W*0.42, im.logo.naturalWidth/im.logo.naturalHeight*(W*0.11));
    var lh = lw/(im.logo.naturalWidth/im.logo.naturalHeight);
    if(lh>W*0.11){ lh=W*0.11; lw=lh*(im.logo.naturalWidth/im.logo.naturalHeight); }
    blocks.push({h:lh, gap:1.0, draw:function(y){ ctx.drawImage(im.logo, cx-lw/2, y, lw, lh); }});
  }
  if(im.photo){
    var d=W*0.32;
    blocks.push({h:d, gap:1.0, draw:function(y){
      ctx.save(); ctx.beginPath(); ctx.arc(cx,y+d/2,d/2,0,Math.PI*2); ctx.closePath(); ctx.clip();
      drawCover(ctx,im.photo,cx-d/2,y,d,d); ctx.restore();
      ctx.beginPath(); ctx.arc(cx,y+d/2,d/2,0,Math.PI*2);
      ctx.strokeStyle=p.hair; ctx.lineWidth=W*0.004; ctx.stroke();
    }});
  }
  if(f.name){
    var ns = fitFont(ctx, f.name, maxW, Math.round(W*0.088), Math.round(W*0.040), '"Fraunces",Georgia,serif', 600, false);
    blocks.push({h:ns*1.02, gap:0.30, draw:function(y){
      ctx.font='600 '+ns+'px "Fraunces",Georgia,serif';
      ctx.fillStyle=p.fg; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
      ctx.fillText(f.name, cx, y+ns*0.80);
    }});
  }
  if(f.role){
    var rs=Math.round(W*0.036);
    blocks.push({h:rs*1.25, gap:0.16, draw:function(y){
      ctx.font='400 '+rs+'px "Archivo",Arial,sans-serif';
      ctx.fillStyle=p.mid; ctx.textAlign='center';
      ctx.fillText(f.role, cx, y+rs*0.95);
    }});
  }
  if(f.company){
    var cs=Math.round(W*0.026);
    blocks.push({h:cs*1.4, gap:0.85, draw:function(y){
      ctx.font='500 '+cs+'px "IBM Plex Mono",monospace';
      ctx.fillStyle=p.dim; ctx.textAlign='center';
      ctx.save(); ctx.letterSpacing = (cs*0.14)+'px';
      ctx.fillText(String(f.company).toUpperCase(), cx, y+cs);
      ctx.restore(); ctx.letterSpacing='0px';
    }});
  }
  if(f.phrase){
    var ps=Math.round(W*0.031);
    ctx.font='italic 400 '+ps+'px "Fraunces",Georgia,serif';
    var plines=wrap(ctx,f.phrase,W*0.68);
    blocks.push({h:plines.length*ps*1.34, gap:1.15, draw:function(y){
      ctx.font='italic 400 '+ps+'px "Fraunces",Georgia,serif';
      ctx.fillStyle=p.mid; ctx.textAlign='center';
      for(var i=0;i<plines.length;i++) ctx.fillText(plines[i], cx, y+ps*1.0+i*ps*1.34);
    }});
  }

  var qs=Math.round(W*0.46);
  blocks.push({h:qs, gap:1.0, draw:function(y){ drawQR(ctx,qr,cx-qs/2,y,qs); }});

  var rows=contactRows();
  if(rows.length){
    var vs=Math.round(W*0.028), ls=Math.round(W*0.020), lineH=vs*1.85;
    blocks.push({h:rows.length*lineH, gap:0, draw:function(y){
      for(var i=0;i<rows.length;i++){
        var lab=rows[i][0], val=rows[i][1];
        ctx.font='500 '+ls+'px "IBM Plex Mono",monospace';
        ctx.letterSpacing=(ls*0.12)+'px';
        var lw2=Math.max(ctx.measureText(lab).width, ls*0.62*lab.length);
        ctx.letterSpacing='0px';
        ctx.font='400 '+vs+'px "Archivo",Arial,sans-serif';
        var vw=ctx.measureText(val).width;
        var gap=W*0.024, tot=lw2+gap+vw, sx=cx-tot/2, by=y+vs*0.95+i*lineH;
        ctx.textAlign='left';
        ctx.font='500 '+ls+'px "IBM Plex Mono",monospace';
        ctx.letterSpacing=(ls*0.12)+'px';
        ctx.fillStyle=p.dim; ctx.fillText(lab, sx, by);
        ctx.letterSpacing='0px';
        ctx.font='400 '+vs+'px "Archivo",Arial,sans-serif';
        ctx.fillStyle=p.fg; ctx.fillText(val, sx+lw2+gap, by);
      }
      ctx.textAlign='center';
    }});
  }

  layout(blocks, H, W, 0.82);
}

function stack(blocks,H,unit){
  if(!blocks.length) return;
  var total=0,i;
  for(i=0;i<blocks.length;i++){ total+=blocks[i].h; if(i<blocks.length-1) total+=blocks[i].gap*unit; }
  var y=(H-total)/2;
  for(i=0;i<blocks.length;i++){ blocks[i].draw(y); y+=blocks[i].h; if(i<blocks.length-1) y+=blocks[i].gap*unit; }
}
function layout(blocks,H,W,fill){
  if(!blocks.length) return;
  var sumH=0, sumG=0, i;
  for(i=0;i<blocks.length;i++){ sumH+=blocks[i].h; if(i<blocks.length-1) sumG+=blocks[i].gap; }
  var minGap=W*0.022, target=H*fill;
  var free=target-sumH;
  if(free < minGap*sumG) free = minGap*sumG;
  var span=sumH+free, y=(H-span)/2;
  for(i=0;i<blocks.length;i++){
    blocks[i].draw(y);
    y+=blocks[i].h;
    if(i<blocks.length-1) y += sumG>0 ? free*(blocks[i].gap/sumG) : 0;
  }
}

function renderSquare(W,H,p,f,im,qr){
  var lx=W*0.075, lw=W*0.40, rx=W*0.545, rw=W*0.385;

  ctx.strokeStyle=p.hair; ctx.lineWidth=Math.max(1,W*0.0016);
  ctx.beginPath(); ctx.moveTo(W*0.495,H*0.16); ctx.lineTo(W*0.495,H*0.84); ctx.stroke();

  ctx.textAlign='left'; ctx.textBaseline='alphabetic';

  var left=[];
  if(im.logo){
    var r0=im.logo.naturalWidth/im.logo.naturalHeight, lgw=Math.min(lw*0.75, r0*(W*0.075)), lgh=lgw/r0;
    if(lgh>W*0.075){ lgh=W*0.075; lgw=lgh*r0; }
    left.push({h:lgh, gap:1.0, draw:function(y){ ctx.drawImage(im.logo, lx, y, lgw, lgh); }});
  }
  if(im.photo){
    var d=W*0.17;
    left.push({h:d, gap:1.0, draw:function(y){
      ctx.save(); ctx.beginPath(); ctx.arc(lx+d/2,y+d/2,d/2,0,Math.PI*2); ctx.clip();
      drawCover(ctx,im.photo,lx,y,d,d); ctx.restore();
      ctx.beginPath(); ctx.arc(lx+d/2,y+d/2,d/2,0,Math.PI*2);
      ctx.strokeStyle=p.hair; ctx.lineWidth=W*0.004; ctx.stroke();
    }});
  }
  if(f.name){
    ctx.textAlign='left';
    var ns=fitFont(ctx,f.name,lw,Math.round(W*0.062),Math.round(W*0.030),'"Fraunces",Georgia,serif',600,false);
    left.push({h:ns*1.02, gap:0.30, draw:function(y){
      ctx.font='600 '+ns+'px "Fraunces",Georgia,serif'; ctx.textAlign='left';
      ctx.fillStyle=p.fg; ctx.fillText(f.name, lx, y+ns*0.80);
    }});
  }
  if(f.role){
    var rs=Math.round(W*0.028);
    left.push({h:rs*1.25, gap:0.16, draw:function(y){
      ctx.font='400 '+rs+'px "Archivo",Arial,sans-serif'; ctx.textAlign='left';
      ctx.fillStyle=p.mid; ctx.fillText(f.role, lx, y+rs*0.95);
    }});
  }
  if(f.company){
    var cs=Math.round(W*0.020);
    left.push({h:cs*1.4, gap:0.75, draw:function(y){
      ctx.font='500 '+cs+'px "IBM Plex Mono",monospace'; ctx.textAlign='left';
      ctx.letterSpacing=(cs*0.14)+'px'; ctx.fillStyle=p.dim;
      ctx.fillText(String(f.company).toUpperCase(), lx, y+cs);
      ctx.letterSpacing='0px';
    }});
  }
  if(f.phrase){
    var ps=Math.round(W*0.024);
    ctx.font='italic 400 '+ps+'px "Fraunces",Georgia,serif';
    var pl=wrap(ctx,f.phrase,lw);
    left.push({h:pl.length*ps*1.35, gap:0, draw:function(y){
      ctx.font='italic 400 '+ps+'px "Fraunces",Georgia,serif'; ctx.textAlign='left';
      ctx.fillStyle=p.mid;
      for(var i=0;i<pl.length;i++) ctx.fillText(pl[i], lx, y+ps+i*ps*1.35);
    }});
  }

  var right=[], qs=Math.round(rw*0.86);
  right.push({h:qs, gap:1.0, draw:function(y){ drawQR(ctx,qr,rx,y,qs); }});
  var rows=contactRows();
  if(rows.length){
    var vs=Math.round(W*0.022), ls=Math.round(W*0.016);
    var pre=[];
    ctx.font='400 '+vs+'px "Archivo",Arial,sans-serif';
    for(var i=0;i<rows.length;i++) pre.push(wrap(ctx,rows[i][1],rw));
    var totalH=0;
    for(i=0;i<rows.length;i++) totalH += ls*1.5 + pre[i].length*vs*1.30 + vs*0.55;
    right.push({h:totalH, gap:0, draw:function(y){
      var yy=y;
      for(var i=0;i<rows.length;i++){
        ctx.font='500 '+ls+'px "IBM Plex Mono",monospace'; ctx.textAlign='left';
        ctx.letterSpacing=(ls*0.14)+'px'; ctx.fillStyle=p.dim;
        ctx.fillText(rows[i][0], rx, yy+ls);
        ctx.letterSpacing='0px';
        yy += ls*1.5;
        ctx.font='400 '+vs+'px "Archivo",Arial,sans-serif'; ctx.fillStyle=p.fg;
        for(var j=0;j<pre[i].length;j++) ctx.fillText(pre[i][j], rx, yy+vs*0.9+j*vs*1.30);
        yy += pre[i].length*vs*1.30 + vs*0.55;
      }
    }});
  }

  stack(left, H, W*0.055);
  stack(right, H, W*0.055);
  ctx.textAlign='left';
}

/* ---------- UI ---------- */
var raf=null;
function schedule(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(function(){ raf=null; render(); syncPeek(); syncShareUrl(); }); }

function buildSeg(host, keys, labelOf, current, onPick){
  host.innerHTML='';
  keys.forEach(function(k){
    var b=document.createElement('button');
    b.type='button'; b.textContent=labelOf(k); b.dataset.k=k;
    b.setAttribute('aria-pressed', String(k===current()));
    b.addEventListener('click', function(){
      onPick(k);
      Array.prototype.forEach.call(host.children,function(c){ c.setAttribute('aria-pressed', String(c.dataset.k===k)); });
    });
    host.appendChild(b);
  });
}
function syncSeg(host, current){
  Array.prototype.forEach.call(host.children,function(c){ c.setAttribute('aria-pressed', String(c.dataset.k===current)); });
}

function updateDim(){
  var D=dims(), label = state.format==='phone' ? t('fmt.phone')+' · '+phoneLabel() : t('fmt.'+state.format);
  $('#dim').textContent = label+' · '+D.w+' × '+D.h;
  $('#phone-row').hidden = state.format!=='phone';
  $('#fmt-note').textContent = (state.format==='phone' && state.phone.preset==='screen') ? t('fmt.note.screen') : t('fmt.note');
  syncPresetSelect();
}
function updateQrNote(){
  $('#qr-note').textContent = t('qr.'+state.qrMode+'.note');
  $('#freetext-wrap').hidden = state.qrMode!=='text';
  $('#mode-dim').textContent = t('qr.dim')+t('qr.'+state.qrMode);
}

/* presets */
function syncPresetSelect(){
  var sel=$('#f-preset'), p=state.phone; sel.innerHTML='';
  PRESETS.forEach(function(q){
    var o=document.createElement('option'); o.value=q.id; o.textContent=q.label+' \u00b7 '+q.w+' \u00d7 '+q.h; sel.appendChild(o);
  });
  var os=document.createElement('option'); os.value='screen';
  os.textContent = t('fmt.screen.label') + (p.preset==='screen' ? ' \u00b7 '+p.w+' \u00d7 '+p.h : '');
  sel.appendChild(os);
  if(p.preset==='custom'){
    var oc=document.createElement('option'); oc.value='custom'; oc.textContent=t('fmt.custom')+' \u00b7 '+p.w+' \u00d7 '+p.h; sel.appendChild(oc);
  }
  sel.value = p.preset;
}
function pickScreen(){
  var s=screenSize(); if(!s) return false;
  state.phone={preset:'screen',w:s.w,h:s.h}; state.format='phone';
  syncSeg($('#formats'),'phone'); save(); updateDim(); schedule();
  track('my_screen', {w:s.w, h:s.h});
  return true;
}
$('#f-preset').addEventListener('change', function(){
  var id=this.value;
  if(id==='screen'){ if(!pickScreen()) syncPresetSelect(); return; }
  for(var i=0;i<PRESETS.length;i++) if(PRESETS[i].id===id){ state.phone={preset:id,w:PRESETS[i].w,h:PRESETS[i].h}; }
  state.format='phone'; syncSeg($('#formats'),'phone'); save(); updateDim(); schedule();
  track('preset', {preset:id});
});
$('#myscreen').addEventListener('click', pickScreen);

/* champs texte */
$$('[data-field]').forEach(function(el){
  var k=el.dataset.field;
  el.addEventListener('input', function(){ state.fields[k]=el.value; save(); schedule(); });
});
function syncFields(){ $$('[data-field]').forEach(function(el){ el.value = state.fields[el.dataset.field]||''; }); }

/* pastilles de fond */
(function(){
  var host=$('#swatches');
  SWATCHES.forEach(function(s){
    var b=document.createElement('button');
    b.type='button'; b.className='sw'; b.style.background=s[0]; b.title=s[1];
    b.setAttribute('aria-label', s[1]);
    b.addEventListener('click', function(){
      state.bgColor=s[0]; $('#picker').value=s[0]; save(); syncSwatches(); schedule();
    });
    host.appendChild(b);
  });
  var wrapEl=document.createElement('span'); wrapEl.className='picker';
  var inp=document.createElement('input'); inp.type='color'; inp.id='picker'; inp.value=state.bgColor;
  inp.setAttribute('data-i18n-aria','picker.aria');
  var lab=document.createElement('span'); lab.setAttribute('data-i18n','picker');
  inp.addEventListener('input', function(){ state.bgColor=inp.value; save(); syncSwatches(); schedule(); });
  wrapEl.appendChild(inp); wrapEl.appendChild(lab); host.appendChild(wrapEl);
})();
function syncSwatches(){
  $$('.sw').forEach(function(b,i){
    b.setAttribute('aria-pressed', String(SWATCHES[i][0].toLowerCase()===state.bgColor.toLowerCase()));
  });
  $('#bg-note').textContent = state.images.bg ? t('bg.image') : t('bg.color');
  var pk=$('#picker'); if(pk) pk.value=state.bgColor;
}

/* images : chargement, réduction, mémorisation */
var MAX_SIDE = 1600;
function shrink(img, type){
  var w=img.naturalWidth, h=img.naturalHeight;
  if(!(w>0 && h>0)) return null;
  var keepAlpha = /png|svg|webp|gif/i.test(type||'');
  var s = Math.min(1, MAX_SIDE/Math.max(w,h));
  if(s===1 && /png|jpe?g/i.test(type||'') && img.src.indexOf('data:')===0) return img.src;
  var c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w*s)); c.height=Math.max(1,Math.round(h*s));
  var x=c.getContext('2d'); x.drawImage(img,0,0,c.width,c.height);
  try{ return keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg',0.9); }catch(e){ return null; }
}
function setImage(key, dataUrl, zone, cb){
  var img=new Image();
  img.onload=function(){
    if(!(img.naturalWidth>0 && img.naturalHeight>0)){ if(cb) cb(false); return; }
    state.images[key]=img;
    if(zone){ zone.querySelector('.z-thumb').src=dataUrl; zone.classList.add('filled'); }
    if(cb) cb(true);
  };
  img.onerror=function(){ if(cb) cb(false); };
  img.src=dataUrl;
}
$$('.zone').forEach(function(z){
  var key=z.dataset.zone, input=z.querySelector('input[type=file]');
  var thumb=z.querySelector('.z-thumb'), clear=z.querySelector('.z-clear');

  function accept(file){
    if(!file || !/^image\//.test(file.type)) return;
    var fr=new FileReader();
    fr.onload=function(){
      var raw=new Image();
      raw.onload=function(){
        var small = shrink(raw, file.type) || fr.result;
        state.imageData[key]=small;
        setImage(key, small, z, function(){ save(); syncSwatches(); schedule(); track('image', {zone:key}); });
      };
      raw.onerror=function(){};
      raw.src=fr.result;
    };
    fr.readAsDataURL(file);
  }
  z.addEventListener('click', function(e){ if(e.target===clear) return; input.click(); });
  z.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); input.click(); } });
  input.addEventListener('change', function(){ accept(input.files && input.files[0]); input.value=''; });
  z.addEventListener('dragover', function(e){ e.preventDefault(); z.classList.add('over'); });
  z.addEventListener('dragleave', function(){ z.classList.remove('over'); });
  z.addEventListener('drop', function(e){
    e.preventDefault(); z.classList.remove('over');
    accept(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  });
  clear.addEventListener('click', function(e){
    e.stopPropagation();
    state.images[key]=null; state.imageData[key]=null; thumb.removeAttribute('src'); z.classList.remove('filled');
    save(); syncSwatches(); schedule();
  });
});
function restoreImages(){
  IMG_KEYS.forEach(function(k){
    var d=state.imageData[k]; if(!d) return;
    var z=document.querySelector('.zone[data-zone="'+k+'"]');
    setImage(k, d, z, function(ok){ if(!ok){ state.imageData[k]=null; } syncSwatches(); schedule(); });
  });
}

/* vCard peek */
function syncPeek(){
  var body=$('#peek-body');
  if(!body.hidden) body.textContent = payload() || t('peek.empty');
}
$('#peek').addEventListener('click', function(){
  var body=$('#peek-body'), open=body.hidden;
  body.hidden=!open;
  this.setAttribute('aria-expanded', String(open));
  this.textContent = open ? t('peek.hide') : t('peek.show');
  syncPeek();
});

/* téléchargement & partage */
function filename(){
  var base=(state.fields.name||'carte').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'carte';
  var D=dims();
  return base+'-'+state.format+'-'+D.w+'x'+D.h+'.png';
}
function toBlob(cb){
  try{ cv.toBlob(function(b){ cb(b||null); }, 'image/png'); }catch(e){ cb(null); }
}
$('#dl').addEventListener('click', function(){
  var btn=this, st=$('#status'), name=filename();
  btn.disabled=true; st.textContent=t('st.prep');
  toBlob(function(blob){
    btn.disabled=false;
    if(!blob){ st.textContent=t('st.err'); return; }
    try{
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a'); a.href=url; a.download=name; a.rel='noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
      var D=dims(); st.textContent=t('st.saved')+name+' ('+D.w+' × '+D.h+').';
      track('download', {format:state.format, preset:state.format==='phone'?state.phone.preset:state.format, qr:state.qrMode, lang:lang});
    }catch(e){ st.textContent=t('st.fallback'); }
  });
});
var canShareFiles=false;
try{
  if(navigator.canShare && typeof File==='function'){
    canShareFiles = navigator.canShare({files:[new File([new Uint8Array([137,80,78,71])], 'x.png', {type:'image/png'})]});
  }
}catch(e){ canShareFiles=false; }
$('#share').hidden = !canShareFiles;
$('#share').addEventListener('click', function(){
  var btn=this, st=$('#status'), name=filename();
  btn.disabled=true; st.textContent=t('st.prep');
  toBlob(function(blob){
    if(!blob){ btn.disabled=false; st.textContent=t('st.err'); return; }
    var file=new File([blob], name, {type:'image/png'});
    navigator.share({files:[file], title:state.fields.name||t('title')}).then(function(){
      st.textContent=t('st.shared');
      track('share', {format:state.format, preset:state.format==='phone'?state.phone.preset:state.format, qr:state.qrMode, lang:lang});
    }).catch(function(err){
      st.textContent = (err && err.name==='AbortError') ? t('st.share.cancel') : t('st.fallback');
    }).then(function(){ btn.disabled=false; });
  });
});

/* lien de pré-remplissage */
$('#copy').addEventListener('click', function(){
  var url=buildShareUrl(), st=$('#share-status'), inp=$('#share-url');
  inp.value=url;
  var done=function(){ st.textContent=t('share.copied'); track('copy_link', {qr:state.qrMode, lang:lang}); };
  var fail=function(){ st.textContent=t('share.copyfail'); inp.focus(); inp.select(); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fail);
  else fail();
});
$('#share-url').addEventListener('focus', function(){ this.select(); });

/* reset */
$('#reset').addEventListener('click', function(){
  if(!window.confirm(t('reset.confirm'))) return;
  try{ localStorage.removeItem(KEY); localStorage.removeItem(KEY_V1); }catch(e){}
  location.href = location.pathname;
});

/* langue */
function applyI18n(){
  document.documentElement.lang = lang;
  document.title = t('title');
  $$('[data-i18n]').forEach(function(el){ el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach(function(el){ el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('#lang button').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.lang===lang)); });
  buildSeg($('#formats'), Object.keys(FORMATS), function(k){ return t('fmt.'+k); }, function(){return state.format;}, function(k){ state.format=k; save(); updateDim(); schedule(); track('format', {format:k}); });
  buildSeg($('#qrmode'), QRMODES, function(k){ return t('qr.'+k); }, function(){return state.qrMode;}, function(k){ state.qrMode=k; save(); updateQrNote(); schedule(); track('qr_mode', {mode:k}); });
  var pk=$('#peek'); pk.textContent = $('#peek-body').hidden ? t('peek.show') : t('peek.hide');
  updateDim(); updateQrNote(); syncSwatches(); syncQuotaNote();
  $('#status').textContent=''; $('#share-status').textContent='';
}
$$('#lang button').forEach(function(b){
  b.addEventListener('click', function(){ lang=b.dataset.lang; save(); applyI18n(); schedule(); track('lang', {lang:lang}); });
});

/* ---------- démarrage ---------- */
load();
var fromUrl = applyParams();
if(fromUrl){
  save();
  track('prefill_open', {lang:lang});
  try{ history.replaceState(null, '', location.pathname); }catch(e){}
} else if(!readJSON(KEY)){
  var nl=String(navigator.language||'').toLowerCase();
  lang = nl.indexOf('fr')===0 ? 'fr' : 'en';
}
syncFields();
applyI18n();
restoreImages();
render(); syncShareUrl();

if(document.fonts && document.fonts.load){
  Promise.all([
    document.fonts.load('600 100px Fraunces'),
    document.fonts.load('italic 400 100px Fraunces'),
    document.fonts.load('400 100px Archivo'),
    document.fonts.load('500 100px "IBM Plex Mono"')
  ]).then(function(){ render(); }).catch(function(){});
}
})();
