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
w.view = "ekonomika";
w.renderEkon();
ok(!!w.document.getElementById("f-zapiski"), "polje za zapiske brez izračunov");
ok(!!w.document.getElementById("drop-izd"), "nalaganje materiala izdelka brez izračunov");
ok(w.document.getElementById("v-ekonomika").textContent.indexOf("Prodajna cena") < 0,
  "brez izračunov ni polj za ceno");
ok(!w.imaEkon(pi), "imaEkon() je false");
w.view = "pregled";
w.render();
ok(w.document.getElementById("v-pregled").textContent.indexOf("Izračuni za ta izdelek so izklopljeni") >= 0,
  "pregled pove, da so izračuni izklopljeni");
pi.izracuni = true;
w.view = "ekonomika";
w.renderEkon();
ok(w.document.getElementById("v-ekonomika").textContent.indexOf("Prodajna cena") >= 0,
  "z izračuni so polja za ceno");
ok(!!w.document.getElementById("f-zapiski"), "zapiski ostanejo tudi z izračuni");

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
    w.view = "ekonomika";
    w.renderEkon();
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
