(function () {
    'use strict';

    // Основна функція плагіна
    function startPlugin() {
        window.fix_size_plugin = true;

        // Ініціалізація та налаштування
        function addPlugin() {
            // Локалізація
            Lampa.Lang.add({
                settings_interface_size_fixed: {
                    en: 'Fixed size',
                    uk: 'Фіксований розмір'
                },
                settings_interface_row_spacing: {
                    en: 'Row spacing',
                    uk: 'Відступ між рядами'
                }
            });

            // Параметр для розміру шрифту (8-15, за замовчуванням 10)
            Lampa.SettingsApi.addParam({
                component: 'interface',
                param: {
                    name: 'interface_size_fixed',
                    type: 'select',
                    values: {
                        '8': '8',
                        '9': '9',
                        '10': '10',
                        '11': '11',
                        '12': '12',
                        '13': '13',
                        '14': '14',
                        '15': '15'
                    },
                    "default": '10'
                },
                field: {
                    name: Lampa.Lang.translate('settings_interface_size_fixed')
                },
                onChange: updateStyles
            });

            // Параметр для відступів між рядами (-1.5 до 1, за замовчуванням 0)
            Lampa.SettingsApi.addParam({
                component: 'interface',
                param: {
                    name: 'interface_row_spacing',
                    type: 'select',
                    values: {
                        '-1.5': '-1.5',
                        '-1.0': '-1.0',
                        '-0.5': '-0.5',
                        '0': '0',
                        '0.5': '0.5',
                        '1.0': '1.0'
                    },
                    "default": '0'
                },
                field: {
                    name: Lampa.Lang.translate('settings_interface_row_spacing')
                },
                onChange: updateStyles
            });

            // Позиціювання елементів у налаштуваннях
            Lampa.Settings.listener.follow('open', function (e) {
                if (e.name === 'interface') {
                    var body = e.body;
                    var item_size = body.find('[data-name="interface_size_fixed"]');
                    var item_spacing = body.find('[data-name="interface_row_spacing"]');
                    var item_orig = body.find('[data-name="interface_size"]');

                    item_size.detach().insertAfter(item_orig);
                    item_spacing.detach().insertAfter(item_size);
                }
            });

            // Застосування CSS стилів
            function updateStyles() {
                var css_id = 'fix_size_css';
                var css_el = $('style#' + css_id);

                if (!css_el.length) {
                    css_el = $('<style type="text/css" id="' + css_id + '"></style>');
                    css_el.appendTo('head');
                }

                // Зчитування значення відступу з пам'яті (сувора перевірка на null/undefined)
                var storage_spacing = Lampa.Storage.field('interface_row_spacing');
                var offset = (storage_spacing !== null && typeof storage_spacing !== 'undefined') ? parseFloat(storage_spacing) : 0;
                
                // Стандартний відступ у Lampa зазвичай 1.5em. Додаємо до нього обране зміщення.
                var final_margin = 1.5 + offset;
                if (final_margin < 0) final_margin = 0; // Запобігаємо від'ємним відступам у CSS

                var styles = '\
                    .card--category { width: 16em !important; }\
                    .items-line { margin-bottom: ' + final_margin + 'em !important; }\
                    .category-full__row { margin-bottom: ' + final_margin + 'em !important; }\
                ';

                css_el.html(styles);
                Lampa.Layer.update();
            }

            // Модифікація системного методу для коректного масштабування
            var platform_screen = Lampa.Platform.screen;
            Lampa.Platform.screen = function (need) {
                if (need === 'tv') {
                    try {
                        var stack = new Error().stack.split('\n');
                        var offset = stack[0] === 'Error' ? 1 : 0;
                        if (/^( *at +new +)?create\$i/.test(stack[1 + offset]) && /^( *at +)?component(\/this)?\.append/.test(stack[2 + offset])) {
                            return false;
                        }
                    } catch (e) {}
                }
                return platform_screen(need);
            };

            // Примусове встановленняfontSize для всього інтерфейсу
            var layer_update = Lampa.Layer.update;
            Lampa.Layer.update = function (where) {
                var storage_size = Lampa.Storage.field('interface_size_fixed');
                var font_size = parseInt(storage_size) || 10;
                $('body').css({ fontSize: font_size + 'px' });
                layer_update(where);
            };

            // Перерахунок при зміні розмірів вікна
            var timer;
            $(window).on('resize', function () {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    Lampa.Layer.update();
                }, 150);
            });

            updateStyles();
        }

        // Запуск після готовності додатка
        if (window.appready) addPlugin();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addPlugin();
            });
        }
    }

    // Метадані та перевірка на дублікати
    if (!window.fix_size_plugin) {
        var manifest = {
            type: 'other',
            version: '1.4.0',
            name: 'Fixed size and row spacing',
            author: '@bodya_elven'
        };
        startPlugin();
    }
})();
