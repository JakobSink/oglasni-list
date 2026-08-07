/* Oglasni list · stanje.js
   Stikala, tvorba zapisov, primer ob prvem zagonu, migracije starih
   stanj ter branje in shranjevanje v localStorage.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

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

/* ============ koš ============
   Brisanje mape, izdelka ali kreative ni več dokončno. Zapis gre v koš, kjer
   30 dni čaka, datoteke pa se pobrišejo šele ob dokončnem čiščenju. Edina
   varovalka je bila prej okence „ali si prepričan“, en napačen dotik na telefonu
   pa je odnesel mapo z vsem, kar je bilo v njej — in sled brisanja je to
   raznesla še vsem v ekipi.

   Vrnitev iz koša ne more samo pobrisati sledi brisanja: kolega jo ima še vedno
   pri sebi in bi ob naslednjem zlivanju zapis spet ubil. Zato vsaka vrnitev
   pusti svojo oznako v `S.vrnjeno`. Pri zlivanju za vsak id pogledamo, kaj je
   novejše — brisanje ali vrnitev.                                            */
var KOS_DNI=30;
function kosSeznam(){return Array.isArray(S.kos)?S.kos:[];}
function oznaciVrnjeno(id){
  if(!Array.isArray(S.vrnjeno))S.vrnjeno=[];
  var zdaj=new Date().toISOString();
  var obstoj=S.vrnjeno.filter(function(x){return x.id===id;})[0];
  if(obstoj)obstoj.kdaj=zdaj;
  else S.vrnjeno.push({id:id,kdaj:zdaj});
  /* svojo sled brisanja pri tem lahko umaknemo — tujo prebije oznaka vrnitve */
  if(Array.isArray(S.brisano))S.brisano=S.brisano.filter(function(x){return x.id!==id;});
}
function vKos(kaj,ime,opis,zapisi,idji){
  if(!Array.isArray(S.kos))S.kos=[];
  S.kos.unshift({id:uid(),kaj:kaj,ime:ime,opis:opis||"",kdaj:new Date().toISOString(),
    zapisi:JSON.parse(JSON.stringify(zapisi)),idji:idji.slice()});
  idji.forEach(sledBrisanja);
  /* koš ni arhiv — več kot 50 zapisov je znak, da nekaj ni v redu */
  if(S.kos.length>50)S.kos=S.kos.slice(0,50);
}
function kosVrstica(id){return kosSeznam().filter(function(x){return x.id===id;})[0]||null;}
/* Posnetek celega stanja kot en zapis v košu. Uporabi ga „Uvozi in zamenjaj“,
   edino dejanje, ki v enem koraku odnese vse. Koša samega vanj ne shranjujemo —
   sicer bi se posnetki gnezdili en v drugem in stanje bi podivjalo.         */
function posnetekStanja(ime){
  var kopija=JSON.parse(JSON.stringify(S));
  delete kopija.kos;
  var stK=(kopija.izdelki||[]).reduce(function(a,x){return a+(x.kreative||[]).length;},0);
  return {id:uid(),kaj:"stanje",ime:ime||"Posnetek stanja",
    opis:steviloIn((kopija.projekti||[]).length,"mapa","mapi","mape","map")+" · "+
      steviloIn((kopija.izdelki||[]).length,"izdelek","izdelka","izdelki","izdelkov")+" · "+
      steviloIn(stK,"kreativa","kreativi","kreative","kreativ"),
    kdaj:new Date().toISOString(),zapisi:{celo:kopija},idji:[]};
}
/* Kaj vse gre stran skupaj z mapo oziroma izdelkom — id-ji za sledi brisanja */
function idjiIzdelka(p){
  return [p.id].concat((p.kreative||[]).map(function(k){return k.id;}));
}
function vrniIzKosa(kosId){
  var v=kosVrstica(kosId);
  if(!v)return null;
  var z=v.zapisi, vrnjenih=0, opozorilo="";
  /* posnetek celega stanja: postavimo ga nazaj v celoti, koš pa preživi — v
     njem so lahko zapisi, ki jih je uporabnik izbrisal že pred posnetkom   */
  if(z.celo){
    var kosNaprej=kosSeznam().filter(function(x){return x.id!==kosId;});
    S=JSON.parse(JSON.stringify(z.celo));
    migriraj();
    S.kos=kosNaprej;
    return {vrnjenih:1,ime:v.ime,opozorilo:""};
  }
  (z.projekti||[]).forEach(function(pr){
    if(S.projekti.some(function(x){return x.id===pr.id;}))return;
    S.projekti.push(pr);vrnjenih++;
  });
  (z.izdelki||[]).forEach(function(p){
    if(S.izdelki.some(function(x){return x.id===p.id;}))return;
    /* če mape ni več, izdelek ne sme izginiti v nič — pristane v odprti mapi */
    if(!S.projekti.some(function(x){return x.id===p.projekt;})){
      p.projekt=S.aktivenProjekt||S.projekti[0].id;
      opozorilo="Prvotne mape ni več, zato je pristal v odprti.";
    }
    S.izdelki.push(p);vrnjenih++;
  });
  if(z.kreativa){
    var cilj=S.izdelki.filter(function(x){return x.id===z.kreativa.izdelek;})[0];
    if(!cilj)opozorilo="Izdelka, s katerega je bila, ni več — kreative ni bilo mogoče vrniti.";
    else if(!cilj.kreative.some(function(x){return x.id===z.kreativa.zapis.id;})){
      cilj.kreative.push(z.kreativa.zapis);vrnjenih++;
    }
  }
  v.idji.forEach(oznaciVrnjeno);
  S.kos=kosSeznam().filter(function(x){return x.id!==kosId;});
  return {vrnjenih:vrnjenih,ime:v.ime,opozorilo:opozorilo};
}
/* Dokončno: zapis iz koša ven, z njim pa še datoteke, ki smo jih do zdaj hranili. */
function izKosaZaVedno(kosId){
  var v=kosVrstica(kosId);
  if(!v)return Promise.resolve(false);
  S.kos=kosSeznam().filter(function(x){return x.id!==kosId;});
  var p=Promise.resolve();
  (v.zapisi.izdelki||[]).forEach(function(izd){
    p=p.then(function(){return brisiDatotekeIzdelka(izd);});
  });
  if(v.zapisi.kreativa)
    p=p.then(function(){return brisiDatotekeKreativ([v.zapisi.kreativa.zapis]);});
  return p.then(function(){return true;},function(){return true;});
}
/* Ob zagonu: kar je v košu več kot 30 dni, gre dokončno stran. */
function pociStiKos(){
  var meja=Date.now()-KOS_DNI*24*3600*1000;
  var stari=kosSeznam().filter(function(x){
    var t=new Date(x.kdaj).getTime();
    return isFinite(t)&&t<meja;
  });
  if(!stari.length)return Promise.resolve(0);
  var p=Promise.resolve();
  stari.forEach(function(x){p=p.then(function(){return izKosaZaVedno(x.id);});});
  return p.then(function(){return stari.length;});
}

