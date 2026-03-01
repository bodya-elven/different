(function () {
    'use strict';

    // ==========================================
    // ВСТАВТЕ ВАШ ДОМЕН ТУТ:
    var MY_CATALOG_DOMAIN = 'https://w.porno365.gold/'; 
    // ==========================================

    function startPlugin() {
        if (window.pluginx_ready) return;
        window.pluginx_ready = true;

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

            // --- ДОДАНО ФІЛЬТР ---
            comp.filter = function () {
                var filter_items = [
                    { title: 'Нові', url: MY_CATALOG_DOMAIN + '/' },
                    { title: 'Популярні', url: MY_CATALOG_DOMAIN + '/popular/' }, 
                    { title: 'Найкращі', url: MY_CATALOG_DOMAIN + '/top/' }
                ];

                Lampa.Select.show({
                    title: 'Фільтр / Сортування',
                    items: filter_items,
                    onSelect: function (a) {
                        // При виборі оновлюємо url і перезавантажуємо сторінку
                        object.url = a.url;
                        comp.empty();
                        // Знову показуємо лоадер і запускаємо завантаження
                        comp.activity.loader(true);
                        comp.create();
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    }
                });
            };

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);

                // Використовуємо url з об'єкта (якщо вибрали фільтр), або базовий
                var url = object.url || MY_CATALOG_DOMAIN; 

                network.silent(url, function (htmlText) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(htmlText, 'text/html');
                    var elements = doc.querySelectorAll('li.video_block, li.trailer');
                    var results = [];

                    var baseUrlMatch = MY_CATALOG_DOMAIN.match(/^(https?:\/\/[^\/]+)/);
                    var baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';

                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];
                        var linkEl = el.querySelector('a.image');
                        var titleEl = el.querySelector('a.image p, .title');
                        var imgEl = el.querySelector('img'); 
                        
                        var timeEl = el.querySelector('.duration'); 
                        var qualityEl = el.querySelector('.quality, .video-hd-mark, .hd-mark'); 

                        if (linkEl && titleEl) {
                            var imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('src')) : '';
                            if (imgSrc && imgSrc.indexOf('//') === 0) imgSrc = 'https:' + imgSrc;

                            var videoUrl = linkEl.getAttribute('href');
                            if (videoUrl && videoUrl.indexOf('http') !== 0) {
                                videoUrl = baseUrl + (videoUrl.indexOf('/') === 0 ? '' : '/') + videoUrl;
                            }

                            var rawTitle = titleEl.innerText.trim();
                            var timeText = timeEl ? timeEl.innerText.trim() : '';
                            var qualityText = qualityEl ? qualityEl.innerText.trim() : '';

                            var finalTitle = '';
                            if (timeText) finalTitle += '[' + timeText + '] ';
                            if (qualityText) finalTitle += '[' + qualityText + '] ';
                            finalTitle += rawTitle;

                            results.push({
                                name: finalTitle, 
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
                // Звичайний клік (Запуск відео)
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

                // --- ДОДАНО МЕНЮ (ДОВГЕ НАТИСКАННЯ АБО КНОПКА МЕНЮ НА ПУЛЬТІ) ---
                events.onMenu = function () {
                    var menuItems = [
                        { title: 'Схожі відео', action: 'similar' },
                        { title: 'Моделі', action: 'models' }
                    ];

                    Lampa.Select.show({
                        title: 'Дії',
                        items: menuItems,
                        onSelect: function (a) {
                            if (a.action === 'similar') {
                                // Тут ми відкриваємо нову сторінку каталогу для схожих відео
                                Lampa.Activity.push({
                                    url: element.url, // Поки передаємо url відео, далі треба буде додати парсинг схожих
                                    title: 'Схожі: ' + element.name,
                                    component: 'pluginx_comp',
                                    page: 1
                                });
                            } else if (a.action === 'models') {
                                Lampa.Noty.show('Пошук моделей...');
                            }
                        },
                        onBack: function () {
                            Lampa.Controller.toggle('content');
                        }
                    });
                };
            };

            return comp;
        }

        Lampa.Component.add('pluginx_comp', CustomCatalog);

        function addMenu() {
            var menuList = $('.menu .menu__list').eq(0);
            if (!menuList.length) return;
            if (menuList.find('[data-action="pluginx"]').length === 0) {
                var myMenu = '<li class="menu__item selector" data-action="pluginx">' +
                             '<div class="menu__ico">' +
                             '<img src="https://bodya-elven.github.io/different/icons/pluginx.svg" width="24" height="24" style="object-fit: contain; filter: brightness(0) invert(1);" />' +
                             '</div>' +
                             '<div class="menu__text">Каталог Х</div>' +
                             '</li>';
                menuList.append(myMenu);
                $('.menu__item[data-action="pluginx"]').on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: 'Каталог Х',
                        component: 'pluginx_comp',
                        page: 1
                    });
                });
            }
        }

        addMenu();
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });

    setTimeout(startPlugin, 1000);
})();
