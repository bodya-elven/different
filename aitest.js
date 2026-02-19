(function () {
    'use strict';

    if (window.plugin_ai_search_ready) return;
    window.plugin_ai_search_ready = true;

    var manifest = {
        type: "other",
        version: "1.0.3",
        name: "AI Search",
        description: "Розумний пошук фільмів через AI (OpenRouter)",
        component: "ai_search"
    };

    function startPlugin() {
        // Реєстрація компонента в Налаштуваннях
        Lampa.SettingsApi.addComponent({
            component: 'ai_search',
            name: 'AI Search',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><path d="M11 8v6"></path><path d="M8 11h6"></path></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'ai_search',
            param: {
                name: 'ai_search_limit',
                type: 'select',
                values: { 5: '5', 10: '10', 15: '15', 20: '20', 25: '25', 30: '30' },
                default: 15
            },
            field: { name: 'Кількість результатів', description: 'Скільки варіантів показувати' },
            onChange: function (val) {
                Lampa.Storage.set('ai_search_limit', val);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'ai_search',
            param: { name: 'ai_search_clear_cache', type: 'button' },
            field: { name: 'Очистити кеш', description: 'Натисніть для видалення тимчасових даних' },
            onChange: function () {
                Lampa.Storage.set('ai_search_cache', {});
                Lampa.Noty.show('Кеш успішно очищено');
            }
        });

        // Додавання кнопки в головне (ліве) меню
        if (!$('.menu__item.ai-search-btn').length) {
            var btn = $('<div class="menu__item selector ai-search-btn">' +
                '<div class="menu__icons">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>' +
                '</div>' +
                '<div class="menu__title">AI Search</div>' +
            '</div>');

            btn.on('hover:enter', function () {
                Lampa.Input.edit({
                    title: 'Що хочете подивитися?',
                    value: '',
                    free: true,
                    nosave: true
                }, function (value) {
                    if (value) {
                        Lampa.Noty.show('AI шукає варіанти...');
                        
                        askAI(value).then(function(movies) {
                            if (movies && movies.length > 0) {
                                var items = movies.map(function(title) {
                                    return {
                                        title: title,
                                        search_query: title
                                    };
                                });

                                Lampa.Select.show({
                                    title: 'AI рекомендує:',
                                    items: items,
                                    onSelect: function (item) {
                                        Lampa.Activity.push({
                                            url: '',
                                            title: 'Пошук',
                                            component: 'search',
                                            query: item.search_query
                                        });
                                    },
                                    onBack: function () {
                                        Lampa.Controller.toggle('menu');
                                    }
                                });
                            } else if (movies && movies.length === 0) {
                                Lampa.Noty.show('AI нічого не знайшов. Спробуйте змінити запит.');
                            }
                        });
                    }
                });
            });

            $('.menu .menu__list').append(btn);
        }
    }

    // Логіка запиту до OpenRouter з жорстко вшитим ключем
    async function askAI(query) {
        // Вшиті параметри
        var apiKey = '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';
        var model = 'qwen/qwen3-next-80b-a3b-instruct:free';
        var limit = Lampa.Storage.get('ai_search_limit') || 15;

        var prompt = 'Користувач хоче подивитися: "' + query + '". ' +
            'Знайди ' + limit + ' назв фільмів або серіалів, які найбільше підходять під опис. ' +
            'Поверни ТІЛЬКИ список назв, кожна назва з нового рядка, без нумерації, без років та без жодного зайвого тексту.';

        try {
            var response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + apiKey,
                    'Content-Type': 'application/json',
                    // OpenRouter часто вимагає ці заголовки для безкоштовних моделей
                    'HTTP-Referer': 'https://github.com/lampa-app',
                    'X-Title': 'Lampa AI Search'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            
            if (!response.ok) {
                console.error('Помилка HTTP від OpenRouter:', response.status, response.statusText);
                Lampa.Noty.show('Помилка сервера: ' + response.status);
                return null;
            }

            var data = await response.json();
            
            var rawText = data.choices[0].message.content;
            return rawText.split('\n')
                .map(function(s) { return s.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[\.)]\s*/, ''); })
                .filter(function(s) { return s.length > 0; });

        } catch (e) {
            console.error('Деталі помилки AI:', e);
            Lampa.Noty.show('Помилка з\'єднання з AI сервером');
            return null;
        }
    }

    // Запуск
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

    if (Lampa.Manifest) {
        Lampa.Manifest.plugins = manifest;
    }
})();
