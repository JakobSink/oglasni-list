/* Oglasni list · obrez.js
   Obrez ene slike v vse formate, ki jih rabijo umestitve, in predloga mer.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.

   Videa tu ni in ga ne bo: pretvorba videa v brskalniku pomeni ffmpeg.wasm,
   kakih 25 MB, kar podre pravilo, da aplikacija nima odvisnosti, in napihne
   predpomnilnik service workerja. Video gre še naprej skozi urejevalnik.   */
"use strict";

/* ============ cilji ============
   Ciljev ne pišemo na roko — preberemo jih iz UMESTITVE, kjer že piše, kakšno
   sliko posamezna umestitev hoče (`px:"1080 × 1350"`). Tako nova umestitev
   dobi svoj izrez sama od sebe in dve tabeli ne moreta narazen.            */
function obrezCilji(){
  var poMeri={}, out=[];
  Object.keys(UMESTITVE).forEach(function(plat){
    UMESTITVE[plat].forEach(function(u){
      var px=u[2]&&u[2].px;if(!px)return;   /* iskanje nima slike */
      var d=String(px).split(/[^0-9]+/).filter(Boolean);
      if(d.length<2)return;
      var w=parseInt(d[0],10), h=parseInt(d[1],10);
      if(!w||!h)return;
      var kljuc=w+"x"+h;
      if(!poMeri[kljuc]){
        poMeri[kljuc]={id:kljuc,w:w,h:h,r:u[2].r||"",kje:[]};
        out.push(poMeri[kljuc]);
      }
      var ime=platIme(plat)+" "+u[1];
      if(poMeri[kljuc].kje.indexOf(ime)<0)poMeri[kljuc].kje.push(ime);
    });
  });
  /* od najbolj pokončnega proti najbolj ležečemu — tako stojijo tudi v oknu */
  out.sort(function(a,b){return (a.w/a.h)-(b.w/b.h);});
  return out;
}
function obrezCilj(id){
  return obrezCilji().filter(function(c){return c.id===id;})[0]||null;
}
/* Kateri cilji so za to kreativo prvi na vrsti: tisti, ki jih rabi njena
   umestitev, in poleg njih pokončni par, ker isti oglas skoraj vedno teče še
   v zgodbi.                                                                */
function obrezPrivzeti(k){
  var izbrani={};
  var u=k&&umNajdi(k.platforma,k.umestitev);
  if(u&&u[2]&&u[2].px){
    var d=String(u[2].px).split(/[^0-9]+/).filter(Boolean);
    if(d.length>1)izbrani[parseInt(d[0],10)+"x"+parseInt(d[1],10)]=true;
  }
  izbrani["1080x1350"]=true;izbrani["1080x1920"]=true;
  return obrezCilji().filter(function(c){return izbrani[c.id];}).map(function(c){return c.id;});
}

/* ============ varne cone ============
   Koliko pikslov na 1080 × 1920 pokrije vmesnik same aplikacije. Številke so
   približek po Metinih priporočilih in namenoma stroge — vzete so slabše od
   zgodbe in reelsa skupaj, da eno besedilo drži v obojem. Če se vmesnik
   spremeni, se popravi tukaj in nikjer drugje.                             */
var VARNE_CONE={
  "1080x1920":{zgoraj:250,spodaj:450,desno:240,
    zakaj:"zgoraj ime profila, spodaj napis in gumb, desno gumbi za všečke"}
};
function varnaCona(id){return VARNE_CONE[id]||null;}

/* ============ matematika obreza ============
   Izrez pokrije cel cilj (nikoli belih robov), središče pa je tam, kamor je
   uporabnik postavil točko fokusa. Če točke ni, je na sredini.
   fx in fy sta deleža, 0..1.                                               */
