/* Oglasni list — projekti, kreative, budget in izračun profita.
   Besedilni podatki so v localStorage, naložene datoteke v IndexedDB.
   Oblačna sinhronizacija se vklopi, ko v config.js vpišeš Supabase url in anonKey. */
(function(){
"use strict";

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
function novProjekt(ime){return {id:uid(),ime:ime||"Nov projekt",opis:""};}
function novIzdelek(ime,projekt){
  return {id:uid(),projekt:projekt||null,ime:ime||"Nov izdelek",opis:"",
    cena:"",ddv:"22",ddvVkljucen:true,posiljanjePlaca:"",
    nabavna:"",posiljanje:"",embalaza:"",provizijaPct:"2,9",provizijaFix:"0,25",ostalo:"",vracilaPct:"5",
    fiksniMesecni:"",dnevniBudget:"",predvidenCPA:"",
    kreative:[]};
}
function novaKreativa(pl){
  return {id:uid(),naslov:"Nova kreativa",platforma:pl||"facebook",format:"slika",status:"ideja",
    kot:"",publika:"",hook:"",primarni:"",naslovi:["","","","",""],opisi:["","",""],cta:"Kupi zdaj",
    kljucneBesede:"",url:"",design:"",opombe:"",stDatotek:0,
    budget:"",cpm:"",ctr:"",cvr:"",
    rSpend:"",rImpr:"",rClicks:"",rOrders:""};
}
function seed(){
  var pr=novProjekt("Moja trgovina");
  pr.opis="Prvi projekt. Mape uporabi za stranke, blagovne znamke ali sezone.";
  var p=novIzdelek("PRIMER — Masažna pištola",pr.id);
  p.opis="Testni izdelek, da vidiš kako se štejejo številke. Prepiši ali izbriši.";
  p.cena="79,90";p.posiljanjePlaca="3,90";p.nabavna="21,50";p.posiljanje="4,20";p.embalaza="1,10";
  p.ostalo="0,80";p.fiksniMesecni="250";p.dnevniBudget="40";p.predvidenCPA="22";
  var f=novaKreativa("facebook");
  f.naslov="FB · UGC — 3 dni brez bolečin";f.format="UGC video";f.status="aktivna";
  f.kot="Boleča točka: vztrajna bolečina v hrbtu po sedenju za računalnikom";
  f.publika="M+Ž 28–50, pisarniško delo, fitnes, široko targetiranje";
  f.hook="Tri leta sem plačeval masaže. Potem sem to naredil sam, doma, v 10 minutah.";
  f.primarni="Tri leta sem plačeval masaže po 45 € na uro.\n\nPotem sem kupil to pištolo in v 10 minutah zvečer naredim isto, kar mi je delal fizioterapevt na hrbtu.\n\n· 4 nastavki, 5 hitrosti\n· baterija zdrži 6 ur\n· 30 dni vračilo brez vprašanj\n\nDanes -30 % + brezplačna dostava.";
  f.naslovi[0]="Bolečina v hrbtu? 10 minut na dan";
  f.opisi[0]="Poslano v 24 urah iz Slovenije";
  f.design="Vertikalno 9:16, snemano s telefonom v domači sobi, brez studia. Prvi 2 s: roka prižge pištolo in jo prisloni na ramo, zvok naprave ostane. Podnapisi veliki, spodnja tretjina, rumeni highlight na „brez masaž“. Zadnje 3 s: izdelek na mizi + cena + gumb.";
  f.budget="20";f.cpm="9";f.ctr="1,8";f.cvr="2,4";
  f.rSpend="184";f.rImpr="21400";f.rClicks="392";f.rOrders="9";
  var g=novaKreativa("google");
  g.naslov="Google · Search — masažna pištola";g.format="RSA";g.status="produkcija";
  g.kot="Namera nakupa: išče konkreten izdelek, odloča se med ponudniki";
  g.publika="Iskanja v SLO, exact + phrase, izključi „popravilo“, „rabljeno“, „najem“";
  g.naslovi[0]="Masažna pištola — zaloga SLO";g.naslovi[1]="Dostava v 24 urah";g.naslovi[2]="30 dni vračilo";
  g.naslovi[3]="Od 79,90 € z garancijo";g.naslovi[4]="4 nastavki, 5 hitrosti";
  g.opisi[0]="Profesionalna masažna pištola za doma. Slovenska zaloga, dostava v 24 urah, 2 leti garancije.";
  g.opisi[1]="30 dni vračilo brez vprašanj. Plačilo po povzetju ali s kartico. Podpora v slovenščini.";
  g.kljucneBesede="masazna pistola, masažna pištola cena, theragun alternativa, pistola za masazo hrbta";
  g.url="https://primer.si/masazna-pistola";
  g.design="Search — brez vizuala. Sitelinki: Kako uporabljati / Vračila / Mnenja / Kontakt. Callout: Zaloga v SLO, 24 h dostava, 2 leti garancije.";
  g.budget="15";g.cpm="";g.ctr="6,5";g.cvr="3,5";
  p.kreative=[f,g];
  return {v:2,projekti:[pr],aktivenProjekt:pr.id,izdelki:[p],aktiven:p.id,
    kalk:{budget:"30",cpm:"9",ctr:"1,8",cvr:"2,5",cilj:"1"},spremenjeno:new Date().toISOString()};
}
function privzetiKalk(){return {budget:"30",cpm:"9",ctr:"1,8",cvr:"2,5",cilj:"1"};}

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
  var znani={};S.projekti.forEach(function(x){znani[x.id]=1;});
  S.izdelki.forEach(function(x){
    if(!x.projekt||!znani[x.projekt])x.projekt=S.projekti[0].id;
    if(!Array.isArray(x.kreative))x.kreative=[];
    x.kreative.forEach(function(k){
      if(!Array.isArray(k.naslovi))k.naslovi=["","","","",""];
      while(k.naslovi.length<5)k.naslovi.push("");
      if(!Array.isArray(k.opisi))k.opisi=["","",""];
      while(k.opisi.length<3)k.opisi.push("");
      if(typeof k.stDatotek!=="number")k.stDatotek=0;
    });
  });
  if(!S.aktivenProjekt||!znani[S.aktivenProjekt])S.aktivenProjekt=S.projekti[0].id;
  S.v=2;
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
function praznoHtml(){
  return '<div class="block"><header><h2>Projekt „'+esc(PR().ime)+'“ je še brez izdelkov</h2></header><div class="pad">'+
    '<p class="note">Izdelek je nosilec cene, stroškov in kreativ. Dodaj prvega, potem se odprejo vsi izračuni.</p>'+
    '<div class="row" style="margin-top:12px"><button class="btn btn-p" id="pnew3">+ Dodaj izdelek</button>'+
    '<button class="btn" data-goto="projekti">Nazaj na projekte</button></div></div></div>';
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
  return {
    naVoljo:naVoljo,
    dodaj:function(kreativaId,file){
      return op("readwrite",function(s){
        return s.put({id:uid(),kreativa:kreativaId,ime:file.name||"brez-imena",
          tip:file.type||"",velikost:file.size||0,dodano:new Date().toISOString(),blob:file});
      });
    },
    zaKreativo:function(kid){return op("readonly",function(s){return s.index("kreativa").getAll(kid);});},
    steviloZa:function(kid){return op("readonly",function(s){return s.index("kreativa").count(kid);});},
    ena:function(id){return op("readonly",function(s){return s.get(id);});},
    brisi:function(id){return op("readwrite",function(s){return s.delete(id);});},
    brisiZaKreativo:function(kid){
      return op("readwrite",function(s){
        var r=s.index("kreativa").getAllKeys(kid);
        r.onsuccess=function(){(r.result||[]).forEach(function(k){s.delete(k);});};
        return r;
      });
    },
    stevilo:function(){return op("readonly",function(s){return s.count();});},
    pocisti:function(){return op("readwrite",function(s){return s.clear();});}
  };
})();

function brisiDatotekeKreativ(kreative){
  if(!Datoteke.naVoljo)return Promise.resolve();
  var p=Promise.resolve();
  kreative.forEach(function(k){p=p.then(function(){return Datoteke.brisiZaKreativo(k.id).catch(function(){});});});
  return p;
}

/* ============ POGLED: projekti ============ */
function renderProjekti(){
  var html=S.projekti.map(function(pr){
    var izd=izdelkiVProjektu(pr.id);
    var stK=izd.reduce(function(a,x){return a+x.kreative.length;},0);
    var vrstice=izd.map(function(p){
      var ek=ekon(p);
      var chips=p.kreative.map(function(k){
        return '<button data-openk="'+k.id+'" title="'+esc(k.naslov)+'">'+
          '<span class="pill st-'+k.status+'" style="border:0;padding:0">'+k.status.slice(0,3)+'</span>'+
          '<span class="kn">'+esc(k.naslov)+'</span>'+
          (k.stDatotek?'<span style="color:var(--ink3)">'+k.stDatotek+' dat.</span>':'')+
        '</button>';
      }).join("");
      return '<div class="tree-i'+(p.id===S.aktiven&&pr.id===S.aktivenProjekt?" zdaj":"")+'">'+
        '<span class="tree-in"><b>'+esc(p.ime)+'</b>'+(p.opis?' <span style="color:var(--ink3);font-size:12.5px">— '+esc(p.opis)+'</span>':'')+'</span>'+
        '<span class="tree-num">marža '+e(ek.marzaEf)+' · BE CPA '+e(ek.beCPA)+'</span>'+
        '<span class="tree-k">'+
          (chips||'<span class="note">brez kreativ</span>')+
          '<button data-addk="'+p.id+'" style="border-style:dashed">+ kreativa</button>'+
        '</span>'+
        '<span class="tree-k no-print" style="margin-top:2px">'+
          '<button data-pick="'+p.id+'">odpri izdelek</button>'+
          '<button data-prename="'+p.id+'">preimenuj</button>'+
          (S.projekti.length>1?'<select class="btn btn-s" data-move="'+p.id+'" style="width:auto;padding:3px 6px">'+
            '<option value="">premakni v mapo…</option>'+
            S.projekti.filter(function(x){return x.id!==pr.id;}).map(function(x){return '<option value="'+x.id+'">'+esc(x.ime)+'</option>';}).join("")+
            '</select>':'')+
          '<button data-pdel="'+p.id+'" style="color:var(--neg)">izbriši</button>'+
        '</span>'+
      '</div>';
    }).join("");
    return '<div class="tree-p">'+
      '<div class="tree-ph">'+
        '<h3>'+esc(pr.ime)+'</h3>'+
        '<span class="tree-num">'+izd.length+' izdelkov · '+stK+' kreativ</span>'+
        '<span class="tree-a no-print">'+
          '<button class="btn btn-s" data-prpick="'+pr.id+'">izberi mapo</button>'+
          '<button class="btn btn-s" data-addi="'+pr.id+'">+ izdelek</button>'+
          '<button class="btn btn-s" data-prrename="'+pr.id+'">preimenuj</button>'+
          (S.projekti.length>1?'<button class="btn btn-s btn-d" data-prdel="'+pr.id+'">izbriši</button>':'')+
        '</span>'+
      '</div>'+
      (vrstice||'<div class="tree-empty">Mapa je prazna. Dodaj izdelek z gumbom zgoraj.</div>')+
    '</div>';
  }).join("");

  el("v-projekti").innerHTML=
  '<div class="block">'+
    '<header><h2>Projekti</h2><p>Mapa → izdelek → kreativa. Kliki na kreativo jo odprejo.</p>'+
      '<span class="sp"></span><button class="btn btn-s no-print" id="prnew">+ Nova mapa</button></header>'+
    html+
  '</div>'+
  '<div class="block"><header><h2>Kako je zloženo</h2></header><div class="pad"><ul class="check">'+
    '<li><b>Mapa / projekt</b> — stranka, blagovna znamka ali sezona. Ločuje nepovezane stvari.</li>'+
    '<li><b>Izdelek</b> — nosi ceno in stroške. Iz njega pride marža in break-even CPA.</li>'+
    '<li><b>Kreativa</b> — en oglas: kot, tekst, design brief, budget, naložene slike in videi, rezultati.</li>'+
    '<li>Zgoraj v glavi strani preklapljaš med mapo in izdelkom; vsi ostali zavihki delajo na izbranem izdelku.</li>'+
  '</ul></div></div>';
}

/* ============ POGLED: pregled ============ */
function renderPregled(){
  var p=P();
  if(!p){el("v-pregled").innerHTML=praznoHtml();return;}
  var ek=ekon(p);
  var cpa=n(p.predvidenCPA)||ek.beCPA*0.7;
  var budget=n(p.dnevniBudget);
  var prodajDan = cpa>0 ? budget/cpa : 0;
  var profitDan = prodajDan*ek.marzaEf - budget;
  var profitMesec = profitDan*30 - n(p.fiksniMesecni);
  var enaNaDan = ek.marzaEf - cpa;
  var st={};p.kreative.forEach(function(k){st[k.status]=(st[k.status]||0)+1;});
  var stHtml=["aktivna","zmagovalka","produkcija","ideja","pavza","ubita"].filter(function(s){return st[s];})
    .map(function(s){return '<span class="pill st-'+s+'">'+s+' '+st[s]+'</span>';}).join(" ")||'<span class="note">Ni še nobene kreative.</span>';

  el("v-pregled").innerHTML=
  '<div class="block">'+
    '<header><h2>'+esc(p.ime)+'</h2><p>'+esc(PR().ime)+(p.opis?' · '+esc(p.opis):'')+'</p></header>'+
    '<div class="ledger">'+
      '<div class="cell big"><span class="k">Marža na naročilo</span><span class="v '+znak(ek.marzaEf)+'">'+e(ek.marzaEf)+'</span><span class="n">po vračilih ('+p1(ek.vracila*100)+')</span></div>'+
      '<div class="cell big"><span class="k">Break-even CPA</span><span class="v accv">'+e(ek.beCPA)+'</span><span class="n">nad tem izgubljaš</span></div>'+
      '<div class="cell big"><span class="k">Break-even ROAS</span><span class="v accv">'+x2(ek.beROAS)+'</span><span class="n">minimum, da si na ničli</span></div>'+
      '<div class="cell big"><span class="k">Profit pri 1 prodaji / dan</span><span class="v '+znak(enaNaDan)+'">'+e(enaNaDan)+'</span><span class="n">'+e(enaNaDan*30)+' / mesec</span></div>'+
    '</div>'+
    '<div class="ledger">'+
      '<div class="cell"><span class="k">Prodajna cena</span><span class="v">'+e(ek.bruto)+'</span><span class="n">z poštnino, ki jo plača stranka</span></div>'+
      '<div class="cell"><span class="k">Stroški / naročilo</span><span class="v">'+e(ek.stroski)+'</span><span class="n">izdelek + dostava + provizija</span></div>'+
      '<div class="cell"><span class="k">Bruto marža</span><span class="v">'+p1(ek.marzaPct)+'</span><span class="n">od neto prihodka</span></div>'+
      '<div class="cell"><span class="k">Dnevni budget</span><span class="v">'+e(budget)+'</span><span class="n">pri CPA '+e(cpa)+'</span></div>'+
    '</div>'+
    '<div class="ledger">'+
      '<div class="cell"><span class="k">Pričakovane prodaje / dan</span><span class="v">'+(isFinite(prodajDan)?nf1.format(prodajDan):"—")+'</span><span class="n">budget ÷ CPA</span></div>'+
      '<div class="cell"><span class="k">Profit / dan</span><span class="v '+znak(profitDan)+'">'+e(profitDan)+'</span><span class="n">brez fiksnih stroškov</span></div>'+
      '<div class="cell"><span class="k">Profit / mesec</span><span class="v '+znak(profitMesec)+'">'+e(profitMesec)+'</span><span class="n">minus fiksni '+e(n(p.fiksniMesecni))+'</span></div>'+
      '<div class="cell"><span class="k">Kreative</span><span class="v">'+i0(p.kreative.length)+'</span><span class="n">'+stHtml+'</span></div>'+
    '</div>'+
  '</div>'+
  verdictHtml(ek,cpa)+
  '<div class="block"><header><h2>Kaj naredi to številko boljšo</h2></header><div class="pad">'+
    '<ul class="check">'+
      '<li>Marža na naročilo je tvoja edina zaloga za oglase. Vsak evro nad break-even CPA jemlješ iz svojega žepa.</li>'+
      '<li>Dvig cene za 10 € gre skoraj v celoti v maržo — hitrejši učinek kot znižanje CPA za 10 €.</li>'+
      '<li>Poštnina, ki jo plača stranka, in upsell dvigneta break-even CPA, ne da bi se dotaknil oglasov.</li>'+
      '<li>Vračila jedo maržo dvakrat: izgubiš prihodek in plačaš dostavo. Pri '+p1(ek.vracila*100)+' te stanejo '+e(ek.marza-ek.marzaEf)+' na naročilo.</li>'+
    '</ul>'+
  '</div></div>';
}
function verdictHtml(ek,cpa){
  var d=ek.marzaEf-cpa, cls, txt;
  if(!isFinite(ek.marzaEf)||ek.marzaEf===0){cls="mid";txt="<b>Vnesi ceno in stroške</b> v zavihku Ekonomika izdelka — brez tega so vsi ostali izračuni prazni.";}
  else if(ek.marzaEf<=0){cls="bad";txt="<b>Marža je negativna.</b> Izdelek izgublja denar že pred prvim oglasom. Popravi ceno ali stroške, preden zapraviš en evro za oglase.";}
  else if(d<=0){cls="bad";txt="<b>Predvideni CPA "+e(cpa)+" je nad break-even "+e(ek.beCPA)+".</b> Vsako naročilo te stane "+e(-d)+". Več budgeta = večja izguba, ne večji profit.";}
  else if(d<ek.marzaEf*0.25){cls="mid";txt="<b>Tanka rezerva.</b> Pri CPA "+e(cpa)+" ti ostane "+e(d)+" na naročilo — to je "+p1(d/ek.marzaEf*100)+" marže. Eno slabše tedno in si na ničli. Cilj: CPA pod "+e(ek.beCPA*0.6)+".";}
  else{cls="ok";txt="<b>Prostor je.</b> Pri CPA "+e(cpa)+" ti ostane "+e(d)+" na naročilo, break-even je pri "+e(ek.beCPA)+". Skaliraj budget, dokler CPA ne zleze proti "+e(ek.beCPA*0.8)+".";}
  return '<div class="verdict '+cls+'">'+txt+'</div>';
}

/* ============ POGLED: ekonomika ============ */
function renderEkon(){
  var p=P();
  if(!p){el("v-ekonomika").innerHTML=praznoHtml();return;}
  el("v-ekonomika").innerHTML=
  '<div class="block">'+
    '<header><h2>Ekonomika izdelka</h2><p>Vse na eno naročilo. Številke se preračunajo med tipkanjem.</p></header>'+
    '<div class="pad" id="ekon-form">'+
      '<div class="grid" style="margin-bottom:16px">'+
        '<div class="f" style="grid-column:1/-1"><label for="f-ime">Ime izdelka</label><input class="txt" id="f-ime" type="text" data-p="ime" value="'+esc(p.ime)+'"></div>'+
        '<div class="f" style="grid-column:1/-1"><label for="f-opis">Kratek opis / ponudba</label><input class="txt" id="f-opis" type="text" data-p="opis" value="'+esc(p.opis)+'"></div>'+
        '<div class="f"><label for="f-projekt">Mapa / projekt</label><select id="f-projekt" data-p="projekt">'+
          S.projekti.map(function(x){return '<option value="'+x.id+'"'+(p.projekt===x.id?" selected":"")+'>'+esc(x.ime)+'</option>';}).join("")+
        '</select></div>'+
      '</div>'+
      '<fieldset><legend class="eyebrow">Prihodek</legend><div class="grid">'+
        fld("cena","Prodajna cena","€","Kar stranka plača za izdelek")+
        fld("posiljanjePlaca","Poštnina, ki jo plača stranka","€","0, če je dostava brezplačna")+
        fld("ddv","DDV","%","")+
        '<div class="f"><label>&nbsp;</label><label class="chk"><input type="checkbox" data-p="ddvVkljucen" '+(p.ddvVkljucen?"checked":"")+'> Cena je z vključenim DDV</label></div>'+
      '</div></fieldset>'+
      '<fieldset><legend class="eyebrow">Stroški na naročilo</legend><div class="grid">'+
        fld("nabavna","Nabavna cena izdelka","€","Kar plačaš dobavitelju")+
        fld("posiljanje","Naša dostava / fulfillment","€","")+
        fld("embalaza","Embalaža in pakiranje","€","")+
        fld("provizijaPct","Provizija plačila","%","Stripe/PayPal/banka")+
        fld("provizijaFix","Fiksna provizija na transakcijo","€","")+
        fld("ostalo","Ostalo na naročilo","€","Podpora, darilo, kuverta …")+
        fld("vracilaPct","Vračila in neprevzeti paketi","%","Delež naročil, ki se ne obnesejo")+
      '</div></fieldset>'+
      '<fieldset><legend class="eyebrow">Budget in fiksni stroški</legend><div class="grid">'+
        fld("dnevniBudget","Načrtovan dnevni budget","€","Vse platforme skupaj")+
        fld("predvidenCPA","Predviden CPA","€","Kolikor pričakuješ, da te stane eno naročilo")+
        fld("fiksniMesecni","Fiksni mesečni stroški","€","Shopify, orodja, agencija, tvoja plača …")+
      '</div></fieldset>'+
    '</div>'+
  '</div>'+
  '<div class="block">'+
    '<header><h2>Razrez enega naročila</h2><p>Od tega, kar stranka plača, do tega, kar ti ostane.</p></header>'+
    '<div class="scroll"><table><thead><tr><th>Postavka</th><th>Znesek</th><th>Delež plačila</th></tr></thead><tbody id="razrez"></tbody></table></div>'+
  '</div>'+
  '<div class="block">'+
    '<header><h2>Scenariji prodaje</h2><p id="scen-note"></p></header>'+
    '<div class="scroll"><table><thead><tr><th>Prodaj / dan</th><th>Budget / dan</th><th>Prihodek / dan</th><th>Profit / dan</th><th>Profit / mesec</th><th>Po fiksnih</th><th>ROAS</th></tr></thead><tbody id="scen"></tbody></table></div>'+
    '<div class="pad" id="scen-info"></div>'+
  '</div>';
  paintEkon();
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

/* ============ POGLED: kreative ============ */
var CTA=["Kupi zdaj","Nakupuj zdaj","Izvedi več","Naroči zdaj","Prijavi se","Pošlji sporočilo","Rezerviraj","Prenesi"];
var PLATFORME=[["facebook","Facebook"],["instagram","Instagram"],["google","Google"],["tiktok","TikTok"],["youtube","YouTube"],["drugo","Drugo"]];
var FORMATI=["slika","UGC video","video 9:16","karusel","kolekcija","RSA","Performance Max","zgodba","besedilo"];
var STATUSI=["ideja","produkcija","aktivna","pavza","zmagovalka","ubita"];
var LIM={facebook:{primarni:125,naslov:40,opis:30},instagram:{primarni:125,naslov:40,opis:30},
  tiktok:{primarni:100,naslov:40,opis:30},youtube:{primarni:100,naslov:40,opis:30},
  google:{primarni:90,naslov:30,opis:90},drugo:{primarni:200,naslov:60,opis:90}};
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

function renderKreative(){
  var p=P();
  if(!p){el("v-kreative").innerHTML=praznoHtml();return;}
  if(odprtaKreativa && K()) return renderEditor();
  var ek=ekon(p);
  var seznam=p.kreative.map(function(k){
    var l=lijak(k.budget,k.cpm,k.ctr,k.cvr,ek), r=rezultat(k,ek);
    var num = r.imaPodatke
      ? '<span class="'+znak(r.profit)+'">'+e(r.profit)+'</span><br><span style="color:var(--ink3)">dejansko · ROAS '+x2(r.roas)+'</span>'
      : (isFinite(l.profit) ? '<span class="'+znak(l.profit)+'">'+e(l.profit)+'</span><br><span style="color:var(--ink3)">načrt / dan</span>' : '<span style="color:var(--ink3)">brez številk</span>');
    var plat=(PLATFORME.filter(function(x){return x[0]===k.platforma;})[0]||["","?"])[1];
    return '<button class="cre" data-open="'+k.id+'">'+
      '<span class="cre-t">'+esc(k.naslov)+'</span>'+
      '<span class="cre-n">'+num+'</span>'+
      '<span class="cre-m"><span class="pill st-'+k.status+'">'+k.status+'</span> &nbsp;'+esc(plat)+' · '+esc(k.format)+
        ' · budget '+e(n(k.budget))+'/dan'+(k.stDatotek?' · '+k.stDatotek+' datotek':'')+'</span>'+
    '</button>';
  }).join("");
  el("v-kreative").innerHTML=
  '<div class="block">'+
    '<header><h2>Kreative</h2><p>'+esc(PR().ime)+' → '+esc(p.ime)+'</p>'+
      '<span class="sp"></span><span class="row no-print">'+
      '<button class="btn btn-s" data-add="facebook">+ Facebook</button>'+
      '<button class="btn btn-s" data-add="google">+ Google</button>'+
      '<button class="btn btn-s" data-add="tiktok">+ TikTok</button></span>'+
    '</header>'+
    (seznam?'<div class="cre-list">'+seznam+'</div>':'<div class="pad note">Ni še kreativ. Dodaj prvo z gumbi zgoraj.</div>')+
  '</div>';
}

var odprtiUrlji=[];
function pocistiUrlje(){
  odprtiUrlji.forEach(function(u){try{URL.revokeObjectURL(u);}catch(err){}});
  odprtiUrlji=[];
}

function renderEditor(){
  var p=P(),k=K(),ek=ekon(p),lim=LIM[k.platforma]||LIM.drugo;
  var jeGoogle=k.platforma==="google";
  pocistiUrlje();
  function ta(path,label,limit,rows,hint){
    var val=get(k,path);
    return '<div class="f"><label for="c-'+path+'">'+esc(label)+'</label>'+
      '<textarea id="c-'+path+'" data-c="'+path+'" data-limit="'+limit+'" rows="'+(rows||4)+'">'+esc(val)+'</textarea>'+
      '<span class="counter'+(String(val).length>limit?" over":"")+'" data-cnt="'+path+'">'+String(val).length+" / "+limit+'</span>'+
      (hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
  }
  function line(path,label,limit){
    var val=get(k,path);
    return '<div class="f"><label for="c-'+path+'">'+esc(label)+'</label><input class="txt" id="c-'+path+'" type="text" data-c="'+path+'" data-limit="'+limit+'" value="'+esc(val)+'">'+
      '<span class="counter'+(String(val).length>limit?" over":"")+'" data-cnt="'+path+'">'+String(val).length+" / "+limit+'</span></div>';
  }
  function slots(arr,path,label,limit){
    var h='<div class="f"><label>'+esc(label)+'</label><div class="slots">';
    for(var i=0;i<arr.length;i++){
      var val=arr[i]==null?"":arr[i];
      h+='<div class="slot"><span class="idx">'+(i+1)+'</span>'+
        '<input class="txt" type="text" data-c="'+path+'.'+i+'" data-limit="'+limit+'" value="'+esc(val)+'">'+
        '<span class="counter'+(String(val).length>limit?" over":"")+'" data-cnt="'+path+'.'+i+'">'+String(val).length+" / "+limit+'</span></div>';
    }
    return h+'</div></div>';
  }
  function nf(path,label,unit,hint){
    return '<div class="f"><label for="c-'+path+'">'+esc(label)+'</label>'+
      '<div class="wrap"><input id="c-'+path+'" type="text" inputmode="decimal" data-c="'+path+'" value="'+esc(get(k,path))+'">'+
      (unit?'<span class="unit">'+unit+'</span>':'')+'</div>'+(hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
  }

  el("v-kreative").innerHTML=
  '<div class="row no-print"><button class="btn btn-s" id="back">← Vse kreative</button><span class="sp"></span>'+
    '<button class="btn btn-s" id="copy">Kopiraj brief</button>'+
    '<button class="btn btn-s" id="dup">Podvoji</button>'+
    '<button class="btn btn-s btn-d" id="delk">Izbriši</button></div>'+
  '<div class="block">'+
    '<header><h2>Kreativa</h2><p>'+esc(PR().ime)+' → '+esc(p.ime)+'</p></header>'+
    '<div class="pad" id="cre-form">'+
      '<div class="grid">'+
        '<div class="f" style="grid-column:1/-1"><label for="c-naslov">Ime kreative (za tvojo evidenco)</label><input class="txt" id="c-naslov" type="text" data-c="naslov" value="'+esc(k.naslov)+'"></div>'+
        '<div class="f"><label for="c-platforma">Platforma</label><select id="c-platforma" data-c="platforma">'+PLATFORME.map(function(x){return '<option value="'+x[0]+'"'+(k.platforma===x[0]?" selected":"")+'>'+x[1]+'</option>';}).join("")+'</select></div>'+
        '<div class="f"><label for="c-format">Format</label><select id="c-format" data-c="format">'+FORMATI.map(function(x){return '<option'+(k.format===x?" selected":"")+'>'+x+'</option>';}).join("")+'</select></div>'+
        '<div class="f"><label for="c-status">Status</label><select id="c-status" data-c="status">'+STATUSI.map(function(x){return '<option'+(k.status===x?" selected":"")+'>'+x+'</option>';}).join("")+'</select></div>'+
      '</div>'+
      '<fieldset><legend class="eyebrow">Kot in publika</legend><div class="two">'+
        '<div class="f"><label for="c-kot">Kot / obljuba oglasa</label><textarea id="c-kot" data-c="kot" rows="3">'+esc(k.kot)+'</textarea><span class="hint">Ena misel. Boleča točka, primerjava, cena, dokaz, strah, status.</span></div>'+
        '<div class="f"><label for="c-publika">Publika in targetiranje</label><textarea id="c-publika" data-c="publika" rows="3">'+esc(k.publika)+'</textarea><span class="hint">Kdo, kje, kaj izključiš.</span></div>'+
      '</div></fieldset>'+
      '<fieldset><legend class="eyebrow">Tekst</legend>'+
        (jeGoogle
          ? '<div class="grid">'+slots(k.naslovi,"naslovi","Naslovi (RSA)",30)+slots(k.opisi,"opisi","Opisi (RSA)",90)+'</div>'+
            '<div class="grid" style="margin-top:14px">'+
            '<div class="f"><label for="c-kljucneBesede">Ključne besede</label><textarea id="c-kljucneBesede" data-c="kljucneBesede" rows="3">'+esc(k.kljucneBesede)+'</textarea><span class="hint">Ločeno z vejico. Spodaj napiši tudi negativne.</span></div>'+
            '<div class="f"><label for="c-url">Ciljni URL</label><input class="txt" id="c-url" type="text" data-c="url" value="'+esc(k.url)+'"></div>'+
            '</div>'
          : '<div class="two">'+
            '<div>'+ta("hook","Hook — prva vrstica / prve 3 sekunde",80,3,"To odloči vse. Nič uvodov.")+
              '<div style="margin-top:12px">'+ta("primarni","Primarno besedilo",lim.primarni,9,"Nad "+lim.primarni+" znakov se skrajša v „Več …“ — najpomembnejše daj naprej.")+'</div></div>'+
            '<div>'+line("naslovi.0","Naslov",lim.naslov)+
              '<div style="margin-top:12px">'+line("opisi.0","Opis (pod naslovom)",lim.opis)+'</div>'+
              '<div class="f" style="margin-top:12px"><label for="c-cta">Gumb (CTA)</label><select id="c-cta" data-c="cta">'+CTA.map(function(x){return '<option'+(k.cta===x?" selected":"")+'>'+x+'</option>';}).join("")+'</select></div>'+
              '<div class="f" style="margin-top:12px"><label for="c-url">Ciljni URL</label><input class="txt" id="c-url" type="text" data-c="url" value="'+esc(k.url)+'"></div>'+
            '</div></div>')+
        '<div class="f no-print" style="margin-top:16px"><span class="eyebrow">Banka hookov — klikni, da vstaviš</span><div class="bank">'+
          HOOKI.map(function(h,idx){return '<button type="button" data-hook="'+idx+'">'+esc(h)+'</button>';}).join("")+
        '</div></div>'+
      '</fieldset>'+
      '<fieldset><legend class="eyebrow">Material — slike in videi</legend>'+
        (Datoteke.naVoljo
          ? '<div class="drop no-print" id="drop">Klikni ali povleci sem slike in videe. Lahko tudi prilepiš iz odložišča (Ctrl+V).<br>'+
            '<span style="font-size:11.5px">Shrani se v to napravo, zato gre lahko tudi za velike datoteke.</span></div>'+
            '<input type="file" id="dfile" multiple accept="image/*,video/*,.pdf" hidden>'+
            '<div class="files" id="datoteke"></div>'
          : '<p class="note">Ta brskalnik ne dovoli shranjevanja datotek (IndexedDB ni na voljo). Besedila in izračuni delajo normalno.</p>')+
      '</fieldset>'+
      '<fieldset><legend class="eyebrow">Design brief</legend>'+
        '<div class="f"><label for="c-design">Kaj naj se vidi in sliši</label><textarea id="c-design" data-c="design" rows="6">'+esc(k.design)+'</textarea></div>'+
        '<div style="padding-top:12px"><ul class="check">'+
          '<li><b>Format in razmerje:</b> 9:16 za zgodbe/Reels, 4:5 za feed, 1:1 za Google display.</li>'+
          '<li><b>Prve 3 sekunde:</b> kaj se premakne, kaj se sliši, kdaj se prvič vidi izdelek.</li>'+
          '<li><b>Podnapisi:</b> vedno. 80 % gleda brez zvoka.</li>'+
          '<li><b>Kaj je v kadru:</b> obraz, roke, izdelek v uporabi, prej/potem, cenovka.</li>'+
          '<li><b>Dokaz:</b> mnenje, število kupcev, garancija, logotip medija.</li>'+
          '<li><b>Zaključek:</b> izdelek + cena + gumb, 2–3 sekunde.</li>'+
        '</ul></div>'+
      '</fieldset>'+
      '<fieldset><legend class="eyebrow">Načrt — predvidevanja</legend><div class="grid">'+
        nf("budget","Dnevni budget","€","")+
        nf("cpm","CPM — cena 1000 prikazov","€",jeGoogle?"Pri Search pusti prazno in računaj prek CPC":"FB SLO: 5–15 €")+
        nf("ctr","CTR — delež klikov","%","FB: 1–3 %, Google Search: 4–8 %")+
        nf("cvr","CVR — delež nakupov iz klikov","%","Spletna trgovina: 1–4 %")+
      '</div>'+
      '<div class="ledger" style="margin-top:16px;border-top:1px solid var(--rule)">'+
        '<div class="cell"><span class="k">Prikazi / dan</span><span class="v" data-o="impr">—</span></div>'+
        '<div class="cell"><span class="k">Kliki / dan</span><span class="v" data-o="kliki">—</span></div>'+
        '<div class="cell"><span class="k">Naročila / dan</span><span class="v" data-o="narocil">—</span></div>'+
        '<div class="cell"><span class="k">CPC</span><span class="v" data-o="cpc">—</span></div>'+
        '<div class="cell"><span class="k">CPA</span><span class="v" data-o="cpa">—</span><span class="n" data-o="cpaN"></span></div>'+
        '<div class="cell"><span class="k">ROAS</span><span class="v" data-o="roas">—</span><span class="n" data-o="roasN"></span></div>'+
        '<div class="cell"><span class="k">Profit / dan</span><span class="v" data-o="profit">—</span></div>'+
        '<div class="cell"><span class="k">Profit / mesec</span><span class="v" data-o="profitM">—</span></div>'+
      '</div>'+
      '<div id="cre-verdict" style="margin-top:14px"></div>'+
      '</fieldset>'+
      '<fieldset><legend class="eyebrow">Rezultati — kar je dejansko izmerjeno</legend><div class="grid">'+
        nf("rSpend","Poraba","€","")+nf("rImpr","Prikazi","","")+nf("rClicks","Kliki","","")+nf("rOrders","Naročila","","")+
      '</div>'+
      '<div class="ledger" style="margin-top:16px;border-top:1px solid var(--rule)">'+
        '<div class="cell"><span class="k">Dejanski CPM</span><span class="v" data-o="rcpm">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CTR</span><span class="v" data-o="rctr">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CPC</span><span class="v" data-o="rcpc">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CVR</span><span class="v" data-o="rcvr">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski CPA</span><span class="v" data-o="rcpa">—</span></div>'+
        '<div class="cell"><span class="k">Dejanski ROAS</span><span class="v" data-o="rroas">—</span></div>'+
        '<div class="cell"><span class="k">Prihodek</span><span class="v" data-o="rprih">—</span></div>'+
        '<div class="cell"><span class="k">Profit</span><span class="v" data-o="rprofit">—</span></div>'+
      '</div>'+
      '<div id="cre-verdict2" style="margin-top:14px"></div>'+
      '</fieldset>'+
      '<fieldset><legend class="eyebrow">Opombe</legend>'+
        '<div class="f"><textarea data-c="opombe" rows="3" aria-label="Opombe">'+esc(k.opombe)+'</textarea></div>'+
      '</fieldset>'+
    '</div>'+
  '</div>';
  paintKreativa();
  if(Datoteke.naVoljo)narisiDatoteke();
}

function narisiDatoteke(){
  var k=K(),cilj=el("datoteke");
  if(!k||!cilj)return;
  Datoteke.zaKreativo(k.id).then(function(sez){
    sez=(sez||[]).sort(function(a,b){return String(a.dodano).localeCompare(String(b.dodano));});
    if(k.stDatotek!==sez.length){k.stDatotek=sez.length;shrani();}
    if(!sez.length){cilj.innerHTML='';return;}
    pocistiUrlje();
    cilj.innerHTML=sez.map(function(d){
      var u="";
      try{u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);}catch(err){}
      var prev;
      if(/^image\//.test(d.tip)&&u)prev='<img src="'+u+'" alt="'+esc(d.ime)+'">';
      else if(/^video\//.test(d.tip)&&u)prev='<video src="'+u+'" controls preload="metadata"></video>';
      else prev='<span class="ikona">'+esc((d.ime.split(".").pop()||"datoteka").slice(0,8))+'</span>';
      return '<div class="file"><div class="prev">'+prev+'</div>'+
        '<div class="meta"><span class="fn">'+esc(d.ime)+'</span><span class="fs">'+mb(d.velikost)+'</span></div>'+
        '<div class="fa no-print"><button data-dl="'+d.id+'">prenesi</button><button class="d" data-ddel="'+d.id+'">izbriši</button></div>'+
      '</div>';
    }).join("");
  },function(err){
    cilj.innerHTML='<p class="note">Datotek ni bilo mogoče prebrati: '+esc(err&&err.message||"neznana napaka")+'</p>';
  });
}
function dodajDatoteke(files){
  var k=K();
  if(!k){toast("Najprej odpri kreativo.");return;}
  var arr=Array.prototype.slice.call(files||[]).filter(function(f){return f&&f.size>=0;});
  if(!arr.length)return;
  var veliki=arr.filter(function(f){return f.size>60*1024*1024;});
  if(veliki.length&&!confirm(veliki.length+" datotek je večjih od 60 MB. Shramba brskalnika je omejena — nadaljujem?"))return;
  var kid=k.id, uspelo=0, prva=Promise.resolve();
  arr.forEach(function(f){
    prva=prva.then(function(){return Datoteke.dodaj(kid,f).then(function(){uspelo++;});});
  });
  prva.then(function(){
    toast(uspelo===1?"Datoteka dodana.":uspelo+" datotek dodanih.");
    narisiDatoteke();
  },function(err){
    narisiDatoteke();
    toast("Shranjevanje ni uspelo"+(uspelo?" po "+uspelo+" datotekah":"")+": "+(err&&err.message||"shramba je zavrnila zapis"));
  });
}
function prenesiDatoteko(id){
  Datoteke.ena(id).then(function(d){
    if(!d)return;
    var u=URL.createObjectURL(d.blob),a=document.createElement("a");
    a.href=u;a.download=d.ime;document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},1000);
  });
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
function renderKalk(){
  var p=P();
  if(!p){el("v-kalkulator").innerHTML=praznoHtml();return;}
  var kk=S.kalk;
  function nf(path,label,unit,hint){
    return '<div class="f"><label for="k-'+path+'">'+esc(label)+'</label>'+
      '<div class="wrap"><input id="k-'+path+'" type="text" inputmode="decimal" data-k="'+path+'" value="'+esc(kk[path]==null?"":kk[path])+'">'+
      (unit?'<span class="unit">'+unit+'</span>':'')+'</div>'+(hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
  }
  el("v-kalkulator").innerHTML=
  '<div class="block">'+
    '<header><h2>Kalkulator oglasa</h2><p>Hitri what-if za '+esc(p.ime)+'. Marža se vzame iz Ekonomike izdelka.</p></header>'+
    '<div class="pad" id="kalk-form"><div class="grid">'+
      nf("budget","Dnevni budget","€","")+nf("cpm","CPM","€","")+nf("ctr","CTR","%","")+nf("cvr","CVR","%","")+
    '</div></div>'+
    '<div class="ledger" style="border-top:1px solid var(--rule)">'+
      '<div class="cell"><span class="k">Prikazi / dan</span><span class="v" data-o="kimpr">—</span></div>'+
      '<div class="cell"><span class="k">Kliki / dan</span><span class="v" data-o="kkliki">—</span></div>'+
      '<div class="cell"><span class="k">Naročila / dan</span><span class="v" data-o="knarocil">—</span></div>'+
      '<div class="cell"><span class="k">CPC</span><span class="v" data-o="kcpc">—</span></div>'+
    '</div>'+
    '<div class="ledger">'+
      '<div class="cell big"><span class="k">CPA</span><span class="v" data-o="kcpa">—</span><span class="n" data-o="kcpaN"></span></div>'+
      '<div class="cell big"><span class="k">ROAS</span><span class="v" data-o="kroas">—</span><span class="n" data-o="kroasN"></span></div>'+
      '<div class="cell big"><span class="k">Profit / dan</span><span class="v" data-o="kprofit">—</span></div>'+
      '<div class="cell big"><span class="k">Profit / mesec</span><span class="v" data-o="kprofitM">—</span></div>'+
    '</div>'+
    '<div class="pad" id="kalk-verdict"></div>'+
  '</div>'+
  '<div class="block">'+
    '<header><h2>Obrnjen izračun</h2><p>Koliko budgeta rabim za toliko prodaj na dan.</p></header>'+
    '<div class="pad"><div class="grid">'+nf("cilj","Želim prodaj / dan","kos","")+'</div>'+
      '<div class="ledger" style="margin-top:16px;border:1px solid var(--rule)">'+
        '<div class="cell"><span class="k">Potreben budget / dan</span><span class="v" data-o="obudget">—</span></div>'+
        '<div class="cell"><span class="k">Potrebni kliki / dan</span><span class="v" data-o="okliki">—</span></div>'+
        '<div class="cell"><span class="k">Potrebni prikazi / dan</span><span class="v" data-o="oimpr">—</span></div>'+
        '<div class="cell"><span class="k">Profit / dan</span><span class="v" data-o="oprofit">—</span></div>'+
      '</div>'+
      '<p class="note" style="margin-top:14px" id="obr-note"></p>'+
    '</div>'+
  '</div>'+
  '<div class="block">'+
    '<header><h2>Občutljivost — kaj se zgodi, če se CPA premakne</h2><p>Isti budget, drugačna cena naročila.</p></header>'+
    '<div class="scroll"><table><thead><tr><th>CPA</th><th>Naročila / dan</th><th>Profit / dan</th><th>Profit / mesec</th><th>ROAS</th></tr></thead><tbody id="obc"></tbody></table></div>'+
  '</div>';
  paintKalk();
}
function paintKalk(){
  var p=P();if(!p||!el("kalk-verdict"))return;
  var ek=ekon(p),kk=S.kalk;
  var l=lijak(kk.budget,kk.cpm,kk.ctr,kk.cvr,ek);
  function put(key,val,cls){var t=q('[data-o="'+key+'"]');if(!t)return;t.textContent=val;t.className=(t.classList.contains("v")?"v ":"n ")+(cls||"");}
  put("kimpr",i0(l.impr));put("kkliki",i0(l.kliki));put("knarocil",isFinite(l.narocil)?nf1.format(l.narocil):"—");put("kcpc",e(l.cpc));
  put("kcpa",e(l.cpa),isFinite(l.cpa)?(l.cpa<=ek.beCPA?"pos":"neg"):"");
  put("kroas",x2(l.roas),isFinite(l.roas)?(l.roas>=ek.beROAS?"pos":"neg"):"");
  put("kprofit",e(l.profit),znak(l.profit));put("kprofitM",e(l.profit*30),znak(l.profit*30));
  var a=q('[data-o="kcpaN"]');if(a)a.textContent="break-even "+e(ek.beCPA);
  var b=q('[data-o="kroasN"]');if(b)b.textContent="break-even "+x2(ek.beROAS);
  el("kalk-verdict").innerHTML=isFinite(l.profit)
    ? '<p class="note"><b>Marža na naročilo:</b> '+e(ek.marzaEf)+'. <b>Največ za klik:</b> '+e(l.maxCPC)+' pri CVR '+p1(n(kk.cvr))+'. '+
      (l.profit>0?'Pri teh predvidevanjih zaslužiš '+e(l.profit)+' na dan.':'Pri teh predvidevanjih izgubiš '+e(-l.profit)+' na dan — popravi CVR, CPC ali ceno izdelka.')+'</p>'
    : '<p class="note">Vpiši budget, CPM, CTR in CVR. Če imaš samo CPC: CPM = CPC × CTR × 10.</p>';

  var cilj=Math.max(0,n(kk.cilj));
  var cpaZa=isFinite(l.cpa)&&l.cpa>0?l.cpa:(n(p.predvidenCPA)||ek.beCPA*0.7);
  var oB=cilj*cpaZa;
  var oK=n(kk.cvr)>0?cilj/(n(kk.cvr)/100):NaN;
  var oI=isFinite(oK)&&n(kk.ctr)>0?oK/(n(kk.ctr)/100):NaN;
  var oP=cilj*(ek.marzaEf-cpaZa);
  put("obudget",e(oB));put("okliki",i0(oK));put("oimpr",i0(oI));put("oprofit",e(oP),znak(oP));
  el("obr-note").innerHTML=cilj>0
    ? 'Za <b>'+nf1.format(cilj)+'</b> prodaj na dan pri CPA '+e(cpaZa)+' rabiš '+e(oB)+' budgeta dnevno, kar je '+e(oB*30)+' na mesec. '+
      'Mesečni profit: <b>'+e(oP*30-n(p.fiksniMesecni))+'</b> (po fiksnih stroških '+e(n(p.fiksniMesecni))+').'
    : 'Vpiši, koliko kosov na dan želiš prodati.';

  el("obc").innerHTML=[0.5,0.75,1,1.25,1.5,2].map(function(m){
    var cpa=cpaZa*m, budget=n(kk.budget)||n(p.dnevniBudget);
    var nar=cpa>0?budget/cpa:NaN, pd=isFinite(nar)?nar*(ek.marzaEf-cpa):NaN;
    return '<tr'+(m===1?' class="mark"':'')+'><td>'+e(cpa)+(m===1?" (zdaj)":"")+'</td><td>'+(isFinite(nar)?nf1.format(nar):"—")+'</td>'+
      '<td class="'+znak(pd)+'">'+e(pd)+'</td><td class="'+znak(pd*30)+'">'+e(pd*30)+'</td><td>'+x2(cpa>0?ek.bruto/cpa:NaN)+'</td></tr>';
  }).join("");
}

/* ============ POGLED: vodnik ============ */
function renderVodnik(){
  el("v-vodnik").innerHTML=
  '<div class="block"><header><h2>Kako se uporablja</h2><p>Petminutno branje, potem ti ni več treba.</p></header><div class="pad">'+
    '<ul class="check">'+
      '<li><b>1 — Projekti.</b> Naredi mapo za stranko ali znamko, v njej izdelke. Vse ostalo dela na izdelku, ki ga izbereš zgoraj.</li>'+
      '<li><b>2 — Ekonomika izdelka.</b> Vpiši ceno in vse stroške na eno naročilo. Dobiš maržo, break-even CPA in break-even ROAS. Brez teh treh številk je vse ostalo ugibanje.</li>'+
      '<li><b>3 — Kreative.</b> Za vsako idejo svoja kreativa: kot, publika, hook, tekst, naložene slike in videi, design brief, budget. Števci znakov povedo, kdaj se tekst skrajša.</li>'+
      '<li><b>4 — Načrt.</b> Vpiši CPM, CTR in CVR, ki jih pričakuješ. Vidiš, ali bi kreativa sploh lahko bila dobičkonosna, še preden jo posnameš.</li>'+
      '<li><b>5 — Rezultati.</b> Ko oglas teče, prepiši porabo, prikaze, klike in naročila. Aplikacija primerja dejanski CPA z break-even in ti reče, ali skalirati ali ubiti.</li>'+
      '<li><b>6 — Kalkulator.</b> Hitri what-if in obrnjeno vprašanje: koliko budgeta za X prodaj na dan.</li>'+
    '</ul>'+
  '</div></div>'+
  '<div class="block"><header><h2>Kaj pomeni katera številka</h2></header><div class="scroll"><table>'+
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
  '<div class="block"><header><h2>Omejitve besedila po platformah</h2><p>Priporočene dolžine, preden se tekst skrajša.</p></header><div class="scroll"><table>'+
    '<thead><tr><th>Platforma</th><th>Glavno besedilo</th><th>Naslov</th><th>Opis</th></tr></thead><tbody>'+
    [["Facebook / Instagram","125","40","30"],["TikTok","100","—","—"],["YouTube","100","—","—"],["Google Search (RSA)","—","30 × do 15","90 × do 4"]]
    .map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td></tr>';}).join("")+
    '</tbody></table></div>'+
    '<div class="pad"><p class="note">Platforme te omejitve občasno spremenijo. Če ti vmesnik pokaže drugo številko, velja njegova.</p></div></div>'+
  '<div class="block"><header><h2>Kako se štejejo vračila</h2></header><div class="pad"><p class="note">'+
    'Pri vračilu izgubiš prihodek naročila, dostavo, embalažo in provizijo pa si že plačal. Zato je efektivna marža '+
    '<b>marža × (1 − stopnja vračil) − stopnja vračil × (dostava + embalaža + provizija)</b>. Nabavna cena se pri vračilu ne šteje kot izguba, ker izdelek dobiš nazaj. '+
    'Če pri tebi izdelek ni več prodajen (higiena, poškodba), prištej nabavno ceno v polje „Ostalo na naročilo“.'+
  '</p></div></div>';
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
        sb=window.supabase.createClient(String(CFG.url).trim(),String(CFG.anonKey).trim(),
          {auth:{persistSession:true,autoRefreshToken:true,flowType:"implicit"}});
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
  function sinhroniziraj(){
    if(!sb||!user)return;
    potegni().then(function(vrstica){
      if(!vrstica)return porini().then(function(){toast("Podatki poslani v oblak.");});
      var oblakCas=new Date(vrstica.spremenjeno).getTime();
      var lokalnoCas=S.spremenjeno?new Date(S.spremenjeno).getTime():0;
      if(oblakCas>lokalnoCas){prevzemi(vrstica);toast("Naloženo iz oblaka ("+cas(vrstica.spremenjeno)+").");}
      else if(lokalnoCas>oblakCas){porini().then(function(){toast("Poslano v oblak (lokalno je novejše).");});}
      else{zadnjaSink=vrstica.spremenjeno;osveziPanel();toast("Že usklajeno.");}
    },function(err){stanjeNapake=napakaTabele(err);osveziPanel();toast(stanjeNapake);});
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
  function osveziPanel(){if(view==="podatki")renderOblakPanel();}
  return {init:init,prijava:prijava,odjava:odjava,sinhroniziraj:sinhroniziraj,porini:porini,potegni:potegni,
    prevzemi:prevzemi,zaLezi:zaLezi,status:status,nastavljen:nastavljen,
    prijavljen:function(){return !!user;},zadnja:function(){return zadnjaSink;}};
})();

var SQL=
"create table if not exists public.stanje (\n"+
"  uporabnik   uuid primary key references auth.users(id) on delete cascade,\n"+
"  podatki     jsonb not null default '{}'::jsonb,\n"+
"  spremenjeno timestamptz not null default now()\n"+
");\n\n"+
"alter table public.stanje enable row level security;\n\n"+
"create policy \"berem svoje\"     on public.stanje for select using (auth.uid() = uporabnik);\n"+
"create policy \"vstavim svoje\"   on public.stanje for insert with check (auth.uid() = uporabnik);\n"+
"create policy \"posodobim svoje\" on public.stanje for update using (auth.uid() = uporabnik) with check (auth.uid() = uporabnik);";

function renderOblakPanel(){
  var t=el("cloud-body");if(!t)return;
  var st=Oblak.status();
  var barva={ni:"var(--ink3)",cakam:"var(--warn)",odjavljen:"var(--warn)",ok:"var(--pos)",napaka:"var(--neg)"}[st.stopnja];
  var glava='<p class="note" style="margin-top:0"><span class="dot" style="color:'+barva+'"></span><b>'+esc(st.besedilo)+'</b>'+
    (Oblak.zadnja()?' · zadnja sinhronizacija '+cas(Oblak.zadnja()):'')+'</p>';
  if(!Oblak.nastavljen()){
    t.innerHTML=glava+
      '<p class="note">Sinhronizacija med napravami je vgrajena, manjkata samo dva podatka. Ko jih vpišeš, so vsi projekti, izdelki in kreative enaki na telefonu in računalniku. <b>Naložene slike in videi se ne sinhronizirajo</b> — ostanejo v napravi, kjer si jih naložil.</p>'+
      '<ol class="steps" style="margin-top:12px">'+
        '<li>Naredi brezplačen projekt na <code>supabase.com</code>.</li>'+
        '<li>V SQL Editor prilepi in zaženi to:<pre>'+esc(SQL)+'</pre></li>'+
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
      '<p class="note" style="margin-top:12px">Geslo gre neposredno v tvojo Supabase bazo, ta stran ga nikjer ne hrani. Po prijavi ostaneš prijavljen v tej napravi.</p>';
    return;
  }
  t.innerHTML=glava+
    '<div class="row"><button class="btn btn-p" id="ob-sync">Sinhroniziraj zdaj</button>'+
    '<button class="btn" id="ob-push">Prepiši oblak z lokalnim</button>'+
    '<button class="btn" id="ob-pull">Prepiši lokalno z oblakom</button>'+
    '<button class="btn" id="ob-out">Odjava</button></div>'+
    '<p class="note" style="margin-top:12px">Spremembe se same pošljejo v oblak nekaj sekund po vnosu. „Sinhroniziraj zdaj“ primerja časa in obdrži novejšo različico. Naložene slike in videi ostanejo lokalni.</p>';
}

/* ============ POGLED: podatki ============ */
function renderPodatki(){
  el("v-podatki").innerHTML=
  '<div class="block" id="cloud-block"><header><h2>Oblačno shranjevanje</h2><p>Isti podatki na telefonu in računalniku.</p></header>'+
    '<div class="pad" id="cloud-body"></div></div>'+
  '<div class="block"><header><h2>Ta naprava</h2></header><div class="pad">'+
    '<p class="note">Besedila in izračuni se samodejno shranijo v brskalnik, naložene slike in videi pa v ločeno shrambo iste naprave. Deluje tudi brez interneta. '+
    'Če pobrišeš podatke brskalnika ali odpreš stran v anonimnem oknu, je vse to izgubljeno — zato občasno izvozi.<br>'+
    '<b>Zadnja sprememba:</b> '+cas(S.spremenjeno)+'</p>'+
    '<div id="prostor" class="note" style="margin-top:10px">Preverjam zasedenost shrambe …</div>'+
    '<div class="row" style="margin-top:14px">'+
      '<button class="btn btn-p" id="exp">Izvozi besedila (JSON)</button>'+
      '<button class="btn" id="impBtn">Uvozi iz datoteke</button>'+
      '<input type="file" id="impFile" accept=".json,application/json" hidden>'+
      '<button class="btn" id="prn">Natisni / PDF</button>'+
    '</div>'+
    '<p class="note" style="margin-top:10px">Izvoz vsebuje projekte, izdelke, kreative in vse številke — <b>ne pa naloženih slik in videov</b>, ker so za JSON preveliki. Te po potrebi prenesi posamično iz kreative.</p>'+
    '<div class="f" style="margin-top:18px"><label for="paste">Ali prilepi vsebino izvožene datoteke sem in klikni Uvozi</label>'+
      '<textarea id="paste" rows="4" placeholder=\'{"v":2,"projekti":[…]}\'></textarea>'+
      '<div class="row" style="margin-top:8px"><button class="btn" id="impPaste">Uvozi prilepljeno</button></div></div>'+
  '</div></div>'+
  '<div class="block"><header><h2>Namesti na telefon</h2></header><div class="pad">'+
    '<p class="note"><b>Android / Chrome:</b> meni ⋮ → „Dodaj na začetni zaslon“. <b>iPhone / Safari:</b> gumb za deljenje → „Dodaj na domači zaslon“. '+
    'Odpre se kot aplikacija, brez naslovne vrstice, in dela tudi brez signala.</p>'+
  '</div></div>'+
  '<div class="block"><header><h2>Počisti</h2></header><div class="pad">'+
    '<p class="note">Izbriše vse projekte, izdelke, kreative in naložene datoteke iz te naprave. Prej izvozi, če želiš obdržati. Če je vklopljen oblak, se prazno stanje pošlje tudi tja.</p>'+
    '<div class="row" style="margin-top:12px"><button class="btn btn-d" id="reset">Pobriši vse in začni znova</button></div>'+
  '</div></div>';
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
function uvozi(txt){
  var d;
  try{d=JSON.parse(txt);}catch(err){toast("To ni veljaven JSON.");return;}
  if(!d||!d.izdelki||!d.izdelki.length){toast("V datoteki ni izdelkov.");return;}
  S=d;migriraj();
  odprtaKreativa=null;shrani();polniIzbirnik();render();
  toast("Uvoženo: "+S.projekti.length+" map, "+S.izdelki.length+" izdelkov.");
}

/* ============ brief ============ */
function briefText(k){
  var p=P(),plat=(PLATFORME.filter(function(x){return x[0]===k.platforma;})[0]||["","?"])[1];
  var L=[];
  L.push(k.naslov);L.push("Mapa: "+PR().ime+" · Izdelek: "+p.ime);
  L.push("Platforma: "+plat+" · Format: "+k.format+" · Status: "+k.status);L.push("");
  if(k.kot)L.push("KOT: "+k.kot);
  if(k.publika)L.push("PUBLIKA: "+k.publika);
  L.push("");
  if(k.platforma==="google"){
    L.push("NASLOVI:");k.naslovi.forEach(function(s,i){if(s)L.push("  "+(i+1)+". "+s);});
    L.push("OPISI:");k.opisi.forEach(function(s,i){if(s)L.push("  "+(i+1)+". "+s);});
    if(k.kljucneBesede)L.push("KLJUČNE BESEDE: "+k.kljucneBesede);
  }else{
    if(k.hook)L.push("HOOK: "+k.hook);
    if(k.primarni){L.push("");L.push("PRIMARNO BESEDILO:");L.push(k.primarni);}
    if(k.naslovi[0])L.push("NASLOV: "+k.naslovi[0]);
    if(k.opisi[0])L.push("OPIS: "+k.opisi[0]);
    L.push("CTA: "+k.cta);
  }
  if(k.url)L.push("URL: "+k.url);
  if(k.design){L.push("");L.push("DESIGN BRIEF:");L.push(k.design);}
  if(k.stDatotek)L.push("MATERIAL: "+k.stDatotek+" naloženih datotek");
  L.push("");L.push("BUDGET: "+e(n(k.budget))+" / dan");
  var ek=ekon(p),l=lijak(k.budget,k.cpm,k.ctr,k.cvr,ek);
  L.push("NAČRT: CPM "+e(n(k.cpm))+" · CTR "+p1(n(k.ctr))+" · CVR "+p1(n(k.cvr))+" → CPA "+e(l.cpa)+" · profit/dan "+e(l.profit));
  L.push("BREAK-EVEN: CPA "+e(ek.beCPA)+" · ROAS "+x2(ek.beROAS));
  if(k.opombe){L.push("");L.push("OPOMBE: "+k.opombe);}
  return L.join("\n");
}
function kopiraj(txt){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){toast("Brief kopiran.");},function(){rocnoKopiraj(txt);});
  }else rocnoKopiraj(txt);
}
function rocnoKopiraj(txt){
  var ta=document.createElement("textarea");
  ta.value=txt;ta.setAttribute("readonly","");
  ta.style.cssText="position:fixed;left:8px;bottom:70px;width:calc(100% - 16px);height:120px;z-index:70";
  document.body.appendChild(ta);ta.select();
  var ok=false;try{ok=document.execCommand("copy");}catch(err){}
  if(ok){document.body.removeChild(ta);toast("Brief kopiran.");}
  else{toast("Kopiraj ročno iz polja spodaj.");setTimeout(function(){if(ta.parentNode)ta.parentNode.removeChild(ta);},15000);}
}

/* ============ render / navigacija ============ */
var RENDER={projekti:renderProjekti,pregled:renderPregled,ekonomika:renderEkon,kreative:renderKreative,
  kalkulator:renderKalk,vodnik:renderVodnik,podatki:renderPodatki};
function render(){
  qa(".view").forEach(function(s){s.hidden=true;});
  qa(".tab").forEach(function(t){t.setAttribute("aria-selected",t.dataset.v===view?"true":"false");});
  el("v-"+view).hidden=false;
  RENDER[view]();
}
function paint(){
  if(view==="ekonomika")paintEkon();
  else if(view==="kreative"&&odprtaKreativa&&K())paintKreativa();
  else if(view==="kalkulator")paintKalk();
  else if(view==="pregled")renderPregled();
}
function nastaviView(v){
  view=v;if(view!=="kreative")odprtaKreativa=null;
  render();window.scrollTo(0,0);
  try{location.hash=v;}catch(err){}
}
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
  shrani();polniIzbirnik();nastaviView("ekonomika");toast("Izdelek dodan.");
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
    shrani();paintKreativa();
  }else if(t.dataset.k!=null){
    S.kalk[t.dataset.k]=t.value;shrani();paintKalk();
  }
});
document.addEventListener("change",function(ev){
  var t=ev.target;
  if(t.id==="impFile"){
    var f=t.files&&t.files[0];if(!f)return;
    var r=new FileReader();
    r.onload=function(){uvozi(String(r.result));};
    r.onerror=function(){toast("Datoteke ni bilo mogoče prebrati.");};
    r.readAsText(f);t.value="";return;
  }
  if(t.id==="dfile"){dodajDatoteke(t.files);t.value="";return;}
  if(t.dataset.move!=null){
    var cilj=t.value;if(!cilj)return;
    var izd=S.izdelki.filter(function(x){return x.id===t.dataset.move;})[0];
    if(!izd)return;
    izd.projekt=cilj;
    if(S.aktiven===izd.id)S.aktiven=null;
    shrani();polniIzbirnik();render();toast("Premaknjeno v „"+(S.projekti.filter(function(x){return x.id===cilj;})[0]||{}).ime+"“.");
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
    shrani();paint();
  }else if(t.dataset.c!=null&&t.tagName==="SELECT"){
    var k2=K();if(!k2)return;
    set(k2,t.dataset.c,t.value);shrani();
    if(t.dataset.c==="platforma")renderEditor();else paintKreativa();
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
  var add=t.closest("[data-add]");
  if(add){
    var p3=P();if(!p3)return;
    var nk=novaKreativa(add.dataset.add);p3.kreative.push(nk);odprtaKreativa=nk.id;
    shrani();view="kreative";render();window.scrollTo(0,0);return;
  }
  var addk=t.closest("[data-addk]");
  if(addk){
    var izd2=S.izdelki.filter(function(x){return x.id===addk.dataset.addk;})[0];
    if(!izd2)return;
    var nk2=novaKreativa("facebook");izd2.kreative.push(nk2);
    S.aktivenProjekt=izd2.projekt;S.aktiven=izd2.id;odprtaKreativa=nk2.id;
    shrani();polniIzbirnik();nastaviView("kreative");return;
  }
  var addi=t.closest("[data-addi]");
  if(addi){dodajIzdelek(addi.dataset.addi);return;}

  var hook=t.closest("[data-hook]");
  if(hook){
    var kk=K();if(!kk)return;
    var txt=HOOKI[parseInt(hook.dataset.hook,10)];
    kk.hook=kk.hook?kk.hook+"\n"+txt:txt;
    var fh=el("c-hook");
    if(fh){fh.value=kk.hook;var c2=q('[data-cnt="hook"]');
      if(c2){c2.textContent=kk.hook.length+" / 80";c2.classList.toggle("over",kk.hook.length>80);}
      fh.focus();}
    shrani();return;
  }
  var pick=t.closest("[data-pick]");
  if(pick){
    var izd3=S.izdelki.filter(function(x){return x.id===pick.dataset.pick;})[0];
    if(!izd3)return;
    S.aktivenProjekt=izd3.projekt;S.aktiven=izd3.id;odprtaKreativa=null;
    shrani();polniIzbirnik();nastaviView("pregled");return;
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
    brisiDatotekeKreativ(izd5.kreative);
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
    S.izdelki=S.izdelki.filter(function(x){return x.projekt!==pid;});
    S.projekti=S.projekti.filter(function(x){return x.id!==pid;});
    if(!S.projekti.length)S.projekti=[novProjekt("Moj projekt")];
    if(S.aktivenProjekt===pid){S.aktivenProjekt=S.projekti[0].id;S.aktiven=null;}
    odprtaKreativa=null;shrani();polniIzbirnik();render();toast("Mapa izbrisana.");return;
  }
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

  switch(t.id){
    case "back": odprtaKreativa=null;pocistiUrlje();render();window.scrollTo(0,0);break;
    case "copy": kopiraj(briefText(K()));break;
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
      P().kreative=P().kreative.filter(function(x){return x.id!==kd.id;});
      odprtaKreativa=null;pocistiUrlje();shrani();render();toast("Izbrisano.");break;
    }
    case "exp": izvozi();break;
    case "impBtn": el("impFile").click();break;
    case "impPaste": uvozi(el("paste").value);break;
    case "prn": window.print();break;
    case "prnew": dodajProjekt();break;
    case "pnew3": dodajIzdelek();break;
    case "reset": {
      if(!confirm("Pobrišem prav vse podatke in datoteke iz te naprave?"))break;
      if(Datoteke.naVoljo)Datoteke.pocisti().catch(function(){});
      S=seed();S.izdelki=[];S.projekti=[novProjekt("Moj projekt")];S.aktivenProjekt=S.projekti[0].id;
      S.aktiven=null;S.kalk=privzetiKalk();migriraj();
      odprtaKreativa=null;pocistiUrlje();shrani();polniIzbirnik();nastaviView("projekti");toast("Vse pobrisano.");break;
    }
    case "ob-in": Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,false);break;
    case "ob-nov": Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,true);break;
    case "ob-out": Oblak.odjava();break;
    case "ob-sync": Oblak.sinhroniziraj();break;
    case "ob-push": if(confirm("Prepišem podatke v oblaku s tem, kar je v tej napravi?"))Oblak.porini().then(function(){toast("Oblak posodobljen.");},function(){toast("Pošiljanje ni uspelo.");});break;
    case "ob-pull": if(confirm("Prepišem podatke v tej napravi s tem, kar je v oblaku?"))Oblak.potegni().then(function(v){if(v)Oblak.prevzemi(v);else toast("V oblaku še ni ničesar.");},function(){toast("Branje ni uspelo.");});break;
  }
});
document.addEventListener("keydown",function(ev){
  if(ev.key!=="Enter")return;
  var id=ev.target&&ev.target.id;
  if(id==="ob-mail"||id==="ob-geslo"){ev.preventDefault();Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,false);}
});

