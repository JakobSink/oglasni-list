/* Oglasni list · izracuni.js
   Ekonomika izdelka, lijak od budgeta do naročil, doseženi rezultati
   in dostop do polj po poti.

   Del aplikacije, razdeljene po datotekah. Vse se nalagajo iz index.html v
   vrstnem redu in si delijo isti prostor imen; vrstni red šteje samo pri
   zagon.js, ki mora biti zadnja.                                          */
"use strict";

/* ============ izračuni ============ */
/* izračuni so dodatek na izdelku — brez njih ni marže, CPA-ja in profita */
function imaEkon(p){return !!(p&&p.izracuni);}
function ekon(p){
  var ddvF = p.ddvVkljucen ? (1+n(p.ddv)/100) : 1;
  var bruto = n(p.cena)+n(p.posiljanjePlaca);
  var prihodek = bruto/ddvF;
  var provizija = bruto*n(p.provizijaPct)/100 + n(p.provizijaFix);
  var izdelava = n(p.nabavna)+n(p.posiljanje)+n(p.embalaza)+n(p.ostalo);
  var stroski = izdelava+provizija;
  var marza = prihodek-stroski;
  var r = Math.max(0,Math.min(100,n(p.vracilaPct)))/100;
  var izgubaVracilo = n(p.posiljanje)+n(p.embalaza)+provizija;
  var marzaEf = marza*(1-r) - r*izgubaVracilo;
  return {bruto:bruto,prihodek:prihodek,ddv:bruto-prihodek,provizija:provizija,izdelava:izdelava,
    stroski:stroski,marza:marza,marzaEf:marzaEf,vracila:r,
    marzaPct: prihodek>0 ? marza/prihodek*100 : NaN,
    beCPA: marzaEf,
    beROAS: marzaEf>0 ? bruto/marzaEf : Infinity};
}
function lijak(budget,cpm,ctr,cvr,ek){
  var b=n(budget), c=n(cpm), t=n(ctr)/100, v=n(cvr)/100;
  var impr = c>0 ? b/c*1000 : NaN;
  var kliki = isFinite(impr) ? impr*t : NaN;
  var narocil = isFinite(kliki) ? kliki*v : NaN;
  var cpc = isFinite(kliki)&&kliki>0 ? b/kliki : NaN;
  var cpa = isFinite(narocil)&&narocil>0 ? b/narocil : NaN;
  var prihodek = isFinite(narocil) ? narocil*ek.bruto : NaN;
  var roas = b>0&&isFinite(prihodek) ? prihodek/b : NaN;
  var profit = isFinite(narocil) ? narocil*ek.marzaEf - b : NaN;
  return {budget:b,impr:impr,kliki:kliki,narocil:narocil,cpc:cpc,cpa:cpa,prihodek:prihodek,roas:roas,profit:profit,
    maxCPC: ek.marzaEf>0 ? ek.marzaEf*v : NaN};
}
function rezultat(k,ek){
  var s=n(k.rSpend), im=n(k.rImpr), cl=n(k.rClicks), or_=n(k.rOrders);
  return {spend:s,impr:im,kliki:cl,narocil:or_,
    cpm: im>0 ? s/im*1000 : NaN,
    ctr: im>0 ? cl/im*100 : NaN,
    cpc: cl>0 ? s/cl : NaN,
    cvr: cl>0 ? or_/cl*100 : NaN,
    cpa: or_>0 ? s/or_ : NaN,
    prihodek: or_*ek.bruto,
    roas: s>0 ? or_*ek.bruto/s : NaN,
    profit: or_*ek.marzaEf - s,
    imaPodatke: s>0||im>0||cl>0||or_>0};
}
function znak(v){return !isFinite(v)?"":(v>0.005?"pos":(v<-0.005?"neg":"warn"));}

/* ============ dostop do polj ============ */
function get(o,path){
  var parts=path.split("."),c=o;
  for(var i=0;i<parts.length;i++){if(c==null)return "";c=c[/^\d+$/.test(parts[i])?parseInt(parts[i],10):parts[i]];}
  return c==null?"":c;
}
function set(o,path,val){
  var parts=path.split("."),c=o;
  for(var i=0;i<parts.length-1;i++){var kk=/^\d+$/.test(parts[i])?parseInt(parts[i],10):parts[i];if(c[kk]==null)c[kk]={};c=c[kk];}
  var last=parts[parts.length-1];
  c[/^\d+$/.test(last)?parseInt(last,10):last]=val;
}
function fld(path,label,unit,hint){
  return '<div class="f"><label for="f-'+path+'">'+esc(label)+'</label>'+
    '<div class="wrap"><input id="f-'+path+'" type="text" inputmode="decimal" data-p="'+path+'" value="'+esc(get(P(),path))+'">'+
    (unit?'<span class="unit">'+unit+'</span>':'')+'</div>'+
    (hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
}
function txtFld(path,label,hint,placeholder){
  return '<div class="f"><label for="f-'+path+'">'+esc(label)+'</label>'+
    '<input class="txt" id="f-'+path+'" type="text" data-p="'+path+'" value="'+esc(get(P(),path))+'"'+
    (placeholder?' placeholder="'+esc(placeholder)+'"':'')+'>'+
    (hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
}

/* naslov pogleda z drobtinami */
function glava(naslov,lede,akcije,drobtine){
  var d=(drobtine||[]).map(function(x){
    return x.v ? '<button data-goto="'+x.v+'">'+esc(x.t)+'</button>' : '<span>'+esc(x.t)+'</span>';
  }).join('<i>/</i>');
  return '<div class="head"><div class="head-t">'+
    (d?'<div class="crumb">'+d+'</div>':'')+
    '<h1>'+esc(naslov)+'</h1>'+
    (lede?'<p class="lede">'+lede+'</p>':'')+
  '</div>'+(akcije?'<div class="row no-print">'+akcije+'</div>':'')+'</div>';
}
function znamkaIme(p){return (p&&String(p.znamka||"").trim())||PR().ime;}
function domenaIz(p,k){
  var u=String((k&&k.url)||"").trim()||String((p&&p.domena)||"").trim();
  if(!u)return "";
  return u.replace(/^https?:\/\//i,"").replace(/^www\./i,"").replace(/\/.*$/,"");
}
function potIz(k){
  var u=String((k&&k.url)||"").trim();
  var m=u.replace(/^https?:\/\/[^\/]+/i,"").replace(/^\//,"").replace(/[?#].*$/,"");
  return m?m.split("/").filter(Boolean).slice(0,2):[];
}
function zacetnice(s){
  return String(s||"?").trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0).toUpperCase();}).join("")||"?";
}
function praznoHtml(){
  return glava("Mapa „"+PR().ime+"“ je še brez izdelkov",
    "Izdelek nosi ceno in stroške — iz njega pride marža in vse ostalo. Dodaj prvega, potem se odprejo vsi izračuni in kreative.",
    '<button class="btn btn-p" id="pnew3">+ Dodaj izdelek</button>'+
    '<button class="btn" data-goto="projekti">Nazaj na projekte</button>');
}