function obrezOkno(sw,sh,tw,th,fx,fy){
  sw=Math.max(1,sw|0);sh=Math.max(1,sh|0);
  var mera=Math.max(tw/sw,th/sh);          /* koliko moramo povečati vir */
  var dw=Math.min(sw,Math.round(tw/mera)); /* izrez v pikslih vira */
  var dh=Math.min(sh,Math.round(th/mera));
  fx=isFinite(fx)?Math.min(1,Math.max(0,fx)):0.5;
  fy=isFinite(fy)?Math.min(1,Math.max(0,fy)):0.5;
  return {
    sx:Math.round(Math.min(sw-dw,Math.max(0,fx*sw-dw/2))),
    sy:Math.round(Math.min(sh-dh,Math.max(0,fy*sh-dh/2))),
    dw:dw,dh:dh,
    /* Koliko vira pade stran. To je edina številka, ki uporabniku pove, ali
       je izrez sploh smiseln: 4:5 → 1,91:1 vzame več kot polovico.         */
    izgubljeno:1-(dw*dh)/(sw*sh),
    /* Cilj je večji od vira — slika bo mehka. Raje povemo, kot tiho povečamo. */
    povecava:mera>1?mera:1
  };
}
/* Kje znotraj pokončne slike 1080 × 1920 leži posamezen okvir, če je izrez
   sredinski. Iz tega nastane predloga mer.                                 */
function predlogaMere(){
  var osnova=obrezCilj("1080x1920");
  if(!osnova)return null;
  var W=osnova.w, H=osnova.h;
  var cona=varnaCona(osnova.id)||{zgoraj:0,spodaj:0,desno:0};
  var okvirji=obrezCilji().filter(function(c){
    /* zanimajo nas okvirji, ki so v tej pokončni sliki sploh lahko: širši od
       9:16, a ne ležeči — ležečega si iz zgodbe tako ali tako ne izrežeš */
    return c.id!==osnova.id&&c.w/c.h>W/H&&c.w/c.h<=1.2;
  }).map(function(c){
    var o=obrezOkno(W,H,c.w,c.h,0.5,0.5);
    return {id:c.id,ime:c.w+" × "+c.h,r:c.r,kje:c.kje,
      x:o.sx,y:o.sy,w:o.dw,h:o.dh};
  });
  /* Presek vsega: kar je znotraj vseh okvirjev in hkrati zunaj varnih con.
     To je edini prostor, kamor smeš dati napis, če naj isti izdelek teče v
     feedu in v zgodbi.                                                     */
  var x1=0, y1=cona.zgoraj, x2=W-cona.desno, y2=H-cona.spodaj;
  okvirji.forEach(function(o){
    x1=Math.max(x1,o.x);y1=Math.max(y1,o.y);
    x2=Math.min(x2,o.x+o.w);y2=Math.min(y2,o.y+o.h);
  });
  return {w:W,h:H,cona:cona,okvirji:okvirji,
    presek:{x:x1,y:y1,w:Math.max(0,x2-x1),h:Math.max(0,y2-y1)}};
}

/* ============ risanje ============
   jsdom nima platna, zato vsak vstop preveri, ali ga brskalnik sploh da; brez
   tega bi test padel na risanju, ki ga ne preverja.                        */
function obrezPlatno(w,h){
  var c=document.createElement("canvas");
  c.width=w;c.height=h;
  var ctx=c.getContext&&c.getContext("2d");
  return ctx?{c:c,ctx:ctx}:null;
}
function obrezVBlob(c,tip,kakovost){
  return new Promise(function(res,rej){
    if(!c.toBlob)return rej(new Error("Ta brskalnik ne zna shraniti platna."));
    c.toBlob(function(b){b?res(b):rej(new Error("Izreza ni bilo mogoče narediti."));},tip,kakovost);
  });
}
/* iz blob-a naredi nekaj, kar zna drawImage narisati */
function obrezSlika(blob){
  if(window.createImageBitmap){
    return createImageBitmap(blob).then(null,function(){return obrezSlikaPrekUrlja(blob);});
  }
  return obrezSlikaPrekUrlja(blob);
}
function obrezSlikaPrekUrlja(blob){
  return new Promise(function(res,rej){
    var u,img=new Image();
    try{u=URL.createObjectURL(blob);}catch(err){return rej(err);}
    img.onload=function(){res(img);};
    img.onerror=function(){URL.revokeObjectURL(u);rej(new Error("Slike ni bilo mogoče prebrati."));};
    img.src=u;
  });
}
/* PNG ostane PNG (logotipi in prosojnost), vse drugo gre v JPEG — fotografija
   v PNG je po nepotrebnem petkrat večja.                                   */
