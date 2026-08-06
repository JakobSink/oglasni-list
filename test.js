/* Dimni test: naloži aplikacijo v jsdom in preveri umestitve, izračune, zlivanje
   stanj, izvoz in izdelek. Skripte in njihov vrstni red bere iz index.html.
   Zagon: npm install && npm test                                              */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
require("fake-indexeddb/auto");

const REPO = __dirname;

const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  console.log("JSDOM ERROR: " + e.message);
  console.log((e.detail && e.detail.stack ? e.detail.stack : "").split("\n").slice(0, 4).join("\n"));
});
["log", "warn", "error", "info"].forEach((m) => vc.on(m, (...a) => console.log("[" + m + "]", ...a)));

/* zunanje vire odstranimo — skripte vstavimo sami, sicer jsdom čaka na mrežo */
const surovIndex = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const html = surovIndex
  .replace(/<script src="[^"]+"><\/script>/g, "")
  .replace(/<link[^>]*>/g, "");

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  url: "https://example.local/",
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const w = dom.window;
w.indexedDB = global.indexedDB;
w.IDBKeyRange = global.IDBKeyRange;
if (!w.TextEncoder) w.TextEncoder = TextEncoder;
if (!w.Blob) w.Blob = global.Blob;
w.scrollTo = () => {};   /* jsdom ga nima, aplikacija pa po vsaki menjavi pogleda skoči na vrh */
w.URL.createObjectURL = () => "blob:mock";
w.URL.revokeObjectURL = () => {};
w.HTMLMediaElement.prototype.play = () => Promise.resolve();
w.confirm = () => true;
w.prompt = () => "x";

const napake = [];
w.addEventListener("error", (e) => napake.push("window error: " + e.message));

/* Koda ni več v enem ovoju IIFE, ampak razdeljena po datotekah v js/, ki si
   delijo prostor imen. Test jih naloži v istem vrstnem redu kot index.html,
   zato so njene funkcije in stanje dosegljivi kar na window.               */
function naloziSkripto(ime) {
  const s = w.document.createElement("script");
  s.textContent = fs.readFileSync(path.join(REPO, ime), "utf8");
  w.document.body.appendChild(s);
}
/* Vrstni red beremo iz index.html, da test in aplikacija ne moreta narazen:
   če v index.html dodaš datoteko in tu ne, bi test tiho preverjal drugo kodo. */
const SKRIPTE = Array.from(surovIndex.matchAll(/<script src="([^"]+)"><\/script>/g)).map((m) => m[1]);
SKRIPTE.forEach((ime) => {
  try { naloziSkripto(ime); }
  catch (e) { console.log(ime + " THROW:", e.message, "\n", (e.stack || "").split("\n").slice(1, 4).join("\n")); }
});

const qaT = (koren, sel) => Array.prototype.slice.call(koren.querySelectorAll(sel));
const ok = (pogoj, ime, dodatno) => {
  if (pogoj) console.log("  OK   " + ime);
  else {
    console.log("  BAD  " + ime + (dodatno ? " → " + dodatno : ""));
    napake.push(ime);
  }
};

console.log("== osnovno ==");
ok(w.S && w.S.izdelki.length > 0, "stanje naloženo");
ok(w.S.v === 6, "migracija na v6", "v=" + (w.S && w.S.v));
const p = w.P();
ok(p.kreative.length >= 2, "primer ima kreative");
p.kreative.forEach((k) => {
  ok(typeof k.umestitev === "string" && w.umNajdi(k.platforma, k.umestitev),
    "umestitev za " + k.naslov, k.umestitev);
  ok(w.ctaSeznam(k.platforma).indexOf(k.cta) >= 0 || k.platforma === "google",
    "CTA veljaven za " + k.platforma, k.cta);
});

console.log("\n== vse platforme × vse umestitve × vsi formati ==");
const kr = p.kreative[0];
w.odprtaKreativa = kr.id;
let stKombinacij = 0;
Object.keys(w.UMESTITVE).forEach((plat) => {
  kr.platforma = plat;
  const formati = w.formatiZa(plat);
  w.UMESTITVE[plat].forEach((u) => {
    formati.forEach((fmt) => {
      if (!w.umOK(fmt, u[0])) return;
      kr.format = fmt;
      kr.umestitev = u[0];
      kr.cta = w.privzetiCTA(plat);
      stKombinacij++;
      try {
        w.view = "kreative";
        w.renderEditor();
        const pv = w.document.getElementById("predogled");
        const dolzina = pv ? pv.innerHTML.length : 0;
        if (dolzina < 200) {
          napake.push("prazen predogled: " + plat + "/" + u[0] + "/" + fmt);
          console.log("  BAD  " + plat + " · " + u[1] + " · " + fmt + " → " + dolzina + " znakov");
        }
        /* gumbi umestitev morajo biti izrisani in izbran mora biti pravi */
        if (!w.document.querySelectorAll("[data-um]").length)
          napake.push("ni gumbov umestitve: " + plat);
        const izbran = w.document.querySelector("[data-um].on");
        if (!izbran || izbran.dataset.um !== u[0])
          napake.push("napačna izbrana umestitev: " + plat + "/" + u[0]);
      } catch (err) {
        napake.push(plat + "/" + u[0] + "/" + fmt + ": " + err.message);
        console.log("  BAD  " + plat + " · " + u[0] + " · " + fmt + " → " + err.message);
      }
    });
  });
});
console.log("  preverjenih kombinacij: " + stKombinacij);
ok(stKombinacij > 40, "pokrite vse kombinacije", stKombinacij + " kombinacij");

console.log("\n== zlaganje besedila ==");
kr.platforma = "facebook"; kr.format = "slika"; kr.umestitev = "fb-feed";
kr.primarna = ["A".repeat(400)];
w.renderEditor();
ok(!!w.document.querySelector("#predogled .ft-t"), "besedilo je v .ft-t");
ok(!!w.document.querySelector("#predogled .ft-m"), "oznaka Več obstaja");

console.log("\n== polja po umestitvi ==");
kr.umestitev = "fb-market";
w.renderEditor();
ok(w.document.body.textContent.indexOf("V umestitvi Marketplace se primarno besedilo ne prikaže") >= 0,
  "opozorilo, da se primarno besedilo v Marketplace ne vidi");
kr.platforma = "instagram"; kr.format = "slika"; kr.umestitev = "ig-feed";
w.renderEditor();
ok(w.document.body.textContent.indexOf("V umestitvi Feed se naslov ne prikaže") >= 0,
  "opozorilo, da IG feed ne prikaže naslova");

console.log("\n== Google polja ==");
const g = p.kreative.filter((k) => k.platforma === "google")[0];
if (g) {
  w.odprtaKreativa = g.id;
  g.pot1 = "vinil"; g.pot2 = "na-klik"; g.sitelinki = "Cenik, Vzorci, Montaža";
  w.renderEditor();
  const t = w.document.getElementById("predogled").innerHTML;
  ok(t.indexOf("vinil") >= 0 && t.indexOf("na-klik") >= 0, "prikazna pot v predogledu");
  ok(t.indexOf("Cenik") >= 0, "sitelinki v predogledu");
  ok(t.indexOf("Sponsored") >= 0, "oznaka Sponsored (vmesnik je angleški, kot v resnici)");
  ok(w.briefText(g).indexOf("PRIKAZNA POT") >= 0, "pot v briefu");
}

console.log("\n== izvoz v Excel ==");
let prenos = null;
w.HTMLAnchorElement.prototype.click = function () { prenos = this.download; };
const vsi = w.izvozniSeznam("vse");
ok(vsi.length >= 2, "seznam za izvoz", vsi.length + " oglasov");
try {
  w.xlsxIzvozi(vsi);
  ok(!!prenos && /\.xlsx$/.test(prenos), "prenos sprožen", prenos);
} catch (err) {
  ok(false, "izvoz brez napake", err.message);
}
w.odpriIzvoz();
ok(!w.document.getElementById("mdl").hidden, "okno za izbiro odprto");
ok(w.document.querySelectorAll("[data-izv]").length === vsi.length, "vse kreative v seznamu");
w.zapriIzvoz();
ok(w.document.getElementById("mdl").hidden, "okno zaprto");

console.log("\n== brief in shranjevanje ==");
try { w.shrani(); ok(true, "shrani() brez napake"); }
catch (err) { ok(false, "shrani()", err.message); }
try {
  const izv = JSON.parse(JSON.stringify(w.S));
  ok(izv.izdelki[0].kreative[0].umestitev != null, "umestitev se serializira");
} catch (err) { ok(false, "serializacija", err.message); }

console.log("\n== vrstni red različic in izbira v predogledu ==");
{
  const kv2 = w.P().kreative[0];
  w.odprtaKreativa = kv2.id;
  w.view = "kreative";
  kv2.hooki = ["prvi", "drugi", "tretji"];
  kv2.izbrana = {};
  w.renderEditor();
  ok(w.document.querySelectorAll("[data-vgrip]").length > 0, "vrstice imajo držalo za vlečenje");
  ok(!!w.document.querySelector("[data-vgor]") && !!w.document.querySelector("[data-vdol]"),
    "in puščici, da dela tudi na telefonu");

  /* izbira mora ostati na istem BESEDILU, ne na istem mestu */
  w.nastaviIzbor("hooki", 2);
  ok(w.premakniVarianto("hooki", 2, 0), "tretji se premakne na prvo mesto");
  ok(kv2.hooki.join("|") === "tretji|prvi|drugi", "vrstni red je nov", kv2.hooki.join("|"));
  ok(kv2.izbrana.hooki === 0, "izbira sledi premaknjenemu besedilu", String(kv2.izbrana.hooki));

  w.premakniVarianto("hooki", 0, 2);
  ok(kv2.hooki.join("|") === "prvi|drugi|tretji", "in nazaj", kv2.hooki.join("|"));
  ok(kv2.izbrana.hooki === 2, "izbira spet sledi", String(kv2.izbrana.hooki));
  ok(!w.premakniVarianto("hooki", 0, -1), "premik izven seznama se zavrne");

  /* izbira se hrani na kreativi, torej prezivi osvezitev */
  w.nastaviIzbor("naslovi", 0);
  kv2.naslovi = ["A", "B"];
  w.nastaviIzbor("naslovi", 1);
  const kopija = JSON.parse(JSON.stringify(w.S));
  ok(kopija.izdelki.some((x) => x.kreative.some((k) => k.izbrana && k.izbrana.naslovi === 1)),
    "izbrana različica se shrani v stanje in preživi osvežitev");
  ok(w.predIzbor.naslovi === 1, "predogled bere izbiro s kreative", String(w.predIzbor.naslovi));
}

