/* -*- coding: utf-8 -*-
 * NenlyMine - script.js
 * 1) РўРµРјР° (localStorage "nenlymine-theme", Р°С‚СЂРёР±СѓС‚ data-theme РЅР° <html>)
 * 2) РњРѕР±РёР»СЊРЅРѕРµ РјРµРЅСЋ (.hamburger / .nav.open)
 * 3) РљРћР Р—РРќРђ (localStorage "nenlymine-cart"):
 *    - РєРЅРѕРїРєРё ".btn-add-cart" РЅР° РєР°СЂС‚РѕС‡РєР°С…, СЃС‡С‘С‚С‡РёРє "#cartBadge" РІ С€Р°РїРєРµ
 *    - СЃС‚СЂР°РЅРёС†Р° cart.html: РЅРёРє + РєРѕР»РёС‡РµСЃС‚РІРѕ (РєРµР№СЃС‹) + РїСЂРѕРјРѕРєРѕРґ
 * 4) РћС‚РїСЂР°РІРєР° Р·Р°РєР°Р·Р° РІ Р»РѕРєР°Р»СЊРЅС‹Р№ give_app.py (POST /give, {nick, items[], promo_code})
 */
(function () {
    'use strict';

    var THEME_KEY = 'nenlymine-theme';
    var CART_KEY = 'nenlymine-cart';
    
    var DEFAULT_API = 'http://127.0.0.1:9898/give';

    var CASE_KINDS = { case: 1, seasoncase: 1, weeklycase: 1, titlecase: 1 };

    var GROUP_NAMES = {
        premium: 'РџСЂРµРјРёСѓРј', creative: 'РљСЂРµР°С‚РёРІ', straj: 'РЎС‚СЂР°Р¶',
        lord: 'Р›РѕСЂРґ', delux: 'Р”РµР»СЋРєСЃ', tsar: 'Р¦Р°СЂСЊ',
        imperator: 'РРјРїРµСЂР°С‚РѕСЂ', legenda: 'Р›РµРіРµРЅРґР°',
        povelitel: 'РџРѕРІРµР»РёС‚РµР»СЊ', vlastelin: 'Р’Р»Р°СЃС‚РµР»РёРЅ',
        vladika: 'Р’Р»Р°РґС‹РєР°'
    };

    var CASE_NAMES = {
        case: 'РљРµР№СЃ', seasoncase: 'РЎРµР·РѕРЅРЅС‹Р№ РєРµР№СЃ',
        weeklycase: 'РќРµРґРµР»СЊРЅС‹Р№ РєРµР№СЃ', titlecase: 'РўРёС‚СѓР»СЊРЅС‹Р№ РєРµР№СЃ'
    };

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    /* ================= РўР•РњРђ ================= */
    function applyTheme(theme) {
        var root = document.documentElement;
        if (theme === 'dark') { root.setAttribute('data-theme', 'dark'); }
        else { root.removeAttribute('data-theme'); }
    }

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            var next = cur === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
        });
    }

    /* ================= РњРћР‘РР›Р¬РќРћР• РњР•РќР® ================= */
    var menuBtn = document.getElementById('menuToggle');
    var nav = document.getElementById('siteNav') || document.querySelector('.nav');

    function closeMenu() {
        if (nav) {
            nav.classList.remove('open');
            nav.setAttribute('aria-hidden', 'true');
        }
        if (menuBtn) {
            menuBtn.classList.remove('active');
            menuBtn.setAttribute('aria-expanded', 'false');
        }
    }

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function () {
            var open = nav.classList.toggle('open');
            menuBtn.classList.toggle('active', open);
            menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            nav.setAttribute('aria-hidden', open ? 'false' : 'true');
        });
        $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
        document.addEventListener('click', function (e) {
            if (nav.contains(e.target) || menuBtn.contains(e.target)) { return; }
            if (window.innerWidth <= 760) { closeMenu(); }
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 760) { closeMenu(); }
        });
    }

    /* ================= РҐР РђРќРР›РР©Р• ================= */
    function readStore(key, fallback) {
        try {
            var v = JSON.parse(localStorage.getItem(key) || 'null');
            return v === null || v === undefined ? fallback : v;
        } catch (e) { return fallback; }
    }
    function writeStore(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }

    function getCart() {
        var v = readStore(CART_KEY, []);
        return Array.isArray(v) ? v : [];
    }
    function saveCart(items) {
        writeStore(CART_KEY, items);
        refreshCartBadge();
    }

    function itemId(it) {
        return [it.kind, it.group || '', it.label || ''].join('|');
    }

    function isCase(it) { return !!CASE_KINDS[it.kind]; }

    /* ================= РЎР§РЃРўР§РРљ ================= */
    function cartCount() {
        return getCart().reduce(function (s, it) {
            return s + (isCase(it) ? (it.qty || 1) : 1);
        }, 0);
    }

    function refreshCartBadge() {
        var n = cartCount();
        $$('#cartBadge').forEach(function (b) {
            b.textContent = n > 0 ? String(n) : '';
            b.style.display = n > 0 ? '' : 'none';
        });
    }

    /* ================= РўРћРЎРў ================= */
    var toastTimer = null;
    function toast(text) {
        var t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = text;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    /* ================= Р”РћР‘РђР’Р›Р•РќРР• ================= */
    function addToCart(item) {
        var items = getCart();
        var id = itemId(item);
        var found = null;
        for (var i = 0; i < items.length; i++) {
            if (itemId(items[i]) === id) { found = items[i]; break; }
        }
        if (found) {
            /* РџСЂРёРІРёР»РµРіРёСЏ Рё С‚РµРі РІС‹РґР°СЋС‚СЃСЏ РѕРґРёРЅ СЂР°Р· - РєРѕР»РёС‡РµСЃС‚РІРѕ РЅРµ РєРѕРїРёС‚СЃСЏ. */
            if (isCase(found)) { found.qty = (found.qty || 1) + (item.qty || 1); }
            toast('РЈР¶Рµ РІ РєРѕСЂР·РёРЅРµ: ' + (found.label || ''));
        } else {
            item.qty = item.qty || 1;
            items.push(item);
            toast('Р”РѕР±Р°РІР»РµРЅРѕ РІ РєРѕСЂР·РёРЅСѓ: ' + (item.label || ''));
        }
        saveCart(items);
    }

    function removeAt(index) {
        var items = getCart();
        if (index < 0 || index >= items.length) { return; }
        var removed = items.splice(index, 1)[0];
        saveCart(items);
        renderCartPage();
        toast('РЈРґР°Р»РµРЅРѕ: ' + (removed.label || ''));
    }

    /* --------- РљРЅРѕРїРєРё "Р’ РєРѕСЂР·РёРЅСѓ" РЅР° РєР°СЂС‚РѕС‡РєР°С… ---------
       РќР° СЌР»РµРјРµРЅС‚Рµ СЃ .btn-add-cart (РёР»Рё РЅР° СЃР°РјРѕР№ РєР°СЂС‚РѕС‡РєРµ):
         data-kind  = group|tag|case|seasoncase|weeklycase|titlecase
         data-group = РІРЅСѓС‚СЂРµРЅРЅСЏСЏ РіСЂСѓРїРїР° (РґР»СЏ kind=group)
         data-label = РЅР°Р·РІР°РЅРёРµ РґР»СЏ РїРѕРєР°Р·Р°
         data-price = С†РµРЅР° РІ СЂСѓР±Р»СЏС… (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ) */
    function bindBuyButtons() {
        $$('.btn-add-cart').forEach(function (btn) {
            var card = btn.closest('.card') || btn;
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                var kind = (card.getAttribute('data-kind') || 'group').toLowerCase();
                var group = card.getAttribute('data-group') || 'premium';
                var label = card.getAttribute('data-label') || '';
                var price = parseInt(card.getAttribute('data-price') || '0', 10) || 0;
                var qty = parseInt(card.getAttribute('data-qty') || '1', 10) || 1;

                if (!label) {
                    label = kind === 'group' ? (GROUP_NAMES[group] || group)
                          : kind === 'tag' ? 'РўРµРі'
                          : (CASE_NAMES[kind] || 'РўРѕРІР°СЂ');
                }
                addToCart({ kind: kind, group: group, label: label, price: price, qty: qty });
            });
        });
    }

    /* ================= РЎРўР РђРќРР¦Рђ РљРћР Р—РРќР« ================= */
    var qtyTouched = false;

    function renderCartPage() {
        var listEl = document.getElementById('cartList');
        if (!listEl) { return; }

        var items = getCart();
        var emptyEl = document.getElementById('cartEmpty');
        var formEl = document.getElementById('orderForm');
        var sumEl = document.getElementById('cartSum');

        if (!items.length) {
            if (emptyEl) { emptyEl.style.display = 'block'; }
            if (formEl) { formEl.style.display = 'none'; }
            listEl.textContent = '';
            if (sumEl) { sumEl.textContent = '0 в‚Ѕ'; }
            return;
        }

        if (emptyEl) { emptyEl.style.display = 'none'; }
        if (formEl) { formEl.style.display = 'block'; }

        /* РЎРїРёСЃРѕРє РїРѕР·РёС†РёР№ (DOM, Р±РµР· innerHTML - Р±РµР·РѕРїР°СЃРЅРѕ РґР»СЏ РЅРёРєР°/РЅР°Р·РІР°РЅРёР№) */
        listEl.textContent = '';
        var total = 0;
        items.forEach(function (it, idx) {
            total += (isCase(it) ? (it.qty || 1) : 1) * (it.price || 0);

            var row = document.createElement('div');
            row.className = 'cart-item';

            var badge = document.createElement('span');
            badge.className = 'cart-kind ' + (isCase(it) ? 'is-case' : (it.kind === 'tag' ? 'is-tag' : 'is-group'));
            badge.textContent = it.kind === 'group' ? 'РџСЂРёРІРёР»РµРіРёСЏ'
                             : it.kind === 'tag' ? 'РўРµРі'
                             : 'РљРµР№СЃ';
            row.appendChild(badge);

            var info = document.createElement('div');
            info.className = 'cart-item-info';

            var name = document.createElement('div');
            name.className = 'cart-item-name';
            name.textContent = it.label || 'РўРѕРІР°СЂ';
            info.appendChild(name);

            var meta = document.createElement('div');
            meta.className = 'cart-item-meta';
            var parts = [];
            if (isCase(it) && it.qty > 1) { parts.push('РІ РєРѕСЂР·РёРЅРµ: ' + it.qty + ' С€С‚.'); }
            if (it.price) { parts.push(it.price.toLocaleString('ru-RU') + ' в‚Ѕ'); }
            meta.textContent = parts.join(' вЂў ');
            if (!parts.length) { meta.style.display = 'none'; }
            info.appendChild(meta);
            row.appendChild(info);

            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'cart-del';
            del.setAttribute('aria-label', 'РЈРґР°Р»РёС‚СЊ С‚РѕРІР°СЂ');
            del.textContent = 'Г—';
            del.addEventListener('click', function () { removeAt(idx); });
            row.appendChild(del);

            listEl.appendChild(row);
        });

        if (sumEl) { sumEl.textContent = total.toLocaleString('ru-RU') + ' в‚Ѕ'; }
        bindPromoVisibility();
    }

    /* РџРѕР»СЏ С„РѕСЂРјС‹ Р·Р°РІРёСЃСЏС‚ РѕС‚ СЃРѕРґРµСЂР¶РёРјРѕРіРѕ РєРѕСЂР·РёРЅС‹:
       - РµСЃС‚СЊ РєРµР№СЃ  -> РїРѕРєР°Р·С‹РІР°РµРј РєРѕР»РёС‡РµСЃС‚РІРѕ
       - РµСЃС‚СЊ РєРµР№СЃ/РїСЂРёРІРёР»РµРіРёСЏ/С‚РµРі -> РїРѕРєР°Р·С‹РІР°РµРј РїСЂРѕРјРѕРєРѕРґ */
    function bindPromoVisibility() {
        var promoWrap = document.getElementById('promoWrap');
        var qtyWrap = document.getElementById('qtyWrap');
        if (!promoWrap && !qtyWrap) { return; }

        var items = getCart();
        var hasCase = items.some(isCase);

        if (qtyWrap) { qtyWrap.style.display = hasCase ? '' : 'none'; }
        if (promoWrap) { promoWrap.style.display = 'block'; }

        var qty = document.getElementById('qty');
        if (qty && hasCase && !qtyTouched) {
            var maxQ = items.reduce(function (m, it) {
                return isCase(it) ? Math.max(m, it.qty || 1) : m;
            }, 1);
            qty.value = maxQ;
        }
    }

    /* ================= РћРўРџР РђР’РљРђ Р—РђРљРђР—Рђ ================= */
    function getApiUrl(){ return DEFAULT_API; }

    function submitOrder(form) {
        var btn = form.querySelector('button[type="submit"]');
        var items = getCart();

        if (!items.length) {
            showResult('РљРѕСЂР·РёРЅР° РїСѓСЃС‚Р° - РґРѕР±Р°РІСЊС‚Рµ С‚РѕРІР°СЂС‹', false);
            return;
        }
        var nick = (form.nick && form.nick.value || '').trim();
        if (!nick) {
            showResult('РЈРєР°Р¶РёС‚Рµ РЅРёРє РёРіСЂРѕРєР°', false);
            if (form.nick) { form.nick.focus(); }
            return;
        }
        if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) {
            showResult('РќРёРє РёРіСЂРѕРєР°: 3-16 СЃРёРјРІРѕР»РѕРІ, Р»Р°С‚РёРЅРёС†Р°, С†РёС„СЂС‹ Рё РїРѕРґС‡РµСЂРєРёРІР°РЅРёРµ', false);
            if (form.nick) { form.nick.focus(); }
            return;
        }

        var promo = (form.promo && form.promo.value || '').trim().toUpperCase();
        var qty = 1;
        if (form.qty) { qty = Math.max(1, Math.min(999, parseInt(form.qty.value || '1', 10) || 1)); }

        var payload = items.map(function (it) {
            var amount = 1;
            if (isCase(it)) { amount = qty; }
            return {
                kind: it.kind,
                group: it.group || 'premium',
                amount: amount
            };
        });

        sendToGive(nick, payload, promo, btn);
    }

    function sendToGive(nick, payload, promo, btn) {
        var url = getApiUrl();

        if (btn) { btn.disabled = true; btn.textContent = 'РћС‚РїСЂР°РІР»СЏРµРј...'; }

        fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: nick, items: payload, promo_code: promo || '' })
        })
        .then(function (r) {
            return r.json().catch(function () {
                throw new Error('РЎРµСЂРІРёСЃ РІРµСЂРЅСѓР» РЅРµ-JSON (HTTP ' + r.status + ')');
            });
        })
        .then(function (j) {
            if (j && j.ok) {
                showResult('Р—Р°РєР°Р· РІС‹РїРѕР»РЅРµРЅ! ' + (j.message || ''), true);
                saveCart([]);
                renderCartPage();
            } else {
                showResult((j && (j.message || j.error)) || 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ Р·Р°РєР°Р·', false);
            }
            if (btn) { btn.disabled = false; btn.textContent = 'РћС„РѕСЂРјРёС‚СЊ Р·Р°РєР°Р·'; }
        })
        .catch(function (e) {
            showResult('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРІСЏР·Р°С‚СЊСЃСЏ СЃ СЃРµСЂРІРёСЃРѕРј РІС‹РґР°С‡Рё (' + url + '). РЈР±РµРґРёС‚РµСЃСЊ, С‡С‚Рѕ Р·Р°РїСѓС‰РµРЅ site.bat (РёР»Рё give_app.py РѕС‚РґРµР»СЊРЅРѕ).', false);
            if (window.console) { console.error(e); }
            if (btn) { btn.disabled = false; btn.textContent = 'РћС„РѕСЂРјРёС‚СЊ Р·Р°РєР°Р·'; }
        });
    }

    function showResult(text, ok) {
        var el = document.getElementById('orderResult');
        if (!el) {
            el = document.createElement('div');
            el.id = 'orderResult';
            var wrap = $('.cart-page') || document.body;
            wrap.appendChild(el);
        }
        el.textContent = text;
        el.className = 'order-result ' + (ok ? 'ok' : 'bad');
        el.style.display = 'block';
    }

    /* ================= РќРђРЎРўР РћР™РљР РџРћР”РљР›Р®Р§Р•РќРРЇ ================= */
    function bindApiSettings() {
        var input = document.getElementById('apiUrl');
        if (!input) { return; }
        input.value = getApiUrl();
        input.addEventListener('change', function () {
            var v = input.value.trim();
            if (v) { writeStore(API_KEY, v); } else { writeStore(API_KEY, ''); }
            input.value = getApiUrl();
        });
    }

    /* ================= РРќРР¦РРђР›РР—РђР¦РРЇ ================= */
    refreshCartBadge();
    bindBuyButtons();
    

    var cartForm = document.getElementById('orderForm');
    if (cartForm) {
        cartForm.addEventListener('submit', function (e) {
            e.preventDefault();
            submitOrder(cartForm);
        });
    }
    var qtyInput = document.getElementById('qty');
    if (qtyInput) {
        qtyInput.addEventListener('input', function () { qtyTouched = true; });
    }

    renderCartPage();
})();
