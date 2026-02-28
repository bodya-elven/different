(function () {
    'use strict';

    // 1. ДОДАЄМО КНОПКУ В МЕНЮ
    Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {
            var myMenu = '<li class="menu__item selector" data-action="my_custom_catalog">' +
                         '<div class="menu__ico">' +
                         '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' +
                         '</div>' +
                         '<div class="menu__text">Мій Каталог</div>' +
                         '</li>';

            $('.menu .menu__list').eq(0).append(myMenu);

            $('.menu__item[data-action="my_custom_catalog"]').on('hover:enter', function () {
                Lampa.Activity.push({
                    // ЗАМІНИ НАСТУПНИЙ РЯДОК НА СВІЙ ДОМЕН (залиш одинарні лапки)
                    url: 'https://w.porno365.gold/', 
                    title: 'Мій Каталог',
                    component: 'custom_catalog_comp',
                    page: 1
                });
            });
        }
    });

    // 2. СТВОРЮЄМО КОМПОНЕНТ КАТАЛОГУ
    function CustomCatalog(object) {
        var network = new Lampa.Reguest(); // Так, з помилкою в слові Reguest, це норма для Lampa
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var html    = $('<div></div>');
        var body    = $('<div class="category-full"></div>');
        var items   = [];

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            this.load();
            return this.render();
        };

        this.load = function () {
            // Беремо прямий лінк без додавання сторінок
            var url = object.url; 
            
            network.silent(url, this.parseHTML.bind(this), function () {
                Lampa.Noty.show('Помилка завантаження сайту');
            }, false, { dataType: 'text' });
        };

        // 3. ПАРСИНГ ГОЛОВНОЇ СТОРІНКИ (КАТАЛОГУ)
        this.parseHTML = function (responseText) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(responseText, 'text/html');
            var results = [];

            // Шукаємо блоки відео (класи взяті з твоїх скріншотів)
            var elements = doc.querySelectorAll('li.video_block'); 

            elements.forEach(function(el) {
                var linkEl = el.querySelector('a.image'); 
                var imgEl = el.querySelector('div.tumba img');   
                var titleEl = el.querySelector('a.image p');    

                if (linkEl && imgEl && titleEl) {
                    results.push({
                        title: titleEl.innerText.trim(),
                        img: imgEl.getAttribute('src'), // Виправлено picture на img
                        url: linkEl.getAttribute('href')
                    });
                }
            });

            this.build(results);
        };

        // 4. ПОБУДОВА КАРТОК ТА ЗАПУСК ПЛЕЄРА
        this.build = function (data) {
            if (data.length === 0) return Lampa.Noty.show('Нічого не знайдено');

            data.forEach(function (element) {
                var card = new Lampa.Card(element, { card_category: true });
                card.create();
                
                // ОБРОБКА КЛІКУ ПО КАРТЦІ
                card.render().on('hover:enter', function () {
                    network.silent(element.url, function(videoPageHtml) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(videoPageHtml, 'text/html');
                        var videoStreams = []; 

                        // Крок 1: Шукаємо якості відео
                        var qualityLinks = doc.querySelectorAll('.quality_chooser a');
                        qualityLinks.forEach(function(link) {
                            var videoUrl = link.getAttribute('href');
                            var qualityName = link.innerText.trim() || link.getAttribute('data-quality');
                            if (videoUrl) {
                                videoStreams.push({ title: qualityName || 'Відео', url: videoUrl });
                            }
                        });

                        // Крок 2: Резервний варіант - шукаємо лінк у головній кнопці Play
                        if (videoStreams.length === 0) {
                            var mainPlayBtn = doc.querySelector('a.btn-play.play-video');
                            if (mainPlayBtn) {
                                var mainUrl = mainPlayBtn.getAttribute('href');
                                if (mainUrl) videoStreams.push({ title: 'Оригінал', url: mainUrl });
                            }
                        }

                        // Крок 3: Запуск плеєра Lampa
                        if (videoStreams.length > 0) {
                            var playlist = [{
                                title: element.title,
                                url: videoStreams[0].url,
                                quality: videoStreams
                            }];
                            Lampa.Player.play(playlist[0]);
                            Lampa.Player.playlist(playlist);
                        } else {
                            Lampa.Noty.show('Не знайдено посилання на плеєр');
                        }
                    }, false, false, { dataType: 'text' });
                });

                body.append(card.render());
                items.push(card);
            });

            // Навігація по сітці (керування пультом)
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(items.length ? items[0].render()[0] : false, html);
                },
                left: function () { if (Lampa.Controller.collectionFocus(false, html).left) Lampa.Controller.toggle('menu'); },
                up: function () {}, down: function () {}, right: function () { Lampa.Controller.collectionFocus(false, html).right; }
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function () { return html; };
        this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); items = null; };
        
        // 5. ДОДАНІ МЕТОДИ ЖИТТЄВОГО ЦИКЛУ (ЩОБ НЕ БУЛО ЗЕЛЕНОГО ЕКРАНУ)
        this.start = function () {};
        this.pause = function () {};
        this.stop = function () {};
    }

    Lampa.Component.add('custom_catalog_comp', CustomCatalog);
})();
