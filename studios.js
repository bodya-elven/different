(function () {
    'use strict';

    function TMDBStudios() {
        var _this = this;

        // 1. Локалізація
        if (Lampa.Lang) {
            Lampa.Lang.add({
                tmdb_studios: {
                    en: 'Studios',
                    uk: 'Студії'
                },
                tmdb_studios_movies: {
                    en: 'Movies',
                    uk: 'Фільми'
                },
                tmdb_studios_tv: {
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
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        var render = e.object.activity.render();
                        _this.getStudios(render, card);
                    }
                }
            });

            var style = document.createElement('style');
            style.innerHTML = `
                .studios-icon-svg { 
                    width: 1.6em; 
                    height: 1.6em; 
                    display: block;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                .button--studios { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 0.4em; 
                }
            `;
            document.head.appendChild(style);
        };

        this.getStudios = function (html, card) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    var studios = resp.production_companies || [];
                    if (studios.length > 0) {
                        _this.renderButton(html, studios);
                    }
                }
            });
        };

        this.renderButton = function (html, studios) {
            var container = html.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length) {
                var btn = html.find('.button--play, .button--trailer, .full-start__button').first();
                if (btn.length) container = btn.parent();
            }

            if (!container.length || container.find('.button--studios').length) return;

            var title = Lampa.Lang.translate('tmdb_studios');
            // Іконка "Будівля/Студія"
            var icon = '<svg class="studios-icon-svg" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14M21 7v14M9 21V11h6v10M7 3h10l4 4H3l4-4z"></path></svg>';
            
            var button = $('<div class="full-start__button selector view--category button--studios">' + icon + '<span>' + title + '</span></div>');

            button.on('hover:enter click', function () {
                var items = studios.map(function(s) {
                    return { title: s.name, studio_data: s };
                });

                Lampa.Select.show({
                    title: title, 
                    items: items,
                    onSelect: function (selectedItem) {
                        _this.showTypeMenu(selectedItem.studio_data);
                    },
                    onBack: function() {
                        Lampa.Controller.toggle('full_start');
                    }
                });
            });

            container.append(button);
            Lampa.Controller.toggle('full_start');
        };

        this.showTypeMenu = function(studio) {
            var menu = [
                { title: Lampa.Lang.translate('tmdb_studios_movies'), method: 'movie' },
                { title: Lampa.Lang.translate('tmdb_studios_tv'), method: 'tv' }
            ];

            Lampa.Select.show({
                title: studio.name, 
                items: menu,
                onSelect: function(item) {
                    Lampa.Activity.push({ 
                        url: 'discover/' + item.method + '?with_companies=' + studio.id + '&sort_by=popularity.desc', 
                        title: studio.name + ' - ' + item.title, 
                        component: 'category_full', 
                        source: 'tmdb', 
                        page: 1 
                    });
                },
                onBack: function() {
                    Lampa.Controller.toggle('full_start');
                }
            });
        };
    }

    if (!window.plugin_tmdb_studios) {
        window.plugin_tmdb_studios = new TMDBStudios();
        window.plugin_tmdb_studios.init();
    }
})();
