# Oglasni list

Delovni prostor za pisanje oglasnih kreativ (Facebook, Instagram, Google, TikTok), načrtovanje budgeta in izračun tega, kaj od naročila sploh ostane.

Odpre se v brskalniku na telefonu ali računalniku, brez namestitve. Deluje tudi brez interneta.

## Kaj zna

**Mape → izdelki → kreative.** Mapa je stranka, znamka ali sezona. Izdelek nosi material, zapiske in — če ga vklopiš — ceno in stroške. Kreativa je en oglas.

**Material in zapiski na izdelku.** Slike, videi in vse, kar si ugotovil o izdelku, so na izdelku, ne na posamezni kreativi. Material je skupen vsem kreativam tega izdelka: če kreativa nima svoje slike, predogled vzame prvo sliko izdelka. Zapiski gredo v brief vsake kreative tega izdelka.

**Pet zavihkov.** *Projekti* (mape, izdelki, celostna podoba) → *Pregled* (kreative na vrhu, številke, podatki izdelka) → *Kreative* (pisanje oglasov) → *Kalkulator* (what-if in ekonomika izdelka) → *Podatki in vodnik* (izvoz, uvoz, oblak, stikala, razlage). Samostojnega zavihka Ekonomika ni — cena in stroški sodita h kalkulatorju, podatki izdelka pa k pregledu tega izdelka.

**Ekonomika izdelka — neobvezna.** Privzeto izklopljena; izdelek lahko uporabljaš samo za kreative. Vklopiš jo na izdelku v Pregledu, vpisuješ pa v Kalkulatorju: cena, DDV, nabavna, dostava, embalaža, provizija plačila, vračila → marža na naročilo, **break-even CPA** (največ, kar smeš plačati za naročilo) in **break-even ROAS**. Zraven razrez enega naročila vrstico po vrstico in tabela scenarijev od 1 do 50 prodaj na dan.

**Predogled v telefonu.** Vsak predogled je v okvirju iPhona, vmesnik platforme pa je v angleščini — *Sponsored*, *Like / Comment / Share*, *Shop now*, *For You* — ker je tak tudi v resnici. Tvoje besedilo ostane slovensko. Logo podjetja naložiš na izdelku in nadomesti začetnice v krogcu, tudi kot favikon v Googlu.

**Referenca na kreativi.** Povezave do primerov, ki si jih videl, posnetki zaslona in tvoj komentar, kaj bi prevzel in kaj naredil drugače. Ločeno od materiala — v oglas nikoli ne gre.

**Brief po korakih.** Vedno isti štirje: kaj se vidi in sliši, kaj izvajalec potrebuje, kdo dela do kdaj in kaj mora vrniti, opombe in popravki. Gumb *Kopiraj brief* da to v enem kosu.

**Banka hookov.** Svoje hooke vpisuješ sam, shranijo se sproti in jih razvrstiš po kategoriji (boleča točka, dokaz, cena, hitrost …). Klik na hook ga doda kot novo različico v odprti kreativi. Banka je skupna vsem mapam.

**Umestitve, ne samo platforme.** Predogled in polja določi *umestitev* — tisto, kar v oglasnem računu izbereš pod „placements“. 15 umestitev: FB Feed / Reels / Zgodba / Marketplace, IG Feed / Reels / Zgodba / Razišči, Google Iskanje / Display / Performance Max, TikTok Za vas, YouTube In-stream / Shorts. Ista kreativa v feedu izgleda drugače kot v zgodbi in ne prikaže istih polj — v Marketplace se primarno besedilo ne vidi, v IG Feed se naslov ne vidi, in aplikacija ti to napiše pod poljem.

**Kreative.** Kot oglasa, publika, hook, besedilo s števci znakov (Facebook 125/40/30, Google RSA 30 × 5 in 90 × 3 z ločenimi polji, ključnimi besedami, prikazno potjo in sitelinki), design brief s checklistom, banka hookov, nalaganje slik in videov, budget.

**Stikala, ki si jih določiš sam.** Stikalo je skupina možnosti — na primer *Trg: Slovenija / Hrvaška / Slovaška*, lahko pa tudi sezona, jezik ali stranka. Pojavi se na izdelku in na vsaki kreativi in dela dvoje:

- **Izbere nabor.** V seznamu kreativ s stikalom izbereš, katere oglase vidiš. Ko preklopiš na Hrvaško, so spredaj hrvaški oglasi — lahko so čisto druge kreative. Nova kreativa prevzame vrednost, ki je takrat izbrana.
- **Izbere besedilo.** Če kreativi rečeš, da jo neko stikalo *vodi*, ima vsaka možnost svoj hook, primarno besedilo, naslove, opise, gumb in URL. Preklop shrani, kar je vpisano, in naloži besedila druge možnosti — predogled, brief in izvoz delajo naprej, kot da gre za en oglas. Ob vklopu vsaka možnost dobi kopijo trenutnih besedil, da hrvaškega oglasa ne pišeš iz nič.

Stikala urejaš v zavihku **Podatki**. Če jih ne narediš, jih ni nikjer — nič v aplikaciji se ne spremeni.

**Izvoz v Excel.** Pravi `.xlsx`, brez knjižnic in brez interneta. Izbereš obseg (izdelek / mapa / vse) in oglase, dobiš tri liste. List *Oglasi* je obrnjen: v stolpcu A so imena polj (Kreativa, Ime kreative, Hook, Primarno besedilo, Naslov pod sliko, Opis, GUMB, URL, Publika in targetiranje …), vsak naslednji stolpec je en oglas — tako se kopije berejo drug ob drugem. Zraven sta *Različice besedil* (vse variante s številom znakov in oznako „nad mejo“) in *Povzetek*.

**Dva bloka številk na kreativo.** *Načrt*: vpišeš CPM, CTR, CVR → dobiš prikaze, klike, naročila, CPC, CPA, ROAS in profit. *Rezultati*: vpišeš dejansko porabo, prikaze, klike in naročila → dobiš izmerjene metrike. Aplikacija primerja dejanski CPA z break-even in ti pove, ali skalirati ali ustaviti.

**Kalkulator.** Hitri what-if, obrnjeni izračun (koliko budgeta za X prodaj na dan) in tabela občutljivosti, če se CPA premakne.

## Kje so podatki

Besedila, številke in struktura map so v `localStorage` brskalnika. Naložene slike in videi so v `IndexedDB` iste naprave. Nič ne gre nikamor drugam, dokler ne vklopiš oblaka.

V zavihku **Podatki** je izvoz in uvoz JSON — tako preneseš stanje na drugo napravo. Izvoz ne vsebuje naloženih slik in videov, ker so za JSON preveliki; te prenašaj posamično.

Uvoz je dvojen: **Uvozi in dodaj** mape, izdelke in stikala iz datoteke prilepi zraven obstoječim in ničesar ne povozi, **Uvozi in zamenjaj** pa vse nadomesti (prej vpraša). **Naloži pripravljeno mapo** vzame `mape/eureka.json`, ki je objavljena skupaj z aplikacijo, in jo doda — brez datoteke, kar je na telefonu edina znosna pot.

**Koš.** Brisanje mape, izdelka ali kreative ni dokončno: zapis gre za 30 dni v koš, naložene slike se ohranijo z njim. Takoj po brisanju ponudi obvestilo *Razveljavi*, pozneje ga vrneš v zavihku Podatki. Koš je skupen z ekipo — kar izbriše eden, lahko vrne drugi, in vrnitev prebije brisanje tudi pri kolegih, ki so ga že prevzeli. Dokončno gre zapis stran po 30 dneh ali z gumbom *Zavrzi*; takrat gredo z njim tudi datoteke.

Tudi **Uvozi in zamenjaj** gre skozi koš: pred zamenjavo se celotno stanje shrani kot en zapis, zato je mogoče razveljaviti tudi to. V aplikaciji tako ni več dejanja, ki bi ga ne dalo vzeti nazaj.

**Kje je delo.** Deset statusov se na karticah zloži v pet faz — *ideja, v delu, pripravljeno, v zraku, ustavljeno*. Vsaka mapa in vsak izdelek imata trak, ki v enem pogledu pove, koliko je odprtega in koliko že teče; v Pregledu ima vsaka vrstica še barvni rob svoje faze, stolpec **Že** pa pove, koliko dni kreativa stoji v isti fazi. Kar v delu obtiči več kot teden dni, se označi rdeče.

**Rok** je datum, zato zamuda ni stvar spomina — kreativa z rokom za nami dobi značko, mapa pa števec „N zamuja“. Kar je bilo prej vpisano z besedami („do petka“), migracija preseli v polje *Opomba k roku*.

