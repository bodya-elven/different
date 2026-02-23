(function () {
  'use strict';

  /*
  |==========================================================================
  | ЧАСТИНА 1: БАЗОВІ ЗМІННІ, СТИЛІ ТА ІКОНКИ
  |==========================================================================
  */
  var LMP_ENH_CONFIG = {
      apiKeys: {
          mdblist: ''
      }
  };

  var ICONS = {
      mdblist: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M1.928.029A2.47 2.47 0 0 0 .093 1.673c-.085.248-.09.629-.09 10.33s.005 10.08.09 10.33a2.51 2.51 0 0 0 1.512 1.558l.276.108h20.237l.277-.108a2.51 2.51 0 0 0 1.512-1.559c.085-.25.09-.63.09-10.33s-.005-10.08-.09-10.33A2.51 2.51 0 0 0 22.395.115l-.277-.109L12.117 0C6.615-.004 2.032.011 1.929.029m7.48 8.067l2.123 2.004v1.54c0 .897-.02 1.536-.043 1.527s-.92-.845-1.995-1.86c-1.071-1.01-1.962-1.84-1.977-1.84s-.024 1.91-.024 4.248v4.25H4.911V6.085h1.188l1.183.006zm9.729 3.93v5.94h-2.63l-.01-4.25l-.013-4.25l-1.907 1.795a367 367 0 0 1-1.98 1.864c-.076.056-.08-.047-.08-1.489v-1.555l2.127-1.995l2.122-1.995l1.187-.005h1.184z'/%3E%3C/svg%3E",
      imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
      tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
      tmdb_poster: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg',
      trakt: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Trakt.tv-favicon.svg',
      letterboxd: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Letterboxd_2023_logo.png',
      metacritic: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Metacritic_logo_Roundel.svg',
      rotten_good: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
      rotten_bad: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Rotten_Tomatoes_rotten.svg',
      popcorn_good: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Rotten_Tomatoes_positive_audience.svg',
      popcorn_bad: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Rotten_Tomatoes_negative_audience.svg',
      mal: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/MyAnimeList_Logo.png'
  };

  var ICONS_BW = {
      mdblist: ICONS.mdblist,
      imdb: 'https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg',
      tmdb: ICONS.tmdb,
      trakt: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Trakt.tv-favicon.svg',
      letterboxd: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Letterboxd_2023_logo.png',
      metacritic: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Metacritic_logo_BW.svg',
      rotten_good: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
      rotten_bad: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Rotten_Tomatoes_rotten.svg',
      popcorn_good: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Rotten_Tomatoes_positive_audience.svg',
      popcorn_bad: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Rotten_Tomatoes_negative_audience.svg',
      mal: ICONS.mal
  };

  var pluginStyles = '<style>' +
    ':root { --lmp-logo-offset: 0px; --lmp-text-offset: 0px; --lmp-rate-spacing: 0px; } ' +
    '.lmp-custom-rate { display: inline-flex; align-items: center; gap: 0.4em; margin-right: calc(10px + var(--lmp-rate-spacing)); margin-bottom: 8px; padding: 4px 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); } ' +
    '.lmp-custom-rate.lmp-dir-left { flex-direction: row; } ' +
    '.lmp-custom-rate.lmp-dir-right { flex-direction: row-reverse; } ' +
    '.lmp-enh--rate-border .lmp-custom-rate { border: 1px solid rgba(255,255,255,0.15); } ' +
    '.lmp-custom-rate .source--name { width: calc(20px + var(--lmp-logo-offset)); height: calc(20px + var(--lmp-logo-offset)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; } ' +
    '.lmp-custom-rate .source--name img { width: 100%; height: 100%; object-fit: contain; } ' +
    '.lmp-enh--mono .lmp-custom-rate .source--name img { filter: grayscale(100%) brightness(1.2); } ' +
    '.lmp-custom-rate .rate--text-block { display: flex; flex-direction: column; line-height: 1; } ' +
    '.lmp-custom-rate .rate--value { font-size: calc(1.1em + var(--lmp-text-offset)); font-weight: bold; color: #fff; } ' +
    '.lmp-custom-rate .rate--votes { font-size: calc(0.7em + (var(--lmp-text-offset) * 0.5)); color: rgba(255,255,255,0.6); margin-top: 2px; } ' +
    '.lmp-color-green { color: #4CAF50 !important; } .lmp-color-blue { color: #2196F3 !important; } .lmp-color-orange { color: #FF9800 !important; } .lmp-color-red { color: #F44336 !important; } ' +
    '.lmp-poster-badge { position: absolute; top: 0.4em; right: 0.4em; background: rgba(0, 0, 0, 0.75); border-radius: 0.5em; display: flex; align-items: center; padding: 0.25em 0.4em; gap: 0.35em; z-index: 10; backdrop-filter: blur(2px); } ' +
    '.lmp-poster-badge span { color: #fff; font-weight: bold; font-size: 1em; line-height: 1; } ' +
    '.lmp-poster-badge img { height: 1em; width: auto; display: block; border-radius: 2px; } ' +
    '.menu-edit-list .selector { background: transparent !important; transition: background 0.2s ease; } ' +
    '.menu-edit-list .selector:hover, .menu-edit-list .selector.focus { background: rgba(255, 255, 255, 0.15) !important; } ' +
    '.loading-dots-container { display:flex; align-items:center; opacity:0.6; margin-bottom:8px; font-size:0.9em; } ' +
    '.loading-dots__text { margin-right: 4px; } ' +
    '.loading-dots__dot { width:4px; height:4px; margin:0 2px; background:#fff; border-radius:50%; animation: lmp-dots 1.4s infinite ease-in-out both; } ' +
    '.loading-dots__dot:nth-child(2) { animation-delay: -0.32s; } ' +
    '.loading-dots__dot:nth-child(3) { animation-delay: -0.16s; } ' +
    '@keyframes lmp-dots { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } } ' +
    '</style>';
  /*
  |==========================================================================
  | ЧАСТИНА 2: ЛОГІКА СТОРІНКИ ФІЛЬМУ (MDBList + Прямий міст)
  |==========================================================================
  */
  var RATING_CACHE_KEY = 'lmp_enh_rating_cache';

  var RCFG_DEFAULT = {
    ratings_mdblist_key: '',
    ratings_cache_days: '3',
    ratings_text_position: 'right',
    ratings_show_votes: true,
    ratings_logo_scale_val: 's_0', 
    ratings_text_scale_val: 's_0',
    ratings_spacing_val: 's_0',
    ratings_bw_logos: false,
    ratings_badge_alpha: 0,
    ratings_badge_tone: 0,
    ratings_colorize_all: true,
    ratings_rate_border: false
  };

  var currentRatingsData = null;

  function getCardType(card) {
    var type = card.media_type || card.type;
    if (type === 'movie' || type === 'tv') return type;
    return card.name || card.original_name ? 'tv' : 'movie';
  }

  function iconImg(url, alt) {
    return '<img src="' + url + '" alt="' + (alt || '') + '">';
  }

  function getPrimaryRateLine(render){
    if (!render || !render.length) return $();
    var $nativeRate = render.find('.full-start__rate, .rate--imdb, .rate--tmdb, .rate--kp').first();
    if ($nativeRate.length && $nativeRate.parent().length) return $nativeRate.parent();

    var $left = $('.cardify__left .full-start-new__rate-line:not([data-lmp-fake]), .cardify__left .full-start__rate-line:not([data-lmp-fake])', render).first();
    if ($left.length) return $left;
    var $any = $('.full-start-new__rate-line:not([data-lmp-fake]), .full-start__rate-line:not([data-lmp-fake])', render).first();
    return $any;
  }

  function cleanupRtgInjected(render){
    if (!render || !render.length) return;
    var rateLine = getPrimaryRateLine(render);
    rateLine.find('.full-start__rate, .rate--imdb, .rate--tmdb, .rate--kp, .b-rating').not('.lmp-custom-rate').remove();
    rateLine.find('.lmp-custom-rate').remove(); 
  }

  function lmpToast(msg) {
    try {
      if (Lampa && typeof Lampa.Noty === 'function') return Lampa.Noty(msg);
      if (Lampa && Lampa.Noty && Lampa.Noty.show) return Lampa.Noty.show(msg);
    } catch (e) {}
  }

  function lmpRatingsClearCache() {
    Lampa.Storage.set(RATING_CACHE_KEY, {});
    lmpToast('Кеш рейтингів MDBList успішно очищено');
  }

  function fetchMdbListRatings(card, callback) {
    var rawKeys = LMP_ENH_CONFIG.apiKeys.mdblist;
    var keys = rawKeys.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
    
    if (keys.length === 0) return callback(null);

    var currentKeyIndex = 0;

    function makeRequest() {
      var key = keys[currentKeyIndex];
      var typeSegment = (card.type === 'tv') ? 'show' : card.type;
      var url = 'https://api.mdblist.com/tmdb/' + typeSegment + '/' + card.id + '?apikey=' + encodeURIComponent(key);

      var network = new Lampa.Reguest();
      network.silent(url, function(response) {
        if (response) {
          handleSuccess(response);
        } else {
          tryNextKey();
        }
      }, function(error) {
        tryNextKey();
      });
    }

    function tryNextKey() {
      currentKeyIndex++;
      if (currentKeyIndex < keys.length) {
        makeRequest();
      } else {
        callback(null);
      }
    }

    function handleSuccess(response) {
      var res = {
        mdblist: null, imdb: null, tmdb: null, trakt: null,
        letterboxd: null, metacritic: null,
        rottentomatoes: null, popcorn: null, mal: null
      };

      var mdbScore = response.score;
      if (mdbScore) {
          var normMdb = parseFloat(mdbScore);
          if (normMdb > 10) normMdb = normMdb / 10;
          res.mdblist = { display: normMdb.toFixed(1), avg: normMdb, votes: response.score_votes || 0, fresh: normMdb >= 6.0 };
      }

      if (!response.ratings || !response.ratings.length) {
          if (res.mdblist) return callback(res);
          return callback(null);
      }

      response.ratings.forEach(function(r) {
        var src = (r.source || '').toLowerCase();
        var valText = String(r.value || '').replace(/[^0-9.]/g, '');
        var val = parseFloat(valText);
        if (isNaN(val)) return;
        var normalized = val;
        
        if (src === 'letterboxd') { normalized = val * 2; } 
        else if (val > 10) { normalized = val / 10; }

        normalized = Math.max(0, Math.min(10, normalized));
        var displayVal = normalized.toFixed(1);
        var item = { display: displayVal, avg: normalized, votes: r.votes || 0, fresh: normalized >= 6.0 };

        if (src === 'imdb') res.imdb = item;
        else if (src === 'tmdb') res.tmdb = item;
        else if (src === 'trakt') res.trakt = item;
        else if (src === 'letterboxd') res.letterboxd = item;
        else if (src.indexOf('metacritic') !== -1 && src.indexOf('user') === -1) res.metacritic = item;
        else if (src.indexOf('rotten') !== -1 || src.indexOf('tomato') !== -1) res.rottentomatoes = item;
        else if (src.indexOf('popcorn') !== -1 || src.indexOf('audience') !== -1) res.popcorn = item;
        else if (src.indexOf('myanimelist') !== -1 || src === 'mal') res.mal = item;
      });

      callback(res);
    }
    makeRequest();
  }

  function formatVotes(num) {
    if (!num) return '';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  }

  function insertRatings(data) {
    var render = Lampa.Activity.active().activity.render();
    if (!render) return;

    var rateLine = getPrimaryRateLine(render);
    if (!rateLine.length) return;
    
    rateLine.css({'flex-wrap': 'wrap', 'align-items': 'center'});
    cleanupRtgInjected(render);

    var cfg = getCfg();
    var elementsToInsert = [];

    cfg.sourcesConfig.forEach(function(src) {
      if (!src.enabled || !data[src.id]) return;
      var itemData = data[src.id];
      var iconUrl = (cfg.bwLogos && ICONS_BW[src.id]) ? ICONS_BW[src.id] : ICONS[src.id];
      
      if (src.id === 'rottentomatoes') { iconUrl = cfg.bwLogos ? (itemData.fresh ? ICONS_BW.rotten_good : ICONS_BW.rotten_bad) : (itemData.fresh ? ICONS.rotten_good : ICONS.rotten_bad); }
      if (src.id === 'popcorn' && itemData.avg < 6) { iconUrl = cfg.bwLogos ? ICONS_BW.popcorn_bad : ICONS.popcorn_bad; }

      var colorClass = '';
      if (cfg.colorizeAll) {
          if (itemData.avg >= 7.5) colorClass = 'lmp-color-green';
          else if (itemData.avg >= 6.0) colorClass = 'lmp-color-blue';
          else if (itemData.avg >= 4.0) colorClass = 'lmp-color-orange';
          else colorClass = 'lmp-color-red';
      }
      
      var votesHtml = (cfg.showVotes && itemData.votes) ? '<span class="rate--votes">' + formatVotes(itemData.votes) + '</span>' : '';
      var dirClass = (cfg.textPosition === 'right') ? 'lmp-dir-left' : 'lmp-dir-right';

      var cont = $(
        '<div class="lmp-custom-rate lmp-rate-' + src.id + ' ' + dirClass + '">' +
            '<div class="source--name" title="' + src.name + '">' + iconImg(iconUrl, src.name) + '</div>' +
            '<div class="rate--text-block">' + 
                '<span class="rate--value ' + colorClass + '">' + itemData.display + '</span>' + 
                votesHtml + 
            '</div>' +
        '</div>'
      );
      elementsToInsert.push(cont);
    });

    if (elementsToInsert.length > 0) rateLine.prepend(elementsToInsert);
  }

  function fetchAdditionalRatings(card) {
    var render = Lampa.Activity.active().activity.render();
    if (!render) return;

    var cfg = getCfg();
    refreshConfigFromStorage();
    
    var normalizedCard = { id: card.id, type: getCardType(card) };
    var cacheKey = normalizedCard.type + '_' + normalizedCard.id;
    var cacheTimeMs = cfg.cacheDays * 24 * 60 * 60 * 1000;
    
    var cache = Lampa.Storage.get(RATING_CACHE_KEY) || {};
    var cachedItem = cache[cacheKey];
    
    if (cachedItem && (Date.now() - cachedItem.timestamp < cacheTimeMs) && cachedItem.data) {
      currentRatingsData = cachedItem.data;
      insertRatings(currentRatingsData);
      applyStylesToAll();
      $('#lmp-search-loader', render).remove();
      return;
    }

    var rateLine = getPrimaryRateLine(render);
    if (rateLine.length && !$('#lmp-search-loader', render).length) {
      rateLine.css({'flex-wrap': 'wrap', 'align-items': 'center'});
      rateLine.prepend('<div id="lmp-search-loader" class="loading-dots-container"><div class="loading-dots__text">MDBList...</div><div class="loading-dots__dot"></div><div class="loading-dots__dot"></div></div>');
    }

    fetchMdbListRatings(normalizedCard, function(res) {
      $('#lmp-search-loader', render).remove();
      if (res) {
        currentRatingsData = res;
        cache[cacheKey] = { timestamp: Date.now(), data: res };
        Lampa.Storage.set(RATING_CACHE_KEY, cache);
        
        // Прямий міст в OMDb (кешуємо IMDb рейтинг, якщо він є)
        if (res.imdb && res.imdb.display) {
            try {
                var omdbKey = 'omdb_ratings_cache';
                var omdbCache = JSON.parse(localStorage.getItem(omdbKey) || '{}');
                var ttlDays = parseInt(Lampa.Storage.get('omdb_cache_days', '7')) || 7;
                omdbCache[cacheKey] = {
                    rating: res.imdb.display,
                    timestamp: Date.now() + (ttlDays * 24 * 60 * 60 * 1000)
                };
                localStorage.setItem(omdbKey, JSON.stringify(omdbCache));
            } catch (e) {}
        }
        
        insertRatings(currentRatingsData);
        applyStylesToAll();
      }
    });
  }
  /*
  |==========================================================================
  | ЧАСТИНА 3: РЕАКТИВНИЙ СКАНЕР ПОСТЕРІВ (OMDb / TMDb)
  |==========================================================================
  */
  var retryStates = {};

  function fetchOmdbRating(cacheKey, cardData, type, tmdbId) {
    var k1 = Lampa.Storage.get('omdb_api_key_1', '').trim();
    var k2 = Lampa.Storage.get('omdb_api_key_2', '').trim();
    if (!k1 && !k2) return;

    if (retryStates[cacheKey] > 2) return; 
    retryStates[cacheKey] = (retryStates[cacheKey] || 0) + 1;

    var ttlDays = parseInt(Lampa.Storage.get('omdb_cache_days', '7')) || 7;
    var expTime = Date.now() + (ttlDays * 24 * 60 * 60 * 1000);

    function saveCache(val) {
      try {
        var c = JSON.parse(localStorage.getItem('omdb_ratings_cache') || '{}');
        c[cacheKey] = { rating: val, timestamp: expTime };
        localStorage.setItem('omdb_ratings_cache', JSON.stringify(c));
      } catch(e){}
    }

    function reqOmdb(imdbId, key, fallbackKey) {
      if (!key) return;
      var url = 'https://www.omdbapi.com/?apikey=' + encodeURIComponent(key) + '&i=' + encodeURIComponent(imdbId);
      var net = new Lampa.Reguest();
      net.silent(url, function(res) {
        if (res && res.imdbRating && res.imdbRating !== 'N/A') {
          saveCache(res.imdbRating);
        } else if (res && res.Response === 'False' && res.Error && res.Error.indexOf('limit') !== -1 && fallbackKey) {
          reqOmdb(imdbId, fallbackKey, null);
        } else {
          saveCache('N/A');
        }
      }, function() { saveCache('N/A'); });
    }

    var imdb_id = cardData.imdb_id || (cardData.external_ids ? cardData.external_ids.imdb_id : null);
    if (imdb_id) {
      reqOmdb(imdb_id, k1 || k2, (k1 && k2) ? k2 : null);
    } else if (window.Lampa && Lampa.Network && Lampa.TMDB) {
      var extUrl = Lampa.TMDB.api(type + '/' + tmdbId + '/external_ids?api_key=' + Lampa.TMDB.key());
      var net = new Lampa.Reguest();
      net.silent(extUrl, function(res) {
        if (res && res.imdb_id) reqOmdb(res.imdb_id, k1 || k2, (k1 && k2) ? k2 : null);
        else saveCache('N/A');
      }, function() { saveCache('N/A'); });
    } else {
      saveCache('N/A');
    }
  }

  function pollOmdbCards() {
    if (Lampa.Storage.field('omdb_status') === false) {
      $('.lmp-poster-badge').remove();
      setTimeout(pollOmdbCards, 500);
      return;
    }

    var source = Lampa.Storage.get('omdb_poster_source', 'imdb');
    var sizeSetting = parseInt(Lampa.Storage.get('omdb_poster_size', '0')) || 0;
    var scaleEm = 1 + (sizeSetting * 0.15); // Крок масштабування: 0=1em, 1=1.15em, 2=1.3em...
    var badgeStyle = 'font-size: ' + scaleEm + 'em;';

    $('.card').each(function() {
      var $card = $(this);
      var idRaw = $card.attr('data-id') || $card.data('id');
      if (!idRaw) return;

      var cardData = $card[0].data || $card[0].card || $card.data('card') || $card.data() || {};
      var type = 'movie';
      var href = $card.attr('href') || '';
      if (href.indexOf('/tv/') !== -1 || cardData.name || cardData.original_name || cardData.media_type === 'tv') {
        type = 'tv';
      }

      var cacheKey = type + '_' + idRaw;
      var existingBadge = $card.find('.lmp-poster-badge');

      if (source === 'tmdb') {
        var va = parseFloat(cardData.vote_average || 0);
        if (va > 0) {
          var displayVa = va.toFixed(1);
          if (existingBadge.length) {
            if (existingBadge.attr('data-val') !== displayVa || existingBadge.attr('data-src') !== 'tmdb') {
              existingBadge.remove();
            } else {
              existingBadge.attr('style', badgeStyle);
              return;
            }
          }
          var htmlTmdb = '<div class="lmp-poster-badge" data-src="tmdb" data-val="' + displayVa + '" style="' + badgeStyle + '">' +
                           '<span>' + displayVa + '</span>' +
                           '<img src="' + ICONS.tmdb_poster + '" alt="TMDb">' +
                         '</div>';
          $card.find('.card__view, .card__img').first().append(htmlTmdb);
        } else if (existingBadge.length) { existingBadge.remove(); }
      } 
      else {
        // Логіка IMDb
        var omdbCache = JSON.parse(localStorage.getItem('omdb_ratings_cache') || '{}');
        var cached = omdbCache[cacheKey];
        var now = Date.now();

        if (cached && cached.timestamp > now) {
          if (cached.rating && cached.rating !== 'N/A') {
            if (existingBadge.length) {
              if (existingBadge.attr('data-val') !== cached.rating || existingBadge.attr('data-src') !== 'imdb') {
                existingBadge.remove();
              } else {
                existingBadge.attr('style', badgeStyle);
                return;
              }
            }
            var htmlImdb = '<div class="lmp-poster-badge" data-src="imdb" data-val="' + cached.rating + '" style="' + badgeStyle + '">' +
                             '<span>' + cached.rating + '</span>' +
                             '<img src="' + ICONS.imdb + '" alt="IMDb">' +
                           '</div>';
            $card.find('.card__view, .card__img').first().append(htmlImdb);
          } else if (existingBadge.length) { existingBadge.remove(); }
        } else {
          if (!existingBadge.length && !$card.attr('data-omdb-fetching')) {
            $card.attr('data-omdb-fetching', 'true');
            fetchOmdbRating(cacheKey, cardData, type, idRaw);
          }
        }
      }
    });

    setTimeout(pollOmdbCards, 500);
  }
  /*
  |==========================================================================
  | ЧАСТИНА 4: НАЛАШТУВАННЯ ТА ІНІЦІАЛІЗАЦІЯ
  |==========================================================================
  */
  function openSourcesEditor() {
    var cfg = getCfg();
    var currentOrder = JSON.parse(JSON.stringify(cfg.sourcesConfig));
    var listContainer = $('<div class="menu-edit-list" style="padding-bottom:10px;"></div>');
    
    var svgUp = '<svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12L11 3L20 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
    var svgDown = '<svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L11 11L20 2" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
    var svgCheck = '<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.89111" y="1.78369" width="21.793" height="21.793" rx="3.5" stroke="currentColor" stroke-width="3"/><path d="M7.44873 12.9658L10.8179 16.3349L18.1269 9.02588" stroke="currentColor" stroke-width="3" class="dot" stroke-linecap="round"/></svg>';

    function updateArrowsState() {
      var items = listContainer.find('.source-item');
      items.each(function(idx) {
        $(this).find('.move-up').css('opacity', idx === 0 ? '0.2' : '1');
        $(this).find('.move-down').css('opacity', idx === items.length - 1 ? '0.2' : '1');
      });
    }

    currentOrder.forEach(function(src) {
      var opacityState = src.enabled ? '1' : '0.4';
      var itemHtml = '<div class="source-item" data-id="' + src.id + '" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid rgba(255,255,255,0.1);">' +
          '<div class="source-name" style="font-size:16px; opacity: ' + opacityState + '; transition: opacity 0.2s;">' + src.name + '</div>' +
          '<div style="display:flex; gap:10px; align-items:center;">' +
            '<div class="move-up selector" style="padding:6px 12px; border-radius:6px; cursor:pointer;">' + svgUp + '</div>' +
            '<div class="move-down selector" style="padding:6px 12px; border-radius:6px; cursor:pointer;">' + svgDown + '</div>' +
            '<div class="toggle selector" style="padding:4px; border-radius:6px; cursor:pointer; margin-left:8px;">' + svgCheck + '</div>' +
          '</div>' +
        '</div>';
        
      var itemSort = $(itemHtml);
      itemSort.find('.dot').attr('opacity', src.enabled ? 1 : 0);

      itemSort.find('.move-up').on('hover:enter', function() {
        var prevItem = itemSort.prev('.source-item');
        if (prevItem.length) {
          itemSort.insertBefore(prevItem);
          updateArrowsState();
        }
      });

      itemSort.find('.move-down').on('hover:enter', function() {
        var nextItem = itemSort.next('.source-item');
        if (nextItem.length) {
          itemSort.insertAfter(nextItem);
          updateArrowsState();
        }
      });

      itemSort.find('.toggle').on('hover:enter', function() {
        src.enabled = !src.enabled; 
        itemSort.find('.source-name').css('opacity', src.enabled ? '1' : '0.4');
        itemSort.find('.dot').attr('opacity', src.enabled ? 1 : 0);
      });

      listContainer.append(itemSort);
    });

    updateArrowsState();

    Lampa.Modal.open({
      title: 'Сортування та видимість',
      html: listContainer,
      size: 'small',
      scroll_to_center: true,
      onBack: function() {
        var finalOrder = [];
        listContainer.find('.source-item').each(function() {
          var id = $(this).attr('data-id');
          var originalSrc = currentOrder.find(function(s) { return s.id === id; });
          if (originalSrc) finalOrder.push({ id: originalSrc.id, name: originalSrc.name, enabled: originalSrc.enabled });
        });

        Lampa.Storage.set('ratings_sources_config', finalOrder);
        Lampa.Modal.close();
        Lampa.Controller.toggle('settings_component');
        
        setTimeout(function() { 
          if (typeof currentRatingsData !== 'undefined' && currentRatingsData) { 
            insertRatings(currentRatingsData); applyStylesToAll(); 
          } 
        }, 150);
      }
    });
  }

  function addSettingsSection() {
    if (window.lmp_ratings_add_param_ready) return;
    window.lmp_ratings_add_param_ready = true;

    // Приховуємо підменю постерів з головного списку Лампи
    $('body').append('<style>div[data-component="omdb_ratings"] { display: none !important; }</style>');

    // --- РІВЕНЬ 1: ГОЛОВНЕ ВІКНО "РЕЙТИНГИ MDBLIST" ---
    Lampa.SettingsApi.addComponent({ 
      component: 'lmp_ratings', name: 'Рейтинги MDBList', 
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l3.09 6.26L22 10.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 15.14l-5-4.87 6.91-1.01L12 3z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>' 
    });
    
    Lampa.SettingsApi.addParam({ 
      component: 'lmp_ratings', param: { name: 'lmp_poster_submenu_btn', type: 'static' }, 
      field: { name: 'Рейтинг на постері', description: 'Відображення рейтингу в каталозі' }, 
      onRender: function(item) { item.on('hover:enter click', function() { Lampa.Settings.create('omdb_ratings'); }); }
    });
    
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_mdblist_key', type: 'input', values: '', "default": RCFG_DEFAULT.ratings_mdblist_key }, field: { name: 'MDBList API key', description: '' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { type: 'button', name: 'lmp_edit_sources_btn' }, field: { name: 'Налаштувати джерела', description: 'Зміна порядку та видимості рейтингів' }, onChange: function() { openSourcesEditor(); }, onRender: function() {} });
    
    var textPosValuesMap = { 'left': 'Зліва', 'right': 'Справа' };
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_text_position', type: 'select', values: textPosValuesMap, "default": 'right' }, field: { name: 'Розташування оцінки', description: 'Розміщення оцінки відносно логотипу' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_show_votes', type: 'trigger', values: '', "default": RCFG_DEFAULT.ratings_show_votes }, field: { name: 'Кількість голосів', description: 'Показувати кількість тих, хто проголосував' }, onRender: function() {} });

    var logoScaleValuesMap = { 's_m2': '-2', 's_m1': '-1', 's_0': '0', 's_p1': '1', 's_p2': '2', 's_p3': '3', 's_p4': '4' };
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_logo_scale_val', type: 'select', values: logoScaleValuesMap, "default": 's_0' }, field: { name: 'Розмір логотипів', description: 'Збільшення або зменшення іконок' }, onRender: function() {} });
    
    var textScaleValuesMap = { 's_m2': '-2', 's_m1': '-1', 's_0': '0', 's_p1': '1', 's_p2': '2' };
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_text_scale_val', type: 'select', values: textScaleValuesMap, "default": 's_0' }, field: { name: 'Розмір оцінки', description: 'Збільшення або зменшення цифр та голосів' }, onRender: function() {} });
    
    var spacingValuesMap =   { 's_m2': '-2', 's_m1': '-1', 's_0': '0', 's_p1': '1', 's_p2': '2' };
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_spacing_val', type: 'select', values: spacingValuesMap, "default": 's_0' }, field: { name: 'Відступи між рейтингами', description: 'Зміна відстані між плитками рейтингів' }, onRender: function() {} });
    
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_bw_logos', type: 'trigger', values: '', "default": RCFG_DEFAULT.ratings_bw_logos }, field: { name: 'Ч/Б логотипи', description: 'Підміна на чорно-білі іконки' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_colorize_all', type: 'trigger', values: '', "default": RCFG_DEFAULT.ratings_colorize_all }, field: { name: 'Кольорові оцінки рейтингів', description: 'Забарвлювати цифри залежно від оцінки' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_rate_border', type: 'trigger', values: '', "default": RCFG_DEFAULT.ratings_rate_border }, field: { name: 'Рамка плиток рейтингів', description: 'Відображати напівпрозору рамку навколо кожного рейтингу' }, onRender: function() {} });
    
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { name: 'ratings_cache_days', type: 'input', values: '', "default": RCFG_DEFAULT.ratings_cache_days }, field: { name: 'Термін зберігання кешу (MDBList)', description: 'Кількість днів' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'lmp_ratings', param: { type: 'button', name: 'lmp_clear_cache_btn' }, field: { name: 'Очистити кеш рейтингів', description: '' }, onChange: function() { lmpRatingsClearCache(); }, onRender: function() {} });

    // --- РІВЕНЬ 2: ПІДМЕНЮ "РЕЙТИНГ НА ПОСТЕРІ" (OMDB/TMDB) ---
    Lampa.SettingsApi.addComponent({ component: 'omdb_ratings', name: 'Рейтинг на постері', icon: '' });

    Lampa.SettingsApi.addParam({ 
        component: 'omdb_ratings', param: { name: 'omdb_ratings_back', type: 'static' }, 
        field: { name: 'Назад', description: 'Повернутися до основних налаштувань плагіна' }, 
        onRender: function(item) { item.on('hover:enter click', function() { Lampa.Settings.create('lmp_ratings'); }); }
    });
    
    Lampa.SettingsApi.addParam({ component: 'omdb_ratings', param: { name: 'omdb_status', type: 'trigger', values: '', "default": true }, field: { name: 'Рейтинг на постері', description: 'Відображати плашку з оцінкою' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'omdb_ratings', param: { name: 'omdb_poster_source', type: 'select', values: { 'imdb': 'IMDb', 'tmdb': 'TMDb' }, "default": 'imdb' }, field: { name: 'Джерело рейтингу', description: 'Вибір джерела оцінки для постерів' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'omdb_ratings', param: { name: 'omdb_poster_size', type: 'select', values: { '0': '0', '1': '1', '2': '2', '3': '3', '4': '4' }, "default": '0' }, field: { name: 'Розмір рейтингу', description: 'Зміна розміру плашки з рейтингом' }, onRender: function() {} });
    
    Lampa.SettingsApi.addParam({ component: 'omdb_ratings', param: { name: 'omdb_api_key_1', type: 'input', values: '', "default": '' }, field: { name: 'OMDb API key 1', description: 'Основний ключ OMDb' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'omdb_ratings', param: { name: 'omdb_api_key_2', type: 'input', values: '', "default": '' }, field: { name: 'OMDb API key 2', description: 'Резервний ключ на випадок вичерпання ліміту' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'omdb_ratings', param: { name: 'omdb_cache_days', type: 'input', values: '', "default": '7' }, field: { name: 'Термін зберігання кешу (OMDb)', description: 'Кількість днів' }, onRender: function() {} });
    Lampa.SettingsApi.addParam({ component: 'omdb_ratings', param: { type: 'button', name: 'omdb_clear_cache_btn' }, field: { name: 'Очистити кеш постерів', description: '' }, onChange: function() { 
        localStorage.removeItem('omdb_ratings_cache'); 
        try { retryStates = {}; } catch(e){} 
        lmpToast('Кеш рейтингів постерів очищено'); 
    }, onRender: function() {} });

    Lampa.Listener.follow('settings', function(e) {
        if (e.type === 'create' && e.name === 'omdb_ratings') {
            setTimeout(function() {
                if (Lampa.Controller.active() && Lampa.Controller.active().name === 'settings_component') {
                    Lampa.Controller.active().onBack = function() { Lampa.Settings.create('lmp_ratings'); };
                }
            }, 500);
        }
    });
  }

  function initRatingsPluginUI() {
    addSettingsSection();
    var _set = Lampa.Storage.set;
    Lampa.Storage.set = function(k, v) {
      var out = _set.apply(this, arguments);
      if (typeof k === 'string' && k.indexOf('ratings_') === 0 && k !== 'ratings_sources_config') {
        setTimeout(function(){ if(currentRatingsData) insertRatings(currentRatingsData); applyStylesToAll(); }, 150);
      }
      return out;
    };
    applyStylesToAll();
  }

  function startPlugin() {
    window.combined_ratings_plugin = true;
    Lampa.Listener.follow('full', function(e) {
      if (e.type === 'complite') setTimeout(function() { fetchAdditionalRatings(e.data.movie || e.object || {}); }, 500);
    });
    if (typeof pollOmdbCards === 'function') pollOmdbCards();
  }

  $('body').append(pluginStyles);
  initRatingsPluginUI();
  refreshConfigFromStorage();
  
  if (!window.combined_ratings_plugin) startPlugin();

})();
