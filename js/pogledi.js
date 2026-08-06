/* Oglasni list · pogledi.js
   Celostna podoba mape, pogled Projekti in pogled Pregled
   z ekonomiko izdelka.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

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

/* ---- trak napredka ----
   Vodoraven pas, razdeljen po fazah. Na kartici pove v enem pogledu, koliko je
   odprtega in koliko že teče; s podrobno različico pridejo zraven še številke. */
function napredekOpis(st){
  return FAZE.filter(function(f){return st[f[0]];})
    .map(function(f){return f[1]+": "+st[f[0]];}).join(", ");
}
/* Samo pas z razmerji. Imena pod njim so statusi, ne faze — „sestavi brief“
   pove, kje delo stoji, „v delu“ pa ne. Faze ostanejo kot barve pasu.      */
function napredekHtml(kreative){
  var st=fazeStevila(kreative);
  if(!st.skupaj)return "";
  return '<div class="nap">'+
    '<div class="nap-b" role="img" aria-label="'+esc(napredekOpis(st))+'">'+
      FAZE.filter(function(f){return st[f[0]];}).map(function(f){
        return '<i class="'+f[2]+'" style="width:'+(st[f[0]]/st.skupaj*100).toFixed(2)+'%"></i>';
      }).join("")+
    '</div>'+
  '</div>';
}
/* Seznam blokad nad vsem drugim. Vsaka vrstica pove, katera kreativa in na kaj
   čaka; klik jo odpre, da se odgovor lahko takoj vpiše.                     */
function blokadeHtml(kreative){
  var b=blokade(kreative);
  if(!b.length)return "";
  return '<div class="blok-s">'+
    '<div class="blok-g">'+steviloIn(b.length,"kreativa čaka","kreativi čakata","kreative čakajo","kreativ čaka")+
      ' na odgovor</div>'+
    b.map(function(k){
      return '<button type="button" class="blok-v" data-open="'+k.id+'">'+
        '<span class="blok-t">'+esc(k.naslov)+'</span>'+
        '<span class="blok-o">'+esc(k.blokada)+'</span>'+
      '</button>';
    }).join("")+
  '</div>';
}
/* koliko časa kreativa že stoji v isti fazi */
function vFaziHtml(k){
  var d=dniOd(k.statusOd);
  if(d==null)return '<span class="hint">—</span>';
  var t=d===0?"danes":steviloIn(d,"dan","dneva","dni","dni");
  return jeZastoj(k)?'<b class="neg">'+t+'</b>':t;
}
/* rok kot datum; kar je bilo prej vpisano kot besedilo, stoji zraven */
function rokHtml(k){
  var deli=[];
  if(k.rok){
    var zamuja=jeZamuda(k);
    deli.push((zamuja?'<b class="neg">':'<span>')+esc(datumSlo(k.rok))+(zamuja?" · zamuja</b>":"</span>"));
  }
  if(k.rokOpomba)deli.push('<span class="hint">'+esc(k.rokOpomba)+'</span>');
  return deli.length?deli.join(" "):"—";
}
/* Kar terja pozornost: blokade, zamude, zastoji. Enako na mapi in na izdelku. */
function opozorilnePills(kreative){
  var zamud=(kreative||[]).filter(jeZamuda).length;
  var zastojev=(kreative||[]).filter(jeZastoj).length;
  var blok=blokade(kreative).length;
  return (blok?'<span class="pill fzp-blok">'+steviloIn(blok,"blokirana","blokirani","blokirane","blokiranih")+'</span>':'')+
    (zamud?'<span class="pill fzp-zamuda">'+zamud+' zamuja</span>':'')+
    (zastojev?'<span class="pill fzp-zastoj">'+zastojev+' obtičala</span>':'');
}
/* Povzetek za glavo mape, kjer je kreativ več kot se jih da našteti po imenih. */
function odprtoPills(kreative){
  var st=fazeStevila(kreative);
  if(!st.skupaj)return "";
  return (st.odprto?'<span class="pill fzp-odprto">'+steviloIn(st.odprto,"odprta","odprti","odprte","odprtih")+'</span>':'')+
    (st.vzraku?'<span class="pill fzp-zrak">'+st.vzraku+' v zraku</span>':'')+
    opozorilnePills(kreative)+
    (!st.odprto&&!st.vzraku?'<span class="pill np">vse ustavljeno</span>':'');
}
/* Pravi statusi kreativ, po vrsti od ideje do oglasa, ki teče. Na kartici
   izdelka pove „sestavi brief“ namesto „1 odprta“ — to je tisto, kar rabiš,
   preden se odločiš, ali ga sploh odpreš. Nad štirimi se ostanek zloži v „+N“,
   da kartica ne zraste čez rob; cela slika je klik stran v Pregledu.        */
