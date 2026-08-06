/* Oglasni list · predogled.js
   Kako oglas izgleda v posamezni umestitvi — Facebook, Instagram,
   TikTok, YouTube, Google.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

/* ============ predogled oglasa ============
   Obliko določi umestitev, ne platforma. Besedilo se zloži po vrsticah,
   tako kot ga zloži platforma, ne po številu znakov.                      */
var predVizual=null;

/* medij v razmerju umestitve; 9:16 material se v feedu obreže, kot v resnici */
function medij(razmerje,polni){
  var stil=razmerje?' style="aspect-ratio:'+razmerje+'"':'';
  if(!predVizual)return null;
  return /^video\//.test(predVizual.tip)
    ? '<video src="'+predVizual.url+'" muted loop autoplay playsinline preload="metadata"'+(polni?' class="polni"':'')+stil+'></video>'
    : '<img src="'+predVizual.url+'" alt=""'+(polni?' class="polni"':'')+stil+'>';
}
function prazno(razmerje,besedilo,video){
  var stil=razmerje?' style="aspect-ratio:'+razmerje+'"':'';
  return '<div class="ph"'+stil+'>'+(video?IKONA_VIDEO:IKONA_SLIKA)+
    '<span>'+esc(besedilo||"Naloži material zgoraj in pokazal se bo tu")+'</span></div>';
}
function vizual(spec,k,razmerje){
  var r=razmerje||spec.r||"1 / 1";
  var jeVideo=/video|UGC|zgodba/i.test(k.format);
  return medij(r)||prazno(r,jeVideo?"Ni naloženega videa":"Ni naložene slike",jeVideo);
}
/* besedilo, ki se zloži po n vrsticah in dobi „Več“ */
function zloz(txt,vrstic,oznaka,razred,pred){
  txt=String(txt||"");
  if(!txt.trim()&&!pred)return "";
  return '<div class="ft'+(razred?" "+razred:"")+'">'+
    '<span class="ft-t" style="-webkit-line-clamp:'+(vrstic||3)+'">'+(pred||"")+esc(txt)+'</span>'+
    '<span class="ft-m">…&nbsp;<b>'+esc(oznaka||"Več")+'</b></span></div>';
}
/* po vstavljanju v DOM: kje je besedilo res predolgo */
function zloziBesedila(){
  qa("#predogled .ft").forEach(function(d){
    var t=q(".ft-t",d);
    if(!t)return;
    d.classList.toggle("fold",t.scrollHeight-t.clientHeight>1);
  });
}
function telesno(k){
  return [prvi(k.hooki,predIzbor.hooki).trim(),prvi(k.primarna,predIzbor.primarna).trim()]
    .filter(Boolean).join("\n\n");
}
function risiPredogled(){
  var cilj=el("predogled");if(!cilj)return;
  var p=P(),k=K();if(!p||!k)return;
  var u=um(k), spec=u[2], risi=spec.risi;
  /* karusel in kolekcija sta formata, ki v feedu spremenita obliko */
  if(risi==="fbfeed"||risi==="igfeed"){
    if(k.format==="karusel")risi="karusel";
    else if(k.format==="kolekcija")risi="kolekcija";
    else if(k.format==="besedilo")risi="besedilo";
  }
  var risalke={
    fbfeed:predFbFeed, igfeed:predIgFeed, market:predMarket, zgodba:predZgodba,
    reels:predReels, tiktok:predTikTok, ytinstream:predYt, search:predSearch,
    display:predDisplay, pmax:predPmax, karusel:predKarusel, kolekcija:predKolekcija,
    besedilo:predBesedilo, splosno:predSplosno
  };
  var f=risalke[risi]||predSplosno;
  cilj.innerHTML=f(p,k,spec)+specHtml(k,u);
  zloziBesedila();
}
/* pod predogledom: mere in kaj se v tej umestitvi sploh vidi */
var IMENA_POLJ={primarna:"primarno besedilo",naslovi:"naslov",opisi:"opis",cta:"gumb",
  url:"prikazna domena",pot:"prikazna pot",sitelinki:"sitelinki"};
