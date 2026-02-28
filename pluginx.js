(function () {
    'use strict';

    // CSS: Дизайн в одну колонку + примусовий скрол пальцем для мобільних
    var customCss = `
    <style>
        /* Активуємо нативний скрол для телефонів всередині компонента Lampa */
        .custom_catalog_page .scroll__body {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 15px !important;
            padding-bottom: 50px !important;
        }
        
        /* Широка картка на всю екрану */
        .custom_catalog_page .card {
            width: 100% !important;
            height: auto !important;
            margin-bottom: 25px !important;
            float: none !important;
            position: relative !important;
            padding: 0 !important;
        }
        
        /* Постер 16:9 */
        .custom_catalog_page .card__view {
            padding-bottom: 56.25% !important; 
            height: 0 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
        }
        
        .custom_catalog_page .card__img {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
        }
        
        /* Повна назва */
        .custom_catalog_page .card__title {
            white-space: normal !important;
            text-align: left !important;
            padding-top: 10px !important;
            line-height: 1.4 !important;
            font-size: 1.1em !important;
            height: auto !important;
            display: block !important;
        }
        
        .custom_catalog_page .card__age, 
        .custom_catalog_page .card__textbox {
            display: none !important;
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
                    url: 'https://w.porno365.gold/feed.xml', // <--- ВСТАВ СЮДИ ПОСИЛАННЯ НА RSS FEED.XML !
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
        var items   = [];

        this.create = function () {
            html.addClass('custom_catalog_page');
            html.append(scroll.render());
            this.load();
            return this.render();
        };

        this.load = function () {
            var url = object.url; 
            network.silent(url, this.parseRSS.bind(this), function () {
                Lampa.Noty.show('Помилка завантаження RSS');
            }, false, { dataType: 'text' });
        };

        // 3. ПАРСИНГ RSS (Набагато надійніше за HTML)
        this.parseRSS = function (xmlText) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(xmlText, "text/xml");
            var elements = xmlDoc.querySelectorAll('item');
            var results = [];

            // Безпечний цикл for (щоб уникнути Script Error)
            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];
                var titleEl = el.querySelector('title');
                var linkEl = el.querySelector('link');
                var descEl = el.querySelector('description');

                if (titleEl && linkEl) {
                    var title = titleEl.textContent;
                    var link = linkEl.textContent;
                    var img = '';

                    // Витягуємо посилання на картинку з тексту опису
                    if (descEl) {
                        var descText = descEl.textContent;
                        var imgMatch = descText.match(/src=["'](.*?)["']/);
                        if (imgMatch && imgMatch[1]) {
                            img = imgMatch[1];
                            if (img.indexOf('//') === 0) img = 'https:' + img;
                        }
                    }

                    results.push({
                        title: title.trim(),
                        picture: img, 
                        img: img,
                        url: link.trim()
                    });
                }
            }
            this.build(results);
        };

        // 4. Побудова карток і запуск відео
        this.build = function (data) {
            if (data.length === 0) return Lampa.Noty.show('Нічого не знайдено');

            for (var i = 0; i < data.length; i++) {
                var element = data[i];
                var card = new Lampa.Card(element, { card_category: false });
                card.create();
                
                // Перехоплення кліку (Замикання, щоб зберегти element)
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

                scroll.append(card.render());
                items.push(card);
            }

            // Навігація пультом
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(items.length ? items[0].render()[0] : false, scroll.render());
                },
                left: function () { 
                    if (Lampa.Controller.collectionFocus(false, scroll.render()).left) Lampa.Controller.toggle('menu'); 
                },
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
})();
