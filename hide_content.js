/* Created by Elven (1|1) */
(function () {
    'use strict';

    [cite_start]// 1. Налаштування (Оригінальні + Нові)[span_0](end_span)
    var settings = {
        asian_filter_enabled: false,
        language_filter_enabled: false,
        rating_filter_enabled: false,
        history_filter_enabled: false,
        ru_content_filter_enabled: false,
        country_filter_enabled: false,
        country_list: '',
        keyword_filter_enabled: false,
        keyword_list: '',
        blacklist: []
    };

    [cite_start]// 2. Перевірка на медіа-контент [cite: 1-10]
    function isMediaContent(item) {
        if (!item) return false;
        if (item.type && typeof item.type === 'string') {
            var typeLower = item.type.toLowerCase();
            if (['plugin', 'extension', 'theme', 'addon'].indexOf(typeLower) !== -1) return false;
        }
        var hasExtensionFields = (item.plugin !== undefined || item.extension !== undefined || (item.type && item.type === 'extension') || (item.type && item.type === 'plugin'));
        var hasMediaFields = item.original_language !== undefined || item.vote_average !== undefined || item.media_type !== undefined || item.first_air_date !== undefined || item.release_date !== undefined || item.original_title !== undefined || item.original_name !== undefined;
        
        if (hasExtensionFields && !hasMediaFields) return false;
        if (!hasMediaFields) return false;
        return true;
    }

    [cite_start]// 3. Процесор фільтрів [cite: 10-30]
    var filterProcessor = {
        filters: [
            [cite_start]function (items) { // Азіатський контент [cite: 10-13]
                if (!settings.asian_filter_enabled) return items;
                var asianLangs = ['ja', 'ko', 'zh', 'th', 'vi', 'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'ur', 'pa', 'gu', 'mr', 'ne', 'si', 'my', 'km', 'lo', 'mn', 'ka', 'hy', 'az', 'kk', 'ky', 'tg', 'tk', 'uz'];
                return items.filter(function (item) {
                    if (!isMediaContent(item) || !item.original_language) return true;
                    return asianLangs.indexOf(item.original_language.toLowerCase()) === -1;
                });
            },
            [cite_start]function (items) { // Мовний фільтр [cite: 13-17]
                if (!settings.language_filter_enabled) return items;
                return items.filter(function (item) {
                    if (!isMediaContent(item) || !item) return true;
                    var defaultLang = Lampa.Storage.get('language') || 'ru';
                    var original = item.original_title || item.original_name;
                    var translated = item.title || item.name;
                    if (item.original_language === defaultLang) return true;
                    if (item.original_language !== defaultLang && translated !== original) return true;
                    return false;
                });
            },
            [cite_start]function (items) { // Рейтинг [cite: 17-21]
                if (!settings.rating_filter_enabled) return items;
                return items.filter(function (item) {
                    if (!isMediaContent(item) || !item) return true;
                    var isSpecial = item.media_type === 'video' || item.type === 'Trailer' || item.site === 'YouTube' || (item.key && item.name && item.name.toLowerCase().indexOf('trailer') !== -1);
                    if (isSpecial) return true;
                    if (!item.vote_average || item.vote_average === 0) return false;
                    return item.vote_average >= 6;
                });
            },
            [cite_start]function (items) { // Історія (Оригінал) [cite: 21-28]
                if (!settings.history_filter_enabled) return items;
                var favorite = Lampa.Storage.get('favorite', '{}');
                var timeline = Lampa.Storage.cache('timetable', 300, []);
                return items.filter(function (item) {
                    if (!isMediaContent(item) || !item || !item.id) return true;
                    var mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                    var card = Lampa.Favorite.check(item);
                    var hasHistory = card && card.history;
                    if (card && card.thrown) return false;
                    if (!hasHistory) return true;
                    if (hasHistory && mediaType === 'movie') return false;
                    var watchedFromFavorite = getWatchedEpisodesFromFavorite(item.id, favorite);
                    var watchedFromTimeline = getWatchedEpisodesFromTimeline(item.id, timeline);
                    var allWatchedEpisodes = mergeWatchedEpisodes(watchedFromFavorite, watchedFromTimeline);
                    var title = item.original_title || item.original_name || item.title || item.name || '';
                    return !isSeriesFullyWatched(title, allWatchedEpisodes);
                });
            },
            function (items) { // RU/SU Контент
                if (!settings.ru_content_filter_enabled) return items;
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    var lang = (item.original_language || '').toLowerCase();
                    var countryArr = Array.isArray(item.origin_country) ? item.origin_country : (typeof item.origin_country === 'string' ? [item.origin_country] : []);
                    var countries = countryArr.join(',').toUpperCase();
                    if (lang === 'ru' || countries.indexOf('RU') !== -1 || countries.indexOf('SU') !== -1) return false;
                    return true;
                });
            },
            function (items) { // Фільтр за країною
                if (!settings.country_filter_enabled || typeof settings.country_list !== 'string') return items;
                var blocked = settings.country_list.split(',').map(function(c) { return c.trim().toUpperCase(); }).filter(Boolean);
                if (blocked.length === 0) return items;
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    var countryArr = Array.isArray(item.origin_country) ? item.origin_country : (typeof item.origin_country === 'string' ? [item.origin_country] : []);
                    var itemCountry = countryArr.join(',').toUpperCase();
                    return !blocked.some(function(c) { return itemCountry.indexOf(c) !== -1; });
                });
            },
            function (items) { // Ключові слова
                if (!settings.keyword_filter_enabled || typeof settings.keyword_list !== 'string') return items;
                var keywords = settings.keyword_list.split(',').map(function(k) { return k.trim().toLowerCase(); }).filter(Boolean);
                if (keywords.length === 0) return items;
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    var text = [item.title, item.original_title, item.name, item.original_name].filter(Boolean).join(' ').toLowerCase();
                    return !keywords.some(function(kw) { return text.indexOf(kw) !== -1; });
                });
            },
            function (items) { // Чорний список
                if (!Array.isArray(settings.blacklist) || settings.blacklist.length === 0) return items;
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

    [cite_start]// 4. Допоміжні функції для історії (Повернуто з оригіналу) [cite: 31-42]
    function getWatchedEpisodesFromFavorite(id, favoriteData) {
        var card = (favoriteData.card || []).find(function (c) { return c.id === id && Array.isArray(c.seasons) && c.seasons.length > 0; });
        if (!card) return [];
        var airedSeasons = card.seasons.filter(function (s) { return s.season_number > 0 && s.episode_count > 0 && s.air_date && new Date(s.air_date) < new Date(); });
        var episodes = [];
        airedSeasons.forEach(function (season) {
            for (var ep = 1; ep <= season.episode_count; ep++) { episodes.push({ season_number: season.season_number, episode_number: ep }); }
        });
        return episodes;
    }
    function getWatchedEpisodesFromTimeline(id, timelineData) {
        var entry = (timelineData || []).find(function (e) { return e.id === id; }) || {};
        if (!Array.isArray(entry.episodes) || entry.episodes.length === 0) return [];
        return entry.episodes.filter(function (ep) { return ep.season_number > 0 && ep.air_date && new Date(ep.air_date) < new Date(); });
    }
    function mergeWatchedEpisodes(arr1, arr2) {
        var merged = (arr1 || []).concat(arr2 || []);
        var unique = [];
        merged.forEach(function (ep) {
            var exists = unique.some(function (u) { return u.season_number === ep.season_number && u.episode_number === ep.episode_number; });
            if (!exists) unique.push(ep);
        });
        return unique;
    }
    function isSeriesFullyWatched(title, watchedEpisodes) {
        if (!watchedEpisodes || watchedEpisodes.length === 0) return false;
        for (var i = 0; i < watchedEpisodes.length; i++) {
            var ep = watchedEpisodes[i];
            var hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, title].join(''));
            var view = Lampa.Timeline.view(hash);
            if (!view || view.percent < 100) return false;
        }
        return true;
    }

    [cite_start]// 5. Системні функції Lampa (Повернуто з оригіналу) [cite: 43-45, 61-65]
    function initCardListener() {
        if (window.lampa_listener_extensions) return;
        window.lampa_listener_extensions = true;
        Object.defineProperty(Lampa.Card.prototype, 'build', {
            get: function () { return this._build; },
            set: function (value) {
                this._build = function () {
                    value.apply(this);
                    Lampa.Listener.send('card', { type: 'build', object: this });
                }.bind(this);
            }
        });
    }
    function needMoreButton(data) {
        if (!data || !Array.isArray(data.results)) return false;
        var orig = data.original_length || 0;
        return orig > data.results.length && data.page === 1 && data.total_pages > 1;
    }
    function closest(el, selector) {
        if (el && el.closest) return el.closest(selector);
        while (el && el !== document) {
            if (el.matches && el.matches(selector)) return el;
            el = el.parentElement || el.parentNode;
        }
        return null;
    }

    // 6. Контекстне меню (Чорний список)
    function addContextMenu() {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'contextmenu' && e.object && isMediaContent(e.object) && e.menu && Array.isArray(e.menu)) {
                e.menu.push({
                    title: Lampa.Lang.translate('content_filter_hide_item'),
                    icon: '<svg height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>',
                    onSelect: function () {
                        if (!Array.isArray(settings.blacklist)) settings.blacklist = [];
                        if (!settings.blacklist.some(function(b) { return b.id === e.object.id; })) {
                            settings.blacklist.push({ id: e.object.id, title: e.object.title || e.object.name || 'Unknown' });
                            Lampa.Storage.set('content_filter_blacklist', settings.blacklist);
                            Lampa.Noty.show(Lampa.Lang.translate('content_filter_added_to_blacklist'));
                            if (Lampa.Activity.active() && Lampa.Activity.active().activity && Lampa.Activity.active().activity.component) {
                                Lampa.Activity.active().activity.component.render();
                            }
                        }
                    }
                });
            }
        });
    }

    [cite_start]// 7. Локалізація [cite: 46-48]
    function addTranslations() {
        Lampa.Lang.add({
            content_filters: { uk: 'Фільтр контенту', en: 'Content Filter', ru: 'Фильтр контента' },
            asian_filter: { uk: 'Приховати азіатський контент', en: 'Hide Asian content', ru: 'Убрать азиатский контент' },
            asian_filter_desc: { uk: 'Приховує картки азіатського походження', en: 'Hides cards of Asian origin', ru: 'Скрываем карточки азиатского происхождения' },
            language_filter: { uk: 'Приховати без перекладу', en: 'Hide without translation', ru: 'Убрать контент на другом языке' },
            language_filter_desc: { uk: 'Приховує картки без перекладу назви', en: 'Hides cards without title translation', ru: 'Скрываем карточки без перевода названия' },
            rating_filter: { uk: 'Приховати низький рейтинг', en: 'Hide low rating', ru: 'Убрать низкорейтинговый контент' },
            rating_filter_desc: { uk: 'Приховує картки з рейтингом нижче 6.0', en: 'Hides cards with rating below 6.0', ru: 'Скрываем карточки с рейтингом ниже 6.0' },
            history_filter: { uk: 'Приховати переглянуте', en: 'Hide watched', ru: 'Убрать просмотренный контент' },
            history_filter_desc: { uk: 'Приховує повністю переглянуті фільми та серіали', en: 'Hides fully watched items', ru: 'Скрываем карточки из истории' },
            ru_content_filter: { uk: 'Приховати російський/радянський', en: 'Hide Russian/Soviet content', ru: 'Убрать русский/советский контент' },
            ru_content_filter_desc: { uk: 'Приховує фільми та серіали РФ та СРСР', en: 'Hides movies from Russia and USSR', ru: 'Скрываем фильмы и сериалы РФ и СССР' },
            country_filter: { uk: 'Фільтр за країнами', en: 'Country Filter', ru: 'Фильтр по странам' },
            country_filter_desc: { uk: 'Увімкнути фільтр', en: 'Enable filter', ru: 'Включить фильтр' },
            country_list: { uk: 'Коди країн', en: 'Country codes', ru: 'Коды стран' },
            country_list_desc: { uk: 'Коди через кому (наприклад: US, IN)', en: 'Codes separated by comma', ru: 'Коды через запятую (например: US, IN)' },
            keyword_filter: { uk: 'Фільтр за словами', en: 'Keyword Filter', ru: 'Фильтр по словам' },
            keyword_filter_desc: { uk: 'Увімкнути фільтр', en: 'Enable filter', ru: 'Включить фильтр' },
            keyword_list: { uk: 'Список слів', en: 'List of words', ru: 'Список слов' },
            keyword_list_desc: { uk: 'Слова через кому', en: 'Words separated by comma', ru: 'Слова через запятую' },
            blacklist_manager: { uk: 'Чорний список (керування)', en: 'Blacklist (manage)', ru: 'Черный список (управление)' },
            blacklist_manager_desc: { uk: 'Натисніть для видалення прихованого', en: 'Click to remove hidden items', ru: 'Нажмите для удаления скрытого' },
            content_filter_hide_item: { uk: 'Приховати цей контент', en: 'Hide this content', ru: 'Скрыть этот контент' },
            content_filter_added_to_blacklist: { uk: 'Додано в чорний список', en: 'Added to blacklist', ru: 'Добавлено в черный список' },
            more: { uk: 'ще', en: 'more', ru: 'ещё' },
            title_category: { uk: 'Категорія', en: 'Category', ru: 'Категория' }
        });
    }

    [cite_start]// 8. Налаштування [cite: 49-58]
    function addSettings() {
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var render = Lampa.Settings.main().render();
                if (render.find('[data-component="content_filters"]').length === 0) {
                    Lampa.SettingsApi.addComponent({ component: 'content_filters', name: Lampa.Lang.translate('content_filters') });
                }
                Lampa.Settings.main().update();
                render.find('[data-component="content_filters"]').addClass('hide');
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'content_filters_menu', type: 'static', default: true },
            field: { name: Lampa.Lang.translate('content_filters'), description: 'Настройка відображення контенту' },
            onRender: function (el) {
                setTimeout(function () {
                    var title = Lampa.Lang.translate('content_filters');
                    $('.settings-param > div:contains("' + title + '")').parent().insertAfter($('div[data-name="interface_size"]'));
                }, 0);
                el.on('hover:enter', function () {
                    Lampa.Settings.create('content_filters');
                    Lampa.Controller.enabled().controller.back = function () { Lampa.Settings.create('interface'); };
                });
            }
        });

        var triggers = ['asian_filter_enabled', 'language_filter_enabled', 'rating_filter_enabled', 'history_filter_enabled', 'ru_content_filter_enabled', 'country_filter_enabled', 'keyword_filter_enabled'];
        triggers.forEach(function (name) {
            var shortName = name.replace('_enabled', '');
            Lampa.SettingsApi.addParam({
                component: 'content_filters',
                param: { name: name, type: 'trigger', default: false },
                field: { name: Lampa.Lang.translate(shortName), description: Lampa.Lang.translate(shortName + '_desc') },
                onChange: function (value) { settings[name] = value; Lampa.Storage.set(name, value); }
            });
        });

        ['country_list', 'keyword_list'].forEach(function(name) {
            Lampa.SettingsApi.addParam({
                component: 'content_filters',
                param: { name: name, type: 'input', default: '' },
                field: { name: Lampa.Lang.translate(name), description: Lampa.Lang.translate(name + '_desc') },
                onChange: function (value) { settings[name] = value; Lampa.Storage.set(name, value); }
            });
        });

        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'blacklist_manager', type: 'static' },
            field: { name: Lampa.Lang.translate('blacklist_manager'), description: Lampa.Lang.translate('blacklist_manager_desc') },
            onRender: function (el) {
                el.css('cursor', 'pointer').on('hover:enter', function () {
                    var items = (settings.blacklist || []).map(function(b) { return { title: b.title, id: b.id }; });
                    if (items.length === 0) { Lampa.Noty.show('Список порожній'); return; }
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

    [cite_start]// 9. Завантаження пам'яті [cite: 59-60]
    function loadSettings() {
        var params = ['asian_filter_enabled', 'language_filter_enabled', 'rating_filter_enabled', 'history_filter_enabled', 'ru_content_filter_enabled', 'country_filter_enabled', 'keyword_filter_enabled'];
        params.forEach(function (name) { settings[name] = Lampa.Storage.get(name, false); });
        ['country_list', 'keyword_list'].forEach(function (name) { settings[name] = Lampa.Storage.get(name, ''); });
        var bl = Lampa.Storage.get('content_filter_blacklist', []);
        settings.blacklist = Array.isArray(bl) ? bl : [];
    }

    [cite_start]// 10. Ініціалізація та Лісенери (Оригінал) [cite: 66-82]
    function initPlugin() {
        if (window.content_filter_ultimate_v2_plugin) return;
        window.content_filter_ultimate_v2_plugin = true;

        initCardListener();
        loadSettings();
        addTranslations();
        addSettings();
        addContextMenu();

        Lampa.Listener.follow('line', function (e) {
            if (e.type !== 'visible' || !needMoreButton(e.data)) return;
            var head = $(closest(e.body, '.items-line')).find('.items-line__head');
            if (head.find('.items-line__more').length) return;
            var more = document.createElement('div');
            more.classList.add('items-line__more', 'selector');
            more.innerText = Lampa.Lang.translate('more');
            more.addEventListener('hover:enter', function () {
                Lampa.Activity.push({
                    url: e.data.url,
                    title: e.data.title || Lampa.Lang.translate('title_category'),
                    component: 'category_full',
                    page: 1,
                    genres: e.params.genres,
                    filter: e.data.filter,
                    source: e.data.source || (e.params.object ? e.params.object.source : '')
                });
            });
            head.append(more);
        });

        Lampa.Listener.follow('line', function (e) {
            if (e.type !== 'append' || !needMoreButton(e.data)) return;
            if (e.items.length === e.data.results.length && Lampa.Controller.own(e.line)) {
                Lampa.Controller.collectionAppend(e.line.more());
            }
        });

        Lampa.Listener.follow('request_secuses', function (e) {
            if (!e.data || !Array.isArray(e.data.results)) return;
            var urlStr = typeof (e.url || (e.data && e.data.url)) === 'string' ? (e.url || (e.data && e.data.url)).toLowerCase() : '';
            if (urlStr.indexOf('extension') !== -1 || urlStr.indexOf('plugin') !== -1 || urlStr.indexOf('store') !== -1 || urlStr.indexOf('market') !== -1 || urlStr.indexOf('магазин') !== -1) return;
            var componentStr = typeof (e.component || (e.data && e.data.component)) === 'string' ? (e.component || (e.data && e.data.component)).toLowerCase() : '';
            if (componentStr.indexOf('extension') !== -1 || componentStr.indexOf('plugin') !== -1 || componentStr.indexOf('store') !== -1 || componentStr.indexOf('market') !== -1) return;
            if (e.data.results.length === 0) return;
            if (!e.data.results.some(isMediaContent)) return;

            e.data.original_length = e.data.results.length;
            e.data.results = filterProcessor.apply(e.data.results);
        });
    }

    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initPlugin();
        });
    }
})();