console.log("\n== zlivanje z oblakom ==");
{
  const lok = {
    v: 5, spremenjeno: "2026-08-05T10:00:00.000Z",
    projekti: [{ id: "pr1", ime: "Mapa" }],
    izdelki: [{ id: "i1", projekt: "pr1", ime: "Izdelek 1", kreative: [
      { id: "k1", naslov: "moja kreativa", platforma: "facebook" },
    ] }],
    stikala: [{ id: "g1", ime: "Trg", moznosti: ["SLO", "HR"] }],
    banka: [{ id: "b1", txt: "moj hook", kat: "cena" }],
    datoteke: [{ id: "d1", kreativa: "k1", ime: "moja.png", tip: "image/png", velikost: 1 }],
  };
  /* kolega je na svoji napravi dodal kreativo in izdelek, mojih se ni dotaknil */
  const obl = {
    v: 5, spremenjeno: "2026-08-05T11:00:00.000Z",
    projekti: [{ id: "pr1", ime: "Mapa" }, { id: "pr2", ime: "Kolegova mapa" }],
    izdelki: [
      { id: "i1", projekt: "pr1", ime: "Izdelek 1", kreative: [
        { id: "k2", naslov: "kolegova kreativa", platforma: "google" },
      ] },
      { id: "i2", projekt: "pr2", ime: "Kolegov izdelek", kreative: [] },
    ],
    stikala: [{ id: "g9", ime: "Trg", moznosti: ["SLO", "SK"] }],
    banka: [{ id: "b2", txt: "kolegov hook", kat: "dokaz" }],
    datoteke: [{ id: "d1", kreativa: "k1", ime: "moja.png", tip: "image/png", velikost: 1, oblak: true }],
  };
  const r = w.zlijStanje(lok, obl);
  const izd1 = r.stanje.izdelki.filter((x) => x.id === "i1")[0];
  ok(izd1.kreative.length === 2, "obe kreativi preživita zlivanje — nič se ne prepiše",
    izd1.kreative.map((k) => k.naslov).join(" + "));
  ok(r.stanje.izdelki.length === 2, "kolegov izdelek se prevzame");
  ok(r.stanje.projekti.length === 2, "in njegova mapa");
  ok(r.stanje.banka.length === 2, "banka hookov se združi");
  ok(r.stanje.stikala.length === 1 && r.stanje.stikala[0].moznosti.length === 3,
    "isto stikalo se ne podvoji, možnosti se združijo",
    JSON.stringify(r.stanje.stikala[0].moznosti));
  ok(r.stanje.datoteke[0].oblak === true, "potrditev „je v oblaku“ obvelja");

  /* brisanje se mora prenesti, drugace izbrisano vstane */
  const lok2 = JSON.parse(JSON.stringify(r.stanje));
  lok2.izdelki = lok2.izdelki.filter((x) => x.id !== "i2");
  lok2.brisano = [{ id: "i2", kdaj: new Date().toISOString() }];
  lok2.spremenjeno = "2026-08-05T12:00:00.000Z";
  const r2 = w.zlijStanje(lok2, r.stanje);
  ok(!r2.stanje.izdelki.some((x) => x.id === "i2"),
    "izbrisan izdelek se ne vrne iz oblaka", r2.stanje.izdelki.map((x) => x.id).join(","));
  ok(r2.stanje.brisano.length === 1, "sled brisanja se ohrani");

  /* zlivanje s praznim oblakom ne sme nicesar pokvariti */
  const r3 = w.zlijStanje(lok, null);
  ok(r3.stanje === lok, "če v oblaku ni ničesar, ostane lokalno nedotaknjeno");

  /* „novih“ loči prevzete zapise od same razlike v času. Po njem se tiha
     uskladitev odloči, ali sme uporabniku pod prsti prerisati zaslon.       */
  ok(r.novih > 0, "zlivanje pove, koliko zapisov je prišlo z druge strani", String(r.novih));

  /* Isto stanje, samo novejši čas: nič ni prišlo, zato tiha uskladitev ne sme
     prerisati zaslona. Prej je bilo prav to razlog za skok med tipkanjem.   */
  const pozneje = new Date(new Date(r.stanje.spremenjeno).getTime() + 60000).toISOString();
  const enako = JSON.parse(JSON.stringify(r.stanje));
  enako.spremenjeno = pozneje;
  const r4 = w.zlijStanje(r.stanje, enako);
  ok(r4.novih === 0, "pri enakem stanju ni ničesar novega, tudi če je čas novejši", String(r4.novih));

  /* Isti izdelek, spremenjen pri kolegu: to pa je novost. */
  const spremenjen = JSON.parse(JSON.stringify(r.stanje));
  spremenjen.spremenjeno = pozneje;
  spremenjen.izdelki[0].ime = "Kolega je preimenoval";
  const r5 = w.zlijStanje(r.stanje, spremenjen);
  ok(r5.novih === 1, "spremenjen zapis pri kolegu se šteje kot novost", String(r5.novih));
  ok(r5.stanje.izdelki[0].ime === "Kolega je preimenoval", "in njegova vsebina obvelja");

  /* Brisanje pri kolegu ni ne dodan ne prevzet zapis, novost pa je — sicer bi
     ga tiha uskladitev prezrla in izbrisano bi na zaslonu ostalo.           */
  const izbrisal = JSON.parse(JSON.stringify(r.stanje));
  izbrisal.spremenjeno = pozneje;
  const zrtev = izbrisal.izdelki[0].id;
  izbrisal.izdelki = izbrisal.izdelki.filter((x) => x.id !== zrtev);
  izbrisal.brisano = [{ id: zrtev, kdaj: pozneje }];
  const r6 = w.zlijStanje(r.stanje, izbrisal);
  ok(r6.novih >= 1, "kolegovo brisanje se šteje kot novost", String(r6.novih));
  ok(!r6.stanje.izdelki.some((x) => x.id === zrtev), "in izdelek res izgine");
}

console.log("\n== trk v isti kreativi ==");
{
  /* Oba pišeta isto kreativo. Prej je novejša stran drugo brez sledu prepisala. */
  const kreativa = (hooki, naslovi, dodatno) =>
    Object.assign({ id: "k1", naslov: "Kreativa", platforma: "facebook", hooki, naslovi,
      primarna: ["skupno"], opisi: [""] }, dodatno || {});
  const stanje = (cas, k) => ({
    v: 6, spremenjeno: cas, projekti: [{ id: "pr1", ime: "Mapa" }],
    izdelki: [{ id: "i1", projekt: "pr1", ime: "Izdelek", kreative: [k] }],
    stikala: [], banka: [], datoteke: [],
  });

  const moje = stanje("2026-08-05T10:00:00.000Z", kreativa(["moj hook"], ["moj naslov"]));
  const kolegovo = stanje("2026-08-05T11:00:00.000Z", kreativa(["kolegov hook"], ["kolegov naslov"]));
  const r = w.zlijStanje(moje, kolegovo);
  const zlita = r.stanje.izdelki[0].kreative[0];
  ok(zlita.hooki.length === 2 && zlita.hooki.indexOf("moj hook") >= 0 && zlita.hooki.indexOf("kolegov hook") >= 0,
    "obe besedili preživita — moje ni prepisano", zlita.hooki.join(" | "));
  ok(zlita.naslovi.length === 2, "isto velja za naslove", zlita.naslovi.join(" | "));
  ok(zlita.primarna.length === 1, "kar je enako, se ne podvoji", zlita.primarna.join(" | "));
  ok(r.opis.indexOf("obdržan") >= 0, "in uskladitev to pove", r.opis);
  ok(r.novih > 0, "trk je novost");

  /* drugič zapored se ne sme več nič spremeniti — sicer bi seznam rasel v nedogled */
  /* Isto besedilo v dveh trenutkih pisanja ni druga različica. Telefon zaostane
     na sredini stavka, prenosnik ima dokončanega — prej je iz tega nastala
     odvečna različica in opozorilo ob skoraj vsaki uskladitvi.              */
  const dolgo = "Bolečina v hrbtu? 10 minut na dan";
  const vmesno = w.zlijStanje(stanje("2026-08-05T10:00:00.000Z", kreativa([dolgo], ["n"])),
    stanje("2026-08-05T11:00:00.000Z", kreativa(["Bolečina v hrbtu?"], ["n"])));
  const kv = vmesno.stanje.izdelki[0].kreative[0];
  ok(kv.hooki.length === 1 && kv.hooki[0] === dolgo,
    "krajše besedilo, ki je začetek daljšega, ne naredi nove različice",
    JSON.stringify(kv.hooki));
  ok(!kv.zlitoOb, "in ne prižge opozorila");
  /* obratna smer: naše je krajše, njihovo nadaljuje — obvelja daljše */
  const obratno = w.zlijStanje(stanje("2026-08-05T10:00:00.000Z", kreativa(["Bolečina v hrbtu?"], ["n"])),
    stanje("2026-08-05T11:00:00.000Z", kreativa([dolgo], ["n"])));
  const ko = obratno.stanje.izdelki[0].kreative[0];
  ok(ko.hooki.length === 1 && ko.hooki[0] === dolgo, "obvelja daljše", JSON.stringify(ko.hooki));
  ok(!ko.zlitoOb, "tudi v to smer brez opozorila");
  /* res drugo besedilo pa še vedno obdrži obe in opozori */
  const drugo = w.zlijStanje(stanje("2026-08-05T10:00:00.000Z", kreativa(["Hrbet te ubija?"], ["n"])),
    stanje("2026-08-05T11:00:00.000Z", kreativa([dolgo], ["n"])));
  const kd = drugo.stanje.izdelki[0].kreative[0];
  ok(kd.hooki.length === 2, "drugačno besedilo se še vedno obdrži", JSON.stringify(kd.hooki));
  ok(!!kd.zlitoOb, "in takrat opozorilo pride");

  const spet = w.zlijStanje(r.stanje, JSON.parse(JSON.stringify(
    Object.assign({}, r.stanje, { spremenjeno: "2026-08-05T12:00:00.000Z" }))));
  ok(spet.stanje.izdelki[0].kreative[0].hooki.length === 2, "ponovno zlivanje ne podvaja",
    spet.stanje.izdelki[0].kreative[0].hooki.join(" | "));
  ok(spet.novih === 0, "in nima česa novega prinesti", String(spet.novih));

  /* skalarna polja se še vedno odločijo po novejši strani */
  const mojeS = stanje("2026-08-05T10:00:00.000Z", kreativa(["a"], ["a"], { status: "ideja", budget: "10" }));
  const kolegovoS = stanje("2026-08-05T11:00:00.000Z", kreativa(["a"], ["a"], { status: "aktivna", budget: "50" }));
  const rs = w.zlijStanje(mojeS, kolegovoS).stanje.izdelki[0].kreative[0];
  ok(rs.status === "aktivna" && rs.budget === "50",
    "status in budget ostaneta pravilo novejše strani", rs.status + " / " + rs.budget);

  /* prazno čakalno mesto ne sme ostati pred pravim besedilom */
  const prazno = stanje("2026-08-05T10:00:00.000Z", kreativa([""], [""]));
  const polno = stanje("2026-08-05T11:00:00.000Z", kreativa(["kolegov hook"], ["kolegov naslov"]));
  const rp = w.zlijStanje(prazno, polno).stanje.izdelki[0].kreative[0];
  ok(rp.hooki.length === 1 && rp.hooki[0] === "kolegov hook",
    "prazna različica se umakne vsebini", JSON.stringify(rp.hooki));

  /* izbrana različica mora ostati znotraj daljšega seznama */
  const zIzbiro = stanje("2026-08-05T10:00:00.000Z",
    kreativa(["moj"], ["moj"], { izbrana: { hooki: 0, naslovi: 0 } }));
  const tuja = stanje("2026-08-05T11:00:00.000Z",
    kreativa(["tuj"], ["tuj"], { izbrana: { hooki: 5, naslovi: 0 } }));
  const ri = w.zlijStanje(zIzbiro, tuja).stanje.izdelki[0].kreative[0];
  ok(ri.izbrana.hooki >= 0 && ri.izbrana.hooki < ri.hooki.length,
    "izbira ne kaže mimo seznama", ri.izbrana.hooki + " od " + ri.hooki.length);

  /* besedila pod stikalom (slovensko, hrvaško) se zlijejo enako */
  const zVar = (h, cas) => stanje(cas, kreativa(["x"], ["x"], {
    vodi: "g1", variante: { "Slovenija": { hooki: h, naslovi: ["n"], primarna: ["p"], opisi: [""] } },
  }));
  const rv = w.zlijStanje(zVar(["moj SLO"], "2026-08-05T10:00:00.000Z"),
    zVar(["kolegov SLO"], "2026-08-05T11:00:00.000Z"));
  const varZlita = rv.stanje.izdelki[0].kreative[0].variante["Slovenija"];
  ok(varZlita.hooki.length === 2, "tudi besedila pod stikalom se obdržijo",
    varZlita.hooki.join(" | "));
}

