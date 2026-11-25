/* عامل الخدمة: يجعل المنصة تعمل دون إنترنت بعد أول تحميل.
   غيّر رقم الإصدار عند نشر نسخة جديدة ليُحدَّث التخزين. */
const VER = 'insp-kankossa-v10';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER && k !== 'insp-fonts').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* الخطوط: من الذاكرة أولًا ثم تُحدَّث في الخلفية */
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open('insp-fonts').then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== location.origin) return;

  /* الصفحة: من الشبكة أولًا (لتصلك آخر نسخة)، وعند انقطاع الإنترنت من الذاكرة */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const copy = r.clone(); caches.open(VER).then(c => c.put('./index.html', copy)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* باقي الملفات: من الذاكرة ثم الشبكة */
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(VER).then(c => c.put(req, copy)); }
    return r;
  })));
});
