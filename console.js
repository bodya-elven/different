(function () {
    'use strict';

    if (window.mobileConsoleInitialized) return;
    window.mobileConsoleInitialized = true;

    var logBuffer = [];
    var netBuffer = [];
    var uiReady = false;
    var counts = { logs: 0, errors: 0, network: 0 };

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatLongText(text) {
        if (!text) return 'null';
        var str = String(text);
        if (str.length > 250 || str.split('\n').length > 5) {
            return '<div class="lmc-collapsible collapsed">' + escapeHtml(str) + '</div>' +
                   '<div class="lmc-more-btn">Розгорнути <span>▼</span></div>';
        }
        return escapeHtml(str);
    }

    function updateCounter(type) {
        if (!uiReady) return;
        var tabId = type === 'log' || type === 'warn' || type === 'info' ? 'lmc-content-logs' : 
                    type === 'error' ? 'lmc-content-errors' : 
                    type === 'net' ? 'lmc-content-network' : '';
        
        if (tabId === 'lmc-content-logs') counts.logs++;
        if (type === 'error') { counts.errors++; counts.logs++; }
        if (type === 'net') counts.network++;

        $('.lmc-tab[data-target="lmc-content-logs"]').text('Console - ' + counts.logs);
        $('.lmc-tab[data-target="lmc-content-errors"]').text('Errors - ' + counts.errors);
        $('.lmc-tab[data-target="lmc-content-network"]').text('Network - ' + counts.network);
    }

    function applySearch() {
        var query = $('#lmc-search-input').val().toLowerCase();
        var $activeContent = $('.lmc-content.active');
        $activeContent.children('.lmc-row, .lmc-network-row').each(function () {
            var text = $(this).text().toLowerCase();
            $(this).toggle(text.indexOf(query) !== -1);
        });
        if (query.length > 0) $('#lmc-search-clear').show();
        else $('#lmc-search-clear').hide();
    }

    function showToast(text) {
        $('.lmc-toast').remove();
        var $toast = $('<div class="lmc-toast">' + text + '</div>').appendTo('body');
        setTimeout(function() { $toast.fadeOut(300, function() { $(this).remove(); }); }, 2000);
    }

    var originalLog = console.log, originalWarn = console.warn, originalError = console.error, originalInfo = console.info;

    window.addEventListener('error', function(event) {
        var msg = "Глобальна помилка: " + event.message;
        if (event.filename) msg += "\nФайл: " + event.filename + " (" + event.lineno + ":" + event.colno + ")";
        if (event.error && event.error.stack) msg += "\nСтек:\n" + event.error.stack;
        console.error(msg);
    }, true);

    window.addEventListener('unhandledrejection', function(event) {
        console.error("Необроблений Promise: " + (event.reason && event.reason.stack ? event.reason.stack : event.reason));
    });

    function processMessage(args) {
        var output = [];
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === 'object' && args[i] !== null) {
                try { output.push(JSON.stringify(args[i], null, 2)); } catch (e) { output.push('[Об\'єкт]'); }
            } else if (args[i] === undefined) output.push('undefined');
            else if (args[i] === null) output.push('null');
            else output.push(String(args[i]));
        }
        return output.join(' ');
    }

    function pushLogToUI(msg, type) {
        if (!uiReady) return;
        var cssClass = type === 'warn' ? 'lmc-warn' : type === 'error' ? 'lmc-error' : type === 'info' ? 'lmc-info' : '';
        var time = new Date().toLocaleTimeString('uk-UA', { hour12: false }).substring(0, 5);
        var formattedMsg = formatLongText(msg);
        var html = '<div class="lmc-row focusable ' + cssClass + '"><span class="lmc-time">' + time + ' - </span><span class="lmc-prefix">[' + type.toUpperCase() + ']</span> ' + formattedMsg + '</div>';

        var $logs = $('#lmc-content-logs');
        if ($logs.children().length > 300) $logs.children().first().remove();
        $(html).appendTo($logs);

        if (type === 'error') {
            var $errs = $('#lmc-content-errors');
            if ($errs.children().length > 100) $errs.children().first().remove();
            $errs.append(html);
        }
        updateCounter(type); applySearch();
    }

    function interceptLog(type, args) {
        var msg = processMessage(args);
        if (uiReady) pushLogToUI(msg, type); else logBuffer.push({ msg: msg, type: type });
    }

    console.log = function () { interceptLog('log', arguments); originalLog.apply(console, arguments); };
    console.warn = function () { interceptLog('warn', arguments); originalWarn.apply(console, arguments); };
    console.error = function () { interceptLog('error', arguments); originalError.apply(console, arguments); };
    console.info = function () { interceptLog('info', arguments); originalInfo.apply(console, arguments); };

    function pushNetToUI(method, url, status, responseText) {
        if (!uiReady) return;
        var $net = $('#lmc-content-network');
        
        if ($net.children().length > 150) {
            if ($net.hasClass('lmc-reversed')) $net.children().last().remove();
            else $net.children().first().remove();
        }

        var time = new Date().toLocaleTimeString('uk-UA', { hour12: false }).substring(0, 5);
        var statusClass = (status >= 200 && status < 300) ? 'lmc-net-200' : 'lmc-net-err';
        var formattedResponse = formatLongText(responseText || 'Немає відповіді');

        var html = '<div class="lmc-network-row focusable">' +
            '<div class="lmc-net-head"><span class="lmc-time">' + time + ' - </span><span class="lmc-net-status ' + statusClass + '">' + status + '</span> ' + 
            '<strong style="color:#20c997;">' + method + '</strong> <span class="lmc-net-url">' + escapeHtml(url) + '</span></div>' +
            '<div class="lmc-net-response">' + formattedResponse + '</div></div>';

        if ($net.hasClass('lmc-reversed')) $(html).prependTo($net);
        else $(html).appendTo($net);
        
        updateCounter('net'); applySearch();
    }

    function interceptNet(method, url, status, responseText) {
        if (uiReady) pushNetToUI(method, url, status, responseText); else netBuffer.push({ method: method, url: url, status: status, response: responseText });
    }

    var originalXhrOpen = window.XMLHttpRequest.prototype.open, originalXhrSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.open = function (method, url) { this._lmcMethod = method; this._lmcUrl = url; return originalXhrOpen.apply(this, arguments); };
    window.XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () { interceptNet(this._lmcMethod, this._lmcUrl, this.status, this.responseText); });
        this.addEventListener('error', function () { interceptNet(this._lmcMethod, this._lmcUrl, 'ERR', 'Network Error / CORS'); });
        return originalXhrSend.apply(this, arguments);
    };

    var originalFetch = window.fetch;
    window.fetch = function () {
        var url = typeof arguments[0] === 'object' ? arguments[0].url : arguments[0];
        var method = arguments[1] && arguments[1].method ? arguments[1].method : 'GET';
        return originalFetch.apply(this, arguments).then(function (response) {
            var clone = response.clone(); clone.text().then(function (text) { interceptNet(method, url, response.status, text); }); return response;
        }).catch(function (error) { interceptNet(method, url, 'ERR', error.message); throw error; });
    };

    function updateStorageAndCache() {
        var $storage = $('#lmc-content-storage').empty(), $cache = $('#lmc-content-cache').empty();
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i), val = localStorage.getItem(key);
            var html = '<div class="lmc-row lmc-flex-row focusable"><div style="flex:1; overflow:hidden;"><strong style="color:#20c997;">' + escapeHtml(key) + '</strong>: ' + formatLongText(val) + '</div><div class="lmc-del-btn focusable" data-key="' + escapeHtml(key) + '">Видалити</div></div>';
            if (key.indexOf('cache') > -1 || key.indexOf('hash') > -1 || key.indexOf('history') > -1) $cache.append(html); else $storage.append(html);
        }
    }

    function updateInfoTab() {
        var $info = $('#lmc-content-info').empty();
        
        // Підрахунок зайнятого місця в localStorage
        var lsTotal = 0;
        for (var x in localStorage) { 
            if (localStorage.hasOwnProperty(x)) { 
                lsTotal += ((localStorage[x].length + x.length) * 2); 
            } 
        }
        var lsSize = (lsTotal / 1024).toFixed(2) + ' KB';
        
        var activeComp = window.Lampa && Lampa.Activity && Lampa.Activity.active() ? Lampa.Activity.active().component : 'None';
        var activePlugs = window.Lampa && Lampa.Storage ? (Lampa.Storage.get('plugins')||[]).filter(function(p){return p.status;}).length : 0;
        var uptime = Math.round(performance.now() / 1000 / 60) + ' хв';

        var data = [
            { k: 'Source URL', v: window.location.href },
            { k: 'Lampa Version', v: window.Lampa && Lampa.Manifest ? Lampa.Manifest.app_version : 'Unknown' },
            { k: 'Platform', v: window.Lampa && Lampa.Platform ? Lampa.Platform.get() : 'Unknown' },
            { k: 'Local Storage Used', v: lsSize },
            { k: 'Active Plugins', v: activePlugs },
            { k: 'Current Page (Activity)', v: activeComp },
            { k: 'App Uptime', v: uptime },
            { k: 'Interface Size', v: window.innerWidth + 'x' + window.innerHeight },
            { k: 'Screen Size', v: window.screen.width + 'x' + window.screen.height },
            { k: 'Pixel Ratio', v: window.devicePixelRatio },
            { k: 'Is PWA', v: window.matchMedia('(display-mode: standalone)').matches ? 'true' : 'false' },
            { k: 'Is Touch', v: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ? 'true' : 'false' }
        ];
        data.forEach(function(item) { $info.append('<div class="lmc-row focusable"><strong>' + item.k + ':</strong> <span style="color:#aaa;">' + escapeHtml(item.v) + '</span></div>'); });
    }

    function updateExtensionsTab() {
        var $ext = $('#lmc-content-extensions').empty();
        $ext.append('<div class="lmc-section-title">Завантажені скрипти (DOM)</div>');
        $('script').each(function() { if (this.src) $ext.append('<div class="lmc-row focusable"><span style="color:#aaa;">' + escapeHtml(this.src) + '</span></div>'); });
        if (window.Lampa && Lampa.Storage) {
            $ext.append('<div class="lmc-section-title" style="margin-top:15px;">Встановлені плагіни (Storage)</div>');
            var plugins = Lampa.Storage.get('plugins') || [];
            plugins.forEach(function(p) {
                var stat = p.status ? '<span style="color:#20c997;">[ON]</span>' : '<span style="color:#f44336;">[OFF]</span>';
                $ext.append('<div class="lmc-row focusable">' + stat + ' <strong>' + escapeHtml(p.name || 'Без назви') + '</strong><br><span style="color:#888;">' + escapeHtml(p.url) + '</span></div>');
            });
        }
    }
    function initUI() {
        if (uiReady) return;

        var css = `
            /* Іконка з правильним viewBox розміром */
            .lmc-head-btn { padding: 0 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.8; transition: opacity 0.3s; }
            .lmc-head-btn:hover, .lmc-head-btn.focus { opacity: 1; outline: 2px solid #20c997; background: rgba(32, 201, 151, 0.1); border-radius: 6px; }
            .lmc-head-btn svg { width: 1.6em; height: 1.6em; stroke: #fff; fill: none; display: block; }

            #lampa-mob-console-window { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100vh; height: 100dvh; background: #121212; z-index: 9999999; flex-direction: column; font-family: monospace; color: #e0e0e0; }
            #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 12px 16px; background: #1e1e1e; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; }
            
            #lmc-search-bar { padding: 10px 16px; background: #181818; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; display: flex; align-items: center; }
            #lmc-search-input { flex: 1; background: #242424; color: #fff; border: 1px solid transparent; padding: 10px 35px 10px 12px; border-radius: 6px; outline: none; font-family: inherit; font-size: 14px; box-sizing: border-box; margin-right: 10px; }
            #lmc-search-input:focus, #lmc-search-input.focus { border-color: #20c997; background: #2a2a2a; }
            #lmc-search-clear { position: absolute; right: 85px; top: 18px; color: #888; font-size: 18px; cursor: pointer; display: none; font-weight: bold; width: 20px; height: 20px; text-align: center; line-height: 18px; }
            #lmc-clear-logs-btn { padding: 8px 12px; background: #242424; border-radius: 6px; font-size: 11px; cursor: pointer; color: #aaa; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.1); }
            #lmc-clear-logs-btn.focus { border-color: #f44336; color: #f44336; }

            #lampa-mob-console-tabs { display: flex; background: #121212; overflow-x: auto; white-space: nowrap; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
            #lampa-mob-console-tabs::-webkit-scrollbar { display: none; }
            .lmc-tab { padding: 8px 14px; background: #1e1e1e; border-radius: 6px; margin-right: 8px; text-align: center; color: #aaa; font-size: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; user-select: none; }
            .lmc-tab.active { background: rgba(32, 201, 151, 0.1); color: #20c997; border-color: #20c997; }
            .lmc-tab.focus { outline: 2px solid #fff; }

            .lmc-content { display: none; flex: 1; overflow-y: auto; padding: 10px 16px; font-size: 12px; word-wrap: break-word; white-space: pre-wrap; overscroll-behavior: contain; padding-bottom: 40px; flex-direction: column; }
            .lmc-content.active { display: flex; }

            .lmc-action { padding: 6px 14px; background: #242424; border-radius: 6px; font-size: 13px; cursor: pointer; color: #ddd; }
            .lmc-action.focus { background: #20c997; color: #000; }
            
            .lmc-row { margin-bottom: 0; padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); user-select: none; -webkit-user-select: none; cursor: pointer; transition: background 0.2s; border-radius: 4px; }
            .lmc-row:hover { background: rgba(255,255,255,0.03); }
            .lmc-row.focus, .lmc-network-row.focus { outline: 2px solid #20c997; background: rgba(32, 201, 151, 0.05); }
            
            .lmc-time { color: #666; font-size: 11px; }
            .lmc-prefix { color: #aaa; font-size: 11px; margin-right: 5px; font-weight: bold; }
            .lmc-warn .lmc-prefix { color: #ffc107; }
            .lmc-error .lmc-prefix { color: #f44336; }
            .lmc-info .lmc-prefix { color: #03a9f4; }
            
            .lmc-collapsible { overflow: hidden; pointer-events: none; }
            .lmc-collapsible.collapsed { max-height: 65px; position: relative; }
            .lmc-collapsible.collapsed::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 25px; background: linear-gradient(to bottom, rgba(18,18,18,0), rgba(18,18,18,1)); }
            .lmc-more-btn { color: #888; font-size: 11px; margin-top: 6px; font-weight: bold; display: inline-block; padding: 4px 8px; background: #1e1e1e; border-radius: 4px; border: 1px solid #333; pointer-events: none; }
            
            .lmc-network-row { margin-bottom: 0; padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); user-select: none; cursor: pointer; transition: background 0.2s; border-radius: 4px; }
            .lmc-network-row:hover { background: rgba(255,255,255,0.03); }
            .lmc-net-head { margin-bottom: 6px; pointer-events: none; }
            .lmc-net-status { font-weight: bold; font-size: 11px; color: #aaa; margin-right: 5px; }
            .lmc-net-200 { color: #4caf50; }
            .lmc-net-err { color: #f44336; }
            .lmc-net-url { color: #aaa; word-break: break-all; margin-left: 6px; }
            .lmc-net-response { color: #888; font-size: 11px; background: #181818; padding: 8px; border-radius: 6px; border: 1px solid #242424; pointer-events: none; }

            .lmc-flex-row { display: flex; justify-content: space-between; align-items: flex-start; }
            /* Оновлені, маленькі кнопки Видалити */
            .lmc-del-btn { background: rgba(244, 67, 54, 0.1); color: #f44336; padding: 4px 8px; border-radius: 4px; font-size: 9px; margin-left: 10px; cursor: pointer; border: 1px solid rgba(244, 67, 54, 0.3); z-index: 2; }
            .lmc-del-btn.focus { outline: 2px solid #fff; background: #f44336; color: #fff; }
            .lmc-section-title { font-weight: bold; color: #fff; padding: 10px 0 5px 0; border-bottom: 1px solid #333; margin-bottom: 5px; text-transform: uppercase; font-size: 11px; }

            .lmc-toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: #20c997; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; z-index: 99999999; box-shadow: 0 4px 15px rgba(32, 201, 151, 0.3); pointer-events: none; }
        `;
        $('<style>').text(css).appendTo('head');

        $('body').append(`
            <div id="lampa-mob-console-window">
                <div id="lampa-mob-console-header">
                    <span style="font-weight:bold; font-size: 18px;">Console</span>
                    <div id="lampa-mob-console-close" class="lmc-action focusable">Сховати</div>
                </div>
                <div id="lmc-search-bar">
                    <input type="text" id="lmc-search-input" class="focusable" placeholder="Пошук...">
                    <div id="lmc-search-clear">×</div>
                    <div id="lmc-clear-logs-btn" class="focusable">Очистити</div>
                </div>
                <div id="lampa-mob-console-tabs">
                    <div class="lmc-tab focusable active" data-target="lmc-content-logs">Console - 0</div>
                    <div class="lmc-tab focusable" data-target="lmc-content-errors">Errors - 0</div>
                    <div class="lmc-tab focusable" data-target="lmc-content-network">Network - 0</div>
                    <div class="lmc-tab focusable" data-target="lmc-content-info">Info</div>
                    <div class="lmc-tab focusable" data-target="lmc-content-extensions">Extensions</div>
                    <div class="lmc-tab focusable" data-target="lmc-content-cache">Cache</div>
                    <div class="lmc-tab focusable" data-target="lmc-content-storage">Storage</div>
                </div>
                <div id="lmc-content-logs" class="lmc-content active"></div>
                <div id="lmc-content-errors" class="lmc-content"></div>
                <div id="lmc-content-network" class="lmc-content"></div>
                <div id="lmc-content-info" class="lmc-content"></div>
                <div id="lmc-content-extensions" class="lmc-content"></div>
                <div id="lmc-content-cache" class="lmc-content"></div>
                <div id="lmc-content-storage" class="lmc-content"></div>
            </div>
        `);

        uiReady = true;

        logBuffer.forEach(function (item) { pushLogToUI(item.msg, item.type); }); logBuffer = [];
        netBuffer.forEach(function (item) { pushNetToUI(item.method, item.url, item.status, item.response); }); netBuffer = [];

        function injectHeaderBtn() {
            if ($('#lmc-head-btn-wrap').length) return; 
            
            // Іконка з обрізаним viewBox, щоб вона займала весь доступний простір
            var iconSvg = '<svg viewBox="2 2 20 20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
                          '<path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" stroke-width="2"/>' +
                          '<path d="M4 9h16" stroke-width="2"/>' +
                          '<path d="M8 13l2 2l-2 2" stroke-width="2"/>' +
                          '<path d="M12 17h4" stroke-width="2"/>' +
                          '</svg>';
            var btnHtml = '<div id="lmc-head-btn-wrap" class="head__action lmc-head-btn focusable" title="Console">' + iconSvg + '</div>';
            
            var $actions = $('.head__actions');
            if ($actions.length) {
                var $reloadBtn = $actions.find('.open--reload, [data-action="reload"]').first();
                if ($reloadBtn.length) $reloadBtn.before(btnHtml); else $actions.append(btnHtml);
            }
            $('#lmc-head-btn-wrap').on('click', function() { $('#lampa-mob-console-window').css('display', 'flex'); });
        }
        
        setInterval(injectHeaderBtn, 1000);
        injectHeaderBtn();

        $('#lampa-mob-console-close').on('click', function () { 
            $('#lampa-mob-console-window').hide(); 
        });

        window.addEventListener('keydown', function(e) {
            if ($('#lampa-mob-console-window').is(':visible')) {
                if (e.keyCode === 27 || e.keyCode === 8 || e.keyCode === 10009 || e.keyCode === 461) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    $('#lampa-mob-console-window').hide();
                }
            }
        }, true);

        // Очищення перенесено в панель пошуку
        $('#lmc-clear-logs-btn').on('click', function () { 
            var activeTab = $('.lmc-content.active').attr('id');
            if(activeTab === 'lmc-content-storage' || activeTab === 'lmc-content-cache' || activeTab === 'lmc-content-info' || activeTab === 'lmc-content-extensions') {
                showToast("Тут не можна очистити все одразу");
            } else {
                $('#' + activeTab).empty();
                if (activeTab === 'lmc-content-logs') { counts.logs = 0; updateCounter('log'); }
                if (activeTab === 'lmc-content-errors') { counts.errors = 0; updateCounter('error'); }
                if (activeTab === 'lmc-content-network') { counts.network = 0; updateCounter('net'); }
            }
        });
        
        $('.lmc-tab').on('click', function () {
            var target = $(this).attr('data-target');
            
            if ($(this).hasClass('active')) {
                if (target === 'lmc-content-network') {
                    var $content = $('#' + target);
                    $content.toggleClass('lmc-reversed');
                    
                    var children = $content.children('.lmc-network-row').get();
                    $content.append(children.reverse());
                    $content.scrollTop(0); 
                    
                    showToast($content.hasClass('lmc-reversed') ? "Нові зверху" : "Старі зверху");
                }
                return;
            }

            $('.lmc-tab').removeClass('active');
            $('.lmc-content').removeClass('active');
            
            $(this).addClass('active');
            $('#' + target).addClass('active');

            if (target === 'lmc-content-storage' || target === 'lmc-content-cache') updateStorageAndCache();
            if (target === 'lmc-content-info') updateInfoTab();
            if (target === 'lmc-content-extensions') updateExtensionsTab();
            
            applySearch();
        });

        $('#lmc-search-input').on('keydown keyup keypress', function(e) { e.stopPropagation(); });
        $('#lmc-search-input').on('input', applySearch);
        $('#lmc-search-clear').on('click', function() { $('#lmc-search-input').val('').trigger('input'); });

        $(document).on('click', '.lmc-row, .lmc-network-row', function(e) {
            if ($(e.target).hasClass('lmc-del-btn')) return;
            var $collapsible = $(this).find('.lmc-collapsible');
            if ($collapsible.length) {
                var isCollapsed = $collapsible.hasClass('collapsed');
                $collapsible.toggleClass('collapsed');
                var $btn = $(this).find('.lmc-more-btn');
                $btn.html(isCollapsed ? 'Згорнути <span>▲</span>' : 'Розгорнути <span>▼</span>');
            }
        });

        $(document).on('keydown', '.focusable', function(e) {
            if (e.keyCode === 13) { $(this).click(); e.preventDefault(); }
        });

        $(document).on('click', '.lmc-del-btn', function(e) {
            e.stopPropagation(); 
            var key = $(this).attr('data-key');
            localStorage.removeItem(key);
            $(this).closest('.lmc-row').remove();
            showToast("Видалено: " + key);
        });

        var pressTimer;
        $(document).on('touchstart mousedown', '.lmc-row, .lmc-network-row', function(e) {
            if ($(e.target).hasClass('lmc-del-btn')) return;
            var $row = $(this);
            pressTimer = window.setTimeout(function() {
                var clone = $row.clone();
                clone.find('.lmc-more-btn, .lmc-del-btn').remove();
                var textToCopy = clone.text().trim();
                var textarea = document.createElement("textarea");
                textarea.value = textToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                try { document.execCommand("copy"); showToast("Скопійовано"); } 
                catch (err) { showToast("Помилка копіювання"); }
                document.body.removeChild(textarea);
            }, 600);
        }).on('touchend touchmove mouseup mouseleave', function() {
            clearTimeout(pressTimer);
        });
    }

    var checkReady = setInterval(function () {
        if (window.appready || document.querySelector('.app') || document.body) {
            clearInterval(checkReady);
            setTimeout(initUI, 500);
        }
    }, 200);

})();
