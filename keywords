(function () {
    'use strict';

    function TMDBKeywords() {
        var _this = this;

        this.init = function () {
            // Слухаємо подію побудови повної картки
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    var html = e.object.activity.render();
                    var card_data = e.data.movie;
                    
                    // Перевіряємо, чи це фільм або серіал з TMDB
                    if (e.data.source == 'tmdb' && (card_data.id)) {
                        _this.getKeywords(html, card_data);
                    }
                }
            });
            
            // Додаємо трохи стилів
            var style = document.createElement('style');
            style.innerHTML = `
                .tmdb-keywords-list {
                    padding: 0 2em;
                    margin-top: 1em;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.8em;
                }
                .tmdb-keyword-item {
                    background-color: rgba(255, 255, 255, 0.1);
                    padding: 0.5em 1em;
                    border-radius: 0.5em;
                    font-size: 0.9em;
                    cursor: pointer;
                    transition: background-color 0.3s;
                    color: #aaa;
                }
                .tmdb-keyword-item.focus {
                    background-color: #fff;
                    color: #000;
                }
                .tmdb-keywords-title {
                    padding: 0 2em;
                    margin-top: 1.5em;
                    font-size: 1.1em;
                    font-weight: bold;
                    opacity: 0.7;
                }
            `;
            document.head.appendChild(style);
        };

        this.getKeywords = function (html, data) {
            var method = data.name ? 'tv' : 'movie'; // У Lampa 'name' зазвичай є у серіалів, 'title' у фільмів, але краще покладатися на метод, якщо він переданий, або визначити так.
            // Більш надійний метод визначення типу, якщо Lampa передає method у data
            if(data.original_name) method = 'tv';
            else if(data.original_title) method = 'movie';

            var url = method + '/' + data.id + '/keywords';

            Lampa.TMDB.get(url, function (resp) {
                // TMDB повертає keywords для фільмів і results для серіалів всередині об'єкта
                var keywords = resp.keywords || resp.results || [];
                
                if (keywords.length > 0) {
                    _this.renderKeywords(html, keywords, method);
                }
            }, function (err) {
                console.log('TMDB Keywords error:', err);
            });
        };

        this.renderKeywords = function (html, keywords, method) {
            // Знаходимо блок кнопок (працює для стандартного скіна Lampa)
            var buttons_block = html.find('.full-start-new__buttons'); 
            
            // Якщо не знайшли новий клас, шукаємо старий
            if(!buttons_block.length) buttons_block = html.find('.full-start__buttons');
            
            if (buttons_block.length) {
                var container = $('<div class="tmdb-keywords-block"></div>');
                var title = $('<div class="tmdb-keywords-title">Теги (TMDB)</div>');
                var list = $('<div class="tmdb-keywords-list"></div>');

                keywords.forEach(function (tag) {
                    // Клас 'selector' обов'язковий для роботи пульта!
                    var item = $('<div class="tmdb-keyword-item selector">' + tag.name + '</div>');

                    item.on('hover:enter', function () {
                        // Дія при натисканні (Enter або клік)
                        Lampa.Activity.push({
                            url: 'discover/' + method + '?with_keywords=' + tag.id,
                            title: 'Тег: ' + tag.name,
                            component: 'category_full',
                            source: 'tmdb',
                            page: 1
                        });
                    });

                    list.append(item);
                });

                container.append(title);
                container.append(list);
                
                // Вставляємо ПІСЛЯ блоку кнопок
                buttons_block.after(container);
            }
        };
    }

    if (!window.plugin_tmdb_keywords) {
        window.plugin_tmdb_keywords = new TMDBKeywords();
        window.plugin_tmdb_keywords.init();
        console.log('TMDB Keywords Plugin loaded');
    }
})();
