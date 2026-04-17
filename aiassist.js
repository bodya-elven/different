(function () {
    'use strict';

    var PLUGIN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>';

    var pluginManifest = {
        type: 'other',
        version: 1.1,
        name: 'AI Assistant Pro',
        description: 'Інтелектуальний помічник: факти, перекази, рекомендації та аналіз фільмографій.',
        author: '@bodya_elven',
        icon: PLUGIN_ICON
    };

    var TARGET_MODEL = 'gemini-flash-lite-latest';
    var STORAGE_KEY = 'google_native_key_v1';
    
    window.ai_cached_results = [];

    // Реєстрація джерела для відображення карток
    if (window.Lampa && Lampa.Api) {
        Lampa.Api.sources.ai_list_source = {
            list: function(params, oncomplite) {
                oncomplite({ results: window.ai_cached_results, total_pages: 1 });
            }
        };
    }

    function AIAssistantPlugin() {
        var _this = this;

        this.init = function () {
            if (!Lampa.Listener) return;

            this.setupSettings();

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite' || e.type == 'complete') {
                    var card = e.data.movie;
                    if (card && card.id) {
                        var render = e.object.activity.render();
                        _this.drawButton(render, card);
                    }
                }
            });

            $('<style>').prop('type', 'text/css').html(
                '.button--ai-assist { display: flex !important; align-items: center; justify-content: center; gap: 7px; } ' + 
                '.button--ai-assist svg { width: 1.6em; height: 1.6em; margin: 0 !important; color: #0cf; } ' +
                '.ai-facts-list { padding: 10px 20px; font-size: 1.1em; line-height: 1.5; } ' +
                '.ai-facts-list b { color: #0cf; display: inline-block; margin-bottom: 5px; } ' +
                '.ai-facts-list .fact-item { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }'
            ).appendTo('head');
        };

        this.setupSettings = function() {
            Lampa.SettingsApi.addComponent({ component: 'ai_assistant_cfg', name: 'AI Асистент', icon: PLUGIN_ICON });
            Lampa.SettingsApi.addParam({ 
                component: 'ai_assistant_cfg', 
                param: { name: 'ai_key_trigger', type: 'trigger' }, 
                field: { name: 'API Ключ (Google Gemini)' }, 
                onRender: function(item) {
                    var val = Lampa.Storage.get(STORAGE_KEY, '');
                    item.find('.settings-param__value').text(val ? 'Встановлено' : 'Немає').css('color', val ? '#4b5':'#f55');
                    item.on('hover:enter', function() {
                        Lampa.Input.edit({ title: 'Google Gemini API Key', value: val, free: true, nosave: true }, function(v) { 
                            if(v){ Lampa.Storage.set(STORAGE_KEY, v.trim()); item.find('.settings-param__value').text('OK').css('color', '#4b5'); } 
                        });
                    });
                }
            });
        };

        // --- UI UTILS ---
        var statusBox = null;
        this.updateStatus = function(text) {
            if (!statusBox) {
                $('body').append('<div id="ai-assist-status" style="position: fixed; bottom: 80px; left: 0; right: 0; text-align: center; z-index: 10001; pointer-events: none;"><div style="display: inline-block; background: rgba(0,0,0,0.9); padding: 15px 25px; border-radius: 50px; border: 1px solid #0cf; box-shadow: 0 5px 20px rgba(0,0,0,0.8); backdrop-filter: blur(10px);"><span class="status-text" style="color: #fff; font-size: 1.2em; font-weight: 500;"></span></div></div>');
                statusBox = $('#ai-assist-status');
            }
            statusBox.find('.status-text').text(text);
            statusBox.fadeIn(200);
        };
        this.hideStatus = function() { if(statusBox) statusBox.fadeOut(500); };

        this.drawButton = function (render, card) {
            var container = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length || container.find('.button--ai-assist').length) return;
            var btn = $('<div class="full-start__button selector button--ai-assist">' + PLUGIN_ICON + '<span>AI Асистент</span></div>');
            btn.on('hover:enter click', function () { _this.openAiMenu(card, btn, render); });
            var bookmarkBtn = container.find('.button--book, .button--like, .button--keywords').first();
            if (bookmarkBtn.length) bookmarkBtn.before(btn); else container.append(btn);
        };

        this.returnFocus = function(btnElement, renderContainer, prevController) {
            if (Lampa.Activity.active() && Lampa.Activity.active().activity) Lampa.Activity.active().activity.toggle();
            else if (prevController) Lampa.Controller.toggle(prevController);
            if (!Lampa.Platform.is('touch') && btnElement && renderContainer) Lampa.Controller.collectionFocus(btnElement[0], renderContainer[0]);
        };

        // --- MENUS ---
        this.openAiMenu = function(card, btnElement, renderContainer) {
            var currCtrl = Lampa.Controller.enabled().name;
            var items = [
                { title: 'Рекомендації (Схоже)', action: 'recommendations' },
                { title: 'Маловідомі факти', action: 'facts' },
                { title: 'Разом у кадрі', action: 'together' },
                { title: 'Стислий переказ', action: 'recap' },
                { title: 'По настрою', action: 'mood' }
            ];
            Lampa.Select.show({
                title: 'AI Асистент',
                items: items,
                onSelect: function (item) {
                    if (item.action === 'facts') _this.actionFacts(card, btnElement, renderContainer, currCtrl);
                    else if (item.action === 'together') _this.actionTogether(card, btnElement, renderContainer, currCtrl);
                    else if (item.action === 'recap') _this.actionRecapMenu(card, btnElement, renderContainer, currCtrl);
                    else if (item.action === 'mood') _this.actionMoodMenu(card, btnElement, renderContainer, currCtrl);
                    else if (item.action === 'recommendations') _this.actionRecommendations(card, btnElement, renderContainer, currCtrl);
                },
                onBack: function () { _this.returnFocus(btnElement, renderContainer, currCtrl); }
            });
        };

        // --- ACTIONS ---

        // 1. ФАКТИ (Виправлено Script Error)
        this.actionFacts = function(card, btn, render, ctrl) {
            var title = card.name || card.title || card.original_name || card.original_title;
            _this.updateStatus('🤖 Шукаю факти про "' + title + '"...');
            var prompt = 'Act as a movie expert. Write 5 interesting facts about "' + title + '" in Ukrainian. Return strictly a JSON array: [{"title": "Заголовок", "text": "Опис"}]. No markdown.';
            _this.askGemini(prompt, function(text) {
                _this.hideStatus();
                var facts = _this.parseJsonSafe(text);
                if (!facts) { Lampa.Noty.show('Помилка обробки AI'); return; }
                var html = $('<div class="ai-facts-list"></div>');
                facts.forEach(function(f) { html.append('<div class="fact-item"><b>'+f.title+'</b><br><span>'+f.text+'</span></div>'); });
                Lampa.Modal.show({ title: 'Факти: ' + title, html: html, size: 'large', onBack: function() { Lampa.Modal.close(); _this.returnFocus(btn, render, ctrl); } });
            }, function(err) { _this.hideStatus(); Lampa.Noty.show(err); });
        };

        // 2. РАЗОМ У КАДРІ (Пріоритезація акторів)
        this.actionTogether = function(card, btn, render, ctrl) {
            var method = (card.name || card.original_name) ? 'tv' : 'movie';
            _this.updateStatus('🤖 Аналізую акторський склад...');
            // Отримуємо акторів з TMDB, якщо їх немає в картці
            Lampa.Network.silent(Lampa.TMDB.api(method + '/' + card.id + '/credits?api_key=' + Lampa.TMDB.key()), function(res) {
                var cast = res.cast || [];
                if (cast.length < 2) { _this.hideStatus(); Lampa.Noty.show('Мало даних про акторів'); return; }
                var top5 = cast.slice(0, 5).map(function(a) { return a.name; }).join(', ');
                var other10 = cast.slice(5, 15).map(function(a) { return a.name; }).join(', ');
                var prompt = 'Actors: [' + top5 + '] (PRIORITY) and [' + other10 + ']. Find 15 movies/TV shows where at least 2 of these actors work together. Prioritize those with PRIORITY actors. Return JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}].';
                _this.fetchList(prompt, 'Разом у кадрі', btn, render, ctrl);
            });
        };

        // 3. СТИСЛИЙ ПЕРЕКАЗ (Динамічне меню)
        this.actionRecapMenu = function(card, btn, render, ctrl) {
            var items = [];
            var title = card.name || card.title || card.original_name || card.original_title;

            // Для серіалів
            if (card.number_of_seasons && card.number_of_seasons > 1) {
                for (var i = 1; i < card.number_of_seasons; i++) {
                    items.push({ title: 'Сезон ' + i, type: 'season', value: i });
                }
            } 
            // Для фільмів у колекції
            else if (card.belongs_to_collection) {
                _this.updateStatus('🤖 Шукаю частини франшизи...');
                Lampa.Network.silent(Lampa.TMDB.api('collection/' + card.belongs_to_collection.id + '?api_key=' + Lampa.TMDB.key() + '&language=uk-UA'), function(res) {
                    var parts = res.parts || [];
                    parts.forEach(function(p) {
                        if (p.id != card.id) items.push({ title: (p.title || p.name), type: 'movie', value: p.title || p.original_title });
                    });
                    _this.showRecapSelect(items, title, btn, render, ctrl);
                    _this.hideStatus();
                });
                return;
            }

            if (items.length === 0) { Lampa.Noty.show('Немає попередніх частин/сезонів'); return; }
            _this.showRecapSelect(items, title, btn, render, ctrl);
        };

        this.showRecapSelect = function(items, currentTitle, btn, render, ctrl) {
            Lampa.Select.show({
                title: 'Що переказати?',
                items: items,
                onSelect: function(item) {
                    var target = item.type === 'season' ? item.title : '"' + item.value + '"';
                    var prompt = 'I am watching "' + currentTitle + '". Give me a brief spoiler-filled recap of ' + target + ' in Ukrainian. 5-7 key plot points. Return JSON array: [{"point": "Опис події"}].';
                    _this.updateStatus('🤖 Готую переказ...');
                    _this.askGemini(prompt, function(text) {
                        _this.hideStatus();
                        var data = _this.parseJsonSafe(text);
                        if(!data) return;
                        var html = $('<div class="ai-facts-list"></div>');
                        data.forEach(function(p) { html.append('<div class="fact-item">• ' + p.point + '</div>'); });
                        Lampa.Modal.show({ title: 'Переказ: ' + item.title, html: html, size: 'large', onBack: function() { Lampa.Modal.close(); _this.returnFocus(btn, render, ctrl); } });
                    });
                },
                onBack: function() { _this.openAiMenu(card, btn, render); }
            });
        };

        // 4. НАСТРІЙ (Розширено)
        this.actionMoodMenu = function(card, btn, render, ctrl) {
            var items = [
                { title: 'Візуальне задоволення', mood: 'Visual masterpiece, stunning cinematography, unique art style' },
                { title: 'Темна сторона', mood: 'Dark atmosphere, anti-heroes, tragic or non-traditional ending' },
                { title: 'Посміятися', mood: 'Comedy, lighthearted, funny' },
                { title: 'Поплакати', mood: 'Emotional drama, tearjerker' }
            ];
            Lampa.Select.show({
                title: 'Настрій',
                items: items,
                onSelect: function(i) {
                    var t = card.original_title || card.original_name;
                    var prompt = 'Suggest 20 movies like "' + t + '" that match mood: ' + i.mood + '. Return JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}].';
                    _this.fetchList(prompt, i.title, btn, render, ctrl);
                },
                onBack: function() { _this.openAiMenu(card, btn, render); }
            });
        };

        this.actionRecommendations = function(card, btn, render, ctrl) {
            var t = card.original_title || card.original_name;
            var prompt = 'Suggest 20 movies/TV series similar to "' + t + '" in vibe and themes. Return JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}].';
            _this.fetchList(prompt, 'Рекомендації', btn, render, ctrl);
        };

        // --- CORE LOGIC ---

        this.askGemini = function(prompt, onSuccess, onError) {
            var key = Lampa.Storage.get(STORAGE_KEY, '').split(',')[0];
            if (!key) return Lampa.Noty.show('Відсутній API ключ');
            var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + TARGET_MODEL + ':generateContent?key=' + key.trim();
            fetch(url, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) })
            .then(function(r) { return r.json().then(function(d) { if (!r.ok) throw new Error(d.error ? d.error.message : r.status); return d; }); })
            .then(function(d) { if (d.candidates && d.candidates[0].content) onSuccess(d.candidates[0].content.parts[0].text); else throw new Error('Empty response'); })
            .catch(function(e) { if(onError) onError('API Error: ' + e.message); });
        };

        this.parseJsonSafe = function(text) {
            try {
                var clean = text.trim().replace(/^```json/gi, '').replace(/```$/g, '').trim();
                var s = clean.indexOf('['), e = clean.lastIndexOf(']');
                return (s !== -1 && e !== -1) ? JSON.parse(clean.substring(s, e + 1)) : JSON.parse(clean);
            } catch (e) { console.log('Parse error', e, text); return null; }
        };

        this.fetchList = function(prompt, title, btn, render, ctrl) {
            _this.updateStatus('🤖 AI думає...');
            _this.askGemini(prompt, function(text) {
                var list = _this.parseJsonSafe(text);
                if (!list) { _this.hideStatus(); return; }
                _this.updateStatus('🤖 Шукаю в TMDB (0/' + list.length + ')...');
                var results = [], processed = 0;
                list.forEach(function(item) {
                    var q = encodeURIComponent(item.orig || item.uk);
                    Lampa.Network.silent(Lampa.TMDB.api('search/multi?query=' + q + '&api_key=' + Lampa.TMDB.key() + '&language=uk-UA'), function(res) {
                        processed++;
                        if (res.results && res.results[0]) {
                            var b = res.results[0];
                            if (b.media_type !== 'person') {
                                b.source = 'tmdb';
                                results.push(b);
                            }
                        }
                        _this.updateStatus('🤖 TMDB: ' + results.length + ' знайдено (' + processed + '/' + list.length + ')');
                        if (processed === list.length) {
                            _this.hideStatus();
                            if (results.length === 0) Lampa.Noty.show('Нічого не знайдено в TMDB');
                            else {
                                window.ai_cached_results = results;
                                Lampa.Activity.push({ url: 'ai_list', title: title, component: 'category_full', source: 'ai_list_source', page: 1 });
                            }
                        }
                    });
                });
            }, function(err) { _this.hideStatus(); Lampa.Noty.show(err); });
        };
    }

    if (!window.plugin_ai_assistant_instance) {
        window.plugin_ai_assistant_instance = new AIAssistantPlugin();
        if (window.appready) window.plugin_ai_assistant_instance.init();
        else Lampa.Listener.follow('app', function(e) { if (e.type == 'ready') window.plugin_ai_assistant_instance.init(); });
    }
})();
