(function() {
  'use strict';

  /*
  |==========================================================================
  | КОНФІГУРАЦІЯ
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
        return Lampa.Storage.get('lmp_filter_enabled', true);
    }
  };

  /*
  |==========================================================================
  | ЛОГІКА ФІЛЬТРАЦІЇ
  |==========================================================================
  */
  function applyFilter(results) {
     if (!CONFIG.enabled || !results || !Array.isArray(results)) return results;

     var blocked = CONFIG.blockedCountries;
     var minR = CONFIG.minRating;

     return results.filter(function(item) {
         // 1. АВТОФІЛЬТР: Жорстко прибираємо, якщо голосів менше 5
         if (item.vote_count !== undefined && item.vote_count < 5) return false;

         // 2. ФІЛЬТР ЗА РЕЙТИНГОМ: Прибираємо, якщо рейтинг менший за вказаний в меню
         if (item.vote_average !== undefined && item.vote_average < minR) return false;

         // 3. ФІЛЬТР ЗА КРАЇНОЮ (використовуємо мову оригіналу як найнадійніший маркер у TMDB)
         var lang = (item.original_language || '').toLowerCase();
         if (blocked.indexOf(lang) !== -1) return false;

         // Якщо картка пройшла всі перевірки - залишаємо її
         return true;
     });
  }

  /*
  |==========================================================================
  | ПЕРЕХОПЛЕННЯ API
  |==========================================================================
  */
  function startInterceptor() {
     if (window.lmp_filter_intercepted) return;
     window.lmp_filter_intercepted = true;

     var originalApiGet = Lampa.Api.get;

     Lampa.Api.get = function(params, onsuccess, onerror) {
         var wrappedSuccess = function(json) {
             // Перевіряємо, чи є масив результатів (карток)
             if (json && json.results) {
                 json.results = applyFilter(json.results);
             }
             // Передаємо очищений масив оригінальній функції Lampa
             onsuccess(json);
         };
         
         originalApiGet.call(Lampa.Api, params, wrappedSuccess, onerror);
     };
  }

  /*
  |==========================================================================
  | МЕНЮ НАЛАШТУВАНЬ
  |==========================================================================
  */
  function initSettings() {
      if (window.lmp_filter_settings_ready) return;
      window.lmp_filter_settings_ready = true;

      // Створюємо розділ
      Lampa.SettingsApi.addComponent({
          component: 'lmp_content_filter',
          name: 'Фільтр контенту',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>'
      });

      // Перемикач роботи плагіна
      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_enabled', type: 'trigger', "default": true },
          field: { name: 'Увімкнути фільтрацію', description: 'Загальний перемикач роботи плагіна.' }
      });

      // Поле для введення країн (кодів)
      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_countries', type: 'input', "default": 'ru' },
          field: { name: 'Блокування за країною (через кому)', description: 'Вводь коди (наприклад: ru, hi, ko). Відсікає за мовою оригіналу.' }
      });

      // Випадаючий список для рейтингу
      var ratingValues = { '0': 'Вимкнено', '4': 'Більше 4.0', '5': 'Більше 5.0', '6': 'Більше 6.0', '7': 'Більше 7.0', '8': 'Більше 8.0' };
      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_min_rating', type: 'select', values: ratingValues, "default": '0' },
          field: { name: 'Мінімальний рейтинг (TMDB)', description: 'Приховувати фільми з оцінкою нижче вибраної.' }
      });
  }

  /*
  |==========================================================================
  | ЗАПУСК
  |==========================================================================
  */
  initSettings();
  startInterceptor();

})();
