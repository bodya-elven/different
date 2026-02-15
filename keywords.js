(function () {
    'use strict';

    function TMDBKeywords() {
        var _this = this;

        // Додаємо переклади
        function addLocalization() {
            Lampa.Lang.add({
                tmdb_keywords_title: {
                    en: 'Tags',
                    uk: 'Теги',
                    ru: 'Теги'
                },
                tmdb_keywords_no_results: {
                    en: 'No tags found',
                    uk: 'Тегів не знайдено',
                    ru: 'Теги не найдены'
                }
            });
        }

        // Отримання ключових слів з TMDB
        function getKeywords(card, callback) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = method + '/' + card.id + '/keywords';

            Lampa.TMDB.get(url, function (resp) {
                // У фільмів це 'keywords', у серіалів 'results'
                var tags = resp.keywords || resp.results || [];
                callback(tags, method);
            }, function () {
                callback([], method);
            });
        }

        // Рендеринг кнопки (Використовуємо стиль Networks)
        function renderButton(render, tags, type) {
            // Видаляємо стару кнопку, якщо вона є
            $('.button--keywords', render).remove();

            // Знаходимо контейнер кнопок (як в Networks)
            var container = $('.full-start-new__buttons', render);
            if (!container.length) container = $('.full-start__buttons', render); // Фолбек для старих скінів
            
            if (!container.length) return;

            // Та сама SVG іконка, що в Networks (Platform combo button)
            var svg_icon = '<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000">' +
                        '<g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="currentColor">' +
                            '<path d="M895 4306 c-16 -7 -59 -44 -95 -82 -284 -302 -487 -669 -586 -1060 -57 -227 -69 -330 -69 -604 0 -274 12 -377 69 -604 86 -339 253 -666 483 -943 156 -189 209 -225 300 -208 49 9 109 69 118 118 13 67 -1 103 -72 180 -389 422 -583 908 -583 1457 0 551 193 1032 584 1459 45 48 67 81 72 105 24 131 -102 234 -221 182z"/>' +
                            '<path d="M4095 4306 c-41 -18 -83 -69 -91 -111 -12 -65 3 -102 73 -178 388 -422 583 -909 583 -1457 0 -548 -195 -1035 -583 -1457 -71 -77 -85 -113 -72 -180 9 -49 69 -109 118 -118 77 -15 105 -1 199 96 272 279 482 659 583 1053 58 225 70 331 70 606 0 275 -12 381 -70 606 -101 394 -301 756 -585 1058 -88 94 -148 116 -225 82z"/>' +
                            '<path d="M1525 3695 c-83 -28 -274 -269 -364 -458 -53 -111 -95 -234 -123 -358 -20 -91 -23 -130 -23 -319 0 -189 3 -228 23 -319 28 -124 70 -247 123 -358 92 -193 290 -440 371 -461 102 -27 198 46 198 151 0 60 -8 76 -83 157 -32 36 -83 101 -112 145 -142 215 -205 425 -205 685 0 260 63 470 205 685 29 44 80 109 112 145 75 81 83 97 83 158 0 107 -103 181 -205 147z"/>' +
                            '<path d ="M3513 3700 c-76 -17 -123 -76 -123 -153 0 -60 8 -76 83 -157 153 -168 262 -390 302 -614 19 -114 19 -318 0 -432 -40 -224 -149 -446 -302 -614 -75 -81 -83 -97 -83 -157 0 -105 96 -178 198 -151 81 21 279 268 371 461 53 111 95 234 123 358 20 91 23 130 23 319 0 189 -3 228 -23 319 -61 273 -193 531 -367 719 -88 95 -133 118 -202 102z"/>' +
                            '<path d="M2435 3235 c-417 -77 -668 -518 -519 -912 111 -298 421 -488 723 -445 326 46 557 277 603 603 41 289 -136 595 -412 710 -130 55 -260 69 -395 44z m197 -316 c77 -17 137 -50 190 -107 57 -61 83 -110 98 -190 22 -111 -12 -222 -96 -312 -138 -148 -359 -156 -510 -18 -96 88 -138 210 -114 330 16 82 42 132 99 191 52 55 97 81 174 102 65 17 92 18 159 4z"/>' +
                        '</g>' +
                    '</svg>';

            var title = Lampa.Lang.translate('tmdb_keywords_title');
            
            var btn = $('<div class="full-start__button selector button--keywords">' + 
                svg_icon + 
                '<span>' + title + '</span>' + 
                '</div>');

            // Намагаємось підігнати висоту кнопки під сусідні (як в Networks)
            var sibling = $('.full-start__button', render).first();
            if(sibling.length) {
                btn.css('height', sibling.outerHeight() + 'px');
            }

            btn.on('hover:enter click', function () {
                var controllerName = Lampa.Controller.enabled().name;
                
                // Формуємо список для меню
                var items = tags.map(function(tag) {
                    return {
                        title: tag.name,
                        tag: tag
                    };
                });

                Lampa.Select.show({
                    title: title,
                    items: items,
                    onBack: function () {
                        Lampa.Controller.toggle(controllerName);
                        // Повертаємо фокус на кнопку
                        Lampa.Controller.collectionFocus(btn, render);
                    },
                    onSelect: function (action) {
                        // Перехід до списку фільмів за тегом
                        Lampa.Activity.push({
                            url: 'discover/' + type + '?with_keywords=' + action.tag.id,
                            title: title + ': ' + action.tag.name,
                            component: 'category_full',
                            source: 'tmdb',
                            page: 1
                        });
                    }
                });
            });

            container.append(btn);
            
            // Якщо картка активна, оновлюємо контролер
            if(Lampa.Activity.active().activity === Lampa.Activity.active().activity) {
                 Lampa.Controller.toggle('full_start');
            }
        }

        function startPlugin() {
            if (window.plugin_tmdb_keywords_loaded) return;
            window.plugin_tmdb_keywords_loaded = true;

            addLocalization();

            // Використовуємо той самий слухач, що і Networks
            Lampa.Listener.follow('activity,full', function (e) {
                if (e.type === 'complite') {
                    var object = e.object.activity;
                    var render = object.render();
                    var card = e.data.movie;

                    // Перевіряємо чи це TMDB
                    if (card && (card.source === 'tmdb' || e.data.source === 'tmdb') && card.id) {
                         getKeywords(card, function(tags, method) {
                             if(tags.length > 0) {
                                 renderButton(render, tags, method);
                             }
                         });
                    }
                }
            });
        }

        if (window.appready) {
            startPlugin();
        } else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') {
                    startPlugin();
                }
            });
        }
    }

    new TMDBKeywords();
})();
