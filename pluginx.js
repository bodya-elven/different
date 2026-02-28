(function () {
    'use strict';

    function startPlugin() {
        // 1. Запобіжник від подвійного завантаження
        if (window.my_custom_test_plugin_ready) return;
        window.my_custom_test_plugin_ready = true;

        // 2. Реєструємо компонент ТІЛЬКИ коли функція викликана
        function CustomCatalog(object) {
            var html = $('<div><div style="color:white; padding: 50px; font-size: 20px;">Якщо ти це бачиш — каркас працює!</div></div>');

            this.create = function () {
                Lampa.Controller.add('content', {
                    toggle: function () { Lampa.Controller.collectionSet(html); },
                    left: function () { Lampa.Controller.toggle('menu'); },
                    up: function () {},
                    down: function () {},
                    right: function () {}
                });
                Lampa.Controller.toggle('content');
                return this.render();
            };

            this.render = function () { return html; };
            this.destroy = function () { html.remove(); };
            this.start = function () {};
            this.pause = function () {};
            this.stop = function () {};
        }

        Lampa.Component.add('custom_catalog_comp', CustomCatalog);

        // 3. Функція додавання кнопки в меню
        function addMenu() {
            var menuList = $('.menu .menu__list').eq(0);
            if (!menuList.length) return;
            
            // Перевіряємо, чи немає вже такої кнопки
            if (menuList.find('[data-action="my_custom_catalog"]').length === 0) {
                var myMenu = '<li class="menu__item selector" data-action="my_custom_catalog">' +
                             '<div class="menu__text">Мій Каталог (Тест)</div>' +
                             '</li>';
                
                menuList.append(myMenu);

                $('.menu__item[data-action="my_custom_catalog"]').on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: 'Тестова сторінка',
                        component: 'custom_catalog_comp',
                        page: 1
                    });
                });
            }
        }

        // 4. Правильно ловимо момент для додавання меню
        if (window.appready) {
            addMenu();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') addMenu();
            });
        }
    }

    // Запускаємо плагін з мікро-затримкою, щоб ядро Lampa точно встигло завантажитись
    setTimeout(startPlugin, 100);
})();