function specHtml(k,u){
  var spec=u[2], d=[];
  if(spec.r)d.push(String(spec.r).replace(" / "," : "));
  if(spec.px)d.push(spec.px+" px");
  if(spec.zlozi)d.push("besedilo se zloži po "+spec.zlozi+(spec.zlozi===1?" vrstici":" vrsticah"));
  var vidi=(spec.rabi||[]).map(function(x){return IMENA_POLJ[x]||x;}).join(", ");
  var opozorilo="";
  if(k.umestitev!==u[0])
    opozorilo='<span class="prev-warn">Format „'+esc(k.format)+'“ se v izbrani umestitvi ne vrti — prikazana je '+esc(u[1])+'.</span>';
  if(spec.r==="4 / 5"&&k.format==="video 9:16")
    opozorilo+='<span class="prev-warn">Video 9:16 se v feedu obreže na 4:5. Pomembno naj bo v sredini.</span>';
  if(predVizual&&predVizual.izdelkov)
    opozorilo+='<span>V predogledu je slika izdelka — ta kreativa še nima svojega materiala.</span>';
  return '<div class="prev-spec">'+opozorilo+
    '<b>'+esc(platIme(k.platforma)+" · "+u[1])+'</b>'+
    (d.length?'<span>'+esc(d.join(" · "))+'</span>':'')+
    (vidi?'<span>Vidi se: '+esc(vidi)+'</span>':'')+
  '</div>';
}
var IKONA_SLIKA='<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l4.5-4 3 2.5L15 11l6 5"/></svg>';
var IKONA_VIDEO='<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="14" height="14" rx="3"/><path d="M16.5 10l5-3v10l-5-3z"/></svg>';

/* ---- okvir telefona in vrhovi aplikacij ---- */
function statusVrstica(nad){
  return '<div class="fon-s'+(nad?" nad":"")+'">'+
    '<span class="ura">9:41</span><span class="sp"></span>'+
    '<span class="sig"><i></i><i></i><i></i><i class="d"></i></span>'+
    '<svg class="wifi" viewBox="0 0 16 12"><path d="M2.2 4.6a8.5 8.5 0 0 1 11.6 0M4.6 7.1a5 5 0 0 1 6.8 0"/><circle cx="8" cy="9.6" r="1"/></svg>'+
    '<span class="bat"><i></i></span>'+
  '</div>';
}
/* telefon z vrhom aplikacije in vsebino, ki se lista */
function fon(vrh,vsebina,razred){
  return '<div class="fon'+(razred?" "+razred:"")+'">'+statusVrstica()+(vrh||"")+
    '<div class="fon-b">'+vsebina+'</div></div>';
}
/* telefon, kjer medij zapolni cel zaslon (zgodba, reels, TikTok) */
function fonPolni(vsebina,razred){
  return '<div class="fon fon-polni'+(razred?" "+razred:"")+'">'+vsebina+statusVrstica(true)+'</div>';
}
var I_LUPA='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>';
var I_SRCE='<svg viewBox="0 0 24 24"><path d="M20.8 8.6c0 5.4-8.8 10.9-8.8 10.9S3.2 14 3.2 8.6A4.7 4.7 0 0 1 12 6.7a4.7 4.7 0 0 1 8.8 1.9z"/></svg>';
var I_KOMENT='<svg viewBox="0 0 24 24"><path d="M20.5 11.8a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.2-4.6A8.5 8.5 0 1 1 20.5 11.8z"/></svg>';
var I_LETALO='<svg viewBox="0 0 24 24"><path d="M21.5 3.5 2.5 10.2l6.4 2.3 2.3 6.4z"/><path d="M8.9 12.5 21.5 3.5"/></svg>';
var I_ZAZNAMEK='<svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4.3-6 4.3z"/></svg>';
var I_MSG='<svg viewBox="0 0 24 24"><path d="M12 3.2c-5 0-9 3.6-9 8.1 0 2.5 1.3 4.8 3.3 6.3v3.2l3-1.6c.9.2 1.8.4 2.7.4 5 0 9-3.6 9-8.2S17 3.2 12 3.2z"/><path d="M7.2 13.6 10 9.4l2.6 2 2.3-3.4"/></svg>';
var I_VEC='<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';
var I_PUSCICA='<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
var I_GOR='<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';

/* Vmesnik v predogledu je v anglescini, ker je tak tudi v resnici: Meta, Google
   in TikTok kazejo svoje gumbe in oznake v jeziku aplikacije, ne oglasa.
   Tvoje besedilo ostane slovensko - prevedeni so samo napisi platforme.     */
