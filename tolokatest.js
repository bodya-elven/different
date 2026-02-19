(function () {
    'use strict';

    var plugin_name = 'Toloka Dub Badges PRO';
    
    // ==========================================
    // ⚙️ НАЛАШТУВАННЯ КУКІ (ВСТАВ СЮДИ СВІЙ COOKIE)
    // ==========================================
    // Заміни текст 'ВАШ_КУКІ_ТУТ' на те, що ти знайшов.
    // Приклад: 'toloka_u=12345; toloka_sid=abc123def456'
    var myTolokaCookie = 'toloka_sid=c1ec5b94c00970b6cc396f70b898d9c9'; 
    // ==========================================

    var maxConcurrent = 2; // Максимум 2 запити одночасно
    var activeRequests = 0; 
    var requestQueue = []; 

    var css = `
        .toloka-badge {
            display: inline-flex;
            align-items: center;
            background: rgba(46, 125, 50, 0.8);
            color: #fff;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            margin-right: 6px;
            margin-top: 6px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .toloka-badge-error {
            background: rgba(183, 28, 28, 0.8); /* Червоний колір для помилки */
        }
        .toloka-badge-container {
            margin-top: 5px;
            margin-bottom: 5px;
            display: flex;
            flex-wrap: wrap;
        }
    `;
    $('head').append('<style>' + css + '</style>');

    function extractStudios(html) {
        var studios = [];
        var regex = /переклад:.*?\|\s*([^<\n\r]+)/g;
        var match;

        while ((match = regex.exec(html)) !== null) {
            var name = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
            if (name && name.length > 0 && name.length < 40 && !studios.includes(name)) {
                studios.push(name);
            }
        }
        return studios;
    }

    function processQueue() {
        if (requestQueue.length === 0 || activeRequests >= maxConcurrent) {
            return;
        }

        activeRequests++;
        var task = requestQueue.shift();

        var network = new Lampa.Reguest();
        network.timeout(5000); 

        network.native('https://toloka.to/t' + task.topicId, function (html) {
            task.loadingBadge.remove();
            
            // Перевіряємо, чи пустила нас Толока, чи видала форму входу
            if (html.indexOf('name="login"') !== -1 || html.indexOf('Введіть ім\'я користувача') !== -1) {
                task.badgeContainer.append('<span class="toloka-badge toloka-badge-error">❌ Кукі не працюють (потрібен логін)</span>');
            } else {
                var studios = extractStudios(html);
                if (studios.length > 0) {
                    studios.forEach(function(studio) {
                        task.badgeContainer.append('<span class="toloka-badge">🎤 UKR - ' + studio + '</span>');
                    });
                }
            }
            
            activeRequests--;
            setTimeout(processQueue, 500); 

        }, function (a, c) {
            task.loadingBadge.text('❌ Помилка мережі');
            setTimeout(function() { task.loadingBadge.remove(); }, 3000);
            
            activeRequests--;
            setTimeout(processQueue, 500); 
        }, false, {
            dataType: 'text',
            // ОСЬ ТУТ Lampa передає твої кукі на сервер Толоки
            headers: {
                'Cookie': myTolokaCookie
            }
        });
        
        processQueue(); 
    }

    function processTorrentItem(item_dom, torrent_data) {
        var tracker = (torrent_data.tracker || '').toLowerCase();
        if (tracker.indexOf('toloka') === -1) return;

        var url = torrent_data.details || torrent_data.url || torrent_data.magnet || '';
        var idMatch = url.match(/t(\d+)/) || url.match(/viewtopic\.php\?t=(\d+)/);
        if (!idMatch) return; 
        
        var topicId = idMatch[1];
        
        if (item_dom.find('.toloka-badge-container').length > 0) return;
        
        var badgeContainer = $('<div class="toloka-badge-container"></div>');
        item_dom.find('.torrent-item__info').after(badgeContainer);

        var loadingBadge = $('<span class="toloka-badge" style="background: #555;">⏳ Шукаю...</span>');
        badgeContainer.append(loadingBadge);

        requestQueue.push({
            topicId: topicId,
            badgeContainer: badgeContainer,
            loadingBadge: loadingBadge
        });

        processQueue();
    }

    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                $(mutation.addedNodes).each(function() {
                    var el = $(this);
                    if (el.hasClass('torrent-item')) {
                        setTimeout(function() {
                            var rawElem = el[0];
                            var tData = rawElem.data || rawElem.parsed_data; 
                            var trackerNameDom = el.find('.torrent-item__tracker, .torrent-item__source').text().toLowerCase();
                            
                            if (tData) {
                                if (!tData.tracker) tData.tracker = trackerNameDom;
                                processTorrentItem(el, tData);
                            }
                        }, 50);
                    }
                });
            }
        });
    });

    Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {
            observer.observe(document.body, { childList: true, subtree: true });
            console.log(plugin_name + ' успішно запущено!');
        }
    });

})();
