/* -*- coding: utf-8 -*-
 * NenlyMine - script.js
 * 1) Тема (localStorage "nenlymine-theme", атрибут data-theme на <html>)
 * 2) Мобильное меню (.hamburger / .nav.open)
 * 3) КОРЗИНА (localStorage "nenlymine-cart"):
 *    - кнопки ".btn-add-cart" на карточках, счётчик "#cartBadge" в шапке
 *    - страница cart.html: ник + количество (кейсы) + промокод
 * 4) Отправка заказа в локальный give_app.py (POST /give, {nick, items[], promo_code})
 */
(function () {
    'use strict';

    var THEME_KEY = 'nenlymine-theme';
    var CART_KEY = 'nenlymine-cart';
    var API_KEY = 'nenlymine-api';
    var DEFAULT_API = 'http://127.0.0.1:9898/give';

    var CASE_KINDS = { case: 1, seasoncase: 1, weeklycase: 1, titlecase: 1 };

    var GROUP_NAMES = {
        premium: 'Премиум', creative: 'Креатив', straj: 'Страж',
        lord: 'Лорд', delux: 'Делюкс', tsar: 'Царь',
        imperator: 'Император', legenda: 'Легенда',
        povelitel: 'Повелитель', vlastelin: 'Властелин',
        vladika: 'Владыка'
    };

    var CASE_NAMES = {
        case: 'Кейс', seasoncase: 'Сезонный кейс',
        weeklycase: 'Недельный кейс', titlecase: 'Титульный кейс'
    };

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    /* ================= ТЕМА ================= */
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

    /* ================= МОБИЛЬНОЕ МЕНЮ ================= */
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

    /* ================= ХРАНИЛИЩЕ ================= */
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

    /* ================= СЧЁТЧИК ================= */
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

    /* ================= ТОСТ ================= */
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

    /* ================= ДОБАВЛЕНИЕ ================= */
    function addToCart(item) {
        var items = getCart();
        var id = itemId(item);
        var found = null;
        for (var i = 0; i < items.length; i++) {
            if (itemId(items[i]) === id) { found = items[i]; break; }
        }
        if (found) {
            /* Привилегия и тег выдаются один раз - количество не копится. */
            if (isCase(found)) { found.qty = (found.qty || 1) + (item.qty || 1); }
            toast('Уже в корзине: ' + (found.label || ''));
        } else {
            item.qty = item.qty || 1;
            items.push(item);
            toast('Добавлено в корзину: ' + (item.label || ''));
        }
        saveCart(items);
    }

    function removeAt(index) {
        var items = getCart();
        if (index < 0 || index >= items.length) { return; }
        var removed = items.splice(index, 1)[0];
        saveCart(items);
        renderCartPage();
        toast('Удалено: ' + (removed.label || ''));
    }

    /* --------- Кнопки "В корзину" на карточках ---------
       На элементе с .btn-add-cart (или на самой карточке):
         data-kind  = group|tag|case|seasoncase|weeklycase|titlecase
         data-group = внутренняя группа (для kind=group)
         data-label = название для показа
         data-price = цена в рублях (необязательно) */
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
                          : kind === 'tag' ? 'Тег'
                          : (CASE_NAMES[kind] || 'Товар');
                }
                addToCart({ kind: kind, group: group, label: label, price: price, qty: qty });
            });
        });
    }

    /* ================= СТРАНИЦА КОРЗИНЫ ================= */
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
            if (sumEl) { sumEl.textContent = '0 ₽'; }
            return;
        }

        if (emptyEl) { emptyEl.style.display = 'none'; }
        if (formEl) { formEl.style.display = 'block'; }

        /* Список позиций (DOM, без innerHTML - безопасно для ника/названий) */
        listEl.textContent = '';
        var total = 0;
        items.forEach(function (it, idx) {
            total += (isCase(it) ? (it.qty || 1) : 1) * (it.price || 0);

            var row = document.createElement('div');
            row.className = 'cart-item';

            var badge = document.createElement('span');
            badge.className = 'cart-kind ' + (isCase(it) ? 'is-case' : (it.kind === 'tag' ? 'is-tag' : 'is-group'));
            badge.textContent = it.kind === 'group' ? 'Привилегия'
                             : it.kind === 'tag' ? 'Тег'
                             : 'Кейс';
            row.appendChild(badge);

            var info = document.createElement('div');
            info.className = 'cart-item-info';

            var name = document.createElement('div');
            name.className = 'cart-item-name';
            name.textContent = it.label || 'Товар';
            info.appendChild(name);

            var meta = document.createElement('div');
            meta.className = 'cart-item-meta';
            var parts = [];
            if (isCase(it) && it.qty > 1) { parts.push('в корзине: ' + it.qty + ' шт.'); }
            if (it.price) { parts.push(it.price.toLocaleString('ru-RU') + ' ₽'); }
            meta.textContent = parts.join(' • ');
            if (!parts.length) { meta.style.display = 'none'; }
            info.appendChild(meta);
            row.appendChild(info);

            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'cart-del';
            del.setAttribute('aria-label', 'Удалить товар');
            del.textContent = '×';
            del.addEventListener('click', function () { removeAt(idx); });
            row.appendChild(del);

            listEl.appendChild(row);
        });

        if (sumEl) { sumEl.textContent = total.toLocaleString('ru-RU') + ' ₽'; }
        bindPromoVisibility();
    }

    /* Поля формы зависят от содержимого корзины:
       - есть кейс  -> показываем количество
       - есть кейс/привилегия/тег -> показываем промокод */
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

    /* ================= ОТПРАВКА ЗАКАЗА ================= */
    function getApiUrl() {
        var v = readStore(API_KEY, '');
        return (typeof v === 'string' && v) ? v : DEFAULT_API;
    }

    function submitOrder(form) {
        var btn = form.querySelector('button[type="submit"]');
        var items = getCart();

        if (!items.length) {
            showResult('Корзина пуста - добавьте товары', false);
            return;
        }
        var nick = (form.nick && form.nick.value || '').trim();
        if (!nick) {
            showResult('Укажите ник игрока', false);
            if (form.nick) { form.nick.focus(); }
            return;
        }
        if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) {
            showResult('Ник Minecraft: 3-16 символов, латиница, цифры и _', false);
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

        /* Страница по HTTPS не может обратиться к http - блокировка mixed content. */
        if (window.location.protocol === 'https:' && url.indexOf('http://') === 0) {
            showResult('Страница открыта по HTTPS, а сервис выдачи доступен по HTTP - браузер блокирует запрос. Откройте сайт локально (site.bat) или укажите HTTPS-адрес сервиса в настройках подключения.', false);
            if (btn) { btn.disabled = false; btn.textContent = 'Оформить заказ'; }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Отправляем...'; }

        fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: nick, items: payload, promo_code: promo || '' })
        })
        .then(function (r) {
            return r.json().catch(function () {
                throw new Error('Сервис вернул не-JSON (HTTP ' + r.status + ')');
            });
        })
        .then(function (j) {
            if (j && j.ok) {
                showResult('Заказ выполнен! ' + (j.message || ''), true);
                saveCart([]);
                renderCartPage();
            } else {
                showResult((j && (j.message || j.error)) || 'Не удалось выполнить заказ', false);
            }
            if (btn) { btn.disabled = false; btn.textContent = 'Оформить заказ'; }
        })
        .catch(function (e) {
            showResult('Не удалось связаться с сервисом выдачи. Проверьте, что give_app.py запущен, и адрес в настройках подключения: ' + url, false);
            if (window.console) { console.error(e); }
            if (btn) { btn.disabled = false; btn.textContent = 'Оформить заказ'; }
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

    /* ================= НАСТРОЙКИ ПОДКЛЮЧЕНИЯ ================= */
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

    /* ================= ИНИЦИАЛИЗАЦИЯ ================= */
    refreshCartBadge();
    bindBuyButtons();
    bindApiSettings();

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