/* povleci in spusti + prilepi */
function vlecemoDatoteke(ev){
  var ty=ev.dataTransfer&&ev.dataTransfer.types;
  return !!ty&&Array.prototype.indexOf.call(ty,"Files")>=0;
}
document.addEventListener("dragover",function(ev){
  var d=el("drop");
  if(!d||!vlecemoDatoteke(ev))return;
  ev.preventDefault();
  if(ev.target.closest("#drop"))d.classList.add("nad");
});
document.addEventListener("dragleave",function(ev){
  var d=el("drop");if(d&&!ev.relatedTarget)d.classList.remove("nad");
});
document.addEventListener("drop",function(ev){
  var d=el("drop");
  if(!d||!vlecemoDatoteke(ev))return;
  ev.preventDefault();d.classList.remove("nad");
  if(ev.dataTransfer.files&&ev.dataTransfer.files.length)dodajDatoteke(ev.dataTransfer.files);
});
document.addEventListener("paste",function(ev){
  if(!el("drop")||!K())return;
  var it=ev.clipboardData&&ev.clipboardData.files;
  if(!it||!it.length)return;
  dodajDatoteke(it);
});

/* ============ zagon ============ */
var zac=String(location.hash||"").replace("#","");
if(RENDER[zac])view=zac;
polniIzbirnik();
render();
Oblak.init();

if("serviceWorker" in navigator){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  });
}
})();
