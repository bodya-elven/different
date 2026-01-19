(function () {
    'use strict';

    if (!window.Lampa) return;

    var plugin_name = 'mdblists';

    console.log('MDBLists plugin loaded');

    // === ПЛАГІН ===
    Lampa.Plugin.add(plugin_name, {
        name: 'MDBLists',
        description: 'Рейтинги з MDBLists',
        version: '1.0.0',
        author: 'bodya-elven',

        start: function () {
            console.log('MDBLists started');
        }
    });

    // === ЕКРАН ПЛАГІНА ===
    function openScreen() {
        var html = `
            <div class="mdblists-screen">
                <h2>MDBLists</h2>
                <p>Тут будуть рейтинги з MDBLists</p>
            </div>
        `;

        var activity = new Lampa.Activity({
            title: 'MDBLists',
            component: 'mdblists',
            content: html
        });

        activity.onBack = function () {
            Lampa.Activity.close();
        };

        Lampa.Activity.push(activity);
    }

    // === ПУНКТ У НАЛАШТУВАННЯХ → РЕЙТИНГИ ===
    Lampa.SettingsApi.addParam({
        component: 'ratings',
        param: {
            name: plugin_name,
            type: 'button'
        },
        field: {
            name: 'MDBLists',
            description: 'Рейтинги з MDBLists'
        },
        onChange: function () {
            openScreen();
        }
    });

})();            }

            return item.data;
        }

        static set(id, data) {
            const cache = this.getAll();
            cache[id] = {
                time: Date.now(),
                data: data
            };
            Lampa.Storage.set(CONFIG.cacheKey, cache);
        }
    }

    /* ==============================
       MDBLIST PROVIDER
    ============================== */

    class MDBListProvider {
        static fetch(movie, callback) {
            const apiKey = Lampa.Storage.get('mdblists_api_key', '');
            if (!apiKey || !movie || !movie.id) {
                callback({});
                return;
            }

            const type = movie.name ? 'show' : 'movie';
            const url = `https://api.mdblist.com/tmdb/${type}/${movie.id}?apikey=${apiKey}`;

            const req = new Lampa.Reguest();
            req.timeout(CONFIG.requestTimeout);
            req.silent(
                url,
                (json) => callback(this.parse(json)),
                () => callback({}),
                false,
                { dataType: 'json' }
            );
        }

        static parse(response) {
            const enabled = Lampa.Storage.get('mdblists_sources', []);
            const result = {};

            if (!response || !Array.isArray(response.ratings)) return result;

            response.ratings.forEach(r => {
                const key = String(r.source || '').toLowerCase();
                if (!enabled.includes(key)) return;

                result[key] = {
                    value: r.value || null,
                    score: r.score || null,
                    votes: r.votes || null,
                    url: r.url || null
                };
            });

            return result;
        }
    }

    /* ==============================
       PUBLIC API
    ============================== */

    class MDBListsRatings {
        static fetch(movie, callback) {
            const cached = Cache.get(movie.id);
            if (cached) {
                callback(cached);
                return;
            }

            MDBListProvider.fetch(movie, (data) => {
                Cache.set(movie.id, data);
                callback(data);
            });
        }
    }

    window.MDBListsRatings = MDBListsRatings;

    /* ==============================
       SETTINGS
    ============================== */

    function initSettings()            }
            return item.data;
        }

        static save(id, data) {
            const cache = this.get();
            cache[id] = { time: Date.now(), data };
            Lampa.Storage.set(RATINGS_CONFIG.cacheKey, cache);
        }
    }

    /* ==============================
       MDBLIST PROVIDER
    ============================== */

    class MDBListProvider {
        static fetch(movie, callback) {
            const apiKey = Lampa.Storage.get('mdblists_api_key', '');
            if (!apiKey || !movie || !movie.id) return callback({});

            const type = movie.name ? 'show' : 'movie';
            const url  = `https://api.mdblist.com/tmdb/${type}/${movie.id}?apikey=${apiKey}`;

            const req = new Lampa.Reguest();
            req.timeout(RATINGS_CONFIG.requestTimeout);
            req.silent(url, (json) => {
                callback(this.parse(json));
            }, () => callback({}), false, { dataType: 'json' });
        }

        static parse(response) {
            const enabled = Lampa.Storage.get('mdblists_sources', []);
            const result = {};

            if (!response || !response.ratings) return result;

            response.ratings.forEach(r => {
                const key = (r.source || '').toLowerCase();
                if (!enabled.includes(key)) return;

                result[key] = {
                    value: r.value,
                    score: r.score,
                    votes: r.votes,
                    url: r.url
                };
            });

            return result;
        }
    }

    /* ==============================
       MAIN MANAGER
    ============================== */

    class MDBListsRatings {
        static fetch(movie, callback) {
            const cached = RatingsCache.load(movie.id);
            if (cached) return callback(cached);

            MDBListProvider.fetch(movie, (data) => {
                RatingsCache.save(movie.id, data);
                callback(data);
            });
        }
    }

    /* ==============================
       SETTINGS
    ============================== */

    function initSettings() {
        Lampa.SettingsApi.addParam({
            component: 'mdblists',
            param: {
                name: 'mdblists_api_key',
                type: 'input',
                placeholder: 'MDBList API key'
            },
            field: {
                name: 'API-ключ MDBList'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'mdblists',
            param: {
                name: 'mdblists_sources',
                type: 'select',
                multiple: true,
                values: {
                    imdb: 'IMDb',
                    metacritic: 'Metacritic',
                    tomatoes: 'Rotten Tomatoes',
                    popcorn: 'Audience',
                    letterboxd: 'Letterboxd'
                }
            },
            field: {
                name: 'Джерела рейтингів'
            }
        });
    }

    /* ==============================
       INIT
    ============================== */

    Lampa.SettingsApi.addComponent({
        id: 'mdblists',
        name: PLUGIN_NAME,
        icon: 'star'
    });

    initSettings();

    // експорт для інших модулів / відображення
    window.MDBListsRatings = MDBListsRatings;

})();
