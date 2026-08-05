# Oglasna miza

Delovni prostor za pisanje oglasnih kreativ (Facebook, Instagram, Google, TikTok), načrtovanje budgeta in izračun tega, kaj od naročila sploh ostane.

Odpre se v brskalniku na telefonu ali računalniku, brez namestitve. Deluje tudi brez interneta.

## Kaj zna

**Mape → izdelki → kreative.** Mapa je stranka, znamka ali sezona. Izdelek nosi material, zapiske in — če ga vklopiš — ceno in stroške. Kreativa je en oglas.

**Material in zapiski na izdelku.** Slike, videi in vse, kar si ugotovil o izdelku, so na izdelku, ne na posamezni kreativi. Material je skupen vsem kreativam tega izdelka: če kreativa nima svoje slike, predogled vzame prvo sliko izdelka. Zapiski gredo v brief vsake kreative tega izdelka.

**Ekonomika izdelka — neobvezna.** Privzeto izklopljena; izdelek lahko uporabljaš samo za kreative. Ko jo vklopiš: cena, DDV, nabavna, dostava, embalaža, provizija plačila, vračila → marža na naročilo, **break-even CPA** (največ, kar smeš plačati za naročilo) in **break-even ROAS**. Zraven razrez enega naročila vrstico po vrstico in tabela scenarijev od 1 do 50 prodaj na dan.

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

## Oblačno shranjevanje (neobvezno)

Sinhronizacija med napravami je vgrajena, potrebuje pa svoj Supabase projekt:

1. Naredi brezplačen projekt na [supabase.com](https://supabase.com).
2. V SQL Editor zaženi:

```sql
create table if not exists public.stanje (
  uporabnik   uuid primary key references auth.users(id) on delete cascade,
  podatki     jsonb not null default '{}'::jsonb,
  spremenjeno timestamptz not null default now()
);

alter table public.stanje enable row level security;

create policy "berem svoje"     on public.stanje for select using (auth.uid() = uporabnik);
create policy "vstavim svoje"   on public.stanje for insert with check (auth.uid() = uporabnik);
create policy "posodobim svoje" on public.stanje for update using (auth.uid() = uporabnik) with check (auth.uid() = uporabnik);
```

3. V **Authentication → Sign In / Providers → Email** izklopi *Confirm email*, da se prijava zgodi takoj brez potrditvenega maila.
4. V **Project Settings → API** prekopiraj `Project URL` in ključ `anon public` ter ju vpiši v `config.js`. Oba sta javna podatka, namenjena brskalniku — vrstice varuje RLS iz 2. koraka.
5. Osveži stran, v zavihku Podatki se pojavi prijava.

Naložene slike in videi ostanejo lokalni tudi ob vklopljenem oblaku.

## Namestitev na telefon

Android / Chrome: meni ⋮ → *Dodaj na začetni zaslon*. iPhone / Safari: gumb za deljenje → *Dodaj na domači zaslon*.

## Lokalni zagon

Statične datoteke, brez gradnje. Dovolj je poljuben strežnik:

```
python -m http.server 8000
```

Nato odpri `http://localhost:8000`. (Odpiranje `index.html` neposredno prek `file://` deloma dela, a service worker in nekateri brskalniki tam nagajajo.)

## Test

Dimni test naloži aplikacijo v jsdom in preveri vse kombinacije platforme × umestitve × formata, zlaganje besedila, polja po umestitvi, Google polja, izvoz v Excel ter material in zapiske na izdelku:

```
npm install
npm test
```

Aplikacija sama nima odvisnosti — `jsdom` in `fake-indexeddb` rabi samo test.