console.log("\n== objava in seznam datotek ==");
{
  /* Ena sama različica: v sw.js ne sme več biti svoje številke, sicer se lahko
     razideta in uporabnik dobi staro kodo iz predpomnilnika.                 */
  const sw = fs.readFileSync(path.join(REPO, "sw.js"), "utf8");
  const verzija = fs.readFileSync(path.join(REPO, "verzija.js"), "utf8");
  ok(/^\s*var RAZLICICA_ST\s*=\s*\d+/m.test(verzija), "verzija.js ima številko različice");
  ok(!/oglasni-list-v\d/.test(sw), "sw.js nima svoje številke — vzame jo iz verzija.js");
  ok(sw.indexOf('importScripts("./verzija.js")') >= 0, "in jo res uvozi");

  /* Vsaka skripta iz index.html mora biti tudi v predpomnilniku, sicer del
     aplikacije brez povezave ne dela.                                        */
  const vSw = (sw.match(/"([^"]+\.(?:js|html|css|svg|webmanifest))"/g) || []).map((x) => x.slice(1, -1));
  const manjka = SKRIPTE.filter((s) => vSw.indexOf(s) < 0);
  ok(manjka.length === 0, "vse skripte iz index.html so v seznamu sw.js", manjka.join(", "));
  ok(SKRIPTE[SKRIPTE.length - 1] === "js/zagon.js", "zagon.js se nalaga zadnji", SKRIPTE.join(" "));

  /* Supabase je v repozitoriju in pripet na točno različico, ne na plavajoč @2 */
  const oblak = fs.readFileSync(path.join(REPO, "js/oblak.js"), "utf8");
  ok(fs.existsSync(path.join(REPO, "vendor/supabase.js")), "knjižnica Supabase je v repozitoriju");
  ok(!/supabase-js@2\//.test(oblak), "CDN ni več pripet na plavajočo oznako @2");
  ok(/supabase-js@\d+\.\d+\.\d+\//.test(oblak), "rezervni CDN je pripet na točno različico");
  ok(/integrity/.test(oblak) && /sha384-/.test(oblak), "in preverjen s SRI");
}

console.log("\n== CGP na mapi ==");
const prCgp = w.PR();
prCgp.cgp.barve = "#1F35C4, #F2B417";
prCgp.cgp.pisave = "Naslovi: Inter Bold";
prCgp.cgp.pravila = "Logo vedno v kotu.";
prCgp.zapiski = "Dostop do Drive ima Ana.";
ok(w.cgpBarve("#1F35C4, #F2B417").length === 2, "stare barve iz besedila se pretvorijo v seznam",
  JSON.stringify(w.cgpBarve("#1F35C4, #F2B417")));
ok(w.cgpBarve("brez barv").length === 0, "besedilo brez barv ne da nič");
prCgp.cgp.barve = [{ hex: "#1F35C4", ime: "modra" }, { hex: "#F2B417", ime: "rumena" }];
w.view = "projekti";
w.render();
ok(w.document.getElementById("v-projekti").textContent.indexOf("Celostna podoba") >= 0,
  "razdelek Celostna podoba je v pogledu Projekti");
ok(w.document.querySelectorAll('[data-cgpbarva="hex"]').length === 4,
  "vsaka barva ima ščipalko in polje s kodo",
  w.document.querySelectorAll('[data-cgpbarva="hex"]').length + " polj");
ok(w.document.querySelectorAll('[data-cgpbarva="ime"]').length === 2, "in polje za ime");
ok(w.cgpBarveTekst(prCgp) === "modra #1F35C4, rumena #F2B417", "barve gredo v brief z imeni",
  w.cgpBarveTekst(prCgp));
ok(!!w.document.querySelector("[data-dropcgp]"), "nalaganje logotipov in pisav obstaja");
const briefCgp = w.briefText(w.P().kreative[0]);
ok(briefCgp.indexOf("CELOSTNA PODOBA") >= 0, "CGP gre v brief");
ok(briefCgp.indexOf("#F2B417") >= 0, "z barvami vred");
ok(briefCgp.indexOf("Dostop do Drive") >= 0, "zapiski mape gredo v brief");

console.log("\n== stikala ==");
ok(w.stikala().length === 0, "privzeto ni nobenega stikala — nič se ne spremeni");
w.dodajStikalo("Trg", ["Slovenija", "Hrvaška", "Slovaška"]);
const trg = w.stikala()[0];
ok(!!trg && trg.moznosti.length === 3, "stikalo Trg dodano");
ok(w.S.v === 6, "migracija na v6", "v=" + w.S.v);

const ps = w.P();
/* privzetek na izdelku */
ps.stikala[trg.id] = "Hrvaška";
w.view = "kreative";
w.odprtaKreativa = null;
w.render();
ok(w.document.querySelectorAll('[data-stik="v"]').length === 4,
  "filter nad seznamom ima vse + tri možnosti",
  w.document.querySelectorAll('[data-stik="v"]').length + "");

/* nova kreativa prevzame vrednost izdelka, ko je pogled na vse */
const kNova = w.novaKreativa("facebook");
w.stikPodeduj(kNova, ps);
ok(kNova.stikala[trg.id] === "Hrvaška", "nova kreativa prevzame vrednost izdelka", kNova.stikala[trg.id]);
/* ko je pogled na Slovaško, jo prevzame od pogleda */
w.stikNastaviPogled(trg.id, "Slovaška");
const kNova2 = w.novaKreativa("facebook");
w.stikPodeduj(kNova2, ps);
ok(kNova2.stikala[trg.id] === "Slovaška", "nova kreativa prevzame vrednost iz pogleda", kNova2.stikala[trg.id]);

/* filtriranje seznama */
ps.kreative.push(kNova, kNova2);
w.stikNastaviPogled(trg.id, "Hrvaška");
let vidne = w.stikFilter(ps.kreative);
ok(vidne.indexOf(kNova) >= 0 && vidne.indexOf(kNova2) < 0,
  "pogled Hrvaška skrije slovaško kreativo");
ok(vidne.indexOf(ps.kreative[0]) >= 0, "kreativa brez vrednosti velja za vse in ostane vidna");
w.stikNastaviPogled(trg.id, "*");
ok(w.stikFilter(ps.kreative).length === ps.kreative.length, "pogled „vse“ pokaže vse");

console.log("\n== stikalo, ki vodi besedila ==");
const kv = kNova;
kv.hooki = ["Slovenski hook"];
kv.primarna = ["Slovensko besedilo"];
kv.url = "https://trgovina.si/slo";
kv.stikala[trg.id] = "Slovenija";
w.stikVklopiVodenje(kv, trg.id);
ok(kv.vodi === trg.id, "vodenje vklopljeno");
ok(kv.variante["Hrvaška"] && kv.variante["Hrvaška"].hooki[0] === "Slovenski hook",
  "ostale možnosti dobijo kopijo za začetek");
/* preklop shrani staro in naloži novo */
w.stikPreklopi(kv, trg, "Hrvaška");
ok(w.stikVrednost(kv, trg) === "Hrvaška", "preklopljeno na Hrvaško");
kv.hooki = ["Hrvatski hook"];
kv.url = "https://trgovina.si/hr";
w.stikPreklopi(kv, trg, "Slovenija");
ok(kv.hooki[0] === "Slovenski hook", "vrnitev naloži slovensko besedilo", kv.hooki[0]);
ok(kv.url === "https://trgovina.si/slo", "vrnitev naloži tudi slovenski URL", kv.url);
w.stikPreklopi(kv, trg, "Hrvaška");
ok(kv.hooki[0] === "Hrvatski hook", "hrvaško besedilo je shranjeno", kv.hooki[0]);
ok(kv.url === "https://trgovina.si/hr", "hrvaški URL je shranjen", kv.url);
ok(w.stikNapisane(kv, trg).length === 3, "napisane možnosti so preštete",
  w.stikNapisane(kv, trg).join(", "));

/* izklop vodenja ne pobrise nicesar */
kv.vodi = "";
ok(kv.variante["Slovenija"] && kv.variante["Slovenija"].hooki[0] === "Slovenski hook",
  "izklop vodenja pusti shranjene različice");
kv.vodi = trg.id;

/* brief in izvoz vsebujeta stikalo */
w.S.aktiven = ps.id;
w.odprtaKreativa = kv.id;
ok(w.briefText(kv).indexOf("Trg: Hrvaška") >= 0, "brief navede vrednost stikala");
ok(w.briefText(kv).indexOf("vodi") >= 0, "brief pove, da stikalo vodi besedila");
ok(w.xlsVrstice().some((c) => c.g === "Trg"), "izvoz v Excel dobi vrstico Trg");
ok(w.xlsVrstice()[0].g === "Izdelek" && w.xlsVrstice().map((c) => c.g).indexOf("Ime kreative") > 0,
  "izvoz je obrnjen: polja so v vrsticah");

/* urejevalnik se izrise s stikali */
w.view = "kreative";
try {
  w.renderEditor();
  ok(w.document.querySelectorAll('[data-stik="k"]').length === 4, "urejevalnik izriše gumbe stikala");
  ok(w.document.querySelectorAll("[data-loci]").length === 1, "vklop ločenih besedil je ob stikalu");
  ok(w.document.querySelector("[data-loci]").checked === true, "obkljukano, ker to stikalo vodi besedila");
} catch (e) { ok(false, "urejevalnik s stikali", e.message); }

/* preimenovanje moznosti ne sme pustiti kreative brez pogleda */
trg.moznosti = ["Slovenija", "Hrvaška", "Avstrija"];
w.migriraj();
ok(kv.stikala[trg.id] == null || trg.moznosti.indexOf(kv.stikala[trg.id]) >= 0,
  "neveljavna vrednost se po preimenovanju pobriše", String(kv.stikala[trg.id]));
ok(w.stikFilter(ps.kreative).length > 0, "po preimenovanju kreative ne izginejo vse");

/* brisanje stikala pocisti tudi vodenje */
w.brisiStikalo(trg.id);
ok(w.stikala().length === 0, "stikalo odstranjeno");
ok(kv.vodi === "", "brisanje stikala pobriše vodenje", kv.vodi);
ps.kreative = ps.kreative.filter((x) => x !== kNova && x !== kNova2);

console.log("\n== izdelek: material, zapiski, vklopljivi izračuni ==");
const pi = w.P();
ok(w.datLastnikIzdelka(pi) === "izd:" + pi.id, "lastnik materiala izdelka");
pi.izracuni = false;
w.view = "pregled";
w.render();
ok(!!w.document.getElementById("f-zapiski"), "izdelek se ureja v Pregledu — polje za zapiske");
ok(!!w.document.getElementById("drop-izd"), "in nalaganje materiala izdelka");
ok(w.document.getElementById("v-pregled").textContent.indexOf("Prodajna cena") < 0,
  "cene ni v Pregledu — ta je v Kalkulatorju");
ok(!w.imaEkon(pi), "imaEkon() je false");
w.view = "pregled";
w.render();
ok(w.document.getElementById("v-pregled").textContent.indexOf("Izračuni za ta izdelek so izklopljeni") >= 0,
  "pregled pove, da so izračuni izklopljeni");
pi.izracuni = true;
w.view = "kalkulator";
w.render();
ok(w.document.getElementById("v-kalkulator").textContent.indexOf("Prodajna cena") >= 0,
  "z vklopljenimi izračuni so polja za ceno v Kalkulatorju");
ok(!!w.document.getElementById("razrez"), "razrez je v Kalkulatorju");
w.view = "pregled";
w.render();
ok(!!w.document.getElementById("f-zapiski"), "zapiski ostanejo v Pregledu");

/* stara zavihka Ekonomika in Vodnik ne obstajata vec */
ok(w.pravView("ekonomika") === "pregled", "stara povezava na Ekonomiko pelje na Pregled");
ok(w.pravView("vodnik") === "podatki", "stara povezava na Vodnik pelje na Podatke");
w.view = "podatki";
w.render();
const podatkiTxt = w.document.getElementById("v-podatki").textContent;
ok(podatkiTxt.indexOf("Kje vnesem budget?") >= 0, "vodnik je zdaj na dnu Podatkov");
ok(!!w.document.getElementById("cloud-body"), "in oblak je še vedno tam");
/* nastavitvenih in nevarnih stvari v aplikaciji ni vec */
ok(w.SQL === undefined, "SQL ni več v aplikaciji — je v supabase.sql");
ok(podatkiTxt.indexOf("Namesti kot aplikacijo") < 0, "navodil za namestitev ni več v Podatkih");
ok(podatkiTxt.indexOf("Pobriši vse") < 0, "gumba za brisanje vsega ni več");

/* SQL v repozitoriju mora biti ponovljiv, sicer drugo poganjanje pade na 42710 */
const sql = fs.readFileSync(path.join(REPO, "supabase.sql"), "utf8");
ok(sql.indexOf("storage.buckets") >= 0, "supabase.sql naredi vedro za slike");
ok(sql.indexOf("create table if not exists public.stanje") >= 0, "in tabelo za besedila");
ok((sql.match(/create policy/g) || []).length === (sql.match(/drop policy if exists/g) || []).length,
  "vsak create policy ima svoj drop policy if exists — SQL se sme poganjati večkrat",
  (sql.match(/create policy/g) || []).length + " pravil");

pi.zapiski = "Debelina 5,5 mm, obrabni sloj 0,5 mm.";
ok(w.briefText(pi.kreative[0]).indexOf("O IZDELKU") >= 0, "zapiski izdelka gredo v brief");
ok(w.briefText(pi.kreative[0]).indexOf("obrabni sloj 0,5 mm") >= 0, "vsebina zapiskov v briefu");

/* ── izračuni ──────────────────────────────────────────────────────────────
   Marža, CPA in profit so bistvo orodja, napačna številka pa ne vrže napake —
   samo lepo izpiše nekaj, po čemer se potem razporeja budget. Zato so tu
   vrednosti izračunane na roko.                                              */
console.log("\n== branje števil ==");
{
  const primeri = [
    ["30", 30], ["1,8", 1.8], ["0,5", 0.5], ["-5,5", -5.5],
    ["", 0], ["brez številke", 0], ["12,50 €", 12.5], ["1,8 %", 1.8],
    ["1.5", 1.5],                     /* angleška decimalna pika */
    ["12.345", 12345],                /* pika kot ločilo tisočic */
    ["1.234,56", 1234.56],            /* slovenski zapis v celoti */
    ["1,234,567.89", 1234567.89],     /* angleški zapis v celoti */
    ["12 345,50", 12345.5],           /* presledek kot ločilo tisočic */
  ];
  primeri.forEach(([vhod, pricakovano]) => {
    const dobljeno = w.n(vhod);
    ok(Math.abs(dobljeno - pricakovano) < 1e-9,
      'n("' + vhod + '") = ' + pricakovano, "dobil " + dobljeno);
  });
  /* to je bila prava napaka: aplikacija svojo številko vpiše nazaj v polje */
  [12345, 1234.56, 999.5, 30].forEach((v) => {
    ok(Math.abs(w.n(w.nfE.format(v)) - v) < 1e-9,
      "kar aplikacija izpiše, zna tudi prebrati: " + v,
      w.nfE.format(v) + " → " + w.n(w.nfE.format(v)));
  });
}

console.log("\n== ekonomika izdelka ==");
const blizu = (a, b) => Math.abs(a - b) < 0.005;
{
  /* cena 100 z DDV 22 %, nabava 40, pošiljanje 5, embalaža 2, ostalo 3 */
  const osnova = {
    cena: "100", posiljanjePlaca: "", ddv: "22", ddvVkljucen: true,
    provizijaPct: "", provizijaFix: "", nabavna: "40", posiljanje: "5",
    embalaza: "2", ostalo: "3", vracilaPct: "",
  };
  const a = w.ekon(osnova);
  ok(blizu(a.bruto, 100), "bruto je cena + plačana poštnina", String(a.bruto));
  ok(blizu(a.prihodek, 81.9672), "prihodek brez DDV = 100 / 1,22", String(a.prihodek));
  ok(blizu(a.ddv, 18.0328), "DDV je razlika", String(a.ddv));
  ok(blizu(a.izdelava, 50), "izdelava = 40 + 5 + 2 + 3", String(a.izdelava));
  ok(blizu(a.marza, 31.9672), "marža = prihodek − stroški", String(a.marza));
  ok(blizu(a.marzaEf, 31.9672), "brez vračil je efektivna marža enaka marži", String(a.marzaEf));
  ok(blizu(a.marzaPct, 39.0), "marža v odstotkih prihodka", String(a.marzaPct));
  ok(blizu(a.beCPA, a.marzaEf), "prag CPA je efektivna marža", String(a.beCPA));
  ok(blizu(a.beROAS, 3.128), "prag ROAS = bruto / efektivna marža", String(a.beROAS));

  const b = w.ekon(Object.assign({}, osnova, { ddvVkljucen: false }));
  ok(blizu(b.prihodek, 100) && blizu(b.ddv, 0), "brez DDV gre ves bruto v prihodek", String(b.prihodek));
  ok(blizu(b.marza, 50), "in marža je 100 − 50", String(b.marza));

  /* 20 % vračil: izgubiš delež marže, pri vrnjenih pa poštnino, embalažo in provizijo */
  const c = w.ekon(Object.assign({}, osnova, { vracilaPct: "20" }));
  ok(blizu(c.marzaEf, 31.9672 * 0.8 - 0.2 * 7), "vračila znižajo efektivno maržo", String(c.marzaEf));
  ok(blizu(c.marza, a.marza), "sama marža pri tem ostane nedotaknjena", String(c.marza));

  const d = w.ekon(Object.assign({}, osnova, { provizijaPct: "3", provizijaFix: "0,35" }));
  ok(blizu(d.provizija, 3.35), "provizija = 3 % od bruto + 0,35 fiksno", String(d.provizija));
  ok(blizu(d.marza, a.marza - 3.35), "in gre naravnost z marže", String(d.marza));

  const f = w.ekon(Object.assign({}, osnova, { posiljanjePlaca: "5" }));
  ok(blizu(f.bruto, 105), "poštnina, ki jo plača kupec, je del brutota", String(f.bruto));

  /* prazen izdelek ne sme vreči napake ne dati neumnosti */
  const prazen = w.ekon({});
  ok(prazen.bruto === 0 && prazen.marza === 0, "prazen izdelek da ničle");
  ok(!isFinite(prazen.marzaPct), "odstotka marže brez prihodka ni", String(prazen.marzaPct));

  /* vračila nad 100 % ali pod 0 % ne smejo obrniti računa na glavo */
  ok(w.ekon(Object.assign({}, osnova, { vracilaPct: "250" })).vracila === 1,
    "delež vračil je omejen na 100 %");
  ok(w.ekon(Object.assign({}, osnova, { vracilaPct: "-40" })).vracila === 0,
    "in ne more biti negativen");
}

console.log("\n== lijak od budgeta do profita ==");
{
  const ek = { bruto: 100, marzaEf: 30 };
  /* 100 € pri CPM 10 → 10.000 prikazov → 2 % → 200 klikov → 5 % → 10 naročil */
  const l = w.lijak("100", "10", "2", "5", ek);
  ok(blizu(l.impr, 10000), "prikazi = budget / CPM × 1000", String(l.impr));
  ok(blizu(l.kliki, 200), "kliki = prikazi × CTR", String(l.kliki));
  ok(blizu(l.narocil, 10), "naročila = kliki × CVR", String(l.narocil));
  ok(blizu(l.cpc, 0.5), "CPC = budget / kliki", String(l.cpc));
  ok(blizu(l.cpa, 10), "CPA = budget / naročila", String(l.cpa));
  ok(blizu(l.prihodek, 1000), "prihodek = naročila × bruto", String(l.prihodek));
  ok(blizu(l.roas, 10), "ROAS = prihodek / budget", String(l.roas));
  ok(blizu(l.profit, 200), "profit = naročila × efektivna marža − budget", String(l.profit));
  ok(blizu(l.maxCPC, 1.5), "največji še smiseln CPC = marža × CVR", String(l.maxCPC));

  /* pri CPA nad prag profit pade pod nič — to je številka, po kateri se ustavi kampanjo */
  const izguba = w.lijak("100", "10", "2", "1", ek);
  ok(blizu(izguba.narocil, 2) && izguba.profit < 0,
    "premajhen CVR pomeni izgubo", "profit " + izguba.profit);
  ok(blizu(izguba.profit, -40), "in točno koliko", String(izguba.profit));

  const brezCpm = w.lijak("100", "0", "2", "5", ek);
  ok(!isFinite(brezCpm.impr) && !isFinite(brezCpm.profit),
    "brez CPM ni prikazov in ne profita — ne ničel");
  const brezCvr = w.lijak("100", "10", "2", "0", ek);
  ok(brezCvr.narocil === 0 && !isFinite(brezCvr.cpa) && blizu(brezCvr.profit, -100),
    "nič naročil: CPA ni definiran, izguba je cel budget", String(brezCvr.profit));
}

console.log("\n== doseženi rezultati ==");
{
  const ek = { bruto: 100, marzaEf: 30 };
  const k = { rSpend: "200", rImpr: "20000", rClicks: "400", rOrders: "8" };
  const r = w.rezultat(k, ek);
  ok(blizu(r.cpm, 10), "CPM iz porabe in prikazov", String(r.cpm));
  ok(blizu(r.ctr, 2), "CTR", String(r.ctr));
  ok(blizu(r.cpc, 0.5), "CPC", String(r.cpc));
  ok(blizu(r.cvr, 2), "CVR", String(r.cvr));
  ok(blizu(r.cpa, 25), "CPA", String(r.cpa));
  ok(blizu(r.roas, 4), "ROAS", String(r.roas));
  ok(blizu(r.profit, 40), "profit = 8 × 30 − 200", String(r.profit));
  ok(r.imaPodatke === true, "kreativa ima vpisane rezultate");

  const prazna = w.rezultat({}, ek);
  ok(prazna.imaPodatke === false, "prazna kreativa nima rezultatov");
  ok(!isFinite(prazna.cpm) && !isFinite(prazna.cpa), "in brez podatkov ne izmišljuje razmerij");

  /* številke z ločilom tisočic morajo priti skozi enako kot brez njega */
  const velik = w.rezultat({ rSpend: "1.234,56", rImpr: "12.345", rClicks: "400", rOrders: "8" }, ek);
  ok(blizu(velik.spend, 1234.56) && blizu(velik.impr, 12345),
    "rezultati berejo tudi zapis s piko za tisočice", velik.spend + " / " + velik.impr);
}

/* ── razdelilnik dogodkov ──────────────────────────────────────────────────
   Kliki gredo skozi eno samo tabelo pravil. Tu jih sprožimo zares, prek
   dispatchEvent, da se preveri tudi pot od dogodka do pravila — ne le
   funkcije, ki jih pravila kličejo.                                          */
console.log("\n== faze in trak napredka ==");
{
  const d = w.document;
  const staraMapa = w.S.aktivenProjekt, starIzdelek = w.S.aktiven;

  ok(w.fazaStatusa("brief") === "vdelu" && w.fazaStatusa("montaza") === "vdelu",
    "koraki produkcije padejo v fazo „v delu“");
  ok(w.fazaStatusa("aktivna") === "vzraku" && w.fazaStatusa("zmagovalka") === "vzraku",
    "aktivna in zmagovalka sta „v zraku“");
  ok(w.fazaStatusa("pavza") === "ustavljeno" && w.fazaStatusa("ubita") === "ustavljeno",
    "pavza in ubita sta ustavljeni");
  ok(w.fazaStatusa("nekaj-cisto-drugega") === "ideja", "neznan status ne razbije razvrstitve");
  /* vsak status mora pasti v natanko eno fazo, sicer bi trak lagal */
  w.STATUSI.forEach(([kljuc]) => {
    const zadetki = w.FAZE.filter((f) => f[3].indexOf(kljuc) >= 0).length;
    ok(zadetki === 1, "status „" + kljuc + "“ je v natanko eni fazi", String(zadetki));
  });

  const kreative = [
    { status: "ideja" }, { status: "brief" }, { status: "montaza" },
    { status: "pripravljeno" }, { status: "aktivna" }, { status: "ubita" },
  ];
  const st = w.fazeStevila(kreative);
  ok(st.skupaj === 6 && st.vdelu === 2 && st.vzraku === 1 && st.ustavljeno === 1,
    "faze se preštejejo", JSON.stringify(st));
  ok(st.odprto === 4, "odprto je vse razen tega, kar teče ali je ustavljeno", String(st.odprto));

  const trak = w.napredekHtml(kreative);
  ok(trak.indexOf("fz-delo") >= 0 && trak.indexOf("fz-zrak") >= 0, "trak nariše faze, ki obstajajo");
  ok(trak.indexOf("fz-prip") >= 0, "vsako fazo, ki je v igri");
  ok(w.napredekHtml([]) === "", "brez kreativ ni traku");

  /* imena pod pasom so statusi, ne faze — „sestavi brief“ pove, kje delo stoji */
  const cipi = w.statusiPills(kreative, 8);
  ok(cipi.indexOf("sestavi brief") >= 0 && cipi.indexOf("aktivna") >= 0,
    "statusi so našteti po imenih", cipi.replace(/<[^>]*>/g, " ").trim());
  ok(cipi.indexOf("v delu") < 0, "in ne po ohlapnih fazah");
  ok(w.statusiPills([]) === "", "brez kreativ ni značk");
  const veliko = w.statusiPills(kreative, 2);
  ok(veliko.indexOf("+") >= 0, "nad mejo se ostanek zloži v +N", veliko.replace(/<[^>]*>/g, " ").trim());
  ok(trak.indexOf('aria-label="') >= 0 && trak.indexOf("v delu: 2") >= 0,
    "trak se da prebrati tudi z bralnikom zaslona");

  /* mapa s kreativami: trak in števci morajo priti na kartico */
  const pr = w.novProjekt("Mapa s statusi");
  w.S.projekti.push(pr);
  const izd = w.novIzdelek("Izdelek s statusi", pr.id);
  ["brief", "brief", "aktivna", "ubita"].forEach((s, i) => {
    const k = w.novaKreativa("facebook");
    k.naslov = "K" + i; k.status = s;
    izd.kreative.push(k);
  });
  w.S.izdelki.push(izd);
  w.S.aktivenProjekt = pr.id; w.S.aktiven = izd.id;
  w.view = "projekti"; w.render();

  const mapa = d.querySelector('[data-prdel="' + pr.id + '"]').closest(".block");
  ok(mapa.querySelector(".nap-b") !== null, "kartica mape ima trak napredka");
  ok(mapa.textContent.indexOf("2 odprti") >= 0, "in pove, koliko je odprtega",
    mapa.querySelector("header").textContent.replace(/\s+/g, " ").trim());
  ok(mapa.textContent.indexOf("1 v zraku") >= 0, "in koliko že teče");
  /* Na kartici izdelka ni traku, ampak poimenski statusi — „sestavi brief · 2“
     pove več kot „2 odprti“, in prav to je bilo želeno.                     */
  const kartica = mapa.querySelector('[data-pick="' + izd.id + '"]');
  ok(!!kartica && kartica.querySelector(".kar-st") !== null,
    "kartica izdelka našteje statuse kreativ");
  ok(kartica.textContent.indexOf("sestavi brief · 2") >= 0,
    "z imenom statusa in številom", kartica.querySelector(".kar-st").textContent);
  ok(kartica.textContent.indexOf("aktivna") >= 0 && kartica.textContent.indexOf("ubita") >= 0,
    "in našteje vse, ki so v igri");
  ok(kartica.textContent.indexOf("2 odprti") < 0,
    "brez ohlapnega „2 odprti“, ki ne pove, kje delo stoji");

  /* Pregled: trak, podrobne številke in barvni rob po fazi */
  w.view = "pregled"; w.render();
  const kre = d.getElementById("pr-kre");
  ok(kre.querySelector(".nap-b") !== null, "Pregled ima trak napredka");
  ok(kre.querySelector(".pill.st-brief") !== null,
    "in pod njim prave statuse, ne faz",
    kre.querySelector(".row").textContent.replace(/\s+/g, " ").trim());
  ok(kre.querySelectorAll("tbody tr[data-faza]").length === 4,
    "vsaka vrstica nosi svojo fazo", String(kre.querySelectorAll("tbody tr[data-faza]").length));
  ok(kre.querySelectorAll('tbody tr[data-faza="vdelu"]').length === 2,
    "dve sta v delu");
  ok(kre.querySelector("tbody tr[data-faza] .pill") !== null,
    "podroben status ostane v vrstici");

  w.S.aktivenProjekt = staraMapa; w.S.aktiven = starIzdelek;
  w.view = "projekti"; w.render();
}

console.log("\n== koš in razveljavi ==");
{
  const d = w.document;
  const staraMapa = w.S.aktivenProjekt;

  /* mapa z izdelkom in kreativo gre v koš in se cela vrne */
  const pr = w.novProjekt("Mapa za koš");
  w.S.projekti.push(pr);
  const izd = w.novIzdelek("Izdelek v košu", pr.id);
  const kre = w.novaKreativa("facebook");
  kre.naslov = "Kreativa v košu";
  kre.hooki = ["pomemben hook"];
  izd.kreative.push(kre);
  w.S.izdelki.push(izd);
  w.S.aktivenProjekt = pr.id;

  const prejMap = w.S.projekti.length, prejIzd = w.S.izdelki.length;
  w.view = "projekti"; w.render();
  const gumb = d.querySelector('[data-prdel="' + pr.id + '"]');
  ok(!!gumb, "mapa ima gumb Izbriši");
  if (gumb) gumb.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

  ok(w.S.projekti.length === prejMap - 1, "mapa gre iz seznama");
  ok(!w.S.izdelki.some((x) => x.id === izd.id), "in izdelek z njo");
  ok(w.kosSeznam().length === 1, "zapis pristane v košu", String(w.kosSeznam().length));
  ok(w.S.brisano.some((x) => x.id === kre.id), "sled brisanja pokrije tudi kreativo v njej");

  /* obvestilo ponudi Razveljavi */
  const gumbT = d.querySelector("#toast .toast-b");
  ok(!!gumbT && gumbT.textContent === "Razveljavi", "obvestilo ponudi Razveljavi",
    gumbT ? gumbT.textContent : "gumba ni");
  if (gumbT) gumbT.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

  ok(w.S.projekti.length === prejMap, "klik na Razveljavi vrne mapo", String(w.S.projekti.length));
  ok(w.S.izdelki.length === prejIzd, "in izdelek z njo");
  const vrnjenIzd = w.S.izdelki.filter((x) => x.id === izd.id)[0];
  ok(!!vrnjenIzd && vrnjenIzd.kreative[0].hooki[0] === "pomemben hook",
    "z vso vsebino vred");
  ok(w.kosSeznam().length === 0, "in koš je spet prazen");
  ok(!w.S.brisano.some((x) => x.id === izd.id), "sled brisanja se umakne");
  ok(w.S.vrnjeno.some((x) => x.id === izd.id), "ostane pa oznaka vrnitve");

  /* vrnitev mora prebiti kolegovo sled brisanja, sicer zapis spet umre */
  {
    const kdaj = "2026-08-05T10:00:00.000Z";
    const pozneje = "2026-08-05T11:00:00.000Z";
    const skupno = {
      v: 6, spremenjeno: kdaj, projekti: [{ id: "pr1", ime: "Mapa" }],
      izdelki: [{ id: "i1", projekt: "pr1", ime: "Izdelek", kreative: [] }],
      stikala: [], banka: [], datoteke: [], kos: [], brisano: [], vrnjeno: [],
    };
    /* kolega je izbrisal, jaz sem potem vrnil iz koša */
    const kolegovo = JSON.parse(JSON.stringify(skupno));
    kolegovo.izdelki = [];
    kolegovo.brisano = [{ id: "i1", kdaj: kdaj }];
    const moje = JSON.parse(JSON.stringify(skupno));
    moje.vrnjeno = [{ id: "i1", kdaj: pozneje }];
    moje.spremenjeno = pozneje;
    const r = w.zlijStanje(moje, kolegovo);
    ok(r.stanje.izdelki.some((x) => x.id === "i1"),
      "vrnitev prebije kolegovo sled brisanja", r.stanje.izdelki.map((x) => x.id).join(","));

    /* obratno: kolega je izbrisal PO moji vrnitvi — potem brisanje obvelja */
    const kasnejeIzbrisal = JSON.parse(JSON.stringify(kolegovo));
    kasnejeIzbrisal.brisano = [{ id: "i1", kdaj: "2026-08-05T12:00:00.000Z" }];
    kasnejeIzbrisal.spremenjeno = "2026-08-05T12:00:00.000Z";
    const r2 = w.zlijStanje(moje, kasnejeIzbrisal);
    ok(!r2.stanje.izdelki.some((x) => x.id === "i1"),
      "novejše brisanje pa spet obvelja", r2.stanje.izdelki.map((x) => x.id).join(","));
  }

  /* dokončno zavrženje */
  const kre2 = w.novaKreativa("facebook");
  kre2.naslov = "Za zavreči";
  w.P().kreative.push(kre2);
  w.vKos("kreativa", kre2.naslov, "test", { kreativa: { izdelek: w.P().id, zapis: kre2 } }, [kre2.id]);
  w.P().kreative = w.P().kreative.filter((x) => x.id !== kre2.id);
  const kosId = w.kosSeznam()[0].id;
  ok(w.kosSeznam().length === 1, "kreativa je v košu");
  w.izKosaZaVedno(kosId);
  ok(w.kosSeznam().length === 0, "zavrženje jo odstrani iz koša");
  ok(!w.P().kreative.some((x) => x.id === kre2.id), "in nazaj je ne dobiš");

  w.S.aktivenProjekt = staraMapa; w.view = "projekti"; w.render();
}

console.log("\n== pošiljanje datotek pove resnico ==");
{
  /* Napaka, ki jo je javil uporabnik: kazalo je kazalo „1 čaka na oblak · 1 jih
     ta naprava še ni prenesla“, gumb Pošlji slike v oblak pa je javil, da je vse
     v oblaku. Datoteka je bila v skupnem kazalu, njeni bajti pa na kolegovi
     napravi — poslati je od tod ni bilo mogoče, sporočilo pa je trdilo nasprotno. */
  ok(typeof w.izidPosiljanja === "function", "izid pošiljanja ima svojo funkcijo");
  ok(w.izidPosiljanja({ poslano: 0, usklajenih: 0, spodletelo: 0, brezBajtov: 0 })
      === "Vse datoteke so že v oblaku.",
    "ko res ni ničesar, to tudi pove");

  const brez = w.izidPosiljanja({ poslano: 0, usklajenih: 0, spodletelo: 0, brezBajtov: 1 });
  ok(brez.indexOf("Vse datoteke so že v oblaku") < 0,
    "datoteka na tuji napravi NI „vse je v oblaku“", brez);
  ok(brez.indexOf("drugi napravi") >= 0, "ampak pove, kje je", brez);

  ok(w.izidPosiljanja({ poslano: 2, usklajenih: 0, spodletelo: 0, brezBajtov: 0 })
      .indexOf("2 datoteki sta šli") >= 0, "poslane datoteke prešteje s pravo obliko",
    w.izidPosiljanja({ poslano: 2, usklajenih: 0, spodletelo: 0, brezBajtov: 0 }));
  ok(w.izidPosiljanja({ poslano: 0, usklajenih: 1, spodletelo: 0, brezBajtov: 0 })
      .indexOf("kazalo je zdaj usklajeno") >= 0,
    "kar je bilo v vedru že prej, se ne prikaže kot novo pošiljanje");
  ok(w.izidPosiljanja({ poslano: 0, usklajenih: 0, spodletelo: 1, brezBajtov: 0 })
      .indexOf("poskusim znova") >= 0, "neuspeh pove, da bo poskusil sam");
  const vse = w.izidPosiljanja({ poslano: 1, usklajenih: 1, spodletelo: 1, brezBajtov: 1 });
  ["šla", "usklajeno", "znova", "drugi napravi"].forEach((del) => {
    ok(vse.indexOf(del) >= 0, "sestavljen izid omeni „" + del + "“", vse);
  });
  ok(w.izidPosiljanja(null).indexOf("ni uspelo") >= 0, "brez izida ne trdi uspeha");

  /* kazalo mora ločiti, kaj je v tej napravi in kaj ne */
  ok(typeof w.Datoteke.kljuciTu === "function", "kazalo zna povedati, kaj ima ta naprava");

  /* Točno stanje iz prijave: 5 datotek, ena čaka, njenih bajtov tu ni. */
  const vrstica = w.datotekeStanjeHtml(5, [{ id: "d9" }], { d1: 1, d2: 1 }, 1, null);
  ok(vrstica.indexOf("Datotek v ekipi:</b> 5") >= 0, "prešteje datoteke ekipe", vrstica);
  ok(vrstica.indexOf("čaka na pošiljanje") < 0,
    "ne trdi, da čaka na pošiljanje, če je od tod ni mogoče poslati", vrstica);
  ok(vrstica.indexOf("ni v oblaku in tudi ne v tej napravi") >= 0,
    "ampak pove, da je treba poslati z druge naprave", vrstica);
  ok(vrstica.indexOf("vse so v oblaku") < 0, "in ne trdi, da so vse v oblaku");

  /* ista datoteka, a bajti so tu → to pa se da poslati */
  const daSePoslati = w.datotekeStanjeHtml(5, [{ id: "d9" }], { d9: 1 }, 0, null);
  ok(daSePoslati.indexOf("1 čaka na pošiljanje") >= 0,
    "ko so bajti tu, čaka na pošiljanje", daSePoslati);
  ok(daSePoslati.indexOf("ne v tej napravi") < 0, "in ni pripisa o drugi napravi");

  ok(w.datotekeStanjeHtml(3, [], {}, 0, null).indexOf("vse so v oblaku") >= 0,
    "brez čakajočih pove, da so vse v oblaku");
  ok(w.datotekeStanjeHtml(0, [], {}, 0, null).indexOf("Nobene slike") >= 0,
    "brez datotek ne izpisuje števcev");
  ok(w.datotekeStanjeHtml(2, [{ id: "d1" }], { d1: 1 }, 0, "vedra „material“ še ni")
      .indexOf("Nalaganje ne uspe") >= 0, "napaka vedra se še vedno pokaže");
}

console.log("\n== zamenjava ob uvozu gre skozi koš ==");
{
  const prejMap = w.S.projekti.length, prejIzd = w.S.izdelki.length;
  const prejKos = w.kosSeznam().length;
  const paket = {
    v: 6, projekti: [{ id: "pr-tuj", ime: "Tuja mapa" }],
    izdelki: [{ id: "izd-tuj", projekt: "pr-tuj", ime: "Tuj izdelek", kreative: [] }],
  };
  w.uvozi(JSON.stringify(paket), "zamenjaj");
  ok(w.S.izdelki.length === 1 && w.S.projekti.length === 1,
    "zamenjava postavi samo vsebino datoteke", w.S.izdelki.length + " / " + w.S.projekti.length);
  ok(w.kosSeznam().length === prejKos + 1, "prejšnje stanje je pristalo v košu",
    String(w.kosSeznam().length));
  const posnetek = w.kosSeznam().filter((x) => x.kaj === "stanje")[0];
  ok(!!posnetek, "in je označeno kot posnetek celega stanja");
  ok(!posnetek.zapisi.celo.kos, "posnetek ne vsebuje koša samega — sicer bi se gnezdili");

  const gumbT = w.document.querySelector("#toast .toast-b");
  ok(!!gumbT && gumbT.textContent === "Razveljavi", "uvoz ponudi Razveljavi",
    gumbT ? gumbT.textContent : "gumba ni");
  if (gumbT) gumbT.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

  ok(w.S.projekti.length === prejMap && w.S.izdelki.length === prejIzd,
    "razveljavitev vrne vse nazaj", w.S.projekti.length + " map, " + w.S.izdelki.length + " izdelkov");
  ok(!w.S.izdelki.some((x) => x.id === "izd-tuj"), "in uvoženega ni več");
  ok(w.kosSeznam().length === prejKos, "posnetek se pobere iz koša", String(w.kosSeznam().length));
}

console.log("\n== čas v fazi in rok ==");
{
  const k = w.novaKreativa("facebook");
  ok(!!k.statusOd, "nova kreativa si zapomni, kdaj je nastala");
  ok(w.dniOd(k.statusOd) === 0, "in to je danes", String(w.dniOd(k.statusOd)));

  const prej = k.statusOd;
  ok(w.nastaviStatus(k, "brief") === true, "sprememba statusa se sprejme");
  ok(k.status === "brief", "status se postavi");
  ok(w.nastaviStatus(k, "brief") === false, "ista vrednost ni sprememba");
  ok(!!k.statusOd && k.statusOd >= prej, "in čas se osveži");

  ok(w.dniOd(null) === null && w.dniOd("ni datum") === null,
    "brez zapisanega časa se ne izmišljuje števila dni");

  /* zastoj velja samo za delo v teku */
  const dolgo = new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString();
  ok(w.jeZastoj({ status: "brief", statusOd: dolgo }) === true, "12 dni v „sestavi brief“ je zastoj");
  ok(w.jeZastoj({ status: "aktivna", statusOd: dolgo }) === false, "aktivna sme teči poljubno dolgo");
  ok(w.jeZastoj({ status: "ubita", statusOd: dolgo }) === false, "ubita tudi");
  ok(w.jeZastoj({ status: "brief" }) === false, "brez časa ni zastoja");

  /* rok je datum */
  ok(w.jeDatum("2026-08-12") && !w.jeDatum("do petka"), "datum se loči od besedila");
  const vceraj = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const jutri = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  ok(w.jeZamuda({ status: "brief", rok: vceraj }) === true, "včerajšnji rok pri delu v teku zamuja");
  ok(w.jeZamuda({ status: "brief", rok: jutri }) === false, "jutrišnji ne");
  ok(w.jeZamuda({ status: "aktivna", rok: vceraj }) === false, "kar že teče, ne zamuja");
  ok(w.jeZamuda({ status: "ubita", rok: vceraj }) === false, "ubita tudi ne");
  ok(w.jeZamuda({ status: "brief", rok: "do petka" }) === false, "besedilo ni rok, ki bi lahko zamujal");

  /* migracija: „do petka“ se preseli v opombo, nič se ne izgubi */
  const staro = JSON.parse(JSON.stringify(w.S));
  w.S.izdelki[0].kreative[0].rok = "do petka";
  w.S.izdelki[0].kreative[0].rokOpomba = "";
  w.migriraj();
  const m = w.S.izdelki[0].kreative[0];
  ok(m.rok === "", "besedilni rok se umakne iz polja za datum", JSON.stringify(m.rok));
  ok(m.rokOpomba.indexOf("do petka") >= 0, "in se ohrani kot opomba", m.rokOpomba);
  w.S = staro; w.migriraj();
}

console.log("\n== blokade ==");
{
  const d = w.document;
  const staroStanje = JSON.parse(JSON.stringify(w.S));
  const p = w.P();
  const k = p.kreative[0];
  k.blokada = "ni znano, ali je cena na m² ali na paket";
  ok(w.jeBlokirana(k) === true, "kreativa z zapisano blokado je blokirana");
  ok(w.jeBlokirana({ blokada: "   " }) === false, "sami presledki niso blokada");
  ok(w.jeBlokirana(p.kreative[1] || {}) === false, "ostale niso");
  ok(w.blokade(p.kreative).length === 1, "seznam blokad ima eno", String(w.blokade(p.kreative).length));

  w.view = "pregled"; w.render();
  const kre = d.getElementById("pr-kre");
  ok(kre.querySelector(".blok-s") !== null, "Pregled pokaže blokade");
  ok(kre.querySelector(".blok-o").textContent.indexOf("na m²") >= 0,
    "z razlogom, ne le s številko", kre.querySelector(".blok-o").textContent);
  const vrstica = kre.querySelector(".blok-v");
  ok(vrstica.dataset.open === k.id, "klik pelje na pravo kreativo");
  ok(kre.querySelector(".blok-s").compareDocumentPosition(kre.querySelector(".nap-b"))
      & w.Node.DOCUMENT_POSITION_FOLLOWING,
    "in stoji pred trakom napredka — to je prvo, kar mora človek videti");

  /* blokada gre tudi v brief, da izvajalec ve, da nekaj še ni znano */
  ok(w.briefText(k).indexOf("ČAKA NA:") >= 0, "blokada gre v brief");
  ok(w.briefText(k).indexOf("na m²") >= 0, "z razlogom vred");

  /* števec na kartici mape */
  w.view = "projekti"; w.render();
  const mapa = d.querySelector("#v-projekti .block");
  ok(mapa.textContent.indexOf("1 blokirana") >= 0, "kartica mape šteje blokirane",
    mapa.querySelector("header").textContent.replace(/\s+/g, " ").trim());

  w.S = staroStanje; w.migriraj(); w.view = "projekti"; w.render();
}

console.log("\n== iskanje po vseh mapah ==");
{
  const d = w.document;
  const staroStanje = JSON.parse(JSON.stringify(w.S));
  /* kreativa v DRUGI mapi, da se vidi, da iskanje ne gleda le odprtega izdelka */
  const pr = w.novProjekt("Daljna mapa");
  w.S.projekti.push(pr);
  const izd = w.novIzdelek("Daljni izdelek", pr.id);
  const k = w.novaKreativa("facebook");
  k.naslov = "Daljna kreativa";
  k.hooki = ["posebna beseda zlatorog"];
  izd.kreative.push(k);
  w.S.izdelki.push(izd);

  ok(w.najdiPoBesedilu("z").length === 0, "en znak še ne išče");
  const zadetki = w.najdiPoBesedilu("zlatorog");
  ok(zadetki.length === 1, "najde kreativo v drugi mapi", String(zadetki.length));
  ok(zadetki[0].kreativa.id === k.id, "in to pravo");
  ok(zadetki[0].odlomek.indexOf("zlatorog") >= 0, "z odlomkom, ki pove, zakaj je zadetek",
    zadetki[0].odlomek);
  ok(w.najdiPoBesedilu("DALJNA KREATIVA").length === 1, "iskanje ne loči velikih in malih črk");
  ok(w.najdiPoBesedilu("česar ni nikjer").length === 0, "brez zadetkov vrne prazno");

  /* išče tudi po besedilih pod stikalom */
  k.variante = { "Hrvaška": { hooki: ["hrvaska posebnost"], naslovi: [], primarna: [], opisi: [] } };
  ok(w.najdiPoBesedilu("hrvaska posebnost").length === 1, "in po različicah pod stikali");

  /* polje in klik na zadetek */
  w.S.aktivenProjekt = w.S.projekti[0].id;
  w.S.aktiven = null; w.odprtaKreativa = null;
  w.view = "kreative"; w.render();
  const polje = d.getElementById("kre-isk");
  ok(!!polje, "polje za iskanje je v pogledu Kreative");
  polje.value = "zlatorog";
  polje.dispatchEvent(new w.Event("input", { bubbles: true }));
  const zadetek = d.querySelector(".najd-v");
  ok(!!zadetek, "zadetek se izpiše");
  if (zadetek) {
    zadetek.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(w.odprtaKreativa === k.id, "klik odpre kreativo", String(w.odprtaKreativa));
    ok(w.S.aktivenProjekt === pr.id && w.S.aktiven === izd.id,
      "in preklopi na njeno mapo in izdelek");
  }
  w.iskanjeKre = "";
  w.S = staroStanje; w.migriraj(); w.odprtaKreativa = null; w.view = "projekti"; w.render();
}

console.log("\n== oznaka po trku in dostopnost ==");
{
  const d = w.document;
  /* zlivanje označi kreativo, ki je dobila tuja besedila */
  const stanje = (cas, hooki) => ({
    v: 6, spremenjeno: cas, projekti: [{ id: "pr1", ime: "Mapa" }],
    izdelki: [{ id: "i1", projekt: "pr1", ime: "Izdelek", kreative: [
      { id: "k1", naslov: "K", platforma: "facebook", hooki: hooki, naslovi: ["n"], primarna: ["p"], opisi: [""] },
    ] }],
    stikala: [], banka: [], datoteke: [],
  });
  const r = w.zlijStanje(stanje("2026-08-05T10:00:00.000Z", ["moj"]),
    stanje("2026-08-05T11:00:00.000Z", ["kolegov"]));
  ok(!!r.stanje.izdelki[0].kreative[0].zlitoOb, "kreativa po trku nosi oznako");
  const brezTrka = w.zlijStanje(stanje("2026-08-05T10:00:00.000Z", ["isti"]),
    stanje("2026-08-05T11:00:00.000Z", ["isti"]));
  ok(!brezTrka.stanje.izdelki[0].kreative[0].zlitoOb, "brez trka oznake ni");

  /* oznaka v urejevalniku in gumb, ki jo pobriše */
  const staroStanje = JSON.parse(JSON.stringify(w.S));
  const kk = w.P().kreative[0];
  kk.zlitoOb = new Date().toISOString();
  w.odprtaKreativa = kk.id; w.view = "kreative"; w.render();
  ok(d.querySelector(".opoz") !== null, "urejevalnik pove, da so prišla nova besedila");
  const potrdi = d.getElementById("zlito-ok");
  ok(!!potrdi, "in ponudi gumb, da oznako umakneš");
  if (potrdi) {
    potrdi.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(!w.K().zlitoOb, "klik pobriše oznako");
    ok(d.querySelector(".opoz") === null, "in opozorilo izgine");
  }
  w.S = staroStanje; w.migriraj(); w.odprtaKreativa = null;

  /* dostopnost zavihkov */
  w.view = "pregled"; w.render();
  const zavihki = qaT(d, ".tab");
  ok(zavihki.every((t) => d.getElementById(t.getAttribute("aria-controls")) !== null),
    "vsak zavihek kaže na obstoječ razdelek");
  ok(qaT(d, ".view").every((s) => s.getAttribute("role") === "tabpanel"
      && d.getElementById(s.getAttribute("aria-labelledby")) !== null),
    "vsak razdelek je tabpanel in kaže nazaj na svoj zavihek");
  ok(zavihki.filter((t) => t.tabIndex === 0).length === 1,
    "s tabulatorjem se v seznam zavihkov vstopi enkrat",
    String(zavihki.filter((t) => t.tabIndex === 0).length));
  ok(d.getElementById("tab-pregled").tabIndex === 0, "in to na izbranem zavihku");
  ok(d.getElementById("tab-pregled").getAttribute("aria-selected") === "true", "ki je označen kot izbran");

  /* puščica premakne na naslednji zavihek */
  d.getElementById("tab-pregled").dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  ok(w.view === "kreative", "puščica navzdol gre na naslednji zavihek", w.view);
  d.getElementById("tab-kreative").dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "Home", bubbles: true }));
  ok(w.view === "projekti", "Home skoči na prvega", w.view);

  /* Alt + številka */
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "4", altKey: true, bubbles: true }));
  ok(w.view === "kalkulator", "Alt+4 odpre Kalkulator", w.view);
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "1", altKey: true, bubbles: true }));
  ok(w.view === "projekti", "Alt+1 odpre Projekte", w.view);
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "f", altKey: true, bubbles: true }));
  ok(w.view === "kreative" && d.activeElement && d.activeElement.id === "kre-isk",
    "Alt+F skoči v iskanje", w.view + " / " + (d.activeElement && d.activeElement.id));

  w.view = "projekti"; w.render();
}

