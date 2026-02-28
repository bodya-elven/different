(function () {
    'use strict';

    // CSS: Лише безпечні стилі, які не ламають математику Lampa
    var customCss = `
    <style>
        /* Застосовуємо дизайн 1-ї колонки лише для мобільних екранів */
        @media (max-width: 768px) {
            .my-custom-wide-card {
                width: 100% !important;
                padding: 10px !important;
                /* Важливо: не змінюємо float, щоб Lampa могла рахувати сітку */
            }
            .my-custom-wide-card .card__view {
                padding-bottom: 56.25% !important; /* Пропорція 16:9 */
                border-radius: 12px !important;
            }
            .my-custom-wide-card .card__img {
                object-fit: cover !important;
                width: 100% !important;
                height: 100% !important;
            }
            .my-custom-wide-card .card__title {
                white-space: normal !important;
                line-height: 1.4 !important;
                height: auto !important;
                text-align: left !important;
                padding-top: 8px !important;
            }
            /* Ховаємо вік та рейтинг */
            .my-custom-wide-card .card__age, 
            .my-custom-wide-card .card__textbox {
                display: none !important;
            }
        }
    </style>
    `;
    $('body').append(customCss);

    // 1. Кнопка в меню
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
                    url: 'https://w.porno365.gold/feed.xml', // <--- ВСТАВ ПОСИЛАННЯ НА RSS
                    title: 'Мій Каталог',
                    component: 'custom_catalog_comp',
                    page: 1
                });
            });
        }
    });

    // 2. Компонент каталогу
    function CustomCatalog(object) {
        var network = new Lampa.Reguest(); 
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var html    = $('<div></div>');
        var body    = $('<div class="category-full"></div>'); // Стандартний контейнер
        var items   = [];

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            this.load();
            return this.render();
        };

        this.load = function () {
            var url = object.url; 
            network.silent(url, this.parseRSS.bind(this), function () {
                Lampa.Noty.show('Помилка завантаження RSS');
            }, false, { dataType: 'text' });
        };

        this.parseRSS = function (xmlText) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(xmlText, "text/xml");
            var elements = xmlDoc.querySelectorAll('item');
            var results = [];

            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];
                var titleEl = el.querySelector('title');
                var linkEl = el.querySelector('link');
                var descEl = el.querySelector('description');

                if (titleEl && linkEl) {
                    var img = '';
                    if (descEl) {
                        // Надійний Regex для пошуку посилання на картинку в CDATA
                        var match = descEl.textContent.match(/<img[^>]+src=["']([^"']+)["']/i);
                        if (match && match[1]) {
                            img = match[1];
                            if (img.indexOf('//') === 0) img = 'https:' + img;
                        }
                    }

                    results.push({
                        title: titleEl.textContent.trim(),
                        img: img, // Lampa використовує img для карток
                        url: linkEl.textContent.trim()
                    });
                }
            }
            this.build(results);
        };

        this.build = function (data) {
            if (data.length === 0) return Lampa.Noty.show('Нічого не знайдено');

            for (var i = 0; i < data.length; i++) {
                var element = data[i];
                var card = new Lampa.Card(element, {}); // Стандартна картка
                card.create();
                
                // Додаємо клас для нашого CSS (щоб змінити вигляд на телефонах)
                card.render().addClass('my-custom-wide-card');
                
                (function(currentElement) {
                    card.render().on('hover:enter', function () {
                        network.silent(currentElement.url, function(videoPageHtml) {
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(videoPageHtml, 'text/html');
                            var videoStreams = []; 

                            var qualityLinks = doc.querySelectorAll('.quality_chooser a');
                            for (var j = 0; j < qualityLinks.length; j++) {
                                var link = qualityLinks[j];
                                var videoUrl = link.getAttribute('href');
                                var qualityName = link.innerText.trim() || link.getAttribute('data-quality');
                                if (videoUrl) {
                                    videoStreams.push({ title: qualityName || 'Відео', url: videoUrl });
                                }
                            }

                            if (videoStreams.length === 0) {
                                var mainPlayBtn = doc.querySelector('a.btn-play.play-video');
                                if (mainPlayBtn) {
                                    var mainUrl = mainPlayBtn.getAttribute('href');
                                    if (mainUrl) videoStreams.push({ title: 'Оригінал', url: mainUrl });
                                }
                            }

                            if (videoStreams.length > 0) {
                                var bestStream = videoStreams[videoStreams.length - 1];
                                var playlist = [{
                                    title: currentElement.title,
                                    url: bestStream.url, 
                                    quality: videoStreams 
                                }];
                                
                                Lampa.Player.play(playlist[0]);
                                Lampa.Player.playlist(playlist);
                            } else {
                                Lampa.Noty.show('Не знайдено посилання на плеєр');
                            }
                        }, false, false, { dataType: 'text' });
                    });
                })(element);

                body.append(card.render());
                items.push(card);
            }

            // Стандартна прив'язка до контролера Lampa (відновлює скрол)
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(items.length ? items[0].render()[0] : false, html);
                },
                left: function () { 
                    if (Lampa.Controller.collectionFocus(false, html).left) Lampa.Controller.toggle('menu'); 
                },
                right: function () { Lampa.Controller.collectionFocus(false, html).right; },
                up: function () { Lampa.Controller.collectionFocus(false, html).up; },
                down: function () { Lampa.Controller.collectionFocus(false, html).down; }
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
})();
