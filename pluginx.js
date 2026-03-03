(function () {
    'use strict';

    var PORNO365_DOMAIN = 'https://w.porno365.gold'; 
    var LENKINO_DOMAIN = 'https://wes.lenkino.adult';

    function startPlugin() {
        if (window.pluginx_ready) return;
        window.pluginx_ready = true;

        var css = '<style>' +
            '.one-column-style { padding: 0 !important; }' +
            '@media screen and (max-width: 580px) {' +
                '.one-column-style .card { width: 100% !important; margin-bottom: 10px !important; padding: 0 5px !important; }' +
                '.one-column-style.is-grid-cat .card, .one-column-style.is-models-grid .card { width: 50% !important; }' + 
            '}' +
            '@media screen and (min-width: 581px) {' +
                '.one-column-style .card { width: 25% !important; margin-bottom: 15px !important; padding: 0 8px !important; }' +
                '.one-column-style.is-grid-cat .card, .one-column-style.is-models-grid .card { width: 16.666% !important; }' + 
            '}' +
            '.one-column-style .card__view { padding-bottom: 56.25% !important; border-radius: 12px !important; overflow: hidden !important; }' +
            '.one-column-style.is-grid-cat .card__view { padding-bottom: 80% !important; background: #ffffff !important; }' + 
            '.one-column-style.is-models-grid .card__view { padding-bottom: 150% !important; background: #ffffff !important; }' + 
            '.one-column-style .card__img { object-fit: cover !important; border-radius: 12px !important; z-index: 2; position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 1 !important; }' +
            
            /* Налаштування відображення назви у 3 рядки */
            '.one-column-style .card__title { ' +
                'display: -webkit-box !important; -webkit-line-clamp: 3 !important; -webkit-box-orient: vertical !important; ' +
                'overflow: hidden !important; white-space: normal !important; text-align: left !important; ' +
                'line-height: 1.2 !important; max-height: 3.6em !important; padding-top: 2px !important; margin-top: 0 !important; text-overflow: ellipsis !important; ' +
            '}' +
            '.one-column-style.is-grid-cat .card__title, .one-column-style.is-models-grid .card__title { -webkit-line-clamp: 2 !important; text-align: center !important; font-weight: normal !important; margin-top: 5px !important; }' +
            '.one-column-style .card__age, .one-column-style .card__textbox { display: none !important; }' +
            
            '.pluginx-sep { font-size: 0.85em !important; opacity: 0.5; pointer-events: none !important; text-align: left !important; padding: 10px 20px 5px 20px !important; text-transform: uppercase; letter-spacing: 1px; color: #fff; border: none !important; background: transparent !important; box-shadow: none !important; }' +
            '.pluginx-filter-btn { order: -1 !important; margin-right: auto !important; }' +
            '.menu__item[data-action="pluginx"] { display: flex !important; }' +
            '</style>';
        $('body').append(css);

        var previewTimeout;
        var activePreviewNode;

        function hidePreview() {
            clearTimeout(previewTimeout);
            if (activePreviewNode) {
                var vid = activePreviewNode.find('video')[0];
                if (vid) { try { vid.pause(); } catch(e) {} vid.removeAttribute('src'); vid.load(); }
                activePreviewNode.remove(); activePreviewNode = null;
            }
        }

        function showPreview(target, src) {
            var previewContainer = $('<div class="sisi-video-preview" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;overflow:hidden;z-index:4;background:#000;"><video autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video></div>');
            var videoEl = previewContainer.find('video')[0];
            videoEl.src = src;
            target.find('.card__view').append(previewContainer);
            activePreviewNode = previewContainer;
            var p = videoEl.play(); if (p !== undefined) p.catch(function(){});
        }

        // Функція для додавання значків без примусового обрізання тексту
        function formatTitle(name, info, symbol) {
            if (!info) return name;
            var cleanInfo = info.replace(/[^0-9:]/g, ''); // для часу або кількості
            return name + ' ' + symbol + ' ' + cleanInfo;
        }

        function CustomCatalog(object) {
            var comp = new Lampa.InteractionCategory(object);
            var currentSite = object.site || 'porno365';

            function smartRequest(url, onSuccess, onError) {
                var network = new Lampa.Reguest();
                var headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" };
                var isAndroid = typeof window !== 'undefined' && window.Lampa && window.Lampa.Platform && window.Lampa.Platform.is('android');
                if (isAndroid) network.native(url, function (res) { onSuccess(typeof res === 'object' ? JSON.stringify(res) : res); }, function (err) { if (onError) onError(err); }, false, { dataType: 'text', headers: headers, timeout: 10000 });
                else network.silent(url, onSuccess, function (err) { if (onError) onError(err); }, false, { dataType: 'text', headers: headers, timeout: 10000 });
            }
            function parseCards365(doc, siteBaseUrl, isRelated) {
                var sel = isRelated ? '.related .related_video' : 'li.video_block, li.trailer';
                var elements = doc.querySelectorAll(sel), results = [];
                for (var i = 0; i < elements.length; i++) {
                    var el = elements[i], linkEl = el.querySelector('a.image'), titleEl = el.querySelector('a.image p, .title'), imgEl = el.querySelector('img'), timeEl = el.querySelector('.duration');
                    var vP = el.querySelector('video#videoPreview') || el.querySelector('video'); 
                    
                    if (linkEl && titleEl) {
                        var img = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('src')) : '';
                        if (img && img.indexOf('//') === 0) img = 'https:' + img;
                        var vUrl = linkEl.getAttribute('href');
                        if (vUrl && vUrl.indexOf('http') !== 0) vUrl = siteBaseUrl + (vUrl.indexOf('/') === 0 ? '' : '/') + vUrl;
                        var pUrl = vP ? (vP.getAttribute('src') || vP.getAttribute('data-src') || '') : '';
                        if (pUrl && pUrl.indexOf('//') === 0) pUrl = 'https:' + pUrl;
                        
                        var name = titleEl.innerText.trim();
                        var time = timeEl ? timeEl.innerText.trim() : '';
                        
                        results.push({ name: formatTitle(name, time, '▶'), url: vUrl, picture: img, img: img, preview: pUrl });
                    }
                }
                return results;
            }

            function parseCardsLenkino(doc, siteBaseUrl, isStudios) {
                var results = [];
                var elements = [];
                if (isStudios) elements = doc.querySelectorAll('.itm-crd-spn, .itm-crd'); 
                else {
                    var listContainer = doc.querySelector('#list_videos_videos_list');
                    if (listContainer) elements = listContainer.querySelectorAll('.item');
                    else {
                        var allItems = doc.querySelectorAll('.item');
                        for(var k=0; k<allItems.length; k++) {
                            if(!allItems[k].closest('.sxn-top') && !allItems[k].classList.contains('itm-crd') && !allItems[k].classList.contains('itm-crd-spn')) elements.push(allItems[k]);
                        }
                    }
                }

                for (var i = 0; i < elements.length; i++) {
                    var el = elements[i];
                    var linkEl = el.querySelector(isStudios ? 'a.len_pucl' : 'a');
                    var titleEl = el.querySelector(isStudios ? '.itm-opt' : '.itm-tit'); 
                    var imgEl = el.querySelector('img.lzy') || el.querySelector('img');
                    var timeEl = el.querySelector(isStudios ? '.itm-opt li' : '.itm-dur');

                    if (linkEl) {
                        var name = isStudios ? (linkEl.getAttribute('title') || (imgEl ? imgEl.getAttribute('alt') : '') || linkEl.innerText.trim()) : (titleEl ? titleEl.innerText.trim() : linkEl.innerText.trim());
                        var img = imgEl ? (imgEl.getAttribute('data-srcset') || imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : '';
                        if (img && img.indexOf('//') === 0) img = 'https:' + img;
                        else if (img && img.indexOf('/') === 0) img = siteBaseUrl + img;

                        var vUrl = linkEl.getAttribute('href');
                        if (vUrl && vUrl.indexOf('http') !== 0) vUrl = siteBaseUrl + (vUrl.indexOf('/') === 0 ? '' : '/') + vUrl;
                        var pUrl = (!isStudios && imgEl) ? (imgEl.getAttribute('data-preview') || '') : '';
                        if (pUrl && pUrl.indexOf('//') === 0) pUrl = 'https:' + pUrl;
                        else if (pUrl && pUrl.indexOf('/') === 0) pUrl = siteBaseUrl + pUrl;

                        var infoText = isStudios && timeEl ? timeEl.innerText.trim() : (timeEl ? timeEl.innerText.trim() : '');
                        
                        if (name) {
                            var symbol = isStudios ? '☰' : '▶';
                            results.push({ name: formatTitle(name, infoText, symbol), url: vUrl, picture: img, img: img, is_grid: isStudios, preview: pUrl });
                        }
                    }
                }
                return results;
            }

            function parseCategories(doc, siteBaseUrl, siteType) {
                var results = [];
                var sel = (siteType === 'lenkino') ? '.grd-cat a' : '.categories-list-div a';
                var links = doc.querySelectorAll(sel);
                for (var i = 0; i < links.length; i++) {
                    var el = links[i], title = el.getAttribute('title') || el.innerText.trim(), href = el.getAttribute('href');
                    if (title.toLowerCase().indexOf('ai') !== -1 || title.toLowerCase().indexOf('extra') !== -1) continue;

                    var imgEl = el.querySelector('img'), img = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : '';
                    if (img && img.indexOf('//') === 0) img = 'https:' + img;
                    else if (img && img.indexOf('/') === 0) img = siteBaseUrl + img;

                    if (href && title) {
                        var vUrl = href.startsWith('http') ? href : siteBaseUrl + (href.startsWith('/') ? '' : '/') + href;
                        results.push({ name: title, url: vUrl, picture: img, img: img, is_grid: true });
                    }
                }
                return results;
            }

            function parseModels(doc, siteBaseUrl, siteType) {
                var results = [];
                if (siteType === 'lenkino') {
                    var all = doc.querySelectorAll('.item');
                    for (var i = 0; i < all.length; i++) {
                        var el = all[i]; if (!el.closest('.grd-mdl')) continue;
                        var linkEl = el.querySelector('a'), imgEl = el.querySelector('img'), titleEl = el.querySelector('.itm-tit'), countEl = el.querySelector('.itm-opt li');
                        if (linkEl && imgEl) {
                            var name = titleEl ? titleEl.innerText.trim() : (imgEl.getAttribute('alt') || 'Model');
                            var count = countEl ? countEl.innerText.trim() : '';
                            var img = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '';
                            if (img && img.indexOf('/') === 0) img = siteBaseUrl + img;
                            var vUrl = linkEl.getAttribute('href');
                            if (vUrl && vUrl.indexOf('http') !== 0) vUrl = siteBaseUrl + vUrl;
                            results.push({ name: formatTitle(name, count, '☰'), url: vUrl, picture: img, img: img, is_grid: true });
                        }
                    }
                } else {
                    var mEls = doc.querySelectorAll('.item_model');
                    for (var k = 0; k < mEls.length; k++) {
                        var elM = mEls[k], linkM = elM.querySelector('a'), nameM = elM.querySelector('.model_eng_name'), countM = elM.querySelector('.cnt_span'), imgM = elM.querySelector('img');
                        if (linkM && nameM) {
                            var vUrlM = linkM.getAttribute('href'); if (vUrlM && vUrlM.indexOf('http') !== 0) vUrlM = siteBaseUrl + vUrlM;
                            results.push({ name: formatTitle(nameM.innerText.trim(), countM ? countM.innerText.trim() : '', '☰'), url: vUrlM, picture: imgM ? imgM.getAttribute('src') : '', img: imgM ? imgM.getAttribute('src') : '', is_grid: true });
                        }
                    }
                }
                return results;
            }
            comp.cardRender = function (card, element, events) {
                // Відображення кількості відео для сіток (студії/моделі)
                if (element.is_grid && element.video_count) {
                    $(card).find('.card__title').after('<div class="studio-count">' + element.video_count + '</div>');
                }

                events.onEnter = function () {
                    hidePreview();
                    if (element.is_grid) {
                        Lampa.Activity.push({ url: element.url, title: element.name, component: 'pluginx_comp', site: currentSite, page: 1 });
                        return;
                    }
                    
                    smartRequest(element.url, function(html) {
                        var str = []; 
                        if (currentSite === 'lenkino') {
                            var u = html.match(/video_url:[\t ]+'([^']+)'/), a = html.match(/video_alt_url:[\t ]+'([^']+)'/);
                            if (u && u[1]) str.push({ title: 'Стандарт', url: u[1] });
                            if (a && a[1]) str.push({ title: 'Основний (HD)', url: a[1] });
                        } else {
                            var doc = new DOMParser().parseFromString(html, 'text/html'), q = doc.querySelectorAll('.quality_chooser a');
                            for (var j = 0; j < q.length; j++) if (q[j].getAttribute('href')) str.push({ title: q[j].innerText.trim(), url: q[j].getAttribute('href') });
                            if (str.length === 0) { var p = doc.querySelector('a.btn-play.play-video'); if (p && p.getAttribute('href')) str.push({ title: 'Оригінал', url: p.getAttribute('href') }); }
                        }
                        if (str.length > 0) {
                            var b = str[str.length - 1];
                            var playData = { title: element.name, url: b.url, quality: str };
                            if (currentSite === 'lenkino') {
                                playData.headers = {
                                    'Referer': 'https://wes.lenkino.adult/',
                                    'Origin': 'https://wes.lenkino.adult',
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
                                };
                            }
                            Lampa.Player.play(playData);
                            Lampa.Player.playlist([playData]);
                        }
                    });
                };

                // ВІДНОВЛЕНО: Меню "Дії" при утриманні кнопки OK або натисканні Menu
                events.onMenu = function () {
                    hidePreview();
                    smartRequest(element.url, function (html) {
                        var doc = new DOMParser().parseFromString(html, 'text/html'), menu = [];
                        var mEls = doc.querySelectorAll(currentSite === 'lenkino' ? '.grd-mdl a' : '.video-categories.video-models a');
                        for (var m = 0; m < mEls.length; m++) menu.push({ title: mEls[m].innerText.trim(), action: 'direct', url: mEls[m].getAttribute('href') });
                        
                        if (currentSite === 'lenkino') {
                            var sEls = doc.querySelectorAll('.vid-aut a, .itm-aut a, .grd-spn a');
                            for (var s = 0; s < sEls.length; s++) {
                                var sT = sEls[s].innerText.trim().replace(/\s+/g, ' ');
                                if (!menu.some(function(i) { return i.title === sT; }) && sT) menu.push({ title: sT, action: 'direct', url: sEls[s].getAttribute('href') });
                            }
                            menu.push({ title: 'Категорії', action: 'cats' }, { title: 'Схожі відео', action: 'sim', url: element.url });
                        } else {
                            menu.push({ title: 'Категорії', action: 'cats' }, { title: 'Теги', action: 'tags' }, { title: 'Схожі відео', action: 'sim', url: element.url });
                        }

                        Lampa.Select.show({ title: 'Дії', items: menu, onSelect: function (a) {
                            if (a.action === 'sim' || a.action === 'direct') Lampa.Activity.push({ url: a.url, title: a.title || 'Схожі', component: 'pluginx_comp', site: currentSite, page: 1, is_related: (a.action === 'sim') });
                            else {
                                var sel = (a.action === 'cats') ? (currentSite === 'lenkino' ? '.vid-cat a' : '.video-categories:not(.video-models) a') : '.video-tags a';
                                var subEls = doc.querySelectorAll(sel), sub = [];
                                for (var i = 0; i < subEls.length; i++) sub.push({ title: subEls[i].innerText.trim(), url: subEls[i].getAttribute('href') });
                                Lampa.Select.show({ title: a.title, items: sub, onSelect: function (it) { Lampa.Activity.push({ url: it.url, title: it.title, component: 'pluginx_comp', site: currentSite, page: 1 }); }, onBack: function () { events.onMenu(); } });
                            }
                        }, onBack: function () { Lampa.Controller.toggle('content'); } });
                    });
                };

                events.onFocus = function (t) {
                    hidePreview();
                    if (element.preview && !element.is_grid) {
                        previewTimeout = setTimeout(function () { showPreview($(t), element.preview); }, 1000);
                    }
                };
            };
            return comp;
        }

        Lampa.Component.add('pluginx_comp', CustomCatalog);

        (function() {
            var active_curr;
            var filter_btn = $('<div class="head__action head__settings selector pluginx-filter-btn"><svg height="36" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="35" height="33" rx="1.5" stroke="currentColor" stroke-width="3"></rect><rect x="7" y="8" width="24" height="3" rx="1.5" fill="currentColor"></rect><rect x="7" y="16" width="24" height="3" rx="1.5" fill="currentColor"></rect><rect x="7" y="25" width="24" height="3" rx="1.5" fill="currentColor"></rect><circle cx="13.5" cy="17.5" r="3.5" fill="currentColor"></circle><circle cx="23.5" cy="26.5" r="3.5" fill="currentColor"></circle><circle cx="21.5" cy="9.5" r="3.5" fill="currentColor"></circle></svg></div>');
            filter_btn.hide().on('hover:enter click', function() { if (active_curr && active_curr.activity) { var c = (window.Lampa.Manifest && window.Lampa.Manifest.app_digital >= 300) ? active_curr.activity.component : active_curr.activity.component(); if (c && c.filter) c.filter(); } });
            Lampa.Listener.follow('activity', function(e) { if (e.type == 'start') active_curr = e.object; setTimeout(function() { if (active_curr && active_curr.component !== 'pluginx_comp') filter_btn.hide(); }, 1000); if (e.type == 'start' && e.component == 'pluginx_comp') { if (!$('.head__actions').find('.pluginx-filter-btn').length) $('.head__actions').prepend(filter_btn); filter_btn.show(); active_curr = e.object; } });
        })();
    }

    function addMenu() {
        if (window.Lampa && window.Lampa.Storage) {
            var hiddenMenu = window.Lampa.Storage.get('menu_hide');
            if (hiddenMenu && Array.isArray(hiddenMenu)) {
                var idx = hiddenMenu.indexOf('pluginx');
                if (idx !== -1) { hiddenMenu.splice(idx, 1); window.Lampa.Storage.set('menu_hide', hiddenMenu); }
            }
        }
        var menu_list = $('.menu .menu__list').eq(0);
        if (menu_list.length && !menu_list.find('[data-action="pluginx"]').length) {
            var menu_item = $('<li class="menu__item selector" data-action="pluginx"><div class="menu__ico"><img src="https://bodya-elven.github.io/different/icons/pluginx.svg" width="24" height="24" style="filter: brightness(0) invert(1);" /></div><div class="menu__text">CatalogX</div></li>');
            menu_item.on('hover:enter', function () { Lampa.Select.show({ title: 'CatalogX', items: [{ title: 'Porno365', site: 'porno365' }, { title: 'Lenkino', site: 'lenkino' }], onSelect: function(a) { Lampa.Activity.push({ title: a.title, component: 'pluginx_comp', site: a.site, page: 1 }); }, onBack: function() { Lampa.Controller.toggle('menu'); } }); });
            var settings_item = menu_list.find('[data-action="settings"]'); if (settings_item.length) menu_item.insertBefore(settings_item); else menu_list.append(menu_item);
        }
    }

    if (window.Lampa) { startPlugin(); addMenu(); }
    Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') { startPlugin(); addMenu(); } });
})();
