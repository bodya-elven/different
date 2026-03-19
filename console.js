(function () {
    'use strict';

    if (window.mobileConsoleInitialized) return;
    window.mobileConsoleInitialized = true;

    var logBuffer = [];
    var netBuffer = [];
    var uiReady = false;
    var counts = { logs: 0, errors: 0, network: 0 };
    var startTime = performance.now();
    var prev_controller = 'content'; 

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatLongText(text) {
        if (!text) return 'null';
        var str = String(text);
        if (str.length > 150 || str.split('\n').length > 3) {
            return '<div class="lmc-collapsible collapsed">' + escapeHtml(str) + '</div>';
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

        $('.lmc-tab[data-target="lmc-content-logs"]').text('Console (' + counts.logs + ')');
        $('.lmc-tab[data-target="lmc-content-errors"]').text('Errors (' + counts.errors + ')');
        $('.lmc-tab[data-target="lmc-content-network"]').text('Network (' + counts.network + ')');
    }

    function applySearch() {
        var query = $('#lmc-search-input').val().toLowerCase();
        var $activeContent = $('.lmc-content.active');
        $activeContent.children().each(function () {
            var text = $(this).text().toLowerCase();
            $(this).toggle(text.indexOf(query) !== -1);
        });
        if (query.length > 0) $('#lmc-search-clear').show();
        else $('#lmc-search-clear').hide();
        
        if (window.Lampa && Lampa.Controller && Lampa.Controller.enabled().name === 'lmc_console') {
            Lampa.Controller.collectionSet(document.getElementById('lampa-mob-console-window'));
        }
    }

    function updateInfoTab() {
        var $info = $('#lmc-content-info').empty();
        var activeComp = window.Lampa && Lampa.Activity && Lampa.Activity.active() ? Lampa.Activity.active().component : 'None';
        var ms = performance.now() - startTime;
        var uptime = Math.floor(ms / 1000 / 60) + ' хв ' + Math.floor((ms / 1000) % 60) + ' сек';
        var dpr = window.devicePixelRatio || 1;
        var screenW = Math.round(window.screen.width * dpr);
        var screenH = Math.round(window.screen.height * dpr);

        var data = [
            { k: 'location', v: window.location.href },
            { k: 'active component', v: activeComp },
            { k: 'session uptime', v: uptime },
            { k: 'hash', v: window.Lampa && Lampa.Storage ? Lampa.Storage.get('hash', 'unknown') : 'unknown' },
            { k: 'build date', v: window.Lampa && Lampa.Manifest && Lampa.Manifest.time ? new Date(Lampa.Manifest.time).toLocaleString() : 'Unknown' },
            { k: 'version', v: window.Lampa && Lampa.Manifest ? Lampa.Manifest.app_version : 'Unknown' },
            { k: 'platform', v: window.Lampa && Lampa.Platform ? Lampa.Platform.get() : 'Unknown' },
            { k: 'is PWA', v: window.matchMedia('(display-mode: standalone)').matches },
            { k: 'is touch', v: (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) },
            { k: 'is mobile', v: /Mobi|Android/i.test(navigator.userAgent) },
            { k: 'is tv', v: window.Lampa && Lampa.Platform ? Lampa.Platform.is('tv') : 'false' },
            { k: 'touch points', v: navigator.maxTouchPoints || 0 },
            { k: 'user agent', v: navigator.userAgent },
            { k: 'pixel ratio', v: dpr },
            { k: 'interface size', v: window.innerWidth + ' / ' + window.innerHeight },
            { k: 'screen size', v: screenW + ' / ' + screenH }
        ];
        
        data.forEach(function(item) { 
            $info.append('<div class="lmc-row selector"><strong>' + item.k + ':</strong> <span style="color:#aaa;">' + escapeHtml(item.v) + '</span></div>'); 
        });
    }

    var originalLog = console.log, originalWarn = console.warn, originalError = console.error;

    function pushLogToUI(msg, type) {
        if (!uiReady) return;
        var cssClass = type === 'warn' ? 'lmc-warn' : type === 'error' ? 'lmc-error' : '';
        var time = new Date().toLocaleTimeString('uk-UA', { hour12: false }).substring(0, 5);
        var formattedMsg = formatLongText(msg);
        var html = '<div class="lmc-row selector ' + cssClass + '"><span class="lmc-time">' + time + ' - </span>' + formattedMsg + '</div>';
        $('#lmc-content-logs').append(html);
        if (type === 'error') $('#lmc-content-errors').append(html);
        updateCounter(type);
    }

    function interceptLog(type, args) {
        var output = [];
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === 'object') try { output.push(JSON.stringify(args[i])); } catch(e){ output.push('[Obj]'); }
            else output.push(String(args[i]));
        }
        var msg = output.join(' ');
        if (uiReady) pushLogToUI(msg, type); else logBuffer.push({ msg: msg, type: type });
    }

    console.log = function () { interceptLog('log', arguments); originalLog.apply(console, arguments); };
    console.error = function () { interceptLog('error', arguments); originalError.apply(console, arguments); };

    function updateExtensionsTab() {
        var $ext = $('#lmc-content-extensions').empty();
        if (window.Lampa && Lampa.Storage) {
            var plugins = Lampa.Storage.get('plugins') || [];
            plugins.forEach(function(p) {
                var stat = p.status ? '<span style="color:#20c997;">[ON]</span>' : '<span style="color:#f44336;">[OFF]</span>';
                var btnClass = p.status ? 'lmc-plug-off' : 'lmc-plug-on';
                var html = '<div class="lmc-item-wrap">' +
                           '<div class="lmc-item-text selector">' + stat + ' ' + escapeHtml(p.name || 'Plug') + '</div>' +
                           '<div class="lmc-plugin-toggle selector ' + btnClass + '" data-url="' + escapeHtml(p.url) + '">Toggle</div>' +
                           '</div>';
                $ext.append(html);
            });
        }
    }
    function initUI() {
        if (uiReady) return;

        var css = `
            #lampa-mob-console-window { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100vh; height: 100dvh; background: #0c0d0f; z-index: 9999999; flex-direction: column; font-family: -apple-system, sans-serif; color: #ddd; font-size: 11.5px; }
            #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 10px 14px; background: #1a1c1f; align-items: center; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
            #lmc-search-bar { padding: 8px 14px; background: #141619; display: flex; align-items: center; flex-shrink: 0; }
            #lmc-search-input { flex: 1; background: #212429; color: #fff; border: 1px solid transparent; padding: 8px 12px; border-radius: 4px; outline: none; font-size: 12px; }
            #lmc-search-input.focus { border-color: #20c997; background: #2a2e33; }
            #lampa-mob-console-tabs { display: flex; background: #0c0d0f; overflow-x: auto; padding: 8px; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
            .lmc-tab { padding: 6px 12px; background: #16181b; border-radius: 6px; margin-right: 6px; color: #aaa; cursor: pointer; white-space: nowrap; font-weight: 500; }
            .lmc-tab.active { color: #20c997; border: 1px solid #20c997; background: rgba(32, 201, 151, 0.05); }
            .lmc-tab.focus { outline: 2px solid #fff; color: #fff; }
            .lmc-content { display: none; flex: 1; overflow-y: auto; padding: 8px 14px; word-wrap: break-word; position: relative; }
            .lmc-content.active { display: flex; flex-direction: column; }
            #lampa-mob-console-close { font-size: 26px; cursor: pointer; padding: 0 8px; color: #888; }
            #lampa-mob-console-close.focus { color: #fff; transform: scale(1.1); }
            .lmc-row { padding: 10px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
            .lmc-row.focus { background: rgba(32, 201, 151, 0.1); border-radius: 2px; }
            .lmc-collapsible.collapsed { max-height: 40px; overflow: hidden; position: relative; }
            .lmc-collapsible.collapsed::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 20px; background: linear-gradient(transparent, #0c0d0f); }
            .lmc-item-wrap { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .lmc-item-text { flex: 1; padding: 10px 4px; }
            .lmc-item-text.focus { background: rgba(255,255,255,0.05); }
            .lmc-del-btn, .lmc-plugin-toggle { padding: 6px 10px; border-radius: 4px; background: #212429; margin-left: 10px; align-self: center; font-size: 10px; text-transform: uppercase; font-weight: bold; }
            .lmc-del-btn.focus, .lmc-plugin-toggle.focus { background: #20c997; color: #000; }
        `;
        $('<style>').text(css).appendTo('head');

        $('body').append(`
            <div id="lampa-mob-console-window">
                <div id="lampa-mob-console-header"><span>Console Tools</span><div id="lampa-mob-console-close" class="selector">×</div></div>
                <div id="lmc-search-bar"><input type="text" id="lmc-search-input" class="selector" placeholder="Пошук..."><div id="lmc-search-clear" class="selector" style="display:none; padding: 0 10px;">×</div></div>
                <div id="lampa-mob-console-tabs">
                    <div class="lmc-tab selector active" data-target="lmc-content-logs">Console (0)</div>
                    <div class="lmc-tab selector" data-target="lmc-content-errors">Errors (0)</div>
                    <div class="lmc-tab selector" data-target="lmc-content-network">Network (0)</div>
                    <div class="lmc-tab selector" data-target="lmc-content-info">Info</div>
                    <div class="lmc-tab selector" data-target="lmc-content-extensions">Plugins</div>
                    <div class="lmc-tab selector" data-target="lmc-content-cache">Cache</div>
                    <div class="lmc-tab selector" data-target="lmc-content-storage">Storage</div>
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
        logBuffer.forEach(function(i){ pushLogToUI(i.msg, i.type); });
        var winDom = document.getElementById('lampa-mob-console-window');

        function scrollToFocused() {
            var focus = window.Navigator.getFocusedElement();
            if (!focus) return;
            var $container = $(focus).closest('.lmc-content');
            if ($container.length) {
                var elTop = focus.offsetTop; 
                var elHeight = focus.offsetHeight;
                var contHeight = $container[0].clientHeight;
                
                // МАТЕМАТИКА ЦЕНТРУВАННЯ: Ставимо елемент рівно по центру екрана
                var targetScroll = elTop - (contHeight / 2) + (elHeight / 2);
                
                // Максимальна плавність через animate (100мс)
                $container.stop().animate({ scrollTop: targetScroll }, 100);
            }
        }

        function openConsole() {
            if (window.Lampa && Lampa.Controller) {
                prev_controller = Lampa.Controller.enabled().name;
                $('#lampa-mob-console-window').css('display', 'flex');
                if (!window.lmc_controller_added) {
                    Lampa.Controller.add('lmc_console', {
                        toggle: function() {
                            Lampa.Controller.collectionSet(winDom);
                            Lampa.Controller.collectionFocus(false, winDom);
                        },
                        right: function() { window.Navigator.move('right'); scrollToFocused(); },
                        left:  function() { window.Navigator.move('left'); scrollToFocused(); },
                        down:  function() { 
                            var f = window.Navigator.getFocusedElement();
                            if (f && f.id === 'lmc-search-input') window.Navigator.focus(winDom.querySelector('.lmc-tab.active'));
                            else window.Navigator.move('down'); 
                            scrollToFocused();
                        },
                        up:    function() { 
                            var f = window.Navigator.getFocusedElement();
                            if (f && f.classList.contains('lmc-tab')) window.Navigator.focus(winDom.querySelector('#lmc-search-input'));
                            else window.Navigator.move('up'); 
                            scrollToFocused();
                        },
                        enter: function() { 
                            var f = window.Navigator.getFocusedElement(); 
                            if (f) {
                                if (f.id === 'lmc-search-input') { f.focus(); f.click(); } // Пряма активація клавіатури
                                else $(f).trigger('click'); 
                            }
                        },
                        back:  function() { $('#lampa-mob-console-window').hide(); Lampa.Controller.toggle(prev_controller); }
                    });
                    window.lmc_controller_added = true;
                }
                Lampa.Controller.toggle('lmc_console');
                window.Navigator.focus(winDom.querySelector('.lmc-tab.active'));
            }
        }

        // КНОПКА В ШАПЦІ (Динамічне додавання)
        setInterval(function() {
            if ($('#lmc-head-btn-wrap').length) return;
            var btn = $('<div id="lmc-head-btn-wrap" class="head__action selector" style="width:40px; text-align:center;">C</div>');
            $('.head__actions').prepend(btn);
        }, 1000);

        $('body').on('click hover:enter', '#lmc-head-btn-wrap', function(e) {
            e.stopPropagation(); openConsole();
        });

        // ПЕРЕХОПЛЕННЯ КЛІКІВ
        $('#lampa-mob-console-window').on('click', '.selector', function(e) {
            var $t = $(this); e.stopPropagation();
            if ($t.attr('id') === 'lampa-mob-console-close') { $('#lampa-mob-console-window').hide(); Lampa.Controller.toggle(prev_controller); }
            if ($t.hasClass('lmc-tab')) {
                $('.lmc-tab, .lmc-content').removeClass('active');
                $t.addClass('active'); $('#' + $t.attr('data-target')).addClass('active');
                if ($t.attr('data-target') === 'lmc-content-info') updateInfoTab();
                if ($t.attr('data-target') === 'lmc-content-extensions') updateExtensionsTab();
                if ($t.attr('data-target').indexOf('storage') > -1) updateStorageAndCache();
                applySearch();
                Lampa.Controller.collectionSet(winDom); // Оновлюємо сітку після зміни вкладки
            }
            if ($t.hasClass('lmc-row') || $t.hasClass('lmc-item-text')) {
                $t.find('.lmc-collapsible').toggleClass('collapsed');
                Lampa.Controller.collectionSet(winDom); // Оновлюємо сітку після розгортання
                window.Navigator.focus($t[0]); // Повертаємо фокус, щоб він не стрибав
            }
        });

        $('#lmc-search-input').on('input', function() { applySearch(); });
    }

    var checkReady = setInterval(function () {
        if (window.appready || document.body) { clearInterval(checkReady); setTimeout(initUI, 500); }
    }, 200);
})();
