(function () {
    var STORAGE_KEY = 'nenlymine-theme';

    /* ---------- Тема ---------- */
    function applyTheme(theme) {
        var root = document.documentElement;
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    }

    function onToggle() {
        var root = document.documentElement;
        var current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (e) {}
    }

    var btn = document.getElementById('themeToggle');
    if (btn) {
        btn.addEventListener('click', onToggle);
    }

    /* ---------- Мобильное меню ---------- */
    var menuBtn = document.getElementById('menuToggle');
    var nav = document.querySelector('.nav');

    function closeMenu() {
        if (nav) {
            nav.classList.remove('open');
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
        });

        nav.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', function (e) {
            if (nav.contains(e.target) || menuBtn.contains(e.target)) {
                return;
            }
            closeMenu();
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 720) {
                closeMenu();
            }
        });
    }
})();