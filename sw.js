/* Walks & Renewals service worker: makes the app work offline.
   Bump V when you change this file. Page updates arrive on their own when online. */
const V="walks-v1";
const CORE=["./","./index.html","./manifest.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png"];
const FONT=/(^|\.)fonts\.(googleapis|gstatic)\.com$/;

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url),same=u.origin===location.origin;
  if(!same&&!FONT.test(u.hostname))return;
  if(r.mode==="navigate"){
    /* page: newest version when online (4s limit), cached copy when offline */
    e.respondWith((async()=>{
      const c=await caches.open(V);
      try{
        const res=await Promise.race([fetch(r),new Promise((_,no)=>setTimeout(no,4000))]);
        if(res&&res.ok)c.put(r,res.clone());
        return res;
      }catch{
        return (await c.match(r,{ignoreSearch:true}))||(await c.match("./index.html"))||(await c.match("./"))||Response.error();
      }
    })());
    return;
  }
  /* everything else: cached first, refreshed in the background */
  e.respondWith(caches.open(V).then(async c=>{
    const hit=await c.match(r);
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return (await net)||Response.error();
  }));
});