var CTA_EN={
  "Kupi zdaj":"Shop now","Nakupuj zdaj":"Shop now","Izvedi več":"Learn more",
  "Naroči zdaj":"Order now","Prijavi se":"Sign up","Pošlji sporočilo":"Send message",
  "Rezerviraj":"Book now","Prenesi":"Download","Poišči ponudbo":"Get offer","Pokliči":"Call now"
};
function ctaEN(k){
  var v=k.cta||privzetiCTA(k.platforma);
  return CTA_EN[v]||v;
}
/* avatar oglasevalca: logo izdelka, ce je nalozen, drugace zacetnice */
var predLogo=null;
function avatar(ime,razred){
  var c="fb-av"+(razred?" "+razred:"")+(predLogo?" ima-logo":"");
  return '<span class="'+c+'">'+
    (predLogo?'<img src="'+predLogo+'" alt="">':esc(zacetnice(ime)))+'</span>';
}
function vrhFB(){
  return '<div class="app app-fb"><span class="wm">facebook</span><span class="sp"></span>'+
    '<span class="ib">'+I_LUPA+'</span><span class="ib">'+I_MSG+'</span></div>';
}
function vrhIG(){
  return '<div class="app app-ig"><span class="wm">Instagram</span><span class="sp"></span>'+
    '<span class="ib">'+I_SRCE+'</span><span class="ib">'+I_LETALO+'</span></div>';
}
/* glava objave: avatar, ime oglaševalca, oznaka Sponzorirano */
function feedGlava(ime,jeIG){
  var globus='<svg viewBox="0 0 24 24" style="width:11px;height:11px"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>';
  return '<div class="fb-h">'+
    avatar(ime,jeIG?"ig-av":"")+
    '<span class="fb-hn"><b>'+esc(ime)+'</b><span>'+(jeIG?"Sponsored":"Sponsored · "+globus)+'</span></span>'+
    '<span class="fb-x">'+I_VEC+'</span>'+
  '</div>';
}
function feedNoge(){
  return '<div class="fb-r"><span class="rx"><i class="r1">👍</i><i class="r2">❤</i></span>'+
    '<span>142</span><span class="sp"></span><span>18 comments · 6 shares</span></div>'+
    '<div class="fb-a">'+
      '<span><svg viewBox="0 0 24 24"><path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 17 20H7"/></svg>Like</span>'+
      '<span>'+I_KOMENT+'Comment</span>'+
      '<span><svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4"/></svg>Share</span>'+
    '</div>';
}
/* kartica povezave pod sliko: domena, naslov v eni vrstici, opis, gumb */
function kartaFB(p,k,spec){
  var dom=domenaIz(p,k);
  var naslov=prvi(k.naslovi,predIzbor.naslovi);
  var opis=seVidi(spec,"opisi")?prvi(k.opisi,predIzbor.opisi):"";
  if(!naslov&&!opis&&!dom)return "";
  return '<div class="fb-f">'+
    '<span class="fb-fn">'+
      (dom?'<span class="u">'+esc(dom)+'</span>':'')+
      '<b class="c1">'+esc(naslov||"Naslov oglasa")+'</b>'+
      (opis?'<span class="d c1">'+esc(opis)+'</span>':'')+
    '</span>'+
    '<span class="fb-cta">'+esc(ctaEN(k))+'</span>'+
  '</div>';
}
/* Facebook feed */
function predFbFeed(p,k,spec){
  return fon(vrhFB(),
    '<div class="fb">'+
      feedGlava(znamkaIme(p),false)+
      zloz(telesno(k),spec.zlozi||3)+
      '<div class="fb-m">'+vizual(spec,k)+'</div>'+
      kartaFB(p,k,spec)+
      feedNoge()+
    '</div>');
}
/* samo besedilo, brez vizuala */
function predBesedilo(p,k,spec){
  return fon(vrhFB(),
    '<div class="fb">'+
      feedGlava(znamkaIme(p),false)+
      zloz(telesno(k),6)+
      kartaFB(p,k,spec)+
      feedNoge()+
    '</div>');
}
/* Instagram feed: brez naslova in opisa — vidi se samo napis pod sliko in gumb */
function predIgFeed(p,k,spec){
  var ime=String(znamkaIme(p)).toLowerCase().replace(/\s+/g,"_");
  var telo=telesno(k);
  return fon(vrhIG(),
    '<div class="ig">'+
      '<div class="fb-h">'+
        avatar(znamkaIme(p),"ig-av")+
        '<span class="fb-hn"><b>'+esc(ime)+'</b><span>Sponsored</span></span>'+
        '<span class="fb-x">'+I_VEC+'</span>'+
      '</div>'+
      '<div class="fb-m">'+vizual(spec,k)+'</div>'+
      '<div class="ig-cta"><b>'+esc(ctaEN(k))+'</b>'+I_PUSCICA+'</div>'+
      '<div class="ig-a"><span>'+I_SRCE+'</span><span>'+I_KOMENT+'</span><span>'+I_LETALO+'</span>'+
        '<span class="sp"></span><span>'+I_ZAZNAMEK+'</span></div>'+
      '<div class="ig-l">142 likes</div>'+
      (telo?'<div class="ig-c">'+zloz(telo,spec.zlozi||1,"more","ig",'<b>'+esc(ime)+'</b> ')+'</div>':'')+
    '</div>');
}
/* karusel: vsaka kartica dobi svoj naslov iz seznama različic */
function predKarusel(p,k,spec){
  var jeIG=k.platforma==="instagram";
  var m=medij("1 / 1");
  var nas=k.naslovi.filter(function(x){return String(x||"").trim();});
  if(!nas.length)nas=["Naslov kartice"];
  var kartice=nas.slice(0,5).map(function(t,i){
    return '<div class="kar-c">'+
      '<div class="kar-m">'+(m||'<span class="ph">'+IKONA_SLIKA+'</span>')+'<span class="kar-n">'+(i+1)+'</span></div>'+
      '<div class="kar-b"><b class="c2">'+esc(t)+'</b>'+
        (domenaIz(p,k)?'<span>'+esc(domenaIz(p,k))+'</span>':'')+
        '<span class="kar-cta">'+esc(ctaEN(k))+'</span></div>'+
    '</div>';
  }).join("");
  return fon(jeIG?vrhIG():vrhFB(),
    '<div class="fb'+(jeIG?" ig":"")+'">'+
      feedGlava(znamkaIme(p),jeIG)+
      zloz(telesno(k),spec.zlozi||3,jeIG?"more":"See more")+
      '<div class="kar"><div class="kar-t">'+kartice+'</div></div>'+
      '<div class="kar-d">'+nas.slice(0,5).map(function(_,i){return '<i'+(i?'':' class="on"')+'></i>';}).join("")+'</div>'+
      (jeIG?'':feedNoge())+
    '</div>');
}
/* kolekcija: glavni vizual in mreža izdelkov pod njim */
function predKolekcija(p,k,spec){
  var jeIG=k.platforma==="instagram";
  var m=medij("1 / 1");
  return fon(jeIG?vrhIG():vrhFB(),
    '<div class="fb'+(jeIG?" ig":"")+'">'+
      feedGlava(znamkaIme(p),jeIG)+
      zloz(telesno(k),spec.zlozi||3,jeIG?"more":"See more")+
      '<div class="fb-m">'+vizual(spec,k,"1.91 / 1")+'</div>'+
      '<div class="kol">'+[0,1,2].map(function(i){
        return '<div class="kol-c">'+(m||'<span class="ph">'+IKONA_SLIKA+'</span>')+
          '<span>'+(i===0?e(n(p.cena)):"izdelek "+(i+1))+'</span></div>';
      }).join("")+'</div>'+
      (jeIG?'':feedNoge())+
    '</div>');
}
/* Marketplace: mreža ponudb, oglas je ena od kartic */
function predMarket(p,k,spec){
  var naslov=prvi(k.naslovi,predIzbor.naslovi)||"Naslov ponudbe";
  var cena=n(p.cena)>0?e(n(p.cena)):"—";
  var m=medij("1 / 1");
  var tuji=["Similar item","Listed 2 days ago","Used · Ljubljana"];
  return fon('<div class="app app-mk"><b>Marketplace</b><span class="sp"></span><span class="ib">'+I_LUPA+'</span></div>',
    '<div class="mk">'+
      '<div class="mk-g">'+
        '<div class="mk-c mk-ad">'+
          '<div class="mk-m">'+(m||'<span class="ph">'+IKONA_SLIKA+'</span>')+'<span class="mk-o">Sponsored</span></div>'+
          '<b>'+esc(cena)+'</b><span class="c2">'+esc(naslov)+'</span>'+
          '<span class="mk-l">Ljubljana</span>'+
          '<span class="mk-cta">'+esc(ctaEN(k))+'</span>'+
        '</div>'+
        tuji.map(function(t){
          return '<div class="mk-c"><div class="mk-m mk-siv"></div><b>—</b><span class="c2">'+esc(t)+'</span></div>';
        }).join("")+
      '</div>'+
    '</div>');
}
/* zgodba: cel zaslon, oznaka zgoraj, gumb spodaj */
function predZgodba(p,k,spec){
  var jeIG=k.platforma==="instagram";
  var telo=telesno(k);
  return fonPolni(
    '<div class="zg-m">'+(medij("9 / 16",true)||prazno(null,"Ni naloženega 9:16 videa ali slike",true))+'</div>'+
    '<div class="zg-vrh">'+
      '<div class="zg-bar"><i></i><i class="d"></i><i class="d"></i></div>'+
      '<div class="zg-id">'+avatar(znamkaIme(p),jeIG?"ig-av":"")+
        '<b>'+esc(jeIG?String(znamkaIme(p)).toLowerCase().replace(/\s+/g,"_"):znamkaIme(p))+'</b>'+
        '<span class="zg-ozn">Sponsored</span><span class="sp"></span><span class="zg-x">✕</span></div>'+
    '</div>'+
    '<div class="zg-spo">'+
      (telo?zloz(telo,spec.zlozi||2,"more","na-temnem"):"")+
      '<div class="zg-cta">'+I_GOR+'<b>'+esc(ctaEN(k))+'</b></div>'+
    '</div>');
}
/* Reels in Shorts: cel zaslon, stranska vrsta ikon, gumb pod napisom */
function predReels(p,k,spec){
  var jeYT=k.platforma==="youtube";
  var jeIG=k.platforma==="instagram";
  var ime=String(znamkaIme(p)).toLowerCase().replace(/\s+/g,"_");
  var telo=telesno(k);
  return fonPolni(
    '<div class="zg-m">'+(medij("9 / 16",true)||prazno(null,"Ni naloženega 9:16 videa",true))+'</div>'+
    '<div class="rl-grad"></div>'+
    '<div class="rl-side">'+
      '<span>'+I_SRCE+'<i>1.2K</i></span>'+
      '<span>'+I_KOMENT+'<i>318</i></span>'+
      '<span>'+I_LETALO+'<i>Share</i></span>'+
      '<span>'+I_VEC+'</span>'+
      '<span class="rl-disk"></span>'+
    '</div>'+
    '<div class="rl-b">'+
      '<div class="rl-id">'+avatar(znamkaIme(p),jeIG?"ig-av":"")+
        '<b>'+esc(jeIG?ime:znamkaIme(p))+'</b><span class="rl-sledi">Follow</span></div>'+
      '<span class="rl-ozn">Sponsored</span>'+
      (telo?zloz(telo,spec.zlozi||2,"more","na-temnem"):"")+
      '<span class="rl-zvok">♪ '+esc(jeYT?"original audio":znamkaIme(p)+" · original audio")+'</span>'+
      '<div class="rl-cta'+(jeYT?" yt":"")+'"><b>'+esc(ctaEN(k))+'</b>'+I_PUSCICA+'</div>'+
    '</div>');
}
/* TikTok Za vas */
function predTikTok(p,k,spec){
  var ime="@"+String(znamkaIme(p)).toLowerCase().replace(/[^\wčšžćđ]+/gi,"");
  var telo=telesno(k);
  return fonPolni(
    '<div class="zg-m">'+(medij("9 / 16",true)||prazno(null,"Ni naloženega 9:16 videa",true))+'</div>'+
    '<div class="tt-vrh"><span>Following</span><b>For You</b></div>'+
    '<div class="rl-grad"></div>'+
    '<div class="rl-side tt-s">'+
      '<span class="tt-av"><i class="fb-av'+(predLogo?" ima-logo":"")+'">'+
        (predLogo?'<img src="'+predLogo+'" alt="">':esc(zacetnice(znamkaIme(p))))+'</i><em>+</em></span>'+
      '<span>'+I_SRCE+'<i>2143</i></span>'+
      '<span>'+I_KOMENT+'<i>86</i></span>'+
      '<span>'+I_ZAZNAMEK+'<i>41</i></span>'+
      '<span class="rl-disk tt-d"></span>'+
    '</div>'+
    '<div class="rl-b">'+
      '<b class="tt-ime">'+esc(ime)+'</b>'+
      '<span class="tt-ozn">Sponsored</span>'+
      (telo?zloz(telo,spec.zlozi||2,"more","na-temnem"):"")+
      '<span class="rl-zvok">♪ promoted music</span>'+
      '<div class="rl-cta tt-cta2"><b>'+esc(ctaEN(k))+'</b>'+I_PUSCICA+'</div>'+
    '</div>','tt');
}
/* YouTube in-stream: predvajalnik z gumbom za preskok */
function predYt(p,k,spec){
  var naslov=prvi(k.naslovi,predIzbor.naslovi)||"Naslov oglasa";
  return '<div class="yt">'+
    '<div class="yt-p">'+(medij("16 / 9")||prazno("16 / 9","Ni naloženega 16:9 videa",true))+
      '<span class="yt-ozn">Ad</span>'+
      '<span class="yt-skip">Skip ad '+I_PUSCICA+'</span>'+
      '<div class="yt-prog"><i></i></div>'+
    '</div>'+
    '<div class="yt-f">'+
      avatar(znamkaIme(p))+
      '<span class="yt-fn"><b class="c1">'+esc(naslov)+'</b>'+
        '<span>'+esc(domenaIz(p,k)||"tvoja-domena.si")+'</span></span>'+
      '<span class="yt-cta">'+esc(ctaEN(k))+'</span>'+
    '</div>'+
  '</div>';
}
/* Google iskanje: dve kombinaciji, kot jih sestavi Google sam */
function predSearch(p,k,spec){
  var nas=k.naslovi.filter(function(x){return String(x||"").trim();});
  var opi=k.opisi.filter(function(x){return String(x||"").trim();});
  var dom=domenaIz(p,k)||"tvoja-domena.si";
  var pot=[k.pot1,k.pot2].map(function(x){return String(x||"").trim();}).filter(Boolean);
  if(!pot.length)pot=potIz(k);
  var znamka=znamkaIme(p);
  var sl=String(k.sitelinki||"").split(",").map(function(x){return x.trim();}).filter(Boolean);
  var poizvedba=String(k.kljucneBesede||"").split(",")[0].trim()||prvi(k.naslovi).toLowerCase()||"tvoja ključna beseda";
  var vrh='<div class="gg-q">'+I_LUPA+'<span>'+esc(poizvedba)+'</span></div>'+
    '<div class="gg-tabs"><b>All</b><span>Images</span><span>Shopping</span><span>Videos</span><span>News</span></div>';
  if(!nas.length&&!opi.length){
    return '<div class="gg">'+vrh+
      '<p class="gg-empty">Vpiši vsaj en naslov, da se predogled izriše.<br><br>'+
      'Google iz tvojih naslovov sam sestavlja kombinacije po tri — zato mora vsak zveneti smiselno tudi sam in ne sme biti nadaljevanje prejšnjega.</p></div>';
  }
  function vrstica(nabor,opisi){
    return '<div class="gg-r">'+
      '<div class="gg-id">'+
        '<span class="gg-fav'+(predLogo?" ima-logo":"")+'">'+
          (predLogo?'<img src="'+predLogo+'" alt="">':esc(zacetnice(znamka)))+'</span>'+
        '<span class="gg-idn"><b>'+esc(znamka)+'</b>'+
          '<span>'+esc(dom)+(pot.length?' › '+pot.map(esc).join(" › "):'')+'</span></span>'+
      '</div>'+
      '<div class="gg-ad">Sponsored</div>'+
      '<span class="gg-t">'+esc(nabor.join(" | "))+'</span>'+
      '<p class="gg-d">'+esc(opisi.join(" "))+'</p>'+
      (sl.length?'<div class="gg-sl">'+sl.slice(0,4).map(function(s){return '<span>'+esc(s)+'</span>';}).join("")+'</div>':'')+
    '</div>';
  }
  var a=vrstica(nas.slice(0,3),opi.slice(0,2));
  var b="";
  if(nas.length>3||opi.length>2){
    var nb=nas.slice(3).concat(nas.slice(0,1)).slice(0,3);
    var ob=opi.slice(2).concat(opi.slice(0,1)).slice(0,2);
    b=vrstica(nb.length?nb:nas.slice(0,3),ob.length?ob:opi.slice(0,2));
  }
  return '<div class="gg">'+vrh+a+b+
    (b?'<p class="gg-note">Dve od možnih kombinacij — Google jih rotira sam.</p>':'')+
  '</div>';
}
/* Google Display: odzivni oglas v dveh velikostih */
function predDisplay(p,k,spec){
  var naslov=prvi(k.naslovi,predIzbor.naslovi)||"Naslov oglasa";
  var opis=prvi(k.opisi,predIzbor.opisi);
  var dom=domenaIz(p,k)||"tvoja-domena.si";
  var m1=medij("1.91 / 1"), m2=medij("1 / 1");
  return '<div class="gd-w">'+
    '<div class="gd">'+
      '<div class="gd-m">'+(m1||prazno("1.91 / 1","1200 × 628"))+'</div>'+
      '<div class="gd-b"><span class="gd-o">Ad · '+esc(dom)+'</span>'+
        '<b class="c2">'+esc(naslov)+'</b>'+
        (opis?'<span class="c2">'+esc(opis)+'</span>':'')+
        '<span class="gd-cta">'+esc(ctaEN(k))+'</span></div>'+
    '</div>'+
    '<div class="gd gd-kv">'+
      '<div class="gd-m">'+(m2||prazno("1 / 1","300 × 250"))+'</div>'+
      '<div class="gd-b"><span class="gd-o">Ad</span><b class="c2">'+esc(naslov)+'</b>'+
        '<span class="gd-cta">'+esc(ctaEN(k))+'</span></div>'+
    '</div>'+
  '</div>';
}
/* Performance Max: isti material, več površin */
function predPmax(p,k,spec){
  return '<div class="pmax">'+predSearch(p,k,spec)+predDisplay(p,k,spec)+
    '<p class="gg-note">Performance Max iz istih naslovov, opisov in slik sestavlja oglase za iskanje, Display, YouTube, Gmail in Discover. Nadzora nad razdelitvijo ni — zato mora vsak kos gradiva zdržati sam.</p></div>';
}
function predSplosno(p,k,spec){
  var m=medij(spec&&spec.r?spec.r:null);
  var telo=telesno(k);
  var nas=prvi(k.naslovi,predIzbor.naslovi);
  return '<div class="gen">'+
    (m||'')+
    (nas?'<b style="font-size:17px">'+esc(nas)+'</b>':'')+
    (telo?'<p style="font-size:13.5px;color:var(--ink2);white-space:pre-wrap">'+esc(telo)+'</p>':'')+
    '<div class="row"><span class="pill np" style="background:var(--brand);color:var(--brand-on)">'+esc(k.cta||"Izvedi več")+'</span>'+
      (domenaIz(p,k)?'<span class="note">'+esc(domenaIz(p,k))+'</span>':'')+'</div>'+
  '</div>';
}