function obrezTip(vir){return /png/i.test(vir||"")?"image/png":"image/jpeg";}
function obrezIme(ime,cilj,tip){
  var brez=String(ime||"slika").replace(/\.[^.]+$/,"");
  return brez+" · "+cilj.w+"×"+cilj.h+(tip==="image/png"?".png":".jpg");
}
/* Ena slika → en izrez. Vrne {blob, ime, okno}.                            */
function obrezNaredi(slika,vir,cilj,fokus){
  var o=obrezOkno(slika.width,slika.height,cilj.w,cilj.h,fokus&&fokus.x,fokus&&fokus.y);
  var p=obrezPlatno(cilj.w,cilj.h);
  if(!p)return Promise.reject(new Error("Ta brskalnik ne podpira platna."));
  var tip=obrezTip(vir&&vir.tip);
  if(tip==="image/jpeg"){
    /* JPEG ne pozna prosojnosti; brez podlage bi prosojni deli počrneli */
    p.ctx.fillStyle="#ffffff";p.ctx.fillRect(0,0,cilj.w,cilj.h);
  }
  p.ctx.drawImage(slika,o.sx,o.sy,o.dw,o.dh,0,0,cilj.w,cilj.h);
  return obrezVBlob(p.c,tip,0.92).then(function(b){
    return {blob:b,ime:obrezIme(vir&&vir.ime,cilj,tip),okno:o,tip:tip};
  });
}

/* ============ predloga mer ============
   Prosojen PNG 1080 × 1920, ki ga v urejevalniku položiš čez svojo postavitev:
   pokaže, kaj ostane v feedu, kaj pokrije vmesnik zgodbe in kje je prostor,
   ki preživi oboje.                                                        */
function predlogaPng(){
  var m=predlogaMere();
  if(!m)return Promise.reject(new Error("Mer ni bilo mogoče izračunati."));
  var p=obrezPlatno(m.w,m.h);
  if(!p)return Promise.reject(new Error("Ta brskalnik ne podpira platna."));
  var ctx=p.ctx;
  function crte(barva,sirina,crtkano){
    ctx.strokeStyle=barva;ctx.lineWidth=sirina;
    ctx.setLineDash(crtkano||[]);
  }
  function napis(txt,x,y,barva,velikost,desno){
    ctx.font="600 "+(velikost||30)+"px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign=desno?"right":"left";
    ctx.textBaseline="top";
    var s=ctx.measureText(txt).width;
    ctx.fillStyle="rgba(0,0,0,.72)";
    ctx.fillRect((desno?x-s:x)-10,y-6,s+20,(velikost||30)+12);
    ctx.fillStyle=barva;
    ctx.fillText(txt,x,y);
  }
  /* varne cone: kar prekrije vmesnik, potemnimo */
  ctx.fillStyle="rgba(220,38,38,.22)";
  ctx.fillRect(0,0,m.w,m.cona.zgoraj);
  ctx.fillRect(0,m.h-m.cona.spodaj,m.w,m.cona.spodaj);
  ctx.fillRect(m.w-m.cona.desno,m.cona.zgoraj,m.cona.desno,m.h-m.cona.zgoraj-m.cona.spodaj);

  /* okvirji drugih formatov */
  m.okvirji.forEach(function(o){
    crte("rgba(37,99,235,.95)",5,[18,12]);
    ctx.strokeRect(o.x+2.5,o.y+2.5,o.w-5,o.h-5);
    napis(o.ime+"  ("+o.r.replace(/\s/g,"")+")",o.x+22,o.y+18,"#93c5fd",30);
  });

  /* presek — tu sme stati napis */
  crte("rgba(22,163,74,1)",7,[]);
  ctx.strokeRect(m.presek.x+3.5,m.presek.y+3.5,m.presek.w-7,m.presek.h-7);
  ctx.fillStyle="rgba(22,163,74,.10)";
  ctx.fillRect(m.presek.x,m.presek.y,m.presek.w,m.presek.h);
  napis("VARNO POVSOD  "+m.presek.w+" × "+m.presek.h+" px, od vrha "+m.presek.y,
    m.presek.x+22,m.presek.y+m.presek.h-52,"#86efac",30);

  /* rob celotne zgodbe in razlaga */
  crte("rgba(255,255,255,.9)",6,[]);
  ctx.strokeRect(3,3,m.w-6,m.h-6);
  napis("9:16  "+m.w+" × "+m.h,22,22,"#ffffff",32);
  napis("rdeče = pokrije vmesnik",22,m.h-140,"#fca5a5",28);
  napis("modro = izrez za feed",22,m.h-100,"#93c5fd",28);
  napis("zeleno = varno za vse",22,m.h-60,"#86efac",28);
  return obrezVBlob(p.c,"image/png").then(function(b){
    return {blob:b,ime:"predloga-mere-"+m.w+"x"+m.h+".png",mere:m};
  });
}

