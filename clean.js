(function() {
  'use strict';

  /*
  |==========================================================================
  | КОНФІГУРАЦІЯ ТА ЗМІННІ
  |==========================================================================
  */
  var CONFIG = {
    get blockedCountries() {
        var val = Lampa.Storage.get('lmp_filter_countries', 'ru');
        return val ? val.toLowerCase().split(',').map(function(s) { return s.trim(); }) : [];
    },
    get minRating() {
        return parseFloat(Lampa.Storage.get('lmp_filter_min_rating', '0')) || 0;
    },
    get enabled() {
        return Lampa.Storage.field('lmp_filter_enabled') !== false;
    }
  };

  /*
  |==========================================================================
  | ЛОГІКА ФІЛЬТРАЦІЇ (ТІЛЬКИ TMDB КАТАЛОГ)
  |==========================================================================
  */
  function applyFilter(results) {
     if (!CONFIG.enabled || !results || !Array.isArray(results)) return results;

     var blocked = CONFIG.blockedCountries;
     var minR = CONFIG.minRating;

     return results.filter(function(item) {
         // Пропускаємо людей (акторів) у пошуку, щоб не зламати розділ акторів
         if (item.media_type === 'person') return true;

         // 1. АВТОФІЛЬТР: Жорстко прибираємо, якщо голосів менше 5
         if (item.vote_count !== undefined && item.vote_count < 5) return false;

         // 2. ФІЛЬТР ЗА РЕЙТИНГОМ: Прибираємо, якщо рейтинг менший за вказаний
         if (item.vote_average !== undefined && item.vote_average < minR) return false;

         // 3. ФІЛЬТР ЗА КРАЇНОЮ (перевіряємо мову оригіналу)
         var lang = (item.original_language || '').toLowerCase();
         if (lang && blocked.indexOf(lang) !== -1) return false;

         // 4. ФІЛЬТР ЗА КРАЇНОЮ (перевіряємо країну виробництва, якщо є)
         if (item.origin_country && Array.isArray(item.origin_country)) {
             for (var i = 0; i < item.origin_country.length; i++) {
                 if (blocked.indexOf(item.origin_country[i].toLowerCase()) !== -1) return false;
             }
         }

         // Картка пройшла всі перевірки - залишаємо
         return true;
     });
  }

  /*
  |==========================================================================
  | ПЕРЕХОПЛЕННЯ МЕРЕЖЕВИХ ЗАПИТІВ
  |==========================================================================
  */
  function startInterceptor() {
     if (window.lmp_filter_intercepted) return;
     
     if (!Lampa.Api || !Lampa.Api.get) {
         setTimeout(startInterceptor, 100);
         return;
     }

     window.lmp_filter_intercepted = true;
     var originalApiGet = Lampa.Api.get;

     Lampa.Api.get = function(params, onsuccess, onerror) {
         var wrappedSuccess = function(json) {
             // Вирізаємо сміття прямо з відповіді сервера до рендеру карток
             if (json && Array.isArray(json.results)) {
                 json.results = applyFilter(json.results);
             }
             onsuccess(json);
         };
         
         originalApiGet.call(Lampa.Api, params, wrappedSuccess, onerror);
     };
  }

  /*
  |==========================================================================
  | БЕЗПЕЧНЕ МЕНЮ НАЛАШТУВАНЬ
  |==========================================================================
  */
  function initSettings() {
      if (window.lmp_filter_settings_ready) return;
      
      if (!Lampa.SettingsApi) {
          setTimeout(initSettings, 100);
          return;
      }
      
      window.lmp_filter_settings_ready = true;

      Lampa.SettingsApi.addComponent({
          component: 'lmp_content_filter',
          name: 'Фільтр контенту',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>'
      });

      // Перемикач роботи (values: '' додано для уникнення багів конкретних збірок Lampa)
      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_enabled', type: 'trigger', "default": true, values: '' },
          field: { name: 'Увімкнути фільтрацію', description: 'Загальний перемикач роботи плагіна.' }
      });

      // Мінімальний рейтинг
      var ratingValues = { '0': 'Вимкнено', '4': 'Більше 4.0', '5': 'Більше 5.0', '6': 'Більше 6.0', '7': 'Більше 7.0', '8': 'Більше 8.0' };
      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_min_rating', type: 'select', values: ratingValues, "default": '0' },
          field: { name: 'Мінімальний рейтинг (TMDB)', description: 'Приховувати фільми з оцінкою нижче вибраної.' }
      });

      // Кнопка відкриття віртуальної клавіатури для введення країн (Абсолютно стійка до помилок)
      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_countries_btn', type: 'title' },
          field: { name: 'Блокування за країною/мовою', description: 'Натисни, щоб ввести (Поточні: ru)' },
          onRender: function(item) {
              var updateText = function() {
                  var val = Lampa.Storage.get('lmp_filter_countries', 'ru');
                  item.find('.settings-param__descr').text('Вводь коди через кому. Поточні фільтри: ' + (val || 'Немає'));
              };
              setTimeout(updateText, 10);
              
              item.on('hover:enter click', function() {
                  var current = Lampa.Storage.get('lmp_filter_countries', 'ru');
                  // Виклик рідної клавіатури Lampa
                  Lampa.Input.edit({
                      title: 'Коди країн (наприклад: ru, hi, ko)',
                      value: current,
                      free: true,
                      nosave: true
                  }, function(new_value) {
                      Lampa.Storage.set('lmp_filter_countries', new_value);
                      updateText();
                  });
              });
          }
      });
  }

  /*
  |==========================================================================
  | ЗАПУСК ПЛАГІНА
  |==========================================================================
  */
  function bootPlugin() {
      initSettings();
      startInterceptor();
  }

  if (window.appready) {
      bootPlugin();
  } else {
      Lampa.Listener.follow('app', function(e) {
          if (e.type === 'ready') bootPlugin();
      });
  }

})();
