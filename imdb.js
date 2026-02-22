(function () {
    'use strict';

    var PLUGIN_NAME = 'omdb_imdb_ratings_plugin';
    var PLUGIN_TITLE = 'IMDb Ratings (OMDb)';
    var CACHE_KEY = 'omdb_ratings_cache';
    
    // Кольорова іконка IMDb
    var ICON_IMDB = 'https://bodya-elven.github.io/different/icons/imdb.svg';

    /*
    |==========================================================================
    | СТВОРЕННЯ МЕНЮ НАЛАШТУВАНЬ (За зразком MDBList)
    |==========================================================================
    */
    function initSettings() {
        if (!Lampa.SettingsApi || window.omdb_settings_ready) return;
        window.omdb_settings_ready = true;

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_NAME,
            name: PLUGIN_TITLE,
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="20" height="10" rx="2" ry="2" stroke="currentColor" stroke-width="2"/><path d="M5 10v4M9 10v4M13 10v4M17 10v4M5 12h14" stroke="currentColor" stroke-width="2"/></svg>`
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: { name: 'omdb_status', type: 'trigger', "default": true },
            field: { name: 'Увімкнути плагін', description: 'Відображення рейтингів IMDb на постерах' },
            onRender: function() {}
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: { name: 'omdb_api_key_1', type: 'input', "default": '' },
            field: { name: 'API Ключ 1', description: 'Основний ключ OMDb (omdbapi.com)' },
            onRender: function() {}
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: { name: 'omdb_api_key_2', type: 'input', "default": '' },
            field: { name: 'API Ключ 2', description: 'Резервний ключ OMDb' },
            onRender: function() {}
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: { 
                name: 'omdb_cache_ttl', 
                type: 'select', 
                values: { '1': '1 день', '3': '3 дні', '7': '7 днів', '14': '14 днів', '30': '30 днів' }, 
                "default": '7' 
            },
            field: { name: 'Час зберігання кешу', description: 'Як довго пам\'ятати отримані рейтинги' },
            onRender: function() {}
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: { type: 'button', name: 'omdb_clear_cache_btn' },
            field: { name: 'Очистити кеш', description: 'Видалити всі збережені рейтинги з пам\'яті' },
            onChange: function() { 
                localStorage.removeItem(CACHE_KEY);
                if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Кеш рейтингів IMDb успішно очищено.');
            },
            onRender: function() {}
        });
    }

    /*
    |==========================================================================
    | РОБОТА З КЕШЕМ
    |==========================================================================
    */
    function getCache() {
        var cache = localStorage.getItem(CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    }

    function saveCache(id, rating) {
        var cache = getCache();
        var ttlDays = parseInt(Lampa.Storage.get('omdb_cache_ttl', '7'));
        cache[id] = {
            rating: rating,
            timestamp: Date.now() + (ttlDays * 24 * 60 * 60 * 1000)
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }

    function getCachedRating(id) {
        var cache = getCache();
        if (cache[id]) {
            if (Date.now() > cache[id].timestamp) {
                delete cache[id];
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                return null;
            }
            return cache[id].rating;
        }
        return null;
    }

    /*
    |==========================================================================
    | УПРАВЛІННЯ КЛЮЧАМИ
    |==========================================================================
    */
    var currentKeyIndex = 1;
    function getApiKey() {
        var key1 = Lampa.Storage.get('omdb_api_key_1', '').trim();
        var key2 = Lampa.Storage.get('omdb_api_key_2', '').trim();
        if (currentKeyIndex === 1 && key1) return key1;
        if (currentKeyIndex === 1 && !key1 && key2) return key2;
        if (currentKeyIndex === 2 && key2) return key2;
        if (currentKeyIndex === 2 && !key2 && key1) return key1;
        return null;
    }

    function switchApiKey() {
        currentKeyIndex = currentKeyIndex === 1 ? 2 : 1;
    }

    /*
    |==========================================================================
    | ЧЕРГА ЗАПИТІВ (Захист від бану API)
    |==========================================================================
    */
    var requestQueue = [];
    var isRequesting = false;

    function processQueue() {
        if (isRequesting || requestQueue.length === 0) return;
        isRequesting = true;

        var task = requestQueue.shift();
        var apiKey = getApiKey();
        var title = task.movie.title || task.movie.name;
        var year = task.movie.release_date ? task.movie.release_date.split('-')[0] : (task.movie.first_air_date ? task.movie.first_air_date.split('-')[0] : '');

        if (!apiKey || !title) {
            isRequesting = false;
            task.callback(null);
            setTimeout(processQueue, 50);
            return;
        }

        var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=' + apiKey;

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
                    task.callback(data.imdbRating);
                } else if (data.Response === "False" && data.Error && data.Error.indexOf("limit") > -1) {
                    switchApiKey();
                    task.callback(null);
                } else {
                    task.callback("N/A");
                }
            },
            error: function () {
                task.callback(null);
            },
            complete: function () {
                isRequesting = false;
                setTimeout(processQueue, 250); // 250мс пауза між запитами
            }
        });
    }

    function queueOMDbRequest(movie, callback) {
        requestQueue.push({ movie: movie, callback: callback });
        processQueue();
    }

    /*
    |==========================================================================
    | ВІДМАЛЬОВКА РЕЙТИНГУ НА ПОСТЕРІ
    |==========================================================================
    */
    function drawRating(cardElem, rating) {
        if (!rating || rating === "N/A") return;
        
        // Видаляємо стандартний рейтинг TMDB з кута (опціонально)
        cardElem.find('.card__vote').hide();

        var ratingHtml = $(`
            <div class="omdb-imdb-rating" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.8); border-radius: 4px; padding: 3px 6px; display: flex; align-items: center; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                <img src="${ICON_IMDB}" style="width: 22px; height: 22px; margin-right: 5px; object-fit: contain; filter: drop-shadow(0px 0px 2px rgba(0,0,0,0.5));" alt="IMDb">
                <span style="color: #fff; font-weight: bold; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); line-height: 1;">${rating}</span>
            </div>
        `);
        cardElem.find('.card__view').append(ratingHtml);
    }

    /*
    |==========================================================================
    | ПЕРЕХОПЛЕННЯ КАРТОК У КАТАЛОЗІ
    |==========================================================================
    */
    function initCardInterceptor() {
        if (!Lampa.Card || window.omdb_interceptor_ready) return;
        window.omdb_interceptor_ready = true;

        var originalCardCreate = Lampa.Card.prototype.create;

        Lampa.Card.prototype.create = function () {
            originalCardCreate.apply(this, arguments);

            // Перевіряємо чи увімкнено плагін у налаштуваннях
            if (!Lampa.Storage.get('omdb_status', true)) return;

            var cardObj = this;
            var movieData = cardObj.data;
            var cardElem = cardObj.card;

            if (!movieData || !cardElem) return;

            var movieId = movieData.id;
            var cachedRating = getCachedRating(movieId);

            if (cachedRating) {
                drawRating(cardElem, cachedRating);
            } else {
                queueOMDbRequest(movieData, function (rating) {
                    if (rating) {
                        saveCache(movieId, rating);
                        drawRating(cardElem, rating);
                    }
                });
            }
        };
    }

    /*
    |==========================================================================
    | ІНІЦІАЛІЗАЦІЯ ПЛАГІНА
    |==========================================================================
    */
    function startPlugin() {
        if (window.omdb_main_plugin_ready) return;
        window.omdb_main_plugin_ready = true;
        
        initSettings();
        initCardInterceptor();
    }

    // Запускаємо негайно, оскільки плагін підключається коли Lampa вже завантажена
    startPlugin();

})();
