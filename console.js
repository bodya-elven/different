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

    // Форматування довгого тексту з кнопкою "Більше"
    function formatLongText(text) {
        if (!text) return 'null';
        var str = String(text);
        // Якщо текст довший за 250 символів або має багато рядків
        if (str.length > 250 || str.split('\n').length > 5) {
            return '<div class="lmc-collapsible collapsed">' + escapeHtml(str) + '</div>' +
                   '<div class="lmc-more-btn">Більше <span>▼</span></div>';
        }
        return escapeHtml(str);
    }

    function applySearch() {
        var query = $('#lmc-search-input').val().toLowerCase();
        var $activeContent = $('.lmc-content.active');
        
        $activeContent.children('.lmc-row, .lmc-network-row').each(function () {
            var text = $(this).text().toLowerCase();
            $(this).toggle(text.indexOf(query) !== -1);
        });
        
        // Показуємо/ховаємо хрестик очищення
        if (query.length > 0) $('#lmc-search-clear').show();
        else $('#lmc-search-clear').hide();
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
        return output.join(' ');
    }

    function pushLogToUI(msg, type) {
        if (!uiReady) return;
        var cssClass = type === 'warn' ? 'lmc-warn' : type === 'error' ? 'lmc-error' : type === 'info' ? 'lmc-info' : '';
        
        var formattedMsg = formatLongText(msg);
        var html = '<div class="lmc-row ' + cssClass + '">' + formattedMsg + '</div>';

        // Додаємо в загальну консоль
        var $logs = $('#lmc-content-logs');
        if ($logs.children().length > 300) $logs.children().first().remove();
        var $rowLog = $(html).appendTo($logs);

        // Якщо це помилка, дублюємо у вкладку Errors
        if (type === 'error') {
            var $errs = $('#lmc-content-errors');
            if ($errs.children().length > 100) $errs.children().first().remove();
            $errs.append(html);
        }
        
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
        if ($net.length === 0) return;

        if ($net.children().length > 150) $net.children().first().remove();

        var statusClass = (status >= 200 && status < 300) ? 'lmc-net-200' : 'lmc-net-err';
        var formattedResponse = formatLongText(responseText || 'Немає відповіді');

        var html = '<div class="lmc-network-row">' +
            '<div class="lmc-net-head"><span class="lmc-net-status ' + statusClass + '">' + status + '</span> ' + 
            '<strong style="color:#bb86fc;">' + method + '</strong> <span class="lmc-net-url">' + escapeHtml(url) + '</span></div>' +
            '<div class="lmc-net-response">' + formattedResponse + '</div>' +
            '</div>';

        $net.append(html);
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
    function updateStorageTab() {
        var $storage = $('#lmc-content-storage');
        $storage.empty();
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            var val = localStorage.getItem(key);
            $storage.append('<div class="lmc-row"><strong style="color:#03a9f4;">' + escapeHtml(key) + '</strong>: ' + formatLongText(val) + '</div>');
        }
        applySearch();
    }

    function updateAppStateTab() {
        var $state = $('#lmc-content-state');
        $state.empty();
        if (window.Lampa && Lampa.Activity) {
            var active = Lampa.Activity.active();
            $state.append('<div class="lmc-row"><strong style="color:#4caf50;">Поточна сторінка (Activity):</strong><br>' + formatLongText(JSON.stringify(active, null, 2)) + '</div>');
        } else {
            $state.append('<div class="lmc-row">Lampa.Activity ще не завантажено</div>');
        }
        
        if (window.Lampa && Lampa.Platform) {
            $state.append('<div class="lmc-row"><strong style="color:#4caf50;">Платформа:</strong> ' + escapeHtml(Lampa.Platform.get()) + '</div>');
        }
    }

    // --- ІНТЕРФЕЙС ---
    function initUI() {
        if (uiReady) return;

        var css = `
            /* Кнопка в хедері */
            .lmc-head-btn { padding: 0 15px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.8; transition: opacity 0.3s; }
            .lmc-head-btn:hover { opacity: 1; }
            .lmc-head-btn svg { width: 22px; height: 22px; stroke: #fff; }

            /* Головне вікно */
            #lampa-mob-console-window { display: none; position: fixed; bottom: 0; left: 0; width: 100%; height: 75vh; background: rgba(20, 22, 26, 0.95); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); z-index: 9999999; border-top-left-radius: 16px; border-top-right-radius: 16px; flex-direction: column; font-family: monospace; box-shadow: 0 -10px 40px rgba(0,0,0,0.6); border-top: 1px solid rgba(255,255,255,0.1); }
            #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 12px 16px; background: rgba(0,0,0,0.3); color: #fff; font-size: 16px; align-items: center; border-top-left-radius: 16px; border-top-right-radius: 16px; }
            
            /* Пошук */
            #lmc-search-bar { padding: 10px 16px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; }
            #lmc-search-input { width: 100%; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 10px 35px 10px 12px; border-radius: 8px; outline: none; font-family: monospace; font-size: 14px; transition: border 0.3s; box-sizing: border-box; }
            #lmc-search-input:focus { border-color: #bb86fc; background: rgba(255,255,255,0.1); }
            #lmc-search-clear { position: absolute; right: 24px; top: 18px; color: #aaa; font-size: 18px; cursor: pointer; display: none; font-weight: bold; width: 20px; height: 20px; text-align: center; line-height: 18px; }

            /* Вкладки */
            #lampa-mob-console-tabs { display: flex; background: rgba(0,0,0,0.4); overflow-x: auto; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.05); }
            #lampa-mob-console-tabs::-webkit-scrollbar { display: none; }
            .lmc-tab { padding: 12px 16px; text-align: center; color: #888; border-bottom: 2px solid transparent; font-size: 13px; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.3s; }
            .lmc-tab.active { color: #bb86fc; border-bottom-color: #bb86fc; }

            /* Контент */
            .lmc-content { display: none; flex: 1; overflow-y: auto; padding: 12px 16px; font-size: 12px; color: #e0e0e0; word-wrap: break-word; white-space: pre-wrap; overscroll-behavior: contain; }
            .lmc-content.active { display: block; }
            .lmc-action { padding: 6px 14px; background: rgba(255,255,255,0.1); border-radius: 6px; margin-left: 10px; font-size: 13px; cursor: pointer; }
            
            /* Стилі логів */
            .lmc-row { margin-bottom: 10px; background: rgba(0,0,0,0.2); padding: 8px 10px; border-radius: 6px; border-left: 3px solid #444; }
            .lmc-warn { border-left-color: #ffeb3b; }
            .lmc-error { border-left-color: #f44336; background: rgba(244, 67, 54, 0.05); }
            .lmc-info { border-left-color: #03a9f4; }
            
            /* Згортання довгого тексту */
            .lmc-collapsible { transition: max-height 0.3s ease; }
            .lmc-collapsible.collapsed { max-height: 85px; overflow: hidden; position: relative; }
            .lmc-collapsible.collapsed::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 35px; background: linear-gradient(to bottom, rgba(30,32,36,0), rgba(20,22,26,1)); pointer-events: none; }
            .lmc-more-btn { color: #bb86fc; cursor: pointer; font-size: 11px; margin-top: 6px; text-transform: uppercase; font-weight: bold; display: inline-block; padding: 4px 8px; background: rgba(187, 134, 252, 0.1); border-radius: 4px; }
            .lmc-more-btn:active { background: rgba(187, 134, 252, 0.2); }

            /* Network */
            .lmc-network-row { margin-bottom: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; border-left: 3px solid #888; }
            .lmc-net-head { margin-bottom: 6px; }
            .lmc-net-status { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #000; }
            .lmc-net-200 { background: #4caf50; }
            .lmc-net-err { background: #f44336; color: #fff; }
            .lmc-net-url { color: #888; word-break: break-all; margin-left: 6px; }
            .lmc-net-response { color: #aaa; font-size: 11px; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; }

            /* Execute */
            #lmc-eval-input { width: 100%; height: 100px; background: rgba(0,0,0,0.3); color: #0f0; border: 1px solid rgba(255,255,255,0.1); padding: 10px; font-family: monospace; resize: none; border-radius: 6px; margin-bottom: 10px; outline: none; box-sizing: border-box; }
            #lmc-eval-input:focus { border-color: #bb86fc; }
            #lmc-eval-btn { background: #bb86fc; color: #000; border: none; padding: 12px; font-weight: bold; width: 100%; border-radius: 6px; text-transform: uppercase; cursor: pointer; }
        `;
        $('<style>').text(css).appendTo('head');

        // Додаємо інтерфейс самого вікна
        $('body').append(`
            <div id="lampa-mob-console-window">
                <div id="lampa-mob-console-header">
                    <span style="font-weight:bold; letter-spacing: 1px;">DEV<span style="color:#bb86fc;">TOOLS</span></span>
                    <div style="display:flex;">
                        <div id="lampa-mob-console-clear" class="lmc-action" style="color: #ffeb3b;">Очистити</div>
                        <div id="lampa-mob-console-close" class="lmc-action" style="color: #f44336;">Сховати</div>
                    </div>
                </div>
                <div id="lmc-search-bar">
                    <input type="text" id="lmc-search-input" placeholder="Пошук (напр. omdb або error)...">
                    <div id="lmc-search-clear">×</div>
                </div>
                <div id="lampa-mob-console-tabs">
                    <div class="lmc-tab active" data-target="lmc-content-logs">Console</div>
                    <div class="lmc-tab" data-target="lmc-content-errors" style="color:#f44336;">Errors</div>
                    <div class="lmc-tab" data-target="lmc-content-network">Network</div>
                    <div class="lmc-tab" data-target="lmc-content-state">App State</div>
                    <div class="lmc-tab" data-target="lmc-content-storage">Storage</div>
                    <div class="lmc-tab" data-target="lmc-content-eval">Execute</div>
                </div>
                <div id="lmc-content-logs" class="lmc-content active"></div>
                <div id="lmc-content-errors" class="lmc-content"></div>
                <div id="lmc-content-network" class="lmc-content"></div>
                <div id="lmc-content-state" class="lmc-content"></div>
                <div id="lmc-content-storage" class="lmc-content"></div>
                <div id="lmc-content-eval" class="lmc-content">
                    <textarea id="lmc-eval-input" placeholder="// Введіть JS код тут...&#10;console.log(Lampa.Storage.get('active_plugins'));"></textarea>
                    <button id="lmc-eval-btn">Виконати</button>
                </div>
            </div>
        `);

        uiReady = true;

        // Виливаємо буфери
        logBuffer.forEach(function (item) { pushLogToUI(item.msg, item.type); });
        logBuffer = [];
        netBuffer.forEach(function (item) { pushNetToUI(item.method, item.url, item.status, item.response); });
        netBuffer = [];

        // ІНЖЕКЦІЯ КНОПКИ У ХЕДЕР LAMPA
        function injectHeaderBtn() {
            if ($('#lmc-head-btn-wrap').length) return; // Вже є
            
            var iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>';
            var btnHtml = '<div id="lmc-head-btn-wrap" class="head__action lmc-head-btn">' + iconSvg + '</div>';
            
            // Шукаємо контейнер з іконками в хедері
            var $actions = $('.head__actions');
            if ($actions.length) {
                // Вставляємо перед кнопкою перезавантаження або в кінець
                var $reloadBtn = $actions.find('.open--reload, [data-action="reload"]').first();
                if ($reloadBtn.length) {
                    $reloadBtn.before(btnHtml);
                } else {
                    $actions.append(btnHtml);
                }
            }
            
            // Подія кліку по кнопці в хедері
            $('#lmc-head-btn-wrap').on('click', function () { 
                $('#lampa-mob-console-window').css('display', 'flex'); 
            });
        }
        
        // Перевіряємо хедер кожну секунду (бо Lampa може його перемальовувати)
        setInterval(injectHeaderBtn, 1000);
        injectHeaderBtn();

        // Події вікна
        $('#lampa-mob-console-close').on('click', function () { $('#lampa-mob-console-window').hide(); });
        $('#lampa-mob-console-clear').on('click', function () { 
            var activeTab = $('.lmc-content.active').attr('id');
            if(activeTab === 'lmc-content-storage' || activeTab === 'lmc-content-state') {
                console.log("Очищення цієї вкладки заблоковано.");
            } else if (activeTab !== 'lmc-content-eval') {
                $('#' + activeTab).empty(); 
            }
        });
        
        // Перемикання вкладок
        $('.lmc-tab').on('click', function () {
            $('.lmc-tab').removeClass('active');
            $('.lmc-content').removeClass('active');
            
            $(this).addClass('active');
            var target = $(this).attr('data-target');
            $('#' + target).addClass('active');

            if (target === 'lmc-content-storage') updateStorageTab();
            if (target === 'lmc-content-state') updateAppStateTab();
            
            applySearch();
        });

        // --- ВАЖЛИВО: Фікс вводу та Backspace для Lampa ---
        $('#lmc-search-input, #lmc-eval-input').on('keydown keyup keypress', function(e) {
            e.stopPropagation(); // Блокуємо перехоплення пультом Lampa
        });

        $('#lmc-search-input').on('input', applySearch);
        
        // Очищення пошуку
        $('#lmc-search-clear').on('click', function() {
            $('#lmc-search-input').val('').trigger('input');
        });

        // Розгортання "Більше"
        $(document).on('click', '.lmc-more-btn', function() {
            var $content = $(this).prev('.lmc-collapsible');
            $content.removeClass('collapsed');
            $(this).hide();
        });

        // Execute JS
        $('#lmc-eval-btn').on('click', function() {
            var code = $('#lmc-eval-input').val();
            if(!code) return;
            try {
                var result = eval(code);
                console.log("✅ Виконано успішно:", result);
                $('.lmc-tab[data-target="lmc-content-logs"]').click();
            } catch (e) {
                console.error("❌ Помилка виконання:", e.message);
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