/* Datoteke visijo na lastniku: kreativa (njen id) ali izdelek ("izd:"+id).
   Material izdelka je skupen vsem njegovim kreativam.                      */
function datLastnikIzdelka(p){return "izd:"+(p&&p.id);}
/* Logo oglasevalca je logo MAPE (celostna podoba), ne izdelka - drugace bi
   isto stvar vpisoval pri vsakem izdelku iste znamke.                     */
function datLastnikLogo(pr){return "cgp:"+(pr&&pr.id);}
/* reference kreative so ločene od materiala — v predogled ne gredo nikoli */
function datLastnikRef(k){return "ref:"+(k&&k.id);}
/* Material kreative. Če stikalo vodi besedila, vodi tudi material: hrvaška
   različica ima svojo sliko s prevedenim napisom, slovenska svojo. Preklop
   stikala zamenja oboje hkrati.                                            */
function datLastnik(k){
  if(!k)return null;
  var g=stikVodi(k);
  if(!g)return k.id;
  var v=stikVrednost(k,g);
  return v===STIK_VSE?k.id:k.id+"|"+v;
}
/* vsi lastniki, ki jih ima kreativa — za brisanje */
function datLastnikiKreative(k){
  var out=[k.id,datLastnikRef(k)];
  stikala().forEach(function(g){
    g.moznosti.forEach(function(m){out.push(k.id+"|"+m);});
  });
  return out;
}
function datCilji(){
  var out=[], k=K(), p=P();
  if(el("datoteke")&&k)out.push({cilj:"datoteke",lastnik:datLastnik(k),zapis:k});
  if(el("datoteke-izd")&&p)out.push({cilj:"datoteke-izd",lastnik:datLastnikIzdelka(p),zapis:p});
  if(el("datoteke-ref")&&k)out.push({cilj:"datoteke-ref",lastnik:datLastnikRef(k)});
  /* CGP je na vsaki mapi v pogledu Projekti, zato jih naštejemo iz DOM */
  qa("[id^='datoteke-cgp-']").forEach(function(box){
    var prid=box.id.replace("datoteke-cgp-","");
    out.push({cilj:box.id,lastnik:"cgp:"+prid});
  });
  return out;
}
function narisiDatoteke(){
  if(!Datoteke.naVoljo)return;
  datCilji().forEach(narisiDatotekeV);
}
function narisiDatotekeV(c){
  var cilj=el(c.cilj);
  if(!cilj)return;
  Datoteke.zaKreativo(c.lastnik).then(function(sez){
    sez=(sez||[]).slice().sort(Datoteke.poVrsti);
    if(c.zapis&&c.zapis.stDatotek!==sez.length){c.zapis.stDatotek=sez.length;shrani();}
    if(!sez.length){cilj.innerHTML='';return;}
    cilj.innerHTML=sez.map(function(d){
      /* Zapis brez bajtov je v oblaku. Prenesemo ga enkrat; če ne uspe, ga NE
         poskušamo znova pri vsakem izrisu — prej je to naredilo zanko in slike
         se sploh niso pokazale.                                             */
      if(!d.blob){
        var spodletelo=prenosSpodletel[d.id];
        return '<div class="file cakam'+(spodletelo?" ni":"")+'"'+(spodletelo?'':' data-fetch="'+d.id+'"')+'>'+
          '<div class="prev"><span class="ikona">'+(spodletelo?"ni tu":"oblak")+'</span></div>'+
          '<div class="meta"><span class="fn">'+esc(d.ime)+'</span>'+
            '<span class="fs">'+mb(d.velikost)+(spodletelo?" · ni v tej napravi":" · prenašam …")+'</span></div>'+
          /* Izbrisati se mora dati tudi tisto, česar tu ni — brisanje ne rabi
             bajtov. Prej je bil edini gumb „poskusi znova“ in zapisa ni bilo
             mogoče spraviti ven z naprave, na kateri si stal.                */
          '<div class="fa no-print">'+
            (spodletelo?'<button data-retry="'+d.id+'">poskusi znova</button>':'')+
            '<button class="d" data-ddel="'+d.id+'">izbriši</button>'+
          '</div>'+
        '</div>';
      }
      var u="";
      try{u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);}catch(err){}
      var jeSlika=/^image\//.test(d.tip)&&u, jeVideo=/^video\//.test(d.tip)&&u;
      var prev = jeSlika ? '<img src="'+u+'" alt="'+esc(d.ime)+'">'
        : jeVideo ? '<video src="'+u+'" muted preload="metadata"></video><span class="tag">video</span>'
        : '<span class="ikona">'+esc((d.ime.split(".").pop()||"datoteka").slice(0,8))+'</span>';
      return '<div class="file">'+
        '<div class="prev"'+((jeSlika||jeVideo)?' data-zoom="'+d.id+'" title="Klikni za povečavo"':'')+'>'+prev+'</div>'+
        '<div class="meta"><span class="fn">'+esc(d.ime)+'</span><span class="fs">'+mb(d.velikost)+'</span></div>'+
        '<div class="fa no-print"><button data-dl="'+d.id+'">prenesi</button><button class="d" data-ddel="'+d.id+'">izbriši</button></div>'+
      '</div>';
    }).join("");
    /* Kar visi v oblaku, poberemo in seznam prerišemo enkrat. Kar ne pride,
       si zapomnimo, da ne vrtimo v krogu.                                   */
    var vrsta=Promise.resolve(), koliko=0;
    qa("[data-fetch]",cilj).forEach(function(box){
      var id=box.dataset.fetch;
      koliko++;
      vrsta=vrsta.then(function(){
        return Datoteke.zagotovi(id).then(function(z){
          if(!z||!z.blob)prenosSpodletel[id]=true;
        },function(){prenosSpodletel[id]=true;});
      });
    });
    if(koliko)vrsta.then(function(){narisiDatotekeV(c);});
  },function(err){
    cilj.innerHTML='<p class="note">Datotek ni bilo mogoče prebrati: '+esc(err&&err.message||"neznana napaka")+'</p>';
  });
}
function dodajDatoteke(files,lastnik){
  if(!lastnik){
    var k=K();
    if(!k){toast("Najprej odpri kreativo.");return;}
    lastnik=datLastnik(k);
  }
  var arr=Array.prototype.slice.call(files||[]).filter(function(f){return f&&f.size>=0;});
  if(!arr.length)return;
  var veliki=arr.filter(function(f){return f.size>60*1024*1024;});
  if(veliki.length&&!confirm(veliki.length+" datotek je večjih od 60 MB. Shramba brskalnika je omejena — nadaljujem?"))return;
  var kid=lastnik, uspelo=0, prva=Promise.resolve();
  arr.forEach(function(f){
    prva=prva.then(function(){return Datoteke.dodaj(kid,f).then(function(){uspelo++;});});
  });
  prva.then(function(){
    toast(uspelo===1?"Datoteka dodana.":uspelo+" datotek dodanih.");
    narisiDatoteke();osveziPredVizual();
  },function(err){
    narisiDatoteke();osveziPredVizual();
    toast("Shranjevanje ni uspelo"+(uspelo?" po "+uspelo+" datotekah":"")+": "+(err&&err.message||"shramba je zavrnila zapis"));
  });
}
/* logo izdelka za avatar oglasevalca v predogledu */
function osveziLogo(){
  var pr=PR();
  if(!pr||!Datoteke.naVoljo){predLogo=null;return;}
  Datoteke.prviVizual(datLastnikLogo(pr)).then(function(d){
    if(!d){predLogo=null;risiPredogled();return;}
    try{var u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);predLogo=u;}
    catch(err){predLogo=null;}
    risiPredogled();
  },function(){predLogo=null;});
}
/* Po dodajanju ali brisanju osveži sliko v predogledu oglasa. Če kreativa
   nima svojega materiala, vzame prvo sliko izdelka.                        */
