(function () {
    'use strict';

    /**
     * STUDIOS MASTER v2.1 (Monochrome Edition)
     * Unified Collections for Lampa
     * Description: White monochrome icons for all services.
     */

    var SERVICE_CONFIGS = {
        'netflix': {
            title: 'Netflix',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 2L8.5 22" stroke="#FFFFFF" stroke-width="4"/><path d="M15.5 2L15.5 22" stroke="#FFFFFF" stroke-width="4"/><path d="M8.5 2L15.5 22" stroke="#FFFFFF" stroke-width="4"/></svg>',
            categories: [
                { title: "Нові фільми", type: "movie", params: { "with_watch_providers": "8", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "213", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Фільми в тренді", type: "movie", params: { "with_watch_providers": "8", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Серіали в тренді", type: "tv", params: { "with_networks": "213", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "tv", params: { "with_networks": "213", "with_genres": "16", "sort_by": "popularity.desc" } },
                { title: "Документалістика", type: "tv", params: { "with_networks": "213", "with_genres": "99", "sort_by": "popularity.desc" } }
            ]
        },
        'apple': {
            title: 'Apple TV+',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>',
            categories: [
                { title: "Нові фільми", type: "movie", params: { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}" } },
                { title: "Нові серіали", type: "tv", params: { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Фільми в тренді", type: "movie", params: { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Серіали в тренді", type: "tv", params: { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "movie", params: { "with_watch_providers": "350", "with_genres": "16", "sort_by": "popularity.desc" } }
            ]
        },
        'hbo': {
            title: 'HBO / Max',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M5.6 15.2h1.4V8.8H5.6v2.5H2.9V8.8H1.5v6.4h1.4v-2.7h2.7v2.7zm6.7-6.5c-1.9 0-3.3 1.5-3.3 3.3 0 1.8 1.4 3.3 3.3 3.3s3.3-1.5 3.3-3.3c0-1.8-1.5-3.3-3.3-3.3zm0 5.4c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm8.4-5.4c-1.9 0-3.3 1.5-3.3 3.3 0 1.8 1.4 3.3 3.3 3.3s3.3-1.5 3.3-3.3c0-1.8-1.5-3.3-3.3-3.3zm0 5.4c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg>',
            categories: [
                { title: "Нові фільми", type: "movie", params: { "with_companies": "174", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "49", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Серіали в тренді", type: "tv", params: { "with_networks": "49", "sort_by": "popularity.desc" } },
                { title: "Фільми в тренді", type: "movie", params: { "with_companies": "174", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "tv", params: { "with_networks": "49|80", "with_genres": "16", "sort_by": "popularity.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "49", "vote_average.gte": "8.0", "vote_count.gte": "500", "sort_by": "vote_average.desc" } },
                { title: "Топ фільмів", type: "movie", params: { "with_companies": "174", "vote_average.gte": "7.5", "sort_by": "vote_average.desc" } },
                { title: "Всесвіт DC", type: "movie", params: { "with_companies": "174", "with_keywords": "9715", "sort_by": "popularity.desc" } }
            ]
        },
        'prime': {
            title: 'Prime Video',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M21.9 15.5c-.3-.4-2.2-.2-3.1-.1-.3 0-.3-.2-.1-.4 1.5-1.1 4-.8 4.3-.4.3.4-.1 2.8-1.5 4-.2.2-.4.1-.3-.2.3-.7 1-2.5.7-2.9zM12 18c-4.5 0-8.2-2.5-9.8-5.3-.2-.4-.7-.4-.9 0-.2.5.1 1.1.4 1.5 1.9 3 5.9 5.5 10.3 5.5s7.3-1.6 9.2-3.8c.2-.3.2-.8-.1-1-.3-.2-.7-.1-.9.2-1.6 1.8-4.1 2.9-8.2 2.9z"/></svg>',
            categories: [
                { title: "Нові фільми", type: "movie", params: { "with_watch_providers": "119", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}" } },
                { title: "Нові серіали", type: "tv", params: { "with_watch_providers": "119", "watch_region": "UA", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Серіали в тренді", type: "tv", params: { "with_watch_providers": "119", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Фільми в тренді", type: "movie", params: { "with_watch_providers": "119", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "tv", params: { "with_watch_providers": "119", "with_genres": "16", "sort_by": "popularity.desc" } }
            ]
        },
        'disney': {
            title: 'Disney+',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 4.5c-2 0-3.5 1.5-3.5 1.5s-4-1-6 2c-1.5 2.2 0 6.5 0 6.5s-2 1-3.5 0c-1-.7 0-3 0-3s-2.5 1-2.5 3c0 2.5 3 4 5 4 4 0 9-3 11-8 1-2.5 0-6-0.5-6z"/></svg>',
            categories: [
                { title: "Нові фільми", type: "movie", params: { "with_watch_providers": "337", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}" } },
                { title: "Нові серіали", type: "tv", params: { "with_watch_providers": "337", "watch_region": "UA", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Серіали в тренді", type: "tv", params: { "with_watch_providers": "337", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Фільми в тренді", type: "movie", params: { "with_watch_providers": "337", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "movie", params: { "with_watch_providers": "337", "with_genres": "16", "sort_by": "popularity.desc" } },
                { title: "Всесвіт Marvel", type: "movie", params: { "with_companies": "420", "sort_by": "release_date.desc" } }
            ]
        },
        'hulu': {
            title: 'Hulu',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M20 7v6.5c0 .8.7 1.5 1.5 1.5h.5V7h2v10h-3c-1.7 0-3-1.3-3-3V9.5c0-.8-.7-1.5-1.5-1.5S15 8.7 15 9.5V17h-2V7h2v6.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V7h2zM7.5 7v6.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V7h2v6.5c0 1.9-1.6 3.5-3.5 3.5S5.5 15.4 5.5 13.5V7h2zM2 7h2v10H2V7z"/></svg>',
            categories: [
                { title: "Нові фільми", type: "movie", params: { "with_networks": "453", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "453", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Серіали в тренді", type: "tv", params: { "with_networks": "453", "sort_by": "popularity.desc" } },
                { title: "Фільми в тренді", type: "movie", params: { "with_networks": "453", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "tv", params: { "with_networks": "453", "with_genres": "16", "sort_by": "popularity.desc" } },
                { title: "Топ серіалів FX", type: "tv", params: { "with_networks": "88", "sort_by": "popularity.desc" } }
            ]
        },
        'paramount': {
            title: 'Paramount+',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M2 21h20L12 3 2 21zm10-15l3.5 6.5h-7L12 6z"/></svg>',
            categories: [
                { title: "Нові серіали", type: "tv", params: { "with_networks": "4330", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Топ серіали", type: "tv", params: { "with_networks": "4330", "vote_average.gte": "7.5", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_companies": "4", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}" } },
                { title: "Топ фільми", type: "movie", params: { "with_companies": "4", "vote_count.gte": "500", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "tv", params: { "with_networks": "13|403", "with_genres": "16", "sort_by": "popularity.desc" } }
            ]
        },
        'syfy': {
            title: 'Syfy',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M4 8v2h4l-4 6v-2H0l4-6H4zm16 0v2h4l-4 6v-2h-4l4-6h4zM9 8h2l-2 8H7L9 8zm4 0h2v5h2v-5h2v8h-2v-1h-2v1h-2V8z"/></svg>',
            categories: [
                { title: "Нові серіали", type: "tv", params: { "with_networks": "77", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Популярні серіали", type: "tv", params: { "with_networks": "77", "sort_by": "popularity.desc" } },
                { title: "Фантастика", type: "tv", params: { "with_networks": "77", "with_genres": "10765", "sort_by": "popularity.desc" } },
                { title: "Містика та жахи", type: "tv", params: { "with_networks": "77", "with_genres": "9648", "sort_by": "popularity.desc" } }
            ]
        },
        'peacock': {
            title: 'Peacock',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="5" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="18" cy="15" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="6" cy="15" r="2"/><circle cx="6" cy="8" r="2"/></svg>',
            categories: [
                { title: "Нові фільми", type: "movie", params: { "with_companies": "33", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "6", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Серіали в тренді", type: "tv", params: { "with_networks": "6", "sort_by": "popularity.desc" } },
                { title: "Фільми в тренді", type: "movie", params: { "with_companies": "33", "sort_by": "popularity.desc" } },
                { title: "Комедії та ситкоми", type: "tv", params: { "with_networks": "6", "with_genres": "35", "sort_by": "popularity.desc" } },
                { title: "Анімація", type: "movie", params: { "with_companies": "521", "sort_by": "popularity.desc" } }
            ]
        },
        'bbc': {
            title: 'BBC iPlayer',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="7" width="6" height="10"/><rect x="9" y="7" width="6" height="10"/><rect x="17" y="7" width="6" height="10"/><text x="2.5" y="14.5" fill="black" font-size="6" font-weight="bold" font-family="Arial">B</text><text x="10.5" y="14.5" fill="black" font-size="6" font-weight="bold" font-family="Arial">B</text><text x="18.5" y="14.5" fill="black" font-size="6" font-weight="bold" font-family="Arial">C</text></svg>',
            categories: [
                { title: "Нові серіали", type: "tv", params: { "with_networks": "4|2", "origin_country": "GB", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Популярні серіали", type: "tv", params: { "with_networks": "4|2", "sort_by": "popularity.desc" } },
                { title: "Детективи", type: "tv", params: { "with_networks": "4|2", "with_genres": "80", "sort_by": "popularity.desc" } },
                { title: "Драма", type: "tv", params: { "with_networks": "4|2", "with_genres": "18", "sort_by": "popularity.desc" } }
            ]
        },
        'amc': {
            title: 'AMC+',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M2 12h20v2H2z"/><text x="4" y="10" fill="#FFFFFF" font-size="8" font-weight="bold" font-family="Arial">amc</text></svg>',
            categories: [
                { title: "Нові серіали", type: "tv", params: { "with_networks": "174", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "Топ серіали", type: "tv", params: { "with_networks": "174", "vote_average.gte": "8.0", "sort_by": "popularity.desc" } },
                { title: "Жахи та Містика від Shudder", type: "tv", params: { "with_networks": "174", "with_genres": "18|9648", "with_keywords": "3335", "sort_by": "popularity.desc" } }
            ]
        },
        'educational': {
            title: 'Пізнавальне',
            icon: '<svg viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
            categories: [
                { title: "Новинки", type: "tv", params: { "with_networks": "64|91|43|2696|4|65", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}" } },
                { title: "BBC Earth", type: "tv", params: { "with_networks": "4", "with_genres": "99", "sort_by": "vote_average.desc" } },
                { title: "National Geographic", type: "tv", params: { "with_networks": "43", "sort_by": "popularity.desc" } },
                { title: "Discovery Channel", type: "tv", params: { "with_networks": "64", "sort_by": "popularity.desc" } },
                { title: "Animal Planet", type: "tv", params: { "with_networks": "91", "sort_by": "popularity.desc" } },
                { title: "History Channel", type: "tv", params: { "with_networks": "65|2696", "sort_by": "popularity.desc" } }
            ]
        }
    };
    // -----------------------------------------------------------------
    // COMPONENTS
    // -----------------------------------------------------------------

    function StudiosMain(object) {
        var comp = new Lampa.InteractionMain(object);
        var config = SERVICE_CONFIGS[object.service_id];

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);
            var categories = config.categories;
            var network = new Lampa.Reguest();
            var status = new Lampa.Status(categories.length);

            status.onComplite = function () {
                var fulldata = [];
                Object.keys(status.data).sort(function (a, b) { return a - b; }).forEach(function (key) {
                    var data = status.data[key];
                    if (data && data.results && data.results.length) {
                        var cat = categories[parseInt(key)];
                        Lampa.Utils.extendItemsParams(data.results, { style: { name: 'wide' } });
                        fulldata.push({
                            title: cat.title,
                            results: data.results,
                            url: cat.type === 'movie' ? 'discover/movie' : 'discover/tv',
                            params: cat.params,
                            service_id: object.service_id
                        });
                    }
                });

                if (fulldata.length) {
                    _this.build(fulldata);
                    _this.activity.loader(false);
                } else {
                    _this.empty();
                }
            };

            categories.forEach(function (cat, index) {
                var params = [];
                params.push('api_key=' + Lampa.TMDB.key());
                params.push('language=' + Lampa.Storage.get('language', 'uk'));

                if (cat.params) {
                    for (var key in cat.params) {
                        var val = cat.params[key];
                        if (val === '{current_date}') {
                            var d = new Date();
                            val = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                        }
                        params.push(key + '=' + val);
                    }
                }

                var url = Lampa.TMDB.api((cat.type === 'movie' ? 'discover/movie' : 'discover/tv') + '?' + params.join('&'));

                network.silent(url, function (json) {
                    status.append(index.toString(), json);
                }, function () {
                    status.error();
                });
            });

            return this.render();
        };

        comp.onMore = function (data) {
            Lampa.Activity.push({
                url: data.url,
                params: data.params,
                title: data.title,
                component: 'studios_view',
                page: 1
            });
        };

        return comp;
    }

    function StudiosView(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        function buildUrl(page) {
            var params = [];
            params.push('api_key=' + Lampa.TMDB.key());
            params.push('language=' + Lampa.Storage.get('language', 'uk'));
            params.push('page=' + page);

            if (object.params) {
                for (var key in object.params) {
                    var val = object.params[key];
                    if (val === '{current_date}') {
                        var d = new Date();
                        val = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                    }
                    params.push(key + '=' + val);
                }
            }
            return Lampa.TMDB.api(object.url + '?' + params.join('&'));
        }

        comp.create = function () {
            var _this = this;
            network.silent(buildUrl(1), function (json) {
                _this.build(json);
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            network.silent(buildUrl(object.page), resolve, reject);
        };

        return comp;
    }

    // -----------------------------------------------------------------
    // INJECTION
    // -----------------------------------------------------------------

    function startPlugin() {
        if (window.plugin_studios_master_v2_1_ready) return;
        window.plugin_studios_master_v2_1_ready = true;

        // Register components
        Lampa.Component.add('studios_main', StudiosMain);
        Lampa.Component.add('studios_view', StudiosView);

        // Inject CSS for wide cards
        if (!$('#studios-unified-css').length) {
            $('body').append(`
                <style id="studios-unified-css">
                    .studios_main .card--wide { width: 18.3em !important; }
                    .studios_view .card--wide { width: 18.3em !important; }
                    .studios_view .category-full { padding-top: 1em; }
                </style>
            `);
        }

        // Add Menu Buttons
        function addMenuButtons() {
            var menu = $('.menu .menu__list').eq(0);
            if (!menu.length) return;

            Object.keys(SERVICE_CONFIGS).forEach(function (sid) {
                var conf = SERVICE_CONFIGS[sid];
                if (menu.find('.menu__item[data-sid="' + sid + '"]').length) return;

                var btn = $(`<li class="menu__item selector" data-action="studios_action_${sid}" data-sid="${sid}">
                    <div class="menu__ico">${conf.icon}</div>
                    <div class="menu__text">${conf.title}</div>
                </li>`);

                btn.on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: conf.title,
                        component: 'studios_main',
                        service_id: sid,
                        page: 1
                    });
                });

                menu.append(btn);
            });
        }

        if (window.appready) {
            addMenuButtons();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') addMenuButtons();
            });
        }

        setInterval(function () {
            if (window.appready && $('.menu .menu__list').eq(0).length) {
                addMenuButtons();
            }
        }, 3000);
    }

    if (!window.plugin_studios_master_v2_1_ready) startPlugin();
})();
