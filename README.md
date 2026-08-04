# Oglasni list

Delovni prostor za pisanje oglasnih kreativ (Facebook, Instagram, Google, TikTok), načrtovanje budgeta in izračun tega, kaj od naročila sploh ostane.

Odpre se v brskalniku na telefonu ali računalniku, brez namestitve. Deluje tudi brez interneta.

## Kaj zna

**Mape → izdelki → kreative.** Mapa je stranka, znamka ali sezona. Izdelek nosi ceno in stroške. Kreativa je en oglas.

**Ekonomika izdelka.** Cena, DDV, nabavna, dostava, embalaža, provizija plačila, vračila → marža na naročilo, **break-even CPA** (največ, kar smeš plačati za naročilo) in **break-even ROAS**. Zraven razrez enega naročila vrstico po vrstico in tabela scenarijev od 1 do 50 prodaj na dan.

**Kreative.** Kot oglasa, publika, hook, besedilo s števci znakov (Facebook 125/40/30, Google RSA 30 × 5 in 90 × 3 z ločenimi polji in ključnimi besedami), design brief s checklistom, banka hookov, nalaganje slik in videov, budget.

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
