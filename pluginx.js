(function () {
    'use strict';

    function startPlugin() {
        if (window.my_custom_perfect_plugin_ready) return;
        window.my_custom_perfect_plugin_ready = true;

        // БЕЗПЕЧНИЙ CSS (Тільки візуальне оформлення, не ламає скрол Lampa)
        var css = '<style>' +
            '.my-youtube-style .card { width: 100% !important; margin-bottom: 20px !important; }' +
            '.my-youtube-style .card__view { padding-bottom: 56.25% !important; border-radius: 12px !important; }' +
            '.my-youtube-style .card__img { object-fit: cover !important; }' +
            '.my-youtube-style .card__title { white-space: normal !important; text-align: left !important; line-height: 1.4 !important; height: auto !important; padding-top: 10px !important; }' +
            '.my-youtube-style .card__age, .my-youtube-style .card__textbox { display: none !important; }' +
            '</style>';
        $('body').append(css);

        // ГОЛОВНИЙ КОМПОНЕНТ КАТАЛОГУ (Як в AdultJS)
        function CustomCatalog(object) {
            // Використовуємо рідний клас Lampa
            var comp = new Lampa.InteractionCategory(object);
            var network = new Lampa.Reguest();

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);

                // ЗАМІНИ НА СВІЙ ДОМЕН (залиш одинарні лапки)
                var url = 'https://w.porno365.gold/'; 

                network.silent(url, function (htmlText) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(htmlText, 'text/html');
                    
                    // Парсимо блоки як в конфігах AdultJS
                    var elements = doc.querySelectorAll('li.video_block, li.trailer');
                    var results = [];

                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];
                        var linkEl = el.querySelector('a.image');
                        var titleEl = el.querySelector('a.image p, .title');
                        var imgEl = el.querySelector('img'); 

                        if (linkEl && titleEl) {
                            var imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('src')) : '';
                            if (imgSrc && imgSrc.indexOf('//') === 0) imgSrc = 'https:' + imgSrc;

                            // ВАЖЛИВО: Задаємо ключі точно так, як вимагає ядро Lampa
                            results.push({
                                name: titleEl.innerText.trim(), // Lampa використовує name для карток
                                url: linkEl.getAttribute('href'),
                                picture: imgSrc,
                                background_image: imgSrc,
                                img: imgSrc
                            });
                        }
                    }

                    if (results.length > 0) {
                        // Віддаємо дані вбудованому будівнику Lampa
                        _this.build({ results: results, collection: true });
                        
                        // Застосовуємо наш CSS-клас до контейнера, який створила Lampa
                        _this.render().addClass('my-youtube-style');
                        
                        _this.activity.loader(false);
                    } else {
                        _this.empty();
                    }
                }, this.empty.bind(this), false, { dataType: 'text' });
            };

            // Заглушка для пагінації (щоб не було помилок при скролі до низу)
            comp.nextPageReuest = function (object, resolve, reject) {
                resolve({ results: [] }); 
            };

            // НАЙГОЛОВНІШЕ: Перехоплюємо рендер картки, як в AdultJS
            comp.cardRender = function (card, element, events) {
                // Вимикаємо стандартну дію (відкриття сторінки фільму) і вішаємо свою
                events.onEnter = function () {
                    Lampa.Activity.loader(true);
                    
                    network.silent(element.url, function(videoPageHtml) {
                        Lampa.Activity.loader(false);
                        var p = new DOMParser();
                        var d = p.parseFromString(videoPageHtml, 'text/html');
                        var videoStreams = [];
                        
                        // Парсимо якості відео
                        var qLinks = d.querySelectorAll('.quality_chooser a');
                        for (var j = 0; j < qLinks.length; j++) {
                            videoStreams.push({ 
                                title: qLinks[j].innerText.trim() || qLinks[j].getAttribute('data-quality'), 
                                url: qLinks[j].getAttribute('href') 
                            });
                        }
                        
                        // Резервний пошук
                        if (videoStreams.length === 0) {
                            var mainPlayBtn = d.querySelector('a.btn-play.play-video');
                            if (mainPlayBtn) {
                                videoStreams.push({ title: 'Оригінал', url: mainPlayBtn.getAttribute('href') });
                            }
                        }
                        
                        // Запуск плеєра
                        if (videoStreams.length > 0) {
                            var bestStream = videoStreams[videoStreams.length - 1];
                            Lampa.Player.play({ title: element.name, url: bestStream.url, quality: videoStreams });
                            Lampa.Player.playlist([{ title: element.name, url: bestStream.url, quality: videoStreams }]);
                        } else {
                            Lampa.Noty.show('Не знайдено посилання на відео');
                        }
                    }, function() { 
                        Lampa.Activity.loader(false); 
                        Lampa.Noty.show('Помилка завантаження плеєра'); 
                    }, false, { dataType: 'text' });
                };
            };

            return comp;
        }

        Lampa.Component.add('custom_catalog_comp', CustomCatalog);

        // ДОДАВАННЯ МЕНЮ
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
