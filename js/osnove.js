/* Oglasni list · osnove.js
   Pomožne funkcije, oblike zapisa števil ter model oglasa:
   platforme, umestitve, formati in gumbi.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

/* Oznaka različice pride iz verzija.js — ene same datoteke, ki jo bereta tudi
   sw.js in index.html. V stranski vrstici je vidna, da se na prvi pogled loči,
   ali brskalnik strežé svežo kopijo ali staro iz predpomnilnika.            */
var RAZLICICA=window.RAZLICICA||"različica ?";
var RAZLICICA_ST=window.RAZLICICA_ST||0;

/* ============ pomožne funkcije ============ */
var LS="oglasni-list-v1", LS_TEMA="oglasni-list-tema";
/* Branje števila iz polja. Zna slovenski zapis s piko za tisočice in vejico za
   decimalke, pa tudi angleškega s piko za decimalke.

   Prej je funkcija samo zamenjala prvo vejico s piko, zato je „12.345,00“ (kar
   sama aplikacija napiše z nfE.format) prebrala kot 12,345 — tisočkrat premalo.
   To je udarilo povsod, kjer aplikacija svojo številko vpiše nazaj v polje:
   „Prevzemi budget“ in „Prevzemi iz izdelka“ pri ceni čez tisoč evrov.      */
function n(v){
  if(typeof v==="number")return isFinite(v)?v:0;
  var s=String(v==null?"":v).replace(/\s/g,"").replace(/[€%×]/g,"");
  if(!s)return 0;
  var pika=s.lastIndexOf("."), vejica=s.lastIndexOf(",");
  if(pika>=0&&vejica>=0){
    /* obe ločili: zadnje je decimalno, vsa prejšnja so ločila tisočic */
    if(vejica>pika)s=s.replace(/\./g,"").replace(",",".");
    else s=s.replace(/,/g,"");
  }else if(vejica>=0){
    /* „1,234,567“ so tisočice, „1,8“ pa decimalka */
    s=/^-?\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,""):s.replace(/,/g,".");
  }else if(/^-?\d{1,3}(\.\d{3})+$/.test(s)){
    /* „12.345“ je dvanajst tisoč, ne dvanajst in pol */
    s=s.replace(/\./g,"");
  }
  var x=parseFloat(s);
  return isFinite(x)?x:0;
}
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
/* Slovenska ednina, dvojina in množina: 1 kreativa, 2 kreativi, 3 kreative,
   5 kreativ. Brez tega se na karticah bere „1 odprtih“.                     */
function mnozina(st,ena,dve,tri,pet){
  var o=Math.abs(st)%100;
  if(o===1)return ena;
  if(o===2)return dve;
  if(o===3||o===4)return tri;
  return pet;
}
function steviloIn(st,ena,dve,tri,pet){return st+" "+mnozina(st,ena,dve,tri,pet);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function uid(){return "id"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);}
function el(id){return document.getElementById(id);}
function q(s,r){return (r||document).querySelector(s);}
function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
/* Obvestilo na dnu zaslona. Drugi parameter je neobvezno dejanje — {ime, klik} —
   ki se izpiše kot gumb; taka obvestila počakajo dlje, da jih je mogoče ujeti. */
function toast(m,dejanje){
  var t=el("toast");
  clearTimeout(toast._t);
  t.classList.toggle("dej",!!(dejanje&&dejanje.ime));
  if(dejanje&&dejanje.ime&&typeof dejanje.klik==="function"){
    t.innerHTML='<span class="toast-t"></span><button class="toast-b" type="button"></button>';
    q(".toast-t",t).textContent=m;
    var g=q(".toast-b",t);
    g.textContent=dejanje.ime;
    g.onclick=function(){t.classList.remove("on");clearTimeout(toast._t);dejanje.klik();};
  }else{
    t.textContent=m;
  }
  t.classList.add("on");
  toast._t=setTimeout(function(){t.classList.remove("on");},dejanje?8000:2600);
}
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
