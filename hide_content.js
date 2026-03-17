/* Created by Elven (1|1) */
(function () {
    'use strict';

    // Налаштування за замовчуванням
    var settings = {
        hide_ru: false,
        hide_asian: false,
        hide_in: false,
        hide_tr: false,
        hide_ar: false,
        hide_custom_langs: '',
        hide_rating: 'none',
        hide_history: false,
        hide_words: ''
    };

    var autoLoadCount = 0;
    var lastRequestUrl = '';

    // Отримання текстової назви контенту
    function getSafeTitle(item) {
        if (!item) return 'Контент';
        var title = item.title || item.name || item.original_title || item.original_name || 'Контент';
        if (typeof title === 'object' && title !== null) {
            title = title.uk || title.ru || title.en || title.original || 'Контент';
        }
        return String(title);
    }

    // Перевірка на медіа-контент
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

    // Керування чорним списком
    function toggleBlacklist(cardData) {
        var blacklist = Lampa.Storage.get('content_blacklist', []);
        var isBlocked = false;
        var newList = [];
        
        for (var i = 0; i < blacklist.length; i++) {
            if (blacklist[i].id === cardData.id) isBlocked = true;
            else newList.push(blacklist[i]);
        }
        
        var title = getSafeTitle(cardData);
        
        if (isBlocked) {
            Lampa.Storage.set('content_blacklist', newList);
            Lampa.Noty.show('"' + title + '" ' + Lampa.Lang.translate('blacklist_removed_suffix'));
        } else {
            newList.push({ id: cardData.id, title: title });
            Lampa.Storage.set('content_blacklist', newList);
            Lampa.Noty.show('"' + title + '" ' + Lampa.Lang.translate('blacklist_added_suffix'));
            
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

    // Процесор приховування
    var hideProcessor = {
        filters: [
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
            function (items) {
                var langsToHide = [];
                if (settings.hide_ru) langsToHide.push('ru');
                if (settings.hide_asian) langsToHide.push('ja', 'ko', 'zh', 'th', 'id');
                if (settings.hide_in) langsToHide.push('hi', 'te', 'ta', 'ml', 'kn');
                if (settings.hide_tr) langsToHide.push('tr');
                if (settings.hide_ar) langsToHide.push('ar');
                
                var customLangs = (settings.hide_custom_langs || '').split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return s; });
                langsToHide = langsToHide.concat(customLangs);

                if (langsToHide.length === 0) return items;

                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    if (!item || !item.original_language) return true;
                    return langsToHide.indexOf(item.original_language.toLowerCase()) === -1;
                });
            },
            function (items) {
                if (settings.hide_rating === 'none') return items;
                var limit = parseFloat(settings.hide_rating);
                
                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    if (!item) return true;

                    var isSpecial = item.media_type === 'video' || item.type === 'Trailer' || item.site === 'YouTube' || (item.key && item.name && item.name.toLowerCase().indexOf('trailer') !== -1);
                    if (isSpecial) return true;
                    
                    if (!item.vote_average || item.vote_average === 0) return false; 
                    return item.vote_average >= limit;
                });
            },
            function (items) {
                if (!settings.hide_history) return items;

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
            function (items) {
                var words = (settings.hide_words || '').split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return s; });
                if (words.length === 0) return items;

                return items.filter(function (item) {
                    if (!isMediaContent(item)) return true;
                    var title = getSafeTitle(item).toLowerCase();
                    
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

    // Історія переглядів
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

    // Локалізація
    function addTranslations() {
        Lampa.Lang.add({
            content_hiding: { uk: 'Приховування контенту', en: 'Hide Content' },
            content_hiding_desc: { uk: 'Налаштування приховування небажаного контенту', en: 'Settings for hiding unwanted content' },
            hide_ru: { uk: 'Приховати російський контент', en: 'Hide Russian content' },
            hide_ru_desc: { uk: 'Приховує картки з мовою оригіналу: ru', en: 'Hides cards with original language: ru' },
            hide_asian: { uk: 'Приховати азійський контент', en: 'Hide Asian content' },
            hide_asian_desc: { uk: 'Приховує картки з мовами оригіналу: ja, ko, zh, th, id', en: 'Hides cards with original languages: ja, ko, zh, th, id' },
            hide_in: { uk: 'Приховати індійський контент', en: 'Hide Indian content' },
            hide_in_desc: { uk: 'Приховує картки з мовами оригіналу: hi, te, ta, ml, kn', en: 'Hides cards with original languages: hi, te, ta, ml, kn' },
            hide_tr: { uk: 'Приховати турецький контент', en: 'Hide Turkish content' },
            hide_tr_desc: { uk: 'Приховує картки з мовою оригіналу: tr', en: 'Hides cards with original language: tr' },
            hide_ar: { uk: 'Приховати арабський контент', en: 'Hide Arabic content' },
            hide_ar_desc: { uk: 'Приховує картки з мовою оригіналу: ar', en: 'Hides cards with original language: ar' },
            hide_custom_langs: { uk: 'Інші мови', en: 'Other languages' },
            hide_custom_langs_desc: { uk: 'Впишіть коди мов через кому', en: 'Enter language codes separated by commas' },
            hide_rating: { uk: 'Приховати низький рейтинг', en: 'Hide low rating' },
            hide_rating_desc: { uk: 'Приховує контент за рейтингом TMDb', en: 'Hides content based on TMDb rating' },
            hide_rating_none: { uk: 'Ні', en: 'No' },
            hide_history: { uk: 'Приховати переглянуте', en: 'Hide watched' },
            hide_history_desc: { uk: 'Приховує фільми та серіали, які ви вже повністю подивилися', en: 'Hides movies and TV series that you have already fully watched' },
            hide_words: { uk: 'Приховати за словами в назві', en: 'Hide by words in title' },
            hide_words_desc: { uk: 'Приховує картки, у назві яких є певні слова чи фрази (через кому)', en: 'Hides cards containing specific words or phrases in the title (comma separated)' },
            blacklist_manage: { uk: 'Чорний список', en: 'Blacklist' },
            blacklist_count: { uk: 'Заблоковано карток', en: 'Blocked cards' },
            blacklist_empty: { uk: 'Чорний список порожній', en: 'Blacklist is empty' },
            blacklist_remove_action: { uk: 'Натисніть на назву нижче, щоб видалити з чорного списку', en: 'Click on the title below to remove from blacklist' },
            blacklist_clear_all: { uk: 'Очистити весь список', en: 'Clear all list' },
            blacklist_add: { uk: 'Додати до чорного списку', en: 'Add to blacklist' },
            blacklist_remove: { uk: 'Видалити з чорного списку', en: 'Remove from blacklist' },
            blacklist_added_suffix: { uk: 'додано до чорного списку', en: 'added to blacklist' },
            blacklist_removed_suffix: { uk: 'видалено з чорного списку', en: 'removed from blacklist' },
            more: { uk: 'ще', en: 'more' },
            title_category: { uk: 'Категорія', en: 'Category' }
        });
    }