function statusiPills(kreative,koliko){
  var sk={};(kreative||[]).forEach(function(k){sk[k.status]=(sk[k.status]||0)+1;});
  var vidni=STATUSI.filter(function(s){return sk[s[0]];});
  if(!vidni.length)return "";
  var prikazi=vidni.slice(0,koliko||4);
  var skritih=vidni.length-prikazi.length;
  return '<span class="kar-st">'+
    prikazi.map(function(s){
      return '<span class="pill pill-xs st-'+s[0]+'">'+esc(s[1])+(sk[s[0]]>1?' · '+sk[s[0]]:'')+'</span>';
    }).join("")+
    (skritih?'<span class="pill pill-xs np" title="'+esc(vidni.slice(prikazi.length)
      .map(function(s){return s[1]+" · "+sk[s[0]];}).join(", "))+'">+'+skritih+'</span>':'')+
  '</span>';
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
    var vseKre_=kreativeVProjektu(pr.id);

    var izdelki=izd.map(function(p){
      var ek=ekon(p);
      var st=fazeStevila(p.kreative);
      return '<button class="card'+(p.id===S.aktiven&&jeZdaj?" zdaj":"")+'" data-pick="'+p.id+'">'+
        '<div class="card-b">'+
          /* zgoraj samo to, kar terja pozornost — statusi pridejo pod opis */
          '<div class="row" style="gap:7px">'+
            (p.id===S.aktiven&&jeZdaj?'<span class="pill st-aktivna">odprt</span>':'')+
            opozorilnePills(p.kreative)+
          '</div>'+
          '<span class="card-t">'+esc(p.ime)+'</span>'+
          '<span class="card-s">'+esc(p.opis||"Brez opisa")+'</span>'+
          statusiPills(p.kreative)+
        '</div>'+
        '<div class="card-f">'+
          '<span>marža <b class="'+znak(ek.marzaEf)+'">'+e(ek.marzaEf)+'</b></span>'+
          '<span class="sp"></span>'+
          '<span>'+(st.skupaj?steviloIn(st.skupaj,"kreativa","kreativi","kreative","kreativ"):"brez kreativ")+'</span>'+
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
          '<span class="pill np">'+steviloIn(izd.length,"izdelek","izdelka","izdelki","izdelkov")+' · '+steviloIn(stK,"kreativa","kreativi","kreative","kreativ")+(aktivnih>0?' · '+e(aktivnih)+'/dan':'')+'</span>'+
          odprtoPills(vseKre_)+
          (jeZdaj?'':'<button class="btn btn-s btn-soft" data-prpick="'+pr.id+'">Izberi</button>')+
          '<button class="btn btn-s" data-prrename="'+pr.id+'">Preimenuj</button>'+
          (S.projekti.length>1?'<button class="btn btn-s btn-d" data-prdel="'+pr.id+'">Izbriši</button>':'')+
        '</div>'+
      '</header>'+
      '<div class="pad">'+
        /* stanje cele mape na enem traku, preden se spustiš v posamezen izdelek */
        (stK?'<div class="nap-glava">'+napredekHtml(vseKre_)+statusiPills(vseKre_,8)+'</div>':'')+
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
    /* Preimenovanje in brisanje izdelka sta bila ob preureditvi zavihkov brez
       gumba; tu sta na svojem mestu, ker je Pregled stran tega izdelka.     */
    '<button class="btn btn-s" data-prename="'+p.id+'">Preimenuj</button>'+
    '<button class="btn btn-s btn-d" data-pdel="'+p.id+'">V koš</button>'+
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
      kc.innerHTML=
        /* Blokade so pred vsem drugim: to ni delo, ki čaka na nas, ampak
           odgovor, ki čaka nekje drugje — in dokler ga ni, oglas ne gre ven. */
        blokadeHtml(p.kreative)+
        /* najprej groba slika po fazah, šele pod njo posamezni statusi */
        '<div class="nap-glava">'+napredekHtml(p.kreative)+'</div>'+
        '<div class="row" style="margin-bottom:14px">'+
        STATUSI.filter(function(s){return sk[s[0]];}).map(function(s){
          return '<span class="pill st-'+s[0]+'">'+s[1]+' · '+sk[s[0]]+'</span>';}).join("")+
        (caka?'<span class="sp"></span><span class="note"><b>'+caka+'</b> čaka na delo</span>':'')+'</div>'+
        '<div class="scroll"><table><thead><tr><th>Kreativa</th><th>Kje je</th><th>Že</th><th>Kdo dela</th><th>Rok</th>'+
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
          /* barvni rob levo pove fazo, preden sploh prebereš status */
          return '<tr data-open="'+k.id+'" style="cursor:pointer" data-faza="'+fazaStatusa(k.status)+'"'+(caka?' class="mark"':'')+'>'+
            '<td>'+esc(k.naslov)+
              (stikRabljena().length?'<i style="display:block;font-size:11.5px;color:var(--ink3);font-style:normal">'+esc(stikOpis(k))+'</i>':'')+
            '</td>'+
            '<td style="text-align:left"><span class="pill st-'+k.status+'">'+esc(statusIme(k.status))+'</span>'+
              (k.statusOpomba?'<i style="display:block;font-size:11.5px;color:var(--ink3);font-style:normal;margin-top:3px">'+esc(k.statusOpomba)+'</i>':'')+'</td>'+
            '<td style="text-align:left">'+vFaziHtml(k)+'</td>'+
            '<td style="text-align:left">'+esc(k.izvajalec||"—")+'</td>'+
            '<td style="text-align:left">'+rokHtml(k)+'</td>'+
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
