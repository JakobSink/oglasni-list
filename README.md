# Oglasni list

Delovni prostor za pisanje oglasnih kreativ (Facebook, Instagram, Google, TikTok), načrtovanje budgeta in izračun tega, kaj od naročila sploh ostane.

Odpre se v brskalniku na telefonu ali računalniku, brez namestitve. Deluje tudi brez interneta.

## Kaj zna

**Mape → izdelki → kreative.** Mapa je stranka, znamka ali sezona. Izdelek nosi material, zapiske in — če ga vklopiš — ceno in stroške. Kreativa je en oglas.

**Material in zapiski na izdelku.** Slike, videi in vse, kar si ugotovil o izdelku, so na izdelku, ne na posamezni kreativi. Material je skupen vsem kreativam tega izdelka: če kreativa nima svoje slike, predogled vzame prvo sliko izdelka. Zapiski gredo v brief vsake kreative tega izdelka.

**Ekonomika izdelka — neobvezna.** Privzeto izklopljena; izdelek lahko uporabljaš samo za kreative. Ko jo vklopiš: cena, DDV, nabavna, dostava, embalaža, provizija plačila, vračila → marža na naročilo, **break-even CPA** (največ, kar smeš plačati za naročilo) in **break-even ROAS**. Zraven razrez enega naročila vrstico po vrstico in tabela scenarijev od 1 do 50 prodaj na dan.

**Umestitve, ne samo platforme.** Predogled in polja določi *umestitev* — tisto, kar v oglasnem računu izbereš pod „placements“. 15 umestitev: FB Feed / Reels / Zgodba / Marketplace, IG Feed / Reels / Zgodba / Razišči, Google Iskanje / Display / Performance Max, TikTok Za vas, YouTube In-stream / Shorts. Ista kreativa v feedu izgleda drugače kot v zgodbi in ne prikaže istih polj — v Marketplace se primarno besedilo ne vidi, v IG Feed se naslov ne vidi, in aplikacija ti to napiše pod poljem.

**Kreative.** Kot oglasa, publika, hook, besedilo s števci znakov (Facebook 125/40/30, Google RSA 30 × 5 in 90 × 3 z ločenimi polji, ključnimi besedami, prikazno potjo in sitelinki), design brief s checklistom, banka hookov, nalaganje slik in videov, budget.

**Izvoz v Excel.** Pravi `.xlsx`, brez knjižnic in brez interneta. Izbereš obseg (izdelek / mapa / vse) in oglase, dobiš tri liste: *Oglasi* (kaj se vidi in sliši, besedila, gumb, URL, pot, sitelinki, budget, CPA), *Različice besedil* (vse variante s številom znakov in oznako „nad mejo“) in *Povzetek*.

**Dva bloka številk na kreativo.** *Načrt*: vpišeš CPM, CTR, CVR → dobiš prikaze, klike, naročila, CPC, CPA, ROAS in profit. *Rezultati*: vpišeš dejansko porabo, prikaze, klike in naročila → dobiš izmerjene metrike. Aplikacija primerja dejanski CPA z break-even in ti pove, ali skalirati ali ustaviti.

**Kalkulator.** Hitri what-if, obrnjeni izračun (koliko budgeta za X prodaj na dan) in tabela občutljivosti, če se CPA premakne.

## Kje so podatki

Besedila, številke in struktura map so v `localStorage` brskalnika. Naložene slike in videi so v `IndexedDB` iste naprave. Nič ne gre nikamor drugam, dokler ne vklopiš oblaka.

V zavihku **Podatki** je izvoz in uvoz JSON — tako preneseš stanje na drugo napravo. Izvoz ne vsebuje naloženih slik in videov, ker so za JSON preveliki; te prenašaj posamično.

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