console.log("\n== izdelek se da preimenovati in izbrisati ==");
{
  const d = w.document;
  w.view = "pregled"; w.render();
  const glava = d.querySelector("#v-pregled .head");
  ok(glava.querySelector("[data-prename]") !== null, "Pregled ima gumb Preimenuj");
  ok(glava.querySelector("[data-pdel]") !== null, "in gumb V koš");
  ok(glava.querySelector("[data-pdel]").dataset.pdel === w.P().id,
    "ki kaže na odprt izdelek");
  w.view = "projekti"; w.render();
}

console.log("\n== testi tečejo tudi v CI ==");
{
  const pot = path.join(REPO, ".github/workflows/test.yml");
  ok(fs.existsSync(pot), "workflow za GitHub Actions obstaja");
  const y = fs.existsSync(pot) ? fs.readFileSync(pot, "utf8") : "";
  ok(/on:[\s\S]*push:/.test(y), "teče ob pushu");
  ok(y.indexOf("npm test") >= 0, "in požene npm test");
  ok(y.indexOf("npm ci") >= 0, "z natančno nameščenimi odvisnostmi");
}

console.log("\n== razdelilnik dogodkov (pravi kliki) ==");
{
  const d = w.document;
  const staraMapa = w.S.aktivenProjekt, starIzdelek = w.S.aktiven;
  const klikni = (sel, ime, vGlobino) => {
    let g = d.querySelector(sel);
    if (!g) { ok(false, ime, "elementa " + sel + " ni v izrisu"); return null; }
    if (vGlobino && g.firstElementChild) g = g.firstElementChild;
    g.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
    return g;
  };

  const nova = w.novProjekt("Mapa za klik");
  w.S.projekti.push(nova);
  w.S.aktivenProjekt = w.S.projekti[0].id;
  w.view = "projekti"; w.render();

  klikni('[data-prpick="' + nova.id + '"]', "gumb Izberi");
  ok(w.S.aktivenProjekt === nova.id, "klik na „Izberi“ preklopi mapo");

  const prejIzdelkov = w.S.izdelki.length;
  w.view = "projekti"; w.render();
  klikni('[data-addi="' + nova.id + '"]', "gumb + Izdelek");
  ok(w.S.izdelki.length === prejIzdelkov + 1, "klik na „+ Izdelek“ doda izdelek",
    w.S.izdelki.length + " namesto " + (prejIzdelkov + 1));
  ok(w.view === "pregled", "in odpre Pregled novega izdelka", w.view);

  /* klik na kartico izdelka pelje na kreative */
  w.view = "projekti"; w.render();
  const kartica = d.querySelector("[data-pick]");
  ok(!!kartica, "kartica izdelka ima data-pick");
  if (kartica) {
    kartica.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(w.view === "kreative", "klik na izdelek pelje na Kreative", w.view);
  }

  /* nova kreativa iz pogleda Kreative — klik pade na otroka gumba, zato mora
     pravilo iskati po prednikih, ne samo po cilju */
  const izd = w.P();
  const prejKreativ = izd ? izd.kreative.length : 0;
  w.view = "kreative"; w.odprtaKreativa = null; w.render();
  klikni("[data-add]", "gumb za novo kreativo", true);
  ok(izd && izd.kreative.length === prejKreativ + 1,
    "klik v notranjost gumba prime prek prednika",
    (izd ? izd.kreative.length : "?") + " namesto " + (prejKreativ + 1));
  ok(!!w.odprtaKreativa, "in nova kreativa se odpre");

  /* dodaj in odstrani različico besedila prek gumbov */
  w.render();
  const kk = w.K();
  const prejHookov = (kk.hooki || []).length;
  klikni('[data-vadd="hooki"]', "gumb + različica");
  ok(w.K().hooki.length === prejHookov + 1, "klik doda različico hooka",
    w.K().hooki.length + " namesto " + (prejHookov + 1));
  w.render();
  klikni('[data-vdel="hooki.' + (w.K().hooki.length - 1) + '"]', "gumb ✕ pri različici");
  ok(w.K().hooki.length === prejHookov, "in klik na ✕ jo odstrani", String(w.K().hooki.length));

  /* gumb, ki ga poznamo po id-ju */
  w.render();
  klikni("#back", "gumb Nazaj");
  ok(w.odprtaKreativa === null, "klik na „Nazaj“ zapre kreativo");

  /* klik v prazno ne sme ničesar sprožiti ne vreči napake */
  const prejStanje = JSON.stringify(w.S);
  d.body.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  ok(JSON.stringify(w.S) === prejStanje, "klik v prazno ne spremeni ničesar");

  /* pisanje po polju gre skozi tabelo VNOS */
  w.view = "kalkulator"; w.render();
  const polje = d.querySelector('[data-k="budget"]');
  ok(!!polje, "polje kalkulatorja ima data-k");
  if (polje) {
    polje.value = "1.234,56";
    polje.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok(w.S.kalk.budget === "1.234,56", "vnos se zapiše v stanje", w.S.kalk.budget);
    ok(Math.abs(w.n(w.S.kalk.budget) - 1234.56) < 1e-9,
      "in se prebere kot 1234,56, ne kot 1,23", String(w.n(w.S.kalk.budget)));
  }

  w.S.aktivenProjekt = staraMapa; w.S.aktiven = starIzdelek;
  w.odprtaKreativa = null; w.view = "projekti"; w.render();
}

