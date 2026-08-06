# vendor/

Tuja koda, ki je namenoma v repozitoriju in ne na CDN.

## supabase.js

- **Različica:** `@supabase/supabase-js` 2.112.1 (UMD, `dist/umd/supabase.js`)
- **Vir:** https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.1/dist/umd/supabase.js
- **SHA-384:** `sha384-0x8XPoHt08aHZj+RHs8ojmhZ5IDsTLjPgblgWdriayWriqv9dic3Vkv1K2+UqgZV`

Zakaj je tu in ne na CDN: prej se je vlekla pod plavajočo oznako `@2`, kar
pomeni, da bi tuja objava lahko čez noč zlomila objavljeno aplikacijo — brez
build koraka in brez opozorila. Poleg tega brez interneta sinhronizacije sploh
ni bilo, ker service worker tujih domen ne predpomni.

CDN ostaja v `app.js` samo kot rezerva, pripet na isto različico in preverjen s
tem SHA-384.

### Kako posodobiš

```bash
V=2.113.0
curl -fL "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@$V/dist/umd/supabase.js" -o vendor/supabase.js
openssl dgst -sha384 -binary vendor/supabase.js | openssl base64 -A
```

Novo številko in nov hash vpiši v `app.js` (`SDK_CDN`, `SDK_SRI`) in sem, potem
zaženi `npm test` in povečaj različico v `verzija.js`.
