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
         if (item.vote_count !== undefined && item.vote_count < 5) return false;
         if (item.vote_average !== undefined && item.vote_average < minR) return false;

         var lang = (item.original_language || '').toLowerCase();
         if (blocked.indexOf(lang) !== -1) return false;

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
     
     // Якщо Lampa.Api ще не готовий, чекаємо 100мс і пробуємо знову
     if (!Lampa.Api || !Lampa.Api.get) {
         setTimeout(startInterceptor, 100);
         return;
     }

     window.lmp_filter_intercepted = true;
     var originalApiGet = Lampa.Api.get;

     Lampa.Api.get = function(params, onsuccess, onerror) {
         var wrappedSuccess = function(json) {
             if (json && json.results) {
                 json.results = applyFilter(json.results);
             }
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
      
      // Якщо SettingsApi ще не готовий, чекаємо
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

      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_enabled', type: 'trigger', "default": true },
          field: { name: 'Увімкнути фільтрацію', description: 'Загальний перемикач роботи плагіна.' }
      });

      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_countries', type: 'input', "default": 'ru' },
          field: { name: 'Блокування за країною', description: 'Вводь коди мови оригіналу (наприклад: ru, hi, ko) через кому.' }
      });

      var ratingValues = { '0': 'Вимкнено', '4': 'Більше 4.0', '5': 'Більше 5.0', '6': 'Більше 6.0', '7': 'Більше 7.0', '8': 'Більше 8.0' };
      Lampa.SettingsApi.addParam({
          component: 'lmp_content_filter',
          param: { name: 'lmp_filter_min_rating', type: 'select', values: ratingValues, "default": '0' },
          field: { name: 'Мінімальний рейтинг (TMDB)', description: 'Приховувати фільми з оцінкою нижче вибраної.' }
      });
  }

  /*
  |==========================================================================
  | БЕЗПЕЧНИЙ ЗАПУСК
  |==========================================================================
  */
  function bootPlugin() {
      initSettings();
      startInterceptor();
  }

  // Запускаємо тільки тоді, коли ядро програми повідомить, що воно готове
  if (window.appready) {
      bootPlugin();
  } else {
      Lampa.Listener.follow('app', function(e) {
          if (e.type === 'ready') bootPlugin();
      });
  }

})();