/* material izdelka: naloži sliko na izdelek in preveri, da jo kreativa brez
   svojega materiala prevzame v predogled */
const slika = new w.Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
slika.name = "vinil.png";
Promise.resolve()
  .then(() => w.Datoteke.dodaj(w.datLastnikIzdelka(pi), slika))
  .then(() => w.Datoteke.zaKreativo(w.datLastnikIzdelka(pi)))
  .then((sez) => {
    ok(sez.length === 1, "material je shranjen na izdelku", sez.length + " datotek");
    w.view = "pregled";
    w.render();
    return new Promise((r) => setTimeout(r, 60));
  })
  .then(() => {
    ok(w.document.getElementById("datoteke-izd").innerHTML.indexOf("vinil.png") >= 0,
      "material izdelka je izrisan");
    w.odprtaKreativa = pi.kreative[0].id;
    w.view = "kreative";
    w.renderEditor();
    w.osveziPredVizual();
    return new Promise((r) => setTimeout(r, 60));
  })
  .then(() => {
    ok(w.predVizual && w.predVizual.izdelkov === true,
      "kreativa brez svojega materiala vzame sliko izdelka");

    console.log("\n== logo je na mapi, ne na izdelku ==");
    const prLogo = w.PR();
    ok(w.datLastnikLogo(prLogo) === "cgp:" + prLogo.id, "logo visi na celostni podobi mape");
    const logo = new w.Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
    logo.name = "logo.png";
    return w.Datoteke.dodaj(w.datLastnikLogo(prLogo), logo)
      .then(() => {
        w.view = "projekti";
        w.render();
        return new Promise((r) => setTimeout(r, 80));
      })
      .then(() => {
        const box = w.document.getElementById("datoteke-cgp-" + prLogo.id);
        ok(!!box, "polje za CGP datoteke obstaja");
        ok(box.innerHTML.indexOf("logo.png") >= 0, "naložen logo se vidi",
          box.innerHTML.slice(0, 80));
        w.osveziLogo();
        return new Promise((r) => setTimeout(r, 80));
      })
      .then(() => {
        ok(!!w.predLogo, "predogled oglasa vzame logo iz mape");
        ok(!w.document.getElementById("dfile-logo"), "polja za logo na izdelku ni več");
        return w.Datoteke.brisiZaKreativo(w.datLastnikLogo(prLogo));
      });
  })
  .then(() => {

    console.log("\n== kazalo datotek in oblak ==");
    const kaz = w.Datoteke.kazalo();
    ok(kaz.length === 1 && kaz[0].ime === "vinil.png", "datoteka je v kazalu, ki se sinhronizira",
      kaz.length + " zapisov");
    ok(kaz[0].blob === undefined, "kazalo ne nosi bajtov — v JSON gre samo opis");
    /* zapis brez lokalnih bajtov mora pripeljati datoteko iz oblaka */
    const izOblaka = { id: "dat-oblak", kreativa: w.datLastnikIzdelka(pi), ime: "hr-vizual.png",
      tip: "image/png", velikost: 8, dodano: new Date(0).toISOString(), zap: 1 };
    kaz.push(izOblaka);
    let prosil = null;
    w.Oblak.prenesiDat = (z) => {
      prosil = z.id;
      return Promise.resolve(new w.Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }));
    };
    return w.Datoteke.zaKreativo(w.datLastnikIzdelka(pi))
      .then((sez) => {
        ok(sez.length === 2, "seznam pokaže tudi datoteko, ki je samo v oblaku", sez.length + "");
        ok(sez.some((x) => x.id === "dat-oblak" && !x.blob && x.vOblaku),
          "ta datoteka je označena kot še neprenesena");
        return w.Datoteke.zagotovi("dat-oblak");
      })
      .then((z) => {
        ok(prosil === "dat-oblak", "prenos je zahteval pravo datoteko", String(prosil));
        ok(!!(z && z.blob), "po prenosu ima zapis bajte");
        return w.Datoteke.zaKreativo(w.datLastnikIzdelka(pi));
      })
      .then((sez) => {
        ok(sez.filter((x) => x.id === "dat-oblak")[0].blob != null,
          "prenesena datoteka je zdaj shranjena v napravi");
        /* Datoteka, ki je v kazalu, a je v oblaku ni: izris jo sme poskusiti
           natanko enkrat. Prej je vrtel v neskoncnost in slike se niso
           pokazale nikoli.                                                  */
        const nikjer = { id: "dat-ni", kreativa: w.datLastnikIzdelka(pi), ime: "manjka.png",
          tip: "image/png", velikost: 4, dodano: new Date(0).toISOString(), zap: 2 };
        w.Datoteke.kazalo().push(nikjer);
        let poskusov = 0;
        w.Oblak.prenesiDat = () => { poskusov++; return Promise.resolve(null); };
        w.view = "pregled";
        w.render();
        return new Promise((r) => setTimeout(r, 260)).then(() => {
          ok(poskusov === 1, "prenos, ki ne uspe, se poskusi enkrat in ne v zanki",
            poskusov + " poskusov");
          const html = w.document.getElementById("datoteke-izd").innerHTML;
          ok(html.indexOf("ni v tej napravi") >= 0, "in datoteka je označena, da je ni tu");
          ok(html.indexOf("data-retry") >= 0, "z gumbom za ponovni poskus");
          w.Datoteke.kazalo().splice(w.Datoteke.kazalo().indexOf(nikjer), 1);
        });
      })
      .then(() => {
        /* kar se ni naložilo, mora čakati v vrsti za oblak */
        const kaz2 = w.Datoteke.kazalo();
        ok(kaz2.length > 0 && w.Datoteke.zaOblak().length === kaz2.filter((x) => !x.oblak).length,
          "datoteke brez potrditve čakajo na oblak", w.Datoteke.zaOblak().length + " v vrsti");
        w.Datoteke.oznaciVOblaku(kaz2[0].id);
        ok(kaz2[0].oblak === true, "po uspešnem nalaganju je datoteka označena kot v oblaku");

        /* brisanje mora pobrisati tudi iz kazala in iz oblaka */
        let brisano = null;
        w.Oblak.brisiDat = (z) => { brisano = z.id; return Promise.resolve(); };
        return w.Datoteke.brisi("dat-oblak").then(() => {
          ok(brisano === "dat-oblak", "brisanje gre tudi v oblak", String(brisano));
          ok(!w.Datoteke.kazalo().some((x) => x.id === "dat-oblak"), "in iz kazala");
        });
      });
  })
  .then(() => {
    return w.brisiDatotekeIzdelka(pi);
  })
  .then(() => w.Datoteke.zaKreativo(w.datLastnikIzdelka(pi)))
  .then((sez) => {
    ok(sez.length === 0, "brisanje izdelka pobriše tudi njegov material", sez.length + " ostalo");
  })
  .catch((err) => ok(false, "material izdelka", err && err.message))
  .then(() => {
    console.log("\n== uvoz: dodaj proti zamenjaj ==");
    const prejIzd = w.S.izdelki.length, prejMap = w.S.projekti.length;
    const paket = {
      v: 4,
      projekti: [{ id: "pr-uvoz", ime: "TESTNA MAPA" }],
      izdelki: [{
        id: "izd-uvoz", projekt: "pr-uvoz", ime: "Uvožen izdelek", zapiski: "iz datoteke",
        kreative: [{ id: "kr-uvoz", naslov: "Uvožena kreativa", platforma: "facebook" }],
      }],
    };
    w.uvozi(JSON.stringify(paket), "dodaj");
    ok(w.S.izdelki.length === prejIzd + 1, "dodaj doda izdelek", w.S.izdelki.length + " (prej " + prejIzd + ")");
    ok(w.S.projekti.length === prejMap + 1, "dodaj doda novo mapo");
    const uvozen = w.S.izdelki.filter((x) => x.ime === "Uvožen izdelek")[0];
    ok(!!uvozen, "uvožen izdelek je tu");
    ok(uvozen.id !== "izd-uvoz", "uvožen izdelek dobi svoj id");
    ok(uvozen.kreative[0].id !== "kr-uvoz", "uvožena kreativa dobi svoj id");
    ok(uvozen.zapiski === "iz datoteke", "zapiski se prenesejo");
    ok(w.S.izdelki.filter((x) => x.ime.indexOf("Vinil") === 0 || x.kreative.length >= 2).length > 0,
      "obstoječi izdelki ostanejo");

    /* isti paket še enkrat: mapa se ponovno uporabi, izdelek dobi pripis */
    w.uvozi(JSON.stringify(paket), "dodaj");
    ok(w.S.projekti.length === prejMap + 1, "druga ponovitev ne naredi nove mape");
    ok(w.S.izdelki.filter((x) => x.ime === "Uvožen izdelek (uvoženo)").length === 1,
      "podvojeno ime dobi pripis");
    ok(w.S.izdelki.length === prejIzd + 2, "druga ponovitev nič ne povozi");

    /* paket s svojim stikalom: definicija pride z njim, vrednosti se prevežejo */
    const sPaket = {
      v: 5,
      stikala: [{ id: "tuj-gid", ime: "Trg", moznosti: ["Slovenija", "Hrvaška"] }],
      projekti: [{ id: "pr-s", ime: "MAPA S STIKALOM" }],
      izdelki: [{
        id: "izd-s", projekt: "pr-s", ime: "Izdelek s stikalom", stikala: { "tuj-gid": "Hrvaška" },
        kreative: [{ id: "kr-s", naslov: "HR kreativa", platforma: "facebook",
          stikala: { "tuj-gid": "Hrvaška" }, vodi: "tuj-gid" }],
      }],
    };
    w.uvozi(JSON.stringify(sPaket), "dodaj");
    const gTrg = w.stikala().filter((g) => g.ime === "Trg")[0];
    ok(!!gTrg, "stikalo iz paketa je dodano");
    ok(gTrg && gTrg.id !== "tuj-gid", "stikalo dobi svoj id");
    const izdS = w.S.izdelki.filter((x) => x.ime === "Izdelek s stikalom")[0];
    ok(izdS && izdS.stikala[gTrg.id] === "Hrvaška", "vrednost na izdelku je prevezana na nov id");
    ok(izdS && izdS.kreative[0].stikala[gTrg.id] === "Hrvaška", "vrednost na kreativi je prevezana");
    ok(izdS && izdS.kreative[0].vodi === gTrg.id, "vodenje je prevezano na nov id");
    /* isti paket dvakrat: stikalo se ne podvoji */
    w.uvozi(JSON.stringify(sPaket), "dodaj");
    ok(w.stikala().filter((g) => g.ime === "Trg").length === 1, "stikalo z istim imenom se ne podvoji");
    /* paket, ki prinese novo možnost istega stikala */
    const sPaket2 = JSON.parse(JSON.stringify(sPaket));
    sPaket2.stikala[0].moznosti = ["Slovenija", "Slovaška"];
    w.uvozi(JSON.stringify(sPaket2), "dodaj");
    ok(w.stikala().filter((g) => g.ime === "Trg")[0].moznosti.indexOf("Slovaška") >= 0,
      "manjkajoča možnost se doda k obstoječemu stikalu");
    w.S.stikala = [];
    w.migriraj();

    /* pripravljena mapa s streznika */
    let klicanUrl = null;
    w.fetch = (url) => {
      klicanUrl = url;
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(paket)) });
    };
    const prejPredNalozi = w.S.izdelki.length;
    return w.naloziPripravljeno === undefined
      ? Promise.resolve()
      : Promise.resolve(w.naloziPripravljeno())
        .then(() => new Promise((r) => setTimeout(r, 60)))
        .then(() => {
          ok(klicanUrl === "mape/eureka.json", "pripravljena mapa se bere z prave poti", String(klicanUrl));
          ok(w.S.izdelki.length === prejPredNalozi + 1, "pripravljena mapa se doda, nič se ne povozi",
            w.S.izdelki.length + " (prej " + prejPredNalozi + ")");
          /* uvoz mora skociti na uvozeno mapo, drugace izgleda, da se ni nic zgodilo.
             Paket ima en izdelek, zato je cilj skoka nazadnje dodani.            */
          const skok = w.S.izdelki[w.S.izdelki.length - 1];
          ok(w.S.aktiven === skok.id && w.S.aktivenProjekt === skok.projekt,
            "uvoz preklopi na uvoženo mapo in izdelek");
          ok(w.view === "kreative", "uvoz odpre pogled Kreative", w.view);
          ok(Object.keys(w.S.stikaloPogled || {}).length === 0,
            "uvoz sprosti filter stikal, da uvoženo ni skrito");
          /* neuspeh ne sme podrti pogleda niti pustiti gumba onemogočenega */
          w.fetch = () => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("") });
          w.naloziPripravljeno();
          return new Promise((r) => setTimeout(r, 60));
        })
        .then(() => {
          ok(w.S.izdelki.length === prejPredNalozi + 1, "neuspešno nalaganje ničesar ne spremeni");
          const b = w.document.getElementById("impUrl");
          ok(!b || !b.disabled, "gumb se po neuspehu spet omogoči");
        });
  })
  .then(() => {
    const paket = {
      v: 4,
      projekti: [{ id: "pr-uvoz", ime: "TESTNA MAPA" }],
      izdelki: [{
        id: "izd-uvoz", projekt: "pr-uvoz", ime: "Uvožen izdelek", zapiski: "iz datoteke",
        kreative: [{ id: "kr-uvoz", naslov: "Uvožena kreativa", platforma: "facebook" }],
      }],
    };
    const vz = w.document.getElementById("verzija");
    ok(vz.textContent.indexOf(String(w.RAZLICICA_ST)) >= 0,
      "oznaka različice pokaže številko iz verzija.js", vz.textContent);
    ok(vz.title === w.RAZLICICA, "celoten opis ostane v namigu ob miški", vz.title);

    /* stanje oblaka v stranski vrstici */
    w.osveziSideOblak();
    ok(w.document.getElementById("sideOblakN").textContent.length > 0,
      "stanje oblaka je v stranski vrstici", w.document.getElementById("sideOblakN").textContent);
    ok(w.document.getElementById("sideOblak").title.indexOf("ekipe") >= 0,
      "in pove, da je račun skupen za ekipo");

    /* zamenjaj pobrise vse (w.confirm vraca true) */
    w.uvozi(JSON.stringify(paket), "zamenjaj");
    ok(w.S.izdelki.length === 1 && w.S.projekti.length === 1, "zamenjaj postavi samo vsebino datoteke",
      w.S.izdelki.length + " izdelkov, " + w.S.projekti.length + " map");
    ok(w.S.v === 6, "po zamenjavi je stanje migrirano");
  })
  .catch((err) => ok(false, "uvoz", err && err.message))
  .then(() => {
    console.log("\n" + (napake.length ? "NAPAKE (" + napake.length + "):\n - " + napake.join("\n - ") : "VSE V REDU"));
    process.exit(napake.length ? 1 : 0);
  });
