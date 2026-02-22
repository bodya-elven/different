(function () {
    'use strict';

    // Запобігаємо запуску, якщо ядро Lampa ще не існує
    if (!window.Lampa) return;

    var PLUGIN_NAME = 'omdb_imdb_ratings';
    var ICON_IMDB = 'https://img.icons8.com/color/48/000000/imdb.png';

    // =========================================================
    // 1. МИТТЄВА РЕЄСТРАЦІЯ МЕНЮ (Вирішує проблему пустого меню)
    // =========================================================
    if (Lampa.SettingsApi) {
        Lampa.SettingsApi.addComponent({
            component: PLUGIN_NAME,
            name: 'IMDb Ratings (OMDb)',
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
            description: 'Резервний ключ (якщо ліміт першого вичерпано)'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_cache_ttl',
            type: 'input',
            name: 'Час зберігання кешу (у днях)',
            default: '7'
        });
    }

    // =========================================================
    // 2. РЕНДЕР КНОПКИ (Вирішує проблему поплившої верстки)
    // =========================================================
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === PLUGIN_NAME) {
            // Нативна структура елементів Lampa
            var clearBtn = $(`
                <div class="settings-param selector" data-type="button">
                    <div class="settings-param__name">Очистити кеш</div>
                    <div class="settings-param__value"></div> <div class="settings-param__descr">Видалити збережені рейтинги з пам'яті пристрою</div>
                </div>
            `);

            clearBtn.on('hover:enter click', function () {
                localStorage.removeItem('omdb_ratings_cache');
                Lampa.Noty.show('Кеш рейтингів IMDb успішно очищено.');
            });

            e.body.append(clearBtn);
        }
    });

    // =========================================================
    // 3. РОБОТА З КЕШЕМ ТА КЛЮЧАМИ
    // =========================================================
    function getCache() {
        var cache = localStorage.getItem('omdb_ratings_cache');
        return cache ? JSON.parse(cache) : {};
    }

    function saveCache(id, rating) {
        var cache = getCache();
        var ttlDays = parseInt(Lampa.Storage.get('omdb_cache_ttl', '7'));
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
            if (Date.now() < cache[id].timestamp) {
                return cache[id].rating;
            } else {
                delete cache[id];
                localStorage.setItem('omdb_ratings_cache', JSON.stringify(cache));
            }
        }
        return null;
    }

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

    // =========================================================
    // 4. ЗАПИТИ ДО OMDB
    // =========================================================
    function fetchRating(movie, callback) {
        var apiKey = getApiKey();
        var title = movie.title || movie.name;
        var year = movie.release_date ? movie.release_date.split('-')[0] : (movie.first_air_date ? movie.first_air_date.split('-')[0] : '');

        if (!apiKey || !title) return callback(null);

        var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=' + apiKey;

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
                    callback(data.imdbRating);
                } else if (data.Response === "False" && data.Error && data.Error.indexOf("limit") > -1) {
                    currentKeyIndex = currentKeyIndex === 1 ? 2 : 1; // Зміна ключа при ліміті
                    callback(null);
                } else {
                    callback("N/A");
                }
            },
            error: function () { callback(null); }
        });
    }

    // =========================================================
    // 5. ВІДМАЛЬОВКА РЕЙТИНГУ
    // =========================================================
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

    // =========================================================
    // 6. ІНТЕГРАЦІЯ В КАРТКИ (Очікування appready)
    // =========================================================
    function initInterceptor() {
        if (!Lampa.Card || window.omdb_interceptor_ready) return;
        window.omdb_interceptor_ready = true;

        var originalCreate = Lampa.Card.prototype.create;
        Lampa.Card.prototype.create = function () {
            originalCreate.apply(this, arguments);

            if (!Lampa.Storage.get('omdb_status', true)) return;

            var cardObj = this;
            var movieData = cardObj.data;
            var cardElem = cardObj.card;

            if (!movieData || !cardElem) return;

            var cached = getCachedRating(movieData.id);
            if (cached) {
                drawRating(cardElem, cached);
            } else {
                fetchRating(movieData, function (rating) {
                    if (rating) {
                        saveCache(movieData.id, rating);
                        drawRating(cardElem, rating);
                    }
                });
            }
        };
    }

    if (window.appready) {
        initInterceptor();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initInterceptor();
        });
    }

})();
