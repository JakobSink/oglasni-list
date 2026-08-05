/* Oglasni list — projekti, kreative, budget in izračun profita.
   Besedilni podatki so v localStorage, naložene datoteke v IndexedDB.
   Oblačna sinhronizacija se vklopi, ko v config.js vpišeš Supabase url in anonKey. */
(function(){
"use strict";

/* Oznaka različice. Poveča jo vsaka objava — v stranski vrstici je vidna, da se
   na prvi pogled loči, ali brskalnik strežé svežo kopijo ali staro iz cache-a. */
var RAZLICICA="različica 17 · različice premikaš, izbira ostane";

/* ============ pomožne funkcije ============ */
var LS="oglasni-list-v1", LS_TEMA="oglasni-list-tema";
function n(v){if(typeof v==="number")return isFinite(v)?v:0;var x=parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."));return isFinite(x)?x:0;}
var nfE=new Intl.NumberFormat("sl-SI",{minimumFractionDigits:2,maximumFractionDigits:2});
var nf0=new Intl.NumberFormat("sl-SI",{maximumFractionDigits:0});
var nf1=new Intl.NumberFormat("sl-SI",{minimumFractionDigits:1,maximumFractionDigits:1});
function e(v){return isFinite(v)?nfE.format(v)+" €":"—";}
function i0(v){return isFinite(v)?nf0.format(Math.round(v)):"—";}
function p1(v){return isFinite(v)?nf1.format(v)+" %":"—";}
function x2(v){return isFinite(v)&&v>0?nfE.format(v)+"×":"—";}
function mb(b){
  if(!isFinite(b))return "—";
  if(b<1024)return b+" B";
  if(b<1024*1024)return nf0.format(b/1024)+" kB";
  return nf1.format(b/1048576)+" MB";
}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function uid(){return "id"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);}
function el(id){return document.getElementById(id);}
function q(s,r){return (r||document).querySelector(s);}
function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function toast(m){var t=el("toast");t.textContent=m;t.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove("on");},2600);}
function cas(iso){
  if(!iso)return "—";
  var d=new Date(iso);if(isNaN(d.getTime()))return "—";
  return d.toLocaleString("sl-SI",{day:"numeric",month:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

/* ============ model ============ */
/* ============ model oglasa: platforma → umestitev → format ============
   Umestitev je tisto, kar v oglasnem računu izbereš pod "placements": ista
   kreativa izgleda v feedu drugače kot v zgodbi in tam se ne prikažejo ista
   polja. Zato umestitev, ne platforma, določa obliko predogleda.               */
var PLATFORME=[["facebook","Facebook"],["instagram","Instagram"],["google","Google"],["tiktok","TikTok"],["youtube","YouTube"],["drugo","Drugo"]];
var FORMATI=["slika","UGC video","video 9:16","karusel","kolekcija","RSA","Performance Max","zgodba","besedilo"];

/* gumbi, kot jih dejansko ponudi posamezen oglasni račun */
var CTA_PLAT={
  facebook:["Kupi zdaj","Nakupuj zdaj","Izvedi več","Naroči zdaj","Prijavi se","Pošlji sporočilo","Rezerviraj","Prenesi","Poišči ponudbo","Pokliči"],
  instagram:["Kupi zdaj","Nakupuj zdaj","Izvedi več","Naroči zdaj","Prijavi se","Rezerviraj","Prenesi","Poišči ponudbo"],
  tiktok:["Kupi zdaj","Nakupuj zdaj","Izvedi več","Naroči zdaj","Prenesi","Prijavi se","Rezerviraj"],
  youtube:["Kupi zdaj","Nakupuj zdaj","Izvedi več","Naroči zdaj","Prenesi","Prijavi se"],
  google:["Izvedi več","Kupi zdaj","Nakupuj zdaj","Naroči zdaj","Prijavi se","Prenesi"],
  drugo:["Kupi zdaj","Izvedi več","Naroči zdaj","Prijavi se","Prenesi"]
};
function ctaSeznam(pl){return CTA_PLAT[pl]||CTA_PLAT.drugo;}
function privzetiCTA(pl){return ctaSeznam(pl)[0];}

/* omejitve znakov po platformi; "priporočeno" je meja, kjer platforma reže */
var LIM={
  facebook:{primarni:125,naslov:40,opis:30,naslovVarno:27,opisVarno:27},
  instagram:{primarni:125,naslov:40,opis:30,naslovVarno:27,opisVarno:27},
  tiktok:{primarni:100,naslov:40,opis:30,naslovVarno:40,opisVarno:30},
  youtube:{primarni:100,naslov:40,opis:30,naslovVarno:40,opisVarno:30},
  google:{primarni:90,naslov:30,opis:90,pot:15,naslovVarno:30,opisVarno:90},
  drugo:{primarni:200,naslov:60,opis:90,naslovVarno:60,opisVarno:90}
};

/* risi = kateri predogled se nariše; rabi = katera polja se v tej umestitvi
   sploh vidijo; zlozi = po koliko vrsticah besedilo dobi „Več“             */
var UMESTITVE={
  facebook:[
    ["fb-feed","Feed",{risi:"fbfeed",r:"4 / 5",px:"1080 × 1350",zlozi:3,rabi:["primarna","naslovi","opisi","cta","url"]}],
    ["fb-reels","Reels",{risi:"reels",r:"9 / 16",px:"1080 × 1920",zlozi:2,rabi:["primarna","cta"]}],
    ["fb-zgodba","Zgodba",{risi:"zgodba",r:"9 / 16",px:"1080 × 1920",zlozi:2,rabi:["primarna","cta"]}],
    ["fb-market","Marketplace",{risi:"market",r:"1 / 1",px:"1080 × 1080",rabi:["naslovi","cta"]}]
  ],
  instagram:[
    ["ig-feed","Feed",{risi:"igfeed",r:"4 / 5",px:"1080 × 1350",zlozi:1,rabi:["primarna","cta"]}],
    ["ig-reels","Reels",{risi:"reels",r:"9 / 16",px:"1080 × 1920",zlozi:2,rabi:["primarna","cta"]}],
    ["ig-zgodba","Zgodba",{risi:"zgodba",r:"9 / 16",px:"1080 × 1920",zlozi:2,rabi:["primarna","cta"]}],
    ["ig-razisci","Razišči",{risi:"igfeed",r:"4 / 5",px:"1080 × 1350",zlozi:1,rabi:["primarna","cta"]}]
  ],
  google:[
    ["g-search","Iskanje",{risi:"search",rabi:["naslovi","opisi","url","pot","sitelinki"]}],
    ["g-display","Display",{risi:"display",r:"1.91 / 1",px:"1200 × 628",rabi:["naslovi","opisi","cta","url"]}],
    ["g-pmax","Performance Max",{risi:"pmax",r:"1.91 / 1",px:"1200 × 628",rabi:["naslovi","opisi","url","pot"]}]
  ],
  tiktok:[
    ["tt-feed","Za vas",{risi:"tiktok",r:"9 / 16",px:"1080 × 1920",zlozi:2,rabi:["primarna","cta"]}]
  ],
  youtube:[
    ["yt-instream","In-stream",{risi:"ytinstream",r:"16 / 9",px:"1920 × 1080",rabi:["naslovi","cta","url"]}],
    ["yt-shorts","Shorts",{risi:"reels",r:"9 / 16",px:"1080 × 1920",zlozi:2,rabi:["primarna","cta"]}]
  ],
  drugo:[
    ["x-splosno","Splošno",{risi:"splosno",rabi:["primarna","naslovi","opisi","cta","url"]}]
  ]
};
/* kje se dani format sploh lahko vrti */
var FORMAT_UM={
  "slika":           ["fb-feed","fb-market","fb-zgodba","fb-reels","ig-feed","ig-razisci","ig-zgodba","ig-reels","g-display","g-pmax","x-splosno"],
  "UGC video":       ["fb-feed","fb-reels","fb-zgodba","fb-market","ig-feed","ig-reels","ig-zgodba","ig-razisci","tt-feed","yt-shorts","yt-instream","g-pmax","x-splosno"],
  "video 9:16":      ["fb-reels","fb-zgodba","ig-reels","ig-zgodba","tt-feed","yt-shorts","fb-feed","ig-feed","x-splosno"],
  "zgodba":          ["fb-zgodba","ig-zgodba","fb-reels","ig-reels","yt-shorts","x-splosno"],
  "karusel":         ["fb-feed","ig-feed","fb-market","ig-razisci","x-splosno"],
  "kolekcija":       ["fb-feed","ig-feed","x-splosno"],
  "RSA":             ["g-search"],
  "Performance Max": ["g-pmax","g-display","g-search"],
  "besedilo":        ["fb-feed","x-splosno"]
};
function umSeznam(pl){return UMESTITVE[pl]||UMESTITVE.drugo;}
/* formati, ki jih dana platforma sploh pozna */
function formatiZa(pl){
  var kljuci=umSeznam(pl).map(function(x){return x[0];});
  return FORMATI.filter(function(f){
    var a=FORMAT_UM[f];
    if(!a)return true;
    return a.some(function(kk){return kljuci.indexOf(kk)>=0;});
  });
}
function umOK(format,key){var a=FORMAT_UM[format];return !a||a.indexOf(key)>=0;}
function umNajdi(pl,key){
  return umSeznam(pl).filter(function(u){return u[0]===key;})[0]||null;
}
function privzetaUmestitev(pl,format){
  var s=umSeznam(pl).filter(function(u){return umOK(format,u[0]);});
  return (s[0]||umSeznam(pl)[0])[0];
}
/* veljavna umestitev kreative — če je format ne dopušča, pade na prvo možno */
function um(k){
  var n=umNajdi(k.platforma,k.umestitev);
  if(!n||!umOK(k.format,n[0]))n=umNajdi(k.platforma,privzetaUmestitev(k.platforma,k.format));
  return n||umSeznam("drugo")[0];
}
function umIme(k){var u=um(k);return u[1];}
function platIme(pl){return (PLATFORME.filter(function(x){return x[0]===pl;})[0]||["","?"])[1];}
/* ali se dano polje v tej umestitvi sploh prikaže */
function seVidi(spec,polje){return !spec.rabi||spec.rabi.indexOf(polje)>=0;}

/* ============ stikala ============
   Stikalo je skupina, ki si jo določiš sam: ime in nekaj možnosti, na primer
   „Trg: Slovenija / Hrvaška / Slovaška“. Uporabi se na dva načina hkrati:

   1. Kot izbirnik nabora. Kreativa nosi svojo vrednost, seznam kreativ pa
      pokaže samo tiste, ki ustrezajo izbrani. Ko preklopiš na Hrvaško, so
      spredaj hrvaški oglasi — lahko so čisto druge kreative.
   2. Kot izbirnik besedila znotraj ene kreative. Če kreativi rečeš, da jo to
      stikalo „vodi“, ima vsaka možnost svoje hooke, besedila, naslove in URL.
      Preklop shrani trenutna besedila in naloži besedila druge možnosti — zato
      predogled, brief in izvoz delajo naprej brez posebnih primerov.

   Polja, ki se pri vodenem stikalu hranijo ločeno po možnosti:              */
var STIK_POLJA=["hooki","primarna","naslovi","opisi","cta","url","kljucneBesede","pot1","pot2","sitelinki"];
var STIK_VSE="*";   /* kreativa velja za vse možnosti */

function novoStikalo(ime,moznosti){
  return {id:uid(),ime:ime||"Novo stikalo",moznosti:(moznosti&&moznosti.length?moznosti:["Prva","Druga"])};
}
function stikala(){return Array.isArray(S.stikala)?S.stikala:[];}
/* Stikala, ki se dejansko pokažejo na izdelkih, kreativah in v seznamu.
   Izklopljeno stikalo ostane definirano skupaj z vsemi vrednostmi — samo ne
   zaseda prostora na strani. Tako imaš lahko pripravljenih več stikal.     */
function stikRabljena(){return stikala().filter(function(g){return g.aktivno!==false;});}
function stikNajdi(gid){return stikala().filter(function(g){return g.id===gid;})[0]||null;}
/* vrednost stikala na izdelku ali kreativi; če je ni, prva možnost */
function stikVrednost(zapis,g){
  var v=zapis&&zapis.stikala?zapis.stikala[g.id]:null;
  if(v===STIK_VSE)return STIK_VSE;
  if(typeof v==="string"&&g.moznosti.indexOf(v)>=0)return v;
  return g.moznosti[0];
}
/* katera možnost je zdaj v pogledu — filter nad seznamom kreativ */
function stikPogled(g){
  var v=S.stikaloPogled&&S.stikaloPogled[g.id];
  if(v===STIK_VSE||g.moznosti.indexOf(v)>=0)return v;
  return STIK_VSE;
}
function stikNastaviPogled(gid,v){
  if(!S.stikaloPogled||typeof S.stikaloPogled!=="object")S.stikaloPogled={};
  S.stikaloPogled[gid]=v;
}
/* ali se kreativa vidi pri trenutnem pogledu vseh stikal */
function stikVidna(k){
  return stikRabljena().every(function(g){
    var pogled=stikPogled(g);
    if(pogled===STIK_VSE)return true;
    var svoja=k.stikala?k.stikala[g.id]:null;
    if(svoja===STIK_VSE||svoja==null)return true;   /* velja za vse */
    return svoja===pogled;
  });
}
function stikFilter(kreative){return (kreative||[]).filter(stikVidna);}
/* nova kreativa prevzame vrednosti izdelka, oziroma tisto, kar je v pogledu */
function stikPodeduj(k,p){
  if(!k.stikala||typeof k.stikala!=="object")k.stikala={};
  stikRabljena().forEach(function(g){
    var pogled=stikPogled(g);
    k.stikala[g.id]=pogled!==STIK_VSE?pogled:stikVrednost(p,g);
  });
}
/* ali to stikalo vodi besedila te kreative */
function stikVodi(k){
  if(!k||!k.vodi)return null;
  var g=stikNajdi(k.vodi);
  return g&&stikVrednost(k,g)!==STIK_VSE?g:null;
}
function praznaVarianta(){
  return {hooki:[""],primarna:[""],naslovi:[""],opisi:[""],cta:"",url:"",kljucneBesede:"",pot1:"",pot2:"",sitelinki:""};
}
function poberiVarianto(k){
  var v={};
  STIK_POLJA.forEach(function(f){
    v[f]=Array.isArray(k[f])?k[f].slice():k[f];
  });
  return v;
}
function nalozVarianto(k,v){
  STIK_POLJA.forEach(function(f){
    if(v[f]==null)return;
    k[f]=Array.isArray(v[f])?v[f].slice():v[f];
  });
}
/* Preklop vodenega stikala: trenutna besedila shrani pod staro možnost in
   naloži besedila nove. Če nove še ni, jo začni kot kopijo trenutne — hrvaški
   oglas se skoraj vedno začne kot prevod slovenskega, ne iz nič.            */
function stikPreklopi(k,g,nova){
  if(!k.variante||typeof k.variante!=="object")k.variante={};
  var stara=stikVrednost(k,g);
  if(!k.stikala||typeof k.stikala!=="object")k.stikala={};
  if(stara===nova){k.stikala[g.id]=nova;return;}
  if(stikVodi(k)&&g.id===k.vodi){
    k.variante[stara]=poberiVarianto(k);
    nalozVarianto(k,k.variante[nova]||poberiVarianto(k));
  }
  k.stikala[g.id]=nova;
}
/* ob vklopu vodenja: vsaka druga možnost dobi kopijo trenutnih besedil */
function stikVklopiVodenje(k,gid){
  var g=stikNajdi(gid);
  k.vodi=g?gid:"";
  if(!g)return;
  if(!k.variante||typeof k.variante!=="object")k.variante={};
  if(stikVrednost(k,g)===STIK_VSE)k.stikala[g.id]=g.moznosti[0];
  var zdaj=stikVrednost(k,g);
  g.moznosti.forEach(function(m){
    if(m!==zdaj&&!k.variante[m])k.variante[m]=poberiVarianto(k);
  });
}
/* segmentirani gumbi; kje = "p" izdelek, "k" kreativa, "v" pogled */
function stikPills(kje,g,izbrana,dovoliVse){
  var moz=g.moznosti.slice();
  var h='<div class="um-pills no-print" role="group" aria-label="'+esc(g.ime)+'">';
  if(dovoliVse)
    h+='<button class="um-p'+(izbrana===STIK_VSE?" on":"")+'" data-stik="'+kje+'" data-sg="'+g.id+'" data-sv="'+STIK_VSE+'">vse</button>';
  moz.forEach(function(m){
    h+='<button class="um-p'+(izbrana===m?" on":"")+'" data-stik="'+kje+'" data-sg="'+g.id+'" data-sv="'+esc(m)+'">'+esc(m)+'</button>';
  });
  return h+'</div>';
}
/* opis vrednosti za brief in izvoz */
function stikOpis(zapis){
  return stikRabljena().map(function(g){
    var v=zapis&&zapis.stikala?zapis.stikala[g.id]:null;
    return g.ime+": "+(v===STIK_VSE?"vse":(v||g.moznosti[0]));
  }).join(" · ");
}

function novProjekt(ime){return {id:uid(),ime:ime||"Nov projekt",opis:"",zapiski:""};}
function novIzdelek(ime,projekt){
  return {id:uid(),projekt:projekt||null,ime:ime||"Nov izdelek",opis:"",znamka:"",domena:"",url:"",
    zapiski:"",stDatotek:0,izracuni:false,stikala:{},
    cena:"",ddv:"22",ddvVkljucen:true,posiljanjePlaca:"",
    nabavna:"",posiljanje:"",embalaza:"",provizijaPct:"2,9",provizijaFix:"0,25",ostalo:"",vracilaPct:"5",
    fiksniMesecni:"",dnevniBudget:"",predvidenCPA:"",
    kreative:[]};
}
function novaKreativa(pl){
  pl=pl||"facebook";
  var fmt=pl==="google"?"RSA":(pl==="tiktok"?"UGC video":"slika");
  return {id:uid(),naslov:"Nova kreativa",platforma:pl,format:fmt,
    umestitev:privzetaUmestitev(pl,fmt),status:"ideja",
    kot:"",publika:"",tagi:"",
    hooki:[""],primarna:[""],naslovi:[""],opisi:[""],cta:privzetiCTA(pl),
    kljucneBesede:"",url:"",pot1:"",pot2:"",sitelinki:"",design:"",izvajalec:"",rok:"",opombe:"",stDatotek:0,
    material:"",oddaja:"",refLinki:"",refOpis:"",ugotovitve:"",
    stikala:{},vodi:"",variante:{},
    budget:"",cpm:"",ctr:"",cvr:"",
    rSpend:"",rImpr:"",rClicks:"",rOrders:""};
}
/* status = korak v procesu, od ideje do oglasa, ki teče */
var STATUSI=[
  ["ideja","ideja"],
  ["brief","sestavi brief"],
  ["snemanje","daj snemat"],
  ["montaza","sestavi kreativo"],
  ["pregled","za pregled"],
  ["pripravljeno","pripravljeno za objavo"],
  ["aktivna","aktivna"],
  ["zmagovalka","zmagovalka"],
  ["pavza","pavza"],
  ["ubita","ubita"]
];
var STATUS_STARI={produkcija:"montaza"};
function statusIme(s){
  var f=STATUSI.filter(function(x){return x[0]===s;})[0];
  return f?f[1]:s;
}
function jeVZraku(k){return k.status==="aktivna"||k.status==="zmagovalka";}
/* koraki, ki čakajo na delo — za opozorilo na pregledu */
var VDELU=["brief","snemanje","montaza","pregled"];
function seed(){
  var pr=novProjekt("Moja trgovina");
  pr.opis="Prvi projekt. Mape uporabi za stranke, blagovne znamke ali sezone.";
  var p=novIzdelek("PRIMER — Masažna pištola",pr.id);
  p.opis="Testni izdelek, da vidiš kako se štejejo številke. Prepiši ali izbriši.";
  p.znamka="Moja trgovina";p.domena="primer.si";
  p.cena="79,90";p.posiljanjePlaca="3,90";p.nabavna="21,50";p.posiljanje="4,20";p.embalaza="1,10";
  p.ostalo="0,80";p.fiksniMesecni="250";p.dnevniBudget="40";p.predvidenCPA="22";
  var f=novaKreativa("facebook");
  f.naslov="FB · UGC — 3 dni brez bolečin";f.format="UGC video";f.status="aktivna";
  f.tagi="UGC, boleča točka, zima";
  f.kot="Boleča točka: vztrajna bolečina v hrbtu po sedenju za računalnikom";
  f.publika="M+Ž 28–50, pisarniško delo, fitnes, široko targetiranje";
  f.hooki=["Tri leta sem plačeval masaže. Potem sem to naredil sam, doma, v 10 minutah.",
           "Fizioterapevt mi je pokazal en gib. Zdaj ga naredim sam vsak večer.",
           "Če te hrbet zbudi ob treh zjutraj, poglej to."];
  f.primarna=["Tri leta sem plačeval masaže po 45 € na uro.\n\nPotem sem kupil to pištolo in v 10 minutah zvečer naredim isto, kar mi je delal fizioterapevt na hrbtu.\n\n· 4 nastavki, 5 hitrosti\n· baterija zdrži 6 ur\n· 30 dni vračilo brez vprašanj\n\nDanes -30 % + brezplačna dostava.",
              "Sedim 9 ur na dan. Hrbet me je ubijal.\n\nEna naprava, 10 minut zvečer, brez terminov in brez čakalnih vrst.\n\n30 dni vračilo, če ne pomaga."];
  f.naslovi=["Bolečina v hrbtu? 10 minut na dan","Cenejše kot dva obiska masaže","-30 % + brezplačna dostava"];
  f.opisi=["Poslano v 24 urah iz Slovenije","30 dni vračilo brez vprašanj"];
  f.design="Vertikalno 9:16, snemano s telefonom v domači sobi, brez studia. Prvi 2 s: roka prižge pištolo in jo prisloni na ramo, zvok naprave ostane. Podnapisi veliki, spodnja tretjina, rumeni highlight na „brez masaž“. Zadnje 3 s: izdelek na mizi + cena + gumb.";
  f.budget="20";f.cpm="9";f.ctr="1,8";f.cvr="2,4";
  f.rSpend="184";f.rImpr="21400";f.rClicks="392";f.rOrders="9";

  var g=novaKreativa("google");
  g.naslov="Google · Search — masažna pištola";g.format="RSA";g.status="montaza";
  g.tagi="Search, exact, glavni izdelek";
  g.izvajalec="jaz";g.rok="do petka";
  g.kot="Namera nakupa: išče konkreten izdelek, odloča se med ponudniki";
  g.publika="Iskanja v SLO, exact + phrase, izključi „popravilo“, „rabljeno“, „najem“";
  g.naslovi=["Masažna pištola — zaloga SLO","Dostava v 24 urah","30 dni vračilo",
             "Od 79,90 € z garancijo","4 nastavki, 5 hitrosti"];
  g.opisi=["Profesionalna masažna pištola za doma. Slovenska zaloga, dostava v 24 urah, 2 leti garancije.",
           "30 dni vračilo brez vprašanj. Plačilo po povzetju ali s kartico. Podpora v slovenščini.",
           "Tiho delovanje, 6 ur baterije, 4 nastavki za hrbet, noge in ramena."];
  g.kljucneBesede="masazna pistola, masažna pištola cena, theragun alternativa, pistola za masazo hrbta";
  g.url="https://primer.si/masazna-pistola";
  g.design="Search — brez vizuala. Sitelinki: Kako uporabljati / Vračila / Mnenja / Kontakt. Callout: Zaloga v SLO, 24 h dostava, 2 leti garancije.";
  g.budget="15";g.cpm="";g.ctr="6,5";g.cvr="3,5";
  p.kreative=[f,g];
  return {v:3,projekti:[pr],aktivenProjekt:pr.id,izdelki:[p],aktiven:p.id,
    kalk:privzetiKalk(),spremenjeno:new Date().toISOString()};
}
function privzetiKalk(){return {budget:"30",cpm:"9",ctr:"1,8",cvr:"2,5",cilj:"1",cena:"",marza:"",cpc:""};}
/* seznam različic: brez praznih na koncu, vedno vsaj eno polje */
function ocistiSeznam(a){
  a=(Array.isArray(a)?a:[]).map(function(x){return x==null?"":String(x);});
  while(a.length>1 && !a[a.length-1].trim())a.pop();
  return a.length?a:[""];
}

/* Vzorci, s katerimi se banka hookov napolni prvič. Potem je uporabnikova. */
var HOOKI=[
 "Tri leta sem plačeval X. Potem sem …",
 "Če te [problem] budi ponoči, preberi to.",
 "Nehaj kupovati [kategorija], dokler ne vidiš tega.",
 "Naredil sem napako, ki jo dela 90 % ljudi z [problem].",
 "[Število] dni. Brez [problem]. Brez [običajna rešitev].",
 "Zakaj [ciljna skupina] to naroča po dva naenkrat",
 "Prodali smo [število] kosov v [obdobje]. Tukaj je zakaj.",
 "Poglej razliko po enem tednu (fotografija prej/potem)",
 "To je stalo manj kot ena masaža / en obisk / ena dostava",
 "Če ti v 30 dneh ne pomaga, ti vrnemo denar. Brez vprašanj.",
 "Primerjava: [naša rešitev] proti [običajna rešitev]",
 "Nihče ti ne pove tega o [kategorija]"
];

/* Katera različica je v predogledu. Hrani se NA KREATIVI, zato izbira ostane
   tudi po osvežitvi strani in je pri vsaki kreativi svoja.                  */
var PRED_POLJA=["hooki","primarna","naslovi","opisi"];

/* Poskrbi, da je stanje veljavno tudi po uvozu ali starejši različici. */
function migriraj(){
  if(!S||typeof S!=="object")S=seed();
  if(!Array.isArray(S.izdelki))S.izdelki=[];
  if(!S.kalk)S.kalk=privzetiKalk();
  if(!Array.isArray(S.projekti)||!S.projekti.length){
    var pr=novProjekt("Moj projekt");
    S.projekti=[pr];
    S.izdelki.forEach(function(x){x.projekt=pr.id;});
    S.aktivenProjekt=pr.id;
  }
  var znani={};S.projekti.forEach(function(x){
    znani[x.id]=1;
    if(typeof x.zapiski!=="string")x.zapiski="";
    if(!x.cgp||typeof x.cgp!=="object")x.cgp={};
    ["pisave","pravila","povezave"].forEach(function(f){
      if(typeof x.cgp[f]!=="string")x.cgp[f]="";
    });
    /* barve so bile prej besedilo z vejicami, zdaj so seznam {hex, ime} */
    if(!Array.isArray(x.cgp.barve))x.cgp.barve=cgpBarve(x.cgp.barve);
    x.cgp.barve=x.cgp.barve.filter(function(b){return b&&typeof b.hex==="string"&&b.hex;});
    x.cgp.barve.forEach(function(b){if(typeof b.ime!=="string")b.ime="";});
  });
  S.izdelki.forEach(function(x){
    if(!x.projekt||!znani[x.projekt])x.projekt=S.projekti[0].id;
    if(typeof x.znamka!=="string")x.znamka="";
    if(typeof x.domena!=="string")x.domena="";
    if(typeof x.url!=="string")x.url="";
    if(typeof x.zapiski!=="string")x.zapiski="";
    if(typeof x.stDatotek!=="number")x.stDatotek=0;
    /* izračuni so dodatek: starim izdelkom s ceno ostanejo vklopljeni */
    if(typeof x.izracuni!=="boolean")x.izracuni=n(x.cena)>0;
    if(!Array.isArray(x.kreative))x.kreative=[];
    x.kreative.forEach(function(k){
      /* eno besedilo → seznam različic */
      k.hooki   = ocistiSeznam(Array.isArray(k.hooki)?k.hooki:(k.hook?[k.hook]:[]));
      k.primarna= ocistiSeznam(Array.isArray(k.primarna)?k.primarna:(k.primarni?[k.primarni]:[]));
      k.naslovi = ocistiSeznam(k.naslovi);
      k.opisi   = ocistiSeznam(k.opisi);
      delete k.hook; delete k.primarni;
      if(typeof k.tagi!=="string")k.tagi="";
      if(typeof k.izvajalec!=="string")k.izvajalec="";
      if(typeof k.rok!=="string")k.rok="";
      if(typeof k.stDatotek!=="number")k.stDatotek=0;
      if(STATUS_STARI[k.status])k.status=STATUS_STARI[k.status];
      if(!STATUSI.some(function(s){return s[0]===k.status;}))k.status="ideja";
      /* umestitev je nova — starim kreativam jo izpelji iz platforme in formata */
      if(typeof k.umestitev!=="string"||!umNajdi(k.platforma,k.umestitev))
        k.umestitev=privzetaUmestitev(k.platforma,k.format);
      /* prikazna pot pri Googlu: če je bila v URL-ju, jo prenesi v polji */
      if(typeof k.pot1!=="string"||typeof k.pot2!=="string"){
        var pot=potIz(k);
        k.pot1=typeof k.pot1==="string"?k.pot1:(pot[0]||"");
        k.pot2=typeof k.pot2==="string"?k.pot2:(pot[1]||"");
      }
      if(typeof k.sitelinki!=="string")k.sitelinki="";
      /* izbrana različica v predogledu se hrani na kreativi, da ostane po osvežitvi */
      if(!k.izbrana||typeof k.izbrana!=="object")k.izbrana={};
      PRED_POLJA.forEach(function(f){
        var i=parseInt(k.izbrana[f],10);
        var dolzina=Array.isArray(k[f])?k[f].length:0;
        k.izbrana[f]=(isFinite(i)&&i>=0&&i<dolzina)?i:0;
      });
      if(!k.cta||ctaSeznam(k.platforma).indexOf(k.cta)<0)k.cta=privzetiCTA(k.platforma);
      if(!k.stikala||typeof k.stikala!=="object")k.stikala={};
      if(!k.variante||typeof k.variante!=="object")k.variante={};
      if(typeof k.vodi!=="string")k.vodi="";
      /* brief po korakih in referenca sta novi — stare opombe so bile mešanica
         navodil in ugotovitev, zato jih pustimo v opombah in ugotovitve začnemo prazne */
      ["material","oddaja","refLinki","refOpis","ugotovitve"].forEach(function(f){
        if(typeof k[f]!=="string")k[f]="";
      });
    });
  });
  if(!S.aktivenProjekt||!znani[S.aktivenProjekt])S.aktivenProjekt=S.projekti[0].id;

  /* stikala si določi uporabnik — privzeto jih ni in nič se ne spremeni */
  if(!Array.isArray(S.stikala))S.stikala=[];
  S.stikala=S.stikala.filter(function(g){
    return g&&typeof g.ime==="string"&&Array.isArray(g.moznosti)&&g.moznosti.length>=2;
  });
  S.stikala.forEach(function(g){
    if(!g.id)g.id=uid();
    g.moznosti=g.moznosti.map(function(m){return String(m==null?"":m).trim();}).filter(Boolean);
  });
  if(!S.stikaloPogled||typeof S.stikaloPogled!=="object")S.stikaloPogled={};

  /* sledi brisanja: brez njih izbrisano vstane pri naslednji sinhronizaciji */
  if(!Array.isArray(S.brisano))S.brisano=[];
  S.brisano=S.brisano.filter(function(x){return x&&typeof x.id==="string";});
  S.brisano.forEach(function(x){if(typeof x.kdaj!=="string")x.kdaj=new Date().toISOString();});

  /* kazalo datotek: pride iz oblaka skupaj s stanjem, zato ga preverimo */
  if(!Array.isArray(S.datoteke))S.datoteke=[];
  S.datoteke=S.datoteke.filter(function(x){
    return x&&typeof x.id==="string"&&typeof x.kreativa==="string";
  });
  S.datoteke.forEach(function(x){
    if(typeof x.ime!=="string")x.ime="brez-imena";
    if(typeof x.tip!=="string")x.tip="";
    if(typeof x.velikost!=="number")x.velikost=0;
  });

  /* banka hookov: prvič jo napolnimo z vzorci, potem je uporabnikova */
  if(!Array.isArray(S.banka))
    S.banka=HOOKI.map(function(t){return {id:uid(),txt:t,kat:"vzorec"};});
  S.banka=S.banka.filter(function(h){return h&&String(h.txt||"").trim();});
  S.banka.forEach(function(h){
    if(!h.id)h.id=uid();
    if(typeof h.kat!=="string"||!h.kat)h.kat="drugo";
  });

  /* vrednosti, ki jih stikalo ne pozna več (preimenovana možnost), pobrišemo,
     da kreativa ne izpade iz vseh pogledov                                  */
  var znanaSt={};
  S.stikala.forEach(function(g){znanaSt[g.id]=g.moznosti;});
  S.izdelki.forEach(function(x){
    if(!x.stikala||typeof x.stikala!=="object")x.stikala={};
    [x].concat(x.kreative).forEach(function(z){
      Object.keys(z.stikala||{}).forEach(function(gid){
        var moz=znanaSt[gid];
        if(!moz||(z.stikala[gid]!==STIK_VSE&&moz.indexOf(z.stikala[gid])<0))delete z.stikala[gid];
      });
    });
    x.kreative.forEach(function(k){
      if(k.vodi&&!znanaSt[k.vodi])k.vodi="";
    });
  });
  S.v=5;
}

var S;
try{var raw=localStorage.getItem(LS);S=raw?JSON.parse(raw):null;}catch(err){S=null;}
if(!S||!S.izdelki||!S.izdelki.length)S=seed();
migriraj();

var view="projekti", odprtaKreativa=null;

function shrani(){
  S.spremenjeno=new Date().toISOString();
  clearTimeout(shrani._t);
  el("saved").textContent="shranjujem…";
  shrani._t=setTimeout(function(){
    try{localStorage.setItem(LS,JSON.stringify(S));el("saved").textContent="shranjeno";}
    catch(err){el("saved").textContent="ni shranjeno";toast("Brskalnik ni mogel shraniti — morda je shramba polna ali si v anonimnem oknu.");}
    Oblak.zaLezi();
  },250);
}
function PR(){
  var f=S.projekti.filter(function(x){return x.id===S.aktivenProjekt;})[0];
  if(!f){f=S.projekti[0];S.aktivenProjekt=f.id;}
  return f;
}
function izdelkiVProjektu(pid){
  var id=pid||S.aktivenProjekt;
  return S.izdelki.filter(function(x){return x.projekt===id;});
}
function P(){
  var v=izdelkiVProjektu();
  var f=v.filter(function(x){return x.id===S.aktiven;})[0];
  if(!f){f=v[0]||null;S.aktiven=f?f.id:null;}
  return f;
}
function K(){
  var p=P();if(!p)return null;
  return p.kreative.filter(function(x){return x.id===odprtaKreativa;})[0]||null;
}
function najdiKreativo(kid){
  for(var i=0;i<S.izdelki.length;i++){
    var k=S.izdelki[i].kreative.filter(function(x){return x.id===kid;})[0];
    if(k)return {izdelek:S.izdelki[i],kreativa:k};
  }
  return null;
}

/* ============ izračuni ============ */
/* izračuni so dodatek na izdelku — brez njih ni marže, CPA-ja in profita */
function imaEkon(p){return !!(p&&p.izracuni);}
function ekon(p){
  var ddvF = p.ddvVkljucen ? (1+n(p.ddv)/100) : 1;
  var bruto = n(p.cena)+n(p.posiljanjePlaca);
  var prihodek = bruto/ddvF;
  var provizija = bruto*n(p.provizijaPct)/100 + n(p.provizijaFix);
  var izdelava = n(p.nabavna)+n(p.posiljanje)+n(p.embalaza)+n(p.ostalo);
  var stroski = izdelava+provizija;
  var marza = prihodek-stroski;
  var r = Math.max(0,Math.min(100,n(p.vracilaPct)))/100;
  var izgubaVracilo = n(p.posiljanje)+n(p.embalaza)+provizija;
  var marzaEf = marza*(1-r) - r*izgubaVracilo;
  return {bruto:bruto,prihodek:prihodek,ddv:bruto-prihodek,provizija:provizija,izdelava:izdelava,
    stroski:stroski,marza:marza,marzaEf:marzaEf,vracila:r,
    marzaPct: prihodek>0 ? marza/prihodek*100 : NaN,
    beCPA: marzaEf,
    beROAS: marzaEf>0 ? bruto/marzaEf : Infinity};
}
function lijak(budget,cpm,ctr,cvr,ek){
  var b=n(budget), c=n(cpm), t=n(ctr)/100, v=n(cvr)/100;
  var impr = c>0 ? b/c*1000 : NaN;
  var kliki = isFinite(impr) ? impr*t : NaN;
  var narocil = isFinite(kliki) ? kliki*v : NaN;
  var cpc = isFinite(kliki)&&kliki>0 ? b/kliki : NaN;
  var cpa = isFinite(narocil)&&narocil>0 ? b/narocil : NaN;
  var prihodek = isFinite(narocil) ? narocil*ek.bruto : NaN;
  var roas = b>0&&isFinite(prihodek) ? prihodek/b : NaN;
  var profit = isFinite(narocil) ? narocil*ek.marzaEf - b : NaN;
  return {budget:b,impr:impr,kliki:kliki,narocil:narocil,cpc:cpc,cpa:cpa,prihodek:prihodek,roas:roas,profit:profit,
    maxCPC: ek.marzaEf>0 ? ek.marzaEf*v : NaN};
}
function rezultat(k,ek){
  var s=n(k.rSpend), im=n(k.rImpr), cl=n(k.rClicks), or_=n(k.rOrders);
  return {spend:s,impr:im,kliki:cl,narocil:or_,
    cpm: im>0 ? s/im*1000 : NaN,
    ctr: im>0 ? cl/im*100 : NaN,
    cpc: cl>0 ? s/cl : NaN,
    cvr: cl>0 ? or_/cl*100 : NaN,
    cpa: or_>0 ? s/or_ : NaN,
    prihodek: or_*ek.bruto,
    roas: s>0 ? or_*ek.bruto/s : NaN,
    profit: or_*ek.marzaEf - s,
    imaPodatke: s>0||im>0||cl>0||or_>0};
}
function znak(v){return !isFinite(v)?"":(v>0.005?"pos":(v<-0.005?"neg":"warn"));}

/* ============ dostop do polj ============ */
function get(o,path){
  var parts=path.split("."),c=o;
  for(var i=0;i<parts.length;i++){if(c==null)return "";c=c[/^\d+$/.test(parts[i])?parseInt(parts[i],10):parts[i]];}
  return c==null?"":c;
}
function set(o,path,val){
  var parts=path.split("."),c=o;
  for(var i=0;i<parts.length-1;i++){var kk=/^\d+$/.test(parts[i])?parseInt(parts[i],10):parts[i];if(c[kk]==null)c[kk]={};c=c[kk];}
  var last=parts[parts.length-1];
  c[/^\d+$/.test(last)?parseInt(last,10):last]=val;
}
function fld(path,label,unit,hint){
  return '<div class="f"><label for="f-'+path+'">'+esc(label)+'</label>'+
    '<div class="wrap"><input id="f-'+path+'" type="text" inputmode="decimal" data-p="'+path+'" value="'+esc(get(P(),path))+'">'+
    (unit?'<span class="unit">'+unit+'</span>':'')+'</div>'+
    (hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
}
function txtFld(path,label,hint,placeholder){
  return '<div class="f"><label for="f-'+path+'">'+esc(label)+'</label>'+
    '<input class="txt" id="f-'+path+'" type="text" data-p="'+path+'" value="'+esc(get(P(),path))+'"'+
    (placeholder?' placeholder="'+esc(placeholder)+'"':'')+'>'+
    (hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
}

/* naslov pogleda z drobtinami */
function glava(naslov,lede,akcije,drobtine){
  var d=(drobtine||[]).map(function(x){
    return x.v ? '<button data-goto="'+x.v+'">'+esc(x.t)+'</button>' : '<span>'+esc(x.t)+'</span>';
  }).join('<i>/</i>');
  return '<div class="head"><div class="head-t">'+
    (d?'<div class="crumb">'+d+'</div>':'')+
    '<h1>'+esc(naslov)+'</h1>'+
    (lede?'<p class="lede">'+lede+'</p>':'')+
  '</div>'+(akcije?'<div class="row no-print">'+akcije+'</div>':'')+'</div>';
}
function znamkaIme(p){return (p&&String(p.znamka||"").trim())||PR().ime;}
function domenaIz(p,k){
  var u=String((k&&k.url)||"").trim()||String((p&&p.domena)||"").trim();
  if(!u)return "";
  return u.replace(/^https?:\/\//i,"").replace(/^www\./i,"").replace(/\/.*$/,"");
}
function potIz(k){
  var u=String((k&&k.url)||"").trim();
  var m=u.replace(/^https?:\/\/[^\/]+/i,"").replace(/^\//,"").replace(/[?#].*$/,"");
  return m?m.split("/").filter(Boolean).slice(0,2):[];
}
function zacetnice(s){
  return String(s||"?").trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0).toUpperCase();}).join("")||"?";
}
function praznoHtml(){
  return glava("Mapa „"+PR().ime+"“ je še brez izdelkov",
    "Izdelek nosi ceno in stroške — iz njega pride marža in vse ostalo. Dodaj prvega, potem se odprejo vsi izračuni in kreative.",
    '<button class="btn btn-p" id="pnew3">+ Dodaj izdelek</button>'+
    '<button class="btn" data-goto="projekti">Nazaj na projekte</button>');
}

/* ============ datoteke (IndexedDB) ============ */
var Datoteke=(function(){
  var IME="oglasni-list-datoteke", STORE="datoteke", db=null, naVoljo=!!window.indexedDB;
  function odpri(){
    return new Promise(function(res,rej){
      if(db)return res(db);
      if(!naVoljo)return rej(new Error("Brskalnik ne podpira shrambe datotek."));
      var r=indexedDB.open(IME,1);
      r.onupgradeneeded=function(){
        var d=r.result;
        if(!d.objectStoreNames.contains(STORE)){
          var s=d.createObjectStore(STORE,{keyPath:"id"});
          s.createIndex("kreativa","kreativa",{unique:false});
        }
      };
      r.onsuccess=function(){db=r.result;res(db);};
      r.onerror=function(){rej(r.error||new Error("Shrambe ni bilo mogoče odpreti."));};
    });
  }
  /* Zahtevo izdamo v isti nalogi kot transakcijo, da se ta ne zaključi prezgodaj. */
  function op(mode,fn){
    return odpri().then(function(d){
      return new Promise(function(res,rej){
        var t=d.transaction(STORE,mode), s=t.objectStore(STORE), req;
        try{req=fn(s);}catch(err){rej(err);return;}
        t.oncomplete=function(){res(req&&"result" in req?req.result:null);};
        t.onerror=function(){rej(t.error);};
        t.onabort=function(){rej(t.error||new Error("Shramba je zavrnila zapis (morda ni prostora)."));};
      });
    });
  }
  /* zaporedna številka, da je vrstni req nalaganja enolicen tudi znotraj iste milisekunde */
  var zap=0;
  function poVrsti(a,b){
    var za=a.zap||0, zb=b.zap||0;
    if(za!==zb)return za-zb;
    return String(a.dodano).localeCompare(String(b.dodano))||String(a.ime).localeCompare(String(b.ime));
  }
  /* ---- kazalo datotek ----
     Bajti so preveliki za JSON, zato v sinhroniziranem stanju hranimo samo
     kazalo (kdo, kako se imenuje, koliko meri), same datoteke pa gredo v
     Supabase Storage. Vsaka naprava tako ve, katere datoteke obstajajo, in jih
     prenese takrat, ko jih res potrebuje.                                    */
  function kazalo(){
    if(!Array.isArray(S.datoteke))S.datoteke=[];
    return S.datoteke;
  }
  function vKazalo(z){
    var k=kazalo();
    if(!k.some(function(x){return x.id===z.id;})){
      k.push({id:z.id,kreativa:z.kreativa,ime:z.ime,tip:z.tip,velikost:z.velikost,dodano:z.dodano,zap:z.zap});
      shrani();
    }
  }
  function izKazala(id){
    var k=kazalo(), i=k.map(function(x){return x.id;}).indexOf(id);
    if(i>=0){k.splice(i,1);shrani();}
  }
  /* lokalni zapisi in kazalo v en seznam; kar je samo v kazalu, čaka na prenos */
  function zlij(lastnik,lokalni){
    var poId={};
    (lokalni||[]).forEach(function(z){poId[z.id]=z;});
    kazalo().filter(function(x){return x.kreativa===lastnik;}).forEach(function(x){
      if(!poId[x.id])poId[x.id]=({id:x.id,kreativa:x.kreativa,ime:x.ime,tip:x.tip,
        velikost:x.velikost,dodano:x.dodano,zap:x.zap,blob:null,vOblaku:true});
    });
    return Object.keys(poId).map(function(id){return poId[id];}).sort(poVrsti);
  }
  return {
    naVoljo:naVoljo,
    poVrsti:poVrsti,
    kazalo:kazalo,
    dodaj:function(kreativaId,file){
      var z={id:uid(),kreativa:kreativaId,ime:file.name||"brez-imena",
        tip:file.type||"",velikost:file.size||0,
        dodano:new Date().toISOString(),zap:Date.now()*1000+(zap++),blob:file};
      return op("readwrite",function(s){return s.put(z);}).then(function(r){
        vKazalo(z);
        /* v oblak gre v ozadju — nalaganje ne sme blokirati vmesnika */
        Oblak.naloziDat(z,file);
        return r;
      });
    },
    zaKreativo:function(kid){
      return op("readonly",function(s){return s.index("kreativa").getAll(kid);})
        .then(function(sez){return zlij(kid,sez);},function(){return zlij(kid,[]);});
    },
    /* zapis, kot je v tej napravi (brez hoje v oblak) */
    lokalno:function(id){return op("readonly",function(s){return s.get(id);});},
    /* katere datoteke še niso potrjeno v oblaku */
    zaOblak:function(){return kazalo().filter(function(x){return !x.oblak;});},
    oznaciVOblaku:function(id){
      var v=kazalo().filter(function(x){return x.id===id;})[0];
      if(v&&!v.oblak){v.oblak=true;shrani();}
    },
    /* Poskrbi, da ima zapis bajte: če jih lokalno ni, jih prenese iz oblaka in
       shrani, da drugič ni več potrebe po mreži.                            */
    zagotovi:function(id){
      return op("readonly",function(s){return s.get(id);}).then(function(z){
        if(z&&z.blob)return z;
        var v=kazalo().filter(function(x){return x.id===id;})[0];
        if(!v)return null;
        return Oblak.prenesiDat(v).then(function(blob){
          if(!blob)return null;
          var nov={id:v.id,kreativa:v.kreativa,ime:v.ime,tip:v.tip||blob.type||"",
            velikost:v.velikost||blob.size||0,dodano:v.dodano,zap:v.zap,blob:blob};
          return op("readwrite",function(s){return s.put(nov);}).then(function(){return nov;});
        },function(){return null;});
      });
    },
    /* prva slika ali video kreative — za naslovnico kartice in predogled oglasa */
    prviVizual:function(kid){
      return op("readonly",function(s){return s.index("kreativa").getAll(kid);}).then(function(sez){
        sez=zlij(kid,sez);
        var slika=sez.filter(function(d){return /^image\//.test(d.tip);})[0];
        var video=sez.filter(function(d){return /^video\//.test(d.tip);})[0];
        var izbran=slika||video||null;
        if(!izbran)return null;
        if(izbran.blob)return izbran;
        if(prenosSpodletel[izbran.id])return null;   /* že poskusili, ne visimo */
        return Datoteke.zagotovi(izbran.id).then(function(z){
          if(!z||!z.blob)prenosSpodletel[izbran.id]=true;
          return z&&z.blob?z:null;
        },function(){prenosSpodletel[izbran.id]=true;return null;});
      });
    },
    steviloZa:function(kid){
      return Promise.resolve(kazalo().filter(function(x){return x.kreativa===kid;}).length);
    },
    /* ena datoteka z bajti — po potrebi jo prej prenese iz oblaka */
    ena:function(id){return this.zagotovi(id);},
    brisi:function(id){
      var v=kazalo().filter(function(x){return x.id===id;})[0];
      izKazala(id);
      Oblak.brisiDat(v||{id:id});
      return op("readwrite",function(s){return s.delete(id);});
    },
    brisiZaKreativo:function(kid){
      kazalo().filter(function(x){return x.kreativa===kid;}).forEach(function(x){
        izKazala(x.id);Oblak.brisiDat(x);
      });
      return op("readwrite",function(s){
        var r=s.index("kreativa").getAllKeys(kid);
        r.onsuccess=function(){(r.result||[]).forEach(function(k){s.delete(k);});};
        return r;
      });
    },
    stevilo:function(){return Promise.resolve(kazalo().length);},
    /* koliko datotek iz kazala še ni v tej napravi */
    manjka:function(){
      return op("readonly",function(s){return s.getAllKeys();}).then(function(kljuci){
        var imam={};(kljuci||[]).forEach(function(k){imam[k]=1;});
        return kazalo().filter(function(x){return !imam[x.id];}).length;
      },function(){return kazalo().length;});
    },
    pocisti:function(){
      S.datoteke=[];shrani();
      return op("readwrite",function(s){return s.clear();});
    },
    /* Datoteke, ki so bile naložene, preden je kazalo obstajalo, enkrat vpišemo
       vanj — drugače bi bile za oblak in druge naprave nevidne.             */
    zgradiKazalo:function(){
      if(!naVoljo||S.datotekeMigrirano)return Promise.resolve(0);
      return op("readonly",function(s){return s.getAll();}).then(function(sez){
        var imam={};kazalo().forEach(function(x){imam[x.id]=1;});
        var dodanih=0;
        (sez||[]).forEach(function(z){
          if(imam[z.id])return;
          kazalo().push({id:z.id,kreativa:z.kreativa,ime:z.ime,tip:z.tip,
            velikost:z.velikost,dodano:z.dodano,zap:z.zap});
          dodanih++;
        });
        S.datotekeMigrirano=true;
        shrani();
        return dodanih;
      },function(){return 0;});
    }
  };
})();

function brisiDatotekeKreativ(kreative){
  if(!Datoteke.naVoljo)return Promise.resolve();
  var p=Promise.resolve();
  /* s kreativo gredo tudi njene reference */
  kreative.forEach(function(k){
    datLastnikiKreative(k).forEach(function(lastnik){
      p=p.then(function(){return Datoteke.brisiZaKreativo(lastnik).catch(function(){});});
    });
  });
  return p;
}
/* z izdelkom gredo tudi njegov material in logo */
function brisiDatotekeIzdelka(izd){
  if(!Datoteke.naVoljo)return Promise.resolve();
  return brisiDatotekeKreativ(izd.kreative||[]).then(function(){
    return Datoteke.brisiZaKreativo(datLastnikIzdelka(izd)).catch(function(){});
  });
}

/* ============ CGP mape ============
   Celostna podoba je last mape (stranke ali znamke), ne izdelka: logotipi,
   barve, pisave in pravila. Gre v brief vsake kreative v tej mapi, da izvajalec
   ne ugiba in ne rabi ločenega PDF-ja.                                       */
function datLastnikCgp(pr){return "cgp:"+(pr&&pr.id);}
/* Barve so seznam vrstic {hex, ime}, ne besedilo z vejicami — barvo izbereš s
   ščipalko in ji pripišeš ime, ki ga uporabljate v pogovoru („rjava“).      */
function cgpBarve(s){
  /* iz starega besedila naredimo seznam; sprejme tudi ze pripravljen seznam */
  if(Array.isArray(s))return s;
  return (String(s||"").match(/#[0-9a-fA-F]{3,8}\b/g)||[]).map(function(h){
    return {hex:h,ime:""};
  });
}
function cgpPaleta(pr){
  if(!pr.cgp||typeof pr.cgp!=="object")pr.cgp={};
  if(!Array.isArray(pr.cgp.barve))pr.cgp.barve=cgpBarve(pr.cgp.barve);
  return pr.cgp.barve;
}
/* zapis barv za brief in izvoz */
function cgpBarveTekst(pr){
  return cgpPaleta(pr).map(function(b){
    return (b.ime?b.ime+" ":"")+b.hex;
  }).join(", ");
}
function cgpHtml(pr){
  var c=pr.cgp||{};
  var barve=cgpPaleta(pr);
  return '<fieldset class="sect cgp" style="margin-top:18px"><div class="lg"><h3>Celostna podoba</h3>'+
    '<p>Logotipi, barve, pisave in pravila te znamke. Gre v brief vsake kreative v tej mapi.</p></div>'+
    '<div class="f"><span class="lbl">Barve</span>'+
      (barve.length
        ? '<div class="pal">'+barve.map(function(b,i){
            return '<div class="pal-v">'+
              '<input type="color" class="pal-c" data-cgpbarva="hex" data-pr="'+pr.id+'" data-i="'+i+'" value="'+esc(/^#[0-9a-fA-F]{6}$/.test(b.hex)?b.hex:"#000000")+'" aria-label="Barva '+(i+1)+'">'+
              '<input type="text" class="txt pal-h" data-cgpbarva="hex" data-pr="'+pr.id+'" data-i="'+i+'" value="'+esc(b.hex)+'" aria-label="Koda barve">'+
              '<input type="text" class="txt pal-i" data-cgpbarva="ime" data-pr="'+pr.id+'" data-i="'+i+'" value="'+esc(b.ime||"")+'" placeholder="ime, npr. rjava" aria-label="Ime barve">'+
              '<button class="pal-x no-print" data-cgpbdel="'+pr.id+'" data-i="'+i+'" title="Odstrani barvo" aria-label="Odstrani barvo">✕</button>'+
            '</div>';
          }).join("")+'</div>'
        : '<p class="hint">Barv še ni.</p>')+
      '<div class="row no-print" style="margin-top:9px"><button class="btn btn-s btn-soft" data-cgpbadd="'+pr.id+'">+ Barva</button></div>'+
      '<span class="hint">Klikni kvadratek za ščipalko ali vpiši kodo. Ime je tisto, ki ga uporabljate v pogovoru — gre v brief skupaj s kodo.</span>'+
    '</div>'+
    '<div class="grid" style="margin-top:16px">'+
      '<div class="f"><label for="cgp-p-'+pr.id+'">Pisave</label>'+
        '<input class="txt" id="cgp-p-'+pr.id+'" type="text" data-cgp="pisave" data-pr="'+pr.id+'" value="'+esc(c.pisave||"")+'" placeholder="Naslovi: Inter Bold · Besedilo: Inter Regular">'+
        '<span class="hint">Kaj za naslove, kaj za besedilo, kaj za cene.</span></div>'+
    '</div>'+
    '<div class="f" style="margin-top:14px"><label for="cgp-t-'+pr.id+'">Pravila in ton</label>'+
      '<textarea id="cgp-t-'+pr.id+'" data-cgp="pravila" data-pr="'+pr.id+'" rows="3" placeholder="Kaj se sme in kaj ne: logo vedno v kotu, brez senc, cene v rumeni, nagovor na ti, brez klicajev …">'+esc(c.pravila||"")+'</textarea></div>'+
    '<div class="f"><label for="cgp-l-'+pr.id+'">Povezave</label>'+
      '<input class="txt" id="cgp-l-'+pr.id+'" type="text" data-cgp="povezave" data-pr="'+pr.id+'" value="'+esc(c.povezave||"")+'" placeholder="Povezava do CGP dokumenta, Drive mape, Figme …">'+
      (String(c.povezave||"").trim()&&/^https?:\/\//i.test(String(c.povezave).trim())
        ? '<span class="ref-l"><a href="'+esc(String(c.povezave).trim())+'" target="_blank" rel="noopener">'+esc(String(c.povezave).trim().replace(/^https?:\/\//,"").slice(0,60))+'</a></span>'
        : '')+
    '</div>'+
    (Datoteke.naVoljo
      ? '<div class="drop no-print" id="drop-cgp-'+pr.id+'" data-dropcgp="'+pr.id+'" style="margin-top:14px">'+
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>'+
          '<b>Naloži logotipe, pisave in CGP dokument</b>'+
          '<span>SVG, PNG, PDF, datoteke pisav. <b>Prva slika je logo oglaševalca v predogledu oglasa.</b> Sinhronizira se z ekipo.</span>'+
        '</div>'+
        '<input type="file" id="dfile-cgp-'+pr.id+'" data-filecgp="'+pr.id+'" multiple hidden>'+
        '<div class="files" id="datoteke-cgp-'+pr.id+'"></div>'
      : '')+
  '</fieldset>';
}

/* ============ POGLED: projekti ============ */
function renderProjekti(){
  var vseIzd=S.izdelki.length;
  var vseKre=S.izdelki.reduce(function(a,x){return a+x.kreative.length;},0);

  var mape=S.projekti.map(function(pr){
    var izd=izdelkiVProjektu(pr.id);
    var stK=izd.reduce(function(a,x){return a+x.kreative.length;},0);
    var aktivnih=izd.reduce(function(a,x){return a+budgetAktivnih(x);},0);
    var najboljsa=izd.map(function(x){return ekon(x).marzaEf;}).sort(function(a,b){return b-a;})[0];
    var jeZdaj=pr.id===S.aktivenProjekt;

    var izdelki=izd.map(function(p){
      var ek=ekon(p);
      var aktKre=p.kreative.filter(function(k){return k.status==="aktivna"||k.status==="zmagovalka";}).length;
      return '<button class="card'+(p.id===S.aktiven&&jeZdaj?" zdaj":"")+'" data-pick="'+p.id+'">'+
        '<div class="card-b">'+
          '<div class="row" style="gap:7px">'+
            (p.id===S.aktiven&&jeZdaj?'<span class="pill st-aktivna">odprt</span>':'')+
            (aktKre?'<span class="pill np" style="background:var(--pos-soft);color:var(--pos)">'+aktKre+' v zraku</span>':'')+
          '</div>'+
          '<span class="card-t">'+esc(p.ime)+'</span>'+
          '<span class="card-s">'+esc(p.opis||"Brez opisa")+'</span>'+
        '</div>'+
        '<div class="card-f">'+
          '<span>marža <b class="'+znak(ek.marzaEf)+'">'+e(ek.marzaEf)+'</b></span>'+
          '<span class="sp"></span>'+
          '<span>'+p.kreative.length+' kreativ</span>'+
        '</div>'+
      '</button>';
    }).join("");

    return '<div class="block">'+
      '<header>'+
        '<div class="head-t">'+
          '<span class="eyebrow">Mapa'+(jeZdaj?" · izbrana":"")+'</span>'+
          '<h2>'+esc(pr.ime)+'</h2>'+
          (pr.opis?'<p style="margin-top:5px">'+esc(pr.opis)+'</p>':'')+
        '</div>'+
        '<span class="sp"></span>'+
        '<div class="row no-print">'+
          '<span class="pill np">'+izd.length+' izdelkov · '+stK+' kreativ'+(aktivnih>0?' · '+e(aktivnih)+'/dan':'')+'</span>'+
          (jeZdaj?'':'<button class="btn btn-s btn-soft" data-prpick="'+pr.id+'">Izberi</button>')+
          '<button class="btn btn-s" data-prrename="'+pr.id+'">Preimenuj</button>'+
          (S.projekti.length>1?'<button class="btn btn-s btn-d" data-prdel="'+pr.id+'">Izbriši</button>':'')+
        '</div>'+
      '</header>'+
      '<div class="pad">'+
        '<div class="cards">'+izdelki+
          '<button class="card card-add" data-addi="'+pr.id+'"><b>+ Izdelek</b><span>cena, stroški, kreative</span></button>'+
        '</div>'+
        /* zapiski mape: kar velja za celo stranko ali sezono, ne za en izdelek */
        '<div class="f" style="margin-top:18px"><label for="pr-zap-'+pr.id+'">Zapiski o mapi</label>'+
          '<textarea id="pr-zap-'+pr.id+'" data-przap="'+pr.id+'" rows="4" placeholder="Kar velja za celo stranko ali sezono: dogovori, dostopi, kdo odloča, kaj je že bilo testirano, roki …">'+esc(pr.zapiski||"")+'</textarea>'+
          '<span class="hint">Shranjuje se med tipkanjem. Gre v brief vsake kreative v tej mapi.</span></div>'+
        cgpHtml(pr)+
        (izd.length?'<p class="note" style="margin-top:14px">Klik na izdelek odpre njegove <b>kreative</b>. Za premik v drugo mapo odpri izdelek in spremeni polje <i>Mapa</i> v Ekonomiki.</p>':
          '<p class="note" style="margin-top:14px">Mapa je prazna.</p>')+
      '</div>'+
    '</div>';
  }).join("");

  el("v-projekti").innerHTML=
  glava("Projekti",
    "Zloženo je v treh nivojih: <b>mapa</b> (stranka, znamka ali sezona) → <b>izdelek</b> (nosi ceno in stroške) → <b>kreativa</b> (en oglas). "+
    "Trenutno imaš "+S.projekti.length+" map, "+vseIzd+" izdelkov in "+vseKre+" kreativ.",
    '<button class="btn btn-p" id="prnew">+ Nova mapa</button>',
    [{t:"Vse mape"}])+
  mape+
  '<div class="block"><header><div class="head-t"><h2>Kje se kaj vnaša</h2></div></header><div class="pad">'+
    '<div class="split">'+
      '<div class="kv"><h4>Mapa</h4><p>Samo ime in razdelitev. Nič se ne računa na tem nivoju — mapa obstaja, da ti stvari ne ležijo na kupu.</p></div>'+
      '<div class="kv"><h4>Izdelek</h4><p>Prodajna cena, nabavna cena, dostava, provizije, vračila, fiksni mesečni stroški. Iz tega pride marža in break-even CPA.</p></div>'+
      '<div class="kv"><h4>Kreativa</h4><p>Kot in publika, tekst, slike in videi, design brief, <b>dnevni budget tega oglasa</b> ter izmerjeni rezultati.</p></div>'+
    '</div>'+
  '</div></div>';

  /* brez tega naložene datoteke celostne podobe ostanejo nevidne */
  narisiDatoteke();
}

/* ============ POGLED: pregled ============ */
function budgetAktivnih(p){
  return p.kreative.reduce(function(a,k){
    return a + ((k.status==="aktivna"||k.status==="zmagovalka") ? n(k.budget) : 0);
  },0);
}
function renderPregled(){
  var p=P();
  if(!p){el("v-pregled").innerHTML=praznoHtml();return;}

  el("v-pregled").innerHTML=
  glava(p.ime,
    "Vse na tej strani izhaja iz ene številke: koliko ti ostane od enega naročila. Spodaj lahko takoj spremeniš budget in pričakovani CPA in vidiš, kaj to naredi z mesečnim profitom.",
    '<button class="btn" data-goto="kalkulator">Cena in stroški</button>'+
    '<button class="btn btn-p" data-goto="kreative">Kreative</button>',
    [{t:PR().ime,v:"projekti"},{t:p.ime}])+

  /* 1 — kreative: kaj je dano delat in kaj teče */
  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">1 — Oglasi</span><h2>Kreative</h2></div>'+
      '<p data-o="krN"></p><span class="sp"></span>'+
      '<button class="btn btn-s no-print" data-goto="kreative">Odpri vse</button></header>'+
    '<div class="pad" id="pr-kre"></div>'+
  '</div>'+

  /* 2 — ali izdelek prenese oglase */
  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">2 — Temelj</span>'+
      '<h2>Ali izdelek prenese oglase?</h2></div>'+
      '<p>Marža je edini denar, iz katerega lahko plačaš oglase.</p></header>'+
    '<div class="ledger">'+
      '<div class="cell hero"><span class="k">Marža na naročilo</span><span class="v" data-o="marza">—</span><span class="n" data-o="marzaN"></span></div>'+
      '<div class="cell big"><span class="k">Break-even CPA</span><span class="v accv" data-o="becpa">—</span><span class="n">Toliko smeš največ plačati za eno naročilo. Vse nad tem je izguba.</span></div>'+
      '<div class="cell big"><span class="k">Break-even ROAS</span><span class="v accv" data-o="beroas">—</span><span class="n">Najnižji ROAS, pri katerem nisi v minusu. Meta in Google ga poročata sama.</span></div>'+
    '</div>'+
    '<div class="pad pad-t" id="pr-verdict"></div>'+
  '</div>'+

  /* 3 — kam gre denar */
  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">3 — Razrez</span>'+
      '<h2>Kam gre denar od enega naročila</h2></div>'+
      '<p data-o="wbarSum"></p></header>'+
    '<div class="pad" id="pr-wbar"></div>'+
  '</div>'+

  /* 3 — načrt z vzvodi */
  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">4 — Načrt</span>'+
      '<h2>Koliko daš na dan in kaj od tega ostane</h2></div>'+
      '<p>Spremeni številki in preostanek strani se preračuna.</p></header>'+
    '<div class="pad">'+
      '<div class="lever">'+
        fld("dnevniBudget","Dnevni budget za oglase","€","Skupaj za vse platforme")+
        fld("predvidenCPA","Predviden CPA","€","Kolikor pričakuješ, da te stane eno naročilo")+
        '<div class="f"><span class="lbl">Vsota aktivnih kreativ</span>'+
          '<div class="row"><span class="num" style="font-size:19px" data-o="bAkt">—</span>'+
          '<button class="btn btn-s btn-soft no-print" id="prevzemiBudget">Prevzemi</button></div>'+
          '<span class="hint" data-o="bAktN"></span></div>'+
      '</div>'+
      '<p class="note" style="margin-top:14px"><b>Kje se budget dejansko vnese:</b> na posamezni kreativi (zavihek Kreative → odpri kreativo → razdelek <i>Načrt</i>). '+
      'Tam vpisana številka je tista, ki jo nastaviš tudi v Meta ali Google. Polje zgoraj je samo skupni načrt za ta izdelek; gumb <i>Prevzemi</i> vanj prepiše vsoto kreativ s statusom <i>aktivna</i> ali <i>zmagovalka</i>.</p>'+
    '</div>'+
    '<div class="ledger">'+
      '<div class="cell"><span class="k">Naročila / dan</span><span class="v" data-o="narocil">—</span><span class="n">budget ÷ CPA</span></div>'+
      '<div class="cell"><span class="k">Profit / dan</span><span class="v" data-o="profitD">—</span><span class="n">brez fiksnih stroškov</span></div>'+
      '<div class="cell"><span class="k">Profit / mesec</span><span class="v" data-o="profitM">—</span><span class="n" data-o="profitMN"></span></div>'+
      '<div class="cell"><span class="k">Pri 1 prodaji / dan</span><span class="v" data-o="ena">—</span><span class="n" data-o="enaN"></span></div>'+
    '</div>'+
    '<div class="pad pad-t"><p class="note" data-o="stavek"></p></div>'+
  '</div>'+

  /* 5 — kaj izboljšati */
  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">5 — Vzvodi</span><h2>Kaj premakne to številko najhitreje</h2></div></header>'+
    '<div class="pad" id="pr-vzvodi"></div>'+
  '</div>'+

  /* 6 — izdelek sam: ime, znamka, material, zapiski, stikala */
  '<h2 class="locilo">Podatki izdelka</h2>'+
  izdelekHtml(p);

  narisiDatoteke();
  paintPregled();
}
function paintPregled(){
  var p=P();if(!p||!el("pr-verdict"))return;
  var ek=ekon(p);
  var cpa=n(p.predvidenCPA)||ek.beCPA*0.7;
  var budget=n(p.dnevniBudget);
  var bAkt=budgetAktivnih(p);
  var prodajDan = cpa>0 ? budget/cpa : 0;
  var profitDan = prodajDan*ek.marzaEf - budget;
  var profitMesec = profitDan*30 - n(p.fiksniMesecni);
  var enaNaDan = ek.marzaEf - cpa;

  function put(key,val,cls){
    var t=q('[data-o="'+key+'"]');if(!t)return;
    t.textContent=val;
    if(t.classList.contains("v"))t.className="v "+(cls||"");
  }
  put("marza",e(ek.marzaEf),znak(ek.marzaEf));
  var mn=q('[data-o="marzaN"]');
  if(mn)mn.textContent="Od "+e(ek.bruto)+", ki jih plača stranka, ti po vseh stroških in "+p1(ek.vracila*100)+" vračil ostane toliko.";
  put("becpa",e(ek.beCPA));
  put("beroas",x2(ek.beROAS));
  el("pr-verdict").innerHTML=verdictHtml(ek,cpa,p);

  /* razrez v pas */
  var dostava=n(p.posiljanje)+n(p.embalaza)+n(p.ostalo);
  var seg=[
    ["c-izd","Nabavna cena izdelka",n(p.nabavna),"kar plačaš dobavitelju"],
    ["c-dos","Dostava, embalaža, ostalo",dostava,"strošek izvedbe naročila"],
    ["c-pro","Provizija plačila",ek.provizija,"kartica ali ponudnik plačil"],
    ["c-ddv","DDV",ek.ddv,"gre državi, ni tvoj prihodek"],
    [ek.marza>=0?"c-mar":"c-min",ek.marza>=0?"Marža — s tem plačaš oglase":"Primanjkljaj",Math.abs(ek.marza),
      ek.marza>=0?"pred odbitkom vračil":"stroški presegajo ceno"]
  ];
  var vsota=seg.reduce(function(a,s){return a+Math.max(0,s[2]);},0);
  var wb=el("pr-wbar");
  if(wb){
    wb.innerHTML=vsota>0
      ? '<div class="wbar">'+seg.map(function(s){
          var w=Math.max(0,s[2])/vsota*100;
          return w>0?'<i class="'+s[0]+'" style="width:'+w.toFixed(2)+'%" title="'+esc(s[1])+' '+e(s[2])+'"></i>':'';
        }).join("")+'</div>'+
        '<div class="wleg">'+seg.map(function(s){
          return '<span><em class="'+s[0]+'"></em>'+esc(s[1])+' <i>'+esc(s[3])+'</i> <b>'+e(s[2])+'</b></span>';
        }).join("")+'</div>'
      : '<p class="note">Vpiši prodajno ceno v zavihku Ekonomika, da se razrez izriše.</p>';
  }
  var ws=q('[data-o="wbarSum"]');
  if(ws)ws.textContent=vsota>0?"Od "+e(ek.bruto)+" plačila ti ostane "+e(ek.marza)+" ("+p1(ek.bruto>0?ek.marza/ek.bruto*100:NaN)+" cene).":"";

  /* načrt */
  put("bAkt",e(bAkt));
  var ba=q('[data-o="bAktN"]');
  if(ba){
    var stA=p.kreative.filter(function(k){return k.status==="aktivna"||k.status==="zmagovalka";}).length;
    ba.textContent=stA?stA+" kreativ teče":"Nobena kreativa ni označena kot aktivna";
  }
  put("narocil",isFinite(prodajDan)&&prodajDan>0?nf1.format(prodajDan):"—");
  put("profitD",e(profitDan),znak(profitDan));
  put("profitM",e(profitMesec),znak(profitMesec));
  var pmn=q('[data-o="profitMN"]');
  if(pmn)pmn.textContent="30 dni, minus fiksni "+e(n(p.fiksniMesecni));
  put("ena",e(enaNaDan),znak(enaNaDan));
  var en=q('[data-o="enaN"]');
  if(en)en.textContent=e(enaNaDan*30)+" na mesec, če prodaš en kos dnevno";

  var st=q('[data-o="stavek"]');
  if(st){
    st.innerHTML = budget>0&&cpa>0
      ? "Pri <b>"+e(budget)+"</b> na dan in CPA <b>"+e(cpa)+"</b> pričakuj <b>"+nf1.format(prodajDan)+"</b> naročil dnevno. "+
        "To je "+e(prodajDan*ek.bruto)+" prometa in "+(profitDan>=0?"<b>"+e(profitDan)+"</b> profita":"<b>"+e(-profitDan)+"</b> izgube")+
        " na dan, torej "+(profitMesec>=0?e(profitMesec)+" na mesec":"minus "+e(-profitMesec)+" na mesec")+" po fiksnih stroških."
      : "Vpiši dnevni budget in predviden CPA zgoraj, da dobiš napoved.";
  }

  /* kreative */
  var kn=q('[data-o="krN"]');
  if(kn)kn.textContent=p.kreative.length?p.kreative.length+" kreativ · "+e(bAkt)+" dnevno v aktivnih":"Ni še nobene kreative";
  var kc=el("pr-kre");
  if(kc){
    if(!p.kreative.length){
      kc.innerHTML='<p class="note">Kreativa je en oglas: kot, tekst, slika ali video, budget in rezultati. '+
        '<button class="btn btn-s btn-soft no-print" data-goto="kreative">Naredi prvo</button></p>';
    }else{
      var sk={};p.kreative.forEach(function(k){sk[k.status]=(sk[k.status]||0)+1;});
      var caka=p.kreative.filter(function(k){return VDELU.indexOf(k.status)>=0;}).length;
      kc.innerHTML='<div class="row" style="margin-bottom:14px">'+
        STATUSI.filter(function(s){return sk[s[0]];}).map(function(s){
          return '<span class="pill st-'+s[0]+'">'+s[1]+' · '+sk[s[0]]+'</span>';}).join("")+
        (caka?'<span class="sp"></span><span class="note"><b>'+caka+'</b> čaka na delo</span>':'')+'</div>'+
        '<div class="scroll"><table><thead><tr><th>Kreativa</th><th>Kje je</th><th>Kdo dela</th><th>Rok</th>'+
          '<th>Budget / dan</th><th>CPA</th><th>Profit</th></tr></thead><tbody>'+
        /* najprej tisto, kar čaka na delo — to je razlog, da to tabelo odpreš */
        p.kreative.slice().sort(function(a,b){
          var ra=VDELU.indexOf(a.status)>=0?0:(jeVZraku(a)?1:2);
          var rb=VDELU.indexOf(b.status)>=0?0:(jeVZraku(b)?1:2);
          return ra-rb;
        }).map(function(k){
          var r=rezultat(k,ek), l=lijak(k.budget,k.cpm,k.ctr,k.cvr,ek);
          var cpaK=r.imaPodatke&&r.narocil>0?r.cpa:l.cpa;
          var prof=r.imaPodatke?r.profit:l.profit;
          var caka=VDELU.indexOf(k.status)>=0;
          return '<tr data-open="'+k.id+'" style="cursor:pointer"'+(caka?' class="mark"':'')+'>'+
            '<td>'+esc(k.naslov)+
              (stikRabljena().length?'<i style="display:block;font-size:11.5px;color:var(--ink3);font-style:normal">'+esc(stikOpis(k))+'</i>':'')+
            '</td>'+
            '<td style="text-align:left"><span class="pill st-'+k.status+'">'+esc(statusIme(k.status))+'</span></td>'+
            '<td style="text-align:left">'+esc(k.izvajalec||"—")+'</td>'+
            '<td style="text-align:left">'+esc(k.rok||"—")+'</td>'+
            '<td>'+e(n(k.budget))+'</td>'+
            '<td class="'+(isFinite(cpaK)?(cpaK<=ek.beCPA?"pos":"neg"):"")+'">'+e(cpaK)+'</td>'+
            '<td class="'+znak(prof)+'">'+e(prof)+'</td></tr>';
        }).join("")+'</tbody></table></div>'+
        '<p class="note" style="margin-top:10px">Zgoraj je tisto, kar čaka na delo, potem kar teče, na koncu ostalo. CPA in Profit sta iz izmerjenih rezultatov, kjer so vpisani, drugače iz napovedi. Klik na vrstico odpre kreativo.</p>';
    }
  }

  /* vzvodi */
  var vz=el("pr-vzvodi");
  if(vz){
    var novaCena=ek.bruto*1.1;
    var ddvF=p.ddvVkljucen?(1+n(p.ddv)/100):1;
    var marzaPri10=ek.marzaEf + (novaCena-ek.bruto)/ddvF*(1-ek.vracila) - (novaCena-ek.bruto)*n(p.provizijaPct)/100;
    vz.innerHTML='<ul class="check">'+
      '<li><b>Cena je najmočnejši vzvod.</b> 10 % višja cena ('+e(novaCena)+') dvigne maržo na '+e(marzaPri10)+' — to je '+e(marzaPri10-ek.marzaEf)+' več na vsako naročilo, brez dotika oglasov.</li>'+
      '<li><b>Vračila jedo dvakrat.</b> Pri '+p1(ek.vracila*100)+' te stanejo '+e(ek.marza-ek.marzaEf)+' na naročilo. Boljše fotografije, jasne mere in poštena dostavna doba to znižajo bolj kot kakršno koli optimiziranje oglasov.</li>'+
      '<li><b>Poštnina in upsell dvigneta strop.</b> Vsak evro, ki ga stranka plača povrh, gre skoraj cel v maržo in s tem v break-even CPA — torej si lahko privoščiš dražje klike od konkurence.</li>'+
      '<li><b>Ne skaliraj negativnega.</b> Če je CPA nad '+e(ek.beCPA)+', večji budget samo hitreje izgublja. Najprej popravi kreativo, ceno ali stran, potem dodaj budget.</li>'+
    '</ul>';
  }
}
function verdictHtml(ek,cpa,p){
  var d=ek.marzaEf-cpa, cls, txt;
  if(p&&!imaEkon(p))
    return '<div class="verdict mid"><div><b>Izračuni za ta izdelek so izklopljeni.</b> '+
      'Vidiš budget, prikaze in klike, ne pa marže, CPA-ja in profita. '+
      'Vklopiš jih v zavihku <i>Ekonomika</i>, ko boš imel ceno in stroške.</div></div>';
  if(!isFinite(ek.marzaEf)||ek.marzaEf===0){cls="mid";txt="<b>Vnesi ceno in stroške</b> v zavihku Ekonomika — brez tega so vsi ostali izračuni prazni.";}
  else if(ek.marzaEf<=0){cls="bad";txt="<b>Marža je negativna.</b> Izdelek izgublja denar že pred prvim oglasom. Popravi ceno ali stroške, preden zapraviš en evro za oglase.";}
  else if(d<=0){cls="bad";txt="<b>Predvideni CPA "+e(cpa)+" je nad break-even "+e(ek.beCPA)+".</b> Vsako naročilo te stane "+e(-d)+" preveč. Več budgeta pomeni večjo izgubo, ne večji profit.";}
  else if(d<ek.marzaEf*0.25){cls="mid";txt="<b>Tanka rezerva.</b> Pri CPA "+e(cpa)+" ti ostane "+e(d)+" na naročilo, kar je "+p1(d/ek.marzaEf*100)+" marže. En slabši teden in si na ničli. Cilj: CPA pod "+e(ek.beCPA*0.6)+".";}
  else{cls="ok";txt="<b>Prostor je.</b> Pri CPA "+e(cpa)+" ti ostane "+e(d)+" na naročilo, break-even pa je pri "+e(ek.beCPA)+". Budget lahko dvigaš, dokler CPA ne zleze proti "+e(ek.beCPA*0.8)+".";}
  return '<div class="verdict '+cls+'"><div>'+txt+'</div></div>';
}

/* ============ izdelek in njegovi izracuni ============
   Izdelek (ime, znamka, material, zapiski, stikala) se izrise v Pregledu, ker
   tam gledas prav ta izdelek. Izracuni (cena, stroski, marza, razrez,
   scenariji) so v Kalkulatorju, ker so racunanje in ne urejanje izdelka.
   Samostojnega zavihka Ekonomika ni vec.                                    */
function izdelekHtml(p){
  return '<div class="block" id="ekon-form">'+
    '<fieldset class="sect"><div class="lg"><h3>Osnovno</h3><p>Ime, znamka in kam ta izdelek sodi</p></div>'+
      '<div class="grid">'+
        txtFld("ime","Ime izdelka")+
        '<div class="f"><label for="f-projekt">Mapa / projekt</label><select class="txt" id="f-projekt" data-p="projekt">'+
          S.projekti.map(function(x){return '<option value="'+x.id+'"'+(p.projekt===x.id?" selected":"")+'>'+esc(x.ime)+'</option>';}).join("")+
        '</select><span class="hint">Sprememba izdelek takoj prestavi v drugo mapo.</span></div>'+
        '<div class="f full"><label for="f-opis">Kratek opis / ponudba</label>'+
          '<input class="txt" id="f-opis" type="text" data-p="opis" value="'+esc(p.opis||"")+'" placeholder="Ena vrstica: kaj je in za koga">'+
          '<span class="hint">Poka\u017ee se na kartici izdelka in v briefu.</span></div>'+
        txtFld("znamka","Ime strani / znamke","Uporabi se kot ime ogla\u0161evalca v predogledu oglasa.","npr. Moja trgovina")+
        txtFld("domena","Domena","Prika\u017ee se v predogledu FB in Google oglasa.","npr. mojatrgovina.si")+
        txtFld("url","Povezava na izdelek","Privzeti ciljni URL za nove kreative tega izdelka.","https://\u2026")+
      '</div>'+
    '</fieldset>'+

    '<fieldset class="sect"><div class="lg"><h3>Material in zapiski</h3>'+
      '<p>Slike, videi in vse, kar si ugotovil o tem izdelku. Material je skupen vsem kreativam tega izdelka \u2014 \u010de kreativa nima svojega, se v predogledu uporabi prva slika od tu.</p></div>'+
      '<div class="f"><label for="f-zapiski">Zapiski o izdelku</label>'+
        '<textarea id="f-zapiski" data-p="zapiski" rows="10" placeholder="Specifikacije, kaj vpra\u0161ajo stranke, kaj je na zalogi, dobavni rok, konkurenca, kaj deluje v oglasih \u2026">'+esc(p.zapiski||"")+'</textarea>'+
        '<span class="hint">Gre v brief kreativ tega izdelka.</span></div>'+
      (Datoteke.naVoljo
        ? '<div class="drop no-print" id="drop-izd" style="margin-top:16px">'+
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>'+
            '<b>Nalo\u017ei slike in videe izdelka</b>'+
            '<span>Klikni ali povleci sem. Shrani se v to napravo in v oblak.</span>'+
          '</div>'+
          '<input type="file" id="dfile-izd" multiple accept="image/*,video/*,.pdf" hidden>'+
          '<div class="files" id="datoteke-izd"></div>'
        : '<p class="note">Ta brskalnik ne dovoli shranjevanja datotek (IndexedDB ni na voljo).</p>')+
    '</fieldset>'+

    (stikRabljena().length
      ? '<fieldset class="sect"><div class="lg"><h3>Stikala</h3>'+
          '<p>Privzete vrednosti za nove kreative tega izdelka. Na kreativi jih lahko povozi\u0161, v seznamu kreativ pa s stikalom izbere\u0161, katere oglase vidi\u0161.</p></div>'+
          stikRabljena().map(function(g){
            return '<div class="f"><span class="lbl">'+esc(g.ime)+'</span>'+
              stikPills("p",g,stikVrednost(p,g),false)+'</div>';
          }).join("")+
          '<p class="note" style="margin-top:12px">Stikala ureja\u0161 v zavihku <b>Podatki</b>.</p>'+
        '</fieldset>'
      : '')+

    '<fieldset class="sect"><div class="lg"><h3>Izra\u010duni</h3>'+
      '<p>Mar\u017ea, break-even CPA, ROAS in napoved profita. Dodatek \u2014 \u010de ga ne rabi\u0161, ga pusti izklopljenega in izdelek uporabljaj samo za kreative.</p></div>'+
      '<label class="chk"><input type="checkbox" data-p="izracuni"'+(imaEkon(p)?" checked":"")+'> Vklopi izra\u010dune za ta izdelek</label>'+
      (imaEkon(p)
        ? '<p class="note" style="margin-top:12px">Vklopljeno. Ceno in stro\u0161ke vpi\u0161e\u0161 v zavihku <b>Kalkulator</b>. '+
          '<button class="btn btn-s btn-soft no-print" data-goto="kalkulator">Odpri Kalkulator</button></p>'
        : '<p class="note" style="margin-top:12px">Izklopljeno: pregled in kreative prikazujejo budget, prikaze in klike, ne pa mar\u017ee, CPA-ja in profita. Vklopi, ko bo\u0161 imel ceno in stro\u0161ke.</p>')+
    '</fieldset>'+
  '</div>';
}
/* cena, stroski, razrez in scenariji - to zivi v Kalkulatorju */
function ekonBlokiHtml(p){
  if(!imaEkon(p)){
    return '<div class="block"><header><div class="head-t"><span class="eyebrow">Izra\u010duni</span>'+
      '<h2>Izra\u010duni za \u201e'+esc(p.ime)+'\u201c so izklopljeni</h2></div>'+
      '<p>Kalkulator zgoraj dela tudi brez njih. Za mar\u017eo, break-even CPA in napoved profita jih vklopi na izdelku.</p></header>'+
      '<div class="pad"><button class="btn btn-p no-print" data-goto="pregled">Odpri izdelek</button></div></div>';
  }
  return '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Ekonomika izdelka</span><h2>'+esc(p.ime)+'</h2></div>'+
      '<p>Vse na <b>eno naro\u010dilo</b>. Vpi\u0161i, kar stranka pla\u010da, in vse, kar ti to naro\u010dilo vzame \u2014 od nabavne cene do provizije in vra\u010dil.</p></header>'+
    '<fieldset class="sect"><div class="lg"><h3>Prihodek</h3><p>Kar stranka pla\u010da</p></div>'+
      '<div class="grid">'+
        fld("cena","Prodajna cena","\u20ac","Cena izdelka, kot jo vidi stranka")+
        fld("posiljanjePlaca","Po\u0161tnina, ki jo pla\u010da stranka","\u20ac","0, \u010de je dostava brezpla\u010dna")+
        fld("ddv","DDV","%","V Sloveniji 22 %, za nekatere izdelke 9,5 %")+
        '<div class="f"><span class="lbl">&nbsp;</span><label class="chk"><input type="checkbox" data-p="ddvVkljucen" '+(p.ddvVkljucen?"checked":"")+'> Cena je z vklju\u010denim DDV</label>'+
          '<span class="hint">\u010ce nisi zavezanec za DDV, odkljukaj in pusti DDV na 0.</span></div>'+
      '</div>'+
    '</fieldset>'+
    '<fieldset class="sect"><div class="lg"><h3>Stro\u0161ki na naro\u010dilo</h3><p>Vse, kar odide pri enem prodanem kosu</p></div>'+
      '<div class="grid">'+
        fld("nabavna","Nabavna cena izdelka","\u20ac","Kar pla\u010da\u0161 dobavitelju, s carino in prevozom do tebe")+
        fld("posiljanje","Dostava do stranke","\u20ac","Kar pla\u010da\u0161 po\u0161ti ali kurirju")+
        fld("embalaza","Embala\u017ea in pakiranje","\u20ac","")+
        fld("provizijaPct","Provizija pla\u010dila","%","Stripe, PayPal, banka \u2014 obi\u010dajno 1,5\u20133 %")+
        fld("provizijaFix","Fiksni del provizije","\u20ac","Na transakcijo, npr. 0,25 \u20ac")+
        fld("ostalo","Ostalo na naro\u010dilo","\u20ac","Podpora, darilo, listek, odpadek")+
        fld("vracilaPct","Vra\u010dila in neprevzeti paketi","%","Dele\u017e naro\u010dil, ki se ne obnesejo. Pri povzetju v SLO pogosto 5\u201315 %.")+
      '</div>'+
    '</fieldset>'+
    '<fieldset class="sect"><div class="lg"><h3>Budget in fiksni stro\u0161ki</h3><p>Za napoved profita</p></div>'+
      '<div class="grid">'+
        fld("dnevniBudget","Na\u010drtovan dnevni budget","\u20ac","Skupni na\u010drt za ta izdelek. Dejanski budget vna\u0161a\u0161 na posamezni kreativi.")+
        fld("predvidenCPA","Predviden CPA","\u20ac","Kolikor pri\u010dakuje\u0161, da te stane eno naro\u010dilo")+
        fld("fiksniMesecni","Fiksni mese\u010dni stro\u0161ki","\u20ac","Shopify, orodja, agencija, tvoja pla\u010da \u2014 vse, kar te\u010de ne glede na prodajo")+
      '</div>'+
    '</fieldset>'+
  '</div>'+
  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Razrez</span><h2>Od pla\u010dila do mar\u017ee</h2></div>'+
      '<p>Vrstica za vrstico, kaj se od\u0161teje.</p></header>'+
    '<div class="scroll"><table><thead><tr><th>Postavka</th><th>Znesek</th><th>Dele\u017e pla\u010dila</th></tr></thead><tbody id="razrez"></tbody></table></div>'+
  '</div>'+
  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Scenariji</span><h2>Koliko mora\u0161 prodati</h2></div>'+
      '<p id="scen-note"></p></header>'+
    '<div class="scroll"><table><thead><tr><th>Prodaj / dan</th><th>Budget / dan</th><th>Prihodek / dan</th><th>Profit / dan</th><th>Profit / mesec</th><th>Po fiksnih</th><th>ROAS</th></tr></thead><tbody id="scen"></tbody></table></div>'+
    '<div class="pad" id="scen-info"></div>'+
  '</div>';
}
function paintEkon(){
  var p=P();if(!p||!el("razrez"))return;
  var ek=ekon(p);
  var cpa=n(p.predvidenCPA)||ek.beCPA*0.7;
  function pct(v){return ek.bruto>0?p1(v/ek.bruto*100):"—";}
  var rows=[
    ["Plačilo stranke (bruto)",ek.bruto,1],
    ["− DDV",-ek.ddv,0],
    ["= Neto prihodek",ek.prihodek,1],
    ["− Nabavna, dostava, embalaža, ostalo",-ek.izdelava,0],
    ["− Provizija plačila",-ek.provizija,0],
    ["= Marža na naročilo",ek.marza,1],
    ["− Vračila in neprevzeti ("+p1(ek.vracila*100)+")",-(ek.marza-ek.marzaEf),0],
    ["= Efektivna marža — s tem plačaš oglase",ek.marzaEf,2]
  ];
  el("razrez").innerHTML=rows.map(function(r){
    var strong=r[2]===2;
    return '<tr'+(strong?' class="mark"':'')+'><td'+(r[2]?' style="font-weight:600"':'')+'>'+r[0]+'</td>'+
      '<td class="'+(strong?znak(r[1]):"")+'">'+e(r[1])+'</td><td>'+pct(Math.abs(r[1]))+'</td></tr>';
  }).join("");

  var fiks=n(p.fiksniMesecni);
  el("scen").innerHTML=[1,2,3,5,10,20,50].map(function(m){
    var b=m*cpa, prih=m*ek.bruto, pd=m*(ek.marzaEf-cpa), pm=pd*30, pf=pm-fiks;
    return '<tr'+(m===1?' class="mark"':'')+'><td>'+m+(m===1?" na dan":"")+'</td><td>'+e(b)+'</td><td>'+e(prih)+'</td>'+
      '<td class="'+znak(pd)+'">'+e(pd)+'</td><td class="'+znak(pm)+'">'+e(pm)+'</td><td class="'+znak(pf)+'">'+e(pf)+'</td>'+
      '<td>'+x2(cpa>0?ek.bruto/cpa:NaN)+'</td></tr>';
  }).join("");
  el("scen-note").textContent="Pri predvidenem CPA "+e(cpa)+(n(p.predvidenCPA)?"":" (70 % break-even, ker CPA ni vnesen)")+". Mesec = 30 dni.";

  var naDanZaFiks = (ek.marzaEf-cpa)>0 ? (fiks/30)/(ek.marzaEf-cpa) : NaN;
  var testBudget = Math.max(2*ek.beCPA, 10);
  el("scen-info").innerHTML='<p class="note">'+
    '<b>Pokritje fiksnih stroškov:</b> '+(isFinite(naDanZaFiks)?nf1.format(naDanZaFiks)+" prodaj na dan":"nedosegljivo pri tem CPA")+' ('+e(fiks)+' na mesec).<br>'+
    '<b>Priporočen testni budget:</b> '+e(testBudget)+' na dan na kreativo, 3–4 dni. To je 2× break-even CPA — dovolj, da v testu pride vsaj kakšno naročilo in podatek pomeni kaj. Manj kot to ti da samo šum.<br>'+
    '<b>Kdaj ubiti kreativo:</b> po '+e(testBudget*3)+' porabe brez naročila, ali ko CPA preseže '+e(ek.beCPA)+'.</p>';
}

/* ============ banka hookov ============
   Vzorci spodaj so samo začetek. Svoje hooke dodajaš sam, shranijo se sproti in
   jih razvrstiš po kategoriji — banka je uporabna šele, ko je tvoja.        */
var HOOK_KAT=["boleča točka","dokaz","cena","hitrost","primerjava","zgodba","brez tveganja","sezona","drugo"];
function bankaSeznam(){
  if(!Array.isArray(S.banka))S.banka=[];
  return S.banka;
}
function bankaDodaj(txt,kat){
  txt=String(txt||"").trim();
  if(!txt)return null;
  var h={id:uid(),txt:txt,kat:kat||"drugo"};
  bankaSeznam().push(h);
  shrani();
  return h;
}
/* Banka je privzeto zaprta in odprta drsi v svojem okvirju — pri stotih hookih
   sicer potisne polja za pisanje na dno strani.                             */
var bankaKat="vse", bankaOdprta=false, bankaIskanje="", bankaRed="novi";
function bankaHtml(){
  var vsi=bankaSeznam();
  var kat=vsi.reduce(function(a,h){a[h.kat]=(a[h.kat]||0)+1;return a;},{});
  if(!bankaOdprta){
    return '<div class="f no-print bank-w">'+
      '<button type="button" class="bank-t" id="bank-open">'+
        '<b>Banka hookov</b><em>'+vsi.length+'</em>'+
        '<span>klikni, da jo odpreš in vstaviš hook</span>'+
      '</button></div>';
  }
  var isk=bankaIskanje.toLowerCase();
  var vidni=vsi.filter(function(h){
    if(bankaKat!=="vse"&&h.kat!==bankaKat)return false;
    return !isk||h.txt.toLowerCase().indexOf(isk)>=0;
  });
  if(bankaRed==="abc")vidni=vidni.slice().sort(function(a,b){return a.txt.localeCompare(b.txt,"sl");});
  else if(bankaRed==="novi")vidni=vidni.slice().reverse();
  return '<div class="f no-print bank-w">'+
    '<button type="button" class="bank-t on" id="bank-open"><b>Banka hookov</b><em>'+vsi.length+'</em>'+
      '<span>zapri</span></button>'+
    '<div class="bank-add">'+
      '<input class="txt" type="text" id="bank-nov" placeholder="Napiši svoj hook in pritisni Enter">'+
      '<select class="txt" id="bank-kat">'+
        HOOK_KAT.map(function(x){return '<option'+(x==="drugo"?" selected":"")+'>'+esc(x)+'</option>';}).join("")+
      '</select>'+
      '<button class="btn btn-s btn-p" id="bank-go">Shrani</button>'+
    '</div>'+
    (vsi.length
      ? '<div class="bank-f">'+
          '<input class="txt" type="search" id="bank-isk" value="'+esc(bankaIskanje)+'" placeholder="Išči po besedilu">'+
          '<select class="txt" id="bank-red">'+
            '<option value="novi"'+(bankaRed==="novi"?" selected":"")+'>najnovejši najprej</option>'+
            '<option value="vrsta"'+(bankaRed==="vrsta"?" selected":"")+'>po vrsti dodajanja</option>'+
            '<option value="abc"'+(bankaRed==="abc"?" selected":"")+'>po abecedi</option>'+
          '</select>'+
        '</div>'+
        '<div class="bank-kat">'+
          '<button type="button" class="um-p'+(bankaKat==="vse"?" on":"")+'" data-bkat="vse">vse · '+vsi.length+'</button>'+
          /* kategorije beremo iz banke, ne iz fiksnega seznama — tako se pokažejo
             tudi tiste, ki si jih uvozil ali preimenoval                       */
          Object.keys(kat).sort().map(function(x){
            return '<button type="button" class="um-p'+(bankaKat===x?" on":"")+'" data-bkat="'+esc(x)+'">'+esc(x)+' · '+kat[x]+'</button>';
          }).join("")+
        '</div>'+
        (vidni.length
          ? '<div class="bank bank-s">'+vidni.map(function(h){
              return '<span class="bank-i"><button type="button" data-hook="'+h.id+'" title="Klikni, da ga vstaviš kot novo različico">'+esc(h.txt)+'</button>'+
                '<button type="button" class="bank-x" data-bdel="'+h.id+'" title="Odstrani iz banke" aria-label="Odstrani">✕</button></span>';
            }).join("")+'</div>'
          : '<p class="hint">Nič ne ustreza iskanju.</p>')
      : '<p class="hint">Banka je prazna. Vpiši hook zgoraj — shrani se sproti in ostane na voljo pri vsaki kreativi.</p>')+
    '<span class="hint">Klik na hook ga doda kot novo različico v tej kreativi. Banka je skupna vsem izdelkom in mapam.</span>'+
  '</div>';
}

function renderKreative(){
  var p=P();
  if(!p){el("v-kreative").innerHTML=praznoHtml();return;}
  if(odprtaKreativa && K()) return renderEditor();
  pocistiUrlje();
  var ek=ekon(p);
  var bAkt=budgetAktivnih(p);

  var vidne=stikFilter(p.kreative);
  var skrite=p.kreative.length-vidne.length;

  var kartice=vidne.map(function(k){
    var l=lijak(k.budget,k.cpm,k.ctr,k.cvr,ek), r=rezultat(k,ek);
    var jeDej=r.imaPodatke&&r.narocil>0;
    var prof=r.imaPodatke?r.profit:l.profit;
    var cpaK=jeDej?r.cpa:l.cpa;
    var plat=(PLATFORME.filter(function(x){return x[0]===k.platforma;})[0]||["","?"])[1];
    return '<button class="card" data-open="'+k.id+'">'+
      '<div class="cover" data-cover="'+esc(datLastnik(k))+'">'+
        '<span class="none">'+(k.stDatotek?"nalagam …":"brez materiala")+'</span>'+
        (k.stDatotek>1?'<span class="cnt">'+k.stDatotek+' datotek</span>':'')+
      '</div>'+
      '<div class="card-b">'+
        '<div class="row" style="gap:6px">'+
          '<span class="pill st-'+k.status+'">'+esc(statusIme(k.status))+'</span>'+
          '<span class="pill plat np">'+esc(plat)+'</span>'+
          (k.izvajalec&&VDELU.indexOf(k.status)>=0?'<span class="pill np">'+esc(k.izvajalec)+(k.rok?" · "+esc(k.rok):"")+'</span>':'')+
        '</div>'+
        '<span class="card-t">'+esc(k.naslov)+'</span>'+
        (stikRabljena().length
          ? '<span class="tags stik">'+stikRabljena().map(function(g){
              var v=k.stikala?k.stikala[g.id]:null;
              return '<span'+(k.vodi===g.id?' class="vodi" title="To stikalo vodi besedila te kreative"':'')+'>'+
                esc(v===STIK_VSE?g.ime+": vse":(v||stikVrednost(k,g)))+'</span>';
            }).join("")+'</span>'
          : '')+
        '<span class="card-s">'+esc(k.kot||prvi(k.hooki)||prvi(k.naslovi)||"Brez kota — odpri in napiši, kaj ta oglas obljublja.")+'</span>'+
        (String(k.tagi||"").trim()?'<span class="tags">'+String(k.tagi).split(",").slice(0,4).map(function(x){x=x.trim();return x?'<span>'+esc(x)+'</span>':'';}).join("")+'</span>':'')+
      '</div>'+
      '<div class="card-f">'+
        '<span>'+esc(k.format)+'</span>'+
        '<span>'+(k.hooki.filter(function(x){return String(x).trim();}).length||k.naslovi.filter(function(x){return String(x).trim();}).length)+' različic</span>'+
        '<span class="sp"></span>'+
        '<span>'+e(n(k.budget))+'/dan</span>'+
        (isFinite(cpaK)?'<span>CPA <b class="'+(cpaK<=ek.beCPA?"pos":"neg")+'">'+e(cpaK)+'</b></span>':'')+
        (isFinite(prof)?'<span><b class="'+znak(prof)+'">'+e(prof)+'</b>'+(jeDej?"":" napoved")+'</span>':'')+
      '</div>'+
    '</button>';
  }).join("");

  el("v-kreative").innerHTML=
  glava("Kreative",
    p.kreative.length
      ? "Vsaka kartica je en oglas. Klik odpre tekst, material, budget in izračun. Trenutno je v zraku <b>"+e(bAkt)+" na dan</b> pri break-even CPA "+e(ek.beCPA)+"."
      : "Kreativa je en oglas: kot, tekst, slika ali video, budget in rezultati. Izberi platformo — vsaka ima svoja polja in svoj predogled.",
    '<button class="btn btn-p" data-add="facebook">+ Facebook</button>'+
    '<button class="btn btn-soft" data-add="google">+ Google</button>'+
    '<button class="btn btn-soft" data-add="tiktok">+ TikTok</button>'+
    (p.kreative.length?'<button class="btn" id="xlsx">Izvozi v Excel</button>':''),
    [{t:PR().ime,v:"projekti"},{t:p.ime,v:"pregled"},{t:"Kreative"}])+
  (stikRabljena().length
    ? '<div class="block stik-filter"><div class="pad">'+
        stikRabljena().map(function(g){
          return '<div class="f"><span class="lbl">'+esc(g.ime)+'</span>'+
            stikPills("v",g,stikPogled(g),true)+'</div>';
        }).join("")+
        '<p class="note" style="margin-top:4px">'+
          (skrite
            ? 'Prikazanih '+vidne.length+' od '+p.kreative.length+' kreativ; '+skrite+' jih ta izbira skrije. Nova kreativa prevzame izbrane vrednosti.'
            : 'Izbira določa, katere kreative vidiš in kaj prevzame nova kreativa.')+
        '</p>'+
      '</div></div>'
    : '')+
  '<div class="cards">'+kartice+
    '<button class="card card-add" data-add="facebook"><b>+ Nova kreativa</b><span>privzeto Facebook, platformo lahko zamenjaš</span></button>'+
  '</div>'+
  (skrite&&!vidne.length
    ? '<p class="note" style="margin-top:14px">Vse kreative tega izdelka so skrite s trenutno izbiro stikal. Postavi stikalo na <b>vse</b>, da jih spet vidiš.</p>'
    : '');

  narisiNaslovnice();
}
/* naslovnice kartic — prva slika ali video iz kreative */
function narisiNaslovnice(){
  if(!Datoteke.naVoljo)return;
  qa("[data-cover]").forEach(function(box){
    var kid=box.dataset.cover;
    Datoteke.prviVizual(kid).then(function(d){
      if(!d||!d.blob||!box.parentNode)return;
      var u;
      try{u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);}catch(err){return;}
      var prazno=q(".none",box);if(prazno)prazno.remove();
      var vsebina=/^video\//.test(d.tip)
        ? '<video src="'+u+'" muted preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>'
        : '<img src="'+u+'" alt="">';
      box.insertAdjacentHTML("afterbegin",vsebina);
    },function(){});
  });
}

/* id-ji, katerih prenos iz oblaka je spodletel — brez tega bi jih izris
   poskušal v neskončnost in slike se ne bi pokazale nikoli               */
var prenosSpodletel={};
var odprtiUrlji=[];
function pocistiUrlje(){
  odprtiUrlji.forEach(function(u){try{URL.revokeObjectURL(u);}catch(err){}});
  odprtiUrlji=[];
}

/* ---- kaj kje velja po platformah ---- */
var CFG={
  facebook:{predogled:"feed",lede:"Facebook feed: prvi dve vrstici besedila in slika odločita, ali kdo neha scrollati. Naslov in opis se pokažeta pod sliko, ob gumbu.",
    merila:"CPM v Sloveniji običajno 5–15 €, CTR 1–3 %. Če je CTR pod 1 %, je težava v kreativi; če je CTR dober, nakupov pa ni, je težava na strani izdelka.",
    seznam:["Vertikalno 4:5 ali 9:16 — v feedu zasede več zaslona kot kvadrat.",
      "Prve 3 sekunde videa: gibanje, obraz ali izdelek v uporabi. Brez logotipa na začetku.",
      "Podnapisi vedno — večina gleda brez zvoka.",
      "Cena ali popust naj bo viden na sliki, ne samo v tekstu.",
      "Dokaz: mnenje, število kupcev, garancija.",
      "Zadnje 2–3 sekunde: izdelek, cena, gumb."]},
  instagram:{predogled:"feed",kvadrat:true,lede:"Instagram: slika je vse, besedilo je za pod njo. Naslov se pokaže manj izrazito kot na Facebooku.",
    merila:"CPM podoben Facebooku. Reels je običajno cenejši od feeda, a manj kupne namere.",
    seznam:["Kvadrat 1:1 za feed, 9:16 za Reels in zgodbe.",
      "Estetika mora zdržati ob organskih objavah — preveč 'oglasno' izgubi.",
      "Prvi kader brez teksta preko obraza.",
      "Če je Reels: hitri rezi na 1–2 sekundi.",
      "Blagovna znamka naj bo prepoznavna v prvem kadru."]},
  google:{predogled:"search",lede:"Google Search: ni slike. Vse nosi besedilo, ki ga Google sam kombinira iz tvojih naslovov in opisov. Zato jih napiši tako, da vsaka kombinacija zveni smiselno.",
    merila:"Tu ne kupuješ pozornosti, ampak namero — človek je izdelek že iskal. CTR 4–8 % je normalen, CPC je odvisen od konkurence. CVR je običajno višji kot na Facebooku.",
    seznam:["Naslov 1 naj vsebuje ključno besedo, ki jo človek išče.",
      "Naslov 2 naj nosi razlikovalno prednost: zaloga v SLO, 24 h dostava, garancija.",
      "Naslov 3 naj bo ponudba ali cena.",
      "Opisi naj odgovorijo na zadržke: vračila, plačilo, podpora.",
      "Dodaj negativne ključne besede (rabljeno, popravilo, najem, zastonj).",
      "Ciljna stran mora ponoviti obljubo iz naslova, drugače Google zniža oceno."]},
  tiktok:{predogled:"vertikala",lede:"TikTok: celozaslonski vertikalni video. Deluje samo, če ne izgleda kot oglas — snemano s telefonom, prvi kader brez uvoda.",
    merila:"CPM je nižji od Facebooka, a promet hladnejši. Pričakuj slabši CVR in računaj na nižji CPC, da se izide.",
    seznam:["9:16, posneto s telefonom, brez studia.",
      "Prva sekunda: obraz ali roka, ki nekaj naredi. Nič logotipov.",
      "Govori v kamero, kot da razlagaš prijatelju.",
      "Besedilo na zaslonu naj bo veliko in v spodnji tretjini, nad gumbom.",
      "Dolžina 15–30 sekund.",
      "Zvok: govor ali trenutno popularna glasba."]},
  youtube:{predogled:"splosno",lede:"YouTube: gledalec je prišel gledat nekaj drugega. Prvih 5 sekund je vse, kar imaš zagotovljeno.",
    merila:"Merilo je cena ogleda in nato CPA. Za prodajo izdelka deluje bolje kot remarketing kot pa za hladno publiko.",
    seznam:["Prvih 5 sekund pove, za kaj gre, in imenuje problem.",
      "Vodoravno 16:9 za in-stream, 9:16 za Shorts.",
      "Blagovna znamka in izdelek vidna v prvih 5 sekundah.",
      "Jasen poziv na koncu in v opisu."]},
  drugo:{predogled:"splosno",lede:"Splošna kreativa. Polja uporabi po svoje, izračun deluje enako.",merila:"",seznam:[]}
};
function cfg(k){return CFG[k.platforma]||CFG.drugo;}

/* katera različica gre v predogled */
function izbrane(k){
  if(!k)return {};
  if(!k.izbrana||typeof k.izbrana!=="object")k.izbrana={};
  return k.izbrana;
}
var predIzbor={
  get hooki(){return izbrane(K()).hooki||0;},
  get primarna(){return izbrane(K()).primarna||0;},
  get naslovi(){return izbrane(K()).naslovi||0;},
  get opisi(){return izbrane(K()).opisi||0;}
};
function nastaviIzbor(polje,i){
  var k=K();if(!k)return;
  izbrane(k)[polje]=i;
  shrani();
}
function izbor(polje,dolzina){
  var i=izbrane(K())[polje]||0;
  return i<dolzina?i:0;
}
/* seznam različic z gumbi za dodajanje, brisanje in izbiro v predogled */
/* ============ mere za izvedbo ============
   Mere pridejo iz izbrane umestitve, ne iz glave. Ko klikneš Feed, brief takoj
   pove 4 : 5 in 1080 × 1350 px; ko klikneš Reels, 9 : 16 in 1080 × 1920 z
   varnim območjem. Tega ni treba prepisovati in ne more biti narobe.       */
function mere(k,u){
  var spec=u[2];
  var v=[];
  if(spec.r)v.push({k:"Razmerje",v:String(spec.r).replace(" / "," : ")});
  if(spec.px)v.push({k:"Velikost",v:spec.px+" px"});
  var vertikalna=spec.r==="9 / 16";
  if(vertikalna)v.push({k:"Varno območje",v:"250 px zgoraj in spodaj ostane prazno — tam platforma prekrije s svojim vmesnikom"});
  if(spec.r==="4 / 5")v.push({k:"Opomba",v:"9:16 material se v feedu obreže na 4:5, pomembno naj bo v sredini"});
  var jeVideo=/video|zgodba/i.test(k.format);
  if(jeVideo)v.push({k:"Video",v:"MP4 ali MOV, H.264, "+(vertikalna?"15–30 s":"do 60 s")+", zvok obvezen, podnapisi vžgani"});
  else if(k.format!=="RSA"&&k.format!=="besedilo")v.push({k:"Slika",v:"JPG ali PNG, brez besedila prek več kot 20 % površine"});
  if(k.format==="karusel")v.push({k:"Karusel",v:"vse kartice iste mere, 1 : 1 ali 4 : 5, 2–10 kartic"});
  if(k.platforma==="google"&&k.format!=="RSA")
    v.push({k:"Google",v:"priloži še 1200 × 1200 kvadrat in logo 1200 × 300"});
  return v;
}
function mereHtml(k,u){
  var v=mere(k,u);
  if(!v.length)return "";
  return '<div class="mere"><span class="mere-h">Mere za '+esc(platIme(k.platforma)+" · "+u[1]+" · "+k.format)+'</span>'+
    v.map(function(x){return '<span class="mere-v"><i>'+esc(x.k)+'</i>'+esc(x.v)+'</span>';}).join("")+
    '<span class="hint" style="margin:2px 0 0">Pride iz izbrane umestitve zgoraj — zamenjaj umestitev in mere se spremenijo same. Gre tudi v kopiran brief.</span></div>';
}

/* ============ premikanje različic ============
   Vrstni red različic je pomemben: prva je tista, ki jo najprej prebereš, in v
   Google RSA jo Google tudi najpogosteje uporabi. Premikaš z vlečenjem za
   držalo ali z puščicama — puščici sta tu zato, da dela tudi na telefonu.  */
function premakniVarianto(polje,od,do_){
  var k=K();if(!k||!Array.isArray(k[polje]))return false;
  var a=k[polje];
  if(od<0||od>=a.length||do_<0||do_>=a.length||od===do_)return false;
  a.splice(do_,0,a.splice(od,1)[0]);
  /* izbira v predogledu naj ostane na istem besedilu, ne na istem mestu */
  var iz=izbrane(k);
  if(iz[polje]===od)iz[polje]=do_;
  else if(iz[polje]>od&&iz[polje]<=do_)iz[polje]--;
  else if(iz[polje]<od&&iz[polje]>=do_)iz[polje]++;
  shrani();
  return true;
}
/* vlečenje za držalo, z miško in s prstom */
var vlecem=null;
function zacniVlecenje(ev,polje,i){
  var vrsta=ev.target.closest(".vrow");
  var seznam=vrsta&&vrsta.parentNode;
  if(!seznam)return;
  vlecem={polje:polje,od:i,vrsta:vrsta,seznam:seznam,zdaj:i};
  vrsta.classList.add("vlecem");
  try{ev.target.setPointerCapture(ev.pointerId);}catch(err){}
  ev.preventDefault();
}
function medVlecenjem(ev){
  if(!vlecem)return;
  var vrstice=qa(".vrow",vlecem.seznam);
  var y=ev.clientY;
  for(var j=0;j<vrstice.length;j++){
    if(vrstice[j]===vlecem.vrsta)continue;
    var r=vrstice[j].getBoundingClientRect();
    var sredina=r.top+r.height/2;
    if(y<sredina&&j<vlecem.zdaj){
      vlecem.seznam.insertBefore(vlecem.vrsta,vrstice[j]);
      vlecem.zdaj=j;break;
    }
    if(y>sredina&&j>vlecem.zdaj){
      vlecem.seznam.insertBefore(vlecem.vrsta,vrstice[j].nextSibling);
      vlecem.zdaj=j;break;
    }
  }
}
function konecVlecenja(){
  if(!vlecem)return;
  var v=vlecem;vlecem=null;
  v.vrsta.classList.remove("vlecem");
  /* pravo mesto preberemo iz DOM, ker se je med vlečenjem premikal */
  var koncni=qa(".vrow",v.seznam).indexOf(v.vrsta);
  if(koncni>=0&&koncni!==v.od&&premakniVarianto(v.polje,v.od,koncni))renderEditor();
  else renderEditor();
}
document.addEventListener("pointerdown",function(ev){
  var g=ev.target.closest?ev.target.closest("[data-vgrip]"):null;
  if(!g)return;
  zacniVlecenje(ev,g.dataset.vgrip,parseInt(g.dataset.i,10));
});
document.addEventListener("pointermove",medVlecenjem);
document.addEventListener("pointerup",konecVlecenja);
document.addEventListener("pointercancel",konecVlecenja);

/* pri katerih možnostih vodenega stikala je besedilo že napisano */
function stikNapisane(k,g){
  var zdaj=stikVrednost(k,g);
  function ima(vir){return !!String(prvi(vir&&vir.hooki)||prvi(vir&&vir.naslovi)||prvi(vir&&vir.primarna)||"").trim();}
  return g.moznosti.filter(function(m){
    return m===zdaj ? ima(k) : ima(k.variante&&k.variante[m]);
  });
}

/* Stikala na kreativi. Vsako stikalo je lahko samo oznaka (kateremu trgu oglas
   pripada) ali pa vodi besedila — takrat ima vsaka možnost svoj tekst.       */
function stikalaKreativeHtml(k){
  var vodeno=stikVodi(k);
  var h='<div class="block stik-bar"><div class="pad">';
  stikRabljena().forEach(function(g){
    var v=stikVrednost(k,g), jeVodeno=vodeno&&vodeno.id===g.id;
    h+='<div class="stik-vrsta">'+
      '<span class="lbl">'+esc(g.ime)+'</span>'+
      stikPills("k",g,v,true)+
      '<label class="chk stik-loci" title="Vsaka možnost tega stikala dobi svoj hook, besedilo, naslove, opise, gumb in URL">'+
        '<input type="checkbox" data-loci="'+g.id+'"'+(jeVodeno?" checked":"")+'> ločena besedila'+
      '</label>'+
      '<span class="hint">'+(jeVodeno
        ? 'Preklop shrani, kar je vpisano, in naloži besedila izbrane možnosti. Napisano pri: <b>'+
          esc(stikNapisane(k,g).join(", ")||"—")+'</b>.'
        : (v===STIK_VSE
            ? '„vse“ pomeni, da je oglas viden pri vsaki možnosti. Besedilo je skupno.'
            : 'Besedilo je zdaj skupno vsem možnostim. Obkljukaj <i>ločena besedila</i>, če hočeš za vsako možnost svoj tekst.'))+'</span>'+
    '</div>';
  });
  return h+'</div></div>';
}

function varList(k,polje,label,limit,hint,vrstic){
  var arr=k[polje]||[""];
  var izb=izbor(polje,arr.length);
  var h='<div class="f"><span class="lbl">'+esc(label)+'<em class="cnt-b">'+arr.length+'</em></span><div class="vlist">';
  arr.forEach(function(v,i){
    var val=v==null?"":String(v);
    var over=val.length>limit;
    h+='<div class="vrow" data-vpolje="'+polje+'" data-vi="'+i+'">'+
      '<span class="vgrip no-print" data-vgrip="'+polje+'" data-i="'+i+'" title="Povleci, da premakneš" aria-hidden="true">'+
        '<i></i><i></i><i></i>'+
      '</span>'+
      '<label class="vpick" title="Pokaži to različico v predogledu">'+
        '<input type="radio" name="pv-'+polje+'" data-pv="'+polje+'" data-i="'+i+'"'+(i===izb?" checked":"")+'>'+
        '<span>'+(i+1)+'</span></label>'+
      (vrstic
        ? '<textarea data-c="'+polje+'.'+i+'" data-limit="'+limit+'" rows="'+vrstic+'">'+esc(val)+'</textarea>'
        : '<input class="txt" type="text" data-c="'+polje+'.'+i+'" data-limit="'+limit+'" value="'+esc(val)+'">')+
      '<span class="vend">'+
        '<span class="counter'+(over?" over":"")+'" data-cnt="'+polje+'.'+i+'">'+val.length+' / '+limit+'</span>'+
        (arr.length>1?'<span class="vmove no-print">'+
          '<button data-vgor="'+polje+'.'+i+'"'+(i===0?" disabled":"")+' title="Premakni višje" aria-label="Premakni višje">▲</button>'+
          '<button data-vdol="'+polje+'.'+i+'"'+(i===arr.length-1?" disabled":"")+' title="Premakni nižje" aria-label="Premakni nižje">▼</button>'+
        '</span>':'')+
        (arr.length>1?'<button class="vx no-print" data-vdel="'+polje+'.'+i+'" title="Odstrani to različico" aria-label="Odstrani">'+
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg></button>':'')+
      '</span>'+
    '</div>';
  });
  h+='</div><div class="row no-print" style="margin-top:9px">'+
    '<button class="btn btn-s btn-soft" data-vadd="'+polje+'">+ Dodaj različico</button>'+
    (hint?'<span class="hint" style="flex:1;min-width:150px">'+esc(hint)+'</span>':'')+
  '</div></div>';
  return h;
}
function prvi(arr,i){
  arr=Array.isArray(arr)?arr:[];
  var v=arr[i!=null?i:0];
  if(v!=null&&String(v).trim())return String(v);
  var f=arr.filter(function(x){return x!=null&&String(x).trim();})[0];
  return f?String(f):"";
}

function renderEditor(){
  var p=P(),k=K(),ek=ekon(p),lim=LIM[k.platforma]||LIM.drugo;
  var jeGoogle=k.platforma==="google";
  var c=cfg(k);
  var jeVideoPlat=k.platforma==="tiktok"||k.platforma==="youtube";
  var u=um(k), spec=u[2];
  /* opozorilo pod poljem, če se v izbrani umestitvi ne prikaže */
  function neVidi(polje,kje){
    return seVidi(spec,polje)?"":" V umestitvi "+u[1]+" se "+kje+" ne prikaže — ostane pa zapisano za ostale umestitve.";
  }
  pocistiUrlje();
  function nf(path,label,unit,hint){
    return '<div class="f"><label for="c-'+path+'">'+esc(label)+'</label>'+
      '<div class="wrap"><input id="c-'+path+'" type="text" inputmode="decimal" data-c="'+path+'" value="'+esc(get(k,path))+'">'+
      (unit?'<span class="unit">'+unit+'</span>':'')+'</div>'+(hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
  }

  var platNaziv=platIme(k.platforma);

  el("v-kreative").innerHTML=
  glava(k.naslov||"Kreativa", c.lede,
    '<button class="btn" id="copy">Kopiraj brief</button>'+
    '<button class="btn" id="dup">Podvoji</button>'+
    '<button class="btn btn-d" id="delk">Izbriši</button>',
    [{t:PR().ime,v:"projekti"},{t:p.ime,v:"pregled"},{t:"Kreative",v:"kreative"},{t:platNaziv+" · "+u[1]}])+

  /* stikala takoj pod naslovom — s tem preklapljaš trg oziroma različico */
  (stikRabljena().length?stikalaKreativeHtml(k):'')+

  /* 1 — osnova */
  '<div class="block" id="cre-form">'+
    '<fieldset class="sect"><div class="lg"><h3>Osnova</h3><p>Platforma in umestitev določita polja, omejitve znakov in predogled</p></div>'+
      '<div class="grid">'+
        '<div class="f full"><label for="c-naslov">Ime kreative (za tvojo evidenco)</label>'+
          '<input class="txt" id="c-naslov" type="text" data-c="naslov" value="'+esc(k.naslov)+'" placeholder="npr. FB · UGC — bolečina v hrbtu"></div>'+
        '<div class="f"><label for="c-platforma">Platforma</label><select class="txt" id="c-platforma" data-c="platforma">'+PLATFORME.map(function(x){return '<option value="'+x[0]+'"'+(k.platforma===x[0]?" selected":"")+'>'+x[1]+'</option>';}).join("")+'</select></div>'+
        '<div class="f"><label for="c-format">Format</label><select class="txt" id="c-format" data-c="format">'+
          formatiZa(k.platforma).concat(formatiZa(k.platforma).indexOf(k.format)<0?[k.format]:[]).map(function(x){
            return '<option'+(k.format===x?" selected":"")+'>'+esc(x)+'</option>';}).join("")+'</select>'+
          '<span class="hint">Ponujeni so samo formati, ki jih '+esc(platNaziv)+' pozna.</span></div>'+
        '<div class="f"><label for="c-umestitev">Umestitev</label><select class="txt" id="c-umestitev" data-c="umestitev">'+
          umSeznam(k.platforma).map(function(x){
            var ok=umOK(k.format,x[0]);
            return '<option value="'+x[0]+'"'+(x[0]===u[0]?" selected":"")+(ok?"":" disabled")+'>'+esc(x[1])+(ok?"":" — ni za ta format")+'</option>';
          }).join("")+'</select>'+
          '<span class="hint">To je „placement“ iz oglasnega računa. Določi obliko oglasa in katera polja se sploh prikažejo.</span></div>'+
        '<div class="f"><label for="c-status">Kje je v procesu</label><select class="txt" id="c-status" data-c="status">'+
          STATUSI.map(function(x){return '<option value="'+x[0]+'"'+(k.status===x[0]?" selected":"")+'>'+x[1]+'</option>';}).join("")+'</select>'+
          '<span class="hint">Samo <i>aktivna</i> in <i>zmagovalka</i> se štejeta v dnevni budget izdelka.</span></div>'+
        '<div class="f full"><label for="c-tagi">Oznake</label>'+
          '<input class="txt" id="c-tagi" type="text" data-c="tagi" value="'+esc(k.tagi)+'" placeholder="UGC, boleča točka, zima — ločeno z vejico">'+
          '<span class="hint">Za tvoje razvrščanje: tip kreative, kot, sezona, kdo jo je naredil.</span>'+
          (String(k.tagi||"").trim()?'<span class="tags">'+String(k.tagi).split(",").map(function(t){t=t.trim();return t?'<span>'+esc(t)+'</span>':'';}).join("")+'</span>':'')+
        '</div>'+
      '</div>'+
    '</fieldset>'+

    /* 2 — kot in publika */
    '<fieldset class="sect"><div class="lg"><h3>Kot in publika</h3><p>Kaj obljubljaš in komu</p></div>'+
      '<div class="two">'+
        '<div class="f"><label for="c-kot">Kot / obljuba oglasa</label><textarea id="c-kot" data-c="kot" rows="3" placeholder="Ena misel, ne pet.">'+esc(k.kot)+'</textarea>'+
          '<span class="hint">Izberi eno: boleča točka, primerjava s starim načinom, cena, dokaz drugih kupcev, strah pred zamujeno priložnostjo, status.</span></div>'+
        '<div class="f"><label for="c-publika">Publika in targetiranje</label><textarea id="c-publika" data-c="publika" rows="3">'+esc(k.publika)+'</textarea>'+
          '<span class="hint">'+(jeGoogle?"Katera iskanja loviš, kaj izključiš, kateri tipi ujemanja.":"Starost, lokacija, interesi ali široko targetiranje. Zapiši tudi, kaj izključiš.")+'</span></div>'+
      '</div>'+
    '</fieldset>'+

    /* 3 — material */
    '<fieldset class="sect"><div class="lg"><h3>Material</h3>'+
      '<p>'+(jeGoogle?"Search oglasi ne uporabljajo slik — sem naloži material za morebitni Display ali Performance Max."
                     :"Slike in videi tega oglasa. Prva slika se prikaže v predogledu spodaj in na kartici kreative.")+'</p></div>'+
      (Datoteke.naVoljo
        ? '<div class="drop no-print" id="drop">'+
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>'+
            '<b>Naloži slike in videe</b>'+
            '<span>Klikni, povleci sem ali prilepi s Ctrl+V. Shrani se v to napravo, zato gre lahko tudi za velike video datoteke.</span>'+
          '</div>'+
          '<input type="file" id="dfile" multiple accept="image/*,video/*,.pdf" hidden>'+
          '<div class="files" id="datoteke"></div>'
        : '<p class="note">Ta brskalnik ne dovoli shranjevanja datotek (IndexedDB ni na voljo). Besedila in izračuni delajo normalno.</p>')+
    '</fieldset>'+

    /* 4 — tekst in predogled */
    '<fieldset class="sect"><div class="lg"><h3>Tekst in predogled</h3>'+
      '<p>Polja so ista in enako omejena kot v '+(jeGoogle?"Google Ads":"Meta Ads Manager")+'. Predogled desno se ravna po izbrani umestitvi.</p></div>'+
      '<div class="two">'+
        '<div style="display:flex;flex-direction:column;gap:20px">'+
        (jeGoogle
          ? varList(k,"naslovi","Naslovi",lim.naslov,"Google jih sam kombinira po tri, zato mora vsak zveneti smiselno tudi sam. Vpiši 8–15 različic, nobena se ne sme brati kot nadaljevanje prejšnje.")+
            varList(k,"opisi","Opisi",lim.opis,"Prikažeta se do dva. Vpiši 4 različice.",3)+
            '<div class="grid">'+
              '<div class="f"><label for="c-pot1">Prikazna pot 1</label>'+
                '<div class="wrap"><input class="txt" id="c-pot1" type="text" data-c="pot1" data-limit="'+lim.pot+'" value="'+esc(k.pot1)+'" placeholder="vinil"></div>'+
                '<span class="hint">Zeleni del za domeno v oglasu. Ni pravi URL, do '+lim.pot+' znakov.</span></div>'+
              '<div class="f"><label for="c-pot2">Prikazna pot 2</label>'+
                '<div class="wrap"><input class="txt" id="c-pot2" type="text" data-c="pot2" data-limit="'+lim.pot+'" value="'+esc(k.pot2)+'" placeholder="na-klik"></div></div>'+
            '</div>'+
            '<div class="f"><label for="c-sitelinki">Sitelinki (razširitve povezav)</label>'+
              '<input class="txt" id="c-sitelinki" type="text" data-c="sitelinki" value="'+esc(k.sitelinki)+'" placeholder="Cenik · Vzorci · Montaža · Kontakt">'+
              '<span class="hint">Ločeno z vejico. Google jih pripiše pod oglas — v predogledu se pokažejo.</span></div>'+
            '<div class="f"><label for="c-kljucneBesede">Ključne besede</label>'+
              '<textarea id="c-kljucneBesede" data-c="kljucneBesede" rows="3" placeholder="vinil na klik, vinil pod cena, …">'+esc(k.kljucneBesede)+'</textarea>'+
              '<span class="hint">Ločeno z vejico. Prva se uporabi kot iskalna poizvedba v predogledu. Negativne zapiši v Opombe.</span></div>'+
            '<div class="f"><label for="c-url">Končni URL</label>'+
              '<input class="txt" id="c-url" type="text" data-c="url" value="'+esc(k.url)+'" placeholder="https://'+esc(p.domena||"tvoja-domena.si")+'/izdelek"></div>'
          : varList(k,"hooki","Hooki — prva vrstica"+(jeVideoPlat?" / prve 3 sekunde":""),80,
              "Napiši 3–5 različic in testiraj. Hook je edina stvar, ki se je vredno lotiti prvič.",2)+
            varList(k,"primarna","Primarno besedilo",lim.primarni,
              "Zloži se po "+(spec.zlozi||3)+" vrsticah v „Več“, zato najpomembnejše daj naprej."+neVidi("primarna","primarno besedilo"),7)+
            varList(k,"naslovi","Naslovi"+(seVidi(spec,"naslovi")?" (pod sliko, ob gumbu)":""),lim.naslov,
              "Varno do "+lim.naslovVarno+" znakov, potem se odreže s tremi pikami."+neVidi("naslovi","naslov"))+
            varList(k,"opisi","Opisi (drobno pod naslovom)",lim.opis,
              "Varno do "+lim.opisVarno+" znakov."+neVidi("opisi","opis"))+
            '<div class="grid">'+
              '<div class="f"><label for="c-cta">Gumb (CTA)</label><select class="txt" id="c-cta" data-c="cta">'+
                ctaSeznam(k.platforma).map(function(x){return '<option'+(k.cta===x?" selected":"")+'>'+esc(x)+'</option>';}).join("")+'</select>'+
                '<span class="hint">Seznam je tak, kot ga ponudi '+(k.platforma==="tiktok"?"TikTok Ads":"Meta")+'.</span></div>'+
              '<div class="f"><label for="c-url">Ciljni URL</label><input class="txt" id="c-url" type="text" data-c="url" value="'+esc(k.url)+'" placeholder="https://'+esc(p.domena||"tvoja-domena.si")+'"></div>'+
            '</div>')+
          bankaHtml()+
        '</div>'+
        '<div><div class="prev-wrap">'+
          '<div class="prev-lab"><span class="eyebrow">Predogled</span><span class="sp"></span><span class="pill plat np">'+esc(platNaziv)+'</span></div>'+
          '<div class="um-pills no-print" role="tablist" aria-label="Umestitev">'+
            umSeznam(k.platforma).map(function(x){
              var ok=umOK(k.format,x[0]), izbran=x[0]===u[0];
              return '<button class="um-p'+(izbran?" on":"")+(ok?"":" off")+'" data-um="'+x[0]+'"'+
                (ok?'':' disabled title="Format '+esc(k.format)+' se v tej umestitvi ne vrti"')+'>'+esc(x[1])+'</button>';
            }).join("")+
          '</div>'+
          '<div id="predogled" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:10px"></div>'+
          '<p class="prev-note">Približek, ne posnetek zaslona — vsaka naprava reže besedilo malo drugače. '+
          'Številka v krogu ob različici pove, katera je zdaj v predogledu.</p>'+
        '</div></div>'+
      '</div>'+
    '</fieldset>'+

    /* 5 — referenca: kako si to predstavljaš */
    '<fieldset class="sect"><div class="lg"><h3>Referenca</h3>'+
      '<p>Primeri, ki si jih videl in ti niso ušli iz glave — in kaj bi pri njih spremenil</p></div>'+
      '<div class="f"><label for="c-refLinki">Povezave do primerov</label>'+
        '<textarea id="c-refLinki" data-c="refLinki" rows="3" placeholder="Ena povezava na vrstico — oglas iz Meta Ad Library, TikTok, posnetek zaslona s spleta …">'+esc(k.refLinki||"")+'</textarea>'+
        '<span class="hint">Vsaka vrstica postane klikljiva povezava spodaj.</span></div>'+
      (String(k.refLinki||"").trim()
        ? '<div class="ref-l">'+String(k.refLinki).split("\n").map(function(v){
            v=v.trim();if(!v)return "";
            var url=/^https?:\/\//i.test(v)?v:null;
            return url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(url.replace(/^https?:\/\//,"").slice(0,60))+'</a>':'<span>'+esc(v)+'</span>';
          }).join("")+'</div>'
        : '')+
      '<div class="f" style="margin-top:14px"><label for="c-refOpis">Kaj mi je pri tem všeč in kaj bi spremenil</label>'+
        '<textarea id="c-refOpis" data-c="refOpis" rows="4" placeholder="Kaj konkretno prevzamem (prvi kader, tempo, tip podnapisov) in kaj naredim drugače …">'+esc(k.refOpis||"")+'</textarea></div>'+
      (Datoteke.naVoljo
        ? '<div class="drop no-print" id="drop-ref" style="margin-top:14px">'+
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>'+
            '<b>Naloži posnetke zaslona in primere</b>'+
            '<span>Klikni ali povleci sem. To ni material za oglas — samo referenca.</span>'+
          '</div>'+
          '<input type="file" id="dfile-ref" multiple accept="image/*,video/*,.pdf" hidden>'+
          '<div class="files" id="datoteke-ref"></div>'
        : '')+
    '</fieldset>'+

    /* 6 — brief po korakih, vedno isti proces */
    '<fieldset class="sect"><div class="lg"><h3>Brief za izdelavo</h3>'+
      '<p>Isti koraki vsakič, ko daš delat — da ni treba nič pojasnjevati po telefonu</p><span class="sp"></span>'+
      '<button class="btn btn-s no-print" id="copybrief">Kopiraj brief</button></div>'+

      '<div class="korak"><span class="korak-n">1</span><div>'+
        mereHtml(k,u)+
        '<div class="f"><label for="c-design">Kaj naj se vidi in sliši</label>'+
          '<textarea id="c-design" data-c="design" rows="6" placeholder="Format in razmerje, prvi kader, kaj je v roki, kaj piše na zaslonu, kaj se sliši, kako se konča …">'+esc(k.design)+'</textarea>'+
          '<span class="hint">Najpomembnejši del briefa. Napiši prvi kader in zadnje tri sekunde — vmes se da improvizirati.</span></div>'+
      '</div></div>'+

      '<div class="korak"><span class="korak-n">2</span><div>'+
        '<div class="f"><label for="c-material">Kaj potrebuje za izvedbo</label>'+
          '<textarea id="c-material" data-c="material" rows="3" placeholder="Izdelek, lokacija, rekviziti, dostop do trgovine, logo, glasba, podnapisi …">'+esc(k.material||"")+'</textarea></div>'+
      '</div></div>'+

      '<div class="korak"><span class="korak-n">3</span><div>'+
        '<div class="grid">'+
          '<div class="f"><label for="c-izvajalec">Kdo dela</label>'+
            '<input class="txt" id="c-izvajalec" type="text" data-c="izvajalec" value="'+esc(k.izvajalec)+'" placeholder="jaz / agencija / snemalec"></div>'+
          '<div class="f"><label for="c-rok">Rok</label>'+
            '<input class="txt" id="c-rok" type="text" data-c="rok" value="'+esc(k.rok)+'" placeholder="do petka / 12. 8."></div>'+
          '<div class="f"><label for="c-oddaja">Kaj mora vrniti</label>'+
            '<input class="txt" id="c-oddaja" type="text" data-c="oddaja" value="'+esc(k.oddaja||"")+'" placeholder="npr. 9:16 MP4 + 3 fotke 4:5, brez podnapisov"></div>'+
        '</div>'+
      '</div></div>'+

      '<div class="korak"><span class="korak-n">4</span><div>'+
        '<div class="f"><label for="c-opombe">Opombe in kaj popraviti</label>'+
          '<textarea id="c-opombe" data-c="opombe" rows="4" placeholder="Pripombe po prvem osnutku, česa ne ponavljati, kaj je platforma zavrnila …">'+esc(k.opombe||"")+'</textarea></div>'+
      '</div></div>'+

      (c.seznam.length?'<div style="margin-top:18px"><span class="lbl" style="font-size:12.5px;color:var(--ink2);font-weight:500">Kontrolni seznam za '+esc(platNaziv)+'</span>'+
        '<ul class="check" style="margin-top:9px">'+c.seznam.map(function(x){return '<li>'+x+'</li>';}).join("")+'</ul></div>':'')+
    '</fieldset>'+

    /* 6 — načrt */
    '<fieldset class="sect"><div class="lg"><h3>Načrt</h3><p>Koliko daš na dan in kaj pričakuješ — <b>tukaj se vnese budget tega oglasa</b></p></div>'+
      '<div class="grid">'+
        nf("budget","Dnevni budget tega oglasa","€","Ista številka, kot jo nastaviš v "+(jeGoogle?"Google Ads":"Meta Ads Manager")+".")+
        nf("cpm",jeGoogle?"CPM (če ga imaš)":"CPM — cena 1000 prikazov","€",jeGoogle?"Pri Search raje računaj prek CPC: CPM = CPC × CTR × 10.":"V Sloveniji običajno 5–15 €.")+
        nf("ctr","CTR — delež klikov","%",jeGoogle?"Search: 4–8 %":"Feed: 1–3 %")+
        nf("cvr","CVR — delež nakupov iz klikov","%","Spletna trgovina običajno 1–4 %.")+
      '</div>'+
      '<div class="ledger" style="padding:16px 0 0">'+
        '<div class="cell"><span class="k">Prikazi / dan</span><span class="v" data-o="impr">—</span></div>'+
        '<div class="cell"><span class="k">Kliki / dan</span><span class="v" data-o="kliki">—</span></div>'+
        '<div class="cell"><span class="k">Naročila / dan</span><span class="v" data-o="narocil">—</span></div>'+
        '<div class="cell"><span class="k">CPC</span><span class="v" data-o="cpc">—</span></div>'+
        '<div class="cell"><span class="k">CPA</span><span class="v" data-o="cpa">—</span><span class="n" data-o="cpaN"></span></div>'+
        '<div class="cell"><span class="k">ROAS</span><span class="v" data-o="roas">—</span><span class="n" data-o="roasN"></span></div>'+
        '<div class="cell"><span class="k">Profit / dan</span><span class="v" data-o="profit">—</span></div>'+
        '<div class="cell"><span class="k">Profit / mesec</span><span class="v" data-o="profitM">—</span></div>'+
      '</div>'+
      '<div id="cre-verdict" style="margin-top:16px"></div>'+
      (c.merila?'<p class="note" style="margin-top:12px"><b>Za '+esc(platNaziv)+':</b> '+c.merila+'</p>':'')+
    '</fieldset>'+

    /* 7 — rezultati */
    '<fieldset class="sect"><div class="lg"><h3>Rezultati</h3><p>Prepiši iz oglasnega računa, ko oglas teče</p></div>'+
      '<div class="grid">'+
        nf("rSpend","Poraba","€","Skupaj od začetka")+nf("rImpr","Prikazi","","")+
        nf("rClicks","Kliki","","")+nf("rOrders","Naročila","","Konverzije, ne dodajanja v košarico")+
      '</div>'+
      '<div class="ledger" style="padding:16px 0 0">'+
        '<div class="cell"><span class="k">Dejanski CPM</span><span class="v" data-o="rcpm">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CTR</span><span class="v" data-o="rctr">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CPC</span><span class="v" data-o="rcpc">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CVR</span><span class="v" data-o="rcvr">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CPA</span><span class="v" data-o="rcpa">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski ROAS</span><span class="v" data-o="rroas">—</span></div>'+
        '<div class="cell"><span class="k">Prihodek</span><span class="v" data-o="rprih">—</span></div>'+
        '<div class="cell"><span class="k">Profit</span><span class="v" data-o="rprofit">—</span></div>'+
      '</div>'+
      '<div id="cre-verdict2" style="margin-top:16px"></div>'+
    '</fieldset>'+

    /* 8 — kaj si se naučil (opombe za brief so v koraku 4) */
    '<fieldset class="sect"><div class="lg"><h3>Kaj si ugotovil</h3><p>Po testu — da naslednja kreativa ne ponovi iste napake</p></div>'+
      '<div class="f"><textarea data-c="ugotovitve" rows="3" aria-label="Ugotovitve" placeholder="'+(jeGoogle?"Negativne ključne besede, katera poizvedba je prinesla naročila, kaj ne dela …":"Katera različica je zmagala, kaj bi naslednjič spremenil, kdaj je začelo pešati …")+'">'+esc(k.ugotovitve||"")+'</textarea></div>'+
    '</fieldset>'+
  '</div>'+
  '<div class="row no-print"><button class="btn" id="back">← Vse kreative</button></div>';

  paintKreativa();
  predVizual=null;
  risiPredogled();
  if(Datoteke.naVoljo){
    narisiDatoteke();
    osveziPredVizual();
  }
}

/* ============ predogled oglasa ============
   Obliko določi umestitev, ne platforma. Besedilo se zloži po vrsticah,
   tako kot ga zloži platforma, ne po številu znakov.                      */
var predVizual=null;

/* medij v razmerju umestitve; 9:16 material se v feedu obreže, kot v resnici */
function medij(razmerje,polni){
  var stil=razmerje?' style="aspect-ratio:'+razmerje+'"':'';
  if(!predVizual)return null;
  return /^video\//.test(predVizual.tip)
    ? '<video src="'+predVizual.url+'" muted loop autoplay playsinline preload="metadata"'+(polni?' class="polni"':'')+stil+'></video>'
    : '<img src="'+predVizual.url+'" alt=""'+(polni?' class="polni"':'')+stil+'>';
}
function prazno(razmerje,besedilo,video){
  var stil=razmerje?' style="aspect-ratio:'+razmerje+'"':'';
  return '<div class="ph"'+stil+'>'+(video?IKONA_VIDEO:IKONA_SLIKA)+
    '<span>'+esc(besedilo||"Naloži material zgoraj in pokazal se bo tu")+'</span></div>';
}
function vizual(spec,k,razmerje){
  var r=razmerje||spec.r||"1 / 1";
  var jeVideo=/video|UGC|zgodba/i.test(k.format);
  return medij(r)||prazno(r,jeVideo?"Ni naloženega videa":"Ni naložene slike",jeVideo);
}
/* besedilo, ki se zloži po n vrsticah in dobi „Več“ */
function zloz(txt,vrstic,oznaka,razred,pred){
  txt=String(txt||"");
  if(!txt.trim()&&!pred)return "";
  return '<div class="ft'+(razred?" "+razred:"")+'">'+
    '<span class="ft-t" style="-webkit-line-clamp:'+(vrstic||3)+'">'+(pred||"")+esc(txt)+'</span>'+
    '<span class="ft-m">…&nbsp;<b>'+esc(oznaka||"Več")+'</b></span></div>';
}
/* po vstavljanju v DOM: kje je besedilo res predolgo */
function zloziBesedila(){
  qa("#predogled .ft").forEach(function(d){
    var t=q(".ft-t",d);
    if(!t)return;
    d.classList.toggle("fold",t.scrollHeight-t.clientHeight>1);
  });
}
function telesno(k){
  return [prvi(k.hooki,predIzbor.hooki).trim(),prvi(k.primarna,predIzbor.primarna).trim()]
    .filter(Boolean).join("\n\n");
}
function risiPredogled(){
  var cilj=el("predogled");if(!cilj)return;
  var p=P(),k=K();if(!p||!k)return;
  var u=um(k), spec=u[2], risi=spec.risi;
  /* karusel in kolekcija sta formata, ki v feedu spremenita obliko */
  if(risi==="fbfeed"||risi==="igfeed"){
    if(k.format==="karusel")risi="karusel";
    else if(k.format==="kolekcija")risi="kolekcija";
    else if(k.format==="besedilo")risi="besedilo";
  }
  var risalke={
    fbfeed:predFbFeed, igfeed:predIgFeed, market:predMarket, zgodba:predZgodba,
    reels:predReels, tiktok:predTikTok, ytinstream:predYt, search:predSearch,
    display:predDisplay, pmax:predPmax, karusel:predKarusel, kolekcija:predKolekcija,
    besedilo:predBesedilo, splosno:predSplosno
  };
  var f=risalke[risi]||predSplosno;
  cilj.innerHTML=f(p,k,spec)+specHtml(k,u);
  zloziBesedila();
}
/* pod predogledom: mere in kaj se v tej umestitvi sploh vidi */
var IMENA_POLJ={primarna:"primarno besedilo",naslovi:"naslov",opisi:"opis",cta:"gumb",
  url:"prikazna domena",pot:"prikazna pot",sitelinki:"sitelinki"};
function specHtml(k,u){
  var spec=u[2], d=[];
  if(spec.r)d.push(String(spec.r).replace(" / "," : "));
  if(spec.px)d.push(spec.px+" px");
  if(spec.zlozi)d.push("besedilo se zloži po "+spec.zlozi+(spec.zlozi===1?" vrstici":" vrsticah"));
  var vidi=(spec.rabi||[]).map(function(x){return IMENA_POLJ[x]||x;}).join(", ");
  var opozorilo="";
  if(k.umestitev!==u[0])
    opozorilo='<span class="prev-warn">Format „'+esc(k.format)+'“ se v izbrani umestitvi ne vrti — prikazana je '+esc(u[1])+'.</span>';
  if(spec.r==="4 / 5"&&k.format==="video 9:16")
    opozorilo+='<span class="prev-warn">Video 9:16 se v feedu obreže na 4:5. Pomembno naj bo v sredini.</span>';
  if(predVizual&&predVizual.izdelkov)
    opozorilo+='<span>V predogledu je slika izdelka — ta kreativa še nima svojega materiala.</span>';
  return '<div class="prev-spec">'+opozorilo+
    '<b>'+esc(platIme(k.platforma)+" · "+u[1])+'</b>'+
    (d.length?'<span>'+esc(d.join(" · "))+'</span>':'')+
    (vidi?'<span>Vidi se: '+esc(vidi)+'</span>':'')+
  '</div>';
}
var IKONA_SLIKA='<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l4.5-4 3 2.5L15 11l6 5"/></svg>';
var IKONA_VIDEO='<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="14" height="14" rx="3"/><path d="M16.5 10l5-3v10l-5-3z"/></svg>';

/* ---- okvir telefona in vrhovi aplikacij ---- */
function statusVrstica(nad){
  return '<div class="fon-s'+(nad?" nad":"")+'">'+
    '<span class="ura">9:41</span><span class="sp"></span>'+
    '<span class="sig"><i></i><i></i><i></i><i class="d"></i></span>'+
    '<svg class="wifi" viewBox="0 0 16 12"><path d="M2.2 4.6a8.5 8.5 0 0 1 11.6 0M4.6 7.1a5 5 0 0 1 6.8 0"/><circle cx="8" cy="9.6" r="1"/></svg>'+
    '<span class="bat"><i></i></span>'+
  '</div>';
}
/* telefon z vrhom aplikacije in vsebino, ki se lista */
function fon(vrh,vsebina,razred){
  return '<div class="fon'+(razred?" "+razred:"")+'">'+statusVrstica()+(vrh||"")+
    '<div class="fon-b">'+vsebina+'</div></div>';
}
/* telefon, kjer medij zapolni cel zaslon (zgodba, reels, TikTok) */
function fonPolni(vsebina,razred){
  return '<div class="fon fon-polni'+(razred?" "+razred:"")+'">'+vsebina+statusVrstica(true)+'</div>';
}
var I_LUPA='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>';
var I_SRCE='<svg viewBox="0 0 24 24"><path d="M20.8 8.6c0 5.4-8.8 10.9-8.8 10.9S3.2 14 3.2 8.6A4.7 4.7 0 0 1 12 6.7a4.7 4.7 0 0 1 8.8 1.9z"/></svg>';
var I_KOMENT='<svg viewBox="0 0 24 24"><path d="M20.5 11.8a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.2-4.6A8.5 8.5 0 1 1 20.5 11.8z"/></svg>';
var I_LETALO='<svg viewBox="0 0 24 24"><path d="M21.5 3.5 2.5 10.2l6.4 2.3 2.3 6.4z"/><path d="M8.9 12.5 21.5 3.5"/></svg>';
var I_ZAZNAMEK='<svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4.3-6 4.3z"/></svg>';
var I_MSG='<svg viewBox="0 0 24 24"><path d="M12 3.2c-5 0-9 3.6-9 8.1 0 2.5 1.3 4.8 3.3 6.3v3.2l3-1.6c.9.2 1.8.4 2.7.4 5 0 9-3.6 9-8.2S17 3.2 12 3.2z"/><path d="M7.2 13.6 10 9.4l2.6 2 2.3-3.4"/></svg>';
var I_VEC='<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';
var I_PUSCICA='<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
var I_GOR='<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';

/* Vmesnik v predogledu je v anglescini, ker je tak tudi v resnici: Meta, Google
   in TikTok kazejo svoje gumbe in oznake v jeziku aplikacije, ne oglasa.
   Tvoje besedilo ostane slovensko - prevedeni so samo napisi platforme.     */
var CTA_EN={
  "Kupi zdaj":"Shop now","Nakupuj zdaj":"Shop now","Izvedi več":"Learn more",
  "Naroči zdaj":"Order now","Prijavi se":"Sign up","Pošlji sporočilo":"Send message",
  "Rezerviraj":"Book now","Prenesi":"Download","Poišči ponudbo":"Get offer","Pokliči":"Call now"
};
function ctaEN(k){
  var v=k.cta||privzetiCTA(k.platforma);
  return CTA_EN[v]||v;
}
/* avatar oglasevalca: logo izdelka, ce je nalozen, drugace zacetnice */
var predLogo=null;
function avatar(ime,razred){
  var c="fb-av"+(razred?" "+razred:"")+(predLogo?" ima-logo":"");
  return '<span class="'+c+'">'+
    (predLogo?'<img src="'+predLogo+'" alt="">':esc(zacetnice(ime)))+'</span>';
}
function vrhFB(){
  return '<div class="app app-fb"><span class="wm">facebook</span><span class="sp"></span>'+
    '<span class="ib">'+I_LUPA+'</span><span class="ib">'+I_MSG+'</span></div>';
}
function vrhIG(){
  return '<div class="app app-ig"><span class="wm">Instagram</span><span class="sp"></span>'+
    '<span class="ib">'+I_SRCE+'</span><span class="ib">'+I_LETALO+'</span></div>';
}
/* glava objave: avatar, ime oglaševalca, oznaka Sponzorirano */
function feedGlava(ime,jeIG){
  var globus='<svg viewBox="0 0 24 24" style="width:11px;height:11px"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>';
  return '<div class="fb-h">'+
    avatar(ime,jeIG?"ig-av":"")+
    '<span class="fb-hn"><b>'+esc(ime)+'</b><span>'+(jeIG?"Sponsored":"Sponsored · "+globus)+'</span></span>'+
    '<span class="fb-x">'+I_VEC+'</span>'+
  '</div>';
}
function feedNoge(){
  return '<div class="fb-r"><span class="rx"><i class="r1">👍</i><i class="r2">❤</i></span>'+
    '<span>142</span><span class="sp"></span><span>18 comments · 6 shares</span></div>'+
    '<div class="fb-a">'+
      '<span><svg viewBox="0 0 24 24"><path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 17 20H7"/></svg>Like</span>'+
      '<span>'+I_KOMENT+'Comment</span>'+
      '<span><svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4"/></svg>Share</span>'+
    '</div>';
}
/* kartica povezave pod sliko: domena, naslov v eni vrstici, opis, gumb */
function kartaFB(p,k,spec){
  var dom=domenaIz(p,k);
  var naslov=prvi(k.naslovi,predIzbor.naslovi);
  var opis=seVidi(spec,"opisi")?prvi(k.opisi,predIzbor.opisi):"";
  if(!naslov&&!opis&&!dom)return "";
  return '<div class="fb-f">'+
    '<span class="fb-fn">'+
      (dom?'<span class="u">'+esc(dom)+'</span>':'')+
      '<b class="c1">'+esc(naslov||"Naslov oglasa")+'</b>'+
      (opis?'<span class="d c1">'+esc(opis)+'</span>':'')+
    '</span>'+
    '<span class="fb-cta">'+esc(ctaEN(k))+'</span>'+
  '</div>';
}
/* Facebook feed */
function predFbFeed(p,k,spec){
  return fon(vrhFB(),
    '<div class="fb">'+
      feedGlava(znamkaIme(p),false)+
      zloz(telesno(k),spec.zlozi||3)+
      '<div class="fb-m">'+vizual(spec,k)+'</div>'+
      kartaFB(p,k,spec)+
      feedNoge()+
    '</div>');
}
/* samo besedilo, brez vizuala */
function predBesedilo(p,k,spec){
  return fon(vrhFB(),
    '<div class="fb">'+
      feedGlava(znamkaIme(p),false)+
      zloz(telesno(k),6)+
      kartaFB(p,k,spec)+
      feedNoge()+
    '</div>');
}
/* Instagram feed: brez naslova in opisa — vidi se samo napis pod sliko in gumb */
function predIgFeed(p,k,spec){
  var ime=String(znamkaIme(p)).toLowerCase().replace(/\s+/g,"_");
  var telo=telesno(k);
  return fon(vrhIG(),
    '<div class="ig">'+
      '<div class="fb-h">'+
        avatar(znamkaIme(p),"ig-av")+
        '<span class="fb-hn"><b>'+esc(ime)+'</b><span>Sponsored</span></span>'+
        '<span class="fb-x">'+I_VEC+'</span>'+
      '</div>'+
      '<div class="fb-m">'+vizual(spec,k)+'</div>'+
      '<div class="ig-cta"><b>'+esc(ctaEN(k))+'</b>'+I_PUSCICA+'</div>'+
      '<div class="ig-a"><span>'+I_SRCE+'</span><span>'+I_KOMENT+'</span><span>'+I_LETALO+'</span>'+
        '<span class="sp"></span><span>'+I_ZAZNAMEK+'</span></div>'+
      '<div class="ig-l">142 likes</div>'+
      (telo?'<div class="ig-c">'+zloz(telo,spec.zlozi||1,"more","ig",'<b>'+esc(ime)+'</b> ')+'</div>':'')+
    '</div>');
}
/* karusel: vsaka kartica dobi svoj naslov iz seznama različic */
function predKarusel(p,k,spec){
  var jeIG=k.platforma==="instagram";
  var m=medij("1 / 1");
  var nas=k.naslovi.filter(function(x){return String(x||"").trim();});
  if(!nas.length)nas=["Naslov kartice"];
  var kartice=nas.slice(0,5).map(function(t,i){
    return '<div class="kar-c">'+
      '<div class="kar-m">'+(m||'<span class="ph">'+IKONA_SLIKA+'</span>')+'<span class="kar-n">'+(i+1)+'</span></div>'+
      '<div class="kar-b"><b class="c2">'+esc(t)+'</b>'+
        (domenaIz(p,k)?'<span>'+esc(domenaIz(p,k))+'</span>':'')+
        '<span class="kar-cta">'+esc(ctaEN(k))+'</span></div>'+
    '</div>';
  }).join("");
  return fon(jeIG?vrhIG():vrhFB(),
    '<div class="fb'+(jeIG?" ig":"")+'">'+
      feedGlava(znamkaIme(p),jeIG)+
      zloz(telesno(k),spec.zlozi||3,jeIG?"more":"See more")+
      '<div class="kar"><div class="kar-t">'+kartice+'</div></div>'+
      '<div class="kar-d">'+nas.slice(0,5).map(function(_,i){return '<i'+(i?'':' class="on"')+'></i>';}).join("")+'</div>'+
      (jeIG?'':feedNoge())+
    '</div>');
}
/* kolekcija: glavni vizual in mreža izdelkov pod njim */
function predKolekcija(p,k,spec){
  var jeIG=k.platforma==="instagram";
  var m=medij("1 / 1");
  return fon(jeIG?vrhIG():vrhFB(),
    '<div class="fb'+(jeIG?" ig":"")+'">'+
      feedGlava(znamkaIme(p),jeIG)+
      zloz(telesno(k),spec.zlozi||3,jeIG?"more":"See more")+
      '<div class="fb-m">'+vizual(spec,k,"1.91 / 1")+'</div>'+
      '<div class="kol">'+[0,1,2].map(function(i){
        return '<div class="kol-c">'+(m||'<span class="ph">'+IKONA_SLIKA+'</span>')+
          '<span>'+(i===0?e(n(p.cena)):"izdelek "+(i+1))+'</span></div>';
      }).join("")+'</div>'+
      (jeIG?'':feedNoge())+
    '</div>');
}
/* Marketplace: mreža ponudb, oglas je ena od kartic */
function predMarket(p,k,spec){
  var naslov=prvi(k.naslovi,predIzbor.naslovi)||"Naslov ponudbe";
  var cena=n(p.cena)>0?e(n(p.cena)):"—";
  var m=medij("1 / 1");
  var tuji=["Similar item","Listed 2 days ago","Used · Ljubljana"];
  return fon('<div class="app app-mk"><b>Marketplace</b><span class="sp"></span><span class="ib">'+I_LUPA+'</span></div>',
    '<div class="mk">'+
      '<div class="mk-g">'+
        '<div class="mk-c mk-ad">'+
          '<div class="mk-m">'+(m||'<span class="ph">'+IKONA_SLIKA+'</span>')+'<span class="mk-o">Sponsored</span></div>'+
          '<b>'+esc(cena)+'</b><span class="c2">'+esc(naslov)+'</span>'+
          '<span class="mk-l">Ljubljana</span>'+
          '<span class="mk-cta">'+esc(ctaEN(k))+'</span>'+
        '</div>'+
        tuji.map(function(t){
          return '<div class="mk-c"><div class="mk-m mk-siv"></div><b>—</b><span class="c2">'+esc(t)+'</span></div>';
        }).join("")+
      '</div>'+
    '</div>');
}
/* zgodba: cel zaslon, oznaka zgoraj, gumb spodaj */
function predZgodba(p,k,spec){
  var jeIG=k.platforma==="instagram";
  var telo=telesno(k);
  return fonPolni(
    '<div class="zg-m">'+(medij("9 / 16",true)||prazno(null,"Ni naloženega 9:16 videa ali slike",true))+'</div>'+
    '<div class="zg-vrh">'+
      '<div class="zg-bar"><i></i><i class="d"></i><i class="d"></i></div>'+
      '<div class="zg-id">'+avatar(znamkaIme(p),jeIG?"ig-av":"")+
        '<b>'+esc(jeIG?String(znamkaIme(p)).toLowerCase().replace(/\s+/g,"_"):znamkaIme(p))+'</b>'+
        '<span class="zg-ozn">Sponsored</span><span class="sp"></span><span class="zg-x">✕</span></div>'+
    '</div>'+
    '<div class="zg-spo">'+
      (telo?zloz(telo,spec.zlozi||2,"more","na-temnem"):"")+
      '<div class="zg-cta">'+I_GOR+'<b>'+esc(ctaEN(k))+'</b></div>'+
    '</div>');
}
/* Reels in Shorts: cel zaslon, stranska vrsta ikon, gumb pod napisom */
function predReels(p,k,spec){
  var jeYT=k.platforma==="youtube";
  var jeIG=k.platforma==="instagram";
  var ime=String(znamkaIme(p)).toLowerCase().replace(/\s+/g,"_");
  var telo=telesno(k);
  return fonPolni(
    '<div class="zg-m">'+(medij("9 / 16",true)||prazno(null,"Ni naloženega 9:16 videa",true))+'</div>'+
    '<div class="rl-grad"></div>'+
    '<div class="rl-side">'+
      '<span>'+I_SRCE+'<i>1.2K</i></span>'+
      '<span>'+I_KOMENT+'<i>318</i></span>'+
      '<span>'+I_LETALO+'<i>Share</i></span>'+
      '<span>'+I_VEC+'</span>'+
      '<span class="rl-disk"></span>'+
    '</div>'+
    '<div class="rl-b">'+
      '<div class="rl-id">'+avatar(znamkaIme(p),jeIG?"ig-av":"")+
        '<b>'+esc(jeIG?ime:znamkaIme(p))+'</b><span class="rl-sledi">Follow</span></div>'+
      '<span class="rl-ozn">Sponsored</span>'+
      (telo?zloz(telo,spec.zlozi||2,"more","na-temnem"):"")+
      '<span class="rl-zvok">♪ '+esc(jeYT?"original audio":znamkaIme(p)+" · original audio")+'</span>'+
      '<div class="rl-cta'+(jeYT?" yt":"")+'"><b>'+esc(ctaEN(k))+'</b>'+I_PUSCICA+'</div>'+
    '</div>');
}
/* TikTok Za vas */
function predTikTok(p,k,spec){
  var ime="@"+String(znamkaIme(p)).toLowerCase().replace(/[^\wčšžćđ]+/gi,"");
  var telo=telesno(k);
  return fonPolni(
    '<div class="zg-m">'+(medij("9 / 16",true)||prazno(null,"Ni naloženega 9:16 videa",true))+'</div>'+
    '<div class="tt-vrh"><span>Following</span><b>For You</b></div>'+
    '<div class="rl-grad"></div>'+
    '<div class="rl-side tt-s">'+
      '<span class="tt-av"><i class="fb-av'+(predLogo?" ima-logo":"")+'">'+
        (predLogo?'<img src="'+predLogo+'" alt="">':esc(zacetnice(znamkaIme(p))))+'</i><em>+</em></span>'+
      '<span>'+I_SRCE+'<i>2143</i></span>'+
      '<span>'+I_KOMENT+'<i>86</i></span>'+
      '<span>'+I_ZAZNAMEK+'<i>41</i></span>'+
      '<span class="rl-disk tt-d"></span>'+
    '</div>'+
    '<div class="rl-b">'+
      '<b class="tt-ime">'+esc(ime)+'</b>'+
      '<span class="tt-ozn">Sponsored</span>'+
      (telo?zloz(telo,spec.zlozi||2,"more","na-temnem"):"")+
      '<span class="rl-zvok">♪ promoted music</span>'+
      '<div class="rl-cta tt-cta2"><b>'+esc(ctaEN(k))+'</b>'+I_PUSCICA+'</div>'+
    '</div>','tt');
}
/* YouTube in-stream: predvajalnik z gumbom za preskok */
function predYt(p,k,spec){
  var naslov=prvi(k.naslovi,predIzbor.naslovi)||"Naslov oglasa";
  return '<div class="yt">'+
    '<div class="yt-p">'+(medij("16 / 9")||prazno("16 / 9","Ni naloženega 16:9 videa",true))+
      '<span class="yt-ozn">Ad</span>'+
      '<span class="yt-skip">Skip ad '+I_PUSCICA+'</span>'+
      '<div class="yt-prog"><i></i></div>'+
    '</div>'+
    '<div class="yt-f">'+
      avatar(znamkaIme(p))+
      '<span class="yt-fn"><b class="c1">'+esc(naslov)+'</b>'+
        '<span>'+esc(domenaIz(p,k)||"tvoja-domena.si")+'</span></span>'+
      '<span class="yt-cta">'+esc(ctaEN(k))+'</span>'+
    '</div>'+
  '</div>';
}
/* Google iskanje: dve kombinaciji, kot jih sestavi Google sam */
function predSearch(p,k,spec){
  var nas=k.naslovi.filter(function(x){return String(x||"").trim();});
  var opi=k.opisi.filter(function(x){return String(x||"").trim();});
  var dom=domenaIz(p,k)||"tvoja-domena.si";
  var pot=[k.pot1,k.pot2].map(function(x){return String(x||"").trim();}).filter(Boolean);
  if(!pot.length)pot=potIz(k);
  var znamka=znamkaIme(p);
  var sl=String(k.sitelinki||"").split(",").map(function(x){return x.trim();}).filter(Boolean);
  var poizvedba=String(k.kljucneBesede||"").split(",")[0].trim()||prvi(k.naslovi).toLowerCase()||"tvoja ključna beseda";
  var vrh='<div class="gg-q">'+I_LUPA+'<span>'+esc(poizvedba)+'</span></div>'+
    '<div class="gg-tabs"><b>All</b><span>Images</span><span>Shopping</span><span>Videos</span><span>News</span></div>';
  if(!nas.length&&!opi.length){
    return '<div class="gg">'+vrh+
      '<p class="gg-empty">Vpiši vsaj en naslov, da se predogled izriše.<br><br>'+
      'Google iz tvojih naslovov sam sestavlja kombinacije po tri — zato mora vsak zveneti smiselno tudi sam in ne sme biti nadaljevanje prejšnjega.</p></div>';
  }
  function vrstica(nabor,opisi){
    return '<div class="gg-r">'+
      '<div class="gg-id">'+
        '<span class="gg-fav'+(predLogo?" ima-logo":"")+'">'+
          (predLogo?'<img src="'+predLogo+'" alt="">':esc(zacetnice(znamka)))+'</span>'+
        '<span class="gg-idn"><b>'+esc(znamka)+'</b>'+
          '<span>'+esc(dom)+(pot.length?' › '+pot.map(esc).join(" › "):'')+'</span></span>'+
      '</div>'+
      '<div class="gg-ad">Sponsored</div>'+
      '<span class="gg-t">'+esc(nabor.join(" | "))+'</span>'+
      '<p class="gg-d">'+esc(opisi.join(" "))+'</p>'+
      (sl.length?'<div class="gg-sl">'+sl.slice(0,4).map(function(s){return '<span>'+esc(s)+'</span>';}).join("")+'</div>':'')+
    '</div>';
  }
  var a=vrstica(nas.slice(0,3),opi.slice(0,2));
  var b="";
  if(nas.length>3||opi.length>2){
    var nb=nas.slice(3).concat(nas.slice(0,1)).slice(0,3);
    var ob=opi.slice(2).concat(opi.slice(0,1)).slice(0,2);
    b=vrstica(nb.length?nb:nas.slice(0,3),ob.length?ob:opi.slice(0,2));
  }
  return '<div class="gg">'+vrh+a+b+
    (b?'<p class="gg-note">Dve od možnih kombinacij — Google jih rotira sam.</p>':'')+
  '</div>';
}
/* Google Display: odzivni oglas v dveh velikostih */
function predDisplay(p,k,spec){
  var naslov=prvi(k.naslovi,predIzbor.naslovi)||"Naslov oglasa";
  var opis=prvi(k.opisi,predIzbor.opisi);
  var dom=domenaIz(p,k)||"tvoja-domena.si";
  var m1=medij("1.91 / 1"), m2=medij("1 / 1");
  return '<div class="gd-w">'+
    '<div class="gd">'+
      '<div class="gd-m">'+(m1||prazno("1.91 / 1","1200 × 628"))+'</div>'+
      '<div class="gd-b"><span class="gd-o">Ad · '+esc(dom)+'</span>'+
        '<b class="c2">'+esc(naslov)+'</b>'+
        (opis?'<span class="c2">'+esc(opis)+'</span>':'')+
        '<span class="gd-cta">'+esc(ctaEN(k))+'</span></div>'+
    '</div>'+
    '<div class="gd gd-kv">'+
      '<div class="gd-m">'+(m2||prazno("1 / 1","300 × 250"))+'</div>'+
      '<div class="gd-b"><span class="gd-o">Ad</span><b class="c2">'+esc(naslov)+'</b>'+
        '<span class="gd-cta">'+esc(ctaEN(k))+'</span></div>'+
    '</div>'+
  '</div>';
}
/* Performance Max: isti material, več površin */
function predPmax(p,k,spec){
  return '<div class="pmax">'+predSearch(p,k,spec)+predDisplay(p,k,spec)+
    '<p class="gg-note">Performance Max iz istih naslovov, opisov in slik sestavlja oglase za iskanje, Display, YouTube, Gmail in Discover. Nadzora nad razdelitvijo ni — zato mora vsak kos gradiva zdržati sam.</p></div>';
}
function predSplosno(p,k,spec){
  var m=medij(spec&&spec.r?spec.r:null);
  var telo=telesno(k);
  var nas=prvi(k.naslovi,predIzbor.naslovi);
  return '<div class="gen">'+
    (m||'')+
    (nas?'<b style="font-size:17px">'+esc(nas)+'</b>':'')+
    (telo?'<p style="font-size:13.5px;color:var(--ink2);white-space:pre-wrap">'+esc(telo)+'</p>':'')+
    '<div class="row"><span class="pill np" style="background:var(--brand);color:var(--brand-on)">'+esc(k.cta||"Izvedi več")+'</span>'+
      (domenaIz(p,k)?'<span class="note">'+esc(domenaIz(p,k))+'</span>':'')+'</div>'+
  '</div>';
}

/* Datoteke visijo na lastniku: kreativa (njen id) ali izdelek ("izd:"+id).
   Material izdelka je skupen vsem njegovim kreativam.                      */
function datLastnikIzdelka(p){return "izd:"+(p&&p.id);}
/* Logo oglasevalca je logo MAPE (celostna podoba), ne izdelka - drugace bi
   isto stvar vpisoval pri vsakem izdelku iste znamke.                     */
function datLastnikLogo(pr){return "cgp:"+(pr&&pr.id);}
/* reference kreative so ločene od materiala — v predogled ne gredo nikoli */
function datLastnikRef(k){return "ref:"+(k&&k.id);}
/* Material kreative. Če stikalo vodi besedila, vodi tudi material: hrvaška
   različica ima svojo sliko s prevedenim napisom, slovenska svojo. Preklop
   stikala zamenja oboje hkrati.                                            */
function datLastnik(k){
  if(!k)return null;
  var g=stikVodi(k);
  if(!g)return k.id;
  var v=stikVrednost(k,g);
  return v===STIK_VSE?k.id:k.id+"|"+v;
}
/* vsi lastniki, ki jih ima kreativa — za brisanje */
function datLastnikiKreative(k){
  var out=[k.id,datLastnikRef(k)];
  stikala().forEach(function(g){
    g.moznosti.forEach(function(m){out.push(k.id+"|"+m);});
  });
  return out;
}
function datCilji(){
  var out=[], k=K(), p=P();
  if(el("datoteke")&&k)out.push({cilj:"datoteke",lastnik:datLastnik(k),zapis:k});
  if(el("datoteke-izd")&&p)out.push({cilj:"datoteke-izd",lastnik:datLastnikIzdelka(p),zapis:p});
  if(el("datoteke-ref")&&k)out.push({cilj:"datoteke-ref",lastnik:datLastnikRef(k)});
  /* CGP je na vsaki mapi v pogledu Projekti, zato jih naštejemo iz DOM */
  qa("[id^='datoteke-cgp-']").forEach(function(box){
    var prid=box.id.replace("datoteke-cgp-","");
    out.push({cilj:box.id,lastnik:"cgp:"+prid});
  });
  return out;
}
function narisiDatoteke(){
  if(!Datoteke.naVoljo)return;
  datCilji().forEach(narisiDatotekeV);
}
function narisiDatotekeV(c){
  var cilj=el(c.cilj);
  if(!cilj)return;
  Datoteke.zaKreativo(c.lastnik).then(function(sez){
    sez=(sez||[]).slice().sort(Datoteke.poVrsti);
    if(c.zapis&&c.zapis.stDatotek!==sez.length){c.zapis.stDatotek=sez.length;shrani();}
    if(!sez.length){cilj.innerHTML='';return;}
    cilj.innerHTML=sez.map(function(d){
      /* Zapis brez bajtov je v oblaku. Prenesemo ga enkrat; če ne uspe, ga NE
         poskušamo znova pri vsakem izrisu — prej je to naredilo zanko in slike
         se sploh niso pokazale.                                             */
      if(!d.blob){
        var spodletelo=prenosSpodletel[d.id];
        return '<div class="file cakam'+(spodletelo?" ni":"")+'"'+(spodletelo?'':' data-fetch="'+d.id+'"')+'>'+
          '<div class="prev"><span class="ikona">'+(spodletelo?"ni tu":"oblak")+'</span></div>'+
          '<div class="meta"><span class="fn">'+esc(d.ime)+'</span>'+
            '<span class="fs">'+mb(d.velikost)+(spodletelo?" · ni v tej napravi":" · prenašam …")+'</span></div>'+
          (spodletelo?'<div class="fa no-print"><button data-retry="'+d.id+'">poskusi znova</button></div>':'')+
        '</div>';
      }
      var u="";
      try{u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);}catch(err){}
      var jeSlika=/^image\//.test(d.tip)&&u, jeVideo=/^video\//.test(d.tip)&&u;
      var prev = jeSlika ? '<img src="'+u+'" alt="'+esc(d.ime)+'">'
        : jeVideo ? '<video src="'+u+'" muted preload="metadata"></video><span class="tag">video</span>'
        : '<span class="ikona">'+esc((d.ime.split(".").pop()||"datoteka").slice(0,8))+'</span>';
      return '<div class="file">'+
        '<div class="prev"'+((jeSlika||jeVideo)?' data-zoom="'+d.id+'" title="Klikni za povečavo"':'')+'>'+prev+'</div>'+
        '<div class="meta"><span class="fn">'+esc(d.ime)+'</span><span class="fs">'+mb(d.velikost)+'</span></div>'+
        '<div class="fa no-print"><button data-dl="'+d.id+'">prenesi</button><button class="d" data-ddel="'+d.id+'">izbriši</button></div>'+
      '</div>';
    }).join("");
    /* Kar visi v oblaku, poberemo in seznam prerišemo enkrat. Kar ne pride,
       si zapomnimo, da ne vrtimo v krogu.                                   */
    var vrsta=Promise.resolve(), koliko=0;
    qa("[data-fetch]",cilj).forEach(function(box){
      var id=box.dataset.fetch;
      koliko++;
      vrsta=vrsta.then(function(){
        return Datoteke.zagotovi(id).then(function(z){
          if(!z||!z.blob)prenosSpodletel[id]=true;
        },function(){prenosSpodletel[id]=true;});
      });
    });
    if(koliko)vrsta.then(function(){narisiDatotekeV(c);});
  },function(err){
    cilj.innerHTML='<p class="note">Datotek ni bilo mogoče prebrati: '+esc(err&&err.message||"neznana napaka")+'</p>';
  });
}
function dodajDatoteke(files,lastnik){
  if(!lastnik){
    var k=K();
    if(!k){toast("Najprej odpri kreativo.");return;}
    lastnik=datLastnik(k);
  }
  var arr=Array.prototype.slice.call(files||[]).filter(function(f){return f&&f.size>=0;});
  if(!arr.length)return;
  var veliki=arr.filter(function(f){return f.size>60*1024*1024;});
  if(veliki.length&&!confirm(veliki.length+" datotek je večjih od 60 MB. Shramba brskalnika je omejena — nadaljujem?"))return;
  var kid=lastnik, uspelo=0, prva=Promise.resolve();
  arr.forEach(function(f){
    prva=prva.then(function(){return Datoteke.dodaj(kid,f).then(function(){uspelo++;});});
  });
  prva.then(function(){
    toast(uspelo===1?"Datoteka dodana.":uspelo+" datotek dodanih.");
    narisiDatoteke();osveziPredVizual();
  },function(err){
    narisiDatoteke();osveziPredVizual();
    toast("Shranjevanje ni uspelo"+(uspelo?" po "+uspelo+" datotekah":"")+": "+(err&&err.message||"shramba je zavrnila zapis"));
  });
}
/* logo izdelka za avatar oglasevalca v predogledu */
function osveziLogo(){
  var pr=PR();
  if(!pr||!Datoteke.naVoljo){predLogo=null;return;}
  Datoteke.prviVizual(datLastnikLogo(pr)).then(function(d){
    if(!d){predLogo=null;risiPredogled();return;}
    try{var u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);predLogo=u;}
    catch(err){predLogo=null;}
    risiPredogled();
  },function(){predLogo=null;});
}
/* Po dodajanju ali brisanju osveži sliko v predogledu oglasa. Če kreativa
   nima svojega materiala, vzame prvo sliko izdelka.                        */
function osveziPredVizual(){
  var k=K(),p=P();
  osveziLogo();
  if(!k||!Datoteke.naVoljo)return;
  function uporabi(d,izIzdelka){
    if(!d){predVizual=null;risiPredogled();return;}
    try{
      var u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);
      predVizual={url:u,tip:d.tip,izdelkov:!!izIzdelka};
    }catch(err){predVizual=null;}
    risiPredogled();
  }
  Datoteke.prviVizual(datLastnik(k)).then(function(d){
    if(d||!p)return uporabi(d,false);
    Datoteke.prviVizual(datLastnikIzdelka(p)).then(function(d2){uporabi(d2,true);},function(){uporabi(null);});
  },function(){uporabi(null);});
}
function prenesiDatoteko(id){
  Datoteke.ena(id).then(function(d){
    if(!d)return;
    var u=URL.createObjectURL(d.blob),a=document.createElement("a");
    a.href=u;a.download=d.ime;document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},1000);
  });
}
/* povečava slike ali videa */
function pokaziPovecano(id){
  Datoteke.ena(id).then(function(d){
    if(!d)return;
    var u;
    try{u=URL.createObjectURL(d.blob);}catch(err){return;}
    el("lb-in").innerHTML = /^video\//.test(d.tip)
      ? '<video src="'+u+'" controls autoplay></video>'
      : '<img src="'+u+'" alt="'+esc(d.ime)+'">';
    el("lb").hidden=false;
    el("lb")._u=u;
  });
}
function zapriPovecano(){
  var lb=el("lb");if(!lb||lb.hidden)return;
  lb.hidden=true;
  el("lb-in").innerHTML="";
  if(lb._u){try{URL.revokeObjectURL(lb._u);}catch(err){}lb._u=null;}
}

function paintKreativa(){
  var p=P(),k=K();if(!p||!k||!el("cre-verdict"))return;
  var ek=ekon(p),l=lijak(k.budget,k.cpm,k.ctr,k.cvr,ek),r=rezultat(k,ek);
  function put(key,val,cls){var t=q('[data-o="'+key+'"]');if(!t)return;t.textContent=val;t.className=(t.classList.contains("v")?"v ":"n ")+(cls||"");}
  put("impr",i0(l.impr));put("kliki",i0(l.kliki));put("narocil",isFinite(l.narocil)?nf1.format(l.narocil):"—");
  put("cpc",e(l.cpc));put("cpa",e(l.cpa));put("roas",x2(l.roas));
  put("profit",e(l.profit),znak(l.profit));put("profitM",e(l.profit*30),znak(l.profit*30));
  var cn=q('[data-o="cpaN"]');if(cn)cn.textContent="break-even "+e(ek.beCPA);
  var rn=q('[data-o="roasN"]');if(rn)rn.textContent="break-even "+x2(ek.beROAS);
  var v=el("cre-verdict");
  if(!isFinite(l.profit)){v.innerHTML='<div class="verdict mid">Vnesi budget, CPM, CTR in CVR, da dobiš napoved. Če imaš samo CPC: CPM = CPC × CTR × 10.</div>';}
  else if(l.profit>0){v.innerHTML='<div class="verdict ok"><b>Načrt drži.</b> Pri teh predvidevanjih te naročilo stane '+e(l.cpa)+', break-even je '+e(ek.beCPA)+'. Največ, kar smeš plačati za klik, je '+e(l.maxCPC)+'.</div>';}
  else{v.innerHTML='<div class="verdict bad"><b>Načrt ne zdrži.</b> CPA '+e(l.cpa)+' proti break-even '+e(ek.beCPA)+'. Da bi bil na ničli, rabiš CVR vsaj '+p1(ek.marzaEf>0&&isFinite(l.cpc)?l.cpc/ek.marzaEf*100:NaN)+' ali CPC pod '+e(l.maxCPC)+'.</div>';}

  put("rcpm",e(r.cpm));put("rctr",p1(r.ctr));put("rcpc",e(r.cpc));put("rcvr",p1(r.cvr));
  put("rcpa",e(r.cpa),isFinite(r.cpa)?(r.cpa<=ek.beCPA?"pos":"neg"):"");
  put("rroas",x2(r.roas),isFinite(r.roas)?(r.roas>=ek.beROAS?"pos":"neg"):"");
  put("rprih",e(r.prihodek));put("rprofit",e(r.profit),znak(r.profit));
  var v2=el("cre-verdict2");
  if(!r.imaPodatke){v2.innerHTML='<div class="verdict mid">Ko oglas teče, prepiši sem porabo, prikaze, klike in naročila. Šele te številke povedo, ali je kreativa dobra.</div>';}
  else if(r.narocil<=0){
    v2.innerHTML='<div class="verdict '+(r.spend>2*ek.beCPA?"bad":"mid")+'"><b>Nič naročil pri '+e(r.spend)+' porabe.</b> '+
    (r.spend>3*ek.beCPA?"To je že 3× break-even CPA — ustavi in menjaj kot ali stran.":"Še premalo podatkov. Pusti do "+e(3*ek.beCPA)+" porabe, potem odločaj.")+
    (isFinite(r.ctr)?" CTR "+p1(r.ctr)+" ti pove, ali je težava v kreativi (nizek CTR) ali na strani (visok CTR, nič nakupov).":"")+'</div>';
  }else{
    var d=ek.marzaEf-r.cpa;
    v2.innerHTML='<div class="verdict '+(d>0?"ok":"bad")+'"><b>'+(d>0?"Zmagovalka.":"V minusu.")+'</b> '+
    (d>0?"Na vsako naročilo ti ostane "+e(d)+" — skupaj "+e(r.profit)+" pri "+e(r.spend)+" porabe. Dvigaj budget po 20–30 % na 2–3 dni in gledaj, ali CPA zdrži."
        :"Vsako naročilo te stane "+e(-d)+" preveč. Preden ubiješ: preveri, ali je težava v ceni klika ("+e(r.cpc)+") ali v konverziji ("+p1(r.cvr)+").")+'</div>';
  }
}

/* ============ POGLED: kalkulator ============ */
/* Kalkulator stoji sam: dela iz treh vnesenih številk, izdelek je le vir privzetih vrednosti. */
function kalkOsnova(){
  var p=P(), ek=p?ekon(p):null;
  var cena=n(S.kalk.cena)||(ek?ek.bruto:0);
  var marza=n(S.kalk.marza)||(ek?ek.marzaEf:0);
  return {bruto:cena,marzaEf:marza,cena:cena,marza:marza,
    beCPA:marza,beROAS:marza>0?cena/marza:Infinity};
}
function renderKalk(){
  var p=P(),kk=S.kalk;
  function nf(path,label,unit,hint,velik){
    return '<div class="f"><label for="k-'+path+'">'+esc(label)+'</label>'+
      '<div class="wrap"><input id="k-'+path+'" type="text" inputmode="decimal" data-k="'+path+'" value="'+esc(kk[path]==null?"":kk[path])+'"'+
      (velik?' style="font-size:18px;padding:11px"':'')+'>'+
      (unit?'<span class="unit">'+unit+'</span>':'')+'</div>'+(hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
  }
  el("v-kalkulator").innerHTML=
  glava("Koliko rabim, da sem v plusu",
    "Vpiši <b>prodajno ceno</b>, <b>maržo na en kos</b> in <b>koliko daš na dan</b> za oglase. Spodaj dobiš, kakšen CPA, ROAS, CTR in CVR moraš doseči, da ne izgubljaš — in koliko kosov moraš prodati.",
    p?'<button class="btn btn-soft" id="kalkPrevzemi">Prevzemi iz „'+esc(p.ime)+'“</button>':"",
    [{t:"Kalkulator"}])+

  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Vnos</span><h2>Tri številke</h2></div>'+
      '<p>Nič drugega ni treba.</p></header>'+
    '<div class="pad" id="kalk-form">'+
      '<div class="grid">'+
        nf("cena","Prodajna cena","€","Kar stranka plača skupaj, s poštnino.",true)+
        nf("marza","Marža na en kos","€","Cena minus nabavna, dostava, embalaža in provizija — pred oglasi.",true)+
        nf("budget","Dnevni budget za oglase","€","Kolikor si pripravljen zapraviti na dan.",true)+
      '</div>'+
      '<p class="note" style="margin-top:14px" id="kalk-osnova"></p>'+
    '</div>'+
  '</div>'+

  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Zahteve</span><h2>Kaj moraš doseči</h2></div>'+
      '<p>Meje, pod katerimi si v izgubi.</p></header>'+
    '<div class="ledger">'+
      '<div class="cell hero"><span class="k">Največ za eno naročilo (CPA)</span><span class="v accv" data-o="zCPA">—</span><span class="n">Če te naročilo stane več, izgubljaš.</span></div>'+
      '<div class="cell big"><span class="k">Najnižji ROAS</span><span class="v accv" data-o="zROAS">—</span><span class="n">Toliko prometa na vsak vložen evro.</span></div>'+
      '<div class="cell big"><span class="k">Naročil na dan za ničlo</span><span class="v" data-o="zNaDan">—</span><span class="n" data-o="zNaMesec"></span></div>'+
      '<div class="cell big"><span class="k">Promet na dan za ničlo</span><span class="v" data-o="zPromet">—</span><span class="n">pri tvojem budgetu</span></div>'+
    '</div>'+
    '<div class="pad pad-t" id="kalk-stavek"></div>'+
  '</div>'+

  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Matrika</span><h2>Kakšen CTR in CVR to zahteva</h2></div>'+
      '<p>Pri danem CPM in budgetu: koliko klikov dobiš in kakšen delež jih mora kupiti.</p></header>'+
    '<div class="pad">'+
      '<div class="grid" style="max-width:520px">'+
        nf("cpm","CPM — cena 1000 prikazov","€","Facebook v SLO 5–15 €. Google Search pusti prazno in vpiši CPC.")+
        nf("cpc","ali CPC — cena klika","€","Če vpišeš CPC, se CPM prezre.")+
      '</div>'+
      '<div class="scroll" style="margin-top:18px"><table class="mtx"><thead><tr>'+
        '<th>Če je CTR</th><th>Klikov / dan</th><th>CPC</th><th>Potreben CVR</th><th>Realnost</th>'+
      '</tr></thead><tbody id="mtx"></tbody></table></div>'+
      '<div class="legend">'+
        '<span><em class="m-ok"></em>lahko dosegljivo (CVR do 2 %)</span>'+
        '<span><em class="m-mid"></em>zahtevno (2–4 %)</span>'+
        '<span><em class="m-bad"></em>nerealno (nad 4 %)</span>'+
      '</div>'+
      '<p class="note" style="margin-top:12px" id="mtx-note"></p>'+
    '</div>'+
  '</div>'+

  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Napoved</span><h2>Pri tvojih predvidevanjih</h2></div>'+
      '<p>Vpiši, kar pričakuješ, in poglej, ali se izide.</p></header>'+
    '<div class="pad"><div class="grid">'+
      nf("ctr","CTR — delež klikov","%","")+
      nf("cvr","CVR — delež nakupov iz klikov","%","")+
    '</div></div>'+
    '<div class="ledger">'+
      '<div class="cell"><span class="k">Prikazi / dan</span><span class="v" data-o="kimpr">—</span></div>'+
      '<div class="cell"><span class="k">Kliki / dan</span><span class="v" data-o="kkliki">—</span></div>'+
      '<div class="cell"><span class="k">Naročila / dan</span><span class="v" data-o="knarocil">—</span></div>'+
      '<div class="cell"><span class="k">CPC</span><span class="v" data-o="kcpc">—</span></div>'+
      '<div class="cell big"><span class="k">CPA</span><span class="v" data-o="kcpa">—</span><span class="n" data-o="kcpaN"></span></div>'+
      '<div class="cell big"><span class="k">ROAS</span><span class="v" data-o="kroas">—</span><span class="n" data-o="kroasN"></span></div>'+
      '<div class="cell big"><span class="k">Profit / dan</span><span class="v" data-o="kprofit">—</span></div>'+
      '<div class="cell big"><span class="k">Profit / mesec</span><span class="v" data-o="kprofitM">—</span></div>'+
    '</div>'+
    '<div class="pad pad-t" id="kalk-verdict"></div>'+
  '</div>'+

  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Obrnjeno</span><h2>Hočem toliko prodaj na dan</h2></div>'+
      '<p>Koliko budgeta to zahteva.</p></header>'+
    '<div class="pad"><div class="grid" style="max-width:300px">'+nf("cilj","Želim prodaj / dan","kos","")+'</div>'+
      '<div class="ledger" style="padding:16px 0 0">'+
        '<div class="cell"><span class="k">Potreben budget / dan</span><span class="v" data-o="obudget">—</span></div>'+
        '<div class="cell"><span class="k">Potrebni kliki / dan</span><span class="v" data-o="okliki">—</span></div>'+
        '<div class="cell"><span class="k">Potrebni prikazi / dan</span><span class="v" data-o="oimpr">—</span></div>'+
        '<div class="cell"><span class="k">Profit / dan</span><span class="v" data-o="oprofit">—</span></div>'+
      '</div>'+
      '<p class="note" style="margin-top:14px" id="obr-note"></p>'+
    '</div>'+
  '</div>'+

  '<div class="block">'+
    '<header><div class="head-t"><span class="eyebrow">Občutljivost</span><h2>Kaj se zgodi, če se CPA premakne</h2></div>'+
      '<p>Isti budget, drugačna cena naročila.</p></header>'+
    '<div class="scroll"><table><thead><tr><th>CPA</th><th>Naročila / dan</th><th>Profit / dan</th><th>Profit / mesec</th><th>ROAS</th></tr></thead><tbody id="obc"></tbody></table></div>'+
  '</div>'+
  /* ekonomika izdelka je zdaj tukaj, ne v svojem zavihku */
  (p?ekonBlokiHtml(p):'');
  paintKalk();
  if(p&&imaEkon(p))paintEkon();
}
function paintKalk(){
  if(!el("kalk-verdict"))return;
  var p=P(),kk=S.kalk,o=kalkOsnova();
  var budget=n(kk.budget);
  var fiks=p?n(p.fiksniMesecni):0;
  function put(key,val,cls){
    var t=q('[data-o="'+key+'"]');if(!t)return;
    t.textContent=val;
    if(t.classList.contains("v"))t.className="v "+(cls||"");
  }

  /* od kod prihajata cena in marža */
  var os=el("kalk-osnova");
  if(os){
    if(o.cena<=0||o.marza<=0){
      os.innerHTML='<b>Vpiši ceno in maržo</b>, drugače ni kaj računati.'+
        (p?' Ali klikni „Prevzemi iz '+esc(p.ime)+'“ zgoraj — prenese ceno '+e(ekon(p).bruto)+' in maržo '+e(ekon(p).marzaEf)+'.':'');
    }else{
      var kjeC=n(kk.cena)?"vnesena":"iz izdelka", kjeM=n(kk.marza)?"vnesena":"iz izdelka";
      os.innerHTML='Računam s ceno <b>'+e(o.cena)+'</b> ('+kjeC+') in maržo <b>'+e(o.marza)+'</b> ('+kjeM+') na kos. '+
        'To pomeni, da ti od vsakega prodanega kosa ostane '+p1(o.cena>0?o.marza/o.cena*100:NaN)+' cene.';
    }
  }

  /* zahteve */
  var naDan = o.marza>0 ? budget/o.marza : NaN;
  put("zCPA",e(o.beCPA));
  put("zROAS",x2(o.beROAS));
  put("zNaDan",isFinite(naDan)&&naDan>0?nf1.format(naDan):"—");
  var zm=q('[data-o="zNaMesec"]');
  if(zm)zm.textContent=isFinite(naDan)?nf0.format(Math.ceil(naDan*30))+" kosov na mesec":"";
  put("zPromet",e(isFinite(naDan)?naDan*o.cena:NaN));

  var ks=el("kalk-stavek");
  if(ks){
    ks.innerHTML = (budget>0&&o.marza>0)
      ? '<div class="verdict '+(naDan<=1?"ok":naDan<=5?"mid":"bad")+'"><div>'+
        'Če daš <b>'+e(budget)+' na dan</b>, moraš prodati vsaj <b>'+nf1.format(naDan)+' kosov dnevno</b> ('+nf0.format(Math.ceil(naDan*30))+' na mesec), '+
        'da si na ničli. Vsako naročilo te sme stati največ <b>'+e(o.beCPA)+'</b>, ROAS pa mora biti vsaj <b>'+x2(o.beROAS)+'</b>. '+
        (naDan<=1?'To je nizka letvica — en kos na dan že pokrije porabo.'
         :naDan<=5?'Dosegljivo, a nič ni podarjeno.'
         :'To je veliko kosov na dan za tak budget. Ali dvigni ceno, ali zniža budget, dokler ne najdeš delujoče kreative.')+
        '</div></div>'
      : '';
  }

  /* matrika */
  var cpcVnos=n(kk.cpc), cpm=n(kk.cpm);
  var impr = cpm>0 ? budget/cpm*1000 : NaN;
  var vrstice=[0.5,0.75,1,1.5,2,3,4,6];
  var mt=el("mtx");
  if(mt){
    if(budget<=0||o.marza<=0||(!cpm&&!cpcVnos)){
      mt.innerHTML='<tr><td colspan="5" style="text-align:left;font-family:var(--sans);color:var(--ink3)">'+
        'Za matriko rabim budget, maržo in CPM (ali CPC).</td></tr>';
    }else if(cpcVnos>0){
      /* poznan CPC: CTR ne rabimo, potreben CVR je enolicen */
      var klikov=budget/cpcVnos;
      var potrCVR=klikov>0?(budget/o.marza)/klikov*100:NaN;
      var cl=potrCVR<=2?"m-ok":potrCVR<=4?"m-mid":"m-bad";
      mt.innerHTML='<tr class="mark"><td>CPC je vnesen</td><td>'+i0(klikov)+'</td><td>'+e(cpcVnos)+'</td>'+
        '<td class="'+cl+'">'+p1(potrCVR)+'</td><td class="'+cl+'">'+(potrCVR<=2?"dosegljivo":potrCVR<=4?"zahtevno":"nerealno")+'</td></tr>';
    }else{
      mt.innerHTML=vrstice.map(function(ctr){
        var klikov=impr*ctr/100;
        var cpc=klikov>0?budget/klikov:NaN;
        var potrCVR=klikov>0?(budget/o.marza)/klikov*100:NaN;
        var cl=potrCVR<=2?"m-ok":potrCVR<=4?"m-mid":"m-bad";
        var jeMoj=Math.abs(ctr-n(kk.ctr))<0.26;
        return '<tr'+(jeMoj?' class="mark"':'')+'><td>'+nf1.format(ctr)+' %'+(jeMoj?" (tvoj)":"")+'</td>'+
          '<td>'+i0(klikov)+'</td><td>'+e(cpc)+'</td>'+
          '<td class="'+cl+'">'+p1(potrCVR)+'</td>'+
          '<td class="'+cl+'">'+(potrCVR<=2?"dosegljivo":potrCVR<=4?"zahtevno":"nerealno")+'</td></tr>';
      }).join("");
    }
  }
  var mn=el("mtx-note");
  if(mn){
    mn.innerHTML = (budget>0&&cpm>0&&o.marza>0&&!cpcVnos)
      ? 'Pri CPM <b>'+e(cpm)+'</b> in budgetu <b>'+e(budget)+'</b> dobiš '+i0(impr)+' prikazov na dan. '+
        'Boljši CTR pomeni več klikov za isti denar, zato lahko CVR pade in si še vedno na ničli. '+
        'Največ, kar smeš plačati za klik pri CVR '+p1(n(kk.cvr))+', je <b>'+e(o.marza*n(kk.cvr)/100)+'</b>.'
      : (cpcVnos>0&&o.marza>0
          ? 'Pri CPC <b>'+e(cpcVnos)+'</b> je največji dopustni CPC za ničlo <b>'+e(o.marza*n(kk.cvr)/100)+'</b> pri CVR '+p1(n(kk.cvr))+'.'
          : '');
  }

  /* napoved */
  var l=lijak(budget,kk.cpm,kk.ctr,kk.cvr,o);
  if(cpcVnos>0){
    /* če je vnesen CPC, prevozi lijak prek klikov */
    var kl=budget/cpcVnos;
    l={budget:budget,impr:NaN,kliki:kl,narocil:kl*n(kk.cvr)/100,cpc:cpcVnos,
       cpa:(kl*n(kk.cvr)/100)>0?budget/(kl*n(kk.cvr)/100):NaN,
       prihodek:kl*n(kk.cvr)/100*o.cena,
       roas:budget>0?kl*n(kk.cvr)/100*o.cena/budget:NaN,
       profit:kl*n(kk.cvr)/100*o.marza-budget,
       maxCPC:o.marza*n(kk.cvr)/100};
  }
  put("kimpr",i0(l.impr));put("kkliki",i0(l.kliki));
  put("knarocil",isFinite(l.narocil)&&l.narocil>0?nf1.format(l.narocil):"—");put("kcpc",e(l.cpc));
  put("kcpa",e(l.cpa),isFinite(l.cpa)?(l.cpa<=o.beCPA?"pos":"neg"):"");
  put("kroas",x2(l.roas),isFinite(l.roas)?(l.roas>=o.beROAS?"pos":"neg"):"");
  put("kprofit",e(l.profit),znak(l.profit));put("kprofitM",e(l.profit*30),znak(l.profit*30));
  var a=q('[data-o="kcpaN"]');if(a)a.textContent="največ "+e(o.beCPA);
  var b=q('[data-o="kroasN"]');if(b)b.textContent="najmanj "+x2(o.beROAS);
  el("kalk-verdict").innerHTML=isFinite(l.profit)
    ? '<div class="verdict '+(l.profit>0?"ok":"bad")+'"><div>'+
      (l.profit>0
        ? 'Izide se. Naročilo te stane '+e(l.cpa)+', smeš pa plačati '+e(o.beCPA)+'. Na dan ostane <b>'+e(l.profit)+'</b>, na mesec '+e(l.profit*30)+
          (fiks?' oziroma '+e(l.profit*30-fiks)+' po fiksnih stroških.':'.')
        : 'Ne izide se. Naročilo te stane '+e(l.cpa)+', smeš pa največ '+e(o.beCPA)+'. Na dan izgubiš <b>'+e(-l.profit)+'</b>. '+
          'Rabiš CVR vsaj '+p1(o.marza>0&&isFinite(l.cpc)?l.cpc/o.marza*100:NaN)+' ali CPC pod '+e(l.maxCPC)+'.')+
      '</div></div>'
    : '<p class="note">Vpiši CTR in CVR (ter CPM ali CPC), da dobiš napoved.</p>';

  /* obrnjeno */
  var cilj=Math.max(0,n(kk.cilj));
  var cpaZa=isFinite(l.cpa)&&l.cpa>0?l.cpa:(p&&n(p.predvidenCPA)?n(p.predvidenCPA):o.beCPA*0.7);
  var oB=cilj*cpaZa;
  var oK=n(kk.cvr)>0?cilj/(n(kk.cvr)/100):NaN;
  var oI=isFinite(oK)&&n(kk.ctr)>0?oK/(n(kk.ctr)/100):NaN;
  var oP=cilj*(o.marza-cpaZa);
  put("obudget",e(oB));put("okliki",i0(oK));put("oimpr",i0(oI));put("oprofit",e(oP),znak(oP));
  el("obr-note").innerHTML=cilj>0
    ? 'Za <b>'+nf1.format(cilj)+'</b> prodaj na dan pri CPA '+e(cpaZa)+' rabiš '+e(oB)+' budgeta dnevno, kar je '+e(oB*30)+' na mesec. '+
      'Mesečni profit: <b>'+e(oP*30-fiks)+'</b>'+(fiks?' (po fiksnih stroških '+e(fiks)+')':'')+'.'
    : 'Vpiši, koliko kosov na dan želiš prodati.';

  /* občutljivost */
  el("obc").innerHTML=[0.5,0.75,1,1.25,1.5,2].map(function(m){
    var cpa=cpaZa*m;
    var nar=cpa>0?budget/cpa:NaN, pd=isFinite(nar)?nar*(o.marza-cpa):NaN;
    return '<tr'+(m===1?' class="mark"':'')+'><td>'+e(cpa)+(m===1?" (zdaj)":"")+'</td><td>'+(isFinite(nar)?nf1.format(nar):"—")+'</td>'+
      '<td class="'+znak(pd)+'">'+e(pd)+'</td><td class="'+znak(pd*30)+'">'+e(pd*30)+'</td><td>'+x2(cpa>0?o.cena/cpa:NaN)+'</td></tr>';
  }).join("");
}

/* ============ vodnik (spodnji del zavihka Podatki) ============ */
function vodnikHtml(){
  return '<h2 class="locilo">Vodnik</h2>'+

  '<div class="block"><header><div class="head-t"><span class="eyebrow">Prvo vprašanje</span>'+
    '<h2>Kje vnesem budget?</h2></div></header><div class="pad">'+
    '<div class="split">'+
      '<div class="kv"><h4>Na kreativi — pravo mesto</h4>'+
        '<p>Zavihek <b>Kreative</b> → odpri kreativo → razdelek <b>Načrt</b> → <i>Dnevni budget tega oglasa</i>. '+
        'To je ista številka, ki jo nastaviš v Meta Ads Manager ali Google Ads. Vsak oglas ima svojo.</p></div>'+
      '<div class="kv"><h4>Na izdelku — skupni načrt</h4>'+
        '<p>Zavihek <b>Ekonomika</b> → <i>Načrtovan dnevni budget</i>. Samo za napoved profita na Pregledu. '+
        'Z gumbom <i>Prevzemi</i> na Pregledu vanj prepišeš vsoto vseh aktivnih kreativ.</p></div>'+
      '<div class="kv"><h4>V kalkulatorju — poigravanje</h4>'+
        '<p>Zavihek <b>Kalkulator</b>. Vpišeš ceno, maržo in dnevni budget in dobiš, kakšen CTR, CVR in ROAS moraš doseči. '+
        'Nič se ne prenese v izdelek, to je peskovnik.</p></div>'+
    '</div>'+
    '<p class="note" style="margin-top:16px"><b>Praktično pravilo za testni budget:</b> na kreativo dnevno vsaj 2× break-even CPA, 3–4 dni. '+
    'Pri marži 36 € to pomeni okoli 70 € na dan na kreativo, da v testu pride dovolj podatkov. '+
    'Če je to preveč, testiraj eno kreativo naenkrat, ne pet po 15 €.</p>'+
  '</div></div>'+

  '<div class="block"><header><div class="head-t"><span class="eyebrow">Razlika</span>'+
    '<h2>Facebook proti Googlu</h2></div>'+
    '<p>Nista dva kanala za isto stvar. Lovita človeka na dveh različnih mestih.</p></header><div class="pad">'+
    '<div class="two">'+
      '<div class="kv"><h4 class="mark-fb">Facebook in Instagram — ustvarjaš povpraševanje</h4>'+
        '<p>Človek ni iskal tvojega izdelka. Scrollal je in ga je nekaj ustavilo. Zato mora kreativa opraviti vse delo: '+
        'ustaviti, pojasniti problem in prepričati, vse v nekaj sekundah.</p>'+
        '<ul>'+
          '<li><b>Kaj odloča:</b> kreativa in kot. Targetiranje je danes drugotnega pomena, algoritem najde kupca sam.</li>'+
          '<li><b>Koliko kreativ:</b> veliko. Računaj, da 4 od 5 ne bodo delovale, in da se dobre iztrošijo v nekaj tednih.</li>'+
          '<li><b>Merila v SLO:</b> CPM 5–15 €, CTR 1–3 %, CVR 1–3 %.</li>'+
          '<li><b>Struktura:</b> ena kampanja, 1–3 oglasne skupine, v vsaki 3–6 kreativ. Ne drobi budgeta na deset skupin.</li>'+
          '<li><b>Kaj testiraš:</b> najprej kot in hook, šele nato barve, glasbo in gumbe.</li>'+
          '<li><b>Pogosta napaka:</b> preveč skupin z majhnim budgetom. Algoritem ne dobi dovolj podatkov, da bi se naučil.</li>'+
        '</ul></div>'+
      '<div class="kv"><h4 class="mark-gg">Google Search — pobiraš obstoječe povpraševanje</h4>'+
        '<p>Človek je izdelek že iskal. Ne rabiš ga prepričevati, da ga potrebuje — prepričati ga moraš, '+
        'da ga kupi pri tebi in ne pri nekom drugem, ki je v istem seznamu rezultatov.</p>'+
        '<ul>'+
          '<li><b>Kaj odloča:</b> ključne besede in ciljna stran. Slike ni, tekst je edino orodje.</li>'+
          '<li><b>Koliko besedila:</b> 5–10 naslovov po 30 znakov in 3–4 opisi po 90. Google jih kombinira sam.</li>'+
          '<li><b>Merila:</b> CTR 4–8 %, CVR pogosto 2–5 % — višje kot na Facebooku, ker je namera močnejša.</li>'+
          '<li><b>Struktura:</b> kampanja po tipu izdelka, oglasne skupine po ozkih skupinah ključnih besed.</li>'+
          '<li><b>Nujno:</b> negativne ključne besede. Brez njih plačuješ klike za „rabljeno“, „popravilo“, „zastonj“, „navodila“.</li>'+
          '<li><b>Pogosta napaka:</b> samo široko ujemanje in Performance Max brez izključitev — porabi budget na poizvedbah, ki nič ne prodajo.</li>'+
        '</ul></div>'+
    '</div>'+
    '<p class="note" style="margin-top:16px"><b>Kaj najprej, če imaš en budget:</b> če izdelek ljudje že iščejo po imenu, začni z Google Search — '+
    'promet je dražji po kliku, a bližje nakupu. Če gre za nov ali impulzni izdelek, ki ga nihče ne išče, začni s Facebookom. '+
    'Oba hkrati z majhnim budgetom pomenita, da nobeden ne dobi dovolj podatkov.</p>'+
  '</div></div>'+

  '<div class="block"><header><div class="head-t"><span class="eyebrow">Postopek</span>'+
    '<h2>Od ideje do oglasa, ki teče</h2></div>'+
    '<p>Statusi na kreativi so ti koraki — po vrsti.</p></header><div class="pad">'+
    '<ul class="check">'+
      '<li><b>ideja</b> — zapisan kot in publika, nič drugega. Tu naj jih bo veliko.</li>'+
      '<li><b>sestavi brief</b> — napiši design brief, določi kdo dela in rok. Gumb <i>Kopiraj brief</i> ti vse skupaj pripravi za pošiljanje.</li>'+
      '<li><b>daj snemat</b> — brief je oddan, čakaš material.</li>'+
      '<li><b>sestavi kreativo</b> — material je tu, sestavlja se video ali slika. Naloži ga v razdelek Material.</li>'+
      '<li><b>za pregled</b> — pripravljeno, čaka tvojo potrditev. Predogled pokaže, kako bo izgledalo.</li>'+
      '<li><b>pripravljeno za objavo</b> — tekst in material sta potrjena, čaka na vklop.</li>'+
      '<li><b>aktivna</b> — teče. Od tu naprej vpisuj rezultate. Šteje se v dnevni budget izdelka.</li>'+
      '<li><b>zmagovalka</b> — CPA je pod break-even in drži. To je tista, ki jo skaliraš in iz katere delaš nove različice.</li>'+
      '<li><b>pavza / ubita</b> — ustavljena. V opombe zapiši, zakaj, da iste napake ne ponoviš.</li>'+
    '</ul>'+
    '<p class="note" style="margin-top:16px"><b>Kdaj ubiti:</b> ko poraba doseže 3× break-even CPA brez enega samega naročila, ali ko je CPA po vsaj 10 naročilih trdno nad break-even. '+
    '<b>Kdaj skalirati:</b> ko je CPA vsaj 20 % pod break-even. Budget dvigaj po 20–30 % na 2–3 dni, ne podvajaj naenkrat.</p>'+
  '</div></div>'+
  '<div class="block"><header><div class="head-t"><span class="eyebrow">Slovarček</span><h2>Kaj pomeni katera številka</h2></div></header><div class="scroll"><table class="plain">'+
    '<thead><tr><th>Kratica</th><th>Kaj je</th><th>Kako se izračuna</th></tr></thead><tbody>'+
    [["CPM","Cena za 1000 prikazov","poraba ÷ prikazi × 1000"],
     ["CTR","Delež ljudi, ki klikne","kliki ÷ prikazi"],
     ["CPC","Cena enega klika","poraba ÷ kliki"],
     ["CVR","Delež klikov, ki kupi","naročila ÷ kliki"],
     ["CPA","Cena enega naročila","poraba ÷ naročila"],
     ["ROAS","Prihodek na vložen evro","prihodek ÷ poraba"],
     ["Marža","Kar ti ostane od naročila","neto prihodek − vsi stroški"],
     ["Break-even CPA","Največ, kar smeš plačati za naročilo","= marža na naročilo"],
     ["Break-even ROAS","Najnižji ROAS, pri katerem nisi v minusu","cena ÷ marža"]
    ].map(function(r){return '<tr><td style="font-family:var(--mono)">'+r[0]+'</td><td>'+r[1]+'</td><td style="font-family:var(--mono);text-align:left">'+r[2]+'</td></tr>';}).join("")+
    '</tbody></table></div></div>'+
  '<div class="block"><header><div class="head-t"><span class="eyebrow">Dolžine</span><h2>Omejitve besedila po platformah</h2></div>'+
    '<p>Priporočene dolžine, preden se tekst skrajša.</p></header><div class="scroll"><table class="plain">'+
    '<thead><tr><th>Platforma</th><th>Glavno besedilo</th><th>Naslov</th><th>Opis</th></tr></thead><tbody>'+
    [["Facebook / Instagram","125","40","30"],["TikTok","100","—","—"],["YouTube","100","—","—"],["Google Search (RSA)","—","30 × do 15","90 × do 4"]]
    .map(function(r){return '<tr><td>'+r[0]+'</td><td class="n">'+r[1]+'</td><td class="n">'+r[2]+'</td><td class="n">'+r[3]+'</td></tr>';}).join("")+
    '</tbody></table></div>'+
    '<div class="pad"><p class="note">Platforme te omejitve občasno spremenijo. Če ti vmesnik pokaže drugo številko, velja njegova. '+
    'Števci v urejevalniku uporabljajo te vrednosti in zasvetijo rdeče, ko jih presežeš.</p></div></div>'+
  '<div class="block"><header><div class="head-t"><span class="eyebrow">Metoda</span><h2>Kako se štejejo vračila</h2></div></header><div class="pad"><p class="note">'+
    'Pri vračilu izgubiš prihodek naročila, dostavo, embalažo in provizijo pa si že plačal. Zato je efektivna marža '+
    '<b>marža × (1 − stopnja vračil) − stopnja vračil × (dostava + embalaža + provizija)</b>. Nabavna cena se pri vračilu ne šteje kot izguba, ker izdelek dobiš nazaj. '+
    'Če pri tebi izdelek ni več prodajen (higiena, poškodba), prištej nabavno ceno v polje „Ostalo na naročilo“.'+
  '</p></div></div>';
}

/* ============ zlivanje dveh stanj ============
   Dva človeka pod istim računom urejata vsak na svoji napravi. Zato se stanji
   zlijeta po zapisih (id-jih), ne po tem, katero je novejše: kar obstaja samo
   na eni strani, se ohrani; kjer isti zapis obstaja na obeh, obvelja tisti z
   novejše strani. Brisanje se prenese prek sledi (S.brisano) — brez tega bi
   izbrisan izdelek pri naslednji sinhronizaciji vstal od mrtvih.            */
function sledBrisanja(id){
  if(!Array.isArray(S.brisano))S.brisano=[];
  if(!S.brisano.some(function(x){return x.id===id;}))
    S.brisano.push({id:id,kdaj:new Date().toISOString()});
}
function zlijStanje(lok,obl){
  if(!obl||typeof obl!=="object")return {stanje:lok,spremenjeno:false,opis:""};
  var lokCas=lok.spremenjeno?new Date(lok.spremenjeno).getTime():0;
  var oblCas=obl.spremenjeno?new Date(obl.spremenjeno).getTime():0;
  var novejsiJeOblak=oblCas>lokCas;

  /* sledi brisanja z obeh strani; kar je pobrisano, ne pride nazaj */
  var sledi={};
  [lok.brisano,obl.brisano].forEach(function(a){
    (Array.isArray(a)?a:[]).forEach(function(x){if(x&&x.id)sledi[x.id]=x;});
  });
  var vseSledi=Object.keys(sledi).map(function(id){return sledi[id];});
  /* sled starejša od 90 dni ne rabi več obstajati */
  var meja=Date.now()-90*24*3600*1000;
  vseSledi=vseSledi.filter(function(x){
    var t=new Date(x.kdaj).getTime();
    return !isFinite(t)||t>meja;
  });
  var jePobrisan={};
  vseSledi.forEach(function(x){jePobrisan[x.id]=true;});

  var dodanih=0, spojenih=0;
  /* union po id: a je „naša“ stran, b druga; pri obojestranskih obvelja novejša */
  function zlij(a,b,bJeNovejsi){
    a=Array.isArray(a)?a:[];b=Array.isArray(b)?b:[];
    var out=[], vzeto={};
    a.forEach(function(x){
      if(!x||!x.id||jePobrisan[x.id])return;
      var par=b.filter(function(y){return y&&y.id===x.id;})[0];
      vzeto[x.id]=true;
      if(!par){out.push(x);return;}
      spojenih++;
      out.push(bJeNovejsi?par:x);
    });
    b.forEach(function(y){
      if(!y||!y.id||vzeto[y.id]||jePobrisan[y.id])return;
      dodanih++;
      out.push(y);
    });
    return out;
  }

  var izdelki=zlij(lok.izdelki,obl.izdelki,novejsiJeOblak);
  /* kreative zlijemo znotraj izdelka, drugače bi izgubil kolegovo kreativo */
  izdelki=izdelki.map(function(x){
    var vL=(Array.isArray(lok.izdelki)?lok.izdelki:[]).filter(function(y){return y.id===x.id;})[0];
    var vO=(Array.isArray(obl.izdelki)?obl.izdelki:[]).filter(function(y){return y.id===x.id;})[0];
    if(!vL||!vO)return x;
    var kop=JSON.parse(JSON.stringify(x));
    kop.kreative=zlij(vL.kreative,vO.kreative,novejsiJeOblak);
    return kop;
  });

  /* stikala poleg id-ja ujemamo še po imenu, da se ne podvojijo */
  var stikala=zlij(lok.stikala,obl.stikala,novejsiJeOblak);
  var poImenu={}, brezDvojnikov=[];
  stikala.forEach(function(g){
    if(!g||!g.ime)return;
    if(poImenu[g.ime]){
      (g.moznosti||[]).forEach(function(m){
        if(poImenu[g.ime].moznosti.indexOf(m)<0)poImenu[g.ime].moznosti.push(m);
      });
      return;
    }
    poImenu[g.ime]=g;brezDvojnikov.push(g);
  });

  /* kazalo datotek: potrditev „je v oblaku“ velja, če jo pozna katera stran */
  var datoteke=zlij(lok.datoteke,obl.datoteke,novejsiJeOblak).map(function(d){
    var vL=(Array.isArray(lok.datoteke)?lok.datoteke:[]).filter(function(y){return y.id===d.id;})[0];
    var vO=(Array.isArray(obl.datoteke)?obl.datoteke:[]).filter(function(y){return y.id===d.id;})[0];
    if((vL&&vL.oblak)||(vO&&vO.oblak))d.oblak=true;
    return d;
  });

  var novo=novejsiJeOblak?JSON.parse(JSON.stringify(obl)):JSON.parse(JSON.stringify(lok));
  novo.projekti=zlij(lok.projekti,obl.projekti,novejsiJeOblak);
  novo.izdelki=izdelki;
  novo.stikala=brezDvojnikov;
  novo.banka=zlij(lok.banka,obl.banka,novejsiJeOblak);
  novo.datoteke=datoteke;
  novo.brisano=vseSledi;
  novo.spremenjeno=new Date().toISOString();

  var deli=[];
  if(dodanih)deli.push(dodanih+" zapisov prevzetih iz oblaka");
  if(spojenih)deli.push(spojenih+" usklajenih");
  return {
    stanje:novo,
    spremenjeno:!!(dodanih||spojenih)||lokCas!==oblCas,
    opis:deli.length?deli.join(", "):"brez razlik"
  };
}

/* ============ oblak (Supabase) ============ */
var Oblak=(function(){
  var CFG=window.OGLASNI_CONFIG||{url:"",anonKey:""};
  var sb=null, user=null, stanjeNapake=null, zadnjaSink=null, sdkTece=false;
  function nastavljen(){return !!(String(CFG.url||"").trim() && String(CFG.anonKey||"").trim());}
  function naloziSDK(cb){
    if(window.supabase&&window.supabase.createClient)return cb(null);
    if(sdkTece)return;
    sdkTece=true;
    var s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
    s.onload=function(){sdkTece=false;cb(null);};
    s.onerror=function(){sdkTece=false;cb("Knjižnice Supabase ni bilo mogoče naložiti — preveri internetno povezavo.");};
    document.head.appendChild(s);
  }
  function init(){
    if(!nastavljen())return;
    naloziSDK(function(nap){
      if(nap){stanjeNapake=nap;osveziPanel();return;}
      try{
        /* Sejo hranimo v localStorage pod svojim ključem in jo sami osvežujemo,
           da se ni treba prijavljati ob vsakem obisku. detectSessionInUrl je
           izklopljen, ker prijave iz naslovne vrstice ne uporabljamo.        */
        sb=window.supabase.createClient(String(CFG.url).trim(),String(CFG.anonKey).trim(),
          {auth:{
            persistSession:true,
            autoRefreshToken:true,
            detectSessionInUrl:false,
            storageKey:"oglasni-list-seja",
            storage:window.localStorage
          }});
      }catch(err){stanjeNapake="Napačen Supabase url ali ključ.";osveziPanel();return;}
      sb.auth.getSession().then(function(res){
        user=res&&res.data&&res.data.session?res.data.session.user:null;
        osveziPanel();
        if(user)sinhroniziraj();
      });
      sb.auth.onAuthStateChange(function(_ev,sess){
        var prej=user?user.id:null;
        user=sess?sess.user:null;
        osveziPanel();
        if(user&&user.id!==prej)sinhroniziraj();
      });
    });
  }
  function prevediNapako(m){
    m=String(m||"");
    if(/Invalid login credentials/i.test(m))return "Napačen e-naslov ali geslo.";
    if(/User already registered/i.test(m))return "Ta e-naslov je že registriran — uporabi Prijava.";
    if(/Password should be at least/i.test(m))return "Geslo mora imeti vsaj 6 znakov.";
    if(/Email not confirmed/i.test(m))return "E-pošta še ni potrjena — poglej v nabiralnik.";
    if(/rate limit|too many/i.test(m))return "Preveč poskusov — počakaj minuto.";
    return m;
  }
  function prijava(email,geslo,novRacun){
    if(!sb){toast("Oblak ni pripravljen.");return;}
    if(!email||!geslo){toast("Vpiši e-naslov in geslo.");return;}
    toast(novRacun?"Ustvarjam račun…":"Prijavljam…");
    var klic=novRacun?sb.auth.signUp({email:email,password:geslo}):sb.auth.signInWithPassword({email:email,password:geslo});
    klic.then(function(res){
      if(res.error){toast(prevediNapako(res.error.message));return;}
      if(novRacun&&res.data&&!res.data.session){toast("Račun ustvarjen. Potrdi e-pošto, potem se prijavi.");return;}
      toast(novRacun?"Račun ustvarjen in prijavljen.":"Prijavljen.");
    },function(){toast("Prijava ni uspela — preveri povezavo.");});
  }
  function odjava(){
    if(!sb)return;
    sb.auth.signOut().then(function(){user=null;osveziPanel();toast("Odjavljen. Podatki ostanejo v tem brskalniku.");});
  }
  function potegni(){
    if(!sb||!user)return Promise.resolve(null);
    return sb.from("stanje").select("podatki,spremenjeno").eq("uporabnik",user.id).maybeSingle()
      .then(function(res){if(res.error)throw res.error;return res.data;});
  }
  function porini(){
    if(!sb||!user)return Promise.resolve(null);
    var zdaj=new Date().toISOString();
    return sb.from("stanje").upsert({uporabnik:user.id,podatki:S,spremenjeno:zdaj}).then(function(res){
      if(res.error)throw res.error;
      zadnjaSink=zdaj;osveziPanel();return res;
    });
  }
  function napakaTabele(err){
    var m=String(err&&(err.message||err.hint)||err||"");
    if(/relation .* does not exist|Could not find the table|schema cache/i.test(m))
      return "Tabele „stanje“ še ni — zaženi SQL iz zavihka Podatki.";
    if(/row-level security|permission denied/i.test(m))
      return "Baza je zavrnila dostop — preveri RLS pravila.";
    return "Napaka oblaka: "+m;
  }
  function prevzemi(vrstica){
    var d=vrstica.podatki;
    if(!d||!d.izdelki||!d.izdelki.length){toast("V oblaku ni podatkov.");return;}
    S=d;migriraj();
    S.spremenjeno=vrstica.spremenjeno;
    odprtaKreativa=null;
    try{localStorage.setItem(LS,JSON.stringify(S));}catch(err){}
    zadnjaSink=vrstica.spremenjeno;
    polniIzbirnik();render();
  }
  /* Sinhronizacija zlije obe strani: kar je v oblaku in kar je tu. Nič se ne
     prepiše in nič ne izgubi — če kolega doda kreativo, medtem ko ti dodajaš
     drugo, po sinhronizaciji obstajata obe.                                 */
  function sinhroniziraj(){
    if(!sb||!user)return;
    potegni().then(function(vrstica){
      if(!vrstica)return porini().then(function(){toast("Podatki poslani v oblak.");});
      var r=zlijStanje(S,vrstica.podatki);
      S=r.stanje;migriraj();
      odprtaKreativa=null;
      try{localStorage.setItem(LS,JSON.stringify(S));}catch(err){}
      polniIzbirnik();render();
      return porini().then(function(){
        toast(r.spremenjeno
          ? "Usklajeno: "+r.opis+"."
          : "Že usklajeno.");
      });
    },function(err){stanjeNapake=napakaTabele(err);osveziPanel();toast(stanjeNapake);})
    /* ob vsaki sinhronizaciji stanja poskusi poslati še slike, ki čakajo */
    .then(function(){return sinhronizirajDatoteke();},function(){})
    .then(function(r){if(r&&r.poslano)osveziPanel();},function(){});
  }
  var lezi=null;
  function zaLezi(){
    if(!sb||!user)return;
    clearTimeout(lezi);
    lezi=setTimeout(function(){porini().then(function(){},function(err){toast(napakaTabele(err));});},2500);
  }
  function status(){
    if(!nastavljen())return {stopnja:"ni",besedilo:"Ni nastavljeno"};
    if(stanjeNapake)return {stopnja:"napaka",besedilo:stanjeNapake};
    if(!sb)return {stopnja:"cakam",besedilo:"Povezujem…"};
    if(!user)return {stopnja:"odjavljen",besedilo:"Nastavljeno, nisi prijavljen"};
    return {stopnja:"ok",besedilo:"Prijavljen kot "+user.email};
  }
  /* ---- datoteke v Supabase Storage ----
     Kazalo datotek gre skupaj s stanjem, bajti pa v svoje vedro. Ker ekipa dela
     pod enim računom, vsi vidijo iste datoteke.                              */
  var VEDRO="material", stanjeVedra=null;
  function pot(z){return String(z&&z.id||"");}
  /* Napako vedra pokažemo enkrat na sejo, ne pri vsaki datoteki — pri desetih
     slikah je deset enakih obvestil samo hrup.                              */
  var povedanaNapaka=null, ponovniPoskus=null, zamik=15000;
  function naloziDat(z,blob){
    if(!sb||!user||!z)return Promise.resolve(null);
    return sb.storage.from(VEDRO).upload(pot(z),blob,{contentType:z.tip||"application/octet-stream",upsert:true})
      .then(function(res){
        if(res.error)throw res.error;
        Datoteke.oznaciVOblaku(z.id);
        stanjeVedra=null;
        return res;
      }).catch(function(err){
        var m=napakaVedra(err);
        stanjeVedra=m;
        if(povedanaNapaka!==m){
          povedanaNapaka=m;
          toast("Slika je shranjena v napravi. V oblak še ni šla: "+m);
        }
        naceRtujPoskus();
        return null;
      });
  }
  /* Kar ni šlo gor, poskusimo znova sami — brez klikanja. Zamik se podvaja do
     dveh minut, da ob manjkajočem vedru ne trkamo po strežniku.             */
  function naceRtujPoskus(){
    if(ponovniPoskus)return;
    ponovniPoskus=setTimeout(function(){
      ponovniPoskus=null;
      sinhronizirajDatoteke().then(function(r){
        if(r&&r.poslano){
          zamik=15000;povedanaNapaka=null;
          toast(r.poslano+(r.poslano===1?" slika je":" slik je")+" prišlo v oblak.");
          osveziPanel();
        }else if(r&&r.caka){
          zamik=Math.min(zamik*2,120000);
          naceRtujPoskus();
        }
      },function(){});
    },zamik);
  }
  function prenesiDat(z){
    if(!sb||!user||!z)return Promise.resolve(null);
    return sb.storage.from(VEDRO).download(pot(z)).then(function(res){
      if(res.error)throw res.error;
      return res.data;
    });
  }
  function brisiDat(z){
    if(!sb||!user||!z)return Promise.resolve(null);
    return sb.storage.from(VEDRO).remove([pot(z)]).then(function(){},function(){});
  }
  function napakaVedra(err){
    var m=String(err&&(err.message||err.error)||err||"");
    if(/Bucket not found/i.test(m))return "vedra „"+VEDRO+"“ še ni — naredi ga v Supabase pod Storage.";
    if(/row-level security|not authorized|Unauthorized|violates/i.test(m))return "shramba je zavrnila dostop, preveri pravila vedra.";
    if(/exceeded|too large|Payload/i.test(m))return "datoteka je prevelika za brezplačni Supabase.";
    return m;
  }
  /* Vse, kar je v tej napravi in še ni v oblaku, potisni gor. Teče sproti: ob
     prijavi, ob vsaki sinhronizaciji stanja in po neuspelem nalaganju.      */
  function sinhronizirajDatoteke(){
    if(!sb||!user)return Promise.resolve({poslano:0,caka:0});
    var caka=Datoteke.zaOblak(), poslano=0;
    if(!caka.length)return Promise.resolve({poslano:0,caka:0});
    var p=Promise.resolve();
    caka.forEach(function(x){
      p=p.then(function(){
        return Datoteke.lokalno(x.id).then(function(z){
          if(!z||!z.blob)return null;   /* bajtov ni v tej napravi — ni kaj poslati */
          return naloziDat(z,z.blob).then(function(r){if(r)poslano++;});
        },function(){});
      });
    });
    return p.then(function(){return {poslano:poslano,caka:Datoteke.zaOblak().length};});
  }
  function poriniDatoteke(){
    return sinhronizirajDatoteke().then(function(r){return r.poslano;});
  }
  function napakaVedraZdaj(){return stanjeVedra;}
  function osveziPanel(){
    osveziSideOblak();
    if(view==="podatki")renderOblakPanel();
  }
  return {init:init,prijava:prijava,odjava:odjava,sinhroniziraj:sinhroniziraj,porini:porini,potegni:potegni,
    prevzemi:prevzemi,zaLezi:zaLezi,status:status,nastavljen:nastavljen,
    naloziDat:naloziDat,prenesiDat:prenesiDat,brisiDat:brisiDat,poriniDatoteke:poriniDatoteke,
    sinhronizirajDatoteke:sinhronizirajDatoteke,napakaVedra:napakaVedraZdaj,
    prijavljen:function(){return !!user;},zadnja:function(){return zadnjaSink;}};
})();

/* Stanje oblaka v stranski vrstici. Prijava je stvar, ki jo moraš videti brez
   iskanja — in ki mora povedati, da je račun skupen za vso ekipo.           */
function osveziSideOblak(){
  var g=el("sideOblak");if(!g)return;
  var st=Oblak.status();
  var barva={ni:"var(--side-ink2)",cakam:"var(--warn)",odjavljen:"var(--warn)",ok:"var(--pos)",napaka:"var(--neg)"}[st.stopnja];
  var naslov={ni:"Oblak izklopljen",cakam:"Povezujem",odjavljen:"Prijavi se",ok:"Ekipa",napaka:"Napaka oblaka"}[st.stopnja];
  var caka=Datoteke.naVoljo?Datoteke.zaOblak().length:0;
  var pod={
    ni:"brez sinhronizacije",
    cakam:"trenutek …",
    odjavljen:"skupen račun ekipe",
    ok:caka?caka+" slik čaka na oblak":st.besedilo.replace(/^Prijavljen kot\s*/,""),
    napaka:"klikni za podrobnosti"
  }[st.stopnja];
  if(st.stopnja==="ok"&&caka)barva="var(--warn)";
  el("sideOblakDot").style.color=barva;
  el("sideOblakN").textContent=naslov;
  el("sideOblakS").textContent=pod;
  g.title=st.stopnja==="ok"
    ? "Prijavljen v skupen račun ekipe. Vsi, ki uporabljajo ta račun, vidijo iste mape, kreative in slike. Klikni za sinhronizacijo."
    : "Skupen račun ekipe — klikni za prijavo in sinhronizacijo.";
}

function renderOblakPanel(){
  var t=el("cloud-body");if(!t)return;
  var st=Oblak.status();
  var barva={ni:"var(--ink3)",cakam:"var(--warn)",odjavljen:"var(--warn)",ok:"var(--pos)",napaka:"var(--neg)"}[st.stopnja];
  var glava='<p class="note" style="margin-top:0"><span class="dot" style="color:'+barva+'"></span><b>'+esc(st.besedilo)+'</b>'+
    (Oblak.zadnja()?' · zadnja sinhronizacija '+cas(Oblak.zadnja()):'')+'</p>';
  if(!Oblak.nastavljen()){
    t.innerHTML=glava+
      '<p class="note">Sinhronizacija med napravami je vgrajena, manjkata samo dva podatka. Ko jih vpišeš, so vsi projekti, izdelki, kreative <b>in naložene slike ter videi</b> enaki na telefonu, računalniku in pri vseh, ki se prijavijo z istim računom.</p>'+
      '<ol class="steps" style="margin-top:12px">'+
        '<li>Naredi brezplačen projekt na <code>supabase.com</code>.</li>'+
        '<li>V <b>SQL Editor</b> prilepi in zaženi datoteko <code>supabase.sql</code> iz repozitorija aplikacije.</li>'+
        '<li>V <b>Authentication → Sign In / Providers → Email</b> izklopi <b>Confirm email</b>, da se lahko prijaviš takoj brez potrditvenega maila.</li>'+
        '<li>V <b>Project Settings → API</b> prekopiraj <code>Project URL</code> in ključ <code>anon public</code> ter ju vpiši v datoteko <code>config.js</code>. To sta javna podatka za brskalnik — tvoje vrstice varuje RLS iz 2. koraka.</li>'+
        '<li>Osveži stran. Tu se pojavi obrazec za prijavo.</li>'+
      '</ol>';
    return;
  }
  if(!Oblak.prijavljen()){
    t.innerHTML=glava+
      '<div class="grid" style="max-width:520px">'+
        '<div class="f"><label for="ob-mail">E-naslov</label><input class="txt" id="ob-mail" type="email" autocomplete="email" inputmode="email"></div>'+
        '<div class="f"><label for="ob-geslo">Geslo</label><input class="txt" id="ob-geslo" type="password" autocomplete="current-password"></div>'+
      '</div>'+
      '<div class="row" style="margin-top:12px"><button class="btn btn-p" id="ob-in">Prijava</button>'+
      '<button class="btn" id="ob-nov">Ustvari račun</button></div>'+
      '<p class="note" style="margin-top:12px">Geslo gre neposredno v tvojo Supabase bazo, ta stran ga nikjer ne hrani. Po prijavi ostaneš prijavljen v tej napravi.<br>'+
      '<b>Za ekipo uporabite en skupen račun.</b> Kdor se prijavi z njim, vidi iste mape, kreative in slike — to je namen. Ločeni računi pomenijo ločene, prazne delovne prostore.</p>';
    return;
  }
  t.innerHTML=glava+
    '<div class="row"><button class="btn btn-p" id="ob-sync">Sinhroniziraj zdaj</button>'+
    '<button class="btn" id="ob-files">Pošlji slike v oblak</button>'+
    '<button class="btn" id="ob-out">Odjava</button></div>'+
    '<p class="note" style="margin-top:12px" id="ob-dat">Preverjam datoteke …</p>'+
    '<p class="note">Spremembe se same pošljejo v oblak nekaj sekund po vnosu. <b>Sinhroniziraj zdaj</b> zlije obe strani: kar je samo v oblaku, prevzame, kar je samo tu, pošlje gor. '+
    'Nič se ne prepiše — če kolega doda kreativo, medtem ko ti dodajaš drugo, po sinhronizaciji obstajata obe. Kar kdo izbriše, ostane izbrisano. '+
    'Nove slike in videi gredo v oblak takoj ob nalaganju; <b>Pošlji slike v oblak</b> potisne gor še tisto, kar si naložil prej, ko oblak še ni bil vklopljen.</p>';
  /* koliko datotek je v ekipi, koliko čaka na oblak in koliko jih ta naprava nima */
  Promise.all([Datoteke.stevilo(),Datoteke.manjka()]).then(function(r){
    var d=el("ob-dat");if(!d)return;
    var caka=Datoteke.zaOblak().length;
    var napaka=Oblak.napakaVedra();
    d.innerHTML=r[0]
      ? '<b>Datotek v ekipi:</b> '+r[0]+
        (caka?' · <b style="color:var(--warn)">'+caka+' čaka na oblak</b>':' · vse so v oblaku')+
        (r[1]?' · '+r[1]+' jih ta naprava še ni prenesla':'')+
        (napaka
          ? '<br><span style="color:var(--neg)"><b>Nalaganje ne uspe:</b> '+esc(napaka)+'</span>'+
            '<br>Vedro lahko narediš tudi na roko: Supabase → <b>Storage</b> → <i>New bucket</i>, ime <code>material</code>, brez javnega dostopa. Potem poženi še SQL, da dodaš pravila.'
          : '')
      : 'Nobene slike ali videa še ni.';
  },function(){});
}

/* ============ POGLED: podatki ============ */
function renderPodatki(){
  el("v-podatki").innerHTML=
  glava("Podatki","Kje so shranjeni, kako jih preneseš na drugo napravo in kako vklopiš sinhronizacijo.","",[{t:"Podatki"}])+
  '<div class="block" id="cloud-block"><header><div class="head-t"><span class="eyebrow">Oblak</span><h2>Sinhronizacija med napravami</h2></div>'+
    '<p>Neobvezno, potrebuje svoj Supabase projekt.</p></header>'+
    '<div class="pad" id="cloud-body"></div></div>'+
  '<div class="block"><header><div class="head-t"><span class="eyebrow">Lokalno</span><h2>Ta naprava</h2></div></header><div class="pad">'+
    '<p class="note">Besedila in izračuni se samodejno shranijo v brskalnik, naložene slike in videi pa v ločeno shrambo iste naprave. Deluje tudi brez interneta. '+
    'Če pobrišeš podatke brskalnika ali odpreš stran v anonimnem oknu, je vse to izgubljeno — zato občasno izvozi.<br>'+
    '<b>Zadnja sprememba:</b> '+cas(S.spremenjeno)+'</p>'+
    '<div id="prostor" class="note" style="margin-top:10px">Preverjam zasedenost shrambe …</div>'+
    '<div class="row" style="margin-top:14px">'+
      '<button class="btn btn-p" id="exp">Izvozi besedila (JSON)</button>'+
      '<button class="btn" id="impAdd">Uvozi in dodaj</button>'+
      '<button class="btn" id="impUrl">Naloži pripravljeno mapo</button>'+
      '<button class="btn" id="impBtn">Uvozi in zamenjaj</button>'+
      '<input type="file" id="impFile" accept=".json,application/json" hidden>'+
      '<input type="file" id="impFileAdd" accept=".json,application/json" hidden>'+
      '<button class="btn" id="prn">Natisni / PDF</button>'+
    '</div>'+
    '<p class="note" style="margin-top:10px"><b>Naloži pripravljeno mapo</b> vzame mapo, ki je objavljena skupaj z aplikacijo ('+esc(MAPE_URL)+'), in jo doda k tvojim podatkom — brez datoteke in brez prepisovanja. Na telefonu je to najhitrejša pot. '+
    (pripravljenaNalozena()
      ? '<b>Mapa „'+esc(MAPA_IME)+'“ je že naložena</b> — ponoven klik naredi drugo kopijo s pripisom „(uvoženo)“.'
      : 'Mape „'+esc(MAPA_IME)+'“ še ni v tvojih podatkih.')+'<br>'+
    '<b>Uvozi in dodaj</b> mape in izdelke iz datoteke prilepi zraven obstoječim — nič se ne povozi. '+
    '<b>Uvozi in zamenjaj</b> odvrže vse, kar je zdaj v aplikaciji, in postavi na njegovo mesto vsebino datoteke; pred tem vpraša za potrditev.<br>'+
    'Izvoz vsebuje projekte, izdelke, kreative in vse številke — <b>ne pa naloženih slik in videov</b>, ker so za JSON preveliki. Te po potrebi prenesi posamično iz kreative.</p>'+
    '<div class="f" style="margin-top:18px"><label for="paste">Ali prilepi vsebino izvožene datoteke sem in klikni Uvozi</label>'+
      '<textarea id="paste" rows="4" placeholder=\'{"v":4,"projekti":[…]}\'></textarea>'+
      '<div class="row" style="margin-top:8px">'+
        '<button class="btn" id="impPasteAdd">Uvozi prilepljeno in dodaj</button>'+
        '<button class="btn" id="impPaste">Uvozi prilepljeno in zamenjaj</button>'+
      '</div></div>'+
  '</div></div>'+
  stikalaUrediHtml()+
  vodnikHtml();
  renderOblakPanel();
  osveziProstor();
}
function osveziProstor(){
  var t=el("prostor");if(!t)return;
  var delov=[];
  var pStevilo=Datoteke.naVoljo?Datoteke.stevilo().catch(function(){return null;}):Promise.resolve(null);
  var pOcena=(navigator.storage&&navigator.storage.estimate)?navigator.storage.estimate().catch(function(){return null;}):Promise.resolve(null);
  Promise.all([pStevilo,pOcena]).then(function(res){
    var st=res[0], oc=res[1];
    if(st!=null)delov.push("<b>Naloženih datotek:</b> "+st);
    if(oc&&oc.usage!=null){
      var pct=oc.quota?Math.min(100,oc.usage/oc.quota*100):0;
      delov.push("<b>Zasedeno:</b> "+mb(oc.usage)+(oc.quota?" od približno "+mb(oc.quota):""));
      t.innerHTML=delov.join(" · ")+'<div class="bar"><i style="width:'+pct.toFixed(1)+'%"></i></div>';
      return;
    }
    t.innerHTML=delov.length?delov.join(" · "):"Zasedenosti shrambe ta brskalnik ne pove.";
  });
}

/* ============ izvoz / uvoz ============ */
function izvozi(){
  var data=JSON.stringify(S,null,2);
  var ime="oglasni-list-"+new Date().toISOString().slice(0,10)+".json";
  try{
    var b=new Blob([data],{type:"application/json"});
    var u=URL.createObjectURL(b);
    var a=document.createElement("a");
    a.href=u;a.download=ime;document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},1000);
    toast("Datoteka "+ime+" prenesena.");
  }catch(err){
    var t=el("paste");if(t){t.value=data;t.focus();t.select();}
    toast("Prenos ni uspel — besedilo je v polju spodaj, shrani ga ročno.");
  }
}
/* ============ urejanje stikal ============ */
function stikalaUrediHtml(){
  return '<div class="block"><header><div class="head-t"><span class="eyebrow">Stikala</span>'+
    '<h2>Svoja stikala</h2></div>'+
    '<p>Stikalo je skupina možnosti, ki si jo določiš sam — na primer <b>Trg: Slovenija / Hrvaška / Slovaška</b>. '+
    'Pojavi se na izdelku in na vsaki kreativi. V seznamu kreativ z njim izbereš, katere oglase vidiš, '+
    'na kreativi pa lahko eno stikalo vodi besedila, tako da ima vsaka možnost svoj tekst.</p></header><div class="pad">'+
    (stikala().length
      ? '<div class="sg-l">'+stikala().map(function(g){
          var raba=stikRaba(g);
          return '<div class="sg">'+
            '<div class="sg-h">'+
              '<input class="txt sg-ime" type="text" data-sgime="'+g.id+'" value="'+esc(g.ime)+'" placeholder="Ime stikala" aria-label="Ime stikala">'+
              '<label class="chk" title="Izklopljeno stikalo se ne pojavi na izdelkih, kreativah in v seznamu — definicija in vrednosti ostanejo">'+
                '<input type="checkbox" data-sgakt="'+g.id+'"'+(g.aktivno===false?"":" checked")+'> v uporabi'+
              '</label>'+
              '<span class="sg-r">'+(raba?esc(raba):"še nikjer v uporabi")+'</span>'+
              '<button class="sg-x no-print" data-sgdel="'+g.id+'" title="Odstrani stikalo" aria-label="Odstrani stikalo">✕</button>'+
            '</div>'+
            '<div class="sg-m">'+
              g.moznosti.map(function(m,i){
                return '<span class="sg-mo">'+
                  /* +3 znake rezerve: pisava ni enakomerna, zato bi „Slovenija“
                     pri natančni širini izgubila zadnjo črko                  */
                  '<input type="text" data-sgmoz="'+g.id+'" data-i="'+i+'" value="'+esc(m)+'" aria-label="Možnost '+(i+1)+'" '+
                    'style="width:'+Math.max(8,Math.min(24,m.length+3))+'ch">'+
                  (g.moznosti.length>2?'<button class="sg-mx no-print" data-sgmdel="'+g.id+'" data-i="'+i+'" title="Odstrani možnost" aria-label="Odstrani možnost">✕</button>':'')+
                '</span>';
              }).join("")+
              '<button class="btn btn-s btn-soft no-print" data-sgmadd="'+g.id+'">+ možnost</button>'+
            '</div>'+
          '</div>';
        }).join("")+'</div>'+
        '<p class="note" style="margin-top:12px">Piši neposredno v možnost, da jo preimenuješ — vrednost se prenese na vseh izdelkih in kreativah, nič se ne izgubi. Najmanj dve možnosti sta obvezni.<br>'+
        'Odkljukaj <b>v uporabi</b>, da stikalo izgine z izdelkov, kreativ in iz seznama, definicija in vpisane vrednosti pa ostanejo. Tako imaš lahko pripravljenih več stikal, na strani pa samo tista, ki jih res rabiš.</p>'
      : '<p class="note">Stikal še ni.</p>')+
    '<div class="row no-print" style="margin-top:14px">'+
      '<button class="btn btn-p" id="sgnew">+ Novo stikalo</button>'+
      (stikala().some(function(g){return g.ime==="Trg";})?'':'<button class="btn" id="sgtrg">+ Trg (Slovenija, Hrvaška, Slovaška)</button>')+
    '</div>'+
  '</div></div>';
}
/* kje se to stikalo dejansko uporablja — da vidiš, kaj bi brisanje odneslo */
function stikRaba(g){
  var izd=0,kre=0,loci=0;
  S.izdelki.forEach(function(x){
    if(x.stikala&&x.stikala[g.id])izd++;
    (x.kreative||[]).forEach(function(k){
      if(k.stikala&&k.stikala[g.id])kre++;
      if(k.vodi===g.id)loci++;
    });
  });
  var d=[];
  if(izd)d.push(izd+" izdelkov");
  if(kre)d.push(kre+" kreativ");
  if(loci)d.push(loci+" z ločenimi besedili");
  return d.join(" · ");
}
/* Preimenovanje možnosti prenese vrednost povsod, kjer je bila v uporabi —
   tudi ključe ločenih besedil. Brez tega bi kreativa ostala brez vrednosti. */
function stikPreimenujMoznost(g,stara,nova){
  S.izdelki.forEach(function(x){
    if(x.stikala&&x.stikala[g.id]===stara)x.stikala[g.id]=nova;
    (x.kreative||[]).forEach(function(k){
      if(k.stikala&&k.stikala[g.id]===stara)k.stikala[g.id]=nova;
      if(k.vodi===g.id&&k.variante&&Object.prototype.hasOwnProperty.call(k.variante,stara)){
        k.variante[nova]=k.variante[stara];
        delete k.variante[stara];
      }
    });
  });
  if(S.stikaloPogled&&S.stikaloPogled[g.id]===stara)S.stikaloPogled[g.id]=nova;
}
function dodajStikalo(ime,moznosti){
  if(!Array.isArray(S.stikala))S.stikala=[];
  var g=novoStikalo(ime,moznosti);
  S.stikala.push(g);
  shrani();render();
  toast("Stikalo „"+g.ime+"“ dodano. Najdeš ga na izdelku in na kreativah.");
}
function brisiStikalo(gid){
  var g=stikNajdi(gid);
  if(!g)return;
  var vodijo=0;
  S.izdelki.forEach(function(x){(x.kreative||[]).forEach(function(k){if(k.vodi===gid)vodijo++;});});
  if(!confirm("Odstranim stikalo „"+g.ime+"“?"+
    (vodijo?"\n\n"+vodijo+" kreativ ima po njem ločena besedila. Besedila, ki so zdaj vpisana, ostanejo; ostale različice postanejo nedosegljive.":"")))return;
  S.stikala=stikala().filter(function(x){return x.id!==gid;});
  migriraj();shrani();render();
  toast("Stikalo odstranjeno.");
}

/* Mapa, pripravljena vnaprej in objavljena skupaj z aplikacijo. Obide datoteke
   in kopiranje besedila — na telefonu je oboje mučno.                        */
var MAPE_URL="mape/eureka.json", MAPA_IME="TRGOVINA EUREKA";
function pripravljenaNalozena(){
  return S.projekti.some(function(x){return x.ime===MAPA_IME;});
}
function naloziPripravljeno(){
  var b=el("impUrl");
  if(b){b.disabled=true;b.textContent="Nalagam …";}
  function konec(){if(b){b.disabled=false;b.textContent="Naloži pripravljeno mapo";}}
  if(typeof fetch!=="function"){konec();toast("Ta brskalnik ne podpira nalaganja s strani — uporabi Uvozi in dodaj.");return;}
  fetch(MAPE_URL,{cache:"no-store"}).then(function(r){
    if(!r.ok)throw new Error("strežnik je vrnil "+r.status);
    return r.text();
  }).then(function(txt){
    konec();uvozi(txt,"dodaj");
  }).catch(function(err){
    konec();toast("Mape ni bilo mogoče naložiti: "+(err&&err.message||"ni povezave"));
  });
}

/* nacin "zamenjaj" pobrise obstojece stanje, "dodaj" ga pusti pri miru in
   uvozene mape ter izdelke samo prilepi zraven                              */
function uvozi(txt,nacin){
  var d;
  try{d=JSON.parse(txt);}catch(err){toast("To ni veljaven JSON.");return;}
  if(!d||!d.izdelki||!d.izdelki.length){toast("V datoteki ni izdelkov.");return;}
  if(nacin==="dodaj")return uvoziDodaj(d);
  if(!confirm("Uvoz zamenja vse, kar je zdaj v aplikaciji — "+S.izdelki.length+
    " izdelkov gre stran. Nadaljujem?"))return;
  S=d;migriraj();
  odprtaKreativa=null;shrani();polniIzbirnik();render();
  toast("Uvoženo: "+S.projekti.length+" map, "+S.izdelki.length+" izdelkov.");
}
/* Uvoz brez povozitve. Mapa z istim imenom se ponovno uporabi, izdelki pa se
   vedno dodajo na novo z novimi id-ji — uvoz torej nikoli nicesar ne izgubi.
   Ce izdelek s tem imenom v mapi ze obstaja, dobi pripis, da se vidi razlika. */
function uvoziDodaj(d){
  var mape={}, novihMap=0, novihIzd=0, novihKr=0, novihStik=0, prviUvozen=null;
  /* Stikala iz paketa: tisto z istim imenom je isto stikalo, zato prevzamemo
     obstoječe in samo dopolnimo možnosti, ki jih še ni.                     */
  var stikPreslikava={};
  if(!Array.isArray(S.stikala))S.stikala=[];
  (Array.isArray(d.stikala)?d.stikala:[]).forEach(function(g){
    if(!g||typeof g.ime!=="string"||!Array.isArray(g.moznosti)||g.moznosti.length<2)return;
    var obst=stikala().filter(function(x){return x.ime===g.ime;})[0];
    if(obst){
      g.moznosti.forEach(function(m){if(obst.moznosti.indexOf(m)<0)obst.moznosti.push(m);});
      stikPreslikava[g.id]=obst.id;
      return;
    }
    var nov=novoStikalo(g.ime,g.moznosti.slice());
    S.stikala.push(nov);stikPreslikava[g.id]=nov.id;novihStik++;
  });
  /* vrednosti stikal na uvozenem zapisu prevezi na id-je pri nas */
  function prevezi(z){
    if(!z.stikala||typeof z.stikala!=="object"){z.stikala={};return;}
    var novo={};
    Object.keys(z.stikala).forEach(function(gid){
      var cilj=stikPreslikava[gid]||(stikNajdi(gid)?gid:null);
      if(cilj)novo[cilj]=z.stikala[gid];
    });
    z.stikala=novo;
    if(z.vodi)z.vodi=stikPreslikava[z.vodi]||(stikNajdi(z.vodi)?z.vodi:"");
  }
  (Array.isArray(d.projekti)?d.projekti:[]).forEach(function(pr){
    var ime=String(pr&&pr.ime||"").trim()||"Uvožena mapa";
    var obst=S.projekti.filter(function(x){return x.ime===ime;})[0];
    if(obst){mape[pr.id]=obst.id;return;}
    var nov={id:uid(),ime:ime};
    S.projekti.push(nov);mape[pr.id]=nov.id;novihMap++;
  });
  d.izdelki.forEach(function(izd){
    var kopija=JSON.parse(JSON.stringify(izd));
    kopija.id=uid();
    kopija.projekt=mape[izd.projekt]||(S.projekti[0]&&S.projekti[0].id)||null;
    kopija.stDatotek=0;
    var vMapi=S.izdelki.filter(function(x){return x.projekt===kopija.projekt;});
    if(vMapi.some(function(x){return x.ime===kopija.ime;}))kopija.ime=kopija.ime+" (uvoženo)";
    prevezi(kopija);
    (Array.isArray(kopija.kreative)?kopija.kreative:[]).forEach(function(k){
      k.id=uid();k.stDatotek=0;prevezi(k);novihKr++;
    });
    S.izdelki.push(kopija);novihIzd++;
    if(!prviUvozen)prviUvozen=kopija;
  });
  migriraj();
  /* Filter stikal postavi na „vse“ — sicer bi uvožene kreative lahko takoj
     padle iz pogleda in bi izgledalo, kot da jih ni.                         */
  S.stikaloPogled={};
  /* Skoči na uvoženo mapo in njen prvi izdelek. Brez tega ostaneš v stari mapi
     in izgleda, kot da uvoz ni naredil nič.                                  */
  if(prviUvozen){
    S.aktivenProjekt=prviUvozen.projekt;
    S.aktiven=prviUvozen.id;
    view="kreative";
  }
  odprtaKreativa=null;shrani();polniIzbirnik();render();
  try{location.hash=view;}catch(err){}
  toast("Dodano: "+novihIzd+" izdelkov, "+novihKr+" kreativ"+
    (novihMap?", "+novihMap+" novih map":"")+
    (novihStik?", "+novihStik+" stikal":"")+
    (prviUvozen?". Odprl sem „"+prviUvozen.ime+"“.":". Nič obstoječega ni povoženo."));
}

/* ============ brief ============ */
function briefText(k){
  var p=P(),plat=(PLATFORME.filter(function(x){return x[0]===k.platforma;})[0]||["","?"])[1];
  var L=[];
  function seznam(naslov,arr,pripis){
    var v=(arr||[]).filter(function(s){return s&&String(s).trim();});
    if(!v.length)return;
    L.push("");L.push(naslov+" ("+v.length+(pripis?", "+pripis:"")+"):");
    v.forEach(function(s,i){L.push("  "+(i+1)+". "+String(s).replace(/\n/g,"\n     "));});
  }
  L.push("═══ "+k.naslov+" ═══");
  L.push(PR().ime+" · "+p.ime);
  L.push(plat+" · "+umIme(k)+" · "+k.format+" · "+statusIme(k.status));
  if(stikRabljena().length){
    var vodenoG=stikVodi(k);
    L.push(stikOpis(k)+(vodenoG?"  (besedila vodi „"+vodenoG.ime+"“)":""));
  }
  if(k.tagi)L.push("Oznake: "+k.tagi);
  if(k.izvajalec||k.rok)L.push("Dela: "+(k.izvajalec||"—")+(k.rok?" · rok: "+k.rok:""));
  if(k.kot){L.push("");L.push("KOT: "+k.kot);}
  if(k.publika)L.push("PUBLIKA: "+k.publika);
  var prb=PR(), cgp=prb.cgp||{};
  if(String(prb.zapiski||"").trim()){L.push("");L.push("── O MAPI ──");L.push(prb.zapiski);}
  var barveT=cgpBarveTekst(prb);
  if(barveT||cgp.pisave||cgp.pravila||cgp.povezave){
    L.push("");L.push("── CELOSTNA PODOBA ──");
    if(barveT)L.push("Barve: "+barveT);
    if(cgp.pisave)L.push("Pisave: "+cgp.pisave);
    if(cgp.pravila)L.push("Pravila: "+cgp.pravila);
    if(cgp.povezave)L.push("CGP dokument: "+cgp.povezave);
  }
  if(String(p.zapiski||"").trim()){L.push("");L.push("── O IZDELKU ──");L.push(p.zapiski);}

  var lim=LIM[k.platforma]||LIM.drugo;
  if(k.platforma==="google"){
    seznam("NASLOVI",k.naslovi,"do "+lim.naslov+" znakov");
    seznam("OPISI",k.opisi,"do "+lim.opis+" znakov");
    if(k.pot1||k.pot2)L.push("PRIKAZNA POT: /"+[k.pot1,k.pot2].filter(Boolean).join("/"));
    if(k.sitelinki)L.push("SITELINKI: "+k.sitelinki);
    if(k.kljucneBesede){L.push("");L.push("KLJUČNE BESEDE: "+k.kljucneBesede);}
  }else{
    seznam("HOOKI",k.hooki,"prva vrstica");
    seznam("PRIMARNO BESEDILO",k.primarna,"do "+lim.primarni+" znakov");
    seznam("NASLOVI",k.naslovi,"do "+lim.naslov+" znakov");
    seznam("OPISI",k.opisi,"do "+lim.opis+" znakov");
    L.push("");L.push("CTA: "+k.cta);
  }
  if(k.url)L.push("URL: "+k.url);

  /* brief po korakih — isti vrstni red kot v aplikaciji */
  if(k.refLinki||k.refOpis){
    L.push("");L.push("── REFERENCA ──");
    if(k.refLinki)L.push(k.refLinki);
    if(k.refOpis){L.push("");L.push("Kaj prevzeti in kaj drugače: "+k.refOpis);}
  }
  var mereZa=mere(k,um(k));
  if(mereZa.length){
    L.push("");L.push("── MERE ──");
    mereZa.forEach(function(x){L.push(x.k+": "+x.v);});
  }
  if(k.design){L.push("");L.push("── 1. KAJ SE VIDI IN SLIŠI ──");L.push(k.design);}
  if(k.material){L.push("");L.push("── 2. KAJ POTREBUJE ──");L.push(k.material);}
  L.push("");L.push("── 3. KDO, DO KDAJ, KAJ VRNE ──");
  L.push("Dela: "+(k.izvajalec||"—")+" · rok: "+(k.rok||"—"));
  L.push("Odda: "+(k.oddaja||"—"));
  if(k.opombe){L.push("");L.push("── 4. OPOMBE IN POPRAVKI ──");L.push(k.opombe);}
  if(k.stDatotek)L.push("MATERIAL: "+k.stDatotek+" naloženih datotek v aplikaciji");

  var ek=ekon(p),l=lijak(k.budget,k.cpm,k.ctr,k.cvr,ek);
  L.push("");L.push("── ŠTEVILKE ──");
  L.push("Budget: "+e(n(k.budget))+" / dan");
  L.push("Načrt: CPM "+e(n(k.cpm))+" · CTR "+p1(n(k.ctr))+" · CVR "+p1(n(k.cvr))+" → CPA "+e(l.cpa)+" · profit/dan "+e(l.profit));
  L.push("Break-even: CPA "+e(ek.beCPA)+" · ROAS "+x2(ek.beROAS));
  if(k.ugotovitve){L.push("");L.push("── KAJ SMO UGOTOVILI ──");L.push(k.ugotovitve);}
  return L.join("\n");
}
function kopiraj(txt,kaj){
  kaj=kaj||"Brief";
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){toast(kaj+" kopiran.");},function(){rocnoKopiraj(txt,kaj);});
  }else rocnoKopiraj(txt,kaj);
}
function rocnoKopiraj(txt,kaj){
  kaj=kaj||"Brief";
  var ta=document.createElement("textarea");
  ta.value=txt;ta.setAttribute("readonly","");
  ta.style.cssText="position:fixed;left:8px;bottom:70px;width:calc(100% - 16px);height:120px;z-index:70";
  document.body.appendChild(ta);ta.select();
  var ok=false;try{ok=document.execCommand("copy");}catch(err){}
  if(ok){document.body.removeChild(ta);toast(kaj+" kopiran.");}
  else{toast("Kopiraj ročno iz polja spodaj.");setTimeout(function(){if(ta.parentNode)ta.parentNode.removeChild(ta);},15000);}
}

/* ============ izvoz v Excel ============
   Pravi .xlsx brez knjižnic: ZIP brez stiskanja + minimalni OOXML.
   Glave so odebeljene in zamrznjene, stolpci imajo širine, besedilo se ovija. */
var Xlsx=(function(){
  var kodirnik=window.TextEncoder?new TextEncoder():null;
  function bajti(s){
    if(kodirnik)return kodirnik.encode(s);
    var a=[],i,c;
    for(i=0;i<s.length;i++){
      c=s.charCodeAt(i);
      if(c<128)a.push(c);
      else if(c<2048){a.push(192|c>>6,128|c&63);}
      else{a.push(224|c>>12,128|(c>>6)&63,128|c&63);}
    }
    return new Uint8Array(a);
  }
  var CRC=(function(){
    var t=new Uint32Array(256),i,j,c;
    for(i=0;i<256;i++){c=i;for(j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c>>>0;}
    return t;
  })();
  function crc32(b){
    var c=0xFFFFFFFF,i;
    for(i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);
    return (c^0xFFFFFFFF)>>>0;
  }
  function zip(vnosi){
    var d=new Date(),kosi=[],sredina=[],odmik=0,i,skupno=0;
    var cas=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF;
    var dat=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
    for(i=0;i<vnosi.length;i++){
      var ime=bajti(vnosi[i].ime), vs=bajti(vnosi[i].xml), c=crc32(vs);
      var lh=new Uint8Array(30+ime.length), dl=new DataView(lh.buffer);
      dl.setUint32(0,0x04034b50,true);dl.setUint16(4,20,true);dl.setUint16(6,0x0800,true);
      dl.setUint16(8,0,true);dl.setUint16(10,cas,true);dl.setUint16(12,dat,true);
      dl.setUint32(14,c,true);dl.setUint32(18,vs.length,true);dl.setUint32(22,vs.length,true);
      dl.setUint16(26,ime.length,true);dl.setUint16(28,0,true);
      lh.set(ime,30);
      kosi.push(lh,vs);
      var ch=new Uint8Array(46+ime.length), dc=new DataView(ch.buffer);
      dc.setUint32(0,0x02014b50,true);dc.setUint16(4,20,true);dc.setUint16(6,20,true);
      dc.setUint16(8,0x0800,true);dc.setUint16(10,0,true);
      dc.setUint16(12,cas,true);dc.setUint16(14,dat,true);
      dc.setUint32(16,c,true);dc.setUint32(20,vs.length,true);dc.setUint32(24,vs.length,true);
      dc.setUint16(28,ime.length,true);dc.setUint16(30,0,true);dc.setUint16(32,0,true);
      dc.setUint16(34,0,true);dc.setUint16(36,0,true);dc.setUint32(38,0,true);
      dc.setUint32(42,odmik,true);
      ch.set(ime,46);
      sredina.push(ch);
      odmik+=lh.length+vs.length;
    }
    sredina.forEach(function(x){skupno+=x.length;});
    var kon=new Uint8Array(22), dk=new DataView(kon.buffer);
    dk.setUint32(0,0x06054b50,true);dk.setUint16(4,0,true);dk.setUint16(6,0,true);
    dk.setUint16(8,vnosi.length,true);dk.setUint16(10,vnosi.length,true);
    dk.setUint32(12,skupno,true);dk.setUint32(16,odmik,true);dk.setUint16(20,0,true);
    return new Blob(kosi.concat(sredina,[kon]),{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  }
  /* XML ne prenese krmilnih znakov */
  function xesc(v){
    return String(v==null?"":v)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function stolpec(i){
    var s="";
    i=i+1;
    while(i>0){var o=(i-1)%26;s=String.fromCharCode(65+o)+s;i=(i-o-1)/26;}
    return s;
  }
  var STIL={besedilo:2,evri:3,sredina:5,stevilo:5};
  function listXml(list){
    var st=list.stolpci, h="";
    h+='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<sheetViews><sheetView workbookViewId="0">'+
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'+
      '</sheetView></sheetViews>'+
      '<sheetFormatPr defaultRowHeight="15"/>'+
      '<cols>'+st.map(function(c,i){
        return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(c.w||20)+'" customWidth="1"/>';
      }).join("")+'</cols><sheetData>';
    h+='<row r="1" ht="34" customHeight="1">'+st.map(function(c,i){
      return '<c r="'+stolpec(i)+'1" s="1" t="inlineStr"><is><t xml:space="preserve">'+xesc(c.g)+'</t></is></c>';
    }).join("")+'</row>';
    list.vrstice.forEach(function(v,ri){
      var r=ri+2;
      h+='<row r="'+r+'">'+v.map(function(val,ci){
        var ref=stolpec(ci)+r, tip=(st[ci]&&st[ci].tip)||"besedilo";
        if(val==null||val==="")return '<c r="'+ref+'" s="'+(STIL[tip]||2)+'"/>';
        if(typeof val==="number"&&isFinite(val))
          return '<c r="'+ref+'" s="'+(STIL[tip]||5)+'"><v>'+val+'</v></c>';
        return '<c r="'+ref+'" s="'+(STIL[tip]||2)+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(val)+'</t></is></c>';
      }).join("")+'</row>';
    });
    h+='</sheetData>';
    if(list.vrstice.length)
      h+='<autoFilter ref="A1:'+stolpec(st.length-1)+(list.vrstice.length+1)+'"/>';
    h+='</worksheet>';
    return h;
  }
  var STILI='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts>'+
    '<fonts count="3">'+
      '<font><sz val="10"/><name val="Calibri"/></font>'+
      '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'+
      '<font><b/><sz val="11"/><name val="Calibri"/></font>'+
    '</fonts>'+
    '<fills count="4">'+
      '<fill><patternFill patternType="none"/></fill>'+
      '<fill><patternFill patternType="gray125"/></fill>'+
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>'+
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>'+
    '</fills>'+
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+
      '<border><left style="thin"><color rgb="FFD9DDE3"/></left><right style="thin"><color rgb="FFD9DDE3"/></right>'+
      '<top style="thin"><color rgb="FFD9DDE3"/></top><bottom style="thin"><color rgb="FFD9DDE3"/></bottom><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="6">'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'+
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" horizontal="right"/></xf>'+
      '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" horizontal="center" wrapText="1"/></xf>'+
    '</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'+
    '</styleSheet>';
  function imeLista(s,i){
    s=String(s||("List"+(i+1))).replace(/[\[\]\*\?\/\\:]/g,"-");
    return s.length>31?s.slice(0,31):s;
  }
  function ustvari(listi){
    var vnosi=[],i;
    vnosi.push({ime:"[Content_Types].xml",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      listi.map(function(_,j){
        return '<Override PartName="/xl/worksheets/sheet'+(j+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      }).join("")+'</Types>'});
    vnosi.push({ime:"_rels/.rels",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
      '</Relationships>'});
    vnosi.push({ime:"xl/workbook.xml",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '+
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+
      listi.map(function(l,j){
        return '<sheet name="'+xesc(imeLista(l.ime,j))+'" sheetId="'+(j+1)+'" r:id="rId'+(j+1)+'"/>';
      }).join("")+'</sheets></workbook>'});
    vnosi.push({ime:"xl/_rels/workbook.xml.rels",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      listi.map(function(_,j){
        return '<Relationship Id="rId'+(j+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(j+1)+'.xml"/>';
      }).join("")+
      '<Relationship Id="rId'+(listi.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
      '</Relationships>'});
    vnosi.push({ime:"xl/styles.xml",xml:STILI});
    for(i=0;i<listi.length;i++)
      vnosi.push({ime:"xl/worksheets/sheet"+(i+1)+".xml",xml:listXml(listi[i])});
    return zip(vnosi);
  }
  return {ustvari:ustvari};
})();

function prenesiBlob(blob,ime){
  try{
    var u=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=u;a.download=ime;a.style.display="none";
    document.body.appendChild(a);a.click();
    setTimeout(function(){if(a.parentNode)a.parentNode.removeChild(a);URL.revokeObjectURL(u);},4000);
    return true;
  }catch(err){toast("Prenos ni uspel: "+err.message);return false;}
}

/* ---- kaj gre v preglednico ---- */
/* stolpci stikal se pojavijo samo, če si kakšno stikalo naredil */
function stikStolpci(){
  return stikRabljena().map(function(g){
    return {g:g.ime,w:Math.max(12,Math.min(24,g.ime.length+8)),v:function(o){
      var v=o.k.stikala?o.k.stikala[g.id]:null;
      return (v===STIK_VSE?"vse":(v||stikVrednost(o.k,g)))+(o.k.vodi===g.id?" ◂ vodi besedila":"");
    }};
  });
}
/* List „Oglasi“ je obrnjen: v stolpcu A so imena polj, vsak naslednji stolpec je
   en oglas. Tako se oglasi berejo drug ob drugem in dolga besedila ne silijo
   vrstice v nemogoče višine — pri pisanju in primerjanju kopij je to edina
   postavitev, ki dela.                                                       */
var XLS_VRSTICE=[
  {g:"Izdelek",v:function(o){return o.izd.ime;}},
  {g:"Kreativa",v:function(o){return platIme(o.k.platforma)+" · "+umIme(o.k)+" · "+o.k.format;}},
  {g:"Ime kreative",v:function(o){return o.k.naslov;}},
  {g:"Hook",v:function(o){return prvi(o.k.hooki);}},
  {g:"Primarno besedilo",v:function(o){return prvi(o.k.primarna);}},
  {g:"Naslov pod sliko",v:function(o){return prvi(o.k.naslovi);}},
  {g:"Opis",v:function(o){return prvi(o.k.opisi);}},
  {g:"GUMB",v:function(o){return o.k.platforma==="google"&&o.k.format==="RSA"?"—":o.k.cta;}},
  {g:"URL",v:function(o){return o.k.url;}},
  {g:"Publika in targetiranje",v:function(o){return o.k.publika;}},
  {g:"Kot / obljuba",v:function(o){return o.k.kot;}},
  {g:"Kaj se vidi in sliši",v:function(o){return o.k.design;}},
  {g:"Prikazna pot",v:function(o){return [o.k.pot1,o.k.pot2].filter(Boolean).join(" / ");}},
  {g:"Sitelinki",v:function(o){return o.k.sitelinki;}},
  {g:"Ključne besede",v:function(o){return o.k.kljucneBesede;}},
  {g:"Status",v:function(o){return statusIme(o.k.status);}},
  {g:"Kdo dela · rok",v:function(o){return [o.k.izvajalec,o.k.rok].filter(Boolean).join(" · ");}},
  {g:"Budget / dan",v:function(o){return n(o.k.budget)?e(n(o.k.budget)):"";}},
  {g:"Napoved CPA",v:function(o){
    var l=lijak(o.k.budget,o.k.cpm,o.k.ctr,o.k.cvr,ekon(o.izd));
    return isFinite(l.cpa)?e(l.cpa):"";}},
  {g:"Material (datoteke)",v:function(o){return o.k.stDatotek||0;}},
  {g:"Opombe",v:function(o){return o.k.opombe;}}
];
var XLS_POLJA=[["hooki","Hook",80],["primarna","Primarno besedilo",0],["naslovi","Naslov",0],["opisi","Opis",0]];
/* vrstice stikal se vrinejo takoj za „Kreativa“ */
function stikVrstice(){
  return stikRabljena().map(function(g){
    return {g:g.ime,v:function(o){
      var v=o.k.stikala?o.k.stikala[g.id]:null;
      return (v===STIK_VSE?"vse":(v||stikVrednost(o.k,g)))+(o.k.vodi===g.id?" ◂ ločena besedila":"");
    }};
  });
}
function xlsVrstice(){
  var out=XLS_VRSTICE.slice();
  var kam=out.map(function(c){return c.g;}).indexOf("Kreativa")+1;
  return out.slice(0,kam).concat(stikVrstice(),out.slice(kam));
}

function izvozniSeznam(obseg){
  var izd=S.izdelki.filter(function(x){
    if(obseg==="izdelek")return x.id===S.aktiven;
    if(obseg==="mapa")return x.projekt===S.aktivenProjekt;
    return true;
  });
  var out=[];
  izd.forEach(function(x){
    (x.kreative||[]).forEach(function(k){out.push({izd:x,k:k});});
  });
  return out;
}
function xlsxIzvozi(izbrani){
  if(!izbrani.length){toast("Nič ni izbrano.");return;}
  /* obrnjeno: polja po vrsticah, en oglas na stolpec */
  var polja=xlsVrstice();
  var stolpci=[{g:"Polje",w:26}].concat(izbrani.map(function(o){
    return {g:o.izd.ime,w:46};
  }));
  var vrstice=polja.map(function(f){
    return [f.g].concat(izbrani.map(function(o,i){
      var v=f.v(o,i);
      return v==null?"":v;
    }));
  });
  var razl=[];
  izbrani.forEach(function(o){
    XLS_POLJA.forEach(function(pf){
      var lim=(LIM[o.k.platforma]||LIM.drugo);
      var meja=pf[2]||({hooki:80,primarna:lim.primarni,naslovi:lim.naslov,opisi:lim.opis}[pf[0]]);
      (o.k[pf[0]]||[]).forEach(function(t,i){
        t=String(t||"").trim();
        if(!t)return;
        razl.push([o.izd.ime,o.k.naslov,pf[1],i+1,t,t.length,meja,t.length>meja?"DA":""]);
      });
    });
  });
  var poPlat={};
  izbrani.forEach(function(o){
    var kljuc=platIme(o.k.platforma);
    if(!poPlat[kljuc])poPlat[kljuc]={st:0,bud:0};
    poPlat[kljuc].st++;
    if(jeVZraku(o.k))poPlat[kljuc].bud+=n(o.k.budget);
  });
  var povz=Object.keys(poPlat).map(function(kljuc){
    return [kljuc,poPlat[kljuc].st,poPlat[kljuc].bud||"",poPlat[kljuc].bud?poPlat[kljuc].bud*30:""];
  });
  var skupaj=povz.reduce(function(a,r){return a+(typeof r[2]==="number"?r[2]:0);},0);
  povz.push(["Skupaj",izbrani.length,skupaj||"",skupaj?skupaj*30:""]);

  var listi=[
    {ime:"Oglasi",stolpci:stolpci,vrstice:vrstice},
    {ime:"Različice besedil",stolpci:[
      {g:"Izdelek",w:24},{g:"Kreativa",w:30},{g:"Polje",w:20},{g:"Št.",w:6,tip:"sredina"},
      {g:"Besedilo",w:70},{g:"Znakov",w:9,tip:"sredina"},{g:"Meja",w:9,tip:"sredina"},{g:"Nad mejo",w:10,tip:"sredina"}
    ],vrstice:razl},
    {ime:"Povzetek",stolpci:[
      {g:"Platforma",w:20},{g:"Št. oglasov",w:13,tip:"sredina"},
      {g:"Budget / dan (aktivni)",w:20,tip:"evri"},{g:"Budget / mesec",w:18,tip:"evri"}
    ],vrstice:povz}
  ];
  var d=new Date();
  var datum=d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
  var ime="Oglasi — "+PR().ime+" — "+datum+".xlsx";
  if(prenesiBlob(Xlsx.ustvari(listi),ime))
    toast(izbrani.length+" oglasov izvoženih v Excel.");
}

/* ---- okno za izbiro oglasov ---- */
var izvOznake={}, izvObseg="mapa";
function izvozOkno(){
  var w=el("mdl");
  if(!w){
    w=document.createElement("div");
    w.id="mdl";w.className="mdl";w.hidden=true;
    document.body.appendChild(w);
  }
  return w;
}
function odpriIzvoz(){
  var w=izvozOkno();
  izvOznake={};
  izvozniSeznam(izvObseg).forEach(function(o){
    izvOznake[o.k.id]=o.k.status!=="ubita";
  });
  w.hidden=false;
  document.body.classList.add("mdl-on");
  risiIzvoz();
}
function zapriIzvoz(){
  var w=el("mdl");if(w)w.hidden=true;
  document.body.classList.remove("mdl-on");
}
function risiIzvoz(){
  var w=el("mdl");if(!w||w.hidden)return;
  var seznam=izvozniSeznam(izvObseg);
  var poIzdelku={};
  seznam.forEach(function(o){
    if(!poIzdelku[o.izd.id])poIzdelku[o.izd.id]={ime:o.izd.ime,vrste:[]};
    poIzdelku[o.izd.id].vrste.push(o);
  });
  var stIzbranih=seznam.filter(function(o){return izvOznake[o.k.id];}).length;
  var telo=Object.keys(poIzdelku).map(function(id){
    var g=poIzdelku[id];
    return '<div class="mdl-g"><span class="mdl-gt">'+esc(g.ime)+'</span>'+
      g.vrste.map(function(o){
        return '<label class="mdl-i">'+
          '<input type="checkbox" data-izv="'+o.k.id+'"'+(izvOznake[o.k.id]?" checked":"")+'>'+
          '<span class="mdl-in"><b>'+esc(o.k.naslov)+'</b>'+
            '<em>'+esc(platIme(o.k.platforma)+" · "+umIme(o.k)+" · "+o.k.format+" · "+statusIme(o.k.status))+'</em></span>'+
        '</label>';
      }).join("")+'</div>';
  }).join("")||'<p class="note">V tem obsegu ni nobene kreative.</p>';

  el("mdl").innerHTML=
    '<div class="mdl-veil" data-mdlx="1"></div>'+
    '<div class="mdl-w" role="dialog" aria-modal="true" aria-label="Izvoz v Excel">'+
      '<div class="mdl-h"><b>Izvoz v Excel</b>'+
        '<span class="sp"></span>'+
        '<button class="mdl-x" data-mdlx="1" aria-label="Zapri">✕</button></div>'+
      '<div class="mdl-b">'+
        '<p class="note">Nastane datoteka .xlsx s tremi listi: <b>Oglasi</b> (en oglas na vrstico — kreativa, besedilo na kreativi, besedilo ob njej, gumb, URL), '+
        '<b>Različice besedil</b> (vse napisane različice s številom znakov) in <b>Povzetek</b> (koliko oglasov in budgeta na platformo). '+
        'Primerno za pošiljanje stranki v potrditev.</p>'+
        '<div class="mdl-r">'+
          '<label class="sw"><span>Obseg</span><select id="izv-obseg">'+
            '<option value="izdelek"'+(izvObseg==="izdelek"?" selected":"")+'>Samo trenutni izdelek</option>'+
            '<option value="mapa"'+(izvObseg==="mapa"?" selected":"")+'>Cela mapa („'+esc(PR().ime)+'“)</option>'+
            '<option value="vse"'+(izvObseg==="vse"?" selected":"")+'>Vse mape</option>'+
          '</select></label>'+
          '<span class="sp"></span>'+
          '<button class="btn btn-s btn-soft" id="izv-vse">Izberi vse</button>'+
          '<button class="btn btn-s btn-soft" id="izv-nic">Počisti</button>'+
        '</div>'+
        '<div class="mdl-l">'+telo+'</div>'+
      '</div>'+
      '<div class="mdl-f">'+
        '<span class="note">Izbranih: <b>'+stIzbranih+'</b> od '+seznam.length+'</span>'+
        '<span class="sp"></span>'+
        '<button class="btn" data-mdlx="1">Prekliči</button>'+
        '<button class="btn btn-p" id="izv-go"'+(stIzbranih?"":" disabled")+'>Izvozi v Excel</button>'+
      '</div>'+
    '</div>';
}

function osveziIzvozStevec(){
  var seznam=izvozniSeznam(izvObseg);
  var st=seznam.filter(function(o){return izvOznake[o.k.id];}).length;
  var f=q("#mdl .mdl-f b");
  if(f)f.textContent=st;
  var g=el("izv-go");
  if(g)g.disabled=!st;
}

/* ============ render / navigacija ============ */
/* Zavihkov Ekonomika in Vodnik ni več: izdelek je v Pregledu, izračuni v
   Kalkulatorju, vodnik pa na dnu Podatkov. Stare povezave preusmerimo.     */
var RENDER={projekti:renderProjekti,pregled:renderPregled,kreative:renderKreative,
  kalkulator:renderKalk,podatki:renderPodatki};
var STARI_VIEW={ekonomika:"pregled",vodnik:"podatki"};
function pravView(v){return STARI_VIEW[v]||(RENDER[v]?v:"projekti");}
function render(){
  view=pravView(view);
  qa(".view").forEach(function(s){s.hidden=true;});
  qa(".tab").forEach(function(t){t.setAttribute("aria-selected",t.dataset.v===view?"true":"false");});
  el("v-"+view).hidden=false;
  RENDER[view]();
}
function paint(){
  if(view==="kreative"&&odprtaKreativa&&K())paintKreativa();
  else if(view==="kalkulator"){paintKalk();if(P()&&imaEkon(P()))paintEkon();}
  else if(view==="pregled")paintPregled();
}
var IMENA={projekti:"Projekti",pregled:"Pregled",kreative:"Kreative",
  kalkulator:"Kalkulator",podatki:"Podatki in vodnik"};
function nastaviView(v){
  view=pravView(v);if(view!=="kreative")odprtaKreativa=null;
  render();window.scrollTo(0,0);
  var mt=el("mobTitle");if(mt)mt.textContent=IMENA[view]||"Oglasni list";
  zapriMeni();
  try{location.hash=view;}catch(err){}
}
/* stranski meni na telefonu */
function odpriMeni(){document.body.classList.add("menu");el("sideVeil").hidden=false;}
function zapriMeni(){document.body.classList.remove("menu");el("sideVeil").hidden=true;}
function polniIzbirnik(){
  el("prsel").innerHTML=S.projekti.map(function(x){return '<option value="'+x.id+'"'+(x.id===S.aktivenProjekt?" selected":"")+'>'+esc(x.ime)+'</option>';}).join("");
  var izd=izdelkiVProjektu();
  el("psel").innerHTML=izd.length
    ? izd.map(function(p){return '<option value="'+p.id+'"'+(p.id===S.aktiven?" selected":"")+'>'+esc(p.ime)+'</option>';}).join("")
    : '<option value="">— brez izdelkov —</option>';
}
function dodajIzdelek(pid){
  var projekt=pid||S.aktivenProjekt;
  var p=novIzdelek("Izdelek "+(izdelkiVProjektu(projekt).length+1),projekt);
  S.izdelki.push(p);S.aktivenProjekt=projekt;S.aktiven=p.id;odprtaKreativa=null;
  shrani();polniIzbirnik();nastaviView("pregled");toast("Izdelek dodan.");
}
function dodajProjekt(){
  var ime=prompt("Ime nove mape / projekta:","Projekt "+(S.projekti.length+1));
  if(ime==null)return;
  ime=String(ime).trim();if(!ime)return;
  var pr=novProjekt(ime);
  S.projekti.push(pr);S.aktivenProjekt=pr.id;S.aktiven=null;odprtaKreativa=null;
  shrani();polniIzbirnik();render();toast("Mapa dodana.");
}

/* ============ tema ============ */
function trenutnaTema(){
  var a=document.documentElement.getAttribute("data-theme");
  if(a)return a;
  return window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
}
el("tema").addEventListener("click",function(){
  var nova=trenutnaTema()==="dark"?"light":"dark";
  document.documentElement.setAttribute("data-theme",nova);
  try{localStorage.setItem(LS_TEMA,nova);}catch(err){}
});

/* ============ dogodki ============ */
el("rail").addEventListener("click",function(ev){
  var t=ev.target.closest(".tab");if(!t)return;nastaviView(t.dataset.v);
});
el("sideOpen").addEventListener("click",odpriMeni);
el("sideClose").addEventListener("click",zapriMeni);
el("sideVeil").addEventListener("click",zapriMeni);
el("prsel").addEventListener("change",function(){
  S.aktivenProjekt=this.value;S.aktiven=null;odprtaKreativa=null;
  shrani();polniIzbirnik();render();
});
el("psel").addEventListener("change",function(){
  if(!this.value)return;
  S.aktiven=this.value;odprtaKreativa=null;shrani();render();
});
el("pnew").addEventListener("click",function(){dodajIzdelek();});

document.addEventListener("input",function(ev){
  var t=ev.target;
  if(t.dataset.p!=null){
    var p=P();if(!p)return;
    set(p,t.dataset.p,t.type==="checkbox"?t.checked:t.value);
    if(t.dataset.p==="ime")polniIzbirnik();
    shrani();paint();
  }else if(t.dataset.c!=null){
    var k=K();if(!k)return;
    set(k,t.dataset.c,t.value);
    if(t.dataset.limit){
      var c=q('[data-cnt="'+t.dataset.c+'"]');
      if(c){var L=t.value.length,lim=parseInt(t.dataset.limit,10);
        c.textContent=L+" / "+lim;c.classList.toggle("over",L>lim);}
    }
    shrani();paintKreativa();risiPredogled();
  }else if(t.dataset.k!=null){
    S.kalk[t.dataset.k]=t.value;shrani();paintKalk();
  }else if(t.id==="bank-isk"){
    /* iskanje po banki — samo seznam prerišemo, polja ne izgubijo fokusa */
    bankaIskanje=t.value;
    var box=q(".bank-s"),pos=t.selectionStart;
    if(box){
      var isk=bankaIskanje.toLowerCase();
      qa(".bank-i",box).forEach(function(el2){
        var b=q("[data-hook]",el2);
        el2.style.display=(!isk||b.textContent.toLowerCase().indexOf(isk)>=0)?"":"none";
      });
    }
    t.selectionStart=t.selectionEnd=pos;
  }else if(t.dataset.cgpbarva!=null){
    var prb2=S.projekti.filter(function(x){return x.id===t.dataset.pr;})[0];
    if(prb2){
      var pal=cgpPaleta(prb2), i3=parseInt(t.dataset.i,10);
      if(pal[i3]){
        pal[i3][t.dataset.cgpbarva]=t.value;
        shrani();
        /* ščipalka in polje s kodo kažeta isto barvo, zato ju uskladimo */
        if(t.dataset.cgpbarva==="hex"){
          var vrsta=t.closest(".pal-v");
          qa("[data-cgpbarva='hex']",vrsta).forEach(function(o){
            if(o!==t&&/^#[0-9a-fA-F]{6}$/.test(t.value))o.value=t.value;
          });
        }
      }
    }
  }else if(t.dataset.cgp!=null){
    var prc=S.projekti.filter(function(x){return x.id===t.dataset.pr;})[0];
    if(prc){
      if(!prc.cgp||typeof prc.cgp!=="object")prc.cgp={};
      prc.cgp[t.dataset.cgp]=t.value;
      shrani();
    }
  }else if(t.dataset.przap!=null){
    var pr0=S.projekti.filter(function(x){return x.id===t.dataset.przap;})[0];
    if(pr0){pr0.zapiski=t.value;shrani();}
  }else if(t.dataset.sgime!=null){
    var g1=stikNajdi(t.dataset.sgime);
    if(g1){g1.ime=t.value;shrani();}
  }else if(t.dataset.sgmoz!=null){
    /* Preimenovanje ene možnosti: vrednost prenesemo povsod, kjer je bila.
       Prazno ime ne sprejmemo — brisanje ima svoj gumb.                     */
    var g2=stikNajdi(t.dataset.sgmoz);
    if(!g2)return;
    var idx=parseInt(t.dataset.i,10);
    var nova=String(t.value).trim();
    var stara=g2.moznosti[idx];
    if(!nova||nova===stara)return;
    if(g2.moznosti.indexOf(nova)>=0&&g2.moznosti.indexOf(nova)!==idx)return;   /* podvojeno ime */
    g2.moznosti[idx]=nova;
    stikPreimenujMoznost(g2,stara,nova);
    t.style.width=Math.max(8,Math.min(24,nova.length+3))+"ch";
    shrani();
  }
});
document.addEventListener("change",function(ev){
  var t=ev.target;
  /* izbira oglasov za izvoz */
  if(t.dataset.izv!=null){
    izvOznake[t.dataset.izv]=t.checked;
    osveziIzvozStevec();return;
  }
  if(t.id==="bank-red"){bankaRed=t.value;renderEditor();return;}
  if(t.id==="izv-obseg"){
    izvObseg=t.value;
    izvozniSeznam(izvObseg).forEach(function(o){
      if(izvOznake[o.k.id]==null)izvOznake[o.k.id]=o.k.status!=="ubita";
    });
    risiIzvoz();return;
  }
  /* radio pri različici → katera gre v predogled */
  if(t.dataset.pv!=null){
    nastaviIzbor(t.dataset.pv,parseInt(t.dataset.i,10)||0);
    risiPredogled();return;
  }
  if(t.id==="impFile"||t.id==="impFileAdd"){
    var f=t.files&&t.files[0];if(!f)return;
    var nacinUvoza=t.id==="impFileAdd"?"dodaj":"zamenjaj";
    var r=new FileReader();
    r.onload=function(){uvozi(String(r.result),nacinUvoza);};
    r.onerror=function(){toast("Datoteke ni bilo mogoče prebrati.");};
    r.readAsText(f);t.value="";return;
  }
  if(t.id==="dfile"){dodajDatoteke(t.files);t.value="";return;}
  if(t.id==="dfile-izd"){
    var pi=P();
    if(pi)dodajDatoteke(t.files,datLastnikIzdelka(pi));
    t.value="";return;
  }
  if(t.dataset.filecgp!=null){
    dodajDatoteke(t.files,"cgp:"+t.dataset.filecgp);
    t.value="";return;
  }
  if(t.id==="dfile-ref"){
    var kr0=K();
    if(kr0)dodajDatoteke(t.files,datLastnikRef(kr0));
    t.value="";return;
  }
  if(t.dataset.move!=null){
    var cilj=t.value;if(!cilj)return;
    var izd=S.izdelki.filter(function(x){return x.id===t.dataset.move;})[0];
    if(!izd)return;
    izd.projekt=cilj;
    if(S.aktiven===izd.id)S.aktiven=null;
    shrani();polniIzbirnik();render();toast("Premaknjeno v „"+(S.projekti.filter(function(x){return x.id===cilj;})[0]||{}).ime+"“.");
    return;
  }
  /* stikalo v uporabi ali umaknjeno s strani */
  if(t.dataset.sgakt!=null){
    var gk=stikNajdi(t.dataset.sgakt);
    if(!gk)return;
    gk.aktivno=t.checked;
    shrani();render();
    toast(t.checked?"Stikalo „"+gk.ime+"“ je v uporabi.":"Stikalo „"+gk.ime+"“ umaknjeno s strani. Vrednosti ostanejo.");
    return;
  }
  /* „ločena besedila“ pri stikalu: eno stikalo hkrati lahko vodi besedila */
  if(t.dataset.loci!=null){
    var kv=K();if(!kv)return;
    var g0=stikNajdi(t.dataset.loci);
    if(t.checked&&g0){
      stikVklopiVodenje(kv,g0.id);
      shrani();renderEditor();
      toast("Besedila so zdaj ločena po „"+g0.ime+"“. Vsaka možnost je začela s kopijo trenutnega besedila.");
    }else{
      kv.vodi="";
      shrani();renderEditor();
      toast("Besedilo je zdaj skupno. Že napisane različice ostanejo shranjene.");
    }
    return;
  }
  if(t.dataset.p!=null&&(t.tagName==="SELECT"||t.type==="checkbox")){
    var p2=P();if(!p2)return;
    var staraMapa=p2.projekt;
    set(p2,t.dataset.p,t.type==="checkbox"?t.checked:t.value);
    if(t.dataset.p==="projekt"&&p2.projekt!==staraMapa){
      S.aktivenProjekt=p2.projekt;S.aktiven=p2.id;
      shrani();polniIzbirnik();render();toast("Izdelek premaknjen v drugo mapo.");return;
    }
    /* vklop izračunov spremeni celoten pogled, ne samo številk */
    if(t.dataset.p==="izracuni"){
      shrani();render();
      toast(p2.izracuni?"Izračuni vklopljeni.":"Izračuni izklopljeni.");
      return;
    }
    shrani();paint();
  }else if(t.dataset.c!=null&&t.tagName==="SELECT"){
    var k2=K();if(!k2)return;
    set(k2,t.dataset.c,t.value);
    /* platforma potegne za sabo format, umestitev in seznam gumbov */
    if(t.dataset.c==="platforma"){
      if(formatiZa(k2.platforma).indexOf(k2.format)<0)k2.format=formatiZa(k2.platforma)[0];
      k2.umestitev=privzetaUmestitev(k2.platforma,k2.format);
      if(ctaSeznam(k2.platforma).indexOf(k2.cta)<0)k2.cta=privzetiCTA(k2.platforma);
    }
    if(t.dataset.c==="format"&&!umOK(k2.format,k2.umestitev))
      k2.umestitev=privzetaUmestitev(k2.platforma,k2.format);
    shrani();
    /* platforma, format in umestitev spremenijo polja, ne samo predogled */
    if(/^(platforma|format|umestitev)$/.test(t.dataset.c))renderEditor();
    else{paintKreativa();risiPredogled();}
  }
});

document.addEventListener("click",function(ev){
  var t=ev.target;

  var open=t.closest("[data-open]");
  if(open){odprtaKreativa=open.dataset.open;view="kreative";render();window.scrollTo(0,0);return;}

  var openk=t.closest("[data-openk]");
  if(openk){
    var najd=najdiKreativo(openk.dataset.openk);
    if(najd){S.aktivenProjekt=najd.izdelek.projekt;S.aktiven=najd.izdelek.id;odprtaKreativa=najd.kreativa.id;
      polniIzbirnik();nastaviView("kreative");}
    return;
  }
  /* gumbi stikal: p = izdelek, k = kreativa, v = pogled nad seznamom */
  var stikG=t.closest("[data-stik]");
  if(stikG){
    var g=stikNajdi(stikG.dataset.sg), nv=stikG.dataset.sv;
    if(!g)return;
    if(stikG.dataset.stik==="v"){
      stikNastaviPogled(g.id,nv);shrani();render();return;
    }
    if(stikG.dataset.stik==="p"){
      var pp=P();if(!pp)return;
      if(!pp.stikala||typeof pp.stikala!=="object")pp.stikala={};
      pp.stikala[g.id]=nv;shrani();render();return;
    }
    var kk=K();if(!kk)return;
    var jeVodeno=stikVodi(kk)&&kk.vodi===g.id;
    stikPreklopi(kk,g,nv);
    shrani();renderEditor();
    if(jeVodeno)toast(nv===STIK_VSE?"Besedilo velja za vse možnosti.":"Besedila za „"+nv+"“.");
    return;
  }
  /* dodajanje in brisanje posamezne možnosti */
  var sgmadd=t.closest("[data-sgmadd]");
  if(sgmadd){
    var ga=stikNajdi(sgmadd.dataset.sgmadd);
    if(!ga)return;
    var ime="Nova "+(ga.moznosti.length+1);
    while(ga.moznosti.indexOf(ime)>=0)ime+="*";
    ga.moznosti.push(ime);
    shrani();render();
    var vsi=qa('[data-sgmoz="'+ga.id+'"]');
    var zadnji=vsi[vsi.length-1];
    if(zadnji){zadnji.focus();zadnji.select();}
    return;
  }
  var sgmdel=t.closest("[data-sgmdel]");
  if(sgmdel){
    var gd=stikNajdi(sgmdel.dataset.sgmdel);
    if(!gd||gd.moznosti.length<=2){toast("Stikalo rabi vsaj dve možnosti.");return;}
    var i2=parseInt(sgmdel.dataset.i,10);
    var odstranjena=gd.moznosti[i2];
    if(!confirm("Odstranim možnost „"+odstranjena+"“?\n\nKreative in izdelki, ki so bili na njej, padejo na „"+gd.moznosti[i2===0?1:0]+"“."))return;
    gd.moznosti.splice(i2,1);
    stikPreimenujMoznost(gd,odstranjena,gd.moznosti[0]);
    migriraj();shrani();render();return;
  }
  if(t.id==="sgnew"){dodajStikalo("Novo stikalo",["Prva","Druga"]);return;}
  if(t.id==="sgtrg"){dodajStikalo("Trg",["Slovenija","Hrvaška","Slovaška"]);return;}
  var sgdel=t.closest("[data-sgdel]");
  if(sgdel){brisiStikalo(sgdel.dataset.sgdel);return;}

  var add=t.closest("[data-add]");
  if(add){
    var p3=P();if(!p3)return;
    var nk=novaKreativa(add.dataset.add);
    if(p3.url)nk.url=p3.url;
    stikPodeduj(nk,p3);
    p3.kreative.push(nk);odprtaKreativa=nk.id;
    shrani();view="kreative";render();window.scrollTo(0,0);return;
  }
  var addk=t.closest("[data-addk]");
  if(addk){
    var izd2=S.izdelki.filter(function(x){return x.id===addk.dataset.addk;})[0];
    if(!izd2)return;
    var nk2=novaKreativa("facebook");stikPodeduj(nk2,izd2);izd2.kreative.push(nk2);
    S.aktivenProjekt=izd2.projekt;S.aktiven=izd2.id;odprtaKreativa=nk2.id;
    shrani();polniIzbirnik();nastaviView("kreative");return;
  }
  var addi=t.closest("[data-addi]");
  if(addi){dodajIzdelek(addi.dataset.addi);return;}

  /* okno za izvoz v Excel */
  if(t.closest("[data-mdlx]")){zapriIzvoz();return;}
  if(t.id==="izv-vse"||t.id==="izv-nic"){
    var vklop=t.id==="izv-vse";
    izvozniSeznam(izvObseg).forEach(function(o){izvOznake[o.k.id]=vklop;});
    risiIzvoz();return;
  }
  if(t.id==="izv-go"){
    var izb=izvozniSeznam(izvObseg).filter(function(o){return izvOznake[o.k.id];});
    xlsxIzvozi(izb);zapriIzvoz();return;
  }
  if(t.id==="xlsx"||t.closest("#xlsx")){odpriIzvoz();return;}

  /* preklop umestitve nad predogledom */
  var upick=t.closest("[data-um]");
  if(upick){
    if(upick.disabled)return;
    var ku=K();if(!ku)return;
    ku.umestitev=upick.dataset.um;shrani();renderEditor();return;
  }

  /* banka hookov → nova različica */
  var hook=t.closest("[data-hook]");
  if(hook){
    var kh=K();if(!kh)return;
    var izBanke=bankaSeznam().filter(function(h){return h.id===hook.dataset.hook;})[0];
    if(!izBanke)return;
    var txt=izBanke.txt;
    if(!Array.isArray(kh.hooki))kh.hooki=[""];
    if(kh.hooki.length===1&&!String(kh.hooki[0]).trim())kh.hooki[0]=txt;
    else kh.hooki.push(txt);
    nastaviIzbor("hooki",kh.hooki.length-1);
    shrani();renderEditor();toast("Hook dodan kot nova različica.");return;
  }
  /* dodajanje in brisanje v banki, izbira kategorije */
  if(t.id==="bank-go"){
    var polje=el("bank-nov");
    if(!polje||!String(polje.value).trim()){toast("Najprej vpiši hook.");return;}
    bankaDodaj(polje.value,el("bank-kat")&&el("bank-kat").value);
    polje.value="";renderEditor();toast("Shranjeno v banko.");return;
  }
  var retry=t.closest("[data-retry]");
  if(retry){
    delete prenosSpodletel[retry.dataset.retry];
    narisiDatoteke();
    return;
  }
  var bdel=t.closest("[data-bdel]");
  if(bdel){
    S.banka=bankaSeznam().filter(function(h){return h.id!==bdel.dataset.bdel;});
    shrani();renderEditor();return;
  }
  var bkat=t.closest("[data-bkat]");
  if(bkat){bankaKat=bkat.dataset.bkat;renderEditor();return;}
  if(t.closest("#bank-open")){
    bankaOdprta=!bankaOdprta;renderEditor();
    if(bankaOdprta){var bn=el("bank-nov");if(bn)bn.focus();}
    return;
  }
  /* + dodaj različico */
  var vgor=t.closest("[data-vgor]"), vdol=t.closest("[data-vdol]");
  if(vgor||vdol){
    var d2=(vgor||vdol).dataset[vgor?"vgor":"vdol"].split(".");
    var i4=parseInt(d2[1],10);
    if(premakniVarianto(d2[0],i4,i4+(vgor?-1:1)))renderEditor();
    return;
  }
  var vadd=t.closest("[data-vadd]");
  if(vadd){
    var kv=K();if(!kv)return;
    var polje=vadd.dataset.vadd;
    if(!Array.isArray(kv[polje]))kv[polje]=[""];
    if(kv[polje].length>=25){toast("Dovolj različic — 25 je zgornja meja.");return;}
    kv[polje].push("");
    nastaviIzbor(polje,kv[polje].length-1);
    shrani();renderEditor();
    var vsi=qa('[data-c="'+polje+'.'+(kv[polje].length-1)+'"]');
    if(vsi[0])vsi[0].focus();
    return;
  }
  /* ✕ odstrani različico */
  var vdel=t.closest("[data-vdel]");
  if(vdel){
    var kd2=K();if(!kd2)return;
    var deli=vdel.dataset.vdel.split("."), pol=deli[0], idx=parseInt(deli[1],10);
    if(!Array.isArray(kd2[pol])||kd2[pol].length<=1)return;
    var vsebina=String(kd2[pol][idx]||"").trim();
    if(vsebina&&!confirm("Odstranim to različico?"))return;
    kd2[pol].splice(idx,1);
    if(izbrane(kd2)[pol]>=kd2[pol].length)izbrane(kd2)[pol]=0;
    shrani();renderEditor();return;
  }
  var pick=t.closest("[data-pick]");
  if(pick){
    var izd3=S.izdelki.filter(function(x){return x.id===pick.dataset.pick;})[0];
    if(!izd3)return;
    S.aktivenProjekt=izd3.projekt;S.aktiven=izd3.id;odprtaKreativa=null;
    /* klik na izdelek pelje naravnost na kreative — tam se dela */
    shrani();polniIzbirnik();nastaviView("kreative");return;
  }
  var prpick=t.closest("[data-prpick]");
  if(prpick){
    S.aktivenProjekt=prpick.dataset.prpick;S.aktiven=null;odprtaKreativa=null;
    shrani();polniIzbirnik();render();toast("Mapa izbrana.");return;
  }
  var prename=t.closest("[data-prename]");
  if(prename){
    var izd4=S.izdelki.filter(function(x){return x.id===prename.dataset.prename;})[0];
    if(!izd4)return;
    var no=prompt("Novo ime izdelka:",izd4.ime);
    if(no==null)return;no=String(no).trim();if(!no)return;
    izd4.ime=no;shrani();polniIzbirnik();render();return;
  }
  var prrename=t.closest("[data-prrename]");
  if(prrename){
    var pr2=S.projekti.filter(function(x){return x.id===prrename.dataset.prrename;})[0];
    if(!pr2)return;
    var no2=prompt("Novo ime mape:",pr2.ime);
    if(no2==null)return;no2=String(no2).trim();if(!no2)return;
    pr2.ime=no2;shrani();polniIzbirnik();render();return;
  }
  var pdel=t.closest("[data-pdel]");
  if(pdel){
    var id=pdel.dataset.pdel, izd5=S.izdelki.filter(function(x){return x.id===id;})[0];
    if(!izd5)return;
    if(!confirm('Izbrišem izdelek "'+izd5.ime+'" z vsemi kreativami in naloženimi datotekami?'))return;
    brisiDatotekeIzdelka(izd5);
    sledBrisanja(id);
    S.izdelki=S.izdelki.filter(function(x){return x.id!==id;});
    if(S.aktiven===id)S.aktiven=null;
    odprtaKreativa=null;shrani();polniIzbirnik();render();toast("Izdelek izbrisan.");return;
  }
  var prdel=t.closest("[data-prdel]");
  if(prdel){
    var pid=prdel.dataset.prdel;
    var pr3=S.projekti.filter(function(x){return x.id===pid;})[0];if(!pr3)return;
    var vsebina=izdelkiVProjektu(pid);
    if(!confirm('Izbrišem mapo "'+pr3.ime+'"'+(vsebina.length?' skupaj z '+vsebina.length+' izdelki, njihovimi kreativami in datotekami':'')+'?'))return;
    vsebina.forEach(function(x){brisiDatotekeKreativ(x.kreative);});
    S.izdelki.filter(function(x){return x.projekt===pid;}).forEach(function(x){
      sledBrisanja(x.id);
      (x.kreative||[]).forEach(function(k){sledBrisanja(k.id);});
    });
    sledBrisanja(pid);
    S.izdelki=S.izdelki.filter(function(x){return x.projekt!==pid;});
    S.projekti=S.projekti.filter(function(x){return x.id!==pid;});
    if(!S.projekti.length)S.projekti=[novProjekt("Moj projekt")];
    if(S.aktivenProjekt===pid){S.aktivenProjekt=S.projekti[0].id;S.aktiven=null;}
    odprtaKreativa=null;shrani();polniIzbirnik();render();toast("Mapa izbrisana.");return;
  }
  var zoom=t.closest("[data-zoom]");
  if(zoom){pokaziPovecano(zoom.dataset.zoom);return;}
  if(t.id==="lb-x"||t.id==="lb"){zapriPovecano();return;}
  var dl=t.closest("[data-dl]");
  if(dl){prenesiDatoteko(dl.dataset.dl);return;}
  var ddel=t.closest("[data-ddel]");
  if(ddel){
    if(!confirm("Izbrišem to datoteko?"))return;
    Datoteke.brisi(ddel.dataset.ddel).then(function(){narisiDatoteke();toast("Datoteka izbrisana.");},
      function(){toast("Brisanje ni uspelo.");});
    return;
  }
  var goto_=t.closest("[data-goto]");
  if(goto_){nastaviView(goto_.dataset.goto);return;}
  if(t.closest("#drop")){el("dfile").click();return;}
  if(t.closest("#drop-izd")){el("dfile-izd").click();return;}
  if(t.closest("#sideOblak")){
    nastaviView("podatki");
    /* če si prijavljen, klik naredi tudi to, kar od njega pričakuješ */
    if(Oblak.prijavljen())Oblak.sinhroniziraj();
    else setTimeout(function(){var m=el("ob-mail");if(m)m.focus();},60);
    return;
  }
  if(t.closest("#drop-ref")){el("dfile-ref").click();return;}
  var badd=t.closest("[data-cgpbadd]");
  if(badd){
    var pra=S.projekti.filter(function(x){return x.id===badd.dataset.cgpbadd;})[0];
    if(pra){cgpPaleta(pra).push({hex:"#1F35C4",ime:""});shrani();render();}
    return;
  }
  var bdel2=t.closest("[data-cgpbdel]");
  if(bdel2){
    var prd=S.projekti.filter(function(x){return x.id===bdel2.dataset.cgpbdel;})[0];
    if(prd){cgpPaleta(prd).splice(parseInt(bdel2.dataset.i,10),1);shrani();render();}
    return;
  }
  var dcgp=t.closest("[data-dropcgp]");
  if(dcgp){var vhod=el("dfile-cgp-"+dcgp.dataset.dropcgp);if(vhod)vhod.click();return;}

  switch(t.id){
    case "back": odprtaKreativa=null;pocistiUrlje();render();window.scrollTo(0,0);break;
    case "copy": case "copybrief": kopiraj(briefText(K()));break;
    case "prevzemiBudget": {
      var pp=P();if(!pp)break;
      var vs=budgetAktivnih(pp);
      if(vs<=0){toast("Nobena kreativa ni aktivna — najprej ji nastavi budget in status.");break;}
      pp.dnevniBudget=nfE.format(vs);
      shrani();renderPregled();toast("Budget prevzet: "+e(vs)+" na dan.");break;
    }
    case "kalkPrevzemi": {
      var pk=P();if(!pk)break;
      var ekk=ekon(pk);
      if(ekk.bruto<=0){toast("Izdelek še nima cene.");break;}
      S.kalk.cena=nfE.format(ekk.bruto);
      S.kalk.marza=nfE.format(ekk.marzaEf);
      if(!n(S.kalk.budget)&&n(pk.dnevniBudget))S.kalk.budget=nfE.format(n(pk.dnevniBudget));
      shrani();renderKalk();toast("Prevzeto iz „"+pk.ime+"“.");break;
    }
    case "dup": {
      var o=K();if(!o)break;
      var c3=JSON.parse(JSON.stringify(o));
      c3.id=uid();c3.naslov=o.naslov+" (kopija)";c3.status="ideja";c3.stDatotek=0;
      c3.rSpend="";c3.rImpr="";c3.rClicks="";c3.rOrders="";
      P().kreative.push(c3);odprtaKreativa=c3.id;shrani();render();toast("Podvojeno (brez datotek).");break;
    }
    case "delk": {
      var kd=K();if(!kd)break;
      if(!confirm('Izbrišem kreativo "'+kd.naslov+'" in njene datoteke?'))break;
      Datoteke.brisiZaKreativo(kd.id).catch(function(){});
      sledBrisanja(kd.id);
      P().kreative=P().kreative.filter(function(x){return x.id!==kd.id;});
      odprtaKreativa=null;pocistiUrlje();shrani();render();toast("Izbrisano.");break;
    }
    case "exp": izvozi();break;
    case "impBtn": el("impFile").click();break;
    case "impAdd": el("impFileAdd").click();break;
    case "impUrl": naloziPripravljeno();break;
    case "impPaste": uvozi(el("paste").value,"zamenjaj");break;
    case "impPasteAdd": uvozi(el("paste").value,"dodaj");break;
    case "prn": window.print();break;
    case "prnew": dodajProjekt();break;
    case "pnew3": dodajIzdelek();break;
    case "ob-in": Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,false);break;
    case "ob-nov": Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,true);break;
    case "ob-out": Oblak.odjava();break;
    case "ob-sync": Oblak.sinhroniziraj();break;
    case "ob-files": {
      var gumb=el("ob-files");
      if(gumb){gumb.disabled=true;gumb.textContent="Pošiljam …";}
      Oblak.poriniDatoteke().then(function(st){
        if(gumb){gumb.disabled=false;gumb.textContent="Pošlji slike v oblak";}
        renderOblakPanel();
        toast(st?st+" datotek poslanih v oblak.":"Vse datoteke so že v oblaku.");
      },function(){
        if(gumb){gumb.disabled=false;gumb.textContent="Pošlji slike v oblak";}
        toast("Pošiljanje datotek ni uspelo.");
      });
      break;
    }
  }
});
document.addEventListener("keydown",function(ev){
  /* Enter v polju banke shrani hook, brez skoka na gumb */
  if(ev.key==="Enter"&&ev.target&&ev.target.id==="bank-nov"){
    ev.preventDefault();
    if(String(ev.target.value).trim()){
      bankaDodaj(ev.target.value,el("bank-kat")&&el("bank-kat").value);
      ev.target.value="";renderEditor();
      var pn=el("bank-nov");if(pn)pn.focus();
      toast("Shranjeno v banko.");
    }
    return;
  }
  if(ev.key==="Escape"){zapriIzvoz();zapriPovecano();return;}
  if(ev.key!=="Enter")return;
  var id=ev.target&&ev.target.id;
  if(id==="ob-mail"||id==="ob-geslo"){ev.preventDefault();Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,false);}
});

/* povleci in spusti + prilepi */
function vlecemoDatoteke(ev){
  var ty=ev.dataTransfer&&ev.dataTransfer.types;
  return !!ty&&Array.prototype.indexOf.call(ty,"Files")>=0;
}
/* katero polje za spuščanje je pod kazalcem in čigav je material */
function dropPolje(cilj){
  var d=cilj&&cilj.closest?cilj.closest("#drop,#drop-izd,#drop-ref"):null;
  if(!d)return null;
  var p=P();
  if(d.id==="drop-izd")return {polje:d,lastnik:p?datLastnikIzdelka(p):null};
  if(d.id==="drop-ref")return {polje:d,lastnik:K()?datLastnikRef(K()):null};
  return {polje:d,lastnik:K()?datLastnik(K()):null};
}
document.addEventListener("dragover",function(ev){
  if(!vlecemoDatoteke(ev))return;
  var c=dropPolje(ev.target);
  if(!c)return;
  ev.preventDefault();c.polje.classList.add("nad");
});
document.addEventListener("dragleave",function(ev){
  if(ev.relatedTarget)return;
  ["drop","drop-izd","drop-ref"].forEach(function(id){var d=el(id);if(d)d.classList.remove("nad");});
});
document.addEventListener("drop",function(ev){
  if(!vlecemoDatoteke(ev))return;
  var c=dropPolje(ev.target);
  if(!c||!c.lastnik)return;
  ev.preventDefault();c.polje.classList.remove("nad");
  if(ev.dataTransfer.files&&ev.dataTransfer.files.length)dodajDatoteke(ev.dataTransfer.files,c.lastnik);
});
document.addEventListener("paste",function(ev){
  if(!el("drop")||!K())return;
  var it=ev.clipboardData&&ev.clipboardData.files;
  if(!it||!it.length)return;
  dodajDatoteke(it);
});

/* ============ zagon ============ */
var zac=String(location.hash||"").replace("#","");
if(zac)view=pravView(zac);
if(el("verzija"))el("verzija").textContent=RAZLICICA;
polniIzbirnik();
render();
osveziSideOblak();
Datoteke.zgradiKazalo().then(function(st){
  if(st)toast(st+" že naloženih datotek vpisanih v kazalo — pošlji jih v oblak v zavihku Podatki.");
},function(){});
Oblak.init();

if("serviceWorker" in navigator){
  /* Ko prevzame nov service worker, se stran enkrat sama osveži. Brez tega
     nova koda obleži do naslednjega zagona in izgleda, da objava ni delovala. */
  /* Ob prvi namestitvi kontrolor pride iz nič — takrat osveževanje ni potrebno
     in bi samo podvojilo zagon. Osvežimo samo, ko se kontrolor zamenja.      */
  var zeOsvezeno=!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",function(){
    if(zeOsvezeno)return;
    zeOsvezeno=true;
    try{location.reload();}catch(err){}
  });
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").then(function(reg){
      /* takoj preveri, ali je na strežniku novejša koda, in potem še vsakič,
         ko se vrneš v aplikacijo — na telefonu je to edini trenutek, ko se to
         sploh lahko zgodi                                                    */
      function preveri(){try{reg.update();}catch(err){}}
      preveri();
      document.addEventListener("visibilitychange",function(){
        if(!document.hidden)preveri();
      });
    }).catch(function(){});
  });
}
})();
