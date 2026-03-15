/* Created by Elven (1|1) - Fixed Logic based on app.min.js */
(function () {
    'use strict';

    var settings = {
        ru_lang_enabled: false,
        asian_lang_enabled: false,
        indian_lang_enabled: false,
        turkish_lang_enabled: false,
        arabic_lang_enabled: false,
        other_languages: '',
        rating_limit: 0,
        hide_watched: false,
        keyword_filter: '',
        blacklist: []
    };

    function isMediaContent(item) {
        if (!item) return false;
        if (item.type && typeof item.type === 'string') {
            var t = item.type.toLowerCase();
            if (t === 'plugin' || t === 'extension' || t === 'theme' || t === 'addon') return false;
        }
        var hasMedia = item.original_language || item.vote_average || item.media_type || item.release_date || item.original_title;
        return !!hasMedia;
    }

    function getMediaData(item) {
        if (!item) return null;
        var data = item;
        if (item.movie && (item.movie.id || item.movie.tmdb_id)) data = item.movie;
        else if (item.data && (item.data.id || item.data.tmdb_id)) data = item.data;
        else if (item.card && (item.card.id || item.card.tmdb_id)) data = item.card;
        return (data && (data.id || data.tmdb_id)) ? data : null;
    }

    var filterProcessor = {
        apply: function (items) {
            if (!Array.isArray(items)) return items;
            return items.filter(function (item) {
                if (!isMediaContent(item)) return true;
                var data = getMediaData(item);
                if (!data) return true;

                // 1. Чорний список
                var id = data.id || data.tmdb_id;
                if (settings.blacklist.some(function(b) { return b.id == id; })) return false;

                var lang = (data.original_language || '').toLowerCase();

                // 2. Мовні фільтри (Оригінальні коди)
                if (settings.ru_lang_enabled && lang === 'ru') return false;
                if (settings.asian_lang_enabled && ['ja', 'ko', 'zh'].indexOf(lang) !== -1) return false;
                if (settings.indian_lang_enabled && ['hi', 'te', 'ta', 'kn', 'ml'].indexOf(lang) !== -1) return false;
                if (settings.turkish_lang_enabled && lang === 'tr') return false;
                if (settings.arabic_lang_enabled && lang === 'ar') return false;

                if (settings.other_languages) {
                    var other = settings.other_languages.split(',').map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
                    if (other.indexOf(lang) !== -1) return false;
                }

                // 3. Рейтинг
                if (settings.rating_limit > 0) {
                    var vote = parseFloat(data.vote_average || 0);
                    if (vote < settings.rating_limit) return false;
                }

                // 4. Переглянуте
                if (settings.hide_watched) {
                    var cardStatus = Lampa.Favorite.check(data);
                    if (cardStatus) {
                        if (cardStatus.thrown) return false;
                        var mediaType = data.media_type || (data.first_air_date ? 'tv' : 'movie');
                        if (mediaType === 'movie' && cardStatus.history) return false;
                        if (mediaType === 'tv' && cardStatus.viewed) return false;
                    }
                }

                // 5. Ключові слова
                if (settings.keyword_filter) {
                    var words = settings.keyword_filter.split(',').map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
                    var title = (data.title || data.name || data.original_title || data.original_name || '').toLowerCase();
                    if (words.some(function(w) { return title.indexOf(w) !== -1; })) return false;
                }

                return true;
            });
        }
    };
    function addContextMenu() {
        var menuHandler = function (e) {
            if (e.type === 'contextmenu' && e.menu && e.object) {
                var data = getMediaData(e.object);
                if (data) {
                    var id = data.id || data.tmdb_id;
                    var title = data.title || data.name || 'Unknown';
                    if (!settings.blacklist.some(function(b) { return b.id == id; })) {
                        e.menu.push({
                            title: Lampa.Lang.translate('hide_this_item'),
                            onSelect: function () {
                                if (!Array.isArray(settings.blacklist)) settings.blacklist = [];
                                settings.blacklist.push({ id: id, title: title });
                                Lampa.Storage.set('content_filter_blacklist', settings.blacklist);
                                Lampa.Noty.show(Lampa.Lang.translate('added_to_blacklist'));
                            }
                        });
                    }
                }
            }
        };
        Lampa.Listener.follow('app', menuHandler);
        Lampa.Listener.follow('card', menuHandler);
    }

    function addTranslations() {
        Lampa.Lang.add({
            content_filters: { ru: 'Скрытие контента', uk: 'Приховування контенту', en: 'Content Hiding' },
            ru_lang: { ru: 'Скрыть русский контент', uk: 'Приховати російський контент', en: 'Hide Russian content' },
            asian_lang: { ru: 'Скрыть азиатский контент', uk: 'Приховати азійський контент', en: 'Hide Asian content' },
            indian_lang: { ru: 'Скрыть индийский контент', uk: 'Приховати індійський контент', en: 'Hide Indian content' },
            turkish_lang: { ru: 'Скрыть турецкий контент', uk: 'Приховати турецький контент', en: 'Hide Turkish content' },
            arabic_lang: { ru: 'Скрыть арабский контент', uk: 'Приховати арабський контент', en: 'Hide Arabic content' },
            other_langs: { ru: 'Другие языки (коды)', uk: 'Інші мови (коди)', en: 'Other languages (codes)' },
            low_rating: { ru: 'Скрыть низкий рейтинг', uk: 'Приховати низький рейтинг', en: 'Hide low rating' },
            hide_watched: { ru: 'Скрыть просмотренное', uk: 'Приховати переглянуте', en: 'Hide watched' },
            word_filter: { ru: 'Фильтр слов в названии', uk: 'Фільтр слів у назві', en: 'Title word filter' },
            blacklist_title: { ru: 'Черный список', uk: 'Чорний список', en: 'Blacklist' },
            hide_this_item: { ru: 'Скрыть этот контент', uk: 'Приховати цей контент', en: 'Hide this content' },
            added_to_blacklist: { ru: 'Добавлено. Обновите страницу', uk: 'Додано. Оновіть сторінку', en: 'Added. Refresh page' },
            rating_none: { ru: 'Нет', uk: 'Ні', en: 'None' }
        });
    }

    function addSettings() {
        // ВИКОРИСТОВУЄМО ОРИГІНАЛЬНИЙ МЕТОД ІЗ ТВОГО КОДУ
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var render = Lampa.Settings.main().render();
                if (render.find('[data-component="content_filters"]').length === 0) {
                    Lampa.SettingsApi.addComponent({
                        component: 'content_filters',
                        name: Lampa.Lang.translate('content_filters')
                    });
                }
                Lampa.Settings.main().update();
                render.find('[data-component="content_filters"]').addClass('hide');
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'content_filters', type: 'static', default: true },
            field: { name: Lampa.Lang.translate('content_filters'), description: 'Налаштування приховування карток' },
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

        // ПУНКТИ МЕНЮ
        var pMap = [
            {id:'ru_lang', n:'ru_lang_enabled'}, {id:'asian_lang', n:'asian_lang_enabled'},
            {id:'indian_lang', n:'indian_lang_enabled'}, {id:'turkish_lang', n:'turkish_lang_enabled'},
            {id:'arabic_lang', n:'arabic_lang_enabled'}, {id:'hide_watched', n:'hide_watched'}
        ];
        pMap.forEach(function(p){
            Lampa.SettingsApi.addParam({
                component: 'content_filters',
                param: { name: p.n, type: 'trigger', default: false },
                field: { name: Lampa.Lang.translate(p.id) },
                onChange: function(v){ settings[p.n] = v; Lampa.Storage.set(p.n, v); }
            });
        });

        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'other_languages', type: 'static' },
            field: { name: Lampa.Lang.translate('other_langs') },
            onRender: function(el){
                var vDiv = $('<div class="settings-param__value"></div>').text(settings.other_languages || '');
                el.find('.settings-param__name').after(vDiv);
                el.on('hover:enter', function(){
                    Lampa.Input.edit({title: Lampa.Lang.translate('other_langs'), value: settings.other_languages, free: true}, function(v){
                        settings.other_languages = v; Lampa.Storage.set('other_languages', v); vDiv.text(v);
                    });
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'rating_limit', type: 'select', default: 0 },
            field: { name: Lampa.Lang.translate('low_rating') },
            values: { 0: Lampa.Lang.translate('rating_none'), 4: '< 4.0', 5: '< 5.0', 6: '< 6.0', 7: '< 7.0' },
            onChange: function(v){ settings.rating_limit = parseFloat(v); Lampa.Storage.set('rating_limit', v); }
        });

        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'keyword_filter', type: 'static' },
            field: { name: Lampa.Lang.translate('word_filter') },
            onRender: function(el){
                var vDiv = $('<div class="settings-param__value"></div>').text(settings.keyword_filter || '');
                el.find('.settings-param__name').after(vDiv);
                el.on('hover:enter', function(){
                    Lampa.Input.edit({title: Lampa.Lang.translate('word_filter'), value: settings.keyword_filter, free: true}, function(v){
                        settings.keyword_filter = v; Lampa.Storage.set('keyword_filter', v); vDiv.text(v);
                    });
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'content_filters',
            param: { name: 'blacklist_manager', type: 'static' },
            field: { name: Lampa.Lang.translate('blacklist_title') },
            onRender: function(el){
                el.on('hover:enter', function(){
                    var items = settings.blacklist.map(function(b){ return {title: b.title, id: b.id}; });
                    if(!items.length) return Lampa.Noty.show('Порожньо');
                    Lampa.Select.show({title: Lampa.Lang.translate('blacklist_title'), items: items, onSelect: function(i){
                        settings.blacklist = settings.blacklist.filter(function(b){ return b.id !== i.id; });
                        Lampa.Storage.set('content_filter_blacklist', settings.blacklist);
                        Lampa.Noty.show('Видалено');
                    }});
                });
            }
        });
    }

    function initPlugin() {
        if (window.content_filter_final_fix) return;
        window.content_filter_final_fix = true;

        var keys = ['ru_lang_enabled','asian_lang_enabled','indian_lang_enabled','turkish_lang_enabled','arabic_lang_enabled','other_languages','rating_limit','hide_watched','keyword_filter'];
        keys.forEach(function(k){ settings[k] = Lampa.Storage.get(k, settings[k]); });
        var bl = Lampa.Storage.get('content_filter_blacklist', []);
        settings.blacklist = Array.isArray(bl) ? bl : [];

        addTranslations();
        addSettings();
        addContextMenu();

        Lampa.Listener.follow('request_secuses', function (e) {
            if (!e.data || !Array.isArray(e.data.results)) return;
            var url = (e.url || e.data.url || '').toLowerCase();
            if (url.indexOf('extension') !== -1 || url.indexOf('plugin') !== -1 || url.indexOf('store') !== -1) return;
            
            if (e.data.results.length > 0 && e.data.results.some(isMediaContent)) {
                e.data.original_length = e.data.results.length;
                e.data.results = filterProcessor.apply(e.data.results);
            }
        });
    }

    if (window.appready) initPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') initPlugin(); });
})();
