/* Dimni test: naloži app.js v jsdom in preveri vse umestitve, izvoz in izdelek.
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
const html = fs.readFileSync(path.join(REPO, "index.html"), "utf8")
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
w.URL.createObjectURL = () => "blob:mock";
w.URL.revokeObjectURL = () => {};
w.HTMLMediaElement.prototype.play = () => Promise.resolve();
w.confirm = () => true;
w.prompt = () => "x";

const napake = [];
w.addEventListener("error", (e) => napake.push("window error: " + e.message));

/* app.js je zavit v IIFE, da ne onesnažuje window. Za test ovoj odvijemo, da
   postanejo njegove funkcije in stanje dosegljivi — koda sama ostane nedotaknjena. */
function odvij(src) {
  const zac = src.indexOf("(function(){");
  const kon = src.lastIndexOf("})();");
  if (zac < 0 || kon < 0) return src;
  return src.slice(0, zac) + src.slice(zac + "(function(){".length, kon) + src.slice(kon + "})();".length);
}
function naloziSkripto(ime) {
  const s = w.document.createElement("script");
  s.textContent = odvij(fs.readFileSync(path.join(REPO, ime), "utf8"));
  w.document.body.appendChild(s);
}
try { naloziSkripto("config.js"); } catch (e) { console.log("config.js THROW:", e.message); }
try { naloziSkripto("app.js"); } catch (e) { console.log("app.js THROW:", e.message, "\n", (e.stack || "").split("\n").slice(1, 4).join("\n")); }

const ok = (pogoj, ime, dodatno) => {
  if (pogoj) console.log("  OK   " + ime);
  else {
    console.log("  BAD  " + ime + (dodatno ? " → " + dodatno : ""));
    napake.push(ime);
  }
};

console.log("== osnovno ==");
ok(w.S && w.S.izdelki.length > 0, "stanje naloženo");
ok(w.S.v === 5, "migracija na v5", "v=" + (w.S && w.S.v));
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
ok(w.S.v === 5, "migracija na v5", "v=" + w.S.v);

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
    ok(w.document.getElementById("verzija").textContent.length > 5,
      "oznaka različice je izpisana", w.document.getElementById("verzija").textContent);

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
    ok(w.S.v === 5, "po zamenjavi je stanje migrirano");
  })
  .catch((err) => ok(false, "uvoz", err && err.message))
  .then(() => {
    console.log("\n" + (napake.length ? "NAPAKE (" + napake.length + "):\n - " + napake.join("\n - ") : "VSE V REDU"));
    process.exit(napake.length ? 1 : 0);
  });
