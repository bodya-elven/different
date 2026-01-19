(function () {
    'use strict';

    const PLUGIN_NAME = 'Рейтинги MDBLists';
    const PLUGIN_KEY  = 'mdblists_ratings';
    const VERSION     = '1.0.0';

    /* ==============================
       CONFIG
    ============================== */

    const RATINGS_CONFIG = {
        cacheKey: 'mdblists_ratings_cache',
        cacheLifetime: 24 * 60 * 60 * 1000,
        cacheLimit: 500,
        requestTimeout: 15000
    };

    /* ==============================
       CACHE
    ============================== */

    class RatingsCache {
        static get() {
            return Lampa.Storage.cache(RATINGS_CONFIG.cacheKey, RATINGS_CONFIG.cacheLimit, {});
        }

        static load(id) {
            const cache = this.get();
            const item = cache[id];

            if (!item) return null;
            if (Date.now() - item.time > RATINGS_CONFIG.cacheLifetime) {
                delete cache[id];
                Lampa.Storage.set(RATINGS_CONFIG.cacheKey, cache);
                return null;
            }
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
