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
                if (e.type === 'complite' || e.type === 'complete') {
                    var card = e.data.movie;
                    if (card && (card.source === 'tmdb' || e.data.source === 'tmdb') && card.id) {
                        var render = e.object.activity.render();
                        _this.getKeywords(render, card);
                    }
                }
            });

            $('<style>').prop('type', 'text/css').html(
                '.keywords-icon-img{width:1.4em;height:1.4em;object-fit:contain;filter:invert(1);margin-right:.5em}' +
                '.button--keywords{display:flex;align-items:center}'
            ).appendTo('head');
        };

        this.getKeywords = function (render, card) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '/keywords?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    var tags = resp.keywords || resp.results || [];
                    if (!tags.length) return;

                    _this.translateTags(tags, function (translated) {
                        _this.renderButton(render, translated);
                    });
                }
            });
        };

        this.translateTags = function (tags, callback) {
            var lang = Lampa.Storage.get('language', 'uk');
            if (lang !== 'uk') return callback(tags);

            var source = tags.map(function (t) {
                return 'Movie tag: ' + t.name;
            }).join(' ||| ');

            var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=uk&dt=t&q=' + encodeURIComponent(source);

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (res) {
                    try {
                        var text = '';
                        res[0].forEach(function (i) {
                            if (i[0]) text += i[0];
                        });

                        text.split('|||').forEach(function (name, i) {
                            if (tags[i]) {
                                tags[i].name = name
                                    .replace(/movie tag[:\s]*/i, '')
                                    .replace(/тег.*?[:\s]*/i, '')
                                    .trim();
                            }
                        });
                    } catch (e) {}
                    callback(tags);
                },
                error: function () {
                    callback(tags);
                }
            });
        };

        this.renderButton = function (render, tags) {
            $('.button--keywords', render).remove();

            var container = $('.full-start-new__buttons, .full-start__buttons', render).first();
            if (!container.length) return;

            var btn = $(
                '<div class="full-start__button selector button--keywords">' +
                    '<img src="' + ICON_TAG + '" class="keywords-icon-img">' +
                    '<span>' + Lampa.Lang.translate('plugin_keywords_title') + '</span>' +
                '</div>'
            );

            btn.on('hover:enter click', function () {
                _this.openTags(tags, this);
            });

            container.append(btn);
            Lampa.Activity.active().activity.toggle();
        };

        /* =========================
           НАВІГАЦІЯ (ГОЛОВНЕ)
        ========================== */

        this.openTags = function (tags, element) {
            var controller = Lampa.Controller.enabled().name;
            var render = Lampa.Activity.active().activity.render();

            Lampa.Select.show({
                title: Lampa.Lang.translate('plugin_keywords_title'),
                items: tags.map(function (tag) {
                    return { title: tag.name, tag: tag };
                }),
                onSelect: function (item) {
                    _this.openType(item.tag, tags, element, controller);
                },
                onBack: function () {
                    Lampa.Controller.toggle(controller);
                    Lampa.Controller.collectionFocus(element, render);
                }
            });
        };

        this.openType = function (tag, allTags, element, controller) {
            Lampa.Select.show({
                title: tag.name,
                items: [
                    { title: Lampa.Lang.translate('plugin_keywords_movies'), type: 'movie' },
                    { title: Lampa.Lang.translate('plugin_keywords_tv'), type: 'tv' }
                ],
                onSelect: function (item) {
                    Lampa.Activity.push({
                        url: 'discover/' + item.type + '?with_keywords=' + tag.id + '&sort_by=popularity.desc',
                        title: tag.name,
                        component: 'category_full',
                        source: 'tmdb',
                        page: 1
                    });
                },
                onBack: function () {
                    _this.openTags(allTags, element);
                }
            });
        };
    }

    if (!window.plugin_keywords_instance) {
        window.plugin_keywords_instance = new KeywordsPlugin();
        window.plugin_keywords_instance.init();
    }
})();