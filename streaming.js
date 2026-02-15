(function () {
    'use strict';

    function StreamingPlatformsPlugin() {
        var _this = this;
        
        // Посилання на іконку стрімінгів
        var ICON_STREAM = 'https://bodya-elven.github.io/Different/stream.svg';

        // Локалізація
        if (Lampa.Lang) {
            Lampa.Lang.add({
                plugin_platforms_title: {
                    en: 'Streaming Platforms',
                    uk: 'Стрімінгові платформи'
                },
                plugin_platforms_not_found: {
                    en: 'No platforms found (US)',
                    uk: 'Платформ не знайдено (US)'
                }
            });
        }

        this.init = function () {
            if (!Lampa.Listener) return;

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        _this.getPlatforms(e.object.activity.render(), card);
                    }
                }
            });

            var style = document.createElement('style');
            style.innerHTML = `
                .platforms-icon-img { 
                    width: 1.6em; 
                    height: 1.6em; 
                    object-fit: contain;
                    display: block;
                    filter: invert(1); 
                }
                .button--platforms { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 0.4em; 
                }
                .platform-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 10px;
                }
                .platform-item img {
                    width: 2.2em;
                    height: 2.2em;
                    border-radius: 6px;
                }
            `;
            document.head.appendChild(style);
        };

        this.getPlatforms = function (html, card) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '/watch/providers?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    // Жорстка прив'язка до регіону США (US)
                    var data = resp.results ? resp.results.US : null;
                    var platforms = [];
                    
                    // Беремо платформи, доступні за підпискою (flatrate)
                    if (data && data.flatrate) platforms = data.flatrate;

                    if (platforms.length > 0) {
                        _this.renderButton(html, platforms);
                    }
                }
            });
        };

        this.renderButton = function (html, platforms) {
            var container = html.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length) {
                var btn = html.find('.button--play, .button--trailer, .full-start__button').first();
                if (btn.length) container = btn.parent();
            }
            if (!container.length || container.find('.button--platforms').length) return;

            var title = Lampa.Lang.translate('plugin_platforms_title');
            var icon = '<img src="' + ICON_STREAM + '" class="platforms-icon-img" />';
            var button = $('<div class="full-start__button selector button--platforms">' + icon + '<span>' + title + '</span></div>');

            button.on('hover:enter click', function () {
                var items = platforms.map(function(p) {
                    return {
                        title: p.provider_name,
                        icon: 'https://image.tmdb.org/t/p/w500' + p.logo_path
                    };
                });

                Lampa.Select.show({
                    title: title + ' (US)',
                    items: items,
                    onRender: function(item, html_item) {
                        $(html_item).addClass('platform-item');
                        $(html_item).prepend('<img src="' + item.icon + '">');
                    },
                    onSelect: function (selectedItem) {
                        // Просто показуємо назву платформи при натисканні
                        Lampa.Noty.show(selectedItem.title);
                    },
                    onBack: function() {
                        Lampa.Controller.toggle('full_start');
                    }
                });
            });

            // Додаємо кнопку останньою в списку
            container.append(button);
        };
    }

    if (!window.plugin_platforms_instance) {
        window.plugin_platforms_instance = new StreamingPlatformsPlugin();
        window.plugin_platforms_instance.init();
    }
})();