function osveziPredVizual(){
  var k=K(),p=P();
  osveziLogo();
  if(!k||!Datoteke.naVoljo)return;
  function uporabi(d,izIzdelka){
    if(!d){predVizual=null;risiPredogled();return;}
    try{
      var u=URL.createObjectURL(d.blob);odprtiUrlji.push(u);
      predVizual={url:u,tip:d.tip,izdelkov:!!izIzdelka};
    }catch(err){predVizual=null;}
    risiPredogled();
  }
  Datoteke.prviVizual(datLastnik(k)).then(function(d){
    if(d||!p)return uporabi(d,false);
    Datoteke.prviVizual(datLastnikIzdelka(p)).then(function(d2){uporabi(d2,true);},function(){uporabi(null);});
  },function(){uporabi(null);});
}
function prenesiDatoteko(id){
  Datoteke.ena(id).then(function(d){
    if(!d)return;
    var u=URL.createObjectURL(d.blob),a=document.createElement("a");
    a.href=u;a.download=d.ime;document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},1000);
  });
}
/* povečava slike ali videa */
function pokaziPovecano(id){
  Datoteke.ena(id).then(function(d){
    if(!d)return;
    var u;
    try{u=URL.createObjectURL(d.blob);}catch(err){return;}
    el("lb-in").innerHTML = /^video\//.test(d.tip)
      ? '<video src="'+u+'" controls autoplay></video>'
      : '<img src="'+u+'" alt="'+esc(d.ime)+'">';
    el("lb").hidden=false;
    el("lb")._u=u;
  });
}
function zapriPovecano(){
  var lb=el("lb");if(!lb||lb.hidden)return;
  lb.hidden=true;
  el("lb-in").innerHTML="";
  if(lb._u){try{URL.revokeObjectURL(lb._u);}catch(err){}lb._u=null;}
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
