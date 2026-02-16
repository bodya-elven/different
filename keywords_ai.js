(function () {
    'use strict';

    function KeywordsPlugin() {
        var _this = this;
        var ICON_TAG = 'https://bodya-elven.github.io/Different/tag.svg';

        if (Lampa.Lang) {
            Lampa.Lang.add({
                plugin_keywords_title: { en: 'Tags', uk: 'Теги' },
                plugin_keywords_movies: { en: 'Movies', uk: 'Фільми' },
                plugin_keywords_tv: { en: 'TV Series', uk: 'Серіали' }
            });
        }

        this.init = function () {
            if (!Lampa.Listener) return;

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite' || e.type == 'complete') {
                    var card = e.data.movie;
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        var render = e.object.activity.render();
                        _this.getKeywords(render, card);
                    }
                }
            });

            $('<style>').prop('type', 'text/css').html(
                '.keywords-icon-img { width: 1.4em; height: 1.4em; object-fit: contain; filter: invert(1); margin-right: 0.5em; } ' +
                '.button--keywords { display: flex; align-items: center; } '
            ).appendTo('head');
        };

        this.getKeywords = function (html, card) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '/keywords?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    var tags = resp.keywords || resp.results || [];
                    if (tags.length > 0) {
                        _this.translateTags(tags, function(translatedTags) {
                            _this.renderButton(html, translatedTags);
                        });
                    }
                }
            });
        };

        this.translateTags = function (tags, callback) {
            var lang = Lampa.Storage.get('language', 'uk');
            if (lang !== 'uk') return callback(tags);

            var tagsWithContext = tags.map(function(t) { return "Movie tag: " + t.name; });
            var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=uk&dt=t&q=' + encodeURIComponent(tagsWithContext.join(' ||| '));

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (result) {
                    try {
                        var translatedText = '';
                        if (result && result[0]) result[0].forEach(function(item) { if (item[0]) translatedText += item[0]; });
                        var translatedArray = translatedText.split('|||');
                        tags.forEach(function(tag, index) {
                            if (translatedArray[index]) {
                                tag.name = translatedArray[index]
                                    .replace(/тег до фільму[:\s]*/gi, '')
                                    .replace(/тег фільму[:\s]*/gi, '')
                                    .replace(/movie tag[:\s]*/gi, '')
                                    .replace(/^[:\s\-]*/, '')
                                    .trim();
                            }
                        });
                        callback(tags);
                    } catch (e) { callback(tags); }
                },
                error: function () { callback(tags); }
            });
        };

        this.renderButton = function (html, tags) {
            html.find('.button--keywords').remove();

            var container = html.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length) return;

            var title = Lampa.Lang.translate('plugin_keywords_title');
            var button = $('<div class="full-start__button selector button--keywords"><img src="' + ICON_TAG + '" class="keywords-icon-img" /><span>' + title + '</span></div>');

            button.on('hover:enter click', function () {
                var controllerName = Lampa.Controller.enabled().name;
                var items = tags.map(function(tag) {
                    return { 
                        title: tag.name.charAt(0).toUpperCase() + tag.name.slice(1), 
                        tag_data: tag 
                    };
                });

                Lampa.Select.show({
                    title: title,
                    items: items,
                    onSelect: function (selectedItem) {
                        _this.showTypeMenu(selectedItem.tag_data, controllerName, button, html);
                    },
                    onBack: function () {
                        // Точно як у твоєму прикладі: toggle + collectionFocus
                        Lampa.Controller.toggle(controllerName);
                        Lampa.Controller.collectionFocus(button[0], html[0]);
                    }
                });
            });

            container.append(button);
            
            // Оновлення активності для реєстрації нових селекторів
            Lampa.Controller.add('full_start', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(html.find('.selector')[0], html[0]);
                }
            });
        };

        this.showTypeMenu = function(tag, prevController, btnElement, renderElement) {
            Lampa.Select.show({
                title: tag.name,
                items: [
                    { title: Lampa.Lang.translate('plugin_keywords_movies'), method: 'movie' },
                    { title: Lampa.Lang.translate('plugin_keywords_tv'), method: 'tv' }
                ],
                onSelect: function(item) {
                    Lampa.Activity.push({
                        url: 'discover/' + item.method + '?with_keywords=' + tag.id + '&sort_by=popularity.desc',
                        title: tag.name,
                        component: 'category_full',
                        source: 'tmdb',
                        page: 1
                    });
                },
                onBack: function() {
                    // Повернення до селекту тегів
                    Lampa.Controller.toggle('select');
                }
            });
        };
    }

    if (!window.plugin_keywords_instance) {
        window.plugin_keywords_instance = new KeywordsPlugin();
        window.plugin_keywords_instance.init();
    }
})();
