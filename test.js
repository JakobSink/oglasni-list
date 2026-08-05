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
ok(w.S.v === 4, "migracija na v4", "v=" + (w.S && w.S.v));
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
  ok(t.indexOf("Sponzorirano") >= 0, "oznaka Sponzorirano");
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

    /* zamenjaj pobrise vse (w.confirm vraca true) */
    w.uvozi(JSON.stringify(paket), "zamenjaj");
    ok(w.S.izdelki.length === 1 && w.S.projekti.length === 1, "zamenjaj postavi samo vsebino datoteke",
      w.S.izdelki.length + " izdelkov, " + w.S.projekti.length + " map");
    ok(w.S.v === 4, "po zamenjavi je stanje migrirano");
  })
  .catch((err) => ok(false, "uvoz", err && err.message))
  .then(() => {
    console.log("\n" + (napake.length ? "NAPAKE (" + napake.length + "):\n - " + napake.join("\n - ") : "VSE V REDU"));
    process.exit(napake.length ? 1 : 0);
  });