function novProjekt(ime){return {id:uid(),ime:ime||"Nov projekt",opis:"",zapiski:""};}
/* Vrstni red map je vrstni red v seznamu — enako kot pri različicah besedila in
   kreativah. Posebnega polja za vrstni red namenoma ni: zlivanje v oblaku vzame
   vrstni red naše strani (`zlij` gradi po seznamu `a`), zato preurejanje ostane
   na tej napravi in kolegu ne premeče map med delom.                        */
function premakniMapo(id,smer){
  var pr=S.projekti.filter(function(x){return x.id===id;})[0];
  if(!pr)return false;
  var od=S.projekti.indexOf(pr), doK=od+smer;
  if(od<0||doK<0||doK>=S.projekti.length)return false;
  S.projekti.splice(doK,0,S.projekti.splice(od,1)[0]);
  shrani();
  return true;
}
/* Izdelek v drugo mapo. Vrne ime ciljne mape, da klicatelj ve, kaj sporočiti;
   če izdelka ni ali je že tam, vrne prazno.                                 */
function prestaviIzdelek(iid,pid){
  var izd=S.izdelki.filter(function(x){return x.id===iid;})[0];
  var cilj=S.projekti.filter(function(x){return x.id===pid;})[0];
  if(!izd||!cilj||izd.projekt===pid)return "";
  izd.projekt=pid;
  /* Če je bil to odprt izdelek, gre pogled za njim — drugače bi izginil iz
     seznama in izgledalo bi, da se je izbrisal.                             */
  if(S.aktiven===izd.id)S.aktivenProjekt=pid;
  shrani();
  return cilj.ime;
}
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
    umestitev:privzetaUmestitev(pl,fmt),status:"ideja",statusOd:new Date().toISOString(),
    kot:"",publika:"",tagi:"",
    hooki:[""],primarna:[""],naslovi:[""],opisi:[""],cta:privzetiCTA(pl),
    kljucneBesede:"",url:"",pot1:"",pot2:"",sitelinki:"",design:"",izvajalec:"",rok:"",rokOpomba:"",blokada:"",statusOpomba:"",opombe:"",stDatotek:0,
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
  ["popravki","za popravke"],
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
var VDELU=["brief","snemanje","montaza","pregled","popravki"];

/* ---- faze ----
   Statusov je deset. Na kartici mape ali izdelka jih ni mogoče pokazati tako,
   da bi se dalo kaj razbrati; pet faz pa v hipu pove, koliko je še odprtega in
   koliko že teče. Podrobni status ostane tam, kjer je zanj prostor.         */
var FAZE=[
  ["ideja",       "ideja",       "fz-ideja", ["ideja"]],
  ["vdelu",       "v delu",      "fz-delo",  VDELU],
  ["pripravljeno","pripravljeno","fz-prip",  ["pripravljeno"]],
  ["vzraku",      "v zraku",     "fz-zrak",  ["aktivna","zmagovalka"]],
  ["ustavljeno",  "ustavljeno",  "fz-stop",  ["pavza","ubita"]]
];
/* Kdaj je kreativa prišla v ta status. Brez tega izgleda kreativa, ki dvanajst
   dni visi „za pregled“, enako kot tista od včeraj — prav prva pa je razlog, da
   tabelo sploh odpreš. Starim zapisom časa ne izmišljujemo; pri njih se pač ne
   izpiše nič, dokler se status prvič ne premakne.                           */
