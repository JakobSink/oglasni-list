/* Oglasni list · dogodki.js
   Navigacija med pogledi, tema in vsi poslušalci dogodkov.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

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
  /* Vzorec ARIA za zavihke: v seznam se s tabulatorjem vstopi enkrat, med
     zavihki pa se premikaš s puščicami — zato ima izbrani tabindex 0, ostali
     -1. Brez tega mora bralnik zaslona pretipkati vse zavihke.              */
  qa(".tab").forEach(function(t){
    var izbran=t.dataset.v===view;
    t.setAttribute("aria-selected",izbran?"true":"false");
    t.tabIndex=izbran?0:-1;
  });
  el("v-"+view).hidden=false;
  RENDER[view]();
  osveziNaslov();
}
function paint(){
  if(view==="kreative"&&odprtaKreativa&&K())paintKreativa();
  else if(view==="kalkulator"){paintKalk();if(P()&&imaEkon(P()))paintEkon();}
  else if(view==="pregled")paintPregled();
}
/* ---- tuje spremembe med delom ----
   Ko tiha uskladitev prinese kolegovo delo, je treba pogled osvežiti — a ne
   sredi stavka. Če je fokus v polju, izris počaka, da uporabnik iz njega
   odide; drugače bi mu sinhronizacija med tipkanjem pobrala kurzor.        */
function pisePolje(){
  var a=document.activeElement;
  if(!a)return false;
  return a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.isContentEditable===true;
}
var cakaIzris=false;
function izrisPozneje(){
  if(pisePolje()){cakaIzris=true;return;}
  cakaIzris=false;
  /* Izris zamenja vsebino pogleda in brskalnik pristane na vrhu strani. Kdor
     dela sredi dolgega urejevalnika, je bil ob vsaki tihi uskladitvi vržen iz
     konteksta — zato si položaj zapomnimo in ga vrnemo.                     */
  var y=window.scrollY||document.documentElement.scrollTop||0;
  polniIzbirnik();render();
  if(y)window.scrollTo(0,y);
}
document.addEventListener("focusout",function(){
  if(!cakaIzris)return;
  /* fokus rad skoči v naslednje polje — zato po odhodu pogledamo še enkrat */
  setTimeout(izrisPozneje,0);
});
/* Po zlivanju odprta kreativa morda ne obstaja več, ker jo je kolega izbrisal.
   Če še obstaja, ostane odprta — tiha uskladitev te ne sme vreči iz dela.   */
function obdrziOdprto(){
  if(odprtaKreativa&&!najdiKreativo(odprtaKreativa))odprtaKreativa=null;
}

var IMENA={projekti:"Projekti",pregled:"Pregled",kreative:"Kreative",
  kalkulator:"Kalkulator",podatki:"Podatki in vodnik"};
function nastaviView(v){
  view=pravView(v);if(view!=="kreative")odprtaKreativa=null;
  render();window.scrollTo(0,0);
  osveziMobNaslov();
  zapriMeni();
}
function osveziMobNaslov(){
  var mt=el("mobTitle");if(mt)mt.textContent=IMENA[view]||"Oglasni list";
}

/* ============ naslov in gumb za nazaj ============
   V naslovu je zapisan pogled, pri odprti kreativi pa še ta: `#kreative/<id>`.
   Zato gumb za nazaj v brskalniku dela to, kar uporabnik pričakuje — zapre
   kreativo oziroma se vrne na prejšnji zavihek. Prej je naslov sicer pisalo,
   nihče pa ga ni bral: klik na nazaj je zamenjal naslov, zaslon je ostal isti
   in izgledalo je, da gumb ne dela. Na telefonu je to sistemski gumb, zato je
   iz aplikacije vsakič vrglo ven.

   Naslov pišemo z enega mesta — iz `render()`. Kdor spremeni pogled ali odpre
   kreativo, se mu ni treba spomniti še na naslov; ker pišemo samo, kadar se je
   res spremenil, enako stanje ne naredi novega vnosa v zgodovino, tiha
   uskladitev pa je ne polni.                                                */
