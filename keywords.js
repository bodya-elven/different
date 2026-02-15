(function () {
    'use strict';

    function TMDBKeywords() {
        var _this = this;

        // 1. Локалізація (Тільки UK та EN)
        if (Lampa.Lang) {
            Lampa.Lang.add({
                tmdb_keywords: {
                    en: 'Tags',
                    uk: 'Теги'
                },
                tmdb_keywords_movies: {
                    en: 'Movies',
                    uk: 'Фільми'
                },
                tmdb_keywords_tv: {
                    en: 'TV Series',
                    uk: 'Серіали'
                }
            });
        }

        this.init = function () {
            if (!Lampa.Listener) return;

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    // Перевірка джерела TMDB
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        var render = e.object.activity.render();
                        _this.getKeywords(render, card);
                    }
                }
            });

            // Стилі
            var style = document.createElement('style');
            style.innerHTML = `
                .keywords-icon-img { 
                    width: 1.6em; 
                    height: 1.6em; 
                    object-fit: contain;
                    display: block;
                    filter: invert(1); /* Робить чорну іконку білою */
                }
                .button--keywords { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 0.4em; 
                }
                @media screen and (max-width: 768px) {
                    .button--keywords { padding: 0.5em !important; }
                }
            `;
            document.head.appendChild(style);
        };

        this.getKeywords = function (html, card) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            
            // Запит до API
            var url = Lampa.TMDB.api(method + '/' + card.id + '/keywords?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                async: true,
                success: function (resp) {
                    var tags = resp.keywords || resp.results || [];
                    if (tags.length > 0) {
                        // Переклад + Рендер
                        _this.translateTags(tags, function(translatedTags) {
                            _this.renderButton(html, translatedTags);
                        });
                    }
                },
                error: function () {
                    // Тиха помилка
                }
            });
        };

        // Переклад через Google (UK only)
        this.translateTags = function (tags, callback) {
            var lang = Lampa.Storage.get('language', 'uk');
            
            // Якщо мова інтерфейсу не українська (наприклад англ), не перекладаємо
            if (lang !== 'uk') {
                callback(tags);
                return;
            }

            var originalNames = tags.map(function(t) { return t.name; });
            var textToTranslate = originalNames.join(' ||| '); 
            var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + lang + '&dt=t&q=' + encodeURIComponent(textToTranslate);

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (result) {
                    try {
                        var translatedText = '';
                        if (result && result[0]) {
                            result[0].forEach(function(item) {
                                if (item[0]) translatedText += item[0];
                            });
                        }
                        var translatedArray = translatedText.split('|||');
                        tags.forEach(function(tag, index) {
                            if (translatedArray[index]) tag.name = translatedArray[index].trim();
                        });
                        callback(tags);
                    } catch (e) { callback(tags); }
                },
                error: function () { callback(tags); }
            });
        };

        this.renderButton = function (html, tags) {
            var container = html.find('.full-start-new__buttons, .full-start__buttons').first();
            
            if (!container.length) {
                var btn = html.find('.button--play, .button--trailer, .full-start__button').first();
                if (btn.length) container = btn.parent();
            }

            if (!container.length || container.find('.button--keywords').length) return;

            var title = Lampa.Lang.translate('tmdb_keywords');
            // Твоя іконка
            var icon = '<img src="https://bodya-elven.github.io/Different/tag.svg" class="keywords-icon-img" />';
            
            var button = $('<div class="full-start__button selector view--category button--keywords">' + icon + '<span>' + title + '</span></div>');

            button.on('hover:enter click', function () {
                // 1. Список тегів
                var items = tags.map(function(tag) {
                    return { 
                        title: tag.name, 
                        tag_data: tag 
                    };
                });

                Lampa.Select.show({
                    title: title, 
                    items: items,
                    onSelect: function (selectedItem) {
                        // 2. Меню вибору: Фільми чи Серіали (сортування ЗАВЖДИ за популярністю)
                        _this.showTypeMenu(selectedItem.tag_data);
                    }
                });
            });

            container.append(button);
            Lampa.Controller.toggle('full_start');
        };

        this.showTypeMenu = function(tag) {
            var menu = [
                {
                    title: Lampa.Lang.translate('tmdb_keywords_movies'),
                    method: 'movie'
                },
                {
                    title: Lampa.Lang.translate('tmdb_keywords_tv'),
                    method: 'tv'
                }
            ];

            Lampa.Select.show({
                title: tag.name, // Назва тегу в заголовку
                items: menu,
                onSelect: function(item) {
                    // Відкриваємо каталог з сортуванням POPULARITY
                    Lampa.Activity.push({ 
                        url: 'discover/' + item.method + '?with_keywords=' + tag.id + '&sort_by=popularity.desc', 
                        title: tag.name + ' - ' + item.title, 
                        component: 'category_full', 
                        source: 'tmdb', 
                        page: 1 
                    });
                }
            });
        };
    }

    if (!window.plugin_tmdb_keywords_pop) {
        window.plugin_tmdb_keywords_pop = new TMDBKeywords();
        window.plugin_tmdb_keywords_pop.init();
    }
})();
