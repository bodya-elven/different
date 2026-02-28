(function () {
    'use strict';

    function initMyCatalog() {
        // Перевірка, чи ми вже ініціалізувалися
        if (window.my_catalog_initialized) return;
        window.my_catalog_initialized = true;

        // Тут буде весь інший код: CSS, створення CustomCatalog та додавання меню
        console.log('My Catalog: Plugin started');
        
        // ... (весь інший код)
    }

    // Чекаємо готовності додатка
    if (window.appready) {
        initMyCatalog();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') initMyCatalog();
        });
    }

    // Додатковий запобіжник для "тугих" пристроїв
    setTimeout(initMyCatalog, 2000);
})();
