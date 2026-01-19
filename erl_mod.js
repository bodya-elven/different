(function () {
    'use strict';

    const CONFIG = {
        api_url: 'https://api.mdblist.com/tmdb/',
        cache_time: 60 * 60 * 24 * 7 * 1000, // 7 днів
        cache_key: 'erl_ratings_cache',
        cache_limit: 500
    };

    // Переклади
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            erl_title: { uk: 'Рейтинги та Логотипи', ru: 'Рейтинги и Логотипы', en: 'Ratings & Logos' },
            erl_mdblist_key: { uk: 'MDBList API Ключ', ru: 'MDBList API Ключ', en: 'MDBList API Key' },
            erl_logo_height: { uk: 'Висота логотипу', ru: 'Высота логотипа', en: 'Logo Height' }
        });
    }

    // Кешування
    class CacheManager {
        static get(id) {
            let cache = Lampa.Storage.cache(CONFIG.cache_key, CONFIG.cache_limit, {});
            let entry = cache[id];
            if (entry && (Date.now() - entry.timestamp < CONFIG.cache_time)) return entry.data;
            return null;
        }
        static set(id, data) {
            let cache = Lampa.Storage.cache(CONFIG.cache_key, CONFIG.cache_limit, {});
            cache[id] = { timestamp: Date.now(), data: data };
            Lampa.Storage.set(CONFIG.cache_key, cache);
        }
    }

    // Запит до MDBList
    function fetchMDB(movie, callback) {
        let key = Lampa.Storage.get('erl_mdblist_key', '');
        if (!key) return callback(null);
        let type = movie.number_of_seasons ? 'show' : 'movie';
        let url = CONFIG.api_url + type + '/' + movie.id + '?apikey=' + key;
        let network = new Lampa.Reguest();
        network.silent(url, (res) => {
            let result = { logo: res.logo || null, ratings: {} };
            if (res.ratings) res.ratings.forEach(r => { if (r.source !== 'tmdb') result.ratings[r.source.toLowerCase()] = r.value; });
            callback(result);
        }, () => callback(null));
    }

    // Відображення
    function renderERL(container, data) {
        container.find('.erl-element').remove();
        if (data.logo) {
            let h = Lampa.Storage.get('erl_logo_height', '100');
            container.find('.full-start__title-text').hide();
            container.prepend(`<img class="erl-element" src="${data.logo}" style="max-height: ${h}px; margin-bottom: 15px; display: block;">`);
        }
        if (data.ratings && Object.keys(data.ratings).length > 0) {
            let row = $('<div class="erl-element" style="display: flex; gap: 15px; margin-top: 10px; font-weight: bold;"></div>');
            let colors = { imdb: '#f5c518', tomatoes: '#fa320a', metacritic: '#333' };
            Object.keys(data.ratings).forEach(k => {
                row.append(`<span style="color: ${colors[k] || '#fff'}">${k.toUpperCase()}: ${data.ratings[k]}</span>`);
            });
            container.append(row);
        }
    }

    // Ініціалізація налаштувань (виправлено помилку "undefined")
    function setup() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'erl_settings',
            name: Lampa.Lang.translate('erl_title'),
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>'
        });

        // Ця частина прибирає помилку при кліку на пункт меню
        Lampa.Component.add('erl_settings', function(object, exam) {
            this.create = function() {
                let gui = new Lampa.Settings.Gui();
                gui.create(exam);
                return gui.render();
            };
        });

        Lampa.SettingsApi.addParam({
            component: 'erl_settings',
            param: { name: 'erl_mdblist_key', type: 'input', default: '' },
            field: { name: Lampa.Lang.translate('erl_mdblist_key'), description: 'Ключ з mdblist.com' }
        });

        Lampa.SettingsApi.addParam({
            component: 'erl_settings',
            param: { name: 'erl_logo_height', type: 'select', values: { '80': '80px', '100': '100px', '120': '120px' }, default: '100' },
            field: { name: Lampa.Lang.translate('erl_logo_height') }
        });
    }

    function start() {
        setup();
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                let cached = CacheManager.get(e.data.movie.id);
                let container = e.object.find('.full-start__title');
                if (cached) renderERL(container, cached);
                else fetchMDB(e.data.movie, (d) => { if (d) { CacheManager.set(e.data.movie.id, d); renderERL(container, d); } });
            }
        });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') start(); });
})();