**Blokade.** Oglas pogosto ne čaka na delo, ampak na odgovor: manjka podatek stranke, ni ciljne strani, ni odločitve. Polje **Kaj to blokira** je zato ločeno od statusa — kreativa je lahko hkrati „za pregled“ in blokirana. Blokade so na vrhu Pregleda, skupaj z razlogom in klikom naravnost na kreativo, štete na kartici mape in zapisane v briefu kot *ČAKA NA*.

**Iskanje.** Polje v pogledu Kreative išče po **vseh mapah**, ne le po odprtem izdelku — po naslovih, hookih, besedilih, kotu in publiki, tudi po različicah pod stikali. Zadetek pove, v kateri mapi in izdelku je, in ga klik odpre. Bližnjica `Alt` + `F`.

**Tipkovnica.** `Alt` + `1`…`5` preklopi zavihek, `Alt` + `F` skoči v iskanje. Po zavihkih se da hoditi tudi s puščicami, `Home` in `End`.

## Skupen delovni prostor (Supabase)

Zlivanje je po zapisih, pri kreativah pa po poljih: če v isto kreativo hkrati pišeta dva, se besedila ne prepišejo, ampak se tuja različica pridruži tvojim kot dodatna varianta. Enaka besedila se ne podvojijo. Status, budget in ostala enovita polja ostanejo pravilo novejše strani.

Sinhronizacija med napravami in ljudmi je vgrajena, potrebuje pa svoj Supabase projekt. Sinhronizirajo se **mape, izdelki, kreative, stikala, budgeti in tudi naložene slike ter videi** — besedila in številke gredo v tabelo `stanje`, datoteke pa v Storage vedro `material`. V sinhroniziranem stanju je samo *kazalo* datotek (ime, tip, velikost); bajti se prenesejo takrat, ko odpreš kreativo, kjer visijo, in ostanejo v napravi za naprej.

**Ekipa dela pod enim skupnim računom.** Kdor se prijavi z njim, vidi iste mape, kreative in slike — to je namen. Ločeni računi pomenijo ločene, prazne delovne prostore, ker so vrstice v `stanje` vezane na račun.

Postopek:

