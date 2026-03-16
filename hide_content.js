/* Created by Elven (1|1) */
(function () {
    'use strict';

    // Налаштування фільтрів за замовчуванням
    var settings = {
        filter_ru: false,
        filter_asian: false,
        filter_in: false,
        filter_tr: false,
        filter_ar: false,
        filter_custom_langs: '',
        filter_rating: 'none',
        filter_history: false,
        filter_words: ''
    };

    var autoLoadCount = 0;
    var lastRequestUrl = '';
    var lastContextCard = null;

    // Перехоплення об'єкта картки для контекстного меню
    function initCardListener() {
        if (window.content_hiding_card_listener) return;
        window.content_hiding_card_listener = true;
        
        Object.defineProperty(Lampa.Card.prototype, 'build', {
            get: function () { return this._build; },
            set: function (value) {
                this._build = function () {
                    value.apply(this);
                    Lampa.Listener.send('card', { type: 'build', object: this });
                }.bind(this);
            }
        });

        Lampa.Listener.follow('card', function(e) {
            if (e.type === 'build' && e.object && e.object.render) {
                e.object.render().on('hover:enter hover:focus hover:long contextmenu', function() {
                    lastContextCard = e.object.card || e.object.data;
                });
            }
        });
    }

    // Функція перевірки, чи є елемент медіа-контентом
    function isMediaContent(item) {
        if (!item) return false;
        if (item.type && typeof item.type === 'string') {
            var typeLower = item.type.toLowerCase();
            if (typeLower === 'plugin' || typeLower === 'extension' || typeLower === 'theme' || typeLower === 'addon') return false;
        }
        var hasExtensionFields = (item.plugin !== undefined || item.extension !== undefined || (item.type && item.type === 'extension') || (item.type && item.type === 'plugin'));
        var hasMediaFields = item.original_language !== undefined || item.vote_average !== undefined || item.media_type !== undefined || item.first_air_date !== undefined || item.release_date !== undefined || item.original_title !== undefined || item.original_name !== undefined || (item.genre_ids && Array.isArray(item.genre_ids)) || (item.genres && Array.isArray(item.genres));
        
        if (hasExtensionFields && !hasMediaFields) return false;
        if (!hasMediaFields) return false;
        
        return true;
    }

    // Керування Чорним списком
    function toggleBlacklist(cardData) {
        var blacklist = Lampa.Storage.get('content_blacklist', []);
        var isBlocked = false;
        var newList = [];
        
        for (var i = 0; i < blacklist.length; i++) {
            if (blacklist[i].id === cardData.id) isBlocked = true;
            else newList.push(blacklist[i]);
        }
        
        var title = cardData.title || cardData.name || cardData.original_title || cardData.original_name || 'Item';
        
        if (isBlocked) {
            Lampa.Storage.set('content_blacklist', newList);
            Lampa.Noty.show(Lampa.Lang.translate('blacklist_removed') + ': ' + title);
        } else {
            newList.push({ id: cardData.id, title: title });
            Lampa.Storage.set('content_blacklist', newList);
            Lampa.Noty.show(Lampa.Lang.translate('blacklist_added') + ': ' + title);
            
            // Миттєво приховуємо картку з екрана
            var active = Lampa.Activity.active();
            if (active && active.activity && active.activity.render) {
                var focusEl = active.activity.render().find('.focus');
                if (focusEl.length) {
                    focusEl.css('display', 'none');
                    var next = focusEl.next('.item');
                    if (next.length) Lampa.Controller.toggle('content');
                }
            }
        }
    }

    // Процесор фільтрів
    var filterProcessor = {
        filters: [
            // Фільтр Чорного списку
            function (items) {
                var blacklist = Lampa.Storage.get('content_blacklist', []);
                if (blacklist.length === 0) return items;
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    for (var i = 0; i < blacklist.length; i++) {
                        if (blacklist[i].id === item.id) return false;
                    }
                    return true;
                });
            },

            // Фільтр мов
            function (items) {
                var langsToHide = [];
                if (settings.filter_ru) langsToHide.push('ru');
                if (settings.filter_asian) langsToHide.push('ja', 'ko', 'zh', 'th', 'id');
                if (settings.filter_in) langsToHide.push('hi', 'te', 'ta', 'ml', 'kn');
                if (settings.filter_tr) langsToHide.push('tr');
                if (settings.filter_ar) langsToHide.push('ar');
                
                var customLangs = (settings.filter_custom_langs || '').split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return s; });
                langsToHide = langsToHide.concat(customLangs);

                if (langsToHide.length === 0) return items;

                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    if (!item || !item.original_language) return true;
                    return langsToHide.indexOf(item.original_language.toLowerCase()) === -1;
                });
            },

            // Фільтр низького рейтингу
            function (items) {
                if (settings.filter_rating === 'none') return items;
                var limit = parseFloat(settings.filter_rating);
                
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    if (!item) return true;

                    var isSpecial = item.media_type === 'video' || item.type === 'Trailer' || item.site === 'YouTube' || (item.key && item.name && item.name.toLowerCase().indexOf('trailer') !== -1);
                    if (isSpecial) return true;
                    
                    if (!item.vote_average || item.vote_average === 0) return false; 
                    return item.vote_average >= limit;
                });
            },

            // Фільтр переглянутого
            function (items) {
                if (!settings.filter_history) return items;

                var favorite = Lampa.Storage.get('favorite', '{}');
                var timeline = Lampa.Storage.cache('timetable', 300, []);

                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    if (!item || !item.id) return true;

                    var mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                    var card = Lampa.Favorite.check(item);
                    var hasHistory = card && card.history;
                    var isThrown = card && card.thrown;

                    if (isThrown) return false;
                    if (!hasHistory) return true;
                    if (hasHistory && mediaType === 'movie') return false;

                    var watchedFromFavorite = getWatchedEpisodesFromFavorite(item.id, favorite);
                    var watchedFromTimeline = getWatchedEpisodesFromTimeline(item.id, timeline);
                    var allWatchedEpisodes = mergeWatchedEpisodes(watchedFromFavorite, watchedFromTimeline);
                    var title = item.original_title || item.original_name || item.title || item.name || '';
                    
                    return !isSeriesFullyWatched(title, allWatchedEpisodes);
                });
            },

            // Фільтр слів
            function (items) {
                var words = (settings.filter_words || '').split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return s; });
                if (words.length === 0) return items;

                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    var title = (item.title || item.name || item.original_title || item.original_name || '').toLowerCase();
                    
                    for (var i = 0; i < words.length; i++) {
                        if (title.indexOf(words[i]) !== -1) return false;
                    }
                    return true;
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

    function getWatchedEpisodesFromFavorite(id, favoriteData) {
        var card = (favoriteData.card || []).find(function (c) { return c.id === id && Array.isArray(c.seasons) && c.seasons.length > 0; });
        if (!card) return [];
        var airedSeasons = card.seasons.filter(function (s) { return s.season_number > 0 && s.episode_count > 0 && s.air_date && new Date(s.air_date) < new Date(); });
        var episodes = [];
        airedSeasons.forEach(function (season) {
            for (var ep = 1; ep <= season.episode_count; ep++) episodes.push({ season_number: season.season_number, episode_number: ep });
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
            var hash = Lampa.Utils.hash([ ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, title ].join(''));
            var view = Lampa.Timeline.view(hash);
            if (!view || view.percent < 100) return false;
        }
        return true;
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

    function addTranslations() {
        Lampa.Lang.add({
            content_hiding: { uk: 'Приховування контенту', en: 'Hide Content' },
            content_hiding_desc: { uk: 'Налаштування приховування небажаного контенту', en: 'Settings for hiding unwanted content' },
            filter_ru: { uk: 'Приховати російський контент', en: 'Hide Russian content' },
            filter_ru_desc: { uk: 'Приховує картки з мовою оригіналу: ru', en: 'Hides cards with original language: ru' },
            filter_asian: { uk: 'Приховати азійський контент', en: 'Hide Asian content' },
            filter_asian_desc: { uk: 'Приховує картки з мовами оригіналу: ja, ko, zh, th, id', en: 'Hides cards with original languages: ja, ko, zh, th, id' },
            filter_in: { uk: 'Приховати індійський контент', en: 'Hide Indian content' },
            filter_in_desc: { uk: 'Приховує картки з мовами оригіналу: hi, te, ta, ml, kn', en: 'Hides cards with original languages: hi, te, ta, ml, kn' },
            filter_tr: { uk: 'Приховати турецький контент', en: 'Hide Turkish content' },
            filter_tr_desc: { uk: 'Приховує картки з мовою оригіналу: tr', en: 'Hides cards with original language: tr' },
            filter_ar: { uk: 'Приховати арабський контент', en: 'Hide Arabic content' },
            filter_ar_desc: { uk: 'Приховує картки з мовою оригіналу: ar', en: 'Hides cards with original language: ar' },
            filter_custom_langs: { uk: 'Інші мови', en: 'Other languages' },
            filter_custom_langs_desc: { uk: 'Впишіть коди мов через кому', en: 'Enter language codes separated by commas' },
            filter_rating: { uk: 'Приховати низький рейтинг', en: 'Hide low rating' },
            filter_rating_desc: { uk: 'Приховує контент за рейтингом TMDb', en: 'Hides content based on TMDb rating' },
            filter_rating_none: { uk: 'Ні', en: 'No' },
            filter_history: { uk: 'Приховати переглянуте', en: 'Hide watched' },
            filter_history_desc: { uk: 'Приховує фільми та серіали, які ви вже повністю подивилися', en: 'Hides movies and TV series that you have already fully watched' },
            filter_words: { uk: 'Приховати за словами в назві', en: 'Hide by words in title' },
            filter_words_desc: { uk: 'Приховує картки, у назві яких є певні слова чи фрази (через кому)', en: 'Hides cards containing specific words or phrases in the title (comma separated)' },
            blacklist_manage: { uk: 'Чорний список', en: 'Blacklist' },
            blacklist_manage_desc: { uk: 'Список прихованих фільмів та серіалів', en: 'List of hidden movies and series' },
            blacklist_count: { uk: 'Заблоковано карток', en: 'Blocked cards' },
            blacklist_empty: { uk: 'Чорний список порожній', en: 'Blacklist is empty' },
            blacklist_remove_action: { uk: 'Натисніть, щоб видалити', en: 'Press to remove' },
            blacklist_clear_all: { uk: '[ Очистити весь список ]', en: '[ Clear all list ]' },
            blacklist_add: { uk: 'Додати в чорний список', en: 'Add to blacklist' },
            blacklist_remove: { uk: 'Видалити з чорного списку', en: 'Remove from blacklist' },
            blacklist_added: { uk: 'Додано в чорний список', en: 'Added to blacklist' },
            blacklist_removed: { uk: 'Видалено з чорного списку', en: 'Removed from blacklist' },
            more: { uk: 'ще', en: 'more' },
            title_category: { uk: 'Категорія', en: 'Category' }
        });
    }

    function addSettings() {
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var render = Lampa.Settings.main().render();
                if (render.find('[data-component="content_hiding"]').length === 0) {
                    Lampa.SettingsApi.addComponent({ component: 'content_hiding', name: Lampa.Lang.translate('content_hiding') });
                }
                Lampa.Settings.main().update();
                render.find('[data-component="content_hiding"]').addClass('hide');
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'content_hiding', type: 'static', default: true },
            field: { name: Lampa.Lang.translate('content_hiding'), description: Lampa.Lang.translate('content_hiding_desc') },
            onRender: function (el) {
                setTimeout(function () {
                    var title = Lampa.Lang.translate('content_hiding') || 'Приховування контенту';
                    $('.settings-param > div:contains("' + title + '")').parent().insertAfter($('div[data-name="interface_size"]'));
                }, 0);
                el.on('hover:enter', function () {
                    Lampa.Settings.create('content_hiding');
                    Lampa.Controller.enabled().controller.back = function () { Lampa.Settings.create('interface'); };
                });
            }
        });

        ['ru', 'asian', 'in', 'tr', 'ar'].forEach(function (langKey) {
            Lampa.SettingsApi.addParam({
                component: 'content_hiding',
                param: { name: 'filter_' + langKey, type: 'trigger', default: false },
                field: { name: Lampa.Lang.translate('filter_' + langKey), description: Lampa.Lang.translate('filter_' + langKey + '_desc') },
                onChange: function (value) {
                    settings['filter_' + langKey] = value;
                    Lampa.Storage.set('filter_' + langKey, value);
                }
            });
        });

        Lampa.SettingsApi.addParam({
            component: 'content_hiding',
            param: { name: 'filter_custom_langs', type: 'static', default: '' },
            field: { name: Lampa.Lang.translate('filter_custom_langs'), description: settings.filter_custom_langs || Lampa.Lang.translate('filter_custom_langs_desc') },
            onRender: function (el) {
                el.on('hover:enter', function () {
                    Lampa.Input.edit({
                        title: Lampa.Lang.translate('filter_custom_langs'),
                        value: settings.filter_custom_langs,
                        free: true,
                        nosave: false
                    }, function (new_value) {
                        settings.filter_custom_langs = new_value;
                        Lampa.Storage.set('filter_custom_langs', new_value);
                        el.find('.settings-param__des').text(new_value || Lampa.Lang.translate('filter_custom_langs_desc'));
                    });
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'content_hiding',
            param: { 
                name: 'filter_rating', 
                type: 'select', 
                values: { 'none': Lampa.Lang.translate('filter_rating_none'), '4.0': '< 4.0', '5.0': '< 5.0', '6.0': '< 6.0', '7.0': '< 7.0' }, 
                default: 'none' 
            },
            field: { name: Lampa.Lang.translate('filter_rating'), description: Lampa.Lang.translate('filter_rating_desc') },
            onChange: function (value) {
                settings.filter_rating = value;
                Lampa.Storage.set('filter_rating', value);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'content_hiding',
            param: { name: 'filter_history', type: 'trigger', default: false },
            field: { name: Lampa.Lang.translate('filter_history'), description: Lampa.Lang.translate('filter_history_desc') },
            onChange: function (value) {
                settings.filter_history = value;
                Lampa.Storage.set('filter_history', value);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'content_hiding',
            param: { name: 'filter_words', type: 'static', default: '' },
            field: { name: Lampa.Lang.translate('filter_words'), description: settings.filter_words || Lampa.Lang.translate('filter_words_desc') },
            onRender: function (el) {
                el.on('hover:enter', function () {
                    Lampa.Input.edit({
                        title: Lampa.Lang.translate('filter_words'),
                        value: settings.filter_words,
                        free: true,
                        nosave: false
                    }, function (new_value) {
                        settings.filter_words = new_value;
                        Lampa.Storage.set('filter_words', new_value);
                        el.find('.settings-param__des').text(new_value || Lampa.Lang.translate('filter_words_desc'));
                    });
                });
            }
        });

        // Менеджер Чорного списку
        Lampa.SettingsApi.addParam({
            component: 'content_hiding',
            param: { name: 'filter_blacklist_manage', type: 'static' },
            field: { name: Lampa.Lang.translate('blacklist_manage'), description: '' },
            onRender: function (el) {
                var updateCount = function() {
                    var list = Lampa.Storage.get('content_blacklist', []);
                    el.find('.settings-param__des').text(Lampa.Lang.translate('blacklist_count') + ': ' + list.length);
                };
                updateCount();
                
                el.on('hover:enter', function () {
                    var list = Lampa.Storage.get('content_blacklist', []);
                    if (list.length === 0) {
                        Lampa.Noty.show(Lampa.Lang.translate('blacklist_empty'));
                        return;
                    }
                    var items = list.map(function(item) {
                        return { title: item.title, subtitle: Lampa.Lang.translate('blacklist_remove_action'), itemData: item };
                    });
                    items.push({
                        title: Lampa.Lang.translate('blacklist_clear_all'),
                        onSelect: function() {
                            Lampa.Storage.set('content_blacklist', []);
                            updateCount();
                            Lampa.Controller.toggle('settings_component');
                        }
                    });
                    
                    Lampa.Select.show({
                        title: Lampa.Lang.translate('blacklist_manage'),
                        items: items,
                        onSelect: function(selected) {
                            if (selected.itemData) {
                                var newList = Lampa.Storage.get('content_blacklist', []).filter(function(i) { return i.id !== selected.itemData.id; });
                                Lampa.Storage.set('content_blacklist', newList);
                                Lampa.Noty.show(Lampa.Lang.translate('blacklist_removed') + ': ' + selected.itemData.title);
                                updateCount();
                                Lampa.Controller.toggle('settings_component');
                            }
                        },
                        onBack: function() { Lampa.Controller.toggle('settings_component'); }
                    });
                });
            }
        });
    }

    function loadSettings() {
        for (var key in settings) settings[key] = Lampa.Storage.get(key, settings[key]);
    }

    function initPlugin() {
        if (window.content_hiding_plugin) return;
        window.content_hiding_plugin = true;

        initCardListener();
        loadSettings();
        addTranslations();
        addSettings();

        // Перехоплення меню дій для картки
        var originalSelectShow = Lampa.Select.show;
        Lampa.Select.show = function(params) {
            var isCardMenu = params && params.items && params.items.some(function(i) {
                return i.title && (i.title.indexOf('Трейлер') !== -1 || i.title.indexOf('Похожие') !== -1 || i.title.indexOf('Схожі') !== -1 || i.title.indexOf('Trailer') !== -1 || i.title.indexOf('Опис') !== -1 || i.title.indexOf('Описание') !== -1);
            });

            if (isCardMenu && lastContextCard && lastContextCard.id && isMediaContent(lastContextCard)) {
                var blacklist = Lampa.Storage.get('content_blacklist', []);
                var inList = blacklist.some(function(i) { return i.id === lastContextCard.id; });
                var cardData = lastContextCard; 

                params.items.push({
                    title: inList ? Lampa.Lang.translate('blacklist_remove') : Lampa.Lang.translate('blacklist_add'),
                    onSelect: function() {
                        toggleBlacklist(cardData);
                        Lampa.Controller.toggle('content');
                    }
                });
            }
            originalSelectShow.apply(Lampa.Select, arguments);
        };

        Lampa.Listener.follow('line', function (e) {
            if (e.type !== 'visible' || !needMoreButton(e.data)) return;
            var head = $(closest(e.body, '.items-line')).find('.items-line__head');
            if (head.find('.items-line__more').length) return;

            var more = document.createElement('div');
            more.classList.add('items-line__more', 'selector');
            more.innerText = Lampa.Lang.translate('more');
            more.addEventListener('hover:enter', function () {
                Lampa.Activity.push({
                    url: e.data.url, title: e.data.title || Lampa.Lang.translate('title_category'), component: 'category_full',
                    page: 1, genres: e.params.genres, filter: e.data.filter, source: e.data.source || (e.params.object ? e.params.object.source : '')
                });
            });
            head.append(more);
        });

        Lampa.Listener.follow('request_secuses', function (e) {
            if (!e.data || !Array.isArray(e.data.results)) return;
            var urlStr = (e.url || (e.data && e.data.url) || '').toLowerCase();
            if (urlStr.indexOf('extension') !== -1 || urlStr.indexOf('plugin') !== -1 || urlStr.indexOf('store') !== -1) return;
            var componentStr = (e.component || (e.data && e.data.component) || '').toLowerCase();
            if (componentStr.indexOf('extension') !== -1 || componentStr.indexOf('plugin') !== -1) return;
            if (e.data.results.length === 0) return;
            
            var hasMediaContent = e.data.results.some(function(item) { return isMediaContent(item); });
            if (!hasMediaContent) return;
            
            var originalCount = e.data.results.length;
            e.data.results = filterProcessor.apply(e.data.results);
            e.data.original_length = originalCount;

            var currentUrlBase = urlStr.split('&page=')[0];
            if (currentUrlBase !== lastRequestUrl) {
                autoLoadCount = 0; 
                lastRequestUrl = currentUrlBase;
            }

            if (e.data.results.length < 10 && e.data.page && e.data.total_pages && e.data.page < e.data.total_pages) {
                if (autoLoadCount < 3) {
                    autoLoadCount++;
                    setTimeout(function() {
                        var activeActivity = Lampa.Activity.active();
                        if (activeActivity && activeActivity.component === 'category_full' && activeActivity.activity && typeof activeActivity.activity.append === 'function') {
                            activeActivity.activity.append();
                        }
                    }, 400); 
                } else {
                    autoLoadCount = 0; 
                }
            }
        });
    }

    if (window.appready) initPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') initPlugin(); });
})();