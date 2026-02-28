(function () {
    'use strict';

    // Впроваджуємо CSS для мобільного скролінгу та дизайну YouTube
    var customCss = `
    <style>
        /* Дозволяємо прокрутку пальцем поверх стандартного скролу Lampa */
        .custom-catalog-scroll .scroll__body {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y !important;
        }
        
        /* Робимо список однією колонкою */
        .custom-catalog-list {
            display: flex !important;
            flex-direction: column !important;
            padding: 15px !important;
            padding-bottom: 50px !important;
        }
        
        /* Картка на 100% ширини екрану */
        .custom-catalog-list .card {
            width: 100% !important;
            height: auto !important;
            margin-bottom: 25px !important;
            float: none !important;
            position: relative !important;
            padding: 0 !important;
        }
        
        /* Горизонтальний постер (пропорція 16:9) */
        .custom-catalog-list .card__view {
            padding-bottom: 56.25% !important; 
            height: 0 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
        }
        
        /* Зображення заповнює весь блок постеру */
        .custom-catalog-list .card__img {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
        }
        
        /* Гарний багаторядковий текст під постером (повна назва) */
        .custom-catalog-list .card__title {
            white-space: normal !important;
            text-align: left !important;
            padding-top: 10px !important;
            line-height: 1.4 !important;
            font-size: 1.1em !important;
            height: auto !important;
            display: block !important;
        }
        
        .custom-catalog-list .card__age, .custom-catalog-list .card__textbox {
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
                    url: 'https://w.porno365.gold/', // <--- Залиш одинарні лапки!
                    title: 'Мій Каталог',
                    component: 'custom_catalog_comp',
                    page: 1
                });
            });
        }
    });

    function CustomCatalog(object) {
        var network = new Lampa.Reguest(); 
        var scroll  = new Lampa.Scroll({ mask: true, over: true }); // Повернули Lampa.Scroll
        var html    = $('<div></div>');
        var body    = $('<div class="custom-catalog-list"></div>');
        var items   = [];

        this.create = function () {
            // Додаємо клас для активації нашого мобільного CSS-скролу
            html.addClass('custom-catalog-scroll');
            html.append(scroll.render());
            scroll.append(body);
            this.load();
            return this.render();
        };

        this.load = function () {
            var url = object.url; 
            network.silent(url, this.parseHTML.bind(this), function () {
                Lampa.Noty.show('Помилка завантаження сайту');
            }, false, { dataType: 'text' });
        };

        this.parseHTML = function (responseText) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(responseText, 'text/html');
            var results = [];

            var elements = doc.querySelectorAll('li.video_block'); 

            elements.forEach(function(el) {
                var linkEl = el.querySelector('a.image'); 
                // ПОВЕРНУЛИ ПРАВИЛЬНИЙ СЕЛЕКТОР ДЛЯ КАТАЛОГУ
                var imgEl = el.querySelector('div.tumba img');   
                var titleEl = el.querySelector('a.image p');    

                if (linkEl && imgEl && titleEl) {
                    var imageSrc = imgEl.getAttribute('src');
                    
                    if (imageSrc && imageSrc.indexOf('//') === 0) {
                        imageSrc = 'https:' + imageSrc;
                    }

                    results.push({
                        title: titleEl.innerText.trim(),
                        picture: imageSrc, 
                        img: imageSrc,
                        url: linkEl.getAttribute('href')
                    });
                }
            });

            this.build(results);
        };

        this.build = function (data) {
            if (data.length === 0) return Lampa.Noty.show('Нічого не знайдено');

            data.forEach(function (element) {
                var card = new Lampa.Card(element, { card_category: false });
                card.create();
                
                card.render().on('hover:enter', function () {
                    network.silent(element.url, function(videoPageHtml) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(videoPageHtml, 'text/html');
                        var videoStreams = []; 

                        var qualityLinks = doc.querySelectorAll('.quality_chooser a');
                        qualityLinks.forEach(function(link) {
                            var videoUrl = link.getAttribute('href');
                            var qualityName = link.innerText.trim() || link.getAttribute('data-quality');
                            if (videoUrl) {
                                videoStreams.push({ title: qualityName || 'Відео', url: videoUrl });
                            }
                        });

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
                                title: element.title,
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

                body.append(card.render());
                items.push(card);
            });

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(items.length ? items[0].render()[0] : false, html);
                },
                left: function () { if (Lampa.Controller.collectionFocus(false, html).left) Lampa.Controller.toggle('menu'); },
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
