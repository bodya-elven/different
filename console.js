(function () {
    'use strict';

    if (window.mobileConsoleInitialized) return;
    window.mobileConsoleInitialized = true;

    var logBuffer = [];
    var netBuffer = [];
    var uiReady = false;

    // --- ПЕРЕХОПЛЕННЯ CONSOLE ---
    var originalLog = console.log;
    var originalWarn = console.warn;
    var originalError = console.error;
    var originalInfo = console.info;

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function processMessage(args) {
        var output = [];
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === 'object' && args[i] !== null) {
                try { output.push(JSON.stringify(args[i], null, 2)); } 
                catch (e) { output.push('[Складний об\'єкт/DOM]'); }
            } else if (args[i] === undefined) { output.push('undefined');
            } else if (args[i] === null) { output.push('null');
            } else { output.push(String(args[i])); }
        }
        return escapeHtml(output.join(' '));
    }

    function pushLogToUI(msg, type) {
        if (!uiReady) return;
        var cssClass = type === 'warn' ? 'lmc-warn' : type === 'error' ? 'lmc-error' : type === 'info' ? 'lmc-info' : '';
        var $logs = $('#lmc-content-logs');
        if ($logs.length === 0) return;

        if ($logs.children().length > 300) $logs.children().first().remove();
        $logs.append('<div class="lmc-row ' + cssClass + '">' + msg + '</div>');
        $logs.scrollTop($logs[0].scrollHeight);
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


    // --- ПЕРЕХОПЛЕННЯ NETWORK (XHR / Fetch) ---
    function pushNetToUI(method, url, status, responseText) {
        if (!uiReady) return;
        var $net = $('#lmc-content-network');
        if ($net.length === 0) return;

        if ($net.children().length > 100) $net.children().first().remove(); // Менший ліміт, бо відповіді великі

        var statusClass = (status >= 200 && status < 300) ? 'lmc-net-200' : 'lmc-net-err';
        var shortResponse = responseText ? responseText.substring(0, 300) : 'Немає відповіді/CORS';
        if (responseText && responseText.length > 300) shortResponse += '... [обрізано]';

        var html = '<div class="lmc-network-row">' +
            '<div><span class="lmc-net-status ' + statusClass + '">' + status + '</span> ' + 
            '<strong>' + method + '</strong> <span class="lmc-net-url">' + escapeHtml(url) + '</span></div>' +
            '<div class="lmc-net-response">' + escapeHtml(shortResponse) + '</div>' +
            '</div>';

        $net.append(html);
        $net.scrollTop($net[0].scrollHeight);
    }

    function interceptNet(method, url, status, responseText) {
        if (uiReady) pushNetToUI(method, url, status, responseText);
        else netBuffer.push({ method: method, url: url, status: status, response: responseText });
    }

    // Перехоплюємо XMLHttpRequest (основний метод Lampa)
    var originalXhrOpen = window.XMLHttpRequest.prototype.open;
    var originalXhrSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (method, url) {
        this._lmcMethod = method;
        this._lmcUrl = url;
        return originalXhrOpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            interceptNet(this._lmcMethod, this._lmcUrl, this.status, this.responseText);
        });
        this.addEventListener('error', function () {
            interceptNet(this._lmcMethod, this._lmcUrl, 'ERR', 'Помилка мережі (CORS або відсутній інтернет)');
        });
        return originalXhrSend.apply(this, arguments);
    };

    // Перехоплюємо Fetch (про всяк випадок)
    var originalFetch = window.fetch;
    window.fetch = function () {
        var url = typeof arguments[0] === 'object' ? arguments[0].url : arguments[0];
        var method = arguments[1] && arguments[1].method ? arguments[1].method : 'GET';
        
        return originalFetch.apply(this, arguments).then(function (response) {
            var clone = response.clone();
            clone.text().then(function (text) {
                interceptNet(method, url, response.status, text);
            });
            return response;
        }).catch(function (error) {
            interceptNet(method, url, 'ERR', error.message);
            throw error;
        });
    };


    // --- ІНТЕРФЕЙС ТА ВКЛАДКИ ---
    function initUI() {
        if (uiReady) return;

        var css = `
            #lampa-mob-console-btn { position: fixed; bottom: 20px; right: 20px; z-index: 9999999; background: rgba(0, 0, 0, 0.7); border: 2px solid #0f0; border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 46px; color: #0f0; font-size: 14px; font-weight: bold; box-shadow: 0 0 10px rgba(0,255,0,0.5); }
            #lampa-mob-console-window { display: none; position: fixed; bottom: 0; left: 0; width: 100%; height: 60vh; background: rgba(15, 15, 15, 0.98); z-index: 9999999; border-top: 2px solid #444; flex-direction: column; font-family: monospace; }
            #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 10px 15px; background: #222; color: #fff; font-size: 16px; border-bottom: 1px solid #333; align-items: center; }
            #lampa-mob-console-tabs { display: flex; background: #111; border-bottom: 1px solid #333; }
            .lmc-tab { flex: 1; padding: 10px; text-align: center; color: #888; border-bottom: 2px solid transparent; font-size: 14px; text-transform: uppercase; font-weight: bold; }
            .lmc-tab.active { color: #0f0; border-bottom-color: #0f0; }
            .lmc-content { display: none; flex: 1; overflow-y: auto; padding: 10px; font-size: 12px; color: #ddd; word-wrap: break-word; white-space: pre-wrap; overscroll-behavior: contain; }
            .lmc-content.active { display: block; }
            .lmc-action { padding: 5px 15px; background: #444; border-radius: 5px; margin-left: 10px; }
            
            /* Стилі для логів */
            .lmc-row { margin-bottom: 8px; border-bottom: 1px dashed #333; padding-bottom: 4px; }
            .lmc-warn { color: #ffeb3b; }
            .lmc-error { color: #f44336; }
            .lmc-info { color: #03a9f4; }
            
            /* Стилі для мережі */
            .lmc-network-row { margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            .lmc-net-status { font-weight: bold; padding: 2px 5px; border-radius: 3px; font-size: 11px; }
            .lmc-net-200 { background: #4caf50; color: #111; }
            .lmc-net-err { background: #f44336; color: #fff; }
            .lmc-net-url { color: #03a9f4; word-break: break-all; margin-left: 5px; }
            .lmc-net-response { margin-top: 5px; color: #aaa; font-size: 11px; background: #000; padding: 5px; border-radius: 3px; }
        `;
        $('<style>').text(css).appendTo('head');

        $('body').append('<div id="lampa-mob-console-btn">LOG</div>');
        $('body').append(`
            <div id="lampa-mob-console-window">
                <div id="lampa-mob-console-header">
                    <span>Console Mobile</span>
                    <div style="display:flex;">
                        <div id="lampa-mob-console-clear" class="lmc-action" style="color: #ffeb3b;">Clear</div>
                        <div id="lampa-mob-console-close" class="lmc-action" style="color: #f44336;">Close</div>
                    </div>
                </div>
                <div id="lampa-mob-console-tabs">
                    <div class="lmc-tab active" data-target="lmc-content-logs">Console</div>
                    <div class="lmc-tab" data-target="lmc-content-network">Network</div>
                </div>
                <div id="lmc-content-logs" class="lmc-content active"></div>
                <div id="lmc-content-network" class="lmc-content"></div>
            </div>
        `);

        uiReady = true;

        // Виливаємо буфери
        logBuffer.forEach(function (item) { pushLogToUI(item.msg, item.type); });
        logBuffer = [];
        netBuffer.forEach(function (item) { pushNetToUI(item.method, item.url, item.status, item.response); });
        netBuffer = [];

        // Події
        $('#lampa-mob-console-btn').on('click', function () { $('#lampa-mob-console-window').css('display', 'flex'); });
        $('#lampa-mob-console-close').on('click', function () { $('#lampa-mob-console-window').hide(); });
        $('#lampa-mob-console-clear').on('click', function () { 
            $('.lmc-content.active').empty(); // Очищає тільки активну вкладку
        });
        
        // Перемикання вкладок
        $('.lmc-tab').on('click', function () {
            $('.lmc-tab').removeClass('active');
            $('.lmc-content').removeClass('active');
            
            $(this).addClass('active');
            $('#' + $(this).attr('data-target')).addClass('active');
        });
    }

    var checkReady = setInterval(function () {
        if (window.appready || document.querySelector('.app') || document.body) {
            clearInterval(checkReady);
            setTimeout(initUI, 500);
        }
    }, 200);

})();
