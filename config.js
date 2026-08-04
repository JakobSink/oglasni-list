/* ------------------------------------------------------------------
   Nastavitve oblačnega shranjevanja.

   Sem prilepi podatke svojega Supabase projekta:
     Supabase → tvoj projekt → Project Settings → API
       - "Project URL"  →  url
       - "anon public"  →  anonKey     (to je javni ključ, namenjen brskalniku)

   Če pustiš prazno, aplikacija dela normalno, samo brez sinhronizacije
   med napravami — vse ostane shranjeno v tem brskalniku.
------------------------------------------------------------------ */
window.OGLASNI_CONFIG = {
  url: "",
  anonKey: ""
};