function nastaviStatus(k,nov){
  if(!k||k.status===nov)return false;
  k.status=nov;
  k.statusOd=new Date().toISOString();
  return true;
}
function dniOd(iso){
  if(!iso)return null;
  var t=new Date(iso).getTime();
  if(!isFinite(t))return null;
  return Math.max(0,Math.floor((Date.now()-t)/(24*3600*1000)));
}
/* Koliko dni je že v tej fazi — in ali je to predolgo. Meja velja samo za delo
   v teku; kar teče ali je ustavljeno, sme stati poljubno dolgo.             */
var ZASTOJ_DNI=7;
function jeZastoj(k){
  var d=dniOd(k&&k.statusOd);
  return d!=null&&d>=ZASTOJ_DNI&&VDELU.indexOf(k.status)>=0;
}
/* ---- blokade ----
   Oglas pogosto ne čaka na delo, ampak na odgovor: manjka podatek s strani
   stranke, ni ciljne strani, ni odločitve. To ni status — kreativa je lahko
   hkrati „za pregled“ in blokirana — zato je svoje polje. Dokler je zapisano
   samo v zapiskih, se vidi šele, ko odpreš pravi izdelek.                   */
function jeBlokirana(k){return !!(k&&String(k.blokada||"").trim());}
function blokade(kreative){
  return (kreative||[]).filter(jeBlokirana);
}
/* vse blokade v mapi, za seznam na enem mestu */
function blokadeVProjektu(pid){
  var out=[];
  izdelkiVProjektu(pid).forEach(function(p){
    blokade(p.kreative).forEach(function(k){out.push({izdelek:p,kreativa:k});});
  });
  return out;
}

/* ---- rok ----
   Rok je bil prosto besedilo („do petka“), zato ga ni bilo mogoče primerjati z
   ničimer in zamude ni bilo mogoče pokazati. Zdaj je `rok` datum (YYYY-MM-DD),
   `rokOpomba` pa to, kar je bilo prej vpisano z besedami — migracija ju loči,
   da se nič ne izgubi.                                                       */
function jeDatum(s){return /^\d{4}-\d{2}-\d{2}$/.test(String(s||"").trim());}
function datumSlo(iso){
  if(!jeDatum(iso))return String(iso||"");
  var d=new Date(iso+"T00:00:00");
  if(isNaN(d.getTime()))return String(iso);
  return d.toLocaleDateString("sl-SI",{day:"numeric",month:"numeric",year:"numeric"});
}
function danesISO(){
  var d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
/* zamuja = rok je za nami, kreativa pa še ni ne v zraku ne ustavljena */
function jeZamuda(k){
  if(!k||!jeDatum(k.rok))return false;
  if(jeVZraku(k)||k.status==="pavza"||k.status==="ubita")return false;
  return k.rok<danesISO();
}
function fazaStatusa(s){
  for(var i=0;i<FAZE.length;i++)if(FAZE[i][3].indexOf(s)>=0)return FAZE[i][0];
  return "ideja";
}
function fazeStevila(kreative){
  var st={};FAZE.forEach(function(f){st[f[0]]=0;});
  (kreative||[]).forEach(function(k){st[fazaStatusa(k.status)]++;});
  st.skupaj=(kreative||[]).length;
  /* odprto = kar še ni v zraku in ni ustavljeno; to je delo, ki nekje čaka */
  st.odprto=st.ideja+st.vdelu+st.pripravljeno;
  return st;
}
/* vse kreative v mapi, za sliko celega projekta na eni kartici */
function kreativeVProjektu(pid){
  return izdelkiVProjektu(pid).reduce(function(a,x){return a.concat(x.kreative||[]);},[]);
}
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
  if(!Array.isArray(S.kos))S.kos=[];
  if(!Array.isArray(S.vrnjeno))S.vrnjeno=[];
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
      if(typeof k.rokOpomba!=="string")k.rokOpomba="";
      if(typeof k.blokada!=="string")k.blokada="";
      if(typeof k.statusOpomba!=="string")k.statusOpomba="";
      /* rok je zdaj datum; kar je bilo vpisano z besedami („do petka“), se
         preseli v opombo — nič se ne izgubi, primerjati pa se da datum      */
      if(k.rok&&!jeDatum(k.rok)){
        k.rokOpomba=k.rokOpomba?k.rokOpomba+" · "+k.rok:k.rok;
        k.rok="";
      }
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
  S.v=6;
}

/* Stanje se ne bere tukaj, ampak v zagon.js — migracija sega tudi v kodo iz
   poznejših datotek (na primer cgpBarve), zato mora teči šele, ko je vse
   naloženo. Tu ostane samo napoved spremenljivk.                          */
var S=null;
function naloziStanje(){
  try{var raw=localStorage.getItem(LS);S=raw?JSON.parse(raw):null;}catch(err){S=null;}
  if(!S||!S.izdelki||!S.izdelki.length)S=seed();
  migriraj();
}

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
