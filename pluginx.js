(function () {
    'use strict';

    // ==========================================
    // ВСТАВТЕ ВАШ ДОМЕН ТУТ:
    var MY_CATALOG_DOMAIN = 'https://w.porno365.gold'; 
    // ==========================================

    function startPlugin() {
        if (window.pluginx_ready) return;
        window.pluginx_ready = true;

        var css = '<style>' +
            /* Контейнер каталогу */
            '.my-youtube-style { padding: 0 !important; }' +
            '.my-youtube-style .category-full { padding: 0 5px !important; }' +
            
            /* Сітка: 1 колонка (моб) / 4 колонки (ТБ) */
            '@media screen and (max-width: 580px) {' +
                '.my-youtube-style .card { width: 100% !important; margin-bottom: 10px !important; padding: 0 5px !important; }' +
            '}' +
            '@media screen and (min-width: 581px) {' +
                '.my-youtube-style .card { width: 25% !important; margin-bottom: 15px !important; padding: 0 8px !important; }' +
            '}' +
            
            /* Картки */
            '.my-youtube-style .card__view { padding-bottom: 56.25% !important; border-radius: 12px !important; }' +
            '.my-youtube-style .card__img { object-fit: cover !important; }' +
            
            /* ЛОГІКА НАЗВИ: 3 рядки + фіксована тривалість */
            '.my-youtube-style .card__title { ' +
                'position: relative !important; ' +
                'display: -webkit-box !important; ' +
                '-webkit-line-clamp: 3 !important; ' + /* Рівно 3 рядки */
                '-webkit-box-orient: vertical !important; ' +
                'overflow: hidden !important; ' +
                'white-space: normal !important; ' +
                'text-align: left !important; ' +
                'line-height: 1.2 !important; ' +
                'height: 3.6em !important; ' + /* Фіксована висота (1.2 * 3) */
                'padding-top: 2px !important; ' + 
                'margin-top: 0 !important; ' +
                'padding-right: 45px !important; ' + /* Місце для часу */
            '}' +
            
            /* Час, який завжди видно в правому нижньому куті назви */
            '.my-youtube-style .pinned-duration { ' +
                'position: absolute !important; ' +
                'bottom: 0 !important; ' +
                'right: 0 !important; ' +
                'background: rgba(0,0,0,0.8) !important; ' +
                'padding: 0 4px !important; ' +
                'border-radius: 4px !important; ' +
                'font-size: 0.9rem !important; ' +
                'color: #fff !important; ' +
                'z-index: 2 !important; ' +
            '}' +
            
            '.my-youtube-style .card__age, .my-youtube-style .card__textbox { display: none !important; }' +
            '</style>';
        $('body').append(css);

        function CustomCatalog(object) {
            var comp = new Lampa.InteractionCategory(object);
            var network = new Lampa.Reguest();

            function parseCards(doc, siteBaseUrl, isRelated) {
                var selector = isRelated ? '.related .related_video' : 'li.video_block, li.trailer';
                var elements = doc.querySelectorAll(selector);
                var results = [];

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
                            videoUrl = siteBaseUrl + (videoUrl.indexOf('/') === 0 ? '' : '/') + videoUrl;
                        }

                        var rawTitle = titleEl.innerText.trim();
                        var timeText = timeEl ? timeEl.innerText.trim() : '';
                        var qualityText = qualityEl ? qualityEl.innerText.trim() : '';

                        // Формуємо об'єкт так, щоб час був окремим полем
                        results.push({
                            name: (qualityText ? '[' + qualityText + '] ' : '') + rawTitle, 
                            url: videoUrl,
                            picture: imgSrc,
                            img: imgSrc,
                            duration: timeText // Передаємо час окремо
                        });
                    }
                }
                return results;
            }

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);
                network.silent(object.url || MY_CATALOG_DOMAIN, function (htmlText) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(htmlText, 'text/html');
                    var siteBaseUrl = MY_CATALOG_DOMAIN.match(/^(https?:\/\/[^\/]+)/)[1];
                    var results = parseCards(doc, siteBaseUrl, object.is_related);

                    if (results.length > 0) {
                        _this.build({ results: results, collection: true, page: 1, next_page: true });
                        _this.render().addClass('my-youtube-style');
                    } else { _this.empty(); }
                }, this.empty.bind(this), false, { dataType: 'text' });
            };

            comp.nextPageReuest = function (object, resolve, reject) {
                if (object.is_related) return reject();
                var baseUrl = object.url || MY_CATALOG_DOMAIN;
                var pageUrl = (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') + object.page;

                network.silent(pageUrl, function (htmlText) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(htmlText, 'text/html');
                    var siteBaseUrl = MY_CATALOG_DOMAIN.match(/^(https?:\/\/[^\/]+)/)[1];
                    var results = parseCards(doc, siteBaseUrl, false);
                    if (results.length > 0) resolve({ results: results, next_page: true });
                    else reject();
                }, reject, false, { dataType: 'text' });
            };

            comp.cardRender = function (card, element, events) {
                // Додаємо час як "pinned" елемент всередину назви
                if (element.duration) {
                    var titleDiv = card.render().find('.card__title');
                    titleDiv.append('<span class="pinned-duration">' + element.duration + '</span>');
                }

                events.onEnter = function () {
                    network.silent(element.url, function(videoPageHtml) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(videoPageHtml, 'text/html');
                        var videoStreams = []; 
                        var qualityLinks = doc.querySelectorAll('.quality_chooser a');
                        for (var j = 0; j < qualityLinks.length; j++) {
                            var link = qualityLinks[j];
                            if (link.getAttribute('href')) videoStreams.push({ title: link.innerText.trim() || 'Відео', url: link.getAttribute('href') });
                        }
                        if (videoStreams.length > 0) {
                            var best = videoStreams[videoStreams.length - 1];
                            Lampa.Player.play({ title: element.name, url: best.url, quality: videoStreams });
                            Lampa.Player.playlist([{ title: element.name, url: best.url, quality: videoStreams }]);
                        }
                    }, false, false, { dataType: 'text' });
                };

                events.onMenu = function () {
                    network.silent(element.url, function (htmlText) {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(htmlText, 'text/html');
                        var menuItems = [];
                        var modelElements = doc.querySelectorAll('.video-categories.video-models a');
                        for (var m = 0; m < modelElements.length; m++) {
                            menuItems.push({ title: modelElements[m].innerText.trim(), action: 'direct_link', url: modelElements[m].getAttribute('href') });
                        }
                        menuItems.push({ title: 'Категорії', action: 'categories' }, { title: 'Теги', action: 'tags' }, { title: 'Схожі відео', action: 'similar' });

                        Lampa.Select.show({
                            title: 'Дії',
                            items: menuItems,
                            onSelect: function (a) {
                                if (a.action === 'similar') {
                                    Lampa.Activity.push({ url: element.url, title: 'Схожі', component: 'pluginx_comp', page: 1, is_related: true });
                                } else if (a.action === 'direct_link') {
                                    Lampa.Activity.push({ url: a.url, title: a.title, component: 'pluginx_comp', page: 1 });
                                } else {
                                    var selector = (a.action === 'categories') ? '.video-categories:not(.video-models) a' : '.video-tags a';
                                    var subItems = [];
                                    var subEls = doc.querySelectorAll(selector);
                                    for (var i = 0; i < subEls.length; i++) {
                                        if (subEls[i].getAttribute('href')) subItems.push({ title: subEls[i].innerText.trim(), url: subEls[i].getAttribute('href') });
                                    }
                                    if (subItems.length > 0) {
                                        Lampa.Select.show({
                                            title: a.action === 'categories' ? 'Категорії' : 'Теги',
                                            items: subItems,
                                            onSelect: function (item) { Lampa.Activity.push({ url: item.url, title: item.title, component: 'pluginx_comp', page: 1 }); },
                                            onBack: function () { events.onMenu(); }
                                        });
                                    }
                                }
                            },
                            onBack: function () { Lampa.Controller.toggle('content'); }
                        });
                    }, null, false, { dataType: 'text' });
                };
            };
            return comp;
        }

        Lampa.Component.add('pluginx_comp', CustomCatalog);
    }

    function addMenu() {
        if (window.pluginx_menu_added) return;
        var menuList = $('.menu .menu__list').eq(0);
        if (menuList.length) {
            var item = $('<li class="menu__item selector" data-action="pluginx" id="menu_pluginx">' +
                         '<div class="menu__ico">' +
                         '<img src="https://bodya-elven.github.io/different/icons/pluginx.svg" width="24" height="24" style="filter: brightness(0) invert(1);" />' +
                         '</div>' +
                         '<div class="menu__text">Каталог Х</div>' +
                         '</li>');
            
            item.on('hover:enter', function () {
                Lampa.Activity.push({ title: 'Каталог Х', component: 'pluginx_comp', page: 1 });
            });

            // Вставляємо на друге місце (після "Головна") або перед налаштуваннями
            var settings = menuList.find('[data-action="settings"]');
            if (settings.length) item.insertBefore(settings);
            else menuList.append(item);

            window.pluginx_menu_added = true;
            if (window.Lampa && window.Lampa.Controller) window.Lampa.Controller.update();
        }
    }

    // Дуже агресивна перевірка для меню (щоб не ховалося)
    var menuCheck = setInterval(function() {
        if (window.appready) {
            addMenu();
            startPlugin();
        }
    }, 200);

    // Додатковий хук на готовність
    Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {
            setTimeout(addMenu, 100);
            setTimeout(addMenu, 1000); // Повторний запуск для менеджера меню
        }
    });

})();
                         
