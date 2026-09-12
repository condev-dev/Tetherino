/* لایه PWA: نصب، به روزرسانی و راهنمای iOS */
(function () {
  'use strict';

  var deferredPrompt = null;
  var sheetShown = false;
  var installedThisSession = false;
  var memoryFlag = false;
  var FLAG = 'nabz-toman-install-invite-v1';

  var sheet = document.getElementById('installSheet');
  var primary = document.getElementById('sheetPrimary');
  var secondary = document.getElementById('sheetSecondary');
  var copy = document.getElementById('sheetCopy');
  var steps = document.getElementById('sheetSteps');
  var fab = document.getElementById('installFab');
  var lastFocus = null;

  /* رویداد نصب باید در همان ابتدا گرفته شود */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone() && !installedThisSession) {
      showFab();
      // اگر رویداد دیرتر از تایمر رسید، دعوت را همان لحظه نشان بده
      if (!sheetShown && timerElapsed && !readFlag()) openSheet('prompt');
    }
  });

  window.addEventListener('appinstalled', function () {
    installedThisSession = true;
    deferredPrompt = null;
    hideFab();
    closeSheet();
    toast('نصب انجام شد، از این به بعد از خود اپ بازش کن.');
  });

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }

  function isIOS() {
    var ua = navigator.userAgent || '';
    var iOSUA = /iPad|iPhone|iPod/.test(ua);
    var iPadDesktop = /Macintosh/.test(ua) && typeof document.ontouchend !== 'undefined';
    return iOSUA || iPadDesktop;
  }

  function iosSteps() {
    var ua = navigator.userAgent || '';
    var inApp = /FBAN|FBAV|Instagram|Line|Twitter|MicroMessenger/i.test(ua);
    if (inApp) {
      return [
        'این صفحه داخل مرورگر یک برنامه دیگر باز شده است.',
        'از منوی همان برنامه گزینه باز کردن در Safari را انتخاب کنید.',
        'سپس دکمه Share و گزینه Add to Home Screen را بزنید.'
      ];
    }
    return [
      'در نوار ابزار مرورگر دکمه Share را بزنید.',
      'در فهرست باز شده گزینه Add to Home Screen را انتخاب کنید.',
      'روی Add بزنید تا نماد اپ روی صفحه اصلی ساخته شود.'
    ];
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  function readFlag() {
    try { return localStorage.getItem(FLAG) === '1'; } catch (e) { return memoryFlag; }
  }
  function writeFlag() {
    memoryFlag = true;
    try { localStorage.setItem(FLAG, '1'); } catch (e) { /* حالت خصوصی */ }
  }

  function showFab() {
    if (isStandalone() || installedThisSession) return;
    fab.hidden = false;
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.gsap.from(fab, { y: -12, duration: 0.45, ease: 'back.out(1.7)' });
    }
  }
  function hideFab() { fab.hidden = true; }

  /* mode: 'prompt' یعنی نصب مستقیم، 'guide' یعنی راهنمای دستی */
  function openSheet(mode) {
    if (sheetShown || isStandalone() || installedThisSession) return;
    sheetShown = true;
    writeFlag();
    lastFocus = document.activeElement;

    if (mode === 'guide') {
      primary.textContent = 'راهنمای نصب';
      copy.textContent = 'عامو با سه تا حرکت میچسبونیش به صفحه اصلی، بعد دیگه دنبال لینک نگرد.';
      steps.innerHTML = iosSteps().map(function (s) { return '<li>' + s + '</li>'; }).join('');
      steps.hidden = false;
    } else {
      primary.textContent = 'نصب اپلیکیشن';
      copy.textContent = 'عامو نصبش کن که همیشه دم دستت باشه، کی حوصله داره هر دفعه دنبال لینک بگرده؟';
      steps.hidden = true;
    }
    primary.dataset.mode = mode;

    if (typeof sheet.showModal === 'function') sheet.showModal();
    else sheet.setAttribute('open', '');

    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.gsap.from('.sheet-inner', { y: 40, duration: 0.5, ease: 'power3.out' });
    }
    setTimeout(function () { primary.focus(); }, 60);
  }

  function closeSheet() {
    if (sheet.open) {
      if (typeof sheet.close === 'function') sheet.close();
      else sheet.removeAttribute('open');
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* نصب واقعی: prompt باید همزمان با کلیک کاربر صدا زده شود */
  function triggerInstall() {
    if (!deferredPrompt) {
      toast('امکان نصب مستقیم در این مرورگر فراهم نیست.');
      hideFab();
      return;
    }
    var evt = deferredPrompt;
    deferredPrompt = null;
    hideFab();
    try {
      evt.prompt();
      if (evt.userChoice && evt.userChoice.then) {
        evt.userChoice.then(function (choice) {
          if (choice && choice.outcome === 'accepted') {
            toast('درخواست نصب تایید شد، چند لحظه صبر کن.');
          } else {
            toast('باشه، هر وقت خواستی از همان دکمه بالا نصبش کن.');
          }
        })['catch'](function () { });
      }
    } catch (e) {
      toast('نصب انجام نشد، دوباره از منوی مرورگر امتحان کن.');
    }
  }

  primary.addEventListener('click', function () {
    var mode = primary.dataset.mode;
    if (mode === 'prompt') {
      triggerInstall();
      closeSheet();
    } else {
      // در حالت راهنما، مراحل داخل همان شیت باقی میماند
      steps.hidden = false;
      primary.textContent = 'متوجه شدم';
      primary.dataset.mode = 'ack';
    }
  });
  secondary.addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', function () { closeSheet(); });
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) closeSheet();
  });

  fab.addEventListener('click', function () {
    if (deferredPrompt) triggerInstall();
    else if (isIOS()) { sheetShown = false; openSheet('guide'); }
    else toast('امکان نصب مستقیم در این مرورگر فراهم نیست.');
  });

  /* دعوت خودکار، فقط وقتی مسیر نصب واقعی وجود دارد */
  var timerElapsed = false;
  setTimeout(function () {
    timerElapsed = true;
    if (isStandalone() || installedThisSession || readFlag()) return;
    if (deferredPrompt) openSheet('prompt');
    else if (isIOS()) openSheet('guide');
  }, 1500);

  if (isIOS() && !isStandalone()) showFab();

  /* ---------- سرویس ورکر ---------- */
  var reloaded = false;
  function promptUpdate(worker) {
    var bar = document.getElementById('updateBar');
    var btn = document.getElementById('updateBtn');
    bar.hidden = false;
    btn.onclick = function () {
      bar.hidden = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    };
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(nw);
          });
        });
      })['catch'](function () { });

      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    });
  }
})();