function naslovIzStanja(){
  return view==="kreative"&&odprtaKreativa?"kreative/"+odprtaKreativa:view;
}
function osveziNaslov(){
  var zelim="#"+naslovIzStanja();
  if(location.hash===zelim)return;
  /* Prvi zapis ob zagonu gre brez vnosa v zgodovino — drugače bi prvi klik na
     nazaj samo pobrisal lojtro in navzven ne bi naredil nič.                */
  if(!location.hash&&window.history&&history.replaceState){
    try{history.replaceState(null,"",zelim);return;}catch(err){}
  }
  try{location.hash=zelim;}catch(err){}
}
function izNaslova(h){
  var deli=String(h||"").replace(/^#/,"").split("/");
  return {view:pravView(deli[0]),kreativa:deli[0]==="kreative"&&deli[1]?deli[1]:null};
}
function poNaslovu(){
  /* Naslov, ki smo ga pravkar napisali sami, se ujema s stanjem na zaslonu —
     tak dogodek preskočimo. Brez tega bi vsaka menjava pogleda izrisala
     dvakrat: enkrat na klik in enkrat na svoj lasten zapis naslova.         */
  if(location.hash==="#"+naslovIzStanja())return;
  var c=izNaslova(location.hash);
  var najd=c.kreativa?najdiKreativo(c.kreativa):null;
  if(najd){
    /* Kreativa je lahko v drugem izdelku ali celo v drugi mapi — brez tega bi
       se odprla prazna, ker jo `K()` išče samo v odprtem izdelku.           */
    S.aktivenProjekt=najd.izdelek.projekt;S.aktiven=najd.izdelek.id;
    odprtaKreativa=najd.kreativa.id;view="kreative";
    polniIzbirnik();
  }else{
    /* kreative, ki je kolega medtem izbrisal, ne odpiramo — ostane seznam */
    odprtaKreativa=null;view=c.view;
  }
  render();window.scrollTo(0,0);
  osveziMobNaslov();zapriMeni();
}
window.addEventListener("hashchange",poNaslovu);
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
/* puščice premikajo med zavihki, Home in End na prvega oziroma zadnjega */
el("rail").addEventListener("keydown",function(ev){
  var premik={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[ev.key];
  if(!premik&&ev.key!=="Home"&&ev.key!=="End")return;
  var tabi=qa(".tab",this);
  var i=tabi.indexOf(ev.target.closest(".tab"));
  if(i<0)return;
  ev.preventDefault();
  var cilj=ev.key==="Home"?0:ev.key==="End"?tabi.length-1:(i+premik+tabi.length)%tabi.length;
  nastaviView(tabi[cilj].dataset.v);
  var novi=q('.tab[data-v="'+tabi[cilj].dataset.v+'"]');
  if(novi)novi.focus();
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

/* ---- razdelilnik dogodkov ----
   Poslušalci so trije za vso stran, kaj se ob kliku zgodi pa pove tabela. Prej
   je bila to veriga if/else, dolga čez tristo vrstic, kamor se je vsaka nova
   funkcija zapisala nekam v sredino in je ni bilo mogoče najti.

   Vsak vnos je [kaj iščemo, kaj naredimo]. Vrstni red šteje: velja prvo
   ujemanje, tako kot je prej veljala prva veja. Oblike iskanja:
     "data-x"    element ima ta atribut
     "#izbira"   element ustreza temu izbirniku
     "=id"       element ima natanko ta id
   Pri kliku iščemo tudi po prednikih (klik pade na ikono v gumbu), pri input
   in change pa gledamo samo polje, na katerem se je dogodek zgodil.        */
function ujemi(t,kljuc,poPrednikih){
  if(kljuc.charAt(0)==="=")return t.id===kljuc.slice(1)?t:null;
  var izb=kljuc.charAt(0)==="#"?kljuc:"["+kljuc+"]";
  if(poPrednikih)return t.closest?t.closest(izb):null;
  return t.matches&&t.matches(izb)?t:null;
}
function razdeli(tabela,ev,poPrednikih){
  var t=ev.target;
  if(!t)return false;
  for(var i=0;i<tabela.length;i++){
    var c=ujemi(t,tabela[i][0],poPrednikih);
    if(c){tabela[i][1](c,ev);return true;}
  }
  return false;
}

/* ---- pisanje po poljih ---- */
var VNOS=[
  ["data-p",function(t){
    var p=P();if(!p)return;
    set(p,t.dataset.p,t.type==="checkbox"?t.checked:t.value);
    if(t.dataset.p==="ime")polniIzbirnik();
    shrani();paint();
  }],
  ["data-c",function(t){
    var k=K();if(!k)return;
    set(k,t.dataset.c,t.value);
    if(t.dataset.limit){
      var c=q('[data-cnt="'+t.dataset.c+'"]');
      if(c){var L=t.value.length,lim=parseInt(t.dataset.limit,10);
        c.textContent=L+" / "+lim;c.classList.toggle("over",L>lim);}
    }
    shrani();paintKreativa();risiPredogled();
  }],
  ["data-k",function(t){S.kalk[t.dataset.k]=t.value;shrani();paintKalk();}],
  ["=kre-isk",function(t){
    /* Iskanje ni del stanja, zato ne shranjujemo — prerišemo samo seznam
       zadetkov in vrnemo kurzor, da tipkanje ne skače.                     */
    iskanjeKre=t.value;
    var pos=t.selectionStart, box=t.closest(".block");
    if(!box)return;
    box.outerHTML=iskanjeHtml();
    var novo=el("kre-isk");
    if(novo){novo.focus();try{novo.selectionStart=novo.selectionEnd=pos;}catch(err){}}
  }],
  ["=bank-isk",function(t){
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
  }],
  ["data-cgpbarva",function(t){
    var pr=S.projekti.filter(function(x){return x.id===t.dataset.pr;})[0];
    if(!pr)return;
    var pal=cgpPaleta(pr), i=parseInt(t.dataset.i,10);
    if(!pal[i])return;
    pal[i][t.dataset.cgpbarva]=t.value;
    shrani();
    /* ščipalka in polje s kodo kažeta isto barvo, zato ju uskladimo */
    if(t.dataset.cgpbarva!=="hex")return;
    var vrsta=t.closest(".pal-v");
    qa("[data-cgpbarva='hex']",vrsta).forEach(function(o){
      if(o!==t&&/^#[0-9a-fA-F]{6}$/.test(t.value))o.value=t.value;
    });
  }],
  ["data-cgp",function(t){
    var pr=S.projekti.filter(function(x){return x.id===t.dataset.pr;})[0];
    if(!pr)return;
    if(!pr.cgp||typeof pr.cgp!=="object")pr.cgp={};
    pr.cgp[t.dataset.cgp]=t.value;
    shrani();
  }],
  ["data-przap",function(t){
    var pr=S.projekti.filter(function(x){return x.id===t.dataset.przap;})[0];
    if(pr){pr.zapiski=t.value;shrani();}
  }],
  ["data-sgime",function(t){
    var g=stikNajdi(t.dataset.sgime);
    if(g){g.ime=t.value;shrani();}
  }],
  ["data-sgmoz",function(t){
    /* Preimenovanje ene možnosti: vrednost prenesemo povsod, kjer je bila.
       Prazno ime ne sprejmemo — brisanje ima svoj gumb.                     */
    var g=stikNajdi(t.dataset.sgmoz);
    if(!g)return;
    var idx=parseInt(t.dataset.i,10);
    var nova=String(t.value).trim();
    var stara=g.moznosti[idx];
    if(!nova||nova===stara)return;
    if(g.moznosti.indexOf(nova)>=0&&g.moznosti.indexOf(nova)!==idx)return;   /* podvojeno ime */
    g.moznosti[idx]=nova;
    stikPreimenujMoznost(g,stara,nova);
    t.style.width=Math.max(8,Math.min(24,nova.length+3))+"ch";
    shrani();
  }]
];
document.addEventListener("input",function(ev){razdeli(VNOS,ev,false);});

/* ---- izbirniki, stikala in datoteke ---- */
function uvoziIzDatoteke(t){
  var f=t.files&&t.files[0];if(!f)return;
  var nacin=t.id==="impFileAdd"?"dodaj":"zamenjaj";
  var r=new FileReader();
  r.onload=function(){uvozi(String(r.result),nacin);};
  r.onerror=function(){toast("Datoteke ni bilo mogoče prebrati.");};
  r.readAsText(f);t.value="";
}
var IZBIRA=[
  /* izbira oglasov za izvoz */
  ["data-izv",function(t){izvOznake[t.dataset.izv]=t.checked;osveziIzvozStevec();}],
  ["=bank-red",function(t){bankaRed=t.value;renderEditor();}],
  ["=izv-obseg",function(t){
    izvObseg=t.value;
    izvozniSeznam(izvObseg).forEach(function(o){
      if(izvOznake[o.k.id]==null)izvOznake[o.k.id]=o.k.status!=="ubita";
    });
    risiIzvoz();
  }],
  /* radio pri različici → katera gre v predogled */
  ["data-pv",function(t){nastaviIzbor(t.dataset.pv,parseInt(t.dataset.i,10)||0);risiPredogled();}],
  /* izbirnik mape pod kartico izdelka v pogledu Projekti */
  ["data-prmove",function(t){
    var ime=prestaviIzdelek(t.dataset.prmove,t.value);
    if(!ime)return;
    var izd=S.izdelki.filter(function(x){return x.id===t.dataset.prmove;})[0];
    polniIzbirnik();render();
    toast("„"+izd.ime+"“ je zdaj v mapi „"+ime+"“.");
  }],
  ["=impFile",uvoziIzDatoteke],
  ["=impFileAdd",uvoziIzDatoteke],
  ["=dfile",function(t){dodajDatoteke(t.files);t.value="";}],
  ["=dfile-izd",function(t){
    var p=P();
    if(p)dodajDatoteke(t.files,datLastnikIzdelka(p));
    t.value="";
  }],
  ["data-filecgp",function(t){dodajDatoteke(t.files,"cgp:"+t.dataset.filecgp);t.value="";}],
  ["=dfile-ref",function(t){
    var k=K();
    if(k)dodajDatoteke(t.files,datLastnikRef(k));
    t.value="";
  }],
  /* stikalo v uporabi ali umaknjeno s strani */
  ["data-sgakt",function(t){
    var g=stikNajdi(t.dataset.sgakt);
    if(!g)return;
    g.aktivno=t.checked;
    shrani();render();
    toast(t.checked?"Stikalo „"+g.ime+"“ je v uporabi.":"Stikalo „"+g.ime+"“ umaknjeno s strani. Vrednosti ostanejo.");
  }],
  /* „ločena besedila“ pri stikalu: eno stikalo hkrati lahko vodi besedila */
  ["data-loci",function(t){
    var k=K();if(!k)return;
    var g=stikNajdi(t.dataset.loci);
    if(t.checked&&g){
      stikVklopiVodenje(k,g.id);
      shrani();renderEditor();
      toast("Besedila so zdaj ločena po „"+g.ime+"“. Vsaka možnost je začela s kopijo trenutnega besedila.");
    }else{
      k.vodi="";
      shrani();renderEditor();
      toast("Besedilo je zdaj skupno. Že napisane različice ostanejo shranjene.");
    }
  }],
  ["data-p",function(t){
    /* pisanje po tekstovnih poljih obravnava VNOS; tu so samo izbirniki in kljukice */
    if(t.tagName!=="SELECT"&&t.type!=="checkbox")return;
    var p=P();if(!p)return;
    var staraMapa=p.projekt;
    set(p,t.dataset.p,t.type==="checkbox"?t.checked:t.value);
    if(t.dataset.p==="projekt"&&p.projekt!==staraMapa){
      S.aktivenProjekt=p.projekt;S.aktiven=p.id;
      shrani();polniIzbirnik();render();toast("Izdelek premaknjen v drugo mapo.");return;
    }
    /* vklop izračunov spremeni celoten pogled, ne samo številk */
    if(t.dataset.p==="izracuni"){
      shrani();render();
      toast(p.izracuni?"Izračuni vklopljeni.":"Izračuni izklopljeni.");
      return;
    }
    shrani();paint();
  }],
  ["data-c",function(t){
    if(t.tagName!=="SELECT")return;
    var k=K();if(!k)return;
    /* status ni le vrednost — zapomnimo si tudi, kdaj se je premaknil */
    if(t.dataset.c==="status")nastaviStatus(k,t.value);
    else set(k,t.dataset.c,t.value);
    /* platforma potegne za sabo format, umestitev in seznam gumbov */
    if(t.dataset.c==="platforma"){
      if(formatiZa(k.platforma).indexOf(k.format)<0)k.format=formatiZa(k.platforma)[0];
      k.umestitev=privzetaUmestitev(k.platforma,k.format);
      if(ctaSeznam(k.platforma).indexOf(k.cta)<0)k.cta=privzetiCTA(k.platforma);
    }
    if(t.dataset.c==="format"&&!umOK(k.format,k.umestitev))
      k.umestitev=privzetaUmestitev(k.platforma,k.format);
    shrani();
    /* platforma, format in umestitev spremenijo polja, ne samo predogled */
    if(/^(platforma|format|umestitev)$/.test(t.dataset.c))renderEditor();
    else{paintKreativa();risiPredogled();}
  }],

  /* Prestavljanje izdelka med mapami je zdaj izbirnik data-p="projekt" v
     Pregledu; to pravilo je ostalo od starega gumba in nima svojega elementa. */
  ["data-move",function(t){
    var cilj=t.value;if(!cilj)return;
    var izd=S.izdelki.filter(function(x){return x.id===t.dataset.move;})[0];
    if(!izd)return;
    izd.projekt=cilj;
    if(S.aktiven===izd.id)S.aktiven=null;
    shrani();polniIzbirnik();render();
    toast("Premaknjeno v „"+(S.projekti.filter(function(x){return x.id===cilj;})[0]||{}).ime+"“.");
  }]
];
document.addEventListener("change",function(ev){razdeli(IZBIRA,ev,false);});

/* ---- kliki po vsebini ---- */
function premakniVarianto2(g,smer){
  var d=g.dataset[smer<0?"vgor":"vdol"].split(".");
  var i=parseInt(d[1],10);
  if(premakniVarianto(d[0],i,i+smer))renderEditor();
}
function oznaciVseZaIzvoz(vklop){
  izvozniSeznam(izvObseg).forEach(function(o){izvOznake[o.k.id]=vklop;});
  risiIzvoz();
}
var KLIKI=[
  ["data-open",function(g){odprtaKreativa=g.dataset.open;view="kreative";render();window.scrollTo(0,0);}],
  /* gumbi stikal: p = izdelek, k = kreativa, v = pogled nad seznamom */
  ["data-stik",function(g){
    var stik=stikNajdi(g.dataset.sg), nv=g.dataset.sv;
    if(!stik)return;
    if(g.dataset.stik==="v"){stikNastaviPogled(stik.id,nv);shrani();render();return;}
    if(g.dataset.stik==="p"){
      var p=P();if(!p)return;
      if(!p.stikala||typeof p.stikala!=="object")p.stikala={};
      p.stikala[stik.id]=nv;shrani();render();return;
    }
    var k=K();if(!k)return;
    var jeVodeno=stikVodi(k)&&k.vodi===stik.id;
    stikPreklopi(k,stik,nv);
    shrani();renderEditor();
    if(jeVodeno)toast(nv===STIK_VSE?"Besedilo velja za vse možnosti.":"Besedila za „"+nv+"“.");
  }],
  /* dodajanje in brisanje posamezne možnosti */
  ["data-sgmadd",function(g){
    var stik=stikNajdi(g.dataset.sgmadd);
    if(!stik)return;
    var ime="Nova "+(stik.moznosti.length+1);
    while(stik.moznosti.indexOf(ime)>=0)ime+="*";
    stik.moznosti.push(ime);
    shrani();render();
    var vsi=qa('[data-sgmoz="'+stik.id+'"]');
    var zadnji=vsi[vsi.length-1];
    if(zadnji){zadnji.focus();zadnji.select();}
  }],
  ["data-sgmdel",function(g){
    var stik=stikNajdi(g.dataset.sgmdel);
    if(!stik||stik.moznosti.length<=2){toast("Stikalo rabi vsaj dve možnosti.");return;}
    var i=parseInt(g.dataset.i,10);
    var odstranjena=stik.moznosti[i];
    if(!confirm("Odstranim možnost „"+odstranjena+"“?\n\nKreative in izdelki, ki so bili na njej, padejo na „"+stik.moznosti[i===0?1:0]+"“."))return;
    stik.moznosti.splice(i,1);
    stikPreimenujMoznost(stik,odstranjena,stik.moznosti[0]);
    migriraj();shrani();render();
  }],
  ["=sgnew",function(){dodajStikalo("Novo stikalo",["Prva","Druga"]);}],
  ["=sgtrg",function(){dodajStikalo("Trg",["Slovenija","Hrvaška","Slovaška"]);}],
  ["data-sgdel",function(g){brisiStikalo(g.dataset.sgdel);}],
  ["data-add",function(g){
    var p=P();if(!p)return;
    var nk=novaKreativa(g.dataset.add);
    if(p.url)nk.url=p.url;
    stikPodeduj(nk,p);
    p.kreative.push(nk);odprtaKreativa=nk.id;
    shrani();view="kreative";render();window.scrollTo(0,0);
  }],
  ["data-addi",function(g){dodajIzdelek(g.dataset.addi);}],
  /* okno za izvoz v Excel */
  ["data-mdlx",function(){zapriIzvoz();}],
  ["=izv-vse",function(){oznaciVseZaIzvoz(true);}],
  ["=izv-nic",function(){oznaciVseZaIzvoz(false);}],
  ["=izv-go",function(){
    var izb=izvozniSeznam(izvObseg).filter(function(o){return izvOznake[o.k.id];});
    xlsxIzvozi(izb);zapriIzvoz();
  }],
  ["#xlsx",function(){odpriIzvoz();}],
  /* preklop umestitve nad predogledom */
  ["data-um",function(g){
    if(g.disabled)return;
    var k=K();if(!k)return;
    k.umestitev=g.dataset.um;shrani();renderEditor();
  }],
  /* banka hookov → nova različica */
  ["data-hook",function(g){
    var k=K();if(!k)return;
    var izBanke=bankaSeznam().filter(function(h){return h.id===g.dataset.hook;})[0];
    if(!izBanke)return;
    if(!Array.isArray(k.hooki))k.hooki=[""];
    if(k.hooki.length===1&&!String(k.hooki[0]).trim())k.hooki[0]=izBanke.txt;
    else k.hooki.push(izBanke.txt);
    nastaviIzbor("hooki",k.hooki.length-1);
    shrani();renderEditor();toast("Hook dodan kot nova različica.");
  }],
  /* dodajanje in brisanje v banki, izbira kategorije */
  ["=bank-go",function(){
    var polje=el("bank-nov");
    if(!polje||!String(polje.value).trim()){toast("Najprej vpiši hook.");return;}
    bankaDodaj(polje.value,el("bank-kat")&&el("bank-kat").value);
    polje.value="";renderEditor();toast("Shranjeno v banko.");
  }],
  ["data-retry",function(g){delete prenosSpodletel[g.dataset.retry];narisiDatoteke();}],
  ["data-bdel",function(g){
    S.banka=bankaSeznam().filter(function(h){return h.id!==g.dataset.bdel;});
    shrani();renderEditor();
  }],
  ["data-bkat",function(g){bankaKat=g.dataset.bkat;renderEditor();}],
  ["#bank-open",function(){
    bankaOdprta=!bankaOdprta;renderEditor();
    if(bankaOdprta){var bn=el("bank-nov");if(bn)bn.focus();}
  }],
  /* premikanje in dodajanje različic besedila */
  ["data-vgor",function(g){premakniVarianto2(g,-1);}],
  ["data-vdol",function(g){premakniVarianto2(g,1);}],
  ["data-vadd",function(g){
    var k=K();if(!k)return;
    var polje=g.dataset.vadd;
    if(!Array.isArray(k[polje]))k[polje]=[""];
    if(k[polje].length>=25){toast("Dovolj različic — 25 je zgornja meja.");return;}
    k[polje].push("");
    nastaviIzbor(polje,k[polje].length-1);
    shrani();renderEditor();
    var vsi=qa('[data-c="'+polje+'.'+(k[polje].length-1)+'"]');
    if(vsi[0])vsi[0].focus();
  }],
  /* ✕ odstrani različico */
  ["data-vdel",function(g){
    var k=K();if(!k)return;
    var deli=g.dataset.vdel.split("."), pol=deli[0], idx=parseInt(deli[1],10);
    if(!Array.isArray(k[pol])||k[pol].length<=1)return;
    var vsebina=String(k[pol][idx]||"").trim();
    if(vsebina&&!confirm("Odstranim to različico?"))return;
    k[pol].splice(idx,1);
    if(izbrane(k)[pol]>=k[pol].length)izbrane(k)[pol]=0;
    shrani();renderEditor();
  }],
  ["data-pick",function(g){
    var izd=S.izdelki.filter(function(x){return x.id===g.dataset.pick;})[0];
    if(!izd)return;
    S.aktivenProjekt=izd.projekt;S.aktiven=izd.id;odprtaKreativa=null;
    /* klik na izdelek pelje naravnost na kreative — tam se dela */
    shrani();polniIzbirnik();nastaviView("kreative");
  }],
  ["data-prpick",function(g){
    S.aktivenProjekt=g.dataset.prpick;S.aktiven=null;odprtaKreativa=null;
    shrani();polniIzbirnik();render();toast("Mapa izbrana.");
  }],
  ["data-prgor",function(g){
    if(premakniMapo(g.dataset.prgor,-1)){polniIzbirnik();render();}
  }],
  ["data-prdol",function(g){
    if(premakniMapo(g.dataset.prdol,1)){polniIzbirnik();render();}
  }],
  ["data-prrename",function(g){
    var pr=S.projekti.filter(function(x){return x.id===g.dataset.prrename;})[0];
    if(!pr)return;
    var no=prompt("Novo ime mape:",pr.ime);
    if(no==null)return;no=String(no).trim();if(!no)return;
    pr.ime=no;shrani();polniIzbirnik();render();
  }],
  ["data-prdel",function(g){
    var pid=g.dataset.prdel;
    var pr=S.projekti.filter(function(x){return x.id===pid;})[0];if(!pr)return;
    var vsebina=izdelkiVProjektu(pid);
    var stK=vsebina.reduce(function(a,x){return a+(x.kreative||[]).length;},0);
    if(!confirm('Dam mapo "'+pr.ime+'" v koš'+(vsebina.length?' skupaj z '+vsebina.length+' izdelki in '+stK+' kreativami':'')+'?\n\n'+
      'Nič se ne izgubi takoj — '+KOS_DNI+' dni jo lahko vrneš iz koša v zavihku Podatki.'))return;
    /* datotek tu ne brišemo: hranimo jih, dokler zapis leži v košu */
    var idji=[pid];
    vsebina.forEach(function(x){idji=idji.concat(idjiIzdelka(x));});
    vKos("mapa",pr.ime,steviloIn(vsebina.length,"izdelek","izdelka","izdelki","izdelkov")+" · "+steviloIn(stK,"kreativa","kreativi","kreative","kreativ"),
      {projekti:[pr],izdelki:vsebina},idji);
    S.izdelki=S.izdelki.filter(function(x){return x.projekt!==pid;});
    S.projekti=S.projekti.filter(function(x){return x.id!==pid;});
    if(!S.projekti.length)S.projekti=[novProjekt("Moj projekt")];
    if(S.aktivenProjekt===pid){S.aktivenProjekt=S.projekti[0].id;S.aktiven=null;}
    odprtaKreativa=null;shrani();polniIzbirnik();render();
    razveljaviZadnje("Mapa „"+pr.ime+"“ je v košu.");
  }],
  ["data-predslika",function(g){
    var k=K();if(!k)return;
    if(k.predSlika===g.dataset.predslika)return;
    k.predSlika=g.dataset.predslika;
    /* izris na novo, ker se z izbrano sliko spremenijo tudi kljukice ob besedilih */
    shrani();renderEditor();
  }],
  ["data-kosvrni",function(g){vrniInPokazi(g.dataset.kosvrni);}],
  ["data-kosdel",function(g){
    var v=kosVrstica(g.dataset.kosdel);
    if(!v)return;
    if(!confirm('Zavržem „'+v.ime+'“ dokončno?\n\nTega ni več mogoče vrniti, z zapisom gredo tudi naložene slike.'))return;
    izKosaZaVedno(g.dataset.kosdel).then(function(){
      shrani();render();toast("Zavrženo dokončno.");
    });
  }],
  ["data-zoom",function(g){pokaziPovecano(g.dataset.zoom);}],
  ["=lb-x",function(){zapriPovecano();}],
  ["=lb",function(){zapriPovecano();}],
  ["data-dl",function(g){prenesiDatoteko(g.dataset.dl);}],
  ["data-ddel",function(g){
    if(!confirm("Izbrišem to datoteko?"))return;
    Datoteke.brisi(g.dataset.ddel).then(function(){narisiDatoteke();toast("Datoteka izbrisana.");},
      function(){toast("Brisanje ni uspelo.");});
  }],
  ["data-goto",function(g){nastaviView(g.dataset.goto);}],
  ["#drop",function(){el("dfile").click();}],
  ["#drop-izd",function(){el("dfile-izd").click();}],
  ["#sideOblak",function(){
    nastaviView("podatki");
    /* če si prijavljen, klik naredi tudi to, kar od njega pričakuješ */
    if(Oblak.prijavljen())Oblak.sinhroniziraj();
    else setTimeout(function(){var m=el("ob-mail");if(m)m.focus();},60);
  }],
  ["#drop-ref",function(){el("dfile-ref").click();}],
  ["data-cgpbadd",function(g){
    var pr=S.projekti.filter(function(x){return x.id===g.dataset.cgpbadd;})[0];
    if(pr){cgpPaleta(pr).push({hex:"#1F35C4",ime:""});shrani();render();}
  }],
  ["data-cgpbdel",function(g){
    var pr=S.projekti.filter(function(x){return x.id===g.dataset.cgpbdel;})[0];
    if(pr){cgpPaleta(pr).splice(parseInt(g.dataset.i,10),1);shrani();render();}
  }],
  ["data-dropcgp",function(g){var vhod=el("dfile-cgp-"+g.dataset.dropcgp);if(vhod)vhod.click();}],

  /* ---- pravila brez svojega gumba ----
     „data-prename“ in „data-pdel“ imata gumb v glavi Pregleda. Preostali dve
     sta ostali od prejšnje razporeditve zavihkov: elementov, ki bi ju
     sprožila, nikjer ne izrisujemo. Koda stoji, ker gre za pravi funkciji —
     odpri kreativo od koderkoli in dodaj kreativo na tuj izdelek.           */
  ["data-openk",function(g){
    var najd=najdiKreativo(g.dataset.openk);
    if(!najd)return;
    S.aktivenProjekt=najd.izdelek.projekt;S.aktiven=najd.izdelek.id;odprtaKreativa=najd.kreativa.id;
    polniIzbirnik();nastaviView("kreative");
  }],
  ["data-addk",function(g){
    var izd=S.izdelki.filter(function(x){return x.id===g.dataset.addk;})[0];
    if(!izd)return;
    var nk=novaKreativa("facebook");stikPodeduj(nk,izd);izd.kreative.push(nk);
    S.aktivenProjekt=izd.projekt;S.aktiven=izd.id;odprtaKreativa=nk.id;
    shrani();polniIzbirnik();nastaviView("kreative");
  }],
  ["data-prename",function(g){
    var izd=S.izdelki.filter(function(x){return x.id===g.dataset.prename;})[0];
    if(!izd)return;
    var no=prompt("Novo ime izdelka:",izd.ime);
    if(no==null)return;no=String(no).trim();if(!no)return;
    izd.ime=no;shrani();polniIzbirnik();render();
  }],
  ["data-pdel",function(g){
    var id=g.dataset.pdel, izd=S.izdelki.filter(function(x){return x.id===id;})[0];
    if(!izd)return;
    if(!confirm('Dam izdelek "'+izd.ime+'" v koš z vsemi kreativami?\n\n'+
      'Nič se ne izgubi takoj — '+KOS_DNI+' dni ga lahko vrneš iz koša v zavihku Podatki.'))return;
    vKos("izdelek",izd.ime,steviloIn((izd.kreative||[]).length,"kreativa","kreativi","kreative","kreativ"),
      {izdelki:[izd]},idjiIzdelka(izd));
    S.izdelki=S.izdelki.filter(function(x){return x.id!==id;});
    if(S.aktiven===id)S.aktiven=null;
    odprtaKreativa=null;shrani();polniIzbirnik();render();
    razveljaviZadnje("Izdelek „"+izd.ime+"“ je v košu.");
  }]
];

/* Gumbi, ki jih poznamo po id-ju. Ločeni od tabele zgoraj, ker se preverjajo
   šele, ko nobeno vsebinsko pravilo ne prime.                              */
var GUMBI={
  "back":function(){odprtaKreativa=null;pocistiUrlje();render();window.scrollTo(0,0);},
  "copy":function(){kopiraj(briefText(K()));},
  "copybrief":function(){kopiraj(briefText(K()));},
  "prevzemiBudget":function(){
    var p=P();if(!p)return;
    var vs=budgetAktivnih(p);
    if(vs<=0){toast("Nobena kreativa ni aktivna — najprej ji nastavi budget in status.");return;}
    p.dnevniBudget=nfE.format(vs);
    shrani();renderPregled();toast("Budget prevzet: "+e(vs)+" na dan.");
  },
  "kalkPrevzemi":function(){
    var p=P();if(!p)return;
    var ek=ekon(p);
    if(ek.bruto<=0){toast("Izdelek še nima cene.");return;}
    S.kalk.cena=nfE.format(ek.bruto);
    S.kalk.marza=nfE.format(ek.marzaEf);
    if(!n(S.kalk.budget)&&n(p.dnevniBudget))S.kalk.budget=nfE.format(n(p.dnevniBudget));
    shrani();renderKalk();toast("Prevzeto iz „"+p.ime+"“.");
  },
  "dup":function(){
    var o=K();if(!o)return;
    var c=JSON.parse(JSON.stringify(o));
    c.id=uid();c.naslov=o.naslov+" (kopija)";c.stDatotek=0;
    c.status="ideja";c.statusOd=new Date().toISOString();
    c.rSpend="";c.rImpr="";c.rClicks="";c.rOrders="";
    P().kreative.push(c);odprtaKreativa=c.id;shrani();render();toast("Podvojeno (brez datotek).");
  },
  "delk":function(){
    var k=K(), p=P();if(!k||!p)return;
    if(!confirm('Dam kreativo "'+k.naslov+'" v koš?\n\n'+
      'Nič se ne izgubi takoj — '+KOS_DNI+' dni jo lahko vrneš iz koša v zavihku Podatki.'))return;
    vKos("kreativa",k.naslov,platIme(k.platforma)+" · "+statusIme(k.status),
      {kreativa:{izdelek:p.id,zapis:k}},[k.id]);
    p.kreative=p.kreative.filter(function(x){return x.id!==k.id;});
    odprtaKreativa=null;pocistiUrlje();shrani();render();
    razveljaviZadnje("Kreativa „"+k.naslov+"“ je v košu.");
  },
  "kos-vse":function(){
    var seznam=kosSeznam();
    if(!seznam.length)return;
    if(!confirm("Zavržem vseh "+seznam.length+" zapisov v košu dokončno?\n\nTega ni več mogoče vrniti."))return;
    var p=Promise.resolve();
    seznam.forEach(function(v){p=p.then(function(){return izKosaZaVedno(v.id);});});
    p.then(function(){shrani();render();toast("Koš izpraznjen.");});
  },
  "zlito-ok":function(){
    var k=K();if(!k)return;
    delete k.zlitoOb;shrani();renderEditor();
  },
  "exp":function(){izvozi();},
  "impBtn":function(){el("impFile").click();},
  "impAdd":function(){el("impFileAdd").click();},
  "impUrl":function(){naloziPripravljeno();},
  "impPaste":function(){uvozi(el("paste").value,"zamenjaj");},
  "impPasteAdd":function(){uvozi(el("paste").value,"dodaj");},
  "prn":function(){window.print();},
  "prnew":function(){dodajProjekt();},
  "pnew3":function(){dodajIzdelek();},
  "ob-in":function(){Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,false);},
  "ob-nov":function(){Oblak.prijava(el("ob-mail").value.trim(),el("ob-geslo").value,true);},
  "ob-out":function(){Oblak.odjava();},
  "ob-sync":function(){Oblak.sinhroniziraj();},
  "ob-files":function(){
    var gumb=el("ob-files");
    if(gumb){gumb.disabled=true;gumb.textContent="Pošiljam …";}
    Oblak.poriniDatoteke().then(function(r){
      if(gumb){gumb.disabled=false;gumb.textContent="Pošlji slike v oblak";}
      renderOblakPanel();
      toast(izidPosiljanja(r));
    },function(){
      if(gumb){gumb.disabled=false;gumb.textContent="Pošlji slike v oblak";}
      toast("Pošiljanje datotek ni uspelo.");
    });
  }
};
document.addEventListener("click",function(ev){
  if(razdeli(KLIKI,ev,true))return;
  var f=ev.target&&ev.target.id?GUMBI[ev.target.id]:null;
  if(f)f(ev.target,ev);
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
  /* Alt + 1…5 skoči na zavihek. Alt zato, ker same številke pripadajo poljem,
     brskalniku pa Alt+številka ni zaseden.                                  */
  if(ev.altKey&&!ev.ctrlKey&&!ev.metaKey&&/^[1-5]$/.test(ev.key)){
    var vrstni=["projekti","pregled","kreative","kalkulator","podatki"];
    ev.preventDefault();nastaviView(vrstni[parseInt(ev.key,10)-1]);return;
  }
  /* Alt + F postavi kurzor v iskanje po kreativah */
  if(ev.altKey&&!ev.ctrlKey&&!ev.metaKey&&(ev.key==="f"||ev.key==="F")){
    ev.preventDefault();
    if(view!=="kreative"||odprtaKreativa){odprtaKreativa=null;nastaviView("kreative");}
    var polje=el("kre-isk");if(polje){polje.focus();polje.select();}
    return;
  }
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
