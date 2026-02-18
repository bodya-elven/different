(function () {
    'use strict';

    function TMDBStudios() {
        var _this = this;

        // Посилання на зовнішню іконку
        var ICON_STUDIOS = 'https://bodya-elven.github.io/different/icons/film.svg';

        // Локалізація
        if (Lampa.Lang) {
            Lampa.Lang.add({
                tmdb_studios: {
                    en: 'Production',
                    uk: 'Виробництво'
                }
            });
        }

        this.init = function () {
            if (!Lampa.Listener) return;

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        var render = e.object.activity.render();
                        // 1. Малюємо кнопку відразу (напівпрозору)
                        _this.drawButton(render);
                        // 2. Вантажимо дані
                        _this.getStudios(render, card);
                    }
                }
            });

            // Стилі (повернуто стилі для зображення)
            $('<style>').prop('type', 'text/css').html(
                '.studios-icon-img { width: 1.4em; height: 1.4em; object-fit: contain; display: block; filter: invert(1); margin-right: 0.5em; } ' +
                '.button--studios { display: flex; align-items: center; opacity: 0.5; pointer-events: none; } ' + 
                '.button--studios.ready { opacity: 1; pointer-events: auto; }'
            ).appendTo('head');
        };

        this.drawButton = function (render) {
            var container = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length || container.find('.button--studios').length) return;

            var title = Lampa.Lang.translate('tmdb_studios');
            var icon = '<img src="' + ICON_STUDIOS + '" class="studios-icon-img" />';
            var btn = $('<div class="full-start__button selector view--category button--studios">' + icon + '<span>' + title + '</span></div>');

            // Вставляємо перед кнопкою закладок/лайків
            var bookmarkBtn = container.find('.button--book, .button--like').first();
            if (bookmarkBtn.length) {
                bookmarkBtn.before(btn);
            } else {
                container.append(btn);
            }
        };

        this.getStudios = function (render, card) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'uk'));

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    var studios = resp.production_companies || [];
                    if (studios.length > 0) {
                        _this.activateButton(render, studios);
                    }
                }
            });
        };

        this.activateButton = function (render, studios) {
            var btn = render.find('.button--studios');
            if (!btn.length) return; 

            // Робимо активною
            btn.addClass('ready');

            btn.off('hover:enter click').on('hover:enter click', function () {
                _this.openStudiosMenu(studios, btn, render);
            });
        };

        this.openStudiosMenu = function(studios, btnElement, renderContainer) {
            var title = Lampa.Lang.translate('tmdb_studios');

            var items = studios.map(function(s) {
                return { title: s.name, id: s.id };
            });

            Lampa.Select.show({
                title: title, 
                items: items,
                onSelect: function (selectedItem) {
                    Lampa.Activity.push({
                        url: 'movie', 
                        id: selectedItem.id,
                        title: selectedItem.title,
                        component: 'company',
                        source: 'tmdb',
                        page: 1
                    });
                },
                onBack: function() {
                    // === ПРАВИЛЬНЕ ВИПРАВЛЕННЯ ДЛЯ СВАЙПУ ===
                    // Використовуємо activity.toggle(), щоб Lampa відновила слухачі подій
                    if (Lampa.Activity.active() && Lampa.Activity.active().activity) {
                        Lampa.Activity.active().activity.toggle();
                    } else {
                        Lampa.Controller.toggle('full_start');
                    }

                    // Фокус на кнопку повертаємо ТІЛЬКИ на телевізорі (не тач)
                    if (!Lampa.Platform.is('touch')) {
                        if (btnElement && renderContainer) {
                            Lampa.Controller.collectionFocus(btnElement[0], renderContainer[0]);
                        }
                    }
                }
            });
        };
    }

    if (!window.plugin_tmdb_studios_vfinal) {
        window.plugin_tmdb_studios_vfinal = new TMDBStudios();
        window.plugin_tmdb_studios_vfinal.init();
    }
})();
