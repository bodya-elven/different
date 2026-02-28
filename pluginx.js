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
                var url = 'https://w.porno365.gold/'; // <--- Встав свій домен
                
                network.silent(url, function (htmlText) {
                    if (!htmlText) return Lampa.Noty.show('Порожня відповідь');
                    
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(htmlText, 'text/html');
                    var elements = doc.querySelectorAll('li.video_block');
                    var results = [];
                    
                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];
                        var linkEl = el.querySelector('a.image');
                        var titleEl = el.querySelector('a.image p');
                        var imgEl = el.querySelector('div.tumba img'); // Беремо постер одразу
                        
                        if (linkEl && titleEl) {
                            var imgSrc = imgEl ? imgEl.getAttribute('src') : '';
                            if (imgSrc && imgSrc.indexOf('//') === 0) imgSrc = 'https:' + imgSrc;
                            
                            results.push({
                                title: titleEl.innerText.trim(),
                                url: linkEl.getAttribute('href'),
                                img: imgSrc // Передаємо картинку в стандартну картку
                            });
                        }
                    }
                    
                    if (results.length > 0) {
                        _this.build(results);
                    } else {
                        Lampa.Noty.show('Не знайдено відео');
                    }
                }, function() { Lampa.Noty.show('Помилка мережі'); }, false, { dataType: 'text' });
            };

            this.build = function (data) {
                for (var i = 0; i < data.length; i++) {
                    (function(element) {
                        var card = new Lampa.Card(element, { card_category: false });
                        card.create();
                        
                        card.render().on('hover:enter', function () {
                            Lampa.Activity.loader(true);
                            network.silent(element.url, function(vHtml) {
                                Lampa.Activity.loader(false);
                                if (!vHtml) return Lampa.Noty.show('Помилка завантаження');
                                
                                var p = new DOMParser();
                                var d = p.parseFromString(vHtml, 'text/html');
                                var videoStreams = [];
                                
                                var qLinks = d.querySelectorAll('.quality_chooser a');
                                for (var j = 0; j < qLinks.length; j++) {
                                    videoStreams.push({ title: qLinks[j].innerText.trim(), url: qLinks[j].getAttribute('href') });
                                }
                                
                                if (videoStreams.length === 0) {
                                    var mainPlayBtn = d.querySelector('a.btn-play.play-video');
                                    if (mainPlayBtn) {
                                        var mainUrl = mainPlayBtn.getAttribute('href');
                                        if (mainUrl) videoStreams.push({ title: 'Оригінал', url: mainUrl });
                                    }
                                }
                                
                                if (videoStreams.length > 0) {
                                    var bestStream = videoStreams[videoStreams.length - 1];
                                    Lampa.Player.play({ title: element.title, url: bestStream.url, quality: videoStreams });
                                    Lampa.Player.playlist([{ title: element.title, url: bestStream.url, quality: videoStreams }]);
                                } else {
                                    Lampa.Noty.show('Не знайдено відео');
                                }
                            }, function() { 
                                Lampa.Activity.loader(false); 
                            }, false, { dataType: 'text' });
                        });

                        scroll.append(card.render());
                        items.push(card);
                    })(data[i]);
                }

                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(items.length ? items[0].render()[0] : false, scroll.render());
                    },
                    up: function () { Lampa.Controller.collectionFocus(false, scroll.render()).up; },
                    down: function () { Lampa.Controller.collectionFocus(false, scroll.render()).down; },
                    left: function () { Lampa.Controller.toggle('menu'); },
                    right: function () { Lampa.Controller.collectionFocus(false, scroll.render()).right; }
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
