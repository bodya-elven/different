(function () {
    'use strict';

    // Назва та версія плагіна
    var PLUGIN_NAME = 'OMDb_IMDb_Ratings';
    var PLUGIN_TITLE = 'IMDb Ratings (OMDb)';
    
    // Посилання на кольорову іконку IMDb (як у MDBList)
    var ICON_IMDB = 'https://img.icons8.com/color/48/000000/imdb.png'; 

    // Ініціалізація налаштувань плагіна в Lampa
    function initSettings() {
        if (!Lampa.SettingsApi) return;

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
            description: 'Резервний ключ OMDb (якщо ліміт першого вичерпано)'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_cache_ttl',
            type: 'select',
            name: 'Час зберігання кешу',
            values: {
                1: '1 день',
                3: '3 дні',
                7: '7 днів',
                14: '14 днів',
                30: '30 днів'
            },
            default: 7
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: 'omdb_clear_cache',
            type: 'button',
            name: 'Очистити кеш',
            description: 'Видалити збережені рейтинги з пам\'яті'
        });

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_NAME,
            name: PLUGIN_TITLE,
            icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect><path d="M5 10v4M9 10v4M13 10v4M17 10v4M5 12h14"></path></svg>`
        });

        // Обробник для кнопки очищення кешу
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === PLUGIN_NAME) {
                e.body.find('[data-name="omdb_clear_cache"]').on('click', function () {
                    localStorage.removeItem('omdb_ratings_cache');
                    Lampa.Noty.show('Кеш рейтингів IMDb успішно очищено.');
                });
            }
        });
    }

    // Робота з кешем
    function getCache() {
        var cache = localStorage.getItem('omdb_ratings_cache');
        return cache ? JSON.parse(cache) : {};
    }

    function saveCache(id, rating) {
        var cache = getCache();
        var ttlDays = parseInt(Lampa.Storage.get('omdb_cache_ttl', 7));
        
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

    // Отримання активного ключа API
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

    // Запит до OMDb
    function fetchOMDbRating(movie, callback) {
        var title = movie.title || movie.name;
        var year = movie.release_date ? movie.release_date.split('-')[0] : (movie.first_air_date ? movie.first_air_date.split('-')[0] : '');
        var apiKey = getApiKey();

        if (!apiKey || !title) return callback(null);

        var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=' + apiKey;

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
                    callback(data.imdbRating);
                } else if (data.Response === "False" && data.Error.indexOf("limit") > -1) {
                    switchApiKey(); // Якщо ліміт вичерпано, перемикаємо ключ
                    callback(null);
                } else {
                    callback("N/A");
                }
            },
            error: function () {
                callback(null);
            }
        });
    }

    // Рендер іконки та рейтингу на картці
    function drawRating(cardElem, rating) {
        if (!rating || rating === "N/A") return;

        var ratingHtml = $(`
            <div class="omdb-imdb-rating" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); border-radius: 4px; padding: 2px 5px; display: flex; align-items: center; z-index: 10;">
                <img src="${ICON_IMDB}" style="width: 24px; height: 24px; margin-right: 4px;" alt="IMDb">
                <span style="color: #fff; font-weight: bold; font-size: 14px;">${rating}</span>
            </div>
        `);

        // Видаляємо старий рейтинг Lampa, якщо він є (опціонально, можна закоментувати)
        // cardElem.find('.card__vote').remove(); 

        cardElem.find('.card__view').append(ratingHtml);
    }

    // Обробка карток у каталозі
    function processCards() {
        if (!Lampa.Storage.get('omdb_status', true)) return;

        $('.card:not(.omdb-processed)').each(function () {
            var cardElem = $(this);
            cardElem.addClass('omdb-processed');

            // Lampa зазвичай зберігає дані фільму в елементі DOM (cardElem[0].card)
            var movieData = cardElem[0].card;
            if (!movieData) return;

            var movieId = movieData.id;
            var cachedRating = getCachedRating(movieId);

            if (cachedRating) {
                drawRating(cardElem, cachedRating);
            } else {
                // Додаємо невелику затримку, щоб не заспамити API при швидкому скролінгу
                setTimeout(function() {
                    fetchOMDbRating(movieData, function (rating) {
                        if (rating) {
                            saveCache(movieId, rating);
                            drawRating(cardElem, rating);
                        }
                    });
                }, Math.random() * 500); // Рандомна затримка 0-500мс
            }
        });
    }

    // Ініціалізація та відслідковування змін на сторінці
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            initSettings();

            // Використовуємо MutationObserver для відлову появи нових карток
            var observer = new MutationObserver(function(mutations) {
                var newCardsAdded = false;
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length > 0) {
                        for (var i = 0; i < mutation.addedNodes.length; i++) {
                            if ($(mutation.addedNodes[i]).hasClass('card') || $(mutation.addedNodes[i]).find('.card').length > 0) {
                                newCardsAdded = true;
                                break;
                            }
                        }
                    }
                });
                
                if (newCardsAdded) {
                    processCards();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

})();
