(function () {
    'use strict';

    function startPlugin() {
        if (window.my_custom_test_plugin_ready) return;
        window.my_custom_test_plugin_ready = true;

        function CustomCatalog(object) {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({ mask: true, over: true });
            var html = $('<div></div>');
            var items = [];

            this.create = function () {
                html.append(scroll.render());
                this.load();
                return this.render();
            };

            this.load = function () {
                var _this = this;
                // ЗАМІНИ НА СВІЙ ДОМЕН (залиш одинарні лапки)
                var url = 'https://w.porno365.gold/'; 
                
                network.silent(url, function (str) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(str, 'text/html');
                    var elements = doc.querySelectorAll('li.video_block');
                    var results = [];
                    
                    for (var i = 0; i < elements.length; i++) {
                        var titleEl = elements[i].querySelector('a.image p');
                        var linkEl = elements[i].querySelector('a.image');
                        if (titleEl && linkEl) {
                            results.push({
                                title: titleEl.innerText.trim(),
                                url: linkEl.getAttribute('href'),
                                // Тимчасова порожня картинка
                                img: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                            });
                        }
                    }
                    
                    if (results.length > 0) {
                        _this.build(results);
                    } else {
                        html.append('<div style="color:white; padding: 20px;">Нічого не знайдено на сайті</div>');
                    }
                }, function() {
                    html.append('<div style="color:white; padding: 20px;">Помилка мережевого запиту</div>');
                }, false, { dataType: 'text' });
            };

            this.build = function (data) {
                for (var i = 0; i < data.length; i++) {
                    var card = new Lampa.Card(data[i], { card_category: false });
                    card.create();
                    scroll.append(card.render());
                    items.push(card);
                }

                // Стандартна прив'язка до контролера Lampa
                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(items.length ? items[0].render()[0] : false, scroll.render());
                    },
                    left: function () { Lampa.Controller.toggle('menu'); },
                    right: function () { Lampa.Controller.collectionFocus(false, scroll.render()).right; },
                    up: function () { Lampa.Controller.collectionFocus(false, scroll.render()).up; },
                    down: function () { Lampa.Controller.collectionFocus(false, scroll.render()).down; }
                });
                Lampa.Controller.toggle('content');
            };

            this.render = function () { return html; };
            this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); items = null; };
            this.start = function () {};
            this.pause = function () {};
            this.stop = function () {};
        }

        Lampa.Component.add('custom_catalog_comp', CustomCatalog);

        function addMenu() {
            var menuList = $('.menu .menu__list').eq(0);
            if (!menuList.length) return;
            if (menuList.find('[data-action="my_custom_catalog"]').length === 0) {
                var myMenu = '<li class="menu__item selector" data-action="my_custom_catalog"><div class="menu__text">Мій Каталог</div></li>';
                menuList.append(myMenu);
                $('.menu__item[data-action="my_custom_catalog"]').on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: 'Мій Каталог',
                        component: 'custom_catalog_comp',
                        page: 1
                    });
                });
            }
        }

        if (window.appready) addMenu();
        else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') addMenu(); });
    }

    setTimeout(startPlugin, 100);
})();
