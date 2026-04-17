(function () {
    'use strict';

    // Нова іконка: ліва частина біла (#fff), права - світло-сіра (#e0e0e0)
    var PLUGIN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.cls-1{fill:#fff;fill-rule:evenodd;}.cls-2{fill:#e0e0e0;fill-rule:evenodd;}</style><g data-name="Product Icons"><g><polygon class="cls-1" points="16.64 15.13 17.38 13.88 20.91 13.88 22 12 19.82 8.25 16.75 8.25 15.69 6.39 14.5 6.39 14.5 5.13 16.44 5.13 17.5 7 19.09 7 16.9 3.25 12.63 3.25 12.63 8.25 14.36 8.25 15.09 9.5 12.63 9.5 12.63 12 14.89 12 15.94 10.13 18.75 10.13 19.47 11.38 16.67 11.38 15.62 13.25 12.63 13.25 12.63 17.63 16.03 17.63 15.31 18.88 12.63 18.88 12.63 20.75 16.9 20.75 20.18 15.13 18.09 15.13 17.36 16.38 14.5 16.38 14.5 15.13 16.64 15.13"/><polygon class="cls-2" points="7.36 15.13 6.62 13.88 3.09 13.88 2 12 4.18 8.25 7.25 8.25 8.31 6.39 9.5 6.39 9.5 5.13 7.56 5.13 6.5 7 4.91 7 7.1 3.25 11.38 3.25 11.38 8.25 9.64 8.25 8.91 9.5 11.38 9.5 11.38 12 9.11 12 8.06 10.13 5.25 10.13 4.53 11.38 7.33 11.38 8.38 13.25 11.38 13.25 11.38 17.63 7.97 17.63 8.69 18.88 11.38 18.88 11.38 20.75 7.1 20.75 3.82 15.13 5.91 15.13 6.64 16.38 9.5 16.38 9.5 15.13 7.36 15.13"/></g></g></svg>';

    var TARGET_MODEL = 'gemini-flash-lite-latest';
    var STORAGE_KEY = 'google_native_key_v1';
    window.ai_cached_results = [];

    // Реєстрація джерела результатів
    if (window.Lampa && Lampa.Api) {
        Lampa.Api.sources.ai_list_source = {
            list: function(params, oncomplite) { oncomplite({ results: window.ai_cached_results, total_pages: 1 }); }
        };
    }

    function AIAssistantPlugin() {
        var _this = this;
        var statusBox = null;

        this.init = function () {
            this.setupSettings();
            this.injectStyles();
            
            // Глобальний пошук з пріоритетом 3
            this.setupGlobalSearch();

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite' || e.type == 'complete') {
                    _this.drawButton(e.object.activity.render(), e.data.movie);
                }
            });
        };

        this.setupGlobalSearch = function() {
            var searchSource = {
                title: 'AI Пошук',
                search: function (params, done) {
                    var q = decodeURIComponent(params.query || '').trim();
                    var limit = Lampa.Storage.get('ai_result_count', '20');
                    if (!q) return done([]);
                    
                    var prompt = 'Act as a movie expert. Suggest exactly ' + limit + ' popular movies and TV series related to: "' + q + '". Return JSON array: [{"uk":"Title","orig":"Original","year":Year}].';
                    _this.updateStatus('🤖 AI пошук: ' + q);
                    _this.askGemini(prompt, function(text) {
                        var list = _this.parseJsonSafe(text);
                        if (!list) { _this.hideStatus(); return done([]); }
                        _this.processAiList(list, function(results) {
                            _this.hideStatus();
                            done([{ title: 'AI: ' + q, results: results, total: results.length }]);
                        });
                    });
                },
                params: { save: true, lazy: true },
                onSelect: function (p, close) { close(); Lampa.Activity.push({ url: p.element.media_type+'/'+p.element.id, component: 'full', id: p.element.id, method: p.element.media_type, card: p.element, source: 'tmdb' }); }
            };

            // Вставка на 3-тє місце (індекс 2) з невеликою затримкою
            setTimeout(function() {
                var sources = Lampa.Search.sources ? Lampa.Search.sources() : [];
                if (sources.length) {
                    sources.splice(2, 0, searchSource);
                } else {
                    Lampa.Search.addSource(searchSource);
                }
            }, 1500);
        };

        this.injectStyles = function() {
            if ($('#ai-assistant-styles').length) return;
            $('<style id="ai-assistant-styles">').prop('type', 'text/css').html(
                '.button--ai-assist { display: flex !important; align-items: center; justify-content: center; gap: 7px; } ' + 
                '.button--ai-assist svg { width: 1.6em; height: 1.6em; margin: 0 7px 0 0 !important; } ' +
                '.ai-viewer-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 5001; display: flex; align-items: center; justify-content: center; }' +
                /* Рамка підхоплює колір теми: спочатку динамічний HEX, потім CSS-змінну */
                '.ai-viewer-body { width: 80%; max-width: 800px; height: 75%; background: #121212; display: flex; flex-direction: column; border-radius: 12px; border: 1px solid var(--main-color, #333); overflow: hidden; }' +
                '.ai-header { padding: 15px 20px; background: #1f1f1f; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }' +
                '.ai-title { font-size: 1.4em; color: #fff; font-weight: bold; }' +
                '.ai-close-btn { width: 40px; height: 40px; background: #333; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; border: 2px solid transparent; }' +
                '.ai-close-btn.focus { border-color: #fff; background: var(--main-color, #444); }' +
                '.ai-content-scroll { flex: 1; overflow-y: auto; padding: 25px; color: #eee; font-size: 1.25em; line-height: 1.6; }' +
                '.ai-fact-block { margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; }' +
                '.ai-fact-title { color: var(--main-color, #0cf); font-weight: bold; display: block; margin-bottom: 8px; }' +
                '.ai-item-point { margin-bottom: 12px; padding-left: 20px; position: relative; }' +
                '.ai-item-point:before { content: "•"; position: absolute; left: 0; color: var(--main-color, #0cf); }'
            ).appendTo('head');
        };

        this.drawButton = function (render, card) {
            var container = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length || container.find('.button--ai-assist').length) return;
            var btn = $('<div class="full-start__button selector button--ai-assist">' + PLUGIN_ICON + '<span>AI Помічник</span></div>');
            btn.on('hover:enter click', function () { _this.openAiMenu(card); });
            var lastBtn = container.find('.selector').last();
            if (lastBtn.length) lastBtn.after(btn); else container.append(btn);
        };

        this.openAiMenu = function(card) {
            var currCtrl = Lampa.Controller.enabled().name;
            var items = [
                { title: 'Рекомендації (Схоже)', action: 'recommendations' },
                { title: 'Маловідомі факти', action: 'facts' },
                { title: 'Разом у кадрі', action: 'together' },
                { title: 'Стислий переказ', action: 'recap' },
                { title: 'По настрою', action: 'mood' }
            ];
            Lampa.Select.show({
                title: 'AI Помічник',
                items: items,
                onSelect: function (item) {
                    if (item.action === 'facts') _this.actionFacts(card, currCtrl);
                    else if (item.action === 'together') _this.actionTogether(card, currCtrl);
                    else if (item.action === 'recap') _this.actionRecapMenu(card, currCtrl);
                    else if (item.action === 'mood') _this.actionMoodMenu(card, currCtrl);
                    else if (item.action === 'recommendations') _this.actionRecommendations(card, currCtrl);
                },
                onBack: function () { Lampa.Controller.toggle(currCtrl); }
            });
        };

        this.showViewer = function(title, contentHtml, backAction) {
            // Динамічно підставляємо HEX-колір рамки, якщо він є в глобальній пам'яті плагіна тем
            var themeColor = window.look_dynamic_current_hex || 'var(--main-color, #333)';
            var viewer = $('<div class="ai-viewer-container"><div class="ai-viewer-body" style="border-color: ' + themeColor + '">' +
                                '<div class="ai-header"><div class="ai-title">' + title + '</div><div class="ai-close-btn selector">×</div></div>' +
                                '<div class="ai-content-scroll">' + contentHtml + '</div>' +
                            '</div></div>');
            $('body').append(viewer);
            var close = function() { viewer.remove(); backAction(); };
            viewer.find('.ai-close-btn').on('click hover:enter', close);
            Lampa.Controller.add('ai_viewer', {
                toggle: function() { Lampa.Controller.collectionSet(viewer); Lampa.Controller.collectionFocus(viewer.find('.ai-close-btn')[0], viewer); },
                up: function() { viewer.find('.ai-content-scroll').scrollTop(viewer.find('.ai-content-scroll').scrollTop() - 100); },
                down: function() { viewer.find('.ai-content-scroll').scrollTop(viewer.find('.ai-content-scroll').scrollTop() + 100); },
                back: close
            });
            Lampa.Controller.toggle('ai_viewer');
        };

        this.actionFacts = function(card, ctrl) {
            var t = card.original_title || card.original_name;
            _this.updateStatus('🤖 Шукаю факти...');
            var p = 'Give 5 facts about "' + t + '" in Ukrainian. JSON: [{"title":"..","text":".."}].';
            _this.askGemini(p, function(text) {
                _this.hideStatus();
                var data = _this.parseJsonSafe(text);
                if (!data) return;
                var html = '';
                data.forEach(function(f) { html += '<div class="ai-fact-block"><span class="ai-fact-title">'+f.title+'</span>'+f.text+'</div>'; });
                _this.showViewer('Факти: ' + (card.title || card.name), html, function() { _this.openAiMenu(card); });
            });
        };

        this.actionRecapMenu = function(card, ctrl) {
            var items = [];
            if (card.number_of_seasons > 1) {
                for (var i = 1; i < card.number_of_seasons; i++) items.push({ title: 'Сезон ' + i, type: 'season', value: i });
                _this.showRecapSelect(items, card, ctrl);
            } else if (card.belongs_to_collection) {
                _this.updateStatus('🤖 Збираю історію франшизи...');
                Lampa.Network.silent(Lampa.TMDB.api('collection/' + card.belongs_to_collection.id + '?api_key=' + Lampa.TMDB.key() + '&language=uk-UA'), function(res) {
                    _this.hideStatus();
                    (res.parts || []).forEach(function(p) { if (p.id != card.id) items.push({ title: p.title, type: 'movie', value: p.original_title }); });
                    if (items.length) _this.showRecapSelect(items, card, ctrl);
                    else Lampa.Noty.show('Попередніх частин не знайдено');
                });
            } else { Lampa.Noty.show('Немає переказів'); }
        };

        this.showRecapSelect = function(items, card, ctrl) {
            Lampa.Select.show({
                title: 'Що переказати?',
                items: items,
                onSelect: function(item) {
                    _this.updateStatus('🤖 Готую переказ...');
                    var p = 'Recap of ' + item.title + ' from ' + (card.original_title || card.original_name) + ' in Ukrainian. JSON: [{"point":".."}].';
                    _this.askGemini(p, function(text) {
                        _this.hideStatus();
                        var data = _this.parseJsonSafe(text);
                        var html = '';
                        (data || []).forEach(function(i) { html += '<div class="ai-item-point">' + i.point + '</div>'; });
                        _this.showViewer('Переказ: ' + item.title, html, function() { _this.showRecapSelect(items, card, ctrl); });
                    });
                },
                onBack: function() { _this.openAiMenu(card); }
            });
        };

        this.actionTogether = function(card, ctrl) {
            var method = (card.name || card.original_name) ? 'tv' : 'movie';
            var limit = Lampa.Storage.get('ai_result_count', '20');
            _this.updateStatus('🤖 Аналізую акторів...');
            Lampa.Network.silent(Lampa.TMDB.api(method + '/' + card.id + '/credits?api_key=' + Lampa.TMDB.key()), function(res) {
                var cast = res.cast || [];
                var top5 = cast.slice(0, 5).map(function(a) { return a.name; }).join(', ');
                var other10 = cast.slice(5, 15).map(function(a) { return a.name; }).join(', ');
                var p = 'Find ' + limit + ' movies/shows with: [' + top5 + '] (PRIMARY) and [' + other10 + ']. JSON: [{"uk":"..","orig":"..","year":Year}].';
                _this.fetchList(p, 'Разом у кадрі', function() { _this.openAiMenu(card); });
            });
        };

        this.actionMoodMenu = function(card, ctrl) {
            var items = [{ title: 'Візуальне задоволення', mood: 'Visual masterpiece' }, { title: 'Темна сторона', mood: 'Dark' }, { title: 'Посміятися', mood: 'Comedy' }, { title: 'Поплакати', mood: 'Drama' }];
            Lampa.Select.show({
                title: 'Настрій',
                items: items,
                onSelect: function(i) {
                    var limit = Lampa.Storage.get('ai_result_count', '20');
                    var p = 'Movies like "' + (card.original_title || card.original_name) + '" with mood: ' + i.mood + '. JSON: [{"uk":"..","orig":"..","year":Year}].';
                    _this.fetchList(p, i.title, function() { _this.actionMoodMenu(card, ctrl); });
                },
                onBack: function() { _this.openAiMenu(card); }
            });
        };

        this.actionRecommendations = function(card, ctrl) {
            var limit = Lampa.Storage.get('ai_result_count', '20');
            var p = 'Movies/TV similar to "' + (card.original_title || card.original_name) + '". JSON: [{"uk":"..","orig":"..","year":Year}].';
            _this.fetchList(p, 'Рекомендації', function() { _this.openAiMenu(card); });
        };

        this.askGemini = function(prompt, onSuccess) {
            var key = Lampa.Storage.get(STORAGE_KEY, '').split(',')[0];
            if (!key) return Lampa.Noty.show('API Ключ не задано');
            fetch('https://generativelanguage.googleapis.com/v1beta/models/'+TARGET_MODEL+':generateContent?key='+key.trim(), {
                method: "POST", body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }).then(function(r) { return r.json(); }).then(function(d) {
                if (d.candidates && d.candidates[0].content) onSuccess(d.candidates[0].content.parts[0].text);
            }).catch(function() { _this.hideStatus(); Lampa.Noty.show('Помилка мережі'); });
        };

        this.parseJsonSafe = function(text) {
            try {
                var clean = text.trim().replace(/^```json/gi, '').replace(/```$/g, '').trim();
                var s = clean.indexOf('['), e = clean.lastIndexOf(']');
                if (s === -1 || e === -1) return JSON.parse(clean);
                return JSON.parse(clean.substring(s, e + 1));
            } catch (e) { return null; }
        };

        this.processAiList = function(list, callback) {
            var results = [], processed = 0, ids = new Set();
            list.forEach(function(item) {
                var q = encodeURIComponent(item.orig || item.uk);
                Lampa.Network.silent(Lampa.TMDB.api('search/multi?query=' + q + '&api_key=' + Lampa.TMDB.key() + '&language=uk-UA'), function(res) {
                    processed++;
                    if (res.results && res.results[0]) {
                        var b = res.results[0];
                        if (b.media_type !== 'person' && !ids.has(b.id)) { ids.add(b.id); b.source = 'tmdb'; results.push(b); }
                    }
                    if (processed === list.length) callback(results);
                });
            });
        };

        this.fetchList = function(prompt, title, backAction) {
            _this.updateStatus('🤖 AI працює...');
            _this.askGemini(prompt, function(text) {
                var list = _this.parseJsonSafe(text);
                if (!list) { _this.hideStatus(); return; }
                _this.processAiList(list, function(results) {
                    _this.hideStatus();
                    if (!results.length) Lampa.Noty.show('Нічого не знайдено');
                    else {
                        window.ai_cached_results = results;
                        Lampa.Activity.push({ url: 'ai_list', title: title, component: 'category_full', source: 'ai_list_source', page: 1 });
                    }
                });
            });
        };

        this.setupSettings = function() {
            Lampa.SettingsApi.addComponent({ component: 'ai_assistant_cfg', name: 'AI Помічник', icon: PLUGIN_ICON });
            Lampa.SettingsApi.addParam({ component: 'ai_assistant_cfg', param: { name: 'ai_key_trigger', type: 'trigger' }, field: { name: 'API Ключ (Gemini)' }, onRender: function(item) {
                var val = Lampa.Storage.get(STORAGE_KEY, '');
                item.find('.settings-param__value').text(val ? 'Встановлено' : 'Немає').css('color', val ? '#4b5':'#f55');
                item.on('hover:enter', function() { Lampa.Input.edit({ title: 'Key', value: val, free: true }, function(v) { if(v){ Lampa.Storage.set(STORAGE_KEY, v.trim()); } }); });
            }});
            Lampa.SettingsApi.addParam({ component: 'ai_assistant_cfg', param: { name: 'ai_result_count', type: 'select', values: { '10':'10','20':'20','30':'30','50':'50' }, default: '20' }, field: { name: 'Кількість результатів' } });
        };

        this.updateStatus = function(text) {
            if (!statusBox) {
                $('body').append('<div id="ai-assist-status" style="position: fixed; bottom: 80px; left: 0; right: 0; text-align: center; z-index: 10001; pointer-events: none;"><div style="display: inline-block; background: rgba(0,0,0,0.9); padding: 15px 25px; border-radius: 50px; border: 1px solid var(--main-color, #333);"><span class="status-text" style="color: #fff; font-size: 1.2em;"></span></div></div>');
                statusBox = $('#ai-assist-status');
            }
            statusBox.find('.status-text').text(text);
            statusBox.fadeIn(200);
        };
        this.hideStatus = function() { if(statusBox) statusBox.fadeOut(500); };
    }

    if (!window.plugin_ai_assistant_instance) {
        window.plugin_ai_assistant_instance = new AIAssistantPlugin();
        if (window.appready) window.plugin_ai_assistant_instance.init();
        else Lampa.Listener.follow('app', function(e) { if (e.type == 'ready') window.plugin_ai_assistant_instance.init(); });
    }
})();
