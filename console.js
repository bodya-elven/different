(function () {
    'use strict';

    var MobileConsolePlugin = {
        init: function () {
            // Запобігаємо подвійному запуску
            if (window.mobileConsoleInitialized) return;
            window.mobileConsoleInitialized = true;

            this.createUI();
            this.overrideConsole();
            this.bindEvents();
            
            console.log("Mobile Console Plugin successfully loaded!");
        },

        createUI: function () {
            // Стилі, адаптовані під мобільні екрани
            var css = `
                #lampa-mob-console-btn { position: fixed; bottom: 20px; right: 20px; z-index: 99999; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 50px; color: #fff; font-size: 14px; font-weight: bold; backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
                #lampa-mob-console-window { display: none; position: fixed; bottom: 0; left: 0; width: 100%; height: 60vh; background: rgba(15, 15, 15, 0.95); z-index: 999999; border-top: 2px solid #444; flex-direction: column; font-family: monospace; }
                #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 15px; background: #222; color: #fff; font-size: 16px; border-bottom: 1px solid #333; }
                #lampa-mob-console-logs { flex: 1; overflow-y: auto; padding: 10px; font-size: 13px; color: #0f0; word-wrap: break-word; white-space: pre-wrap; overscroll-behavior: contain; }
                .lmc-row { margin-bottom: 8px; border-bottom: 1px dashed #333; padding-bottom: 4px; }
                .lmc-warn { color: #ffeb3b; }
                .lmc-error { color: #f44336; }
                .lmc-info { color: #03a9f4; }
                .lmc-action { padding: 5px 15px; background: #333; border-radius: 5px; margin-left: 10px; }
            `;
            $('<style>').text(css).appendTo('head');

            // HTML елементи
            $('body').append('<div id="lampa-mob-console-btn">CMD</div>');
            $('body').append(`
                <div id="lampa-mob-console-window">
                    <div id="lampa-mob-console-header">
                        <span>Console Lampa</span>
                        <div style="display:flex;">
                            <div id="lampa-mob-console-clear" class="lmc-action" style="color: #ffeb3b;">Clear</div>
                            <div id="lampa-mob-console-close" class="lmc-action" style="color: #f44336;">Close</div>
                        </div>
                    </div>
                    <div id="lampa-mob-console-logs"></div>
                </div>
            `);
        },

        overrideConsole: function () {
            var originalLog = console.log;
            var originalWarn = console.warn;
            var originalError = console.error;
            var originalInfo = console.info;

            function processMessage(args) {
                var output = [];
                for (var i = 0; i < args.length; i++) {
                    if (typeof args[i] === 'object') {
                        try {
                            output.push(JSON.stringify(args[i], null, 2));
                        } catch (e) {
                            output.push('[Circular Object]');
                        }
                    } else {
                        output.push(args[i]);
                    }
                }
                return output.join(' ');
            }

            function appendToUI(msg, type) {
                var cssClass = '';
                if (type === 'warn') cssClass = 'lmc-warn';
                if (type === 'error') cssClass = 'lmc-error';
                if (type === 'info') cssClass = 'lmc-info';

                var $logs = $('#lampa-mob-console-logs');
                // Видаляємо старі логи, якщо їх занадто багато (запобігає зависанню телефону)
                if ($logs.children().length > 300) {
                    $logs.children().first().remove();
                }

                $logs.append('<div class="lmc-row ' + cssClass + '">' + msg + '</div>');
                // Автоскрол вниз
                $logs.scrollTop($logs[0].scrollHeight);
            }

            console.log = function () { 
                var msg = processMessage(arguments);
                appendToUI(msg, 'log'); 
                originalLog.apply(console, arguments); 
            };
            console.warn = function () { 
                var msg = processMessage(arguments);
                appendToUI(msg, 'warn'); 
                originalWarn.apply(console, arguments); 
            };
            console.error = function () { 
                var msg = processMessage(arguments);
                appendToUI(msg, 'error'); 
                originalError.apply(console, arguments); 
            };
            console.info = function () { 
                var msg = processMessage(arguments);
                appendToUI(msg, 'info'); 
                originalInfo.apply(console, arguments); 
            };
        },

        bindEvents: function () {
            // Відкрити консоль
            $('#lampa-mob-console-btn').on('click', function () {
                $('#lampa-mob-console-window').css('display', 'flex');
            });
            // Закрити консоль
            $('#lampa-mob-console-close').on('click', function () {
                $('#lampa-mob-console-window').hide();
            });
            // Очистити логи
            $('#lampa-mob-console-clear').on('click', function () {
                $('#lampa-mob-console-logs').empty();
            });
        }
    };

    // Ініціалізація після завантаження Lampa
    if (window.appready) {
        MobileConsolePlugin.init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                MobileConsolePlugin.init();
            }
        });
    }
})();
