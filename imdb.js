(function () {
    'use strict';

    var PLUGIN_NAME = 'omdb_imdb_ratings';
    var PLUGIN_TITLE = 'IMDb Ratings (OMDb)';
    var ICON_IMDB = 'https://img.icons8.com/color/48/000000/imdb.png';

    // 1. СТВОРЕННЯ МЕНЮ НАЛАШТУВАНЬ (Структура MDBList)
    function initSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_NAME,
            name: PLUGIN_TITLE,
            icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect><path d="M5 10v4M9 10v4M13 10v4M17 10v4M5 12h14"></path></svg>`
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_status',
            type: 'trigger',
            name: 'Увімкнути плагін',
            default: true
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_api_key_1',
            type: 'input',
            name: 'API Ключ 1',
            description: 'Основний ключ OMDb (omdbapi.com)'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_api_key_2',
            type: 'input',
            name: 'API Ключ 2',
            description: 'Резервний ключ OMDb'
        });

        // Використовуємо input замість select
        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_cache_ttl',
            type: 'input',
            name: 'Час зберігання кешу (у днях)',
            description: 'Скільки днів зберігати рейтинги',
            default: '7'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_clear_cache',
            type: 'button',
            name: 'Очистити кеш',
            description: 'Видалити збережені рейтинги з пам\'яті'
        });

        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === PLUGIN_NAME) {
                e.body.find('[data-name="omdb_clear_cache"]').on('hover:enter click', function () {
                    localStorage.removeItem('omdb_ratings_cache');
                    Lampa.Noty.show('Кеш рейтингів IMDb успішно очищено.');
                });
            }
        });
    }

    // 2. РОБОТА З КЕШЕМ
    function getCache() {
        var cache = localStorage.getItem('omdb_ratings_cache');
        return cache ? JSON.parse(cache) : {};
    }

    function saveCache(id, rating) {
        var cache = getCache();
        var ttlDays = parseInt(Lampa.Storage.get('omdb_cache_ttl', '7'));
        
        // Захист від введення тексту замість цифр
        if (isNaN(ttlDays) || ttlDays <= 0) ttlDays = 7; 

        cache[id] = {
            rating: rating,
            timestamp: Date.now() + (ttlDays * 24 * 60 * 60 * 1000)
        };
        localStorage.setItem('omdb_ratings_cache', JSON.stringify(cache));
    }

    function getCachedRating(id) {
        var cache = getCache();
        if (cache[id]) {
            if (Date.now() > cache[id].timestamp) {
                delete cache[id];
                localStorage.setItem('omdb_ratings_cache', JSON.stringify(cache));
                return null;
            }
            return cache[id].rating;
        }
        return null;
    }

    // 3. УПРАВЛІННЯ КЛЮЧАМИ
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

    // 4. ЧЕРГА ЗАПИТІВ (Захист від бану API)
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
                setTimeout(processQueue, 200);
            }
        });
    }

    function queueOMDbRequest(movie, callback) {
        requestQueue.push({ movie: movie, callback: callback });
        processQueue();
    }

    // 5. ВІДМАЛЬОВКА РЕЙТИНГУ НА ПОСТЕРІ
    function drawRating(cardElem, rating) {
        if (!rating || rating === "N/A") return;
        var ratingHtml = $(`
            <div class="omdb-imdb-rating" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.8); border-radius: 4px; padding: 2px 6px; display: flex; align-items: center; z-index: 10;">
                <img src="${ICON_IMDB}" style="width: 24px; height: 24px; margin-right: 4px;" alt="IMDb">
                <span style="color: #fff; font-weight: bold; font-size: 14px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">${rating}</span>
            </div>
        `);
        cardElem.find('.card__view').append(ratingHtml);
    }

    // 6. ПЕРЕХОПЛЕННЯ СТВОРЕННЯ КАРТОК
    function initCardInterceptor() {
        if (!Lampa.Card || window.omdb_interceptor_ready) return;
        window.omdb_interceptor_ready = true;

        var originalCardCreate = Lampa.Card.prototype.create;

        Lampa.Card.prototype.create = function () {
            originalCardCreate.apply(this, arguments);

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

    // 7. СТАРТ ПЛАГІНА
    function startPlugin() {
        if (window.omdb_plugin_ready) return;
        window.omdb_plugin_ready = true;

        initSettings();
        initCardInterceptor();
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
