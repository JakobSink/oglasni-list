/* Oglasni list · podatki.js
   Pogled Podatki, uvoz in izvoz stanja, urejanje stikal in brief.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

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
  kosHtml()+
  stikalaUrediHtml()+
  vodnikHtml();
  renderOblakPanel();
  osveziProstor();
}

/* ============ koš ============ */
function kosKajIme(kaj){return {mapa:"Mapa",izdelek:"Izdelek",kreativa:"Kreativa",stanje:"Vse"}[kaj]||kaj;}
function kosOstaloDni(v){
  var t=new Date(v.kdaj).getTime();
  if(!isFinite(t))return KOS_DNI;
  return Math.max(0,KOS_DNI-Math.floor((Date.now()-t)/(24*3600*1000)));
}
function kosHtml(){
  var seznam=kosSeznam();
  return '<div class="block"><header><div class="head-t"><span class="eyebrow">Koš</span>'+
    '<h2>Izbrisano zadnjih '+KOS_DNI+' dni</h2></div>'+
    '<span class="sp"></span>'+
    (seznam.length?'<span class="pill np">'+seznam.length+'</span>'+
      '<button class="btn btn-s btn-d no-print" id="kos-vse">Izprazni koš</button>':'')+
    '</header><div class="pad">'+
    (!seznam.length
      ? '<p class="note">Koš je prazen. Kar izbrišeš — mapo, izdelek ali kreativo — bo '+KOS_DNI+' dni čakalo tu, skupaj z naloženimi slikami. Šele potem gre dokončno stran.</p>'
      : '<div class="scroll"><table><thead><tr><th>Kaj</th><th>Ime</th><th>Vsebina</th><th>Izbrisano</th><th>Ostane še</th><th></th></tr></thead><tbody>'+
        seznam.map(function(v){
          var dni=kosOstaloDni(v);
          return '<tr>'+
            '<td style="text-align:left"><span class="pill np">'+esc(kosKajIme(v.kaj))+'</span></td>'+
            '<td style="text-align:left"><b>'+esc(v.ime)+'</b></td>'+
            '<td style="text-align:left">'+esc(v.opis||"—")+'</td>'+
            '<td style="text-align:left">'+esc(cas(v.kdaj))+'</td>'+
            '<td style="text-align:left"'+(dni<=3?' class="neg"':'')+'>'+steviloIn(dni,"dan","dneva","dni","dni")+'</td>'+
            '<td style="text-align:right" class="no-print">'+
              '<button class="btn btn-s btn-soft" data-kosvrni="'+v.id+'">Vrni</button> '+
              '<button class="btn btn-s btn-d" data-kosdel="'+v.id+'">Zavrzi</button>'+
            '</td></tr>';
        }).join("")+'</tbody></table></div>'+
        '<p class="note" style="margin-top:10px">Koš je skupen z ekipo: kar izbriše eden, lahko vrne drugi. Vrnitev prebije brisanje tudi pri kolegih, ki so ga že prevzeli.</p>')+
    '</div></div>';
}
/* Obvestilo po brisanju, ki ponudi takojšnjo vrnitev — brez iskanja po zavihkih. */
function razveljaviZadnje(sporocilo){
  var zadnji=kosSeznam()[0];
  if(!zadnji){toast(sporocilo);return;}
  toast(sporocilo,{ime:"Razveljavi",klik:function(){vrniInPokazi(zadnji.id);}});
}
function vrniInPokazi(kosId){
  var r=vrniIzKosa(kosId);
  if(!r){toast("Tega ni več v košu.");return;}
  shrani();polniIzbirnik();render();
  var m=r.vrnjenih?"Vrnjeno iz koša: "+r.ime+".":"Vrnitev ni uspela.";
  if(r.opozorilo)m+=" "+r.opozorilo;
  toast(m);
}
function osveziProstor(){
  var t=el("prostor");if(!t)return;
  var delov=[];
  var pStevilo=Datoteke.naVoljo?Datoteke.stevilo().catch(function(){return null;}):Promise.resolve(null);
  var pOcena=(navigator.storage&&navigator.storage.estimate)?navigator.storage.estimate().catch(function(){return null;}):Promise.resolve(null);
  /* Velikost stanja: to gre ob vsakem shranjevanju v localStorage in v celoti v
     oblak. Dokler je nekaj deset kB, ni o čem razmišljati — številka je tu, da
     se opazi, če kdaj ni več tako.                                          */
  try{delov.push("<b>Velikost besedil:</b> "+mb(new Blob([JSON.stringify(S)]).size));}catch(err){}
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

/* rok za brief in izvoz: datum, za njim opomba, če je */
function rokTekst(k){
  var deli=[];
  if(k.rok)deli.push(datumSlo(k.rok));
  if(k.rokOpomba)deli.push(k.rokOpomba);
  return deli.length?" · rok: "+deli.join(" — "):"";
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
  if(!confirm("Uvoz zamenja vse, kar je zdaj v aplikaciji — "+
    steviloIn(S.izdelki.length,"izdelek","izdelka","izdelki","izdelkov")+" gre stran.\n\n"+
    "Celotno stanje se prej shrani v koš, zato lahko uvoz razveljaviš. Nadaljujem?"))return;
  /* Zamenjava je edino dejanje, ki v enem koraku odnese vse — in ker gre stanje
     takoj v oblak, odnese tudi delo ekipe. Zato prej naredimo posnetek celega
     stanja in ga po zamenjavi prenesemo v novi koš; brez tega bi šel s starim
     stanjem vred stran tudi koš sam.                                        */
  var posnetek=posnetekStanja("Stanje pred uvozom");
  var stariKos=kosSeznam();
  S=d;migriraj();
  /* koš iz uvožene datoteke je tuja zgodovina — obdržimo svojega */
  S.kos=[posnetek].concat(stariKos).slice(0,50);
  odprtaKreativa=null;shrani();polniIzbirnik();render();
  toast("Uvoženo: "+steviloIn(S.projekti.length,"mapa","mapi","mape","map")+", "+
    steviloIn(S.izdelki.length,"izdelek","izdelka","izdelki","izdelkov")+".",
    {ime:"Razveljavi",klik:function(){vrniInPokazi(posnetek.id);}});
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
  if(k.izvajalec||k.rok||k.rokOpomba)L.push("Dela: "+(k.izvajalec||"—")+rokTekst(k));
  /* blokada gre visoko v brief — izvajalec mora vedeti, da nekaj še ni znano */
  if(jeBlokirana(k))L.push("ČAKA NA: "+k.blokada);
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
  L.push("Dela: "+(k.izvajalec||"—")+(rokTekst(k)||" · rok: —"));
  if(jeBlokirana(k))L.push("ČAKA NA: "+k.blokada);
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
