(function () {
    'use strict';

    Lampa.Platform.tv();

    // Головна функція ініціалізації плагіна
    function initAIPlugin() {
        // 1. Створюємо новий розділ в меню Налаштувань
        Lampa.SettingsApi.addComponent({
            component: 'ai_search',
            name: 'AI Search',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="white"/></svg>'
        });

        // 2. Додаємо параметри (поля) у створений розділ
        Lampa.SettingsApi.addParam({
            component: 'ai_search',
            param: {
                name: 'ai_search_api_key',
                type: 'input',
                default: ''
            },
            field: {
                name: 'API ключ OpenRouter',
                description: 'Вставте ваш ключ доступу'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'ai_search',
            param: {
                name: 'ai_search_model',
                type: 'input',
                default: 'qwen/qwen-2.5-72b-instruct:free'
            },
            field: {
                name: 'Модель AI',
                description: 'Рекомендується: qwen/qwen-2.5-72b-instruct:free'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'ai_search',
            param: {
                name: 'ai_search_limit',
                type: 'select',
                values: {
                    5: '5',
                    10: '10',
                    15: '15',
                    20: '20',
                    25: '25',
                    30: '30'
                },
                default: 15
            },
            field: {
                name: 'Кількість результатів',
                description: 'Скільки варіантів показувати'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'ai_search',
            param: {
                name: 'ai_search_clear_cache',
                type: 'button'
            },
            field: {
                name: 'Очистити кеш',
                description: 'Натисніть для видалення тимчасових даних'
            },
            onChange: function () {
                Lampa.Storage.set('ai_search_cache', {});
                Lampa.Noty.show('Кеш успішно очищено');
            }
        });

        // 3. Додаємо кнопку в головне бокове меню Lampa (якщо її ще немає)
        if (!$('.menu__item[data-action="ai_search"]').length) {
            const btn = $(`<div class="menu__item selector" data-action="ai_search">
                <div class="menu__icons">
                    <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
                </div>
                <div class="menu__title">AI Search</div>
            </div>`);

            btn.on('hover:enter', function () {
                Lampa.Input.edit({
                    title: 'AI Search',
                    value: '',
                    free: true,
                    nosave: true
                }, async function (value) {
                    if (value) {
                        Lampa.Noty.show('AI шукає варіанти...');
                        
                        const movies = await askAI(value);
                        
                        if (movies && movies.length > 0) {
                            const items = movies.map(title => ({
                                title: title,
                                search_query: title
                            }));

                            Lampa.Select.show({
                                title: 'Знайдено AI:',
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
                            Lampa.Noty.show('AI нічого не знайшов за цим запитом');
                        }
                    }
                });
            });

            $('.menu .menu__list').append(btn);
        }
    }

    // Функція запиту до OpenRouter
    async function askAI(query) {
        const apiKey = Lampa.Storage.get('ai_search_api_key');
        const model = Lampa.Storage.get('ai_search_model') || 'qwen/qwen-2.5-72b-instruct:free';
        const limit = Lampa.Storage.get('ai_search_limit') || 15;

        if (!apiKey) {
            Lampa.Noty.show('Помилка: API ключ не налаштовано');
            return null;
        }

        const prompt = `Користувач хоче подивитися: "${query}". 
        Знайди ${limit} назв фільмів або серіалів. 
        Поверни ТІЛЬКИ список назв, кожна назва з нового рядка, без нумерації, без років та без зайвого тексту.`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await response.json();
            
            const rawText = data.choices[0].message.content;
            return rawText.split('\n')
                .map(s => s.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[\.)]\s*/, ''))
                .filter(s => s.length > 0);

        } catch (e) {
            Lampa.Noty.show('Помилка запиту до AI');
            return null;
        }
    }

    // Запуск плагіна
    if (window.appready) {
        initAIPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initAIPlugin();
        });
    }
})();
