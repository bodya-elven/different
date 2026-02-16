(function () {
    'use strict';

    function KeywordsPlugin() {
        var _this = this;
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

                _this.load(e.object.activity.render(), card);
            });
        };

        this.load = function (render, card) {
            var type = card.name ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(type + '/' + card.id + '/keywords?api_key=' + Lampa.TMDB.key());

            $.getJSON(url, function (r) {
                var tags = r.keywords || r.results || [];
                if (tags.length) _this.button(render, tags);
            });
        };

        this.button = function (render, tags) {
            $('.button--keywords', render).remove();

            var btn = $(
                '<div class="full-start__button selector button--keywords">' +
                '<img src="' + ICON + '" style="width:1.4em;margin-right:.5em;filter:invert(1)">' +
                '<span>' + Lampa.Lang.translate('plugin_keywords_title') + '</span>' +
                '</div>'
            );

            btn.on('hover:enter', function () {
                _this.openTags(tags, btn);
            });

            $('.full-start-new__buttons, .full-start__buttons', render)
                .first()
                .append(btn);

            Lampa.Activity.active().activity.toggle();
        };

        /* ==========================
           ВАЖЛИВА ЧАСТИНА
        ========================== */

        this.openTags = function (tags, btn) {
            var controller = Lampa.Controller.enabled().name;
            var render = Lampa.Activity.active().activity.render();

            // 🔴 ЯВНО відключаємо controller
            Lampa.Controller.toggle(false);

            Lampa.Select.show({
                title: Lampa.Lang.translate('plugin_keywords_title'),
                items: tags.map(function (t) {
                    return { title: t.name, tag: t };
                }),
                onSelect: function (i) {
                    _this.openType(i.tag, tags, btn, controller);
                },
                onBack: function () {
                    // 🟢 ЯВНО закриваємо Select
                    Lampa.Select.hide();

                    // 🟢 Повертаємо controller
                    Lampa.Controller.toggle(controller);

                    // 🟢 Повертаємо фокус
                    Lampa.Controller.collectionFocus(btn, render);
                }
            });
        };

        this.openType = function (tag, tags, btn, controller) {
            Lampa.Select.show({
                title: tag.name,
                items: [
                    { title: Lampa.Lang.translate('plugin_keywords_movies'), type: 'movie' },
                    { title: Lampa.Lang.translate('plugin_keywords_tv'), type: 'tv' }
                ],
                onSelect: function (i) {
                    Lampa.Activity.push({
                        url: 'discover/' + i.type + '?with_keywords=' + tag.id,
                        title: tag.name,
                        component: 'category_full',
                        source: 'tmdb',
                        page: 1
                    });
                },
                onBack: function () {
                    Lampa.Select.hide();
                    _this.openTags(tags, btn);
                }
            });
        };
    }

    if (!window.keywords_plugin_fixed) {
        window.keywords_plugin_fixed = true;
        new KeywordsPlugin().init();
    }
})();