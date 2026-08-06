/* Oglasni list · excel.js
   Izvoz v .xlsx, napisan na roko (ZIP + OOXML), brez knjižnic.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

/* ============ izvoz v Excel ============
   Pravi .xlsx brez knjižnic: ZIP brez stiskanja + minimalni OOXML.
   Glave so odebeljene in zamrznjene, stolpci imajo širine, besedilo se ovija. */
var Xlsx=(function(){
  var kodirnik=window.TextEncoder?new TextEncoder():null;
  function bajti(s){
    if(kodirnik)return kodirnik.encode(s);
    var a=[],i,c;
    for(i=0;i<s.length;i++){
      c=s.charCodeAt(i);
      if(c<128)a.push(c);
      else if(c<2048){a.push(192|c>>6,128|c&63);}
      else{a.push(224|c>>12,128|(c>>6)&63,128|c&63);}
    }
    return new Uint8Array(a);
  }
  var CRC=(function(){
    var t=new Uint32Array(256),i,j,c;
    for(i=0;i<256;i++){c=i;for(j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c>>>0;}
    return t;
  })();
  function crc32(b){
    var c=0xFFFFFFFF,i;
    for(i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);
    return (c^0xFFFFFFFF)>>>0;
  }
  function zip(vnosi){
    var d=new Date(),kosi=[],sredina=[],odmik=0,i,skupno=0;
    var cas=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF;
    var dat=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
    for(i=0;i<vnosi.length;i++){
      var ime=bajti(vnosi[i].ime), vs=bajti(vnosi[i].xml), c=crc32(vs);
      var lh=new Uint8Array(30+ime.length), dl=new DataView(lh.buffer);
      dl.setUint32(0,0x04034b50,true);dl.setUint16(4,20,true);dl.setUint16(6,0x0800,true);
      dl.setUint16(8,0,true);dl.setUint16(10,cas,true);dl.setUint16(12,dat,true);
      dl.setUint32(14,c,true);dl.setUint32(18,vs.length,true);dl.setUint32(22,vs.length,true);
      dl.setUint16(26,ime.length,true);dl.setUint16(28,0,true);
      lh.set(ime,30);
      kosi.push(lh,vs);
      var ch=new Uint8Array(46+ime.length), dc=new DataView(ch.buffer);
      dc.setUint32(0,0x02014b50,true);dc.setUint16(4,20,true);dc.setUint16(6,20,true);
      dc.setUint16(8,0x0800,true);dc.setUint16(10,0,true);
      dc.setUint16(12,cas,true);dc.setUint16(14,dat,true);
      dc.setUint32(16,c,true);dc.setUint32(20,vs.length,true);dc.setUint32(24,vs.length,true);
      dc.setUint16(28,ime.length,true);dc.setUint16(30,0,true);dc.setUint16(32,0,true);
      dc.setUint16(34,0,true);dc.setUint16(36,0,true);dc.setUint32(38,0,true);
      dc.setUint32(42,odmik,true);
      ch.set(ime,46);
      sredina.push(ch);
      odmik+=lh.length+vs.length;
    }
    sredina.forEach(function(x){skupno+=x.length;});
    var kon=new Uint8Array(22), dk=new DataView(kon.buffer);
    dk.setUint32(0,0x06054b50,true);dk.setUint16(4,0,true);dk.setUint16(6,0,true);
    dk.setUint16(8,vnosi.length,true);dk.setUint16(10,vnosi.length,true);
    dk.setUint32(12,skupno,true);dk.setUint32(16,odmik,true);dk.setUint16(20,0,true);
    return new Blob(kosi.concat(sredina,[kon]),{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  }
  /* XML ne prenese krmilnih znakov */
  function xesc(v){
    return String(v==null?"":v)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function stolpec(i){
    var s="";
    i=i+1;
    while(i>0){var o=(i-1)%26;s=String.fromCharCode(65+o)+s;i=(i-o-1)/26;}
    return s;
  }
  var STIL={besedilo:2,evri:3,sredina:5,stevilo:5};
  function listXml(list){
    var st=list.stolpci, h="";
    h+='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<sheetViews><sheetView workbookViewId="0">'+
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'+
      '</sheetView></sheetViews>'+
      '<sheetFormatPr defaultRowHeight="15"/>'+
      '<cols>'+st.map(function(c,i){
        return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(c.w||20)+'" customWidth="1"/>';
      }).join("")+'</cols><sheetData>';
    h+='<row r="1" ht="34" customHeight="1">'+st.map(function(c,i){
      return '<c r="'+stolpec(i)+'1" s="1" t="inlineStr"><is><t xml:space="preserve">'+xesc(c.g)+'</t></is></c>';
    }).join("")+'</row>';
    list.vrstice.forEach(function(v,ri){
      var r=ri+2;
      h+='<row r="'+r+'">'+v.map(function(val,ci){
        var ref=stolpec(ci)+r, tip=(st[ci]&&st[ci].tip)||"besedilo";
        if(val==null||val==="")return '<c r="'+ref+'" s="'+(STIL[tip]||2)+'"/>';
        if(typeof val==="number"&&isFinite(val))
          return '<c r="'+ref+'" s="'+(STIL[tip]||5)+'"><v>'+val+'</v></c>';
        return '<c r="'+ref+'" s="'+(STIL[tip]||2)+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(val)+'</t></is></c>';
      }).join("")+'</row>';
    });
    h+='</sheetData>';
    if(list.vrstice.length)
      h+='<autoFilter ref="A1:'+stolpec(st.length-1)+(list.vrstice.length+1)+'"/>';
    h+='</worksheet>';
    return h;
  }
  var STILI='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts>'+
    '<fonts count="3">'+
      '<font><sz val="10"/><name val="Calibri"/></font>'+
      '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'+
      '<font><b/><sz val="11"/><name val="Calibri"/></font>'+
    '</fonts>'+
    '<fills count="4">'+
      '<fill><patternFill patternType="none"/></fill>'+
      '<fill><patternFill patternType="gray125"/></fill>'+
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>'+
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>'+
    '</fills>'+
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+
      '<border><left style="thin"><color rgb="FFD9DDE3"/></left><right style="thin"><color rgb="FFD9DDE3"/></right>'+
      '<top style="thin"><color rgb="FFD9DDE3"/></top><bottom style="thin"><color rgb="FFD9DDE3"/></bottom><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="6">'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'+
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" horizontal="right"/></xf>'+
      '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" horizontal="center" wrapText="1"/></xf>'+
    '</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'+
    '</styleSheet>';
  function imeLista(s,i){
    s=String(s||("List"+(i+1))).replace(/[\[\]\*\?\/\\:]/g,"-");
    return s.length>31?s.slice(0,31):s;
  }
  function ustvari(listi){
    var vnosi=[],i;
    vnosi.push({ime:"[Content_Types].xml",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      listi.map(function(_,j){
        return '<Override PartName="/xl/worksheets/sheet'+(j+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      }).join("")+'</Types>'});
    vnosi.push({ime:"_rels/.rels",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
      '</Relationships>'});
    vnosi.push({ime:"xl/workbook.xml",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '+
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+
      listi.map(function(l,j){
        return '<sheet name="'+xesc(imeLista(l.ime,j))+'" sheetId="'+(j+1)+'" r:id="rId'+(j+1)+'"/>';
      }).join("")+'</sheets></workbook>'});
    vnosi.push({ime:"xl/_rels/workbook.xml.rels",xml:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      listi.map(function(_,j){
        return '<Relationship Id="rId'+(j+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(j+1)+'.xml"/>';
      }).join("")+
      '<Relationship Id="rId'+(listi.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
      '</Relationships>'});
    vnosi.push({ime:"xl/styles.xml",xml:STILI});
    for(i=0;i<listi.length;i++)
      vnosi.push({ime:"xl/worksheets/sheet"+(i+1)+".xml",xml:listXml(listi[i])});
    return zip(vnosi);
  }
  return {ustvari:ustvari};
})();

function prenesiBlob(blob,ime){
  try{
    var u=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=u;a.download=ime;a.style.display="none";
    document.body.appendChild(a);a.click();
    setTimeout(function(){if(a.parentNode)a.parentNode.removeChild(a);URL.revokeObjectURL(u);},4000);
    return true;
  }catch(err){toast("Prenos ni uspel: "+err.message);return false;}
}

/* ---- kaj gre v preglednico ---- */
/* stolpci stikal se pojavijo samo, če si kakšno stikalo naredil */
function stikStolpci(){
  return stikRabljena().map(function(g){
    return {g:g.ime,w:Math.max(12,Math.min(24,g.ime.length+8)),v:function(o){
      var v=o.k.stikala?o.k.stikala[g.id]:null;
      return (v===STIK_VSE?"vse":(v||stikVrednost(o.k,g)))+(o.k.vodi===g.id?" ◂ vodi besedila":"");
    }};
  });
}
/* List „Oglasi“ je obrnjen: v stolpcu A so imena polj, vsak naslednji stolpec je
   en oglas. Tako se oglasi berejo drug ob drugem in dolga besedila ne silijo
   vrstice v nemogoče višine — pri pisanju in primerjanju kopij je to edina
   postavitev, ki dela.                                                       */
var XLS_VRSTICE=[
  {g:"Izdelek",v:function(o){return o.izd.ime;}},
  {g:"Kreativa",v:function(o){return platIme(o.k.platforma)+" · "+umIme(o.k)+" · "+o.k.format;}},
  {g:"Ime kreative",v:function(o){return o.k.naslov;}},
  {g:"Hook",v:function(o){return prvi(o.k.hooki);}},
  {g:"Primarno besedilo",v:function(o){return prvi(o.k.primarna);}},
  {g:"Naslov pod sliko",v:function(o){return prvi(o.k.naslovi);}},
  {g:"Opis",v:function(o){return prvi(o.k.opisi);}},
  {g:"GUMB",v:function(o){return o.k.platforma==="google"&&o.k.format==="RSA"?"—":o.k.cta;}},
  {g:"URL",v:function(o){return o.k.url;}},
  {g:"Publika in targetiranje",v:function(o){return o.k.publika;}},
  {g:"Kot / obljuba",v:function(o){return o.k.kot;}},
  {g:"Kaj se vidi in sliši",v:function(o){return o.k.design;}},
  {g:"Prikazna pot",v:function(o){return [o.k.pot1,o.k.pot2].filter(Boolean).join(" / ");}},
  {g:"Sitelinki",v:function(o){return o.k.sitelinki;}},
  {g:"Ključne besede",v:function(o){return o.k.kljucneBesede;}},
  {g:"Status",v:function(o){return statusIme(o.k.status);}},
  {g:"Čaka na (blokada)",v:function(o){return o.k.blokada||"";}},
  {g:"Kdo dela · rok",v:function(o){
    return [o.k.izvajalec,o.k.rok?datumSlo(o.k.rok):"",o.k.rokOpomba].filter(Boolean).join(" · ");}},
  {g:"Budget / dan",v:function(o){return n(o.k.budget)?e(n(o.k.budget)):"";}},
  {g:"Napoved CPA",v:function(o){
    var l=lijak(o.k.budget,o.k.cpm,o.k.ctr,o.k.cvr,ekon(o.izd));
    return isFinite(l.cpa)?e(l.cpa):"";}},
  {g:"Material (datoteke)",v:function(o){return o.k.stDatotek||0;}},
  {g:"Opombe",v:function(o){return o.k.opombe;}}
];
var XLS_POLJA=[["hooki","Hook",80],["primarna","Primarno besedilo",0],["naslovi","Naslov",0],["opisi","Opis",0]];
/* vrstice stikal se vrinejo takoj za „Kreativa“ */
function stikVrstice(){
  return stikRabljena().map(function(g){
    return {g:g.ime,v:function(o){
      var v=o.k.stikala?o.k.stikala[g.id]:null;
      return (v===STIK_VSE?"vse":(v||stikVrednost(o.k,g)))+(o.k.vodi===g.id?" ◂ ločena besedila":"");
    }};
  });
}
function xlsVrstice(){
  var out=XLS_VRSTICE.slice();
  var kam=out.map(function(c){return c.g;}).indexOf("Kreativa")+1;
  return out.slice(0,kam).concat(stikVrstice(),out.slice(kam));
}

function izvozniSeznam(obseg){
  var izd=S.izdelki.filter(function(x){
    if(obseg==="izdelek")return x.id===S.aktiven;
    if(obseg==="mapa")return x.projekt===S.aktivenProjekt;
    return true;
  });
  var out=[];
  izd.forEach(function(x){
    (x.kreative||[]).forEach(function(k){out.push({izd:x,k:k});});
  });
  return out;
}
function xlsxIzvozi(izbrani){
  if(!izbrani.length){toast("Nič ni izbrano.");return;}
  /* obrnjeno: polja po vrsticah, en oglas na stolpec */
  var polja=xlsVrstice();
  var stolpci=[{g:"Polje",w:26}].concat(izbrani.map(function(o){
    return {g:o.izd.ime,w:46};
  }));
  var vrstice=polja.map(function(f){
    return [f.g].concat(izbrani.map(function(o,i){
      var v=f.v(o,i);
      return v==null?"":v;
    }));
  });
  var razl=[];
  izbrani.forEach(function(o){
    XLS_POLJA.forEach(function(pf){
      var lim=(LIM[o.k.platforma]||LIM.drugo);
      var meja=pf[2]||({hooki:80,primarna:lim.primarni,naslovi:lim.naslov,opisi:lim.opis}[pf[0]]);
      (o.k[pf[0]]||[]).forEach(function(t,i){
        t=String(t||"").trim();
        if(!t)return;
        razl.push([o.izd.ime,o.k.naslov,pf[1],i+1,t,t.length,meja,t.length>meja?"DA":""]);
      });
    });
  });
  var poPlat={};
  izbrani.forEach(function(o){
    var kljuc=platIme(o.k.platforma);
    if(!poPlat[kljuc])poPlat[kljuc]={st:0,bud:0};
    poPlat[kljuc].st++;
    if(jeVZraku(o.k))poPlat[kljuc].bud+=n(o.k.budget);
  });
  var povz=Object.keys(poPlat).map(function(kljuc){
    return [kljuc,poPlat[kljuc].st,poPlat[kljuc].bud||"",poPlat[kljuc].bud?poPlat[kljuc].bud*30:""];
  });
  var skupaj=povz.reduce(function(a,r){return a+(typeof r[2]==="number"?r[2]:0);},0);
  povz.push(["Skupaj",izbrani.length,skupaj||"",skupaj?skupaj*30:""]);

  var listi=[
    {ime:"Oglasi",stolpci:stolpci,vrstice:vrstice},
    {ime:"Različice besedil",stolpci:[
      {g:"Izdelek",w:24},{g:"Kreativa",w:30},{g:"Polje",w:20},{g:"Št.",w:6,tip:"sredina"},
      {g:"Besedilo",w:70},{g:"Znakov",w:9,tip:"sredina"},{g:"Meja",w:9,tip:"sredina"},{g:"Nad mejo",w:10,tip:"sredina"}
    ],vrstice:razl},
    {ime:"Povzetek",stolpci:[
      {g:"Platforma",w:20},{g:"Št. oglasov",w:13,tip:"sredina"},
      {g:"Budget / dan (aktivni)",w:20,tip:"evri"},{g:"Budget / mesec",w:18,tip:"evri"}
    ],vrstice:povz}
  ];
  var d=new Date();
  var datum=d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
  var ime="Oglasi — "+PR().ime+" — "+datum+".xlsx";
  if(prenesiBlob(Xlsx.ustvari(listi),ime))
    toast(izbrani.length+" oglasov izvoženih v Excel.");
}

/* ---- okno za izbiro oglasov ---- */
var izvOznake={}, izvObseg="mapa";
function izvozOkno(){
  var w=el("mdl");
  if(!w){
    w=document.createElement("div");
    w.id="mdl";w.className="mdl";w.hidden=true;
    document.body.appendChild(w);
  }
  return w;
}
function odpriIzvoz(){
  var w=izvozOkno();
  izvOznake={};
  izvozniSeznam(izvObseg).forEach(function(o){
    izvOznake[o.k.id]=o.k.status!=="ubita";
  });
  w.hidden=false;
  document.body.classList.add("mdl-on");
  risiIzvoz();
}
function zapriIzvoz(){
  var w=el("mdl");if(w)w.hidden=true;
  document.body.classList.remove("mdl-on");
}
function risiIzvoz(){
  var w=el("mdl");if(!w||w.hidden)return;
  var seznam=izvozniSeznam(izvObseg);
  var poIzdelku={};
  seznam.forEach(function(o){
    if(!poIzdelku[o.izd.id])poIzdelku[o.izd.id]={ime:o.izd.ime,vrste:[]};
    poIzdelku[o.izd.id].vrste.push(o);
  });
  var stIzbranih=seznam.filter(function(o){return izvOznake[o.k.id];}).length;
  var telo=Object.keys(poIzdelku).map(function(id){
    var g=poIzdelku[id];
    return '<div class="mdl-g"><span class="mdl-gt">'+esc(g.ime)+'</span>'+
      g.vrste.map(function(o){
        return '<label class="mdl-i">'+
          '<input type="checkbox" data-izv="'+o.k.id+'"'+(izvOznake[o.k.id]?" checked":"")+'>'+
          '<span class="mdl-in"><b>'+esc(o.k.naslov)+'</b>'+
            '<em>'+esc(platIme(o.k.platforma)+" · "+umIme(o.k)+" · "+o.k.format+" · "+statusIme(o.k.status))+'</em></span>'+
        '</label>';
      }).join("")+'</div>';
  }).join("")||'<p class="note">V tem obsegu ni nobene kreative.</p>';

  el("mdl").innerHTML=
    '<div class="mdl-veil" data-mdlx="1"></div>'+
    '<div class="mdl-w" role="dialog" aria-modal="true" aria-label="Izvoz v Excel">'+
      '<div class="mdl-h"><b>Izvoz v Excel</b>'+
        '<span class="sp"></span>'+
        '<button class="mdl-x" data-mdlx="1" aria-label="Zapri">✕</button></div>'+
      '<div class="mdl-b">'+
        '<p class="note">Nastane datoteka .xlsx s tremi listi: <b>Oglasi</b> (en oglas na vrstico — kreativa, besedilo na kreativi, besedilo ob njej, gumb, URL), '+
        '<b>Različice besedil</b> (vse napisane različice s številom znakov) in <b>Povzetek</b> (koliko oglasov in budgeta na platformo). '+
        'Primerno za pošiljanje stranki v potrditev.</p>'+
        '<div class="mdl-r">'+
          '<label class="sw"><span>Obseg</span><select id="izv-obseg">'+
            '<option value="izdelek"'+(izvObseg==="izdelek"?" selected":"")+'>Samo trenutni izdelek</option>'+
            '<option value="mapa"'+(izvObseg==="mapa"?" selected":"")+'>Cela mapa („'+esc(PR().ime)+'“)</option>'+
            '<option value="vse"'+(izvObseg==="vse"?" selected":"")+'>Vse mape</option>'+
          '</select></label>'+
          '<span class="sp"></span>'+
          '<button class="btn btn-s btn-soft" id="izv-vse">Izberi vse</button>'+
          '<button class="btn btn-s btn-soft" id="izv-nic">Počisti</button>'+
        '</div>'+
        '<div class="mdl-l">'+telo+'</div>'+
      '</div>'+
      '<div class="mdl-f">'+
        '<span class="note">Izbranih: <b>'+stIzbranih+'</b> od '+seznam.length+'</span>'+
        '<span class="sp"></span>'+
        '<button class="btn" data-mdlx="1">Prekliči</button>'+
        '<button class="btn btn-p" id="izv-go"'+(stIzbranih?"":" disabled")+'>Izvozi v Excel</button>'+
      '</div>'+
    '</div>';
}

function osveziIzvozStevec(){
  var seznam=izvozniSeznam(izvObseg);
  var st=seznam.filter(function(o){return izvOznake[o.k.id];}).length;
  var f=q("#mdl .mdl-f b");
  if(f)f.textContent=st;
  var g=el("izv-go");
  if(g)g.disabled=!st;
}