/* ============ prenos ============ */
function obrezPrenesi(blob,ime){
  var u=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=u;a.download=ime;document.body.appendChild(a);a.click();
  setTimeout(function(){
    if(a.parentNode)a.parentNode.removeChild(a);
    URL.revokeObjectURL(u);
  },1000);
}

/* ============ okno ============ */
/* stanje odprtega okna; zunaj njega ne obstaja */
var obrezStanje=null;

function odpriObrez(id){
  if(!Datoteke.naVoljo)return;
  Datoteke.ena(id).then(function(d){
    if(!d||!d.blob){toast("Te slike ni v tej napravi.");return;}
    if(!/^image\//.test(d.tip||"")){toast("Obrezati se dajo samo slike, ne videi.");return;}
    return obrezSlika(d.blob).then(function(slika){
      var k=K();
      /* Fokus visi na kazalu, ne na zapisu z bajti — kazalo je edini vir
         resnice o datotekah in edino, kar gre v oblak.                      */
      var vk=Datoteke.kazalo().filter(function(x){return x.id===d.id;})[0];
      var f=vk&&vk.fokus&&isFinite(vk.fokus.x)?vk.fokus:null;
      obrezStanje={
        zapis:d,slika:slika,
        fokus:f?{x:f.x,y:f.y}:{x:0.5,y:0.5},
        izbrani:obrezPrivzeti(k),
        delam:false
      };
      el("ob").hidden=false;
      risiObrez();
    });
  }).then(null,function(err){
    toast("Slike ni bilo mogoče odpreti: "+(err&&err.message||"neznana napaka"));
  });
}
function zapriObrez(){
  var ob=el("ob");if(!ob||ob.hidden)return;
  ob.hidden=true;
  if(obrezStanje&&obrezStanje.url){try{URL.revokeObjectURL(obrezStanje.url);}catch(err){}}
  if(obrezStanje&&obrezStanje.slika&&obrezStanje.slika.close){
    try{obrezStanje.slika.close();}catch(err){}
  }
  el("ob-in").innerHTML="";
  obrezStanje=null;
}
/* Točka fokusa se hrani pri datoteki, ne pri kreativi: ista slika ima isto
   glavno stvar, ne glede na to, v katero kreativo jo daš.                  */
function obrezShraniFokus(){
  if(!obrezStanje)return;
  var v=Datoteke.kazalo().filter(function(x){return x.id===obrezStanje.zapis.id;})[0];
  if(!v)return;
  v.fokus={x:obrezStanje.fokus.x,y:obrezStanje.fokus.y};
  shrani();
}
function risiObrez(){
  if(!obrezStanje)return;
  var s=obrezStanje, sl=s.slika;
  if(!s.url){
    try{s.url=URL.createObjectURL(s.zapis.blob);}catch(err){s.url="";}
  }
  var cilji=obrezCilji();
  var vrstice=cilji.map(function(c){
    var o=obrezOkno(sl.width,sl.height,c.w,c.h,s.fokus.x,s.fokus.y);
    var izbran=s.izbrani.indexOf(c.id)>=0;
    var opozorilo=o.povecava>1.02
      ? '<span class="ob-op">povečava '+(Math.round(o.povecava*100)/100)+'× — bo mehko</span>'
      : (o.izgubljeno>0.45?'<span class="ob-op">odreže '+Math.round(o.izgubljeno*100)+' % slike</span>':'');
    return '<label class="ob-c'+(izbran?" on":"")+'">'+
      '<input type="checkbox" data-obcilj="'+c.id+'"'+(izbran?" checked":"")+'>'+
      '<span class="ob-cn"><b>'+c.w+' × '+c.h+'</b> <i>'+esc(c.r.replace(/\s/g,""))+'</i>'+
        '<em>'+esc(c.kje.join(", "))+'</em>'+
        (o.izgubljeno>0.001?'<u>ostane '+Math.round((1-o.izgubljeno)*100)+' % slike</u>':'<u>cela slika</u>')+
        opozorilo+
      '</span></label>';
  }).join("");

  /* okvirji izrezov čez sliko: kar bo odrezano, je zatemnjeno */
  var okvirji=s.izbrani.map(function(id){
    var c=obrezCilj(id);if(!c)return "";
    var o=obrezOkno(sl.width,sl.height,c.w,c.h,s.fokus.x,s.fokus.y);
    return '<div class="ob-r" data-obr="'+c.id+'" style="left:'+(o.sx/sl.width*100)+'%;top:'+(o.sy/sl.height*100)+'%;'+
      'width:'+(o.dw/sl.width*100)+'%;height:'+(o.dh/sl.height*100)+'%"><span>'+c.w+'×'+c.h+'</span></div>';
  }).join("");

  el("ob-in").innerHTML=
    '<div class="ob-levo">'+
      '<div class="ob-platno" id="ob-platno">'+
        '<img src="'+(s.url||"")+'" alt="'+esc(s.zapis.ime)+'" draggable="false">'+
        okvirji+
        '<span class="ob-fokus" style="left:'+(s.fokus.x*100)+'%;top:'+(s.fokus.y*100)+'%"></span>'+
      '</div>'+
      '<p class="ob-hint">Klikni ali povleci po sliki, kam naj gleda izrez. '+
        'Vir: '+sl.width+' × '+sl.height+' px.</p>'+
    '</div>'+
    '<div class="ob-desno">'+
      '<div class="ob-cilji">'+vrstice+'</div>'+
      '<div class="ob-akcije">'+
        '<button class="btn btn-p" id="ob-shrani"'+(s.delam?" disabled":"")+'>Shrani izreze v material</button>'+
        '<button class="btn" id="ob-prenesi"'+(s.delam?" disabled":"")+'>Prenesi izreze</button>'+
        '<button class="btn btn-soft" id="ob-predloga">Prenesi predlogo mer</button>'+
      '</div>'+
      '<p class="note">Predloga je prosojen PNG 1080 × 1920: položiš ga čez svojo '+
        'postavitev in vidiš, kaj ostane v feedu, kaj pokrije vmesnik zgodbe in '+
        'kje je prostor, ki preživi oboje.</p>'+
    '</div>';
}
/* Med vlečenjem premaknemo samo okvirje in točko, ne prerišemo celega okna:
   izris bi zamenjal sliko pod prstom in vlečenje bi se prekinilo. Odstotki na
   desni se s fokusom tako ali tako ne spremenijo — velikost izreza je odvisna
   od razmerja, ne od tega, kam gleda.                                       */
function obrezOsveziOkvirje(){
  var s=obrezStanje;if(!s)return;
  var box=el("ob-platno");if(!box)return;
  var tocka=q(".ob-fokus",box);
  if(tocka){tocka.style.left=(s.fokus.x*100)+"%";tocka.style.top=(s.fokus.y*100)+"%";}
  qa(".ob-r",box).forEach(function(r){
    var c=obrezCilj(r.dataset.obr);if(!c)return;
    var o=obrezOkno(s.slika.width,s.slika.height,c.w,c.h,s.fokus.x,s.fokus.y);
    r.style.left=(o.sx/s.slika.width*100)+"%";
    r.style.top=(o.sy/s.slika.height*100)+"%";
    r.style.width=(o.dw/s.slika.width*100)+"%";
    r.style.height=(o.dh/s.slika.height*100)+"%";
  });
}
/* klik ali vlečenje po sliki premakne točko fokusa */
function obrezFokusIzDogodka(ev){
  var box=el("ob-platno");if(!box||!obrezStanje)return;
  var r=box.getBoundingClientRect();
  if(!r.width||!r.height)return;
  obrezStanje.fokus={
    x:Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width)),
    y:Math.min(1,Math.max(0,(ev.clientY-r.top)/r.height))
  };
  obrezOsveziOkvirje();
}
/* Pointer namesto miške, da dela tudi s prstom. Vlečenje pripnemo na element,
   sicer ga izgubimo, brž ko prst uide s slike.                              */
