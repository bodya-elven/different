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
                        object.url = a.url;
                        comp.empty();
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

                var url = object.url || MY_CATALOG_DOMAIN; 
                var isRelated = object.is_related || false;

                network.silent(url, function (htmlText) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(htmlText, 'text/html');
                    
                    var selector = isRelated ? '.related .related_video' : 'li.video_block, li.trailer';
                    var elements = doc.querySelectorAll(selector);
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

                events.onMenu = function () {
                    // Завантажуємо сторінку ОДРАЗУ, щоб розпарсити моделі для головного меню
                    network.silent(element.url, function (htmlText) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(htmlText, 'text/html');

                        var menuItems = [];

                        // 1. Моделі (Додаємо першими)
                        var modelElements = doc.querySelectorAll('.video-categories.video-models a');
                        for (var m = 0; m < modelElements.length; m++) {
                            var mHref = modelElements[m].getAttribute('href');
                            var mText = modelElements[m].innerText.trim();
                            if (mHref && mText) {
                                menuItems.push({ 
                                    title: 'Модель: ' + mText, 
                                    action: 'direct_link', 
                                    url: mHref 
                                });
                            }
                        }

                        // 2. Категорії
                        menuItems.push({ title: 'Категорії', action: 'categories' });

                        // 3. Теги
                        menuItems.push({ title: 'Теги', action: 'tags' });

                        // 4. Схожі відео
                        menuItems.push({ title: 'Схожі відео', action: 'similar' });

                        // Показуємо згенероване меню
                        Lampa.Select.show({
                            title: 'Дії',
                            items: menuItems,
                            onSelect: function (a) {
                                if (a.action === 'similar') {
                                    Lampa.Activity.push({
                                        url: element.url,
                                        title: 'Схожі',
                                        component: 'pluginx_comp',
                                        page: 1,
                                        is_related: true
                                    });
                                } else if (a.action === 'direct_link') {
                                    // Це пункт моделі - відкриваємо каталог миттєво
                                    Lampa.Activity.push({
                                        url: a.url,
                                        title: a.title,
                                        component: 'pluginx_comp',
                                        page: 1
                                    });
                                } else {
                                    // Це категорії або теги (використовуємо вже завантажений doc)
                                    var selector = (a.action === 'categories') ? '.video-categories:not(.video-models) a' : '.video-tags a';
                                    var selectTitle = (a.action === 'categories') ? 'Категорії' : 'Теги';
                                    
                                    var subItems = [];
                                    var subEls = doc.querySelectorAll(selector);
                                    for (var i = 0; i < subEls.length; i++) {
                                        var sHref = subEls[i].getAttribute('href');
                                        var sText = subEls[i].innerText.trim();
                                        if (sHref && sText) {
                                            subItems.push({ title: sText, url: sHref });
                                        }
                                    }

                                    if (subItems.length > 0) {
                                        Lampa.Select.show({
                                            title: selectTitle,
                                            items: subItems,
                                            onSelect: function (item) {
                                                Lampa.Activity.push({
                                                    url: item.url,
                                                    title: item.title,
                                                    component: 'pluginx_comp',
                                                    page: 1
                                                });
                                            },
                                            onBack: function () {
                                                events.onMenu(); // При "Назад" знову показуємо головне меню
                                            }
                                        });
                                    } else {
                                        Lampa.Noty.show('Нічого не знайдено');
                                    }
                                }
                            },
                            onBack: function () {
                                Lampa.Controller.toggle('content');
                            }
                        });
                    }, function() {
                        Lampa.Noty.show('Помилка завантаження даних');
                    }, false, { dataType: 'text' });
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

    var startInterval = setInterval(function() {
        if (window.appready && window.Lampa && window.Lampa.Component) {
            clearInterval(startInterval);
            startPlugin();
        }
    }, 100);

})();
        
