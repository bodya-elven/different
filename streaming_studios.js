(function () {
    'use strict';

    /**
     * STUDIOS MASTER v3.5
     * Amazon Fix | Trending Mix | White Icons
     */

    var ICON_BASE = 'https://bodya-elven.github.io/different/icons/';

    var SERVICE_CONFIGS = {
        'netflix': {
            title: 'Netflix',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'netflix.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_networks": "213", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_networks": "213", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "213", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_networks": "213", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "213", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'apple': {
            title: 'Apple TV+',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'apple.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_watch_providers": "350", "watch_region": "UA", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_watch_providers": "350", "watch_region": "UA", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'hbo': {
            title: 'HBO',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'hbo.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_companies": "174", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_companies": "174", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "49", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_companies": "174", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "49", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'prime': {
            title: 'Prime Video',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'primevideo.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_companies": "20580", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_companies": "20580", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "1024", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_companies": "20580", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "1024", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'disney': {
            title: 'Disney+',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'disneyplus.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_companies": "2", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_companies": "2", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "2739", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_companies": "2", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "2739", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'hulu': {
            title: 'Hulu',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'hulu.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_networks": "453", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_networks": "453", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "453", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_networks": "453", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "453", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'paramount': {
            title: 'Paramount+',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'paramount.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_companies": "4", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_companies": "4", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "4330", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_companies": "4", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "4330", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'syfy': {
            title: 'Syfy',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'syfy.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "tv", params: { "with_networks": "77", "sort_by": "popularity.desc" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "77", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "77", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'peacock': {
            title: 'Peacock',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'peacock.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "mixed", params: { "with_networks": "6", "sort_by": "popularity.desc" } },
                { title: "Нові фільми", type: "movie", params: { "with_companies": "33", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "6", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ фільмів", type: "movie", params: { "with_companies": "33", "vote_count.gte": "400", "sort_by": "vote_average.desc" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "6", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'bbc': {
            title: 'BBC',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'bbc.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "tv", params: { "with_networks": "4|2", "sort_by": "popularity.desc" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "4|2", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "4|2", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'amc': {
            title: 'AMC+',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'amcplus.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "tv", params: { "with_networks": "174", "sort_by": "popularity.desc" } },
                { title: "Нові серіали", type: "tv", params: { "with_networks": "174", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { title: "Топ серіалів", type: "tv", params: { "with_networks": "174", "vote_count.gte": "400", "sort_by": "vote_average.desc" } }
            ]
        },
        'educational': {
            title: 'Пізнавальне',
            icon: '<img class="studios_icon" src="' + ICON_BASE + 'world.svg" />',
            categories: [
                { title: "Сьогодні в тренді", type: "tv", params: { "with_networks": "64|91|43|2696|4|65", "sort_by": "popularity.desc" } },
                { title: "Всі проекти (Нові)", type: "tv", params: { "with_networks": "64|91|43|2696|4|65", "sort_by": "first_air_date.desc", "vote_count.gte": "10" } },
                { title: "BBC Earth", type: "tv", params: { "with_networks": "4", "with_genres": "99", "sort_by": "vote_average.desc" } },
                { title: "National Geographic", type: "tv", params: { "with_networks": "43", "sort_by": "popularity.desc" } }
            ]
        }
    };
    function processParams(paramsObj) {
        var result = [];
        result.push('api_key=' + Lampa.TMDB.key());
        result.push('language=' + Lampa.Storage.get('language', 'uk'));
        if (paramsObj) {
            for (var key in paramsObj) {
                var val = paramsObj[key];
                if (val === '{current_date}') {
                    var d = new Date();
                    val = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                }
                result.push(key + '=' + val);
            }
        }
        return result;
    }

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
                        fulldata.push({ title: cat.title, results: data.results, url: (cat.type === 'movie' ? 'discover/movie' : (cat.type === 'tv' ? 'discover/tv' : 'mixed')), params: cat.params });
                    }
                });
                if (fulldata.length) { _this.build(fulldata); _this.activity.loader(false); } 
                else _this.empty();
            };
            categories.forEach(function (cat, index) {
                var p = processParams(cat.params);
                if (cat.type === 'mixed') {
                    var m_res = { results: [] };
                    network.silent(Lampa.TMDB.api('discover/movie?' + p.join('&')), function (j1) {
                        if (j1.results) m_res.results = m_res.results.concat(j1.results.slice(0, 10));
                        network.silent(Lampa.TMDB.api('discover/tv?' + p.join('&')), function (j2) {
                            if (j2.results) m_res.results = m_res.results.concat(j2.results.slice(0, 10));
                            m_res.results.sort(function (a, b) { return b.popularity - a.popularity; });
                            status.append(index.toString(), m_res);
                        }, status.error.bind(status));
                    }, status.error.bind(status));
                } else {
                    var path = cat.type === 'movie' ? 'discover/movie' : 'discover/tv';
                    network.silent(Lampa.TMDB.api(path + '?' + p.join('&')), function (json) { status.append(index.toString(), json); }, status.error.bind(status));
                }
            });
            return this.render();
        };
        comp.onMore = function (data) { 
            var path = data.url === 'mixed' ? 'discover/movie' : data.url;
            Lampa.Activity.push({ url: path, params: data.params, title: data.title, component: 'studios_view', page: 1 }); 
        };
        return comp;
    }

    function StudiosView(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();
        comp.create = function () {
            var _this = this;
            var p = processParams(object.params);
            p.push('page=1');
            network.silent(Lampa.TMDB.api(object.url + '?' + p.join('&')), function (json) { _this.build(json); }, this.empty.bind(this));
        };
        comp.nextPageReuest = function (object, resolve, reject) {
            var p = processParams(object.params);
            p.push('page=' + object.page);
            network.silent(Lampa.TMDB.api(object.url + '?' + p.join('&')), resolve, reject);
        };
        return comp;
    }

    function startPlugin() {
        if (window.plugin_studios_master_v3_5_ready) return;
        window.plugin_studios_master_v3_5_ready = true;
        Lampa.Component.add('studios_main', StudiosMain);
        Lampa.Component.add('studios_view', StudiosView);
        if (!$('#studios-unified-css').length) {
            $('body').append('<style id="studios-unified-css">.studios_main .card--wide, .studios_view .card--wide { width: 18.3em !important; } .studios_icon { width: 100%; height: 100%; display: block; object-fit: contain; filter: brightness(0) invert(1); }</style>');
        }
        function addButtons() {
            var menu = $('.menu .menu__list').eq(0);
            if (!menu.length) return;
            Object.keys(SERVICE_CONFIGS).forEach(function (sid) {
                if (menu.find('[data-sid="' + sid + '"]').length) return;
                var conf = SERVICE_CONFIGS[sid];
                var btn = $('<li class="menu__item selector" data-sid="' + sid + '"><div class="menu__ico">' + conf.icon + '</div><div class="menu__text">' + conf.title + '</div></li>');
                btn.on('hover:enter', function () { Lampa.Activity.push({ title: conf.title, component: 'studios_main', service_id: sid }); });
                menu.append(btn);
            });
        }
        if (window.appready) addButtons();
        else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') addButtons(); });
        setInterval(addButtons, 3000);
    }
    startPlugin();
})();
