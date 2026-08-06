/* Oglasni list · kalkulator.js
   Pogled Kalkulator in vodnik na dnu zavihka Podatki.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

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
