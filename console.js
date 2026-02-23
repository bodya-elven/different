(function () {
    'use strict';

    if (window.mobileConsoleInitialized) return;
    window.mobileConsoleInitialized = true;

    var logBuffer = [];
    var uiReady = false;

    // Зберігаємо оригінальні методи одразу
    var originalLog = console.log;
    var originalWarn = console.warn;
    var originalError = console.error;
    var originalInfo = console.info;

    // Захист від зламу верстки HTML-тегами в логах
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Обробка об'єктів та масивів
    function processMessage(args) {
        var output = [];
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === 'object' && args[i] !== null) {
                try {
                    // Пробуємо перетворити об'єкт в рядок
                    output.push(JSON.stringify(args[i], null, 2));
                } catch (e) {
                    // Якщо є циклічні залежності (наприклад, DOM-елементи)
                    output.push('[Складний об\'єкт/DOM елемент]');
                }
            } else if (args[i] === undefined) {
                output.push('undefined');
            } else if (args[i] === null) {
                output.push('null');
            } else {
                output.push(String(args[i]));
            }
        }
        return escapeHtml(output.join(' '));
    }

    // Додавання логу в інтерфейс
    function pushToUI(msg, type) {
        if (!uiReady) return;
        var cssClass = '';
        if (type === 'warn') cssClass = 'lmc-warn';
        if (type === 'error') cssClass = 'lmc-error';
        if (type === 'info') cssClass = 'lmc-info';

        var $logs = $('#lampa-mob-console-logs');
        if ($logs.length === 0) return;

        if ($logs.children().length > 300) {
            $logs.children().first().remove();
        }

        $logs.append('<div class="lmc-row ' + cssClass + '">' + msg + '</div>');
        $logs.scrollTop($logs[0].scrollHeight);
    }

    // Головна функція перехоплення
    function intercept(type, args) {
        var msg = processMessage(args);
        if (uiReady) {
            pushToUI(msg, type);
        } else {
            // Якщо UI ще немає, кидаємо в буфер
            logBuffer.push({ msg: msg, type: type });
        }
    }

    // Підміняємо консоль ОДРАЗУ
    console.log = function () { intercept('log', arguments); originalLog.apply(console, arguments); };
    console.warn = function () { intercept('warn', arguments); originalWarn.apply(console, arguments); };
    console.error = function () { intercept('error', arguments); originalError.apply(console, arguments); };
    console.info = function () { intercept('info', arguments); originalInfo.apply(console, arguments); };

    // Створення інтерфейсу
    function initUI() {
        if (uiReady) return;

        var css = `
            #lampa-mob-console-btn { position: fixed; bottom: 20px; right: 20px; z-index: 9999999; background: rgba(0, 0, 0, 0.7); border: 2px solid #0f0; border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 46px; color: #0f0; font-size: 14px; font-weight: bold; box-shadow: 0 0 10px rgba(0,255,0,0.5); }
            #lampa-mob-console-window { display: none; position: fixed; bottom: 0; left: 0; width: 100%; height: 60vh; background: rgba(15, 15, 15, 0.98); z-index: 9999999; border-top: 2px solid #444; flex-direction: column; font-family: monospace; }
            #lampa-mob-console-header { display: flex; justify-content: space-between; padding: 15px; background: #222; color: #fff; font-size: 16px; border-bottom: 1px solid #333; }
            #lampa-mob-console-logs { flex: 1; overflow-y: auto; padding: 10px; font-size: 12px; color: #ddd; word-wrap: break-word; white-space: pre-wrap; overscroll-behavior: contain; }
            .lmc-row { margin-bottom: 8px; border-bottom: 1px dashed #333; padding-bottom: 4px; }
            .lmc-warn { color: #ffeb3b; }
            .lmc-error { color: #f44336; }
            .lmc-info { color: #03a9f4; }
            .lmc-action { padding: 5px 15px; background: #444; border-radius: 5px; margin-left: 10px; }
        `;
        $('<style>').text(css).appendTo('head');

        $('body').append('<div id="lampa-mob-console-btn">LOG</div>');
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

        uiReady = true;

        // Виливаємо все з буфера
        logBuffer.forEach(function (item) {
            pushToUI(item.msg, item.type);
        });
        logBuffer = []; // Очищаємо буфер

        // Події кнопок
        $('#lampa-mob-console-btn').on('click', function () {
            $('#lampa-mob-console-window').css('display', 'flex');
        });
        $('#lampa-mob-console-close').on('click', function () {
            $('#lampa-mob-console-window').hide();
        });
        $('#lampa-mob-console-clear').on('click', function () {
            $('#lampa-mob-console-logs').empty();
        });
        
        // Тестовий лог, щоб перевірити, що інтерфейс працює
        console.log('Mobile Console is ready and UI loaded!');
    }

    // Чекаємо завантаження Lampa (DOM), щоб додати UI
    var checkReady = setInterval(function () {
        if (window.appready || document.querySelector('.app') || document.body) {
            clearInterval(checkReady);
            setTimeout(initUI, 500); // Даємо ще пів секунди на рендер
        }
    }, 200);

})();
