/* Offline delovanje: omrežje najprej, predpomnilnik kot rezerva. */
var CACHE="oglasni-list-v10";
var DATOTEKE=["./","index.html","styles.css","app.js","config.js","manifest.webmanifest","icon.svg"];

self.addEventListener("install",function(ev){
  ev.waitUntil(
    caches.open(CACHE).then(function(c){
      /* cache:"reload" obide HTTP predpomnilnik brskalnika — brez tega si v
         predpomnilnik lahko shranimo prav tisto staro kopijo, ki jo hočemo
         zamenjati, in aplikacija tedne kaze staro razlicico.               */
      return c.addAll(DATOTEKE.map(function(u){return new Request(u,{cache:"reload"});}));
    })
      .catch(function(){})
      .then(function(){return self.skipWaiting();})
  );
});

self.addEventListener("activate",function(ev){
  ev.waitUntil(
    caches.keys().then(function(k){
      return Promise.all(k.filter(function(x){return x!==CACHE;}).map(function(x){return caches.delete(x);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener("fetch",function(ev){
  if(ev.request.method!=="GET")return;
  var u;
  try{u=new URL(ev.request.url);}catch(err){return;}
  if(u.origin!==self.location.origin)return;   /* Supabase in CDN gredo mimo predpomnilnika */
  ev.respondWith(
    /* Vedno vprasaj streznik in ne dovoli HTTP predpomnilniku, da odgovori
       namesto njega. Ce ni povezave, gremo v spodnji catch na kopijo.      */
    fetch(ev.request.url,{cache:"no-store",credentials:"same-origin"}).then(function(res){
      if(res&&res.ok){
        var kopija=res.clone();
        caches.open(CACHE).then(function(c){c.put(ev.request,kopija);}).catch(function(){});
      }
      return res;
    }).catch(function(){
      return caches.match(ev.request).then(function(r){
        if(r)return r;
        if(ev.request.mode==="navigate")return caches.match("index.html");
        return new Response("Ni povezave.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      });
    })
  );
});
