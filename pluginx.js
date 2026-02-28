(function () {
    'use strict';

    Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {
            var myMenu = '<li class="menu__item selector" data-action="my_custom_catalog">' +
                         '<div class="menu__text">Мій Каталог (Тест)</div>' +
                         '</li>';

            $('.menu .menu__list').eq(0).append(myMenu);

            $('.menu__item[data-action="my_custom_catalog"]').on('hover:enter', function () {
                Lampa.Activity.push({
                    title: 'Тестова сторінка',
                    component: 'custom_catalog_comp',
                    page: 1
                });
            });
        }
    });

    function CustomCatalog(object) {
        var html = $('<div><div style="color:white; padding: 50px; font-size: 20px;">Якщо ти це бачиш — каркас працює!</div></div>');

        this.create = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                },
                left: function () { 
                    Lampa.Controller.toggle('menu'); 
                },
                up: function () {},
                down: function () {},
                right: function () {}
            });
            Lampa.Controller.toggle('content');
            return this.render();
        };

        this.render = function () { return html; };
        this.destroy = function () { html.remove(); };
        this.start = function () {};
        this.pause = function () {};
        this.stop = function () {};
    }

    Lampa.Component.add('custom_catalog_comp', CustomCatalog);
})();
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

                // Клік для запуску плеєра
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

                // ВИПРАВЛЕНО: Використовуємо .container замість .body
                _this.container.append(card.render());
                _this.items.push(card);
            }
        };

        return comp;
    }

    Lampa.Component.add('custom_catalog_comp', CustomCatalog);
})();
