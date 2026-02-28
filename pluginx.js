(function () {
    'use strict';

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
                    url: 'https://w.porno365.gold/', // <--- ЗАЛИШ ОДИНАРНІ ЛАПКИ
                    title: 'Мій Каталог',
                    component: 'custom_catalog_comp',
                    page: 1
                });
            });
        }
    });

    // 2. Компонент каталогу (Нативний Lampa)
    function CustomCatalog(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        comp.create = function () {
            var _this = this;
            
            network.silent(object.url, function (responseText) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(responseText, 'text/html');
                var results = [];

                var elements = doc.querySelectorAll('li.video_block'); 
                
                // БЕЗПЕЧНИЙ ЦИКЛ FOR (щоб уникнути Script error на старих ТВ)
                for (var i = 0; i < elements.length; i++) {
                    var el = elements[i];
                    var linkEl = el.querySelector('a.image'); 
                    // Беремо будь-яку картинку всередині блоку (згідно з твоїм фото fa2fe6c8)
                    var imgEl = el.querySelector('img'); 
                    var titleEl = el.querySelector('a.image p');    

                    if (linkEl && imgEl && titleEl) {
                        var imageSrc = imgEl.getAttribute('src') || '';
                        if (imageSrc && imageSrc.indexOf('//') === 0) {
                            imageSrc = 'https:' + imageSrc;
                        }

                        results.push({
                            title: titleEl.innerText.trim(),
                            picture: imageSrc, 
                            url: linkEl.getAttribute('href')
                        });
                    }
                }

                if (results.length > 0) {
                    // НАЙГОЛОВНІШЕ: Вмикаємо нативний горизонтальний дизайн "wide"
                    Lampa.Utils.extendItemsParams(results, { style: { name: 'wide' } });
                    _this.build({ results: results });
                } else {
                    _this.empty();
                }
            }, this.empty.bind(this), false, { dataType: 'text' });
        };

        // 3. Побудова карток і перехоплення кліку
        comp.append = function (data) {
            var _this = this;
            
            for (var k = 0; k < data.results.length; k++) {
                var element = data.results[k];
                var card = new Lampa.Card(element, { card_category: false });
                card.create();
                
                // ВИПРАВЛЕНО: card.render().on замість card.onHover
                card.render().on('hover:enter', function () {
                    // Замикання для збереження контексту element
                    (function(currentElement) {
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
                    })(element);
                });

                _this.appendBody(card);
            }
        };

        comp.nextPageReuest = function () {};

        return comp;
    }

    Lampa.Component.add('custom_catalog_comp', CustomCatalog);
})();
');
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
