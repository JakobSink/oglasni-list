/* Oglasni list · zagon.js
   Zagon aplikacije in service worker. Nalaga se zadnja.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

/* ============ zagon ============ */
/* Najprej stanje iz localStorage in migracija — šele tu, ker migracija kliče
   tudi kodo iz drugih datotek in te ob nalaganju stanje.js še ni bilo.     */
naloziStanje();

/* Naslov pove, kje si bil: pogled, pri odprti kreativi pa še ta. Zato te
   osvežitev — tudi tista, ki jo naredi nov service worker — vrne tja, kjer si
   nehal, in povezava do kreative drži tudi po ponovnem zagonu.              */
if(location.hash){
  var zac=izNaslova(location.hash);
  var zacKre=zac.kreativa?najdiKreativo(zac.kreativa):null;
  if(zacKre){
    S.aktivenProjekt=zacKre.izdelek.projekt;S.aktiven=zacKre.izdelek.id;
    odprtaKreativa=zacKre.kreativa.id;view="kreative";
  }else view=zac.view;
}
/* V vrstici je prostor za številko, ne za ves opis — ta gre v namig ob miški.
   Številka je tisto, kar pove, ali brskalnik strežé svežo kopijo.           */
if(el("verzija")){
  el("verzija").textContent="različica "+RAZLICICA_ST;
  el("verzija").title=RAZLICICA;
}
polniIzbirnik();
render();
osveziSideOblak();
/* kar je v košu več kot 30 dni, gre ob zagonu dokončno stran, z datotekami vred */
pociStiKos().then(function(st){if(st)shrani();},function(){});
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
    /* Številka v naslovu: ob novi različici se spremeni naslov skripte, zato
       brskalnik registracijo zagotovo obnovi. Uvoz verzija.js v sw.js sam po
       sebi zadošča na sodobnih brskalnikih, tole pa drži tudi na starejših. */
    navigator.serviceWorker.register("sw.js?v="+RAZLICICA_ST).then(function(reg){
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
