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

            var baseUrl = 'https://w.porno365.gold/'; // ← ЗАМІНИ НА СВІЙ ДОМЕН, якщо треба

            this.create = function () {
                html.append(scroll.render());
                this.load();
                return this.render();
            };

            this.load = function () {
                var _this = this;

                var params = {
                    dataType: 'text',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
                    }
                };

                network.silent(baseUrl, function (str) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(str, 'text/html');

                    // Більш гнучкі селектори (на випадок зміни верстки)
                    var elements = doc.querySelectorAll('li.video_block, .video_block, .item, .video-item, div.video, li.video');

                    var results = [];

                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];

                        var titleEl = el.querySelector('a.image p, p.title, .title, h3, .name, .video-title');
                        var linkEl = el.querySelector('a.image, a[href*="movie"], a');
                        var imgEl   = el.querySelector('img');

                        if (titleEl && linkEl) {
                            var title = (titleEl.innerText || titleEl.textContent || '').trim();

                            var href = linkEl.getAttribute('href') || '';
                            var fullUrl = href.startsWith('http') 
                                ? href 
                                : baseUrl.replace(/\/$/, '') + (href.startsWith('/') ? href : '/' + href);

                            var img = '';
                            if (imgEl) {
                                img = imgEl.getAttribute('data-src') ||
                                      imgEl.getAttribute('data-lazy') ||
                                      imgEl.getAttribute('data-original') ||
                                      imgEl.getAttribute('src') || '';
                            }

                            if (img && !img.startsWith('http')) {
                                img = baseUrl.replace(/\/$/, '') + (img.startsWith('/') ? img : '/' + img);
                            }

                            results.push({
                                title: title,
                                url: fullUrl,
                                poster: img || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                                img: img || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                            });
                        }
                    }

                    if (results.length > 0) {
                        _this.build(results);
                    } else {
                        html.append('<div style="color:#ff4444; padding: 30px; text-align:center;">Нічого не знайдено.<br>Можливо, змінилася структура сайту.</div>');
                    }
                }, function () {
                    html.append('<div style="color:#ff4444; padding: 30px; text-align:center;">Помилка завантаження сайту.<br>Перевірте інтернет або домен.</div>');
                }, false, params);
            };

            this.build = function (data) {
                items = [];

                for (var i = 0; i < data.length; i++) {
                    var card = new Lampa.Card(data[i], { card_category: false });
                    card.create();
                    scroll.append(card.render());
                    items.push(card);
                }

                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(items.length ? items[0].render()[0] : false, scroll.render());
                    },
                    left: function () { Lampa.Controller.toggle('menu'); },
                    right: function () { Lampa.Controller.collectionFocus(false, scroll.render()).right(); },
                    up: function () { Lampa.Controller.collectionFocus(false, scroll.render()).up(); },
                    down: function () { Lampa.Controller.collectionFocus(false, scroll.render()).down(); }
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
                var myMenu = '<li class="menu__item selector" data-action="my_custom_catalog"><div class="menu__text">Мій Каталог (Porno365)</div></li>';
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
