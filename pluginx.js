(function () {
    'use strict';

    // CSS: Тільки дизайн карток. Жодних втручань у скролінг!
    var customCss = `
    <style>
        .my-dynamic-card {
            width: 100% !important; 
            float: left !important;
            margin-bottom: 20px !important;
            padding: 0 10px !important;
        }
        
        .my-dynamic-card .card__view {
            padding-bottom: 56.25% !important; 
            border-radius: 12px !important;
            background-color: #202020 !important; 
        }
        
        .my-dynamic-card .card__img {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transition: opacity 0.3s ease-in; 
        }
        
        .my-dynamic-card .card__title {
            white-space: normal !important;
            text-align: left !important;
            line-height: 1.4 !important;
            height: auto !important;
            padding-top: 10px !important;
        }
        
        .my-dynamic-card .card__age, 
        .my-dynamic-card .card__textbox {
            display: none !important;
        }
    </style>
    `;
    $('body').append(customCss);

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
                    url: 'https://w.porno365.gold/', // <--- ВСТАВ ПОСИЛАННЯ
                    title: 'Мій Каталог',
                    component: 'custom_catalog_comp',
                    page: 1
                });
            });
        }
    });

    function CustomCatalog(object) {
        var network = new Lampa.Reguest(); 
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
            var url = object.url; 
            network.silent(url, this.parseMainPage.bind(this), function () {
                Lampa.Noty.show('Помилка завантаження сайту');
            }, false, { dataType: 'text' });
        };

        this.parseMainPage = function (htmlText) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(htmlText, 'text/html');
            var elements = doc.querySelectorAll('li.video_block'); 
            var results = [];

            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];
                var linkEl = el.querySelector('a.image'); 
                var titleEl = el.querySelector('a.image p');    

                if (linkEl && titleEl) {
                    results.push({
                        title: titleEl.innerText.trim(),
                        url: linkEl.getAttribute('href'),
                        img: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' 
                    });
                }
            }
            this.build(results);
        };

        this.build = function (data) {
            if (data.length === 0) return Lampa.Noty.show('Нічого не знайдено');

            for (var i = 0; i < data.length; i++) {
                var element = data[i];
                var card = new Lampa.Card(element, { card_category: false });
                card.create();
                
                card.render().addClass('my-dynamic-card');

                // Асинхронне завантаження картинки
                (function(currentElement, currentCard) {
                    network.silent(currentElement.url, function(videoPageHtml) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(videoPageHtml, 'text/html');
                        
                        var preloaderImg = doc.querySelector('.mobile-preloader-img');
                        if (preloaderImg) {
                            var imgSrc = preloaderImg.getAttribute('src');
                            if (imgSrc && imgSrc.indexOf('//') === 0) {
                                imgSrc = 'https:' + imgSrc;
                            }
                            currentCard.render().find('.card__img').attr('src', imgSrc);
                        }
                    }, false, false, { dataType: 'text' });
                })(element, card);

                // Обробка кліку
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

            // ПРАВИЛЬНА НАВІГАЦІЯ: тепер Lampa фокусується на контейнері скролу
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
add('custom_catalog_comp', CustomCatalog);
})();
