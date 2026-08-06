/* Oglasni list · datoteke.js
   Naložene slike in videi: IndexedDB kot predpomnilnik naprave,
   kazalo pa je v sinhroniziranem stanju.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

/* ============ datoteke (IndexedDB) ============ */
var Datoteke=(function(){
  var IME="oglasni-list-datoteke", STORE="datoteke", db=null, naVoljo=!!window.indexedDB;
  function odpri(){
    return new Promise(function(res,rej){
      if(db)return res(db);
      if(!naVoljo)return rej(new Error("Brskalnik ne podpira shrambe datotek."));
      var r=indexedDB.open(IME,1);
      r.onupgradeneeded=function(){
        var d=r.result;
        if(!d.objectStoreNames.contains(STORE)){
          var s=d.createObjectStore(STORE,{keyPath:"id"});
          s.createIndex("kreativa","kreativa",{unique:false});
        }
      };
      r.onsuccess=function(){db=r.result;res(db);};
      r.onerror=function(){rej(r.error||new Error("Shrambe ni bilo mogoče odpreti."));};
    });
  }
  /* Zahtevo izdamo v isti nalogi kot transakcijo, da se ta ne zaključi prezgodaj. */
  function op(mode,fn){
    return odpri().then(function(d){
      return new Promise(function(res,rej){
        var t=d.transaction(STORE,mode), s=t.objectStore(STORE), req;
        try{req=fn(s);}catch(err){rej(err);return;}
        t.oncomplete=function(){res(req&&"result" in req?req.result:null);};
        t.onerror=function(){rej(t.error);};
        t.onabort=function(){rej(t.error||new Error("Shramba je zavrnila zapis (morda ni prostora)."));};
      });
    });
  }
  /* zaporedna številka, da je vrstni req nalaganja enolicen tudi znotraj iste milisekunde */
  var zap=0;
  function poVrsti(a,b){
    var za=a.zap||0, zb=b.zap||0;
    if(za!==zb)return za-zb;
    return String(a.dodano).localeCompare(String(b.dodano))||String(a.ime).localeCompare(String(b.ime));
  }
  /* ---- kazalo datotek ----
     Bajti so preveliki za JSON, zato v sinhroniziranem stanju hranimo samo
     kazalo (kdo, kako se imenuje, koliko meri), same datoteke pa gredo v
     Supabase Storage. Vsaka naprava tako ve, katere datoteke obstajajo, in jih
     prenese takrat, ko jih res potrebuje.                                    */
  function kazalo(){
    if(!Array.isArray(S.datoteke))S.datoteke=[];
    return S.datoteke;
  }
  function vKazalo(z){
    var k=kazalo();
    if(!k.some(function(x){return x.id===z.id;})){
      k.push({id:z.id,kreativa:z.kreativa,ime:z.ime,tip:z.tip,velikost:z.velikost,dodano:z.dodano,zap:z.zap});
      shrani();
    }
  }
  function izKazala(id){
    var k=kazalo(), i=k.map(function(x){return x.id;}).indexOf(id);
    if(i>=0){k.splice(i,1);shrani();}
  }
  /* lokalni zapisi in kazalo v en seznam; kar je samo v kazalu, čaka na prenos */
  function zlij(lastnik,lokalni){
    var poId={};
    (lokalni||[]).forEach(function(z){poId[z.id]=z;});
    kazalo().filter(function(x){return x.kreativa===lastnik;}).forEach(function(x){
      if(!poId[x.id])poId[x.id]=({id:x.id,kreativa:x.kreativa,ime:x.ime,tip:x.tip,
        velikost:x.velikost,dodano:x.dodano,zap:x.zap,blob:null,vOblaku:true});
    });
    return Object.keys(poId).map(function(id){return poId[id];}).sort(poVrsti);
  }
  return {
    naVoljo:naVoljo,
    poVrsti:poVrsti,
    kazalo:kazalo,
    dodaj:function(kreativaId,file){
      var z={id:uid(),kreativa:kreativaId,ime:file.name||"brez-imena",
        tip:file.type||"",velikost:file.size||0,
        dodano:new Date().toISOString(),zap:Date.now()*1000+(zap++),blob:file};
      return op("readwrite",function(s){return s.put(z);}).then(function(r){
        vKazalo(z);
        /* v oblak gre v ozadju — nalaganje ne sme blokirati vmesnika */
        Oblak.naloziDat(z,file);
        return r;
      });
    },
    zaKreativo:function(kid){
      return op("readonly",function(s){return s.index("kreativa").getAll(kid);})
        .then(function(sez){return zlij(kid,sez);},function(){return zlij(kid,[]);});
    },
    /* zapis, kot je v tej napravi (brez hoje v oblak) */
    lokalno:function(id){return op("readonly",function(s){return s.get(id);});},
    /* katere datoteke še niso potrjeno v oblaku */
    zaOblak:function(){return kazalo().filter(function(x){return !x.oblak;});},
    oznaciVOblaku:function(id){
      var v=kazalo().filter(function(x){return x.id===id;})[0];
      if(v&&!v.oblak){v.oblak=true;shrani();}
    },
    /* Poskrbi, da ima zapis bajte: če jih lokalno ni, jih prenese iz oblaka in
       shrani, da drugič ni več potrebe po mreži.                            */
    zagotovi:function(id){
      return op("readonly",function(s){return s.get(id);}).then(function(z){
        if(z&&z.blob)return z;
        var v=kazalo().filter(function(x){return x.id===id;})[0];
        if(!v)return null;
        return Oblak.prenesiDat(v).then(function(blob){
          if(!blob)return null;
          var nov={id:v.id,kreativa:v.kreativa,ime:v.ime,tip:v.tip||blob.type||"",
            velikost:v.velikost||blob.size||0,dodano:v.dodano,zap:v.zap,blob:blob};
          return op("readwrite",function(s){return s.put(nov);}).then(function(){return nov;});
        },function(){return null;});
      });
    },
    /* prva slika ali video kreative — za naslovnico kartice in predogled oglasa */
    prviVizual:function(kid){
      return op("readonly",function(s){return s.index("kreativa").getAll(kid);}).then(function(sez){
        sez=zlij(kid,sez);
        var slika=sez.filter(function(d){return /^image\//.test(d.tip);})[0];
        var video=sez.filter(function(d){return /^video\//.test(d.tip);})[0];
        var izbran=slika||video||null;
        if(!izbran)return null;
        if(izbran.blob)return izbran;
        if(prenosSpodletel[izbran.id])return null;   /* že poskusili, ne visimo */
        return Datoteke.zagotovi(izbran.id).then(function(z){
          if(!z||!z.blob)prenosSpodletel[izbran.id]=true;
          return z&&z.blob?z:null;
        },function(){prenosSpodletel[izbran.id]=true;return null;});
      });
    },
    steviloZa:function(kid){
      return Promise.resolve(kazalo().filter(function(x){return x.kreativa===kid;}).length);
    },
    /* ena datoteka z bajti — po potrebi jo prej prenese iz oblaka */
    ena:function(id){return this.zagotovi(id);},
    brisi:function(id){
      var v=kazalo().filter(function(x){return x.id===id;})[0];
      izKazala(id);
      Oblak.brisiDat(v||{id:id});
      return op("readwrite",function(s){return s.delete(id);});
    },
    brisiZaKreativo:function(kid){
      kazalo().filter(function(x){return x.kreativa===kid;}).forEach(function(x){
        izKazala(x.id);Oblak.brisiDat(x);
      });
      return op("readwrite",function(s){
        var r=s.index("kreativa").getAllKeys(kid);
        r.onsuccess=function(){(r.result||[]).forEach(function(k){s.delete(k);});};
        return r;
      });
    },
    stevilo:function(){return Promise.resolve(kazalo().length);},
    /* koliko datotek iz kazala še ni v tej napravi */
    manjka:function(){
      return op("readonly",function(s){return s.getAllKeys();}).then(function(kljuci){
        var imam={};(kljuci||[]).forEach(function(k){imam[k]=1;});
        return kazalo().filter(function(x){return !imam[x.id];}).length;
      },function(){return kazalo().length;});
    },
    pocisti:function(){
      S.datoteke=[];shrani();
      return op("readwrite",function(s){return s.clear();});
    },
    /* Datoteke, ki so bile naložene, preden je kazalo obstajalo, enkrat vpišemo
       vanj — drugače bi bile za oblak in druge naprave nevidne.             */
    zgradiKazalo:function(){
      if(!naVoljo||S.datotekeMigrirano)return Promise.resolve(0);
      return op("readonly",function(s){return s.getAll();}).then(function(sez){
        var imam={};kazalo().forEach(function(x){imam[x.id]=1;});
        var dodanih=0;
        (sez||[]).forEach(function(z){
          if(imam[z.id])return;
          kazalo().push({id:z.id,kreativa:z.kreativa,ime:z.ime,tip:z.tip,
            velikost:z.velikost,dodano:z.dodano,zap:z.zap});
          dodanih++;
        });
        S.datotekeMigrirano=true;
        shrani();
        return dodanih;
      },function(){return 0;});
    }
  };
})();

function brisiDatotekeKreativ(kreative){
  if(!Datoteke.naVoljo)return Promise.resolve();
  var p=Promise.resolve();
  /* s kreativo gredo tudi njene reference */
  kreative.forEach(function(k){
    datLastnikiKreative(k).forEach(function(lastnik){
      p=p.then(function(){return Datoteke.brisiZaKreativo(lastnik).catch(function(){});});
    });
  });
  return p;
}
/* z izdelkom gredo tudi njegov material in logo */
function brisiDatotekeIzdelka(izd){
  if(!Datoteke.naVoljo)return Promise.resolve();
  return brisiDatotekeKreativ(izd.kreative||[]).then(function(){
    return Datoteke.brisiZaKreativo(datLastnikIzdelka(izd)).catch(function(){});
  });
}
