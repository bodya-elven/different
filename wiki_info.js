(function () {
    'use strict';

    function WikiInfoPlugin() {
        var _this = this;
        var ICON_WIKI = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Wikipedia_svg_logo.svg';
        var cachedResults = null; // Тут зберігаємо результат фонового пошуку
        var searchPromise = null; // Проміс поточного пошуку

        this.init = function () {
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    _this.cleanup();
                    // Запускаємо рендер і пошук майже одразу
                    setTimeout(function() {
                        try {
                            _this.render(e.data, e.object.activity.render());
                        } catch (err) {}
                    }, 50);
                }
            });
        };

        this.cleanup = function() {
            $('.lampa-wiki-button').remove();
            cachedResults = null;
            searchPromise = null;
        };

        this.render = function (data, html) {
            var container = $(html);
            if (container.find('.lampa-wiki-button').length) return;

            var button = $('<div class="full-start__button selector lampa-wiki-button">' +
                                '<img src="' + ICON_WIKI + '" class="wiki-icon-img">' +
                                '<span>Wikipedia</span>' +
                            '</div>');

            var style = '<style>' +
                '.lampa-wiki-button { display: flex !important; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.3s; } ' +
                '.lampa-wiki-button.ready { opacity: 1; } ' + // Кнопка стане яскравою, коли пошук завершиться
                '.wiki-icon-img { width: 1.6em; height: 1.6em; object-fit: contain; margin-right: 5px; filter: grayscale(100%) brightness(2); } ' +
                
                // Меню вибору
                '.wiki-select-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; }' +
                '.wiki-select-body { width: 50%; max-width: 600px; background: #1a1a1a; border-radius: 10px; padding: 20px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }' +
                '.wiki-item { padding: 12px 15px; margin: 8px 0; background: #252525; border-radius: 6px; cursor: pointer; border: 2px solid transparent; display: flex; align-items: center; gap: 15px; transition: transform 0.1s; }' +
                '.wiki-item.focus { border-color: #fff; background: #333; transform: scale(1.02); }' +
                '.wiki-item__lang { font-size: 1.4em; }' +
                '.wiki-item__title { font-size: 1.1em; color: #eee; font-weight: 500; }' +
                
                // Переглядач (Viewer)
                '.wiki-viewer-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #121212; z-index: 2001; display: flex; flex-direction: column; }' +
                '.wiki-header { padding: 15px 20px; background: #1f1f1f; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }' +
                '.wiki-title { font-size: 1.4em; font-weight: bold; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%; }' +
                '.wiki-close-btn { width: 42px; height: 42px; background: #333; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 26px; border: 2px solid transparent; }' +
                '.wiki-close-btn.focus { border-color: #fff; background: #555; }' +
                
                // Контент
                '.wiki-content-scroll { flex: 1; overflow-y: auto; padding: 20px 5%; color: #d0d0d0; font-family: "Roboto", sans-serif; line-height: 1.6; font-size: 1.15em; }' +
                '.wiki-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #888; font-size: 1.2em; }' +
                
                // Стилізація статті
                '.wiki-content-scroll h1, .wiki-content-scroll h2 { color: #fff; border-bottom: 1px solid #333; padding-bottom: 0.3em; margin-top: 1.5em; font-weight: 400; }' +
                '.wiki-content-scroll p { margin-bottom: 1em; text-align: justify; }' +
                '.wiki-content-scroll img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 15px auto; }' +
                '.wiki-content-scroll table { display: none; }' + // Приховуємо таблиці для швидкості і чистоти
                '.wiki-content-scroll .infobox { display: none; }' + // Приховуємо інфобокси (вони ламають верстку на ТВ)
                '.wiki-content-scroll .thumb { background: #1a1a1a; padding: 5px; border-radius: 5px; margin: 10px auto; max-width: 100%; width: auto !important; }' +
                '.wiki-content-scroll .mw-empty-elt, .wiki-content-scroll .hatnote, .wiki-content-scroll .ambox { display: none; }' +
                '</style>';

            if (!$('style#wiki-plugin-style').length) $('head').append('<style id="wiki-plugin-style">' + style + '</style>');

            var buttons_container = container.find('.full-start-new__buttons, .full-start__buttons');
            buttons_container.append(button);

            // ЗАПУСКАЄМО ФОНОВИЙ ПОШУК ОДРАЗУ
            _this.performSearch(data.movie, function(hasResults) {
                if (hasResults) button.addClass('ready');
            });

            button.on('hover:enter click', function() {
                _this.handleButtonClick(data.movie, button);
            });

            if (Lampa.Controller.enabled().name === 'full_start') {
                Lampa.Controller.enable('full_start');
            }
        };

        this.handleButtonClick = function(movie, btn) {
            var _this = this;
            
            // Якщо результати вже є (фоновий пошук завершено)
            if (cachedResults) {
                if (cachedResults.length > 0) _this.showMenu(cachedResults, movie.title || movie.name);
                else Lampa.Noty.show('Нічого не знайдено');
            } 
            // Якщо пошук ще триває (інтернет повільний)
            else if (searchPromise) {
                Lampa.Noty.show('Пошук...');
                searchPromise.done(function(results) {
                    if (results.length) _this.showMenu(results, movie.title || movie.name);
                    else Lampa.Noty.show('Нічого не знайдено');
                });
            }
            // Про всяк випадок, якщо щось пішло не так
            else {
                _this.performSearch(movie, function(hasResults) {
                     if (hasResults) _this.showMenu(cachedResults, movie.title || movie.name);
                     else Lampa.Noty.show('Нічого не знайдено');
                });
            }
        };

        this.performSearch = function (movie, callback) {
            if (!movie) return;
            var _this = this;

            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            var titleUA = (movie.title || movie.name || '').replace(/[^\w\sа-яієїґ]/gi, '');
            var titleEN = (movie.original_title || movie.original_name || '').replace(/[^\w\s]/gi, '');
            var isTV = !!(movie.first_air_date || movie.number_of_seasons);
            
            var p1 = $.ajax({ url: 'https://uk.wikipedia.org/w/api.php', data: { action: 'query', list: 'search', srsearch: titleUA + ' ' + year + (isTV ? ' серіал' : ' фільм'), srlimit: 3, format: 'json', origin: '*' }, dataType: 'json' });
            var p2 = $.ajax({ url: 'https://en.wikipedia.org/w/api.php', data: { action: 'query', list: 'search', srsearch: titleEN + ' ' + year + (isTV ? ' series' : ' film'), srlimit: 3, format: 'json', origin: '*' }, dataType: 'json' });

            searchPromise = $.when(p1, p2).then(function (r1, r2) {
                var results = [];
                // Обробка UA
                if (r1[0] && r1[0].query && r1[0].query.search) {
                    r1[0].query.search.forEach(function(i) {
                        results.push({ title: i.title, lang: 'ua', lang_icon: '🇺🇦', key: i.title });
                    });
                }
                // Обробка EN
                if (r2[0] && r2[0].query && r2[0].query.search) {
                    r2[0].query.search.forEach(function(i) {
                        // Уникаємо дублікатів, якщо назви співпадають (рідко, але буває)
                        if (!results.some(function(r) { return r.title === i.title && r.lang === 'ua' })) {
                            results.push({ title: i.title, lang: 'en', lang_icon: '🇺🇸', key: i.title });
                        }
                    });
                }
                cachedResults = results;
                if (callback) callback(results.length > 0);
                return results;
            }, function() {
                cachedResults = [];
                if (callback) callback(false);
                return [];
            });
        };

        this.showMenu = function(items, movieTitle) {
            var _this = this;
            var current_controller = Lampa.Controller.enabled().name;
            var menu = $('<div class="wiki-select-container"><div class="wiki-select-body">' +
                            '<div style="font-size: 1.4em; margin-bottom: 20px; color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px;">Wikipedia: ' + movieTitle + '</div>' +
                            '<div class="wiki-items-list" style="max-height: 60vh; overflow-y: auto;"></div></div></div>');

            items.forEach(function(item) {
                var el = $('<div class="wiki-item selector">' +
                                '<div class="wiki-item__lang">' + item.lang_icon + '</div>' +
                                '<div class="wiki-item__title">' + item.title + '</div>' +
                            '</div>');
                el.on('hover:enter click', function() {
                    menu.remove();
                    // Відкриваємо вікно одразу, не чекаючи завантаження
                    _this.showViewer(item.lang, item.key, item.title, current_controller);
                });
                menu.find('.wiki-items-list').append(el);
            });

            $('body').append(menu);

            Lampa.Controller.add('wiki_menu', {
                toggle: function() {
                    Lampa.Controller.collectionSet(menu);
                    Lampa.Controller.collectionFocus(menu.find('.wiki-item')[0], menu);
                },
                up: function() {
                    var index = menu.find('.wiki-item').index(menu.find('.wiki-item.focus'));
                    if (index > 0) Lampa.Controller.collectionFocus(menu.find('.wiki-item')[index - 1], menu);
                },
                down: function() {
                    var index = menu.find('.wiki-item').index(menu.find('.wiki-item.focus'));
                    if (index < items.length - 1) Lampa.Controller.collectionFocus(menu.find('.wiki-item')[index + 1], menu);
                },
                back: function() {
                    menu.remove();
                    Lampa.Controller.toggle(current_controller);
                }
            });
            Lampa.Controller.toggle('wiki_menu');
        };

        this.showViewer = function (lang, key, title, prev_controller) {
            // Створюємо вікно одразу
            var viewer = $('<div class="wiki-viewer-container">' +
                                '<div class="wiki-header">' +
                                    '<div class="wiki-title">' + title + '</div>' +
                                    '<div class="wiki-close-btn selector">×</div>' +
                                '</div>' +
                                '<div class="wiki-content-scroll">' +
                                    '<div class="wiki-loader">Завантаження статті...</div>' +
                                '</div></div>');

            $('body').append(viewer);

            var closeViewer = function() {
                viewer.remove();
                Lampa.Controller.toggle(prev_controller);
            };

            viewer.find('.wiki-close-btn').on('hover:enter click', function(e) {
                closeViewer();
            });

            // Налаштовуємо контролер одразу
            Lampa.Controller.add('wiki_viewer', {
                toggle: function() {
                    Lampa.Controller.collectionSet(viewer);
                    Lampa.Controller.collectionFocus(viewer.find('.wiki-close-btn')[0], viewer);
                },
                up: function() { 
                    viewer.find('.wiki-content-scroll').scrollTop(viewer.find('.wiki-content-scroll').scrollTop() - 50); 
                },
                down: function() { 
                    viewer.find('.wiki-content-scroll').scrollTop(viewer.find('.wiki-content-scroll').scrollTop() + 50); 
                },
                back: closeViewer
            });

            Lampa.Controller.toggle('wiki_viewer');

            // Тільки тепер вантажимо контент
            var apiUrl = 'https://' + (lang === 'ua' ? 'uk' : 'en') + '.wikipedia.org/api/rest_v1/page/html/' + encodeURIComponent(key);

            $.ajax({
                url: apiUrl,
                timeout: 10000, // 10 секунд тайм-аут
                success: function(htmlContent) {
                    // Очистка та вставка
                    htmlContent = htmlContent.replace(/src="\/\//g, 'src="https://');
                    htmlContent = htmlContent.replace(/href="\//g, 'href="https://wikipedia.org/');
                    
                    var contentDiv = viewer.find('.wiki-content-scroll');
                    contentDiv.html(htmlContent);
                    
                    // Видаляємо зайве, щоб було легше читати
                    contentDiv.find('script, style, link').remove();
                },
                error: function() {
                    viewer.find('.wiki-loader').text('Не вдалося завантажити статтю :(');
                }
            });
        };
    }

    if (window.Lampa) window.wiki_info = new WikiInfoPlugin().init();
})();
