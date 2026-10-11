/* SkyWings Travel & Tours — shared frontend helpers */
(function () {
  const C = window.SITE_CONFIG;

  /* ---------- icons (inline SVG, no emoji) ---------- */
  const I = {
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.82 9.82 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.89 9.88M20.5 3.5A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.16-3.44-8.4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  };
  window.ICONS = I;

  /* ---------- header / footer ---------- */
  const NAV = [
    ['index.html', 'Home'], ['flights.html', 'Flights'], ['tickets.html', 'Tickets'], ['tours.html', 'Tours'],
    ['hotels.html', 'Hotels'], ['umrah.html', 'Umrah'], ['visa.html', 'Visa'],
    ['contact.html', 'Contact'],
  ];
  function renderChrome(active) {
    const user = getUser();
    const hh = document.getElementById('site-header');
    if (hh) {
      hh.innerHTML =
        '<div class="site-header"><div class="container header-inner">' +
        '<a class="logo" href="index.html">' + I.plane +
        '<span>' + esc(C.brandName) + '<small>' + esc(C.tagline) + '</small></span></a>' +
        '<button class="menu-toggle" id="menuToggle" aria-label="Menu">☰</button>' +
        '<nav class="nav" id="mainNav">' +
        NAV.map(n => '<a href="' + n[0] + '"' + (n[0] === active ? ' class="active"' : '') + '>' + n[1] + '</a>').join('') +
        '<select id="curSwitch" class="cur-switch" title="Currency">' +
        Object.keys(CUR_INFO).map(c => '<option value="' + c + '"' + (c === CUR.code ? ' selected' : '') + '>' + c + '</option>').join('') +
        '</select>' +
        (user
          ? '<a href="my-bookings.html">My Bookings</a>' + (user.is_admin ? '<a href="admin.html">Admin</a>' : '') +
            '<a href="#" id="logoutLink" class="btn btn-ghost btn-sm">Logout</a>'
          : '<a href="login.html" class="btn btn-primary btn-sm">Login / Signup</a>') +
        '</nav></div></div>';
      const t = document.getElementById('menuToggle');
      if (t) t.onclick = () => document.getElementById('mainNav').classList.toggle('open');
      const lo = document.getElementById('logoutLink');
      if (lo) lo.onclick = (e) => { e.preventDefault(); logout(); };
      const cs = document.getElementById('curSwitch');
      if (cs) cs.onchange = () => {
        try { localStorage.setItem('sw_cur_override', cs.value); } catch {}
        CUR_OVERRIDE = cs.value;
        if (CUR_INFO[cs.value]) { CUR = { code: cs.value, rate: 1 }; refreshPrices(); detectCurrency(); }
      };
    }
    const ff = document.getElementById('site-footer');
    if (ff) {
      ff.innerHTML =
        '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
        '<div><h4>' + esc(C.brandName) + '</h4><p style="font-size:.9rem">' + esc(C.tagline) + '. Your trusted partner for flights, tours, hotels, Umrah and visa services across Pakistan and beyond.</p></div>' +
        '<div><h4>Services</h4><a href="flights.html">Flight Booking</a><a href="tickets.html">Flight Tickets</a><a href="tours.html">Tour Packages</a><a href="hotels.html">Hotels</a><a href="umrah.html">Umrah Packages</a><a href="visa.html">Visa Services</a></div>' +
        '<div><h4>Company</h4><a href="contact.html">Contact Us</a><a href="my-bookings.html">My Bookings</a><a href="login.html">Login</a><a href="signup.html">Create Account</a></div>' +
        '<div><h4>Contact</h4><a href="tel:' + C.phone.replace(/\s/g, '') + '">' + esc(C.phone) + '</a>' +
        '<a href="https://wa.me/' + C.whatsapp + '" target="_blank">WhatsApp: ' + esc(C.phone) + '</a>' +
        '<a href="mailto:' + C.email + '">' + esc(C.email) + '</a><span style="font-size:.9rem">' + esc(C.address) + '</span><br><span style="font-size:.85rem">' + esc(C.hours) + '</span></div>' +
        '</div><div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' ' + esc(C.brandName) + '. All rights reserved. Operating since 2002.</span><span>100K+ Happy Clients • Payments via bank transfer, JazzCash & Easypaisa.</span></div>' +
        '</div></footer>' +
        '<a class="whatsapp-float" href="https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent('Assalam-o-Alaikum! I want to inquire about a booking.') + '" target="_blank" aria-label="Chat on WhatsApp">' + I.wa + '</a>' +
        '<div id="toast"></div>';
    }
    document.title = (document.title ? document.title + ' | ' : '') + C.brandName;
  }

  /* ---------- auth ---------- */
  function getToken() { return localStorage.getItem('sw_token'); }
  function getUser() { try { return JSON.parse(localStorage.getItem('sw_user')); } catch { return null; } }
  function setSession(token, user) {
    localStorage.setItem('sw_token', token);
    localStorage.setItem('sw_user', JSON.stringify(user));
  }
  function logout() {
    localStorage.removeItem('sw_token'); localStorage.removeItem('sw_user');
    location.href = 'index.html';
  }
  function requireLogin() {
    if (!getToken()) { location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search); return false; }
    return true;
  }

  /* ---------- api ---------- */
  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    const t = getToken();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body instanceof FormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
    });
    let data = {};
    try { data = await res.json(); } catch { /* non-json */ }
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
  }

  /* ---------- formatting ---------- */
  function pkr(n) {
    if (n == null) return '—';
    return 'PKR ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });
  }
  function money(amount, currency) {
    if (amount == null) return '—';
    if ((currency || '').toUpperCase() === 'PKR') return pkr(amount);
    return Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ' + (currency || '');
  }

  /* ---------- multi-currency (visitor's local currency) ---------- */
  const CUR_INFO = {
    PKR: { s: 'Rs ' }, SAR: { s: 'SR ' }, AED: { s: 'AED ' }, QAR: { s: 'QAR ' },
    KWD: { s: 'KWD ' }, BHD: { s: 'BHD ' }, OMR: { s: 'OMR ' }, USD: { s: '$' },
    GBP: { s: '£' }, EUR: { s: '€' }, INR: { s: '₹' }, BDT: { s: '৳ ' },
    CAD: { s: 'CA$' }, AUD: { s: 'A$' }, MYR: { s: 'RM ' }, TRY: { s: '₺' },
  };
  const COUNTRY_CUR = { PK: 'PKR', SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
    US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', IN: 'INR', BD: 'BDT', MY: 'MYR', TR: 'TRY' };
  const EU_COUNTRIES = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'];
  function curCache() { try { return JSON.parse(localStorage.getItem('sw_cur')) || null; } catch { return null; } }
  let CUR = curCache() || { code: 'PKR', rate: 1 };
  if (!CUR_INFO[CUR.code]) CUR = { code: 'PKR', rate: 1 };
  let CUR_OVERRIDE = null;
  try { CUR_OVERRIDE = localStorage.getItem('sw_cur_override'); } catch {}
  if (CUR_OVERRIDE && CUR_INFO[CUR_OVERRIDE]) CUR = { code: CUR_OVERRIDE, rate: CUR.rate || 1 };

  function fmtCur(pkrAmount) {
    if (pkrAmount == null) return '—';
    const info = CUR_INFO[CUR.code] || CUR_INFO.PKR;
    const v = Math.round(Number(pkrAmount) * (CUR.rate || 1));
    return info.s + v.toLocaleString('en-US');
  }
  // Display wrapper: converts PKR -> visitor currency; auto-updates on currency change
  function moneyLocal(pkrAmount) {
    if (pkrAmount == null) return '—';
    return '<span class="sw-price" data-pkr="' + Number(pkrAmount) + '">' + esc(fmtCur(pkrAmount)) + '</span>';
  }
  function refreshPrices() {
    document.querySelectorAll('.sw-price').forEach(el => {
      const v = parseFloat(el.dataset.pkr);
      if (!isNaN(v)) el.textContent = fmtCur(v);
    });
    const sel = document.getElementById('curSwitch');
    if (sel && sel.value !== CUR.code) sel.value = CUR.code;
  }
  async function detectCurrency() {
    try {
      if (!(CUR_OVERRIDE && CUR_INFO[CUR_OVERRIDE])) {
        let cc = null;
        try { const g = await (await fetch('https://ipapi.co/json/')).json(); cc = g && g.country_code; } catch {}
        if (!cc) { try { const g2 = await (await fetch('https://ipwho.is/')).json(); cc = g2 && g2.country_code; } catch {} }
        if (cc) {
          cc = String(cc).toUpperCase();
          const code = COUNTRY_CUR[cc] || (EU_COUNTRIES.includes(cc) ? 'EUR' : null);
          if (code && code !== CUR.code) CUR = { code, rate: 1 };
        }
      }
      let rates = null;
      const cached = curCache();
      if (cached && cached.rates && Date.now() - (cached.ts || 0) < 24 * 3600 * 1000) rates = cached.rates;
      else {
        try {
          const r = await (await fetch('https://open.er-api.com/v6/latest/PKR')).json();
          if (r && r.result !== 'error' && r.rates) rates = r.rates;
        } catch {}
      }
      if (rates && rates[CUR.code]) {
        CUR.rate = rates[CUR.code];
        try { localStorage.setItem('sw_cur', JSON.stringify({ code: CUR.code, rate: CUR.rate, rates, ts: Date.now() })); } catch {}
      } else if (CUR.code !== 'PKR') {
        try { localStorage.setItem('sw_cur', JSON.stringify({ code: CUR.code, rate: 1, rates: rates || (cached && cached.rates) || null, ts: Date.now() })); } catch {}
      }
      refreshPrices();
    } catch {}
  }
  function fmtDate(s) {
    if (!s) return '—';
    const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
    return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtTime(s) {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function dur(iso) {
    if (!iso) return '—';
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!m) return iso;
    const h = parseInt(m[1] || 0), mm = parseInt(m[2] || 0);
    return (h ? h + 'h ' : '') + (mm ? mm + 'm' : '');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const STATUS_LABEL = {
    pending_payment: 'Payment Pending', payment_submitted: 'Payment Submitted',
    confirmed: 'Confirmed', ticketed: 'Ticket Issued', completed: 'Completed', cancelled: 'Cancelled',
  };
  function statusBadge(s) { return '<span class="status st-' + s + '">' + (STATUS_LABEL[s] || s) + '</span>'; }
  function toast(msg, ms = 2800) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), ms);
  }
  function spinner(el) { el.innerHTML = '<div class="spinner"></div>'; }

  // gradient visuals for cards (no external images)
  const GRADIENTS = [
    'linear-gradient(135deg,#0b2c4d,#0284c7)', 'linear-gradient(135deg,#0e5f7e,#0e9f8a)',
    'linear-gradient(135deg,#6d28d9,#0284c7)', 'linear-gradient(135deg,#0b7f6e,#0b2c4d)',
    'linear-gradient(135deg,#b45309,#f59e0b)', 'linear-gradient(135deg,#0e7490,#22d3ee)',
  ];
  function gradient(i) { return GRADIENTS[i % GRADIENTS.length]; }

  window.SW = {
    renderChrome, getToken, getUser, setSession, logout, requireLogin,
    api, pkr, money, moneyLocal, fmtCur, refreshPrices, getCurrency: () => CUR.code,
    fmtDate, fmtTime, dur, esc, statusBadge, toast, spinner, gradient, ICONS: I,
  };
  detectCurrency();
})();
