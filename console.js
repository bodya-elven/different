(function () {
    'use strict';

    if (window.mobileConsoleInitialized) return;
    window.mobileConsoleInitialized = true;

    var logBuffer = [];
    var netBuffer = [];
    var uiReady = false;

    // --- ДОПОМІЖНІ ФУНКЦІЇ ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function applySearch() {
        var query = $('#lmc-search-input').val().toLowerCase();
        var $activeContent = $('.lmc-content.active');
        
        // Фільтруємо елементи тільки в активній вкладці
        $activeContent.children().each(function () {
            var text = $(this).text().toLowerCase();
            $(this).toggle(text.indexOf(query) !== -1);
        });
    }

    // --- ПЕРЕХОПЛЕННЯ CONSOLE ---
    var originalLog = console.log;
    var originalWarn = console.warn;
    var originalError = console.error;
    var originalInfo = console.info;

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
        
        var $row = $('<div class="lmc-row ' + cssClass + '">' + msg + '</div>');
        $logs.append($row);
        
        // Застосовуємо пошук одразу до нових елементів, якщо він активний
        var query = $('#lmc-search-input').val().toLowerCase();
        if (query && $row.text().toLowerCase().indexOf(query) === -1) {
            $row.hide();
        } else {
            $logs.scrollTop($logs[0].scrollHeight);
        }
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
        if ($net.length === 0) return;

        if ($net.children().length > 100) $net.children().first().remove();

        var statusClass = (status >= 200 && status < 300) ? 'lmc-net-200' : 'lmc-net-err';
        var shortResponse = responseText ? responseText.substring(0, 500) : 'No response';
        if (responseText && responseText.length > 500) shortResponse += '... [обрізано]';

        var html = '<div class="lmc-network-row">' +
            '<div><span class="lmc-net-status ' + statusClass + '">' + status + '</span> ' + 
            '<strong>' + method + '</strong> <span class="lmc-net-url">' + escapeHtml(url) + '</span></div>' +
            '<div class="lmc-net-response">' + escapeHtml(shortResponse) + '</div>' +
            '</div>';

        var $row = $(html);
        $net.append($row);

        var query = $('#lmc-search-input').val().toLowerCase();
        if (query && $row.text().toLowerCase().indexOf(query) === -1) {
            $row.hide();
        } else {
            $net.scrollTop($net[0].scrollHeight);
        }
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
        this.addEventListener('error', function () { interceptNet(this._lmcMethod, this._lmcUrl, 'ERR', 'Network Error'); });
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

    // --- ОНОВЛЕННЯ STORAGE ВЛАДКИ ---
    function updateStorageTab() {
        var $storage = $('#lmc-content-storage');
        $storage.empty();
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            var val = localStorage.getItem(key);
            var shortVal = val.length > 200 ? val.substring(0, 200) + '...' : val;
            $storage.append('<div class="lmc-row"><strong>' + escapeHtml(key) + '</strong>: <span style="color:#aaa;">' + escapeHtml(shortVal) + '</span></div>');
        }
        applySearch(); // Застосовуємо пошук до оновленого списку
    }

    // --- ІНТЕРФЕЙС ТА ВКЛАДКИ ---
    function initUI() {
        if (uiReady) return;

        var css = `
            #lampa-mob-console-btn { position: fixed; bottom: 20px; right: 20px; z-index: 9999999; background: rgba(0, 0, 0, 0.7); border: 2px solid #0f0; border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 46px; color: #0f0; font-size: 14px; font-weight: bold; box-shadow: 0 0 10px rgba(0,255,0,0.5); }
            #lampa-mob-console-window { display: none; position: fixed; bottom: 0; left: 0; width: 100%; height: 65vh; background: rgba(15, 15, 15, 0.98); z-index: 9999999; border-top: 2px solid #444; flex-direction: column; font-family: monospace; }
            #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 10px 15px; background: #222; color: #fff; font-size: 16px; align-items: center; }
            #lmc-search-bar { padding: 8px; background: #1a1a1a; border-bottom: 1px solid #333; }
            #lmc-search-input { width: 100%; background: #000; color: #0f0; border: 1px solid #444; padding: 8px; border-radius: 4px; outline: none; font-family: monospace; }
            #lmc-search-input:focus { border-color: #0f0; }
            #lampa-mob-console-tabs { display: flex; background: #111; border-bottom: 1px solid #333; overflow-x: auto; white-space: nowrap; }
            .lmc-tab { padding: 10px 15px; text-align: center; color: #888; border-bottom: 2px solid transparent; font-size: 13px; font-weight: bold; }
            .lmc-tab.active { color: #0f0; border-bottom-color: #0f0; }
            .lmc-content { display: none; flex: 1; overflow-y: auto; padding: 10px; font-size: 12px; color: #ddd; word-wrap: break-word; white-space: pre-wrap; overscroll-behavior: contain; }
            .lmc-content.active { display: block; }
            .lmc-action { padding: 5px 15px; background: #444; border-radius: 5px; margin-left: 10px; }
            
            .lmc-row { margin-bottom: 8px; border-bottom: 1px dashed #333; padding-bottom: 4px; }
            .lmc-warn { color: #ffeb3b; }
            .lmc-error { color: #f44336; }
            .lmc-info { color: #03a9f4; }
            
            .lmc-network-row { margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            .lmc-net-status { font-weight: bold; padding: 2px 5px; border-radius: 3px; font-size: 11px; }
            .lmc-net-200 { background: #4caf50; color: #111; }
            .lmc-net-err { background: #f44336; color: #fff; }
            .lmc-net-url { color: #03a9f4; word-break: break-all; margin-left: 5px; }
            .lmc-net-response { margin-top: 5px; color: #aaa; font-size: 11px; background: #000; padding: 5px; border-radius: 3px; max-height: 150px; overflow-y: auto; }

            /* Стилі для вкладки Execute */
            #lmc-eval-input { width: 100%; height: 80px; background: #000; color: #0f0; border: 1px solid #444; padding: 8px; font-family: monospace; resize: none; border-radius: 4px; margin-bottom: 10px; }
            #lmc-eval-btn { background: #4caf50; color: #000; border: none; padding: 10px; font-weight: bold; width: 100%; border-radius: 4px; }
        `;
        $('<style>').text(css).appendTo('head');

        $('body').append('<div id="lampa-mob-console-btn">LOG</div>');
        $('body').append(`
            <div id="lampa-mob-console-window">
                <div id="lampa-mob-console-header">
                    <span>Mobile DevTools</span>
                    <div style="display:flex;">
                        <div id="lampa-mob-console-clear" class="lmc-action" style="color: #ffeb3b;">Clear</div>
                        <div id="lampa-mob-console-close" class="lmc-action" style="color: #f44336;">Close</div>
                    </div>
                </div>
                <div id="lmc-search-bar">
                    <input type="text" id="lmc-search-input" placeholder="Пошук у поточній вкладці (напр. omdb)...">
                </div>
                <div id="lampa-mob-console-tabs">
                    <div class="lmc-tab active" data-target="lmc-content-logs">Console</div>
                    <div class="lmc-tab" data-target="lmc-content-network">Network</div>
                    <div class="lmc-tab" data-target="lmc-content-storage">Storage</div>
                    <div class="lmc-tab" data-target="lmc-content-eval">Execute</div>
                </div>
                <div id="lmc-content-logs" class="lmc-content active"></div>
                <div id="lmc-content-network" class="lmc-content"></div>
                <div id="lmc-content-storage" class="lmc-content"></div>
                <div id="lmc-content-eval" class="lmc-content">
                    <textarea id="lmc-eval-input" placeholder="console.log(Lampa.Storage.get('active_plugins'));"></textarea>
                    <button id="lmc-eval-btn">Виконати JS</button>
                </div>
            </div>
        `);

        uiReady = true;

        logBuffer.forEach(function (item) { pushLogToUI(item.msg, item.type); });
        logBuffer = [];
        netBuffer.forEach(function (item) { pushNetToUI(item.method, item.url, item.status, item.response); });
        netBuffer = [];

        $('#lampa-mob-console-btn').on('click', function () { $('#lampa-mob-console-window').css('display', 'flex'); });
        $('#lampa-mob-console-close').on('click', function () { $('#lampa-mob-console-window').hide(); });
        $('#lampa-mob-console-clear').on('click', function () { 
            var activeTab = $('.lmc-content.active').attr('id');
            if(activeTab === 'lmc-content-storage') {
                console.log("Очищення Storage через консоль заблоковано для безпеки. Використовуйте Execute.");
            } else if (activeTab !== 'lmc-content-eval') {
                $('#' + activeTab).empty(); 
            }
        });
        
        $('.lmc-tab').on('click', function () {
            $('.lmc-tab').removeClass('active');
            $('.lmc-content').removeClass('active');
            
            $(this).addClass('active');
            var target = $(this).attr('data-target');
            $('#' + target).addClass('active');

            if (target === 'lmc-content-storage') {
                updateStorageTab();
            }
            applySearch(); // Перезастосовуємо пошук при зміні вкладки
        });

        $('#lmc-search-input').on('input', applySearch);

        $('#lmc-eval-btn').on('click', function() {
            var code = $('#lmc-eval-input').val();
            if(!code) return;
            try {
                var result = eval(code);
                console.log("Результат виконання:", result);
                // Одразу перемикаємо на консоль, щоб побачити результат
                $('.lmc-tab[data-target="lmc-content-logs"]').click();
            } catch (e) {
                console.error("Помилка виконання:", e.message);
                $('.lmc-tab[data-target="lmc-content-logs"]').click();
            }
        });
    }

    var checkReady = setInterval(function () {
        if (window.appready || document.querySelector('.app') || document.body) {
            clearInterval(checkReady);
            setTimeout(initUI, 500);
        }
    }, 200);

})();
