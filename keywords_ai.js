(function () {
    'use strict';

    function KeywordsPlugin() {
        var ICON = 'https://bodya-elven.github.io/Different/tag.svg';

        Lampa.Lang.add({
            plugin_keywords_title: { en: 'Tags', uk: 'Теги' },
            plugin_keywords_movies: { en: 'Movies', uk: 'Фільми' },
            plugin_keywords_tv: { en: 'TV Series', uk: 'Серіали' }
        });

        this.init = function () {
            Lampa.Listener.follow('full', function (e) {
                if (e.type !== 'complite' && e.type !== 'complete') return;

                var card = e.data.movie;
                if (!card || card.source !== 'tmdb') return;

                _this.loadTags(e.object.activity.render(), card);
            });
        };

        this.loadTags = function (render, card) {
            var type = card.name ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(type + '/' + card.id + '/keywords?api_key=' + Lampa.TMDB.key());

            $.getJSON(url, function (resp) {
                var tags = resp.keywords || resp.results || [];
                if (tags.length) _this.renderButton(render, tags);
            });
        };

        this.renderButton = function (render, tags) {
            $('.button--keywords', render).remove();

            var btn = $(
                '<div class="full-start__button selector button--keywords">' +
                    '<img src="' + ICON + '" style="width:1.4em;filter:invert(1);margin-right:.5em">' +
                    '<span>' + Lampa.Lang.translate('plugin_keywords_title') + '</span>' +
                '</div>'
            );

            btn.on('hover:enter click', function () {
                _this.showTagsActivity(tags);
            });

            $('.full-start-new__buttons, .full-start__buttons', render)
                .first()
                .append(btn);

            Lampa.Activity.active().activity.toggle();
        };

        this.showTagsActivity = function (tags) {
            Lampa.Activity.push({
                title: Lampa.Lang.translate('plugin_keywords_title'),
                component: {
                    render: function () {
                        var body = $('<div class="tags-list"></div>');

                        tags.forEach(function (tag) {
                            var item = $('<div class="selector">' + tag.name + '</div>');
                            item.on('hover:enter', function () {
                                _this.showTypeActivity(tag);
                            });
                            body.append(item);
                        });

                        return body;
                    },
                    infinite: false,
                    destroy: function () {}
                }
            });
        };

        this.showTypeActivity = function (tag) {
            Lampa.Activity.push({
                title: tag.name,
                component: {
                    render: function () {
                        var body = $('<div class="type-list"></div>');

                        [
                            { title: Lampa.Lang.translate('plugin_keywords_movies'), type: 'movie' },
                            { title: Lampa.Lang.translate('plugin_keywords_tv'), type: 'tv' }
                        ].forEach(function (opt) {
                            var itm = $('<div class="selector">' + opt.title + '</div>');
                            itm.on('hover:enter', function () {
                                Lampa.Activity.push({
                                    url: 'discover/' + opt.type + '?with_keywords=' + tag.id + '&sort_by=popularity.desc',
                                    title: tag.name + ' ' + opt.title,
                                    component: 'category_full',
                                    source: 'tmdb',
                                    page: 1
                                });
                            });
                            body.append(itm);
                        });

                        return body;
                    },
                    infinite: false,
                    destroy: function () {}
                }
            });
        };
    }

    if (!window.plugin_keywords_fixed) {
        window.plugin_keywords_fixed = true;
        new KeywordsPlugin().init();
    }
})();