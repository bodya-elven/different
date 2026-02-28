(function () {
    'use strict';

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
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var html    = $('<div></div>');
        var body    = $('<div class="category-full"></div>');
        var items   = [];

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);

            // ==========================================
            // НОВЕ: ПІДТРИМКА СВАЙПІВ ДЛЯ МОБІЛЬНИХ (СЕНСОРІВ)
            // ==========================================
            var startY = 0;
            html.on('touchstart', function (e) {
                // Запам'ятовуємо початкову точку дотику
                startY = e.originalEvent.touches[0].pageY;
            });

            html.on('touchmove', function (e) {
                // Визначаємо, наскільки зсунувся палець
                var currentY = e.originalEvent.touches[0].pageY;
                var delta = startY - currentY;
                
                // Створюємо віртуальне прокручування коліщатком миші для Lampa
                var event = new $.Event('mousewheel');
                event.originalEvent = { deltaY: delta };
                scroll.render().trigger(event);
                
                // Оновлюємо точку для наступного кадру руху
                startY = currentY;
            });
            // ==========================================

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
                        url: linkEl.getAttribute('href')
                    });
                }
            });

            this.build(results);
        };

        this.build = function (data) {
            if (data.length === 0) return Lampa.Noty.show('Нічого не знайдено');

            data.forEach(function (element) {
                var card = new Lampa.Card(element, { card_category: true });
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
                            var bestQualityUrl = videoStreams[videoStreams.length - 1].url;

                            var playlist = [{
                                title: element.title,
                                url: bestQualityUrl, 
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
                left: function () { 
                    if (Lampa.Controller.collectionFocus(false, html).left) Lampa.Controller.toggle('menu'); 
                },
                right: function () { 
                    Lampa.Controller.collectionFocus(false, html).right; 
                },
                up: function () { 
                    Lampa.Controller.collectionFocus(false, html).up; 
                },
                down: function () { 
                    Lampa.Controller.collectionFocus(false, html).down; 
                }
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
