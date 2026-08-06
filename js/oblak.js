/* Oglasni list · oblak.js
   Zlivanje dveh stanj in sinhronizacija s Supabase — stanje, slike
   in sprotno obveščanje o tujih spremembah.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

/* ============ zlivanje dveh stanj ============
   Dva človeka pod istim računom urejata vsak na svoji napravi. Zato se stanji
   zlijeta po zapisih (id-jih), ne po tem, katero je novejše: kar obstaja samo
   na eni strani, se ohrani; kjer isti zapis obstaja na obeh, obvelja tisti z
   novejše strani. Brisanje se prenese prek sledi (S.brisano) — brez tega bi
   izbrisan izdelek pri naslednji sinhronizaciji vstal od mrtvih.            */
function sledBrisanja(id){
  if(!Array.isArray(S.brisano))S.brisano=[];
  /* Če sled že obstaja, ji osvežimo čas. Zapis je bil morda vmes vrnjen iz koša
     in stara sled bi bila starejša od oznake vrnitve — potem se ne bi dal več
     nikoli izbrisati.                                                        */
  var zdaj=new Date().toISOString();
  var obstoj=S.brisano.filter(function(x){return x.id===id;})[0];
  if(obstoj)obstoj.kdaj=zdaj;
  else S.brisano.push({id:id,kdaj:zdaj});
}
/* ---- zlivanje ene kreative po poljih ----
   Zapisi se drugod zlijejo po id-ju: obvelja novejša stran, druga pade stran.
   Pri kreativi to ni dovolj. Če v isto kreativo hkrati pišeta dva, bi tisti, ki
   porine drugi, brez sledu prepisal prvega — in prav besedila so tu delo.

   Besedila so že po zasnovi seznami različic, zato ob trku ne izbiramo: tujo
   različico dodamo k svojim. Nič se ne izgubi, uporabnik pa vidi obe in izbere.
   Enaka besedila se ne podvojijo, zato se seznam ob naslednjem zlivanju umiri. */
