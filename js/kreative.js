/* Oglasni list · kreative.js
   Banka hookov, seznam kreativ, mere za izvedbo, premikanje različic
   in urejevalnik posamezne kreative.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

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

/* ============ iskanje čez vse kreative ============
   Banka hookov je imela iskanje, kreative pa ne — pri sedmih izdelkih gre še
   brez, pri tridesetih ne. Išče čez vse mape, ne le čez odprt izdelek, in
   zadetek odpre naravnost, skupaj s preklopom na pravo mapo in izdelek.    */
var iskanjeKre="";
/* polja, po katerih ima smisel iskati: naslov, besedila in kotiranje */
function iskalnaBesedila(k){
  var deli=[k.naslov,k.kot,k.publika,k.tagi,k.izvajalec,k.opombe];
  BESEDILNA_POLJA.forEach(function(f){
    if(Array.isArray(k[f]))deli=deli.concat(k[f]);
  });
  if(k.variante&&typeof k.variante==="object"){
    Object.keys(k.variante).forEach(function(m){
      BESEDILNA_POLJA.forEach(function(f){
        if(Array.isArray(k.variante[m][f]))deli=deli.concat(k.variante[m][f]);
      });
    });
  }
  return deli.filter(Boolean).join(" \n ").toLowerCase();
}
function najdiPoBesedilu(niz){
  var isk=String(niz||"").trim().toLowerCase();
  if(isk.length<2)return [];
  var out=[];
  S.izdelki.forEach(function(p){
    (p.kreative||[]).forEach(function(k){
      var vse=iskalnaBesedila(k);
      if(vse.indexOf(isk)<0)return;
      /* odlomek okoli zadetka, da se vidi, zakaj je kreativa v seznamu */
      var i=vse.indexOf(isk);
      var od=Math.max(0,i-40);
      out.push({izdelek:p,kreativa:k,
        odlomek:(od>0?"…":"")+vse.slice(od,i+isk.length+60).replace(/\s+/g," ").trim()+"…"});
    });
  });
  return out;
}
function mapaIme(pid){
  var pr=S.projekti.filter(function(x){return x.id===pid;})[0];
  return pr?pr.ime:"—";
}
function iskanjeHtml(){
  var zadetki=najdiPoBesedilu(iskanjeKre);
  var isk=String(iskanjeKre||"").trim();
  return '<div class="block no-print"><div class="pad">'+
    '<div class="f"><label for="kre-isk">Poišči kreativo — po vseh mapah</label>'+
      '<input class="txt" id="kre-isk" type="search" value="'+esc(iskanjeKre)+'" '+
        'placeholder="besedilo hooka, naslova, kota, imena …" autocomplete="off">'+
      '<span class="hint">Išče po naslovih, hookih, besedilih, kotu in publiki — tudi po različicah pod stikali. Vsaj dva znaka.</span></div>'+
    (isk.length<2?''
      : zadetki.length
        ? '<div class="najd">'+zadetki.slice(0,40).map(function(z){
            return '<button type="button" class="najd-v" data-openk="'+z.kreativa.id+'">'+
              '<span class="najd-t">'+esc(z.kreativa.naslov)+'</span>'+
              '<span class="najd-p">'+esc(mapaIme(z.izdelek.projekt))+' · '+esc(z.izdelek.ime)+
                ' · <span class="pill st-'+z.kreativa.status+'">'+esc(statusIme(z.kreativa.status))+'</span></span>'+
              '<span class="najd-o">'+esc(z.odlomek)+'</span>'+
            '</button>';
          }).join("")+'</div>'+
          '<p class="hint">'+steviloIn(zadetki.length,"zadetek","zadetka","zadetki","zadetkov")+
            (zadetki.length>40?", prikazanih prvih 40":"")+'. Klik odpre kreativo v njeni mapi.</p>'
        : '<p class="hint">Nič ne ustreza. Iskanje gleda po vseh mapah, ne le po odprtem izdelku.</p>')+
  '</div></div>';
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
          (k.izvajalec&&VDELU.indexOf(k.status)>=0
            ? '<span class="pill np">'+esc(k.izvajalec)+(k.rok?" · "+esc(datumSlo(k.rok)):"")+'</span>':'')+
          (jeBlokirana(k)?'<span class="pill fzp-blok" title="'+esc(k.blokada)+'">blokirana</span>':'')+
          (jeZamuda(k)?'<span class="pill fzp-zamuda">rok je mimo</span>':'')+
          (jeZastoj(k)?'<span class="pill fzp-zastoj">'+steviloIn(dniOd(k.statusOd),"dan","dneva","dni","dni")+' brez premika</span>':'')+
          (k.zlitoOb?'<span class="pill fzp-zlito">nova besedila od ekipe</span>':'')+
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
  iskanjeHtml()+
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
    '<button class="btn btn-d" id="delk">V koš</button>',
    [{t:PR().ime,v:"projekti"},{t:p.ime,v:"pregled"},{t:"Kreative",v:"kreative"},{t:platNaziv+" · "+u[1]}])+

  /* Uskladitev je tej kreativi pridala besedila kolega. Povemo naravnost tu,
     ker je edino, kar mora uporabnik narediti, pogledati različice.         */
  (k.zlitoOb
    ? '<div class="opoz no-print"><div><b>Uskladitev je dodala besedila od ekipe.</b> '+
        'Ob '+esc(cas(k.zlitoOb))+' sta v to kreativo hkrati pisala dva — nič ni bilo prepisano, '+
        'tuje različice so pripete k tvojim. Preveri sezname spodaj in odveč zavrzi.</div>'+
        '<button class="btn btn-s" id="zlito-ok">Sem pogledal</button></div>'
    : '')+

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
            '<input class="txt" id="c-rok" type="date" data-c="rok" value="'+esc(jeDatum(k.rok)?k.rok:"")+'">'+
            '<span class="hint">Datum, da zna aplikacija opozoriti na zamudo.'+
              (jeZamuda(k)?' <b class="neg">Ta rok je že mimo.</b>':'')+'</span></div>'+
          '<div class="f"><label for="c-rokop">Opomba k roku</label>'+
            '<input class="txt" id="c-rokop" type="text" data-c="rokOpomba" value="'+esc(k.rokOpomba||"")+'" placeholder="npr. po potrditvi fotografij"></div>'+
          '<div class="f"><label for="c-oddaja">Kaj mora vrniti</label>'+
            '<input class="txt" id="c-oddaja" type="text" data-c="oddaja" value="'+esc(k.oddaja||"")+'" placeholder="npr. 9:16 MP4 + 3 fotke 4:5, brez podnapisov"></div>'+
          '<div class="f full"><label for="c-blokada">Kaj to blokira</label>'+
            '<input class="txt'+(jeBlokirana(k)?" blok":"")+'" id="c-blokada" type="text" data-c="blokada" value="'+esc(k.blokada||"")+'" '+
              'placeholder="npr. ni znano, ali je cena na m² ali na paket — čakam odgovor stranke">'+
            '<span class="hint">Če je tu karkoli, kreativa velja za blokirano in se pokaže na vrhu Pregleda in na kartici mape. '+
              'Blokada ni status — kreativa je lahko hkrati „za pregled“ in blokirana. Ko je odgovor tu, polje izprazni.</span></div>'+
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