var obrezVlecem=false;
document.addEventListener("pointerdown",function(ev){
  if(!obrezStanje)return;
  var box=ev.target.closest?ev.target.closest("#ob-platno"):null;
  if(!box)return;
  obrezVlecem=true;
  if(box.setPointerCapture&&ev.pointerId!=null){
    try{box.setPointerCapture(ev.pointerId);}catch(err){}
  }
  ev.preventDefault();
  obrezFokusIzDogodka(ev);
});
document.addEventListener("pointermove",function(ev){
  if(obrezVlecem)obrezFokusIzDogodka(ev);
});
document.addEventListener("pointerup",function(){
  if(!obrezVlecem)return;
  obrezVlecem=false;
  obrezShraniFokus();
});
document.addEventListener("pointercancel",function(){obrezVlecem=false;});
function obrezIzberi(id,vklopljen){
  if(!obrezStanje)return;
  var i=obrezStanje.izbrani.indexOf(id);
  if(vklopljen&&i<0)obrezStanje.izbrani.push(id);
  else if(!vklopljen&&i>=0)obrezStanje.izbrani.splice(i,1);
  risiObrez();
}
/* Vsi izbrani izrezi po vrsti. `kam` je "material" ali "prenos".           */
function obrezIzvedi(kam){
  if(!obrezStanje||obrezStanje.delam)return Promise.resolve(0);
  var s=obrezStanje;
  if(!s.izbrani.length){toast("Najprej izberi vsaj en format.");return Promise.resolve(0);}
  s.delam=true;risiObrez();
  obrezShraniFokus();
  var narejenih=0;
  var vrsta=Promise.resolve();
  s.izbrani.forEach(function(id){
    var c=obrezCilj(id);if(!c)return;
    vrsta=vrsta.then(function(){
      return obrezNaredi(s.slika,s.zapis,c,s.fokus).then(function(r){
        narejenih++;
        if(kam==="prenos"){obrezPrenesi(r.blob,r.ime);return;}
        var f=new File([r.blob],r.ime,{type:r.tip});
        return Datoteke.dodaj(s.zapis.kreativa,f);
      });
    });
  });
  return vrsta.then(function(){
    s.delam=false;
    if(kam==="prenos"){
      risiObrez();
      toast(narejenih+" izrezov preneseno.");
      return narejenih;
    }
    zapriObrez();
    narisiDatoteke();
    toast(narejenih+" izrezov shranjenih v material.");
    return narejenih;
  },function(err){
    s.delam=false;risiObrez();
    toast("Obrez ni uspel: "+(err&&err.message||"neznana napaka"));
    return 0;
  });
}