var BESEDILNA_POLJA=["hooki","primarna","naslovi","opisi"];
function zlijSeznamBesedil(a,b){
  a=Array.isArray(a)?a:[];b=Array.isArray(b)?b:[];
  var out=a.slice(), vidim={};
  out.forEach(function(x){vidim[String(x==null?"":x).trim()]=true;});
  b.forEach(function(x){
    var t=String(x==null?"":x).trim();
    if(!t||vidim[t])return;
    vidim[t]=true;out.push(x);
  });
  /* prazno mesto je bilo samo čakalno — ko pride vsebina, ga ne rabimo več */
  if(out.length>1)out=out.filter(function(x){return String(x==null?"":x).trim();});
  return out.length?out:[""];
}
function zlijKreativo(nasa,tuja,tujaJeNovejsa,stevec){
  /* vse, kar ni seznam besedil (status, budget, izvajalec, rok …), ostane po
     starem pravilu: obvelja novejša stran                                   */
  var out=JSON.parse(JSON.stringify(tujaJeNovejsa?tuja:nasa));
  var vzeta=tujaJeNovejsa?tuja:nasa;
  var preddoloceno=stevec?stevec.reseno:0;
  BESEDILNA_POLJA.forEach(function(f){
    /* polja, ki ga ni ne pri nas ne pri njih, ne izmišljujemo — sicer bi vsako
       zlivanje starih zapisov videti kot sprememba                          */
    if(!Array.isArray(nasa[f])&&!Array.isArray(tuja[f]))return;
    var z=zlijSeznamBesedil(nasa[f],tuja[f]);
    if(z.length>(Array.isArray(vzeta[f])?vzeta[f].length:0)&&stevec)stevec.reseno++;
    out[f]=z;
  });
  /* isto velja za besedila pod posameznim stikalom (slovensko, hrvaško …) */
  var kljuci={};
  [nasa.variante,tuja.variante].forEach(function(v){
    if(v&&typeof v==="object")Object.keys(v).forEach(function(x){kljuci[x]=true;});
  });
  if(Object.keys(kljuci).length){
    out.variante=(out.variante&&typeof out.variante==="object")?out.variante:{};
    Object.keys(kljuci).forEach(function(x){
      var vn=(nasa.variante||{})[x], vt=(tuja.variante||{})[x];
      if(!vn||!vt){out.variante[x]=vn||vt;return;}
      var zdruz=JSON.parse(JSON.stringify(tujaJeNovejsa?vt:vn));
      var vzetaV=tujaJeNovejsa?vt:vn;
      BESEDILNA_POLJA.forEach(function(f){
        if(!Array.isArray(vn[f])&&!Array.isArray(vt[f]))return;
        var z=zlijSeznamBesedil(vn[f],vt[f]);
        if(z.length>(Array.isArray(vzetaV[f])?vzetaV[f].length:0)&&stevec)stevec.reseno++;
        zdruz[f]=z;
      });
      out.variante[x]=zdruz;
    });
  }
  /* Če smo kaj rešili, kreativo označimo. Obvestilo pove, da se je zgodilo,
     ne pa kje — brez oznake bi moral uporabnik prebrskati celo mapo.       */
  if(stevec&&stevec.reseno>preddoloceno)out.zlitoOb=new Date().toISOString();
  /* izbrana različica mora ostati znotraj seznama, ki je zdaj lahko daljši */
  if(out.izbrana&&typeof out.izbrana==="object"){
    BESEDILNA_POLJA.forEach(function(f){
      var i=out.izbrana[f];
      if(typeof i==="number"&&(i<0||i>=out[f].length))out.izbrana[f]=0;
    });
  }
  return out;
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
  /* Oznake vrnitve iz koša z obeh strani. Za vsak id obvelja zadnja poteza: če
     je vrnitev novejša od brisanja, zapis živi — tudi če ima kolega pri sebi še
     staro sled brisanja.                                                     */
  var vrnitve={};
  [lok.vrnjeno,obl.vrnjeno].forEach(function(a){
    (Array.isArray(a)?a:[]).forEach(function(x){
      if(!x||!x.id)return;
      var t=new Date(x.kdaj).getTime();
      if(!isFinite(t))return;
      if(!(x.id in vrnitve)||t>vrnitve[x.id])vrnitve[x.id]=t;
    });
  });
  var vseVrnitve=Object.keys(vrnitve)
    .filter(function(id){return vrnitve[id]>meja;})
    .map(function(id){return {id:id,kdaj:new Date(vrnitve[id]).toISOString()};});

  var jePobrisan={};
  vseSledi.forEach(function(x){
    var brisanoOb=new Date(x.kdaj).getTime();
    var vrnjenoOb=vrnitve[x.id];
    if(isFinite(vrnjenoOb)&&isFinite(brisanoOb)&&vrnjenoOb>brisanoOb)return;
    jePobrisan[x.id]=true;
  });

  /* „spojenih“ šteje vse zapise, ki obstajajo na obeh straneh, in gre v besedilo
     obvestila. „prevzetih“ pa šteje samo tiste, kjer smo dejansko vzeli tujo
     vsebino in se ta od naše razlikuje — to je edini pošten odgovor na
     vprašanje „ali je res kaj prišlo“. Če bi tiha uskladitev gledala spojene,
     bi uporabniku prerisala zaslon ob vsakem pošiljanju, tudi ko ni novosti. */
  var dodanih=0, spojenih=0, prevzetih=0, odstranjenih=0;
  /* koliko besedil smo ob trku obdržali namesto prepisali */
  var stevec={reseno:0};
  /* union po id: a je „naša“ stran, b druga; pri obojestranskih obvelja novejša.
     „zdruzi“ je izjema za zapise, ki jih znamo zliti po poljih (kreative).   */
  function zlij(a,b,bJeNovejsi,zdruzi){
    a=Array.isArray(a)?a:[];b=Array.isArray(b)?b:[];
    var out=[], vzeto={};
    a.forEach(function(x){
      if(!x||!x.id)return;
      /* Zapis, ki ga je izbrisal kolega, tudi izgine — in to je novost, čeprav
         ni ne dodan ne prevzet. Brez tega štetja tiha uskladitev brisanja ne
         bi pokazala.                                                        */
      if(jePobrisan[x.id]){odstranjenih++;return;}
      var par=b.filter(function(y){return y&&y.id===x.id;})[0];
      vzeto[x.id]=true;
      if(!par){out.push(x);return;}
      spojenih++;
      var izid=zdruzi?zdruzi(x,par,bJeNovejsi):(bJeNovejsi?par:x);
      if(JSON.stringify(izid)!==JSON.stringify(x))prevzetih++;
      out.push(izid);
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
    kop.kreative=zlij(vL.kreative,vO.kreative,novejsiJeOblak,function(nasa,tuja,tujaJeNovejsa){
      return zlijKreativo(nasa,tuja,tujaJeNovejsa,stevec);
    });
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
  /* koš je skupen: kar en izbriše, lahko drugi vrne */
  novo.kos=zlij(lok.kos,obl.kos,novejsiJeOblak);
  novo.brisano=vseSledi;
  novo.vrnjeno=vseVrnitve;
  novo.spremenjeno=new Date().toISOString();

  var deli=[];
  if(dodanih)deli.push(dodanih+" zapisov prevzetih iz oblaka");
  if(spojenih)deli.push(spojenih+" usklajenih");
  if(stevec.reseno)deli.push(stevec.reseno+(stevec.reseno===1?" besedilo obdržano":" besedil obdržanih")+" namesto prepisanih");
  return {
    stanje:novo,
    spremenjeno:!!(dodanih||spojenih)||lokCas!==oblCas,
    /* „novih“ šteje samo zapise, ki so dejansko prišli z druge strani. Tiha
       uskladitev po tem loči, ali je treba pogled sploh na novo izrisati —
       sama razlika v času še ni razlog, da uporabniku pod prsti prerišemo
       zaslon.                                                              */
    novih:dodanih+prevzetih+odstranjenih,
    opis:deli.length?deli.join(", "):"brez razlik"
  };
}

/* ============ oblak (Supabase) ============ */
var Oblak=(function(){
  var CFG=window.OGLASNI_CONFIG||{url:"",anonKey:""};
  var sb=null, user=null, stanjeNapake=null, zadnjaSink=null, sdkTece=false;
  /* isti trenutek kot zadnjaSink, le v milisekundah — za primerjavo z dogodki */
  var zadnjaSinkMs=0;
  function nastavljen(){return !!(String(CFG.url||"").trim() && String(CFG.anonKey||"").trim());}
  /* Knjižnica Supabase leži v repozitoriju (vendor/supabase.js, pripeta na
     2.112.1) in gre v predpomnilnik service workerja. Prej se je vlekla s CDN
     pod oznako „@2“: tuja objava bi lahko čez noč zlomila objavljeno aplikacijo,
     brez interneta pa sinhronizacije sploh ni bilo. CDN ostaja samo kot rezerva
     — pripet na isto različico in preverjen s SRI, da ne izvedemo česa drugega,
     kot smo preverili.                                                       */
  var SDK_LOKALNO="vendor/supabase.js";
  var SDK_CDN="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.1/dist/umd/supabase.js";
  var SDK_SRI="sha384-0x8XPoHt08aHZj+RHs8ojmhZ5IDsTLjPgblgWdriayWriqv9dic3Vkv1K2+UqgZV";
  function vstaviSkripto(src,sri,koncano){
    var s=document.createElement("script");
    s.src=src;
    if(sri){s.integrity=sri;s.crossOrigin="anonymous";}
    /* onload sam po sebi ne pomeni, da je knjižnica notri — preverimo vsebino */
    s.onload=function(){koncano(!!(window.supabase&&window.supabase.createClient));};
    s.onerror=function(){koncano(false);};
    document.head.appendChild(s);
  }
  function naloziSDK(cb){
    if(window.supabase&&window.supabase.createClient)return cb(null);
    if(sdkTece)return;
    sdkTece=true;
    vstaviSkripto(SDK_LOKALNO,null,function(uspelo){
      if(uspelo){sdkTece=false;return cb(null);}
      vstaviSkripto(SDK_CDN,SDK_SRI,function(uspeloCdn){
        sdkTece=false;
        cb(uspeloCdn?null:"Knjižnice Supabase ni bilo mogoče naložiti — preveri internetno povezavo.");
      });
    });
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
        if(user){naroci();sinhroniziraj();}
      });
      sb.auth.onAuthStateChange(function(_ev,sess){
        var prej=user?user.id:null;
        user=sess?sess.user:null;
        osveziPanel();
        if(!user){odjaviKanal();return;}
        if(user.id!==prej){naroci();sinhroniziraj();}
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
    odjaviKanal();
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
      zadnjaSink=zdaj;zadnjaSinkMs=Date.parse(zdaj);osveziPanel();return res;
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
    zadnjaSink=vrstica.spremenjeno;zadnjaSinkMs=Date.parse(vrstica.spremenjeno)||0;
    polniIzbirnik();render();
  }
  /* Sinhronizacija zlije obe strani: kar je v oblaku in kar je tu. Nič se ne
     prepiše in nič ne izgubi — če kolega doda kreativo, medtem ko ti dodajaš
     drugo, po sinhronizaciji obstajata obe.

     Zliva se ob VSAKEM pošiljanju, ne le ob zagonu in na gumb. Prej je vsako
     shranjevanje čez 2,5 s porinilo celotno lokalno stanje čez skupno vrstico
     — kdor je zadnji pritisnil tipko, je prepisal delo vseh drugih. Zdaj gre
     vsako pošiljanje skozi potegni → zlij → porini.                         */
  var tece=false, ponoviPoTem=false;
  /* Ali imamo kaj neposlanega. Postavi ga zaLezi(), pobriše uspešno pošiljanje.
     Po tem se odziv na tuj dogodek odloči, ali sploh mora kaj poriniti — brez
     tega bi vsak odziv porinil, s tem sprožil nov dogodek in tako naprej.   */
  var cakaPosiljanje=false;
  function poriniInPovej(opt){
    return porini().then(function(){
      cakaPosiljanje=false;
      if(stanjeNapake){stanjeNapake=null;osveziPanel();}
    },function(err){
      /* Tiho pošiljanje ne sme metati obvestil vsakih par sekund, molčati pa
         tudi ne sme — napaka se pokaže v stranski vrstici.                  */
      stanjeNapake=napakaTabele(err);osveziPanel();
      if(!opt.tiho)toast(stanjeNapake);
    });
  }
  function sinhroniziraj(opt){
    opt=opt||{};
    if(!sb||!user)return Promise.resolve(false);
    /* Dva teka hkrati bi drug drugemu porinila zastarelo stanje. Če med tekom
       pride nov klic, ga samo zabeležimo in ponovimo enkrat na koncu.       */
    if(tece){ponoviPoTem=true;return Promise.resolve(false);}
    tece=true;
    return potegni().then(function(vrstica){
      if(!vrstica)return poriniInPovej(opt).then(function(){
        if(!opt.tiho)toast("Podatki poslani v oblak.");
      });
      var r=zlijStanje(S,vrstica.podatki);
      /* Odziv na tuj dogodek, ki ne prinese nič novega in nima česa poslati,
         se tu ustavi. To je varovalka, da se lasten upsert ne more sprevreči
         v neskončno vrtenje dogodek → uskladitev → upsert → dogodek.        */
      if(opt.leCePotrebno&&!r.novih&&!cakaPosiljanje)return;
      S=r.stanje;migriraj();
      obdrziOdprto();
      try{localStorage.setItem(LS,JSON.stringify(S));}catch(err){}
      /* Pri tihi uskladitvi prerišemo samo, če je res kaj prišlo z druge
         strani — sicer bi vsakih par sekund uporabniku razbili pogled.      */
      if(!opt.tiho||r.novih)izrisPozneje();
      return poriniInPovej(opt).then(function(){
        if(opt.tiho){
          if(r.novih)toast("Prevzeto od ekipe: "+r.opis+".");
          return;
        }
        toast(r.spremenjeno?"Usklajeno: "+r.opis+".":"Že usklajeno.");
      });
    },function(err){
      stanjeNapake=napakaTabele(err);osveziPanel();
      if(!opt.tiho)toast(stanjeNapake);
    })
    /* ob vsaki sinhronizaciji stanja poskusi poslati še slike, ki čakajo */
    .then(function(){return sinhronizirajDatoteke();},function(){})
    .then(function(r){if(r&&r.poslano)osveziPanel();},function(){})
    .then(function(){
      tece=false;
      if(ponoviPoTem){ponoviPoTem=false;return sinhroniziraj({tiho:true});}
      return true;
    },function(){tece=false;});
  }
  var lezi=null;
  function zaLezi(){
    if(!sb||!user)return;
    cakaPosiljanje=true;
    clearTimeout(lezi);
    lezi=setTimeout(function(){sinhroniziraj({tiho:true});},2500);
  }
  /* ---- sprotno obveščanje o tujih spremembah ----
     Realtime pove, da je kolega porinil svoje delo, in mi ga takoj zlijemo k
     sebi. Če realtime v projektu ni vklopljen (tabela ni v publikaciji
     supabase_realtime), kanal preprosto nikoli ne sproži — zato je spodaj še
     uskladitev ob vrnitvi v aplikacijo, ki drži tudi brez njega.            */
  var kanal=null, odzivnik=null;
  /* Kolega med pisanjem porine večkrat zapored; mi se uskladimo enkrat, ko se
     umiri. „leCePotrebno“ pove, da naj se uskladitev ustavi, če ni prinesla
     nič novega in nimamo česa poslati.                                      */
  function odDaljave(){
    clearTimeout(odzivnik);
    odzivnik=setTimeout(function(){sinhroniziraj({tiho:true,leCePotrebno:true});},1200);
  }
  function naroci(){
    odjaviKanal();
    if(!sb||!user||!sb.channel)return;
    try{
      kanal=sb.channel("stanje:"+user.id)
        .on("postgres_changes",
          {event:"*",schema:"public",table:"stanje",filter:"uporabnik=eq."+user.id},
          function(dogodek){
            var novo=dogodek&&dogodek.new;
            /* Naš lasten upsert se vrne nazaj kot dogodek. Časa ne primerjamo
               kot niz — Postgres ga vrne v svojem zapisu, ne v našem ISO —
               ampak kot trenutek.                                           */
            var kdaj=novo&&novo.spremenjeno?Date.parse(novo.spremenjeno):NaN;
            if(isFinite(kdaj)&&isFinite(zadnjaSinkMs)&&kdaj<=zadnjaSinkMs)return;
            odDaljave();
          })
        .subscribe();
    }catch(err){kanal=null;}
  }
  function odjaviKanal(){
    clearTimeout(odzivnik);
    if(!kanal)return;
    try{sb.removeChannel(kanal);}catch(err){}
    kanal=null;
  }
  /* Rezerva za realtime: ko se vrneš v zavihek ali aplikacijo, potegni, kar
     je medtem naredila ekipa. Na telefonu je to praktično edini trenutek, ko
     se to lahko zgodi.                                                      */
  var zadnjiPogled=0;
  function obVrnitvi(){
    if(!sb||!user||document.hidden)return;
    var zdaj=Date.now();
    if(zdaj-zadnjiPogled<10000)return;   /* preklapljanje sem in tja ni razlog za klic */
    zadnjiPogled=zdaj;
    sinhroniziraj({tiho:true});
  }
  document.addEventListener("visibilitychange",obVrnitvi);
  window.addEventListener("focus",obVrnitvi);
  window.addEventListener("online",function(){if(sb&&user)sinhroniziraj({tiho:true});});
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
