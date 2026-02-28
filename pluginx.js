(function () {
    'use strict';

    function startPlugin() {
        // Перевірка на дублювання, як у файлі xx.js
        if (window.my_custom_perfect_plugin_ready) return;
        window.my_custom_perfect_plugin_ready = true;

        // Безпечний CSS
        var css = '<style>' +
            '.my-youtube-style .card { width: 100% !important; margin-bottom: 20px !important; }' +
            '.my-youtube-style .card__view { padding-bottom: 56.25% !important; border-radius: 12px !important; }' +
            '.my-youtube-style .card__img { object-fit: cover !important; }' +
            '.my-youtube-style .card__title { white-space: normal !important; text-align: left !important; line-height: 1.4 !important; height: auto !important; padding-top: 10px !important; }' +
            '.my-youtube-style .card__age, .my-youtube-style .card__textbox { display: none !important; }' +
            '</style>';
        $('body').append(css);

        function CustomCatalog(object) {
            var comp = new Lampa.InteractionCategory(object);
            var network = new Lampa.Reguest();

            comp.create = function () {
                var _this = this;
                // ЗАМІНИ ТУТ НА СВІЙ ДОМЕН
                var url = 'https://w.porno365.gold/'; 

                network.silent(url, function (htmlText) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(htmlText, 'text/html');
                    var elements = doc.querySelectorAll('li.video_block, li.trailer');
                    var results = [];

                    var baseUrlMatch = url.match(/^(https?:\/\/[^\/]+)/);
                    var baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';

                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];
                        var linkEl = el.querySelector('a.image');
                        var titleEl = el.querySelector('a.image p, .title');
                        var imgEl = el.querySelector('img'); 

                        if (linkEl && titleEl) {
                            var imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('src')) : '';
                            if (imgSrc && imgSrc.indexOf('//') === 0) imgSrc = 'https:' + imgSrc;

                            var videoUrl = linkEl.getAttribute('href');
                            if (videoUrl && videoUrl.indexOf('http') !== 0) {
                                videoUrl = baseUrl + (videoUrl.indexOf('/') === 0 ? '' : '/') + videoUrl;
                            }

                            results.push({
                                name: titleEl.innerText.trim(), 
                                url: videoUrl,
                                picture: imgSrc,
                                background_image: imgSrc,
                                img: imgSrc
                            });
                        }
                    }

                    if (results.length > 0) {
                        _this.build({ results: results, collection: true });
                        _this.render().addClass('my-youtube-style');
                    } else {
                        _this.empty();
                    }
                }, this.empty.bind(this), false, { dataType: 'text' });
            };

            comp.nextPageReuest = function (object, resolve, reject) {
                resolve({ results: [] }); 
            };

            comp.cardRender = function (card, element, events) {
                events.onEnter = function () {
                    network.silent(element.url, function(videoPageHtml) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(videoPageHtml, 'text/html');
                        var videoStreams = []; 

                        var qualityLinks = doc.querySelectorAll('.quality_chooser a');
                        for (var j = 0; j < qualityLinks.length; j++) {
                            var link = qualityLinks[j];
                            var vUrl = link.getAttribute('href');
                            var qName = link.innerText.trim() || link.getAttribute('data-quality');
                            if (vUrl) {
                                videoStreams.push({ title: qName || 'Відео', url: vUrl });
                            }
                        }

                        if (videoStreams.length === 0) {
                            var playBtn = doc.querySelector('a.btn-play.play-video');
                            if (playBtn && playBtn.getAttribute('href')) {
                                videoStreams.push({ title: 'Оригінал', url: playBtn.getAttribute('href') });
                            }
                        }

                        if (videoStreams.length > 0) {
                            var best = videoStreams[videoStreams.length - 1];
                            Lampa.Player.play({
                                title: element.name,
                                url: best.url,
                                quality: videoStreams
                            });
                            Lampa.Player.playlist([{
                                title: element.name,
                                url: best.url,
                                quality: videoStreams
                            }]);
                        }
                    }, false, false, { dataType: 'text' });
                };
            };

            return comp;
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

        addMenu();
    }

    // Правильний запуск після повної готовності Lampa
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });

    // Запобіжник для повільних пристроїв
    setTimeout(startPlugin, 1000);
})();
