(function () {
    'use strict';

    function TMDBKeywords() {
        var _this = this;

        // Локалізація заголовка
        if (Lampa.Lang) {
            Lampa.Lang.add({
                tmdb_keywords: {
                    en: 'Tags',
                    uk: 'Теги',
                    ru: 'Теги'
                }
            });
        }

        this.init = function () {
            if (!Lampa.Listener) return;

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    // Перевіряємо чи це TMDB
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        // Отримуємо рендер
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
                    filter: invert(1); 
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
            
            // Запит до TMDB
            var url = Lampa.TMDB.api(method + '/' + card.id + '/keywords?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                async: true,
                success: function (resp) {
                    var tags = resp.keywords || resp.results || [];
                    if (tags.length > 0) {
                        // Запускаємо переклад, потім малюємо кнопку
                        _this.translateTags(tags, function(translatedTags) {
                            _this.renderButton(html, translatedTags, method);
                        });
                    }
                },
                error: function () {}
            });
        };

        // Функція перекладу (Google Translate)
        this.translateTags = function (tags, callback) {
            var lang = Lampa.Storage.get('language', 'uk');
            
            // Якщо мова англійська - перекладати не треба
            if (lang == 'en') {
                callback(tags);
                return;
            }

            // Формуємо один великий рядок для перекладу (щоб зробити 1 запит замість 20)
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
                            if (translatedArray[index]) {
                                tag.name = translatedArray[index].trim();
                            }
                        });

                        callback(tags);
                    } catch (e) {
                        callback(tags); // Помилка парсингу -> оригінал
                    }
                },
                error: function () {
                    callback(tags); // Помилка мережі -> оригінал
                }
            });
        };

        this.renderButton = function (html, tags, method) {
            var container = html.find('.full-start-new__buttons, .full-start__buttons').first();
            
            if (!container.length) {
                var btn = html.find('.button--play, .button--trailer, .full-start__button').first();
                if (btn.length) container = btn.parent();
            }

            if (!container.length || container.find('.button--keywords').length) return;

            var title = Lampa.Lang.translate('tmdb_keywords');
            // Ваша іконка
            var icon = '<img src="https://bodya-elven.github.io/Different/tag.svg" class="keywords-icon-img" />';
            
            var button = $('<div class="full-start__button selector view--category button--keywords">' + icon + '<span>' + title + '</span></div>');

            button.on('hover:enter click', function () {
                var items = tags.map(function(tag) {
                    // Визначаємо сортування залежно від типу контенту
                    var sort_by = (method == 'tv') ? 'first_air_date.desc' : 'primary_release_date.desc';
                    
                    return { 
                        title: tag.name, 
                        // Додаємо сортування до URL
                        url: 'discover/' + method + '?with_keywords=' + tag.id + '&sort_by=' + sort_by
                    };
                });

                Lampa.Select.show({
                    title: title, 
                    items: items,
                    onSelect: function (a) {
                        Lampa.Activity.push({ 
                            url: a.url, 
                            title: title + ': ' + a.title, 
                            component: 'category_full', 
                            source: 'tmdb', 
                            page: 1 
                        });
                    }
                });
            });

            container.append(button);
            Lampa.Controller.toggle('full_start');
        };
    }

    if (!window.plugin_tmdb_keywords_full) {
        window.plugin_tmdb_keywords_full = new TMDBKeywords();
        window.plugin_tmdb_keywords_full.init();
    }
})();
