/* تترلــند — نرخ زنده تتر و دلار به تومان */
(function () {
  'use strict';

  var API = {
    // بازار تتر/ریال نوبیتکس (قیمتها به ریال)
    tether: 'https://apiv2.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls',
    // دلار بازار آزاد، جدول خلاصه tgju (قیمتها به ریال)
    dollar: 'https://api.tgju.org/v1/market/indicator/summary-table-data/price_dollar_rl?length=1',
    // سری زمانی روزانه تتر/ریال، tgju
    trend: 'https://api.tgju.org/v1/market/indicator/summary-table-data/crypto-tether-irr?length=15'
  };
  var STORE_KEY = 'nabz-toman-last-data-v1';
  var TIMEOUT = 12000;

  var state = { usdtToman: null, lastEdited: 'usdt' };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- کمکیهای نمایش ---------- */
  var FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  function fa(str) {
    return String(str).replace(/[0-9]/g, function (d) { return FA[+d]; });
  }
  function grouped(n, digits) {
    var v = Number(n);
    if (!isFinite(v)) return '—';
    return fa(v.toLocaleString('en-US', {
      minimumFractionDigits: digits || 0,
      maximumFractionDigits: digits === undefined ? 0 : digits
    }));
  }
  function parseNum(text) {
    var s = String(text)
      .replace(/[\u06F0-\u06F9]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); })
      .replace(/[\u0660-\u0669]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
      .replace(/[,\u066B\u066C\s]/g, '');
    var v = parseFloat(s.replace(/[^\d.\-]/g, ''));
    return isFinite(v) ? v : null;
  }
  function stripTags(html) {
    return String(html).replace(/<[^>]*>/g, '').trim();
  }
  function timeLabel(ms) {
    var d = new Date(ms);
    try {
      return fa(d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }).replace(/[\u200e\u200f]/g, ''));
    } catch (e) {
      return fa(('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2));
    }
  }

  function fetchJSON(url) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
    var opts = { cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }, function (err) { clearTimeout(timer); throw err; });
  }

  /* ---------- ذخیره آخرین داده موفق ---------- */
  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function writeStore(patch) {
    try {
      var cur = readStore();
      for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) cur[k] = patch[k]; }
      localStorage.setItem(STORE_KEY, JSON.stringify(cur));
    } catch (e) { /* حالت خصوصی مرورگر */ }
  }

  /* ---------- واکنشهای شیرازی ---------- */
  var REACTIONS = [
    'نرخ تازه اومد، بیا ببین دنیا دست کیه.',
    'عامو گرفتیمش، تازه تازه از تنور بازار.',
    'اینم نرخ لحظه ای، دل خوش سیری چند.',
    'بازار همینه دیگه، یه روز بالا یه روز بالاتر.',
    'نرخ رسید، حالا با خیال راحت حساب کتاب کن.',
    'تازهاش اومد، بقیه اش دیگه با خودت.',
    'نرخ به روز شد، زیاد هم بهش دل نبند.',
    'بگیر که اومد، همین الان از بازار.'
  ];
  var lastReaction = -1;
  function reaction() {
    if (REACTIONS.length < 2) return REACTIONS[0];
    var i = lastReaction;
    while (i === lastReaction) i = Math.floor(Math.random() * REACTIONS.length);
    lastReaction = i;
    return REACTIONS[i];
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  /* ---------- تتر ---------- */
  function renderTether(d, cached) {
    state.usdtToman = d.price;
    $('tetherPrice').textContent = grouped(d.price);
    $('tetherLow').textContent = grouped(d.low) + ' تومان';
    $('tetherHigh').textContent = grouped(d.high) + ' تومان';
    var chip = $('tetherChange');
    var ch = Number(d.change);
    chip.textContent = (ch > 0 ? '+' : ch < 0 ? '−' : '') + grouped(Math.abs(ch), 2) + '٪ امروز';
    chip.className = 'chip ' + (ch > 0 ? 'up' : ch < 0 ? 'down' : '');
    $('tetherStamp').className = 'stamp';
    $('tetherStamp').textContent = (cached ? 'آخرین داده ذخیره شده' : 'دریافت زنده') +
      ' • ساعت ' + timeLabel(d.at) + ' • منبع نوبیتکس';
    updateConverterAvailability();
    pop($('tetherPrice'));
  }

  function loadTether() {
    return fetchJSON(API.tether).then(function (j) {
      var s = j && j.stats && j.stats['usdt-rls'];
      if (!s) throw new Error('bad payload');
      var d = {
        price: Math.round(Number(s.latest) / 10),
        low: Math.round(Number(s.dayLow) / 10),
        high: Math.round(Number(s.dayHigh) / 10),
        change: Number(s.dayChange),
        at: Date.now()
      };
      if (!isFinite(d.price) || d.price <= 0) throw new Error('bad price');
      renderTether(d, false);
      writeStore({ tether: d });
      return true;
    })['catch'](function () {
      var c = readStore().tether;
      if (c) { renderTether(c, true); }
      else {
        $('tetherPrice').textContent = 'در دسترس نیست';
        $('tetherStamp').className = 'stamp err';
        $('tetherStamp').textContent = 'دریافت نرخ تتر ممکن نشد و داده ذخیره شدهای هم موجود نیست.';
      }
      return false;
    });
  }

  /* ---------- دلار ---------- */
  function renderDollar(d, cached) {
    $('dollarPrice').textContent = grouped(d.price);
    $('dollarLow').textContent = grouped(d.low) + ' تومان';
    $('dollarHigh').textContent = grouped(d.high) + ' تومان';
    var chip = $('dollarChange');
    chip.textContent = (d.dir === 'low' ? '−' : d.dir === 'high' ? '+' : '') + fa(d.percent);
    chip.className = 'chip ' + (d.dir === 'high' ? 'up' : d.dir === 'low' ? 'down' : '');
    $('dollarStamp').className = 'stamp';
    $('dollarStamp').textContent = (cached ? 'آخرین داده ذخیره شده' : 'دریافت زنده') +
      ' • تاریخ داده ' + fa(d.date) + ' • منبع tgju';
    pop($('dollarPrice'));
  }

  function loadDollar() {
    return fetchJSON(API.dollar).then(function (j) {
      var row = j && j.data && j.data[0];
      if (!row) throw new Error('bad payload');
      var raw = String(row[4]) + String(row[5]);
      var d = {
        price: Math.round(parseNum(row[3]) / 10),
        low: Math.round(parseNum(row[1]) / 10),
        high: Math.round(parseNum(row[2]) / 10),
        percent: stripTags(row[5]),
        dir: raw.indexOf('low') > -1 ? 'low' : raw.indexOf('high') > -1 ? 'high' : '',
        date: String(row[7] || row[6] || ''),
        at: Date.now()
      };
      if (!isFinite(d.price) || d.price <= 0) throw new Error('bad price');
      renderDollar(d, false);
      writeStore({ dollar: d });
      return true;
    })['catch'](function () {
      var c = readStore().dollar;
      if (c) { renderDollar(c, true); }
      else {
        $('dollarPrice').textContent = 'در دسترس نیست';
        $('dollarStamp').className = 'stamp err';
        $('dollarStamp').textContent = 'دریافت نرخ دلار ممکن نشد و داده ذخیره شدهای هم موجود نیست.';
      }
      return false;
    });
  }

  /* ---------- نمودار پانزده روزه ---------- */
  function buildChart(points) {
    var W = 320, H = 150, padX = 6, padTop = 14, padBottom = 18;
    var vals = points.map(function (p) { return p.value; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = (max - min) || 1;
    var innerW = W - padX * 2, innerH = H - padTop - padBottom;

    // محور افقی در حالت راستچین: قدیمیترین سمت راست
    var coords = points.map(function (p, i) {
      var x = W - padX - (i / (points.length - 1 || 1)) * innerW;
      var y = padTop + (1 - (p.value - min) / span) * innerH;
      return { x: x, y: y, p: p };
    });
    var line = coords.map(function (c, i) { return (i ? 'L' : 'M') + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join(' ');
    var area = line + ' L' + coords[coords.length - 1].x.toFixed(1) + ' ' + (H - padBottom) +
      ' L' + coords[0].x.toFixed(1) + ' ' + (H - padBottom) + ' Z';

    var dots = coords.map(function (c, i) {
      var last = i === 0;
      return '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="' + (last ? 4.5 : 2) +
        '" fill="' + (last ? '#f2b544' : '#26c6a6') + '"><title>' + c.p.label + ': ' +
        grouped(c.p.value) + ' تومان</title></circle>';
    }).join('');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#26c6a6" stop-opacity="0.34"/>' +
      '<stop offset="100%" stop-color="#26c6a6" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#g)"/>' +
      '<path d="' + line + '" fill="none" stroke="#26c6a6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + '</svg>';
  }

  function renderTrend(t, cached) {
    $('chartEmpty').hidden = true;
    $('chart').innerHTML = buildChart(t.points);
    $('trendMin').textContent = grouped(t.min) + ' تومان';
    $('trendMax').textContent = grouped(t.max) + ' تومان';
    var chip = $('trendChange');
    var pct = t.changePct;
    chip.textContent = (pct > 0 ? '+' : pct < 0 ? '−' : '') + grouped(Math.abs(pct), 2) + '٪ در بازه';
    chip.className = 'chip ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : '');
    $('trendStamp').className = 'stamp';
    $('trendStamp').textContent = (cached ? 'آخرین داده ذخیره شده' : 'دریافت زنده') +
      ' • از ' + fa(t.from) + ' تا ' + fa(t.to) + ' • منبع tgju';
  }

  function loadTrend() {
    return fetchJSON(API.trend).then(function (j) {
      var rows = (j && j.data) || [];
      var points = [];
      for (var i = 0; i < rows.length && points.length < 15; i++) {
        var v = parseNum(rows[i][3]);
        if (v && isFinite(v)) {
          points.push({ value: Math.round(v / 10), label: String(rows[i][7] || rows[i][6] || '') });
        }
      }
      if (points.length < 2) throw new Error('not enough points');
      var vals = points.map(function (p) { return p.value; });
      var first = points[points.length - 1].value, last = points[0].value;
      var t = {
        points: points,
        min: Math.min.apply(null, vals),
        max: Math.max.apply(null, vals),
        changePct: first ? ((last - first) / first) * 100 : 0,
        from: points[points.length - 1].label,
        to: points[0].label
      };
      renderTrend(t, false);
      writeStore({ trend: t });
      return true;
    })['catch'](function () {
      var c = readStore().trend;
      if (c && c.points && c.points.length > 1) { renderTrend(c, true); }
      else {
        $('chartEmpty').hidden = false;
        $('chartEmpty').textContent = 'نمودار در دسترس نیست.';
        $('trendStamp').className = 'stamp err';
        $('trendStamp').textContent = 'دریافت سری زمانی ممکن نشد و داده ذخیره شدهای هم موجود نیست.';
      }
      return false;
    });
  }

  /* ---------- مبدل ---------- */
  function updateConverterAvailability() {
    var ready = !!state.usdtToman;
    $('usdtInput').disabled = !ready;
    $('tomanInput').disabled = !ready;
    if (!ready) return;
    $('convStamp').className = 'stamp';
    $('convStamp').textContent = 'نرخ مبنا: هر تتر ' + grouped(state.usdtToman) + ' تومان';
    syncFrom(state.lastEdited);
  }

  function digitsOnlyCount(s, upto) {
    var c = 0;
    for (var i = 0; i < upto && i < s.length; i++) {
      if (/[0-9\u06F0-\u06F9\u0660-\u0669]/.test(s[i])) c++;
    }
    return c;
  }
  function caretAfterDigits(s, count) {
    if (count <= 0) return 0;
    var seen = 0;
    for (var i = 0; i < s.length; i++) {
      if (/[0-9\u06F0-\u06F9\u0660-\u0669]/.test(s[i])) {
        seen++;
        if (seen === count) return i + 1;
      }
    }
    return s.length;
  }

  function liveFormat(el, maxFrac) {
    var raw = el.value;
    if (raw.trim() === '') return;
    // تایپ اعشار در حال انجام است؟
    var trailingDot = /[.\u066B]\s*$/.test(raw);
    var n = parseNum(raw);
    if (n === null) return;
    var digitsBeforeCaret = digitsOnlyCount(raw, el.selectionStart || 0);
    var formatted = formatInput(n, maxFrac);
    if (trailingDot && formatted.indexOf('٫') === -1 && formatted.indexOf('.') === -1) {
      formatted += '٫';
    }
    if (formatted !== raw) {
      el.value = formatted;
      var pos = caretAfterDigits(formatted, digitsBeforeCaret);
      try { el.setSelectionRange(pos, pos); } catch (e) { /* عدم پشتیبانی */ }
    }
  }

  function formatInput(n, maxFrac) {
    if (n === null || n === undefined || !isFinite(n)) return '';
    var s = Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac == null ? 0 : maxFrac
    });
    return fa(s);
  }

  function syncFrom(source) {
    var rate = state.usdtToman;
    if (!rate) return;
    var u = $('usdtInput'), t = $('tomanInput');
    if (source === 'usdt') {
      var raw = u.value.trim();
      if (raw === '') { t.value = ''; return; }
      var uv = parseNum(raw);
      if (uv === null) { t.value = ''; return; }
      t.value = formatInput(Math.round(uv * rate), 0);
    } else {
      var rawT = t.value.trim();
      if (rawT === '') { u.value = ''; return; }
      var tv = parseNum(rawT);
      if (tv === null) { u.value = ''; return; }
      u.value = formatInput(Math.round((tv / rate) * 100) / 100, 2);
    }
  }

  function reformatSelf(el, maxFrac) {
    var raw = el.value;
    var n = parseNum(raw);
    if (n === null || raw.trim() === '') return;
    // اگر رقم اعشار در حال تایپ است (مثلا "12.") آن را دست نزن
    if (/[.\u066B]\s*$/.test(raw)) return;
    var formatted = formatInput(n, maxFrac);
    if (formatted !== raw) el.value = formatted;
  }

  /* ---------- انیمیشن ---------- */
  function pop(el) {
    if (reduceMotion || !window.gsap || !el) return;
    window.gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(1.7)' });
  }
  function introAnimation() {
    if (reduceMotion || !window.gsap) return;
    window.gsap.from('.card', { y: 24, duration: 0.6, stagger: 0.08, ease: 'power3.out' });
  }

  /* ---------- بارگذاری ---------- */
  var busy = false;
  function loadAll(userTriggered) {
    if (busy) return;
    busy = true;
    var btn = $('refreshBtn');
    btn.setAttribute('aria-busy', 'true');
    Promise.all([loadTether(), loadDollar(), loadTrend()]).then(function (res) {
      busy = false;
      btn.removeAttribute('aria-busy');
      var ok = res.filter(Boolean).length;
      if (userTriggered) {
        if (ok === res.length) toast(reaction());
        else if (ok > 0) toast('بخشی از نرخ ها به روز شد، بقیه از داده ذخیره شده نمایش داده می شود.');
        else toast('اتصال برقرار نشد، چیزی که می بینی داده قدیمی است.');
      } else if (ok === 0) {
        toast('اتصال برقرار نشد، نرخ زنده دریافت نشد.');
      }
    });
  }

  function init() {
    $('refreshBtn').addEventListener('click', function () { loadAll(true); });
    var uEl = $('usdtInput'), tEl = $('tomanInput');

    uEl.addEventListener('input', function () {
      state.lastEdited = 'usdt';
      syncFrom('usdt');
    });
    uEl.addEventListener('blur', function () { reformatSelf(uEl, 2); });

    tEl.addEventListener('input', function () {
      state.lastEdited = 'toman';
      syncFrom('toman');
    });
    tEl.addEventListener('blur', function () { reformatSelf(tEl, 0); });

    var quicks = document.querySelectorAll('.quick');
    for (var i = 0; i < quicks.length; i++) {
      quicks[i].addEventListener('click', function (e) {
        var v = e.currentTarget.getAttribute('data-usdt');
        uEl.value = formatInput(Number(v), 0);
        state.lastEdited = 'usdt';
        syncFrom('usdt');
        if (!state.usdtToman) toast('هنوز نرخ تتر دریافت نشده، یک لحظه صبر کن.');
      });
    }

    updateConverterAvailability();
    introAnimation();
    loadAll(false);

    window.addEventListener('online', function () { loadAll(false); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) loadAll(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
