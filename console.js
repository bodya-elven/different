(function () {
    'use strict';

    if (window.mobileConsoleInitialized) return;
    window.mobileConsoleInitialized = true;

    var logBuffer = [];
    var netBuffer = [];
    var uiReady = false;

    // Лічильники
    var counts = { logs: 0, errors: 0, network: 0 };

    // --- ДОПОМІЖНІ ФУНКЦІЇ ---
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
        if (type === 'error') { counts.errors++; counts.logs++; } // Помилки йдуть і в загальну
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
        var $toast = $('<div class="lmc-toast">' + text + '</div>').appendTo('body');
        setTimeout(function() { $toast.fadeOut(300, function() { $(this).remove(); }); }, 2000);
    }

    // --- ПЕРЕХОПЛЕННЯ CONSOLE ТА ПОМИЛОК ---
    var originalLog = console.log;
    var originalWarn = console.warn;
    var originalError = console.error;
    var originalInfo = console.info;

    window.addEventListener('error', function(event) {
        var msg = "Глобальна помилка: " + event.message;
        if (event.filename) msg += "\nФайл: " + event.filename + " (" + event.lineno + ":" + event.colno + ")";
        if (event.error && event.error.stack) msg += "\nСтек:\n" + event.error.stack;
        console.error(msg);
    }, true);

    window.addEventListener('unhandledrejection', function(event) {
        var reason = event.reason;
        console.error("Необроблений Promise: " + (reason && reason.stack ? reason.stack : reason));
    });

    function processMessage(args) {
        var output = [];
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === 'object' && args[i] !== null) {
                try { output.push(JSON.stringify(args[i], null, 2)); } 
                catch (e) { output.push('[Складний об\'єкт]'); }
            } else if (args[i] === undefined) { output.push('undefined');
            } else if (args[i] === null) { output.push('null');
            } else { output.push(String(args[i])); }
        }
        return output.join(' ');
    }

    function pushLogToUI(msg, type) {
        if (!uiReady) return;
        var cssClass = type === 'warn' ? 'lmc-warn' : type === 'error' ? 'lmc-error' : type === 'info' ? 'lmc-info' : '';
        
        var time = new Date().toLocaleTimeString('uk-UA', { hour12: false }).substring(0, 5);
        var formattedMsg = formatLongText(msg);
        var html = '<div class="lmc-row ' + cssClass + '"><span class="lmc-time">' + time + ' - </span>' + formattedMsg + '</div>';

        var $logs = $('#lmc-content-logs');
        if ($logs.children().length > 300) $logs.children().first().remove();
        $(html).appendTo($logs);

        if (type === 'error') {
            var $errs = $('#lmc-content-errors');
            if ($errs.children().length > 100) $errs.children().first().remove();
            $errs.append(html);
        }
        
        updateCounter(type);
        applySearch();
    }

    function interceptLog(type, args) {
        var msg = processMessage(args);
        if (uiReady) pushLogToUI(msg, type);
        else logBuffer.push({ msg: msg, type: type });
    }

    console.log = function () { interceptLog('log', arguments); originalLog.apply(console, arguments); };
    console.warn = function () { interceptLog('warn', arguments); originalWarn.apply(console, arguments); };
    console.error = function () { interceptLog('error', arguments); originalError.apply(console, arguments); };
    console.info = function () { interceptLog('info', arguments); originalInfo.apply(console, arguments); };

    // --- ПЕРЕХОПЛЕННЯ NETWORK ---
    function pushNetToUI(method, url, status, responseText) {
        if (!uiReady) return;
        var $net = $('#lmc-content-network');
        if ($net.length > 150) $net.children().first().remove();

        var time = new Date().toLocaleTimeString('uk-UA', { hour12: false }).substring(0, 5);
        var statusClass = (status >= 200 && status < 300) ? 'lmc-net-200' : 'lmc-net-err';
        var formattedResponse = formatLongText(responseText || 'Немає відповіді');

        var html = '<div class="lmc-network-row">' +
            '<div class="lmc-net-head"><span class="lmc-time">' + time + ' - </span><span class="lmc-net-status ' + statusClass + '">' + status + '</span> ' + 
            '<strong>' + method + '</strong> <span class="lmc-net-url">' + escapeHtml(url) + '</span></div>' +
            '<div class="lmc-net-response">' + formattedResponse + '</div>' +
            '</div>';

        $net.append(html);
        updateCounter('net');
        applySearch();
    }

    function interceptNet(method, url, status, responseText) {
        if (uiReady) pushNetToUI(method, url, status, responseText);
        else netBuffer.push({ method: method, url: url, status: status, response: responseText });
    }

    var originalXhrOpen = window.XMLHttpRequest.prototype.open;
    var originalXhrSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (method, url) {
        this._lmcMethod = method;
        this._lmcUrl = url;
        return originalXhrOpen.apply(this, arguments);
    };

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
            var clone = response.clone();
            clone.text().then(function (text) { interceptNet(method, url, response.status, text); });
            return response;
        }).catch(function (error) {
            interceptNet(method, url, 'ERR', error.message);
            throw error;
        });
    };

    // --- ОНОВЛЕННЯ ДИНАМІЧНИХ ВЛАДОК ---
    function updateStorageAndCache() {
        var $storage = $('#lmc-content-storage').empty();
        var $cache = $('#lmc-content-cache').empty();
        
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            var val = localStorage.getItem(key);
            
            var html = '<div class="lmc-row lmc-flex-row">' +
                       '<div style="flex:1; overflow:hidden;"><strong>' + escapeHtml(key) + '</strong>: ' + formatLongText(val) + '</div>' +
                       '<div class="lmc-del-btn" data-key="' + escapeHtml(key) + '">Видалити</div>' +
                       '</div>';
            
            // Якщо ключ схожий на кеш — кидаємо у вкладку Cache
            if (key.indexOf('cache') > -1 || key.indexOf('hash') > -1 || key.indexOf('history') > -1) {
                $cache.append(html);
            } else {
                $storage.append(html);
            }
        }
    }

    function updateInfoTab() {
        var $info = $('#lmc-content-info').empty();
        var data = [
            { k: 'Lampa Version', v: window.Lampa && Lampa.Manifest ? Lampa.Manifest.app_version : 'Unknown' },
            { k: 'Platform', v: window.Lampa && Lampa.Platform ? Lampa.Platform.get() : 'Unknown' },
            { k: 'User Agent', v: navigator.userAgent },
            { k: 'Screen Size', v: window.innerWidth + 'x' + window.innerHeight },
            { k: 'Pixel Ratio', v: window.devicePixelRatio },
            { k: 'Cookies Enabled', v: navigator.cookieEnabled }
        ];
        
        data.forEach(function(item) {
            $info.append('<div class="lmc-row"><strong>' + item.k + ':</strong> <span style="color:#aaa;">' + escapeHtml(item.v) + '</span></div>');
        });
    }

    function updateExtensionsTab() {
        var $ext = $('#lmc-content-extensions').empty();
        
        // Базові завантажені скрипти (DOM)
        $ext.append('<div class="lmc-section-title">Завантажені скрипти (DOM)</div>');
        $('script').each(function() {
            if (this.src) {
                $ext.append('<div class="lmc-row"><span style="color:#aaa;">' + escapeHtml(this.src) + '</span></div>');
            }
        });

        // Плагіни Lampa
        if (window.Lampa && Lampa.Storage) {
            $ext.append('<div class="lmc-section-title" style="margin-top:15px;">Встановлені плагіни (Storage)</div>');
            var plugins = Lampa.Storage.get('plugins') || [];
            plugins.forEach(function(p) {
                var stat = p.status ? '<span style="color:#4caf50;">[ON]</span>' : '<span style="color:#f44336;">[OFF]</span>';
                $ext.append('<div class="lmc-row">' + stat + ' <strong>' + escapeHtml(p.name || 'Без назви') + '</strong><br><span style="color:#888;">' + escapeHtml(p.url) + '</span></div>');
            });
        }
    }

    // --- ІНТЕРФЕЙС ТА ЛОГІКА ВІДКРИТТЯ/ЗАКРИТТЯ ---
    function openConsole() {
        $('#lampa-mob-console-window').css('display', 'flex');
        // Перехоплення кнопки Назад
        history.pushState({lmc_open: true}, "Console", null);
    }

    function closeConsole() {
        $('#lampa-mob-console-window').hide();
    }

    // Забираємо на себе обробку "Назад", щоб Lampa не реагувала
    window.addEventListener('popstate', function(e) {
        if ($('#lampa-mob-console-window').is(':visible')) {
            e.stopImmediatePropagation(); // Блокуємо подію для інших скриптів (Lampa)
            closeConsole();
        }
    }, true); // true = Capture phase (спрацює найпершим)

    function initUI() {
        if (uiReady) return;

        var css = `
            /* Нова біла іконка без фону */
            .lmc-head-btn { padding: 0 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.8; transition: opacity 0.3s; }
            .lmc-head-btn:hover { opacity: 1; }
            .lmc-head-btn svg { width: 22px; height: 22px; stroke: #fff; fill: none; display: block; }

            /* Консоль на весь екран, нейтральні кольори */
            #lampa-mob-console-window { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100vh; height: 100dvh; background: #14161a; z-index: 9999999; flex-direction: column; font-family: monospace; color: #e0e0e0; }
            #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 12px 16px; background: #1e2024; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; }
            
            #lmc-search-bar { padding: 10px 16px; background: #1a1c20; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; }
            #lmc-search-input { width: 100%; background: #2a2c31; color: #fff; border: 1px solid transparent; padding: 10px 35px 10px 12px; border-radius: 6px; outline: none; font-family: inherit; font-size: 14px; box-sizing: border-box; }
            #lmc-search-input:focus { border-color: #555; }
            #lmc-search-clear { position: absolute; right: 24px; top: 18px; color: #888; font-size: 18px; cursor: pointer; display: none; font-weight: bold; width: 20px; height: 20px; text-align: center; line-height: 18px; }

            /* Вкладки (Tabs) з лічильниками */
            #lampa-mob-console-tabs { display: flex; background: #14161a; overflow-x: auto; white-space: nowrap; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
            #lampa-mob-console-tabs::-webkit-scrollbar { display: none; }
            .lmc-tab { padding: 8px 14px; background: #1e2024; border-radius: 6px; margin-right: 8px; text-align: center; color: #aaa; font-size: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; user-select: none; }
            .lmc-tab.active { background: #333; color: #fff; border-color: #555; }

            /* Контент */
            .lmc-content { display: none; flex: 1; overflow-y: auto; padding: 10px 16px; font-size: 12px; word-wrap: break-word; white-space: pre-wrap; overscroll-behavior: contain; padding-bottom: 40px; }
            .lmc-content.active { display: block; }
            .lmc-action { padding: 6px 14px; background: #2a2c31; border-radius: 6px; margin-left: 10px; font-size: 13px; cursor: pointer; color: #ddd; }
            
            /* Дизайн логів з тонкими рамками */
            .lmc-row { margin-bottom: 0; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); user-select: none; -webkit-user-select: none; }
            .lmc-time { color: #666; font-size: 11px; }
            .lmc-warn { color: #ffc107; }
            .lmc-error { color: #f44336; }
            .lmc-info { color: #03a9f4; }
            
            .lmc-collapsible { overflow: hidden; }
            .lmc-collapsible.collapsed { max-height: 65px; position: relative; }
            .lmc-collapsible.collapsed::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 25px; background: linear-gradient(to bottom, rgba(20,22,26,0), rgba(20,22,26,1)); pointer-events: none; }
            .lmc-more-btn { color: #888; cursor: pointer; font-size: 11px; margin-top: 6px; font-weight: bold; display: inline-block; padding: 4px 8px; background: #1e2024; border-radius: 4px; border: 1px solid #333; }
            
            .lmc-network-row { margin-bottom: 0; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); user-select: none; -webkit-user-select: none; }
            .lmc-net-head { margin-bottom: 6px; }
            .lmc-net-status { font-weight: bold; font-size: 11px; color: #aaa; margin-right: 5px; }
            .lmc-net-200 { color: #4caf50; }
            .lmc-net-err { color: #f44336; }
            .lmc-net-url { color: #aaa; word-break: break-all; margin-left: 6px; }
            .lmc-net-response { color: #888; font-size: 11px; background: #1a1c20; padding: 8px; border-radius: 6px; border: 1px solid #2a2c31; }

            /* Елементи для Storage/Cache */
            .lmc-flex-row { display: flex; justify-content: space-between; align-items: flex-start; }
            .lmc-del-btn { background: #f44336; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 10px; margin-left: 10px; cursor: pointer; font-weight: bold; text-transform: uppercase; }
            .lmc-section-title { font-weight: bold; color: #fff; padding: 10px 0 5px 0; border-bottom: 1px solid #333; margin-bottom: 5px; text-transform: uppercase; font-size: 11px; }

            /* Toast (Сповіщення) */
            .lmc-toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: #fff; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; z-index: 99999999; box-shadow: 0 4px 10px rgba(0,0,0,0.5); pointer-events: none; }
        `;
        $('<style>').text(css).appendTo('head');

        $('body').append(`
            <div id="lampa-mob-console-window">
                <div id="lampa-mob-console-header">
                    <span style="font-weight:bold; font-size: 18px;">Console</span>
                    <div style="display:flex;">
                        <div id="lampa-mob-console-clear" class="lmc-action">Очистити</div>
                        <div id="lampa-mob-console-close" class="lmc-action">Сховати</div>
                    </div>
                </div>
                <div id="lmc-search-bar">
                    <input type="text" id="lmc-search-input" placeholder="Пошук (напр. error або назва)...">
                    <div id="lmc-search-clear">×</div>
                </div>
                <div id="lampa-mob-console-tabs">
                    <div class="lmc-tab active" data-target="lmc-content-logs">Console - 0</div>
                    <div class="lmc-tab" data-target="lmc-content-errors">Errors - 0</div>
                    <div class="lmc-tab" data-target="lmc-content-network">Network - 0</div>
                    <div class="lmc-tab" data-target="lmc-content-info">Info</div>
                    <div class="lmc-tab" data-target="lmc-content-extensions">Extensions</div>
                    <div class="lmc-tab" data-target="lmc-content-cache">Cache</div>
                    <div class="lmc-tab" data-target="lmc-content-storage">Storage</div>
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

        logBuffer.forEach(function (item) { pushLogToUI(item.msg, item.type); });
        logBuffer = [];
        netBuffer.forEach(function (item) { pushNetToUI(item.method, item.url, item.status, item.response); });
        netBuffer = [];

        function injectHeaderBtn() {
            if ($('#lmc-head-btn-wrap').length) return; 
            // Біла іконка термінала (без кола)
            var iconSvg = '<svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline><line x1="12" y1="19" x2="20" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line></svg>';
            var btnHtml = '<div id="lmc-head-btn-wrap" class="head__action lmc-head-btn" title="Console">' + iconSvg + '</div>';
            
            var $actions = $('.head__actions');
            if ($actions.length) {
                var $reloadBtn = $actions.find('.open--reload, [data-action="reload"]').first();
                if ($reloadBtn.length) $reloadBtn.before(btnHtml);
                else $actions.append(btnHtml);
            }
            
            $('#lmc-head-btn-wrap').on('click', openConsole);
        }
        
        setInterval(injectHeaderBtn, 1000);
        injectHeaderBtn();

        $('#lampa-mob-console-close').on('click', function () { 
            closeConsole(); 
            if (history.state && history.state.lmc_open) history.back();
        });

        $('#lampa-mob-console-clear').on('click', function () { 
            var activeTab = $('.lmc-content.active').attr('id');
            if(activeTab === 'lmc-content-storage' || activeTab === 'lmc-content-cache' || activeTab === 'lmc-content-info' || activeTab === 'lmc-content-extensions') {
                showToast("Використовуйте точкове видалення");
            } else {
                $('#' + activeTab).empty();
                // Скидаємо лічильник
                if (activeTab === 'lmc-content-logs') { counts.logs = 0; updateCounter('log'); }
                if (activeTab === 'lmc-content-errors') { counts.errors = 0; updateCounter('error'); }
                if (activeTab === 'lmc-content-network') { counts.network = 0; updateCounter('net'); }
            }
        });
        
        $('.lmc-tab').on('click', function () {
            $('.lmc-tab').removeClass('active');
            $('.lmc-content').removeClass('active');
            
            $(this).addClass('active');
            var target = $(this).attr('data-target');
            $('#' + target).addClass('active');

            if (target === 'lmc-content-storage' || target === 'lmc-content-cache') updateStorageAndCache();
            if (target === 'lmc-content-info') updateInfoTab();
            if (target === 'lmc-content-extensions') updateExtensionsTab();
            
            applySearch();
        });

        $('#lmc-search-input').on('keydown keyup keypress', function(e) { e.stopPropagation(); });
        $('#lmc-search-input').on('input', applySearch);
        $('#lmc-search-clear').on('click', function() { $('#lmc-search-input').val('').trigger('input'); });

        // Розгорнути/Згорнути
        $(document).on('click', '.lmc-more-btn', function(e) {
            e.stopPropagation(); // Щоб не спрацювало копіювання
            var $content = $(this).prev('.lmc-collapsible');
            if ($content.hasClass('collapsed')) {
                $content.removeClass('collapsed');
                $(this).html('Згорнути <span>▲</span>');
            } else {
                $content.addClass('collapsed');
                $(this).html('Розгорнути <span>▼</span>');
            }
        });

        // Видалення зі Storage / Cache
        $(document).on('click', '.lmc-del-btn', function(e) {
            e.stopPropagation();
            var key = $(this).attr('data-key');
            localStorage.removeItem(key);
            $(this).closest('.lmc-row').remove();
            showToast("Видалено: " + key);
        });

        // --- ДОВГЕ НАТИСКАННЯ ДЛЯ КОПІЮВАННЯ ---
        var pressTimer;
        $(document).on('touchstart mousedown', '.lmc-row, .lmc-network-row', function(e) {
            if ($(e.target).hasClass('lmc-del-btn') || $(e.target).hasClass('lmc-more-btn')) return;
            var $row = $(this);
            pressTimer = window.setTimeout(function() {
                // Беремо чистий текст без кнопок "Розгорнути" чи "Видалити"
                var clone = $row.clone();
                clone.find('.lmc-more-btn, .lmc-del-btn').remove();
                var textToCopy = clone.text().trim();
                
                // Створення тимчасового елемента для копіювання
                var textarea = document.createElement("textarea");
                textarea.value = textToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand("copy");
                    showToast("Скопійовано");
                } catch (err) {
                    showToast("Помилка копіювання");
                }
                document.body.removeChild(textarea);
            }, 600); // 600 мілісекунд для довгого тапу
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