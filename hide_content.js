/* Created by Elven (1|1) */
(function () {
    'use strict';

    // Основні налаштування плагіна
    var settings = {
        asian_filter_enabled: false, 
        language_filter_enabled: false, 
        rating_filter_enabled: false, 
        history_filter_enabled: false,
        country_filter_enabled: false,
        country_list: '',
        keyword_filter_enabled: false, // НОВЕ: Фільтр за ключовими словами
        keyword_list: '',              // НОВЕ: Список слів
        blacklist: []
    };

    [span_1](start_span)// Перевірка, чи є об'єкт медіа-контентом, щоб не ховати системні елементи [cite: 1-10]
    function isMediaContent(item) {
        if (!item) return false;
        if (item.type && typeof item.type === 'string') {
            var typeLower = item.type.toLowerCase();
            if (['plugin', 'extension', 'theme', 'addon'].indexOf(typeLower) !== -1) return false;
        }
        var hasMediaFields = item.original_language !== undefined || item.vote_average !== undefined || item.media_type !== undefined || item.original_title !== undefined;
        return !!hasMediaFields;
    }

    [cite_start]// Процесор фільтрів[span_1](end_span)
    var filterProcessor = {
        filters: [
            [cite_start]// 1. Азіатський контент [cite: 10-13]
            function (items) {
                if (!settings.asian_filter_enabled) return items;
                var asianLangs = ['ja', 'ko', 'zh', 'th', 'vi', 'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'ur', 'pa', 'gu', 'mr', 'ne', 'si', 'my', 'km', 'lo', 'mn', 'ka', 'hy', 'az', 'kk', 'ky', 'tg', 'tk', 'uz'];
                return items.filter(function (item) {
                    if (!isMediaContent(item) || !item.original_language) return true;
                    return asianLangs.indexOf(item.original_language.toLowerCase()) === -1;
                });
            },
            // 2. Фільтр за країною
            function (items) {
                if (!settings.country_filter_enabled || !settings.country_list) return items;
                var countries = settings.country_list.split(',').map(function(c) { return c.trim().toUpperCase(); });
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    var itemCountry = (item.origin_country || []).join(','); 
                    return !countries.some(function(c) { return itemCountry.indexOf(c) !== -1; });
                });
            },
            // 3. Фільтр за ключовими словами (НОВЕ)
            function (items) {
                if (!settings.keyword_filter_enabled || !settings.keyword_list) return items;
                // Розбиваємо список слів, прибираємо пробіли та переводимо в нижній регістр
                var keywords = settings.keyword_list.split(',').map(function(k) { return k.trim().toLowerCase(); }).filter(Boolean);
                if (keywords.length === 0) return items;
                
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    
                    var title = (item.title || '').toLowerCase();
                    var originalTitle = (item.original_title || '').toLowerCase();
                    var name = (item.name || '').toLowerCase();
                    var originalName = (item.original_name || '').toLowerCase();
                    
                    // Перевіряємо, чи містить назва хоча б одне слово зі списку
                    var hasKeyword = keywords.some(function(kw) {
                        return title.indexOf(kw) !== -1 || originalTitle.indexOf(kw) !== -1 || 
                               name.indexOf(kw) !== -1 || originalName.indexOf(kw) !== -1;
                    });
                    
                    return !hasKeyword; // Якщо є збіг - приховуємо картку
                });
            },
            // 4. Ручний Чорний список
            function (items) {
                if (!settings.blacklist || settings.blacklist.length === 0) return items;
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    return !settings.blacklist.some(function(b) { return b.id === item.id; });
                });
            }
        ],

        apply: function (data) {
            var results = Lampa.Arrays.clone(data);
            for (var i = 0; i < this.filters.length; i++) {
                results = this.filters[i](results);
            }
            return results;
        }
    };
    [cite_start]// Додавання пункту в контекстне меню (Чорний список) [cite: 43-45]
    function addContextMenu() {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'contextmenu' && isMediaContent(e.object)) {
                e.menu.push({
                    title: Lampa.Lang.translate('content_filter_hide_item'),
                    icon: '<svg height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>',
                    onSelect: function () {
                        if (!settings.blacklist.some(function(b) { return b.id === e.object.id; })) {
                            settings.blacklist.push({ id: e.object.id, title: e.object.title || e.object.name });
                            Lampa.Storage.set('content_filter_blacklist', settings.blacklist);
                            Lampa.Noty.show(Lampa.Lang.translate('content_filter_added_to_blacklist'));
                            
                            // Оновлюємо інтерфейс, щоб картка зникла одразу
                            if (Lampa.Activity.active() && Lampa.Activity.active().activity) {
                                Lampa.Activity.active().activity.component.render();
                            }
                        }
                    }
                });
            }
        });
    }

    [cite_start]// Локалізація (Тільки українська та англійська) [cite: 46-48]
    function addTranslations() {
        Lampa.Lang.add({
            content_filters: { uk: 'Фільтр контенту', en: 'Content Filter' },
            country_filter: { uk: 'Фільтр за країнами', en: 'Country Filter' },
            country_filter_desc: { uk: 'Вкажіть коди країн через кому (наприклад: US, RU)', en: 'Enter country codes separated by comma (e.g., US, RU)' },
            keyword_filter: { uk: 'Фільтр за словами', en: 'Keyword Filter' },
            keyword_filter_desc: { uk: 'Слова в назві через кому (наприклад: шоу, концерт)', en: 'Words in title separated by comma (e.g., show, concert)' },
            content_filter_hide_item: { uk: 'Приховати цей контент', en: 'Hide this content' },
            content_filter_added_to_blacklist: { uk: 'Додано в чорний список', en: 'Added to blacklist' },
            content_filter_blacklist_title: { uk: 'Чорний список (натисніть, щоб видалити)', en: 'Blacklist (click to remove)' }
        });
    }

    [cite_start]// Інтеграція в меню налаштувань [cite: 52-58]
    function addSettings() {
        // Налаштування для країн
        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'country_filter_enabled', type: 'trigger', default: false },
            field: { name: Lampa.Lang.translate('country_filter'), description: 'Увімкнути фільтрацію за кодом країни' }
        });
        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'country_list', type: 'input', default: '' },
            field: { name: 'Список країн', description: Lampa.Lang.translate('country_filter_desc') }
        });

        // Налаштування для ключових слів
        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'keyword_filter_enabled', type: 'trigger', default: false },
            field: { name: Lampa.Lang.translate('keyword_filter'), description: 'Увімкнути фільтрацію за словами в назві' }
        });
        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'keyword_list', type: 'input', default: '' },
            field: { name: 'Список слів', description: Lampa.Lang.translate('keyword_filter_desc') }
        });

        // Менеджер чорного списку
        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'blacklist_manager', type: 'static' },
            field: { name: Lampa.Lang.translate('content_filter_blacklist_title'), description: 'Керування прихованими елементами' },
            onRender: function (el) {
                el.css('cursor', 'pointer').on('hover:enter', function () {
                    var items = settings.blacklist.map(function(b) {
                        return { title: b.title, id: b.id };
                    });

                    if (items.length === 0) {
                        Lampa.Noty.show('Список порожній');
                        return;
                    }

                    Lampa.Select.show({
                        title: 'Чорний список',
                        items: items,
                        onSelect: function (item) {
                            settings.blacklist = settings.blacklist.filter(function(b) { return b.id !== item.id; });
                            Lampa.Storage.set('content_filter_blacklist', settings.blacklist);
                            Lampa.Noty.show('Видалено: ' + item.title);
                        }
                    });
                });
            }
        });
    }

    // Завантаження збережених параметрів
    function loadSettings() {
        settings.blacklist = Lampa.Storage.get('content_filter_blacklist', []);
        settings.country_list = Lampa.Storage.get('country_list', '');
        settings.country_filter_enabled = Lampa.Storage.get('country_filter_enabled', false);
        settings.keyword_list = Lampa.Storage.get('keyword_list', '');
        settings.keyword_filter_enabled = Lampa.Storage.get('keyword_filter_enabled', false);
    }

    // Ініціалізація плагіна
    function initPlugin() {
        if (window.content_filter_pro_plugin) return;
        window.content_filter_pro_plugin = true;

        loadSettings();
        addTranslations();
        addSettings();
        addContextMenu();

        [cite_start]// Перехоплення запитів та застосування фільтрів [cite: 72-80]
        Lampa.Listener.follow('request_secuses', function (e) {
            if (!e.data || !Array.isArray(e.data.results) || e.data.results.length === 0) return;
            
            [cite_start]// Запобіжник: якщо немає медіа-контенту (наприклад, це магазин), фільтри не застосовуються [cite: 78-79]
            if (!e.data.results.some(isMediaContent)) return;

            e.data.results = filterProcessor.apply(e.data.results);
        });
    }

    // Старт
    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initPlugin();
        });
    }
})();
