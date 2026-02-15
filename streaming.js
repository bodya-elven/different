(function () {
    'use strict';

    function StreamingPlugin() {
        var _this = this;
        
        var ICON_STREAM = 'https://bodya-elven.github.io/Different/stream.svg';

        if (Lampa.Lang) {
            Lampa.Lang.add({
                plugin_streaming_title: {
                    en: 'Streaming',
                    uk: 'Стрімінги'
                }
            });
        }

        this.init = function () {
            if (!Lampa.Listener) return;

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite' || e.type == 'complete') {
                    var card = e.data.movie;
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        setTimeout(function() {
                            _this.getStreamingData(e.object.activity.render(), card);
                        }, 200);
                    }
                }
            });

            var style = document.createElement('style');
            style.innerHTML = `
                .streaming-icon-img { width: 1.4em; height: 1.4em; object-fit: contain; display: block; filter: invert(1); }
                .button--streaming { display: flex !important; align-items: center; justify-content: center; gap: 0.4em; }
                .streaming-item { display: flex; align-items: center; gap: 15px; padding: 10px; }
                .streaming-item img { width: 2.2em; height: 2.2em; border-radius: 6px; }
            `;
            document.head.appendChild(style);
        };

        this.getStreamingData = function (html, card) {
            var type = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(type + '/' + card.id + '/watch/providers?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    if (!resp.results) return;

                    // 1. Основні регіони: Україна та США
                    var regions = ['UA', 'US'];
                    var providers = [];
                    var excludeKeywords = ['Free', 'Ad', 'With Ads', 'Plex', 'Tubi', 'Pluto TV'];

                    regions.forEach(function(reg) {
                        var reg_data = resp.results[reg];
                        if (reg_data) {
                            // 2. Об'єднуємо типи: підписка, оренда, купівля
                            var combined = (reg_data.flatrate || [])
                                .concat(reg_data.rent || [])
                                .concat(reg_data.buy || []);
                            
                            combined.forEach(function(p) { p.reg = reg; });
                            providers = providers.concat(combined);
                        }
                    });

                    // 3. Розумна фільтрація та видалення дублікатів
                    var unique_providers = [];
                    var added_ids = [];

                    providers.forEach(function(p) {
                        // Фільтрація за пріоритетом (не більше 20) та ключовими словами
                        if (p.display_priority > 20) return;
                        
                        var isExcluded = excludeKeywords.some(function(key) {
                            return p.provider_name.toLowerCase().indexOf(key.toLowerCase()) !== -1;
                        });
                        if (isExcluded) return;

                        if (added_ids.indexOf(p.provider_id) === -1) {
                            added_ids.push(p.provider_id);
                            unique_providers.push(p);
                        }
                    });

                    if (unique_providers.length > 0) {
                        _this.renderButton(html, unique_providers, type);
                    }
                }
            });
        };

        this.renderButton = function (html, providers, type) {
            var container = html.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length || container.find('.button--streaming').length) return;

            var title = Lampa.Lang.translate('plugin_streaming_title');
            var icon = '<img src="' + ICON_STREAM + '" class="streaming-icon-img" />';
            var button = $('<div class="full-start__button selector button--streaming">' + icon + '<span>' + title + '</span></div>');

            button.on('hover:enter click', function () {
                var items = providers.map(function(p) {
                    return {
                        title: p.provider_name + ' (' + p.reg + ')',
                        id: p.provider_id,
                        reg: p.reg,
                        icon: 'https://image.tmdb.org/t/p/w500' + p.logo_path
                    };
                });

                Lampa.Select.show({
                    title: title,
                    items: items,
                    onRender: function(item, html_item) {
                        $(html_item).addClass('streaming-item');
                        $(html_item).prepend('<img src="' + item.icon + '">');
                    },
                    onSelect: function (selected) {
                        Lampa.Activity.push({
                            url: 'discover/' + type,
                            title: selected.title,
                            component: 'category_full',
                            source: 'tmdb',
                            card_type: true,
                            page: 1,
                            filter: {
                                watch_region: selected.reg,
                                with_watch_providers: selected.id
                            }
                        });
                    },
                    onBack: function() { Lampa.Controller.toggle('full_start'); }
                });
            });

            container.append(button);
        };
    }

    if (!window.streaming_plugin_instance) {
        window.streaming_plugin_instance = new StreamingPlugin();
        window.streaming_plugin_instance.init();
    }
})();
