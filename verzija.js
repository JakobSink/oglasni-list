/* Ena sama različica za vso aplikacijo.
   Ob objavi popraviš samo ti dve vrstici — nič drugje.

   Datoteko berejo trije:
     index.html  jo naloži pred app.js in od tam pride napis v stranski vrstici
     sw.js       jo potegne z importScripts in iz nje sestavi ime predpomnilnika
     app.js      z njo registrira service worker pod novim naslovom

   Zakaj to deluje kot sprožilec objave: brskalnik ob preverjanju posodobitve
   primerja tudi datoteke, ki jih service worker uvozi z importScripts. Ko se
   spremeni številka tukaj, se spremeni ta datoteka, s tem pa se za brskalnik
   spremeni tudi service worker — in nova koda gre v uporabo.               */
var RAZLICICA_ST = 24;
var RAZLICICA_OPIS = "izbira slike v predogledu, vsaka slika ima svoj hook";

var RAZLICICA = "različica " + RAZLICICA_ST + " · " + RAZLICICA_OPIS;
var CACHE_IME = "oglasni-list-v" + RAZLICICA_ST;