1. Naredi brezplačen projekt na [supabase.com](https://supabase.com).
2. V **SQL Editor** zaženi vsebino datoteke [`supabase.sql`](supabase.sql) iz tega repozitorija. Poganjanje več kot enkrat je varno — vsako pravilo se prej pobriše, zato ne dobiš napake `42710: policy already exists`. Za referenco je isti SQL tudi tu:

```sql
create table if not exists public.stanje (
  uporabnik   uuid primary key references auth.users(id) on delete cascade,
  podatki     jsonb not null default '{}'::jsonb,
  spremenjeno timestamptz not null default now()
);

alter table public.stanje enable row level security;

drop policy if exists "berem svoje"     on public.stanje;
drop policy if exists "vstavim svoje"   on public.stanje;
drop policy if exists "posodobim svoje" on public.stanje;

create policy "berem svoje"     on public.stanje for select using (auth.uid() = uporabnik);
create policy "vstavim svoje"   on public.stanje for insert with check (auth.uid() = uporabnik);
create policy "posodobim svoje" on public.stanje for update using (auth.uid() = uporabnik) with check (auth.uid() = uporabnik);

-- vedro za slike in videe kreativ
insert into storage.buckets (id, name, public)
values ('material', 'material', false)
on conflict (id) do nothing;

drop policy if exists "ekipa bere material"   on storage.objects;
drop policy if exists "ekipa nalaga material" on storage.objects;
drop policy if exists "ekipa menja material"  on storage.objects;
drop policy if exists "ekipa brise material"  on storage.objects;

create policy "ekipa bere material"   on storage.objects for select to authenticated using (bucket_id = 'material');
create policy "ekipa nalaga material" on storage.objects for insert to authenticated with check (bucket_id = 'material');
create policy "ekipa menja material"  on storage.objects for update to authenticated using (bucket_id = 'material');
create policy "ekipa brise material"  on storage.objects for delete to authenticated using (bucket_id = 'material');
```

Namestitev na telefon: Android / Chrome → meni ⋮ → *Dodaj na začetni zaslon*; iPhone / Safari → gumb za deljenje → *Dodaj na domači zaslon*.

3. V **Authentication → Sign In / Providers → Email** izklopi *Confirm email*, da se prijava zgodi takoj brez potrditvenega maila.
4. V **Project Settings → API** prekopiraj `Project URL` in ključ `anon public` ter ju vpiši v `config.js`. Oba sta javna podatka, namenjena brskalniku — dostop varujeta RLS in politike vedra iz 2. koraka.
5. Osveži stran, v zavihku Podatki se pojavi prijava. Ustvari **en** račun za ekipo in ga daj sodelavcem.
6. Ko so računi narejeni, v **Authentication → Sign In / Providers → Email** izklopi *Allow new users to sign up* — drugače si lahko kdorkoli z naslovom strani naredi račun v tvojem projektu.

Če si material nalagal, preden je bil oblak vklopljen, ga v zavihku Podatki pošlji gor z gumbom **Pošlji slike v oblak**. Nove datoteke gredo v oblak takoj ob nalaganju. Brezplačni Supabase da 1 GB shrambe — velikim videom to hitro poide, zato je zavihek Podatki tudi mesto, kjer piše, koliko datotek je v ekipi.

## Namestitev na telefon

Android / Chrome: meni ⋮ → *Dodaj na začetni zaslon*. iPhone / Safari: gumb za deljenje → *Dodaj na domači zaslon*.

## Lokalni zagon

Statične datoteke, brez gradnje. Dovolj je poljuben strežnik:

```
python -m http.server 8000
```

Nato odpri `http://localhost:8000`. (Odpiranje `index.html` neposredno prek `file://` deloma dela, a service worker in nekateri brskalniki tam nagajajo.)

## Kje je koda

Statične datoteke, brez gradnje. Koda je razdeljena po datotekah v `js/`, ki se nalagajo po vrsti iz `index.html` in si delijo isti prostor imen:

| datoteka | kaj je notri |
| --- | --- |
| `js/osnove.js` | pomožne funkcije, branje in izpis števil, platforme, umestitve, formati |
| `js/stanje.js` | stikala, tvorba zapisov, primer ob prvem zagonu, migracije, shranjevanje |
| `js/izracuni.js` | ekonomika izdelka, lijak, doseženi rezultati |
| `js/datoteke.js` | slike in videi v IndexedDB |
| `js/pogledi.js` | celostna podoba mape, pogled Projekti in Pregled |
| `js/kreative.js` | banka hookov, seznam kreativ, urejevalnik |
| `js/predogled.js` | kako oglas izgleda v posamezni umestitvi |
| `js/kalkulator.js` | pogled Kalkulator in vodnik |
| `js/oblak.js` | zlivanje dveh stanj in sinhronizacija s Supabase |
| `js/podatki.js` | pogled Podatki, uvoz/izvoz, urejanje stikal, brief |
| `js/excel.js` | izvoz v `.xlsx`, napisan na roko |
| `js/dogodki.js` | navigacija, tema, razdelilnik dogodkov |
| `js/zagon.js` | zagon in service worker — **nalaga se zadnja** |

Zraven sta še `verzija.js` (ena sama številka različice) in `vendor/supabase.js` (knjižnica Supabase, pripeta na točno različico — glej `vendor/README.md`).

Če dodaš novo datoteko, jo vpiši na dve mesti: v `index.html` in v seznam `DATOTEKE` v `sw.js`. Test to preveri sam.

## Objava

Push na `main`; GitHub Pages streže datoteke neposredno iz veje. Pred vsako objavo povečaj `RAZLICICA_ST` v `verzija.js` — od tam pride tako napis v stranski vrstici kot ime predpomnilnika service workerja in naslov, pod katerim se ta registrira. Drugje številke ni.

Ob vsakem pushu se v GitHub Actions požene `npm test` (`.github/workflows/test.yml`). Objave ne ustavi — Pages streže iz veje — pove pa takoj, če je kaj narobe. Če boš kdaj hotel, da pokvarjena koda sploh ne pride ven, preklopi Pages na objavo iz Actions in postavi ta korak pred objavo.

## Test

Dimni test naloži aplikacijo v jsdom in preveri vse kombinacije platforme × umestitve × formata, zlaganje besedila, polja po umestitvi, Google polja, izračune (marža, CPA, ROAS, profit, branje števil), zlivanje dveh stanj, izvoz v Excel ter material in zapiske na izdelku:

```
npm install
npm test
```

Aplikacija sama nima odvisnosti — `jsdom` in `fake-indexeddb` rabi samo test.
