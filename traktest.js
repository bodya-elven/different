(function () {
  'use strict';

  /**
   * Генерує зображення з текстом за допомогою Canvas API.
   * @param {string} text - Текст для відображення на зображенні.
   * @returns {string} - URL зображення у форматі data:image/png;base64.
   */
  function textToImage(text) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let width = 400;
    let height = 600;
    canvas.width = width;
    canvas.height = height;

    // Фон
    context.fillStyle = '#1a202c'; // Темно-сірий фон
    context.fillRect(0, 0, width, height);

    // Налаштування тексту
    context.fillStyle = '#ffffff'; // Білий колір тексту
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Розбивка тексту на рядки
    let words = text.split(' ');
    let lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      let word = words[i];
      let testLine = currentLine + ' ' + word;
      let metrics = context.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > width - 40 && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Відображення тексту
    let lineHeight = 58;
    let startY = (height - lines.length * lineHeight) / 2 + lineHeight / 2;
    lines.forEach(function (line, index) {
      context.fillText(line, width / 2, startY + index * lineHeight);
    });
    return canvas.toDataURL('image/png');
  }

  const CLIENT_ID = 'a77093dcf5db97106d9303f3ab7d46a80a93a6e0c1d7a2ff8a1aacebe0dc161b';
  const CLIENT_SECRET = 'a8cf25070f8c9a609782deecf56197f99e96084b080c1c86fccf9dc682465f1b';
  const API_URL = 'https://proxy.lme.isroot.in/https://api.trakt.tv';
  const TOKEN_EXPIRY_SKEW_MS = 2 * 60 * 1000;
  const DEVICE_AUTH_STALE_MS = 20 * 60 * 1000;

  function getStorageNumber(name) {
    let value = Number(Lampa.Storage.get(name));
    return Number.isFinite(value) ? value : null;
  }

  function clearTokenExpiryMeta() {
    Lampa.Storage.set('trakt_token_created_at', null);
    Lampa.Storage.set('trakt_token_expires_in', null);
    Lampa.Storage.set('trakt_token_expires_at', null);
  }

  function clearAuthStorage() {
    Lampa.Storage.set('trakt_token', null);
    Lampa.Storage.set('trakt_refresh_token', null);
    clearTokenExpiryMeta();
    Lampa.Storage.set('trakt_active_device_auth', false);
    Lampa.Storage.set('trakt_active_device_auth_started_at', null);
  }

  function saveTokens(response = {}) {
    if (!response || typeof response !== 'object') return;
    
    if (response.access_token) {
      Lampa.Storage.set('trakt_token', response.access_token);
    }
    if (response.refresh_token) {
      Lampa.Storage.set('trakt_refresh_token', response.refresh_token);
    }
    
    let expiresIn = Number(response.expires_in);
    let createdAt = Number(response.created_at) || Math.floor(Date.now() / 1000);
    
    if (Number.isFinite(expiresIn) && expiresIn > 0) {
      let expiresAt = createdAt * 1000 + expiresIn * 1000;
      Lampa.Storage.set('trakt_token_created_at', createdAt);
      Lampa.Storage.set('trakt_token_expires_in', expiresIn);
      Lampa.Storage.set('trakt_token_expires_at', expiresAt);
    } else if (response.access_token || response.refresh_token) {
      clearTokenExpiryMeta();
    }
  }

  function getTokenExpiryMeta() {
    let createdAt = getStorageNumber('trakt_token_created_at');
    let expiresIn = getStorageNumber('trakt_token_expires_in');
    let expiresAt = getStorageNumber('trakt_token_expires_at');
    if (!expiresAt && createdAt && expiresIn) {
      expiresAt = createdAt * 1000 + expiresIn * 1000;
      Lampa.Storage.set('trakt_token_expires_at', expiresAt);
    }
    return { createdAt, expiresIn, expiresAt };
  }

  function isTokenExpiringSoon({ skewMs = TOKEN_EXPIRY_SKEW_MS } = {}) {
    let { expiresAt } = getTokenExpiryMeta();
    if (!expiresAt || expiresAt <= 0) return true;
    return Date.now() + skewMs >= expiresAt;
  }

  function isDeviceAuthActive() {
    if (Lampa.Storage.get('trakt_active_device_auth') !== true) return false;
    
    let startedAt = getStorageNumber('trakt_active_device_auth_started_at');
    let now = Date.now();
    let isStale = !startedAt || now - startedAt > DEVICE_AUTH_STALE_MS;
    
    if (isStale) {
      Lampa.Storage.set('trakt_active_device_auth', false);
      Lampa.Storage.set('trakt_active_device_auth_started_at', null);
      if (Lampa.Storage.field('trakt_enable_logging')) {
        console.warn('TraktTV', 'Device auth flag was stale and has been reset.');
      }
      return false;
    }
    return true;
  }

  function getImageUrl(media, type = 'poster') {
    let imageSet = media.images && media.images[type];
    let imageUrl = '';
    if (imageSet) {
      if (typeof imageSet === 'object' && !Array.isArray(imageSet)) {
        imageUrl = imageSet.medium || imageSet.thumb || imageSet.full || '';
      } else if (Array.isArray(imageSet) && imageSet.length > 0) {
        imageUrl = imageSet[0];
      } else if (typeof imageSet === 'string') {
        imageUrl = imageSet;
      }
    }
    if (imageUrl && !imageUrl.startsWith('http')) {
      return 'https://' + imageUrl.replace(/^\/+/, '');
    }
    return imageUrl;
  }

  function addToHistory$1(data, mode = null) {
    let body = { movies: [], shows: [] };

    if (data.episodes) {
      body.shows.push({
        ids: data.ids || {},
        seasons: [{
          number: data.season_number || 1,
          episodes: data.episodes.map(ep => ({
            number: ep.number,
            watched_at: ep.watched_at || new Date().toISOString()
          }))
        }]
      });
      return requestApi('POST', '/sync/history', body);
    }

    if (data.method === 'movie') {
      if (!data.id) return Promise.reject(new Error(Lampa.Lang.translate('trakttv_movie_id_missed')));
      
      body.movies.push({
        ids: { tmdb: data.id },
        watched_at: new Date().toISOString()
      });
      return requestApi('POST', '/sync/history', body);
    } 
    else if (data.method === 'show' || data.method === 'tv') {
      if (!data.id) return Promise.reject(new Error(Lampa.Lang.translate('trakttv_show_id_missed')));

      if (mode === 'all') {
        body.shows.push({
          ids: data.ids || { tmdb: data.id },
          watched_at: new Date().toISOString()
        });
        return requestApi('POST', '/sync/history', body);
      } else if (mode === 'last_season' || mode === 'last_episode') {
        return getShowHistory(data.id, data.ids?.trakt).then(historyData => {
          return getShowInfo(data.id, data.ids?.trakt).then(showInfo => {
            let lastSeason = showInfo.last_season || data.season || 1;
            let watchedEpisodes = {};
            
            if (historyData && historyData.length > 0) {
              historyData.forEach(item => {
                if (item.episode) {
                  let s = item.episode.season;
                  let e = item.episode.number;
                  if (!watchedEpisodes[s]) watchedEpisodes[s] = [];
                  if (!watchedEpisodes[s].includes(e)) watchedEpisodes[s].push(e);
                }
              });
            }

            let seasonUrl = Lampa.TMDB.api('tv/' + data.id + '/season/' + lastSeason + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'ru'));
            
            return new Promise((resolve, reject) => {
              let network = new Lampa.Reguest();
              network.silent(seasonUrl, seasonData => {
                if (seasonData && seasonData.episodes && seasonData.episodes.length > 0) {
                  let allEpisodes = seasonData.episodes.map(e => e.episode_number).sort((a, b) => a - b);
                  let unwatchedEpisodes = allEpisodes.filter(e => !watchedEpisodes[lastSeason] || !watchedEpisodes[lastSeason].includes(e));
                  
                  if (mode === 'last_episode' && unwatchedEpisodes.length > 0) {
                    body.shows.push({
                      ids: data.ids || { tmdb: data.id },
                      seasons: [{
                        number: lastSeason,
                        episodes: [{ number: unwatchedEpisodes[0], watched_at: new Date().toISOString() }]
                      }]
                    });
                  } else if (mode === 'last_season' && unwatchedEpisodes.length > 0) {
                    body.shows.push({
                      ids: data.ids || { tmdb: data.id },
                      seasons: [{
                        number: lastSeason,
                        episodes: unwatchedEpisodes.map(e => ({ number: e, watched_at: new Date().toISOString() }))
                      }]
                    });
                  } else {
                    body.shows.push({
                      ids: data.ids || { tmdb: data.id },
                      seasons: [{ number: lastSeason, watched_at: new Date().toISOString() }]
                    });
                  }
                  resolve(requestApi('POST', '/sync/history', body));
                } else {
                  body.shows.push({
                    ids: data.ids || { tmdb: data.id },
                    seasons: [{ number: lastSeason, watched_at: new Date().toISOString() }]
                  });
                  resolve(requestApi('POST', '/sync/history', body));
                }
              }, () => {
                body.shows.push({
                  ids: data.ids || { tmdb: data.id },
                  seasons: [{ number: lastSeason, watched_at: new Date().toISOString() }]
                });
                resolve(requestApi('POST', '/sync/history', body));
              });
            });
          });
        }).catch(() => {
          return getShowInfo(data.id, data.ids?.trakt).then(showInfo => {
            let lastSeason = showInfo.last_season || data.season || 1;
            let lastEpisode = showInfo.last_episode || data.episode || 1;
            
            if (mode === 'last_season') {
              body.shows.push({
                ids: data.ids || { tmdb: data.id },
                seasons: [{ number: lastSeason, watched_at: new Date().toISOString() }]
              });
            } else if (mode === 'last_episode') {
              body.shows.push({
                ids: data.ids || { tmdb: data.id },
                seasons: [{
                  number: lastSeason,
                  episodes: [{ number: lastEpisode, watched_at: new Date().toISOString() }]
                }]
              });
            }
            return requestApi('POST', '/sync/history', body);
          });
        });
      } else {
        body.shows.push({
          ids: data.ids || { tmdb: data.id },
          watched_at: new Date().toISOString()
        });
        return requestApi('POST', '/sync/history', body);
      }
    } else {
      return Promise.reject(new Error(Lampa.Lang.translate('trakttv_unknown_content')));
    }
  }

  function getShowInfo(tmdbId, traktId = null) {
    return new Promise((resolve, reject) => {
      if (traktId) {
        requestApi('GET', `/shows/${traktId}?extended=full`).then(showData => {
          if (showData && showData.seasons) {
            let regularSeasons = showData.seasons.filter(s => s.number > 0);
            let lastSeasonData = regularSeasons.length > 0 ? regularSeasons.reduce((prev, current) => (prev.number > current.number ? prev : current)) : null;

            if (lastSeasonData) {
              requestApi('GET', `/shows/${traktId}/seasons/${lastSeasonData.number}?extended=full`).then(seasonData => {
                if (seasonData && seasonData.episodes && seasonData.episodes.length > 0) {
                  let lastEpisodeData = seasonData.episodes.reduce((prev, current) => (prev.number > current.number ? prev : current));
                  resolve({
                    last_season: lastSeasonData.number,
                    last_episode: lastEpisodeData.number,
                    total_seasons: regularSeasons.length,
                    total_episodes: seasonData.episodes.length
                  });
                } else {
                  resolve({ last_season: lastSeasonData.number, last_episode: 1 });
                }
              }).catch(() => resolve({ last_season: lastSeasonData.number, last_episode: 1 }));
            } else {
              resolve({ last_season: 1, last_episode: 1 });
            }
          } else {
            resolve({ last_season: 1, last_episode: 1 });
          }
        }).catch(() => resolve({ last_season: 1, last_episode: 1 }));
        return;
      }

      let url = Lampa.TMDB.api('tv/' + tmdbId + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'ru'));
      let network = new Lampa.Reguest();
      network.silent(url, data => {
        if (data && data.seasons) {
          let regularSeasons = data.seasons.filter(s => s.season_number > 0);
          let lastSeasonData = regularSeasons.length > 0 ? regularSeasons.reduce((prev, current) => (prev.season_number > current.season_number ? prev : current)) : null;

          if (lastSeasonData) {
            let seasonUrl = Lampa.TMDB.api('tv/' + tmdbId + '/season/' + lastSeasonData.season_number + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'ru'));
            network.silent(seasonUrl, seasonData => {
              if (seasonData && seasonData.episodes && seasonData.episodes.length > 0) {
                let lastEpisodeData = seasonData.episodes.reduce((prev, current) => (prev.episode_number > current.episode_number ? prev : current));
                resolve({
                  last_season: lastSeasonData.season_number,
                  last_episode: lastEpisodeData.episode_number,
                  total_seasons: regularSeasons.length,
                  total_episodes: seasonData.episodes.length
                });
              } else {
                resolve({ last_season: lastSeasonData.season_number, last_episode: 1 });
              }
            }, () => resolve({ last_season: lastSeasonData.season_number, last_episode: 1 }));
          } else {
            resolve({ last_season: 1, last_episode: 1 });
          }
        } else {
          resolve({ last_season: 1, last_episode: 1 });
        }
      }, () => resolve({ last_season: 1, last_episode: 1 }));
    });
  }

/* ======================================================== ЧАСТИНА 2 ======================================================== */

  async function refreshTokens({ redirect_uri, reason = 'manual' } = {}) {
    let refresh_token = Lampa.Storage.get('trakt_refresh_token');
    let logging = Lampa.Storage.field('trakt_enable_logging');
    
    if (!refresh_token) {
      if (logging) console.error('TraktTV', 'refreshTokens: No refresh_token found.');
      throw Object.assign(new Error('No refresh_token'), { status: 0, code: 'no_refresh_token' });
    }
    
    if (isDeviceAuthActive()) {
      if (logging) console.warn('TraktTV', 'refreshTokens: skipped because device auth is active', { reason });
      throw Object.assign(new Error('Device auth is active'), { status: 423, code: 'device_auth_active' });
    }
    
    if (logging) console.log('TraktTV', 'refreshTokens:start', { reason });
    
    try {
      let res = await _performRequest('POST', '/oauth/token', {
        refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirect_uri || '',
        grant_type: 'refresh_token'
      }, true);
      
      if (res && res.access_token) {
        saveTokens(res);
        if (logging) console.log('TraktTV', 'refreshTokens: Token refreshed successfully.', { reason });
      }
      return res;
    } catch (error) {
      if (error && (error.status === 400 || error.status === 401)) {
        clearAuthStorage();
      }
      if (logging) console.error('TraktTV', 'refreshTokens: Failed to refresh token:', error);
      throw error;
    }
  }

  let refreshPromise = null;
  function runRefreshFlow(options = {}) {
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshTokens(options).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  async function ensureValidAccessToken({ reason = 'preflight', force = false, skewMs = TOKEN_EXPIRY_SKEW_MS } = {}) {
    let token = Lampa.Storage.get('trakt_token');
    let refreshToken = Lampa.Storage.get('trakt_refresh_token');
    
    if (!refreshToken || isDeviceAuthActive()) return null;
    
    let noAccessToken = !token;
    let shouldRefreshByExpiry = force || isTokenExpiringSoon({ skewMs: Number(skewMs) || TOKEN_EXPIRY_SKEW_MS });
    
    if (!noAccessToken && !shouldRefreshByExpiry) return null;
    
    return runRefreshFlow({ reason });
  }

  async function requestApi(method, url, params = {}, unauthorized = false, retryCount = 0) {
    const MAX_RETRIES = 1; // Обмеження кількості повторних спроб
    let logging = Lampa.Storage.field('trakt_enable_logging');
    
    if (!unauthorized) {
      if (Lampa.Storage.get('trakt_refresh_token')) {
        try {
          await ensureValidAccessToken({ reason: `preflight:${method}:${url}` });
        } catch (e) {
          if (e && (e.status === 400 || e.status === 401)) throw e;
          if (logging) console.warn('TraktTV', 'requestApi: preflight refresh failed, continue with existing token', { method, url, status: e?.status });
        }
      }
    }
    
    try {
      return await _performRequest(method, url, params, unauthorized);
    } catch (error) {
      if (error?.status === 401 && retryCount < MAX_RETRIES) {
        if (logging) console.log('TraktTV', `401 Unauthorized for ${url}. Attempting token refresh and retry.`, { retryCount });
        await runRefreshFlow({ reason: `401:${method}:${url}` });
        return requestApi(method, url, params, false, retryCount + 1);
      }
      throw error;
    }
  }

  function _performRequest(method, url, params = {}, unauthorized = false) {
    return new Promise((resolve, reject) => {
      let network = new Lampa.Reguest();
      let headers = ensureHeaders({ unauthorized });
      let logging = Lampa.Storage.field('trakt_enable_logging');
      let reqUrl = API_URL + url;
      
      let requestParams = {
        timeout: 15000,
        headers: headers,
        type: method,
        dataType: 'json'
      };
      
      let postData = (method === 'POST' || method === 'PUT') ? JSON.stringify(params) : null;
      
      if (logging) {
        try { console.log('TraktTV', 'request', method, url); } catch (e) {}
      }
      
      network.quiet(reqUrl, (data) => {
        if (logging) {
          try { console.log('TraktTV', 'response', method, url, 200); } catch (e) {}
        }
        resolve(data);
      }, (error) => {
        let status = error?.status ? error.status : 0;
        if (logging) {
          try { console.log('TraktTV', 'response', method, url, status, 'Error details:', error); } catch (e) {}
        }
        reject(Object.assign(new Error('TraktTV API Error'), { status, originalError: error || {} }));
      }, postData, requestParams);
    });
  }

  function ensureHeaders({ unauthorized = false } = {}) {
    let headers = {
      'Content-Type': 'application/json',
      'trakt-api-key': CLIENT_ID,
      'trakt-api-version': '2',
      'x-requested-with': 'lme-plugins'
    };
    
    if (!unauthorized) {
      let token = Lampa.Storage.get('trakt_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  function formatTraktResults(items = []) {
    return {
      results: (Array.isArray(items) ? items : []).map(item => {
        let media = item.movie || item.show;
        if (!media || !media.ids) return null;
        return {
          component: 'full',
          id: media.ids.tmdb || media.ids.trakt,
          ids: media.ids,
          title: media.title,
          original_title: media.title,
          release_date: media.year ? String(media.year) : '',
          vote_average: media.rating || 0,
          poster: getImageUrl(media, 'poster'),
          image: getImageUrl(media, 'fanart'),
          method: item.movie ? 'movie' : 'tv',
          card_type: item.movie ? 'movie' : 'tv'
        };
      }).filter(Boolean)
    };
  }

  async function getShowHistory(tmdbId, traktId = null) {
    if (traktId) {
      return await requestApi('GET', `/shows/${traktId}/history`);
    }
    
    let response = await requestApi('GET', `/search/tmdb/${tmdbId}?type=show`);
    if (response && response.length > 0 && response[0].show && response[0].show.ids.trakt) {
      let foundTraktId = response[0].show.ids.trakt;
      return await requestApi('GET', `/sync/history/shows/${foundTraktId}`);
    } else {
      throw new Error('Show not found in Trakt');
    }
  }

  function resolveTraktIds(params = {}) {
    let rawIds = params.ids && Object.keys(params.ids).length ? { ...params.ids } : {};
    let tmdbId = params.id || params.tmdb || params.external_ids?.tmdb_id;
    let traktId = params.external_ids?.trakt_id;
    let imdbId = params.external_ids?.imdb_id || params.imdb;
    
    if (traktId && !rawIds.trakt) rawIds.trakt = traktId;
    if (tmdbId && !rawIds.tmdb) rawIds.tmdb = tmdbId;
    if (imdbId && !rawIds.imdb) rawIds.imdb = imdbId;
    
    return rawIds;
  }

  function normalizeMediaType(params = {}) {
    let method = (params.method || params.type || '').toString().toLowerCase();
    return method === 'movie' ? 'movie' : 'show';
  }

  function buildSyncPayload(params = {}) {
    let ids = resolveTraktIds(params);
    if (!ids || !Object.keys(ids).length) {
      throw new Error('TraktTV media ids are missing');
    }
    return normalizeMediaType(params) === 'movie' 
      ? { movies: [{ ids }], shows: [] } 
      : { movies: [], shows: [{ ids }] };
  }

  function sameAnyId(left = {}, right = {}) {
    if (!left || !right) return false;
    let keys = ['trakt', 'tmdb', 'imdb'];
    for (let key of keys) {
      if (left[key] && right[key] && String(left[key]) === String(right[key])) {
        return true;
      }
    }
    return false;
  }

  function extractMediaFromSyncItem(item = {}) {
    if (item.movie) return { media: item.movie, type: 'movie' };
    if (item.show) return { media: item.show, type: 'show' };
    return { media: null, type: null };
  }
 /* ========================================================
               ЧАСТИНА 3 ======================================================== */

  function normalizeListCardData(item, { likedListIds = [], wide = false, canManage = false } = {}) {
    let list = item && item.list ? item.list : item;
    if (!list) return null;
    
    let ids = list.ids || {};
    let listId = ids.trakt || list.id;
    if (!listId) return null;
    
    let likedIds = Array.isArray(likedListIds) ? likedListIds : [];
    let rawTitle = list.name || list.title || '';
    let title = rawTitle.replace(/^\s*\[\d+\]\s*/, '').trim();
    let description = list.description || '';
    let poster = getImageUrl(list, 'poster') || textToImage(title || rawTitle || 'List');
    let image = getImageUrl(list, 'fanart');
    let cardTitle = wide ? '' : title;
    
    let card = {
      component: 'trakt_list',
      id: listId,
      list_id: listId,
      ids: ids,
      slug: ids.slug || list.slug || '',
      title: cardTitle,
      list_title: title,
      original_title: cardTitle,
      description: description,
      overview: description,
      poster: poster,
      image: image,
      cover: image || poster,
      method: 'list',
      item_count: list.item_count || 0,
      privacy: list.privacy || '',
      display_numbers: !!list.display_numbers,
      allow_comments: !!list.allow_comments,
      updated_at: list.updated_at || list.updated || '',
      can_manage: !!canManage,
      is_liked: likedIds.includes(listId)
    };
    
    if (wide) {
      card.params = { style: { name: 'wide' } };
    }
    return card;
  }

  function formatListCards(items, options = {}) {
    let results = (Array.isArray(items) ? items : [])
      .map(item => normalizeListCardData(item, options))
      .filter(Boolean);
    return { results };
  }

  function sanitizeListPayload(payload = {}) {
    let normalized = {};
    let name = (payload.name || payload.title || '').toString().trim();
    let description = (payload.description || '').toString().trim();
    let privacy = (payload.privacy || '').toString().trim();
    
    if (name) normalized.name = name;
    if (description) normalized.description = description;
    if (privacy) normalized.privacy = privacy;
    if (typeof payload.display_numbers === 'boolean') normalized.display_numbers = payload.display_numbers;
    if (typeof payload.allow_comments === 'boolean') normalized.allow_comments = payload.allow_comments;
    if (typeof payload.sort_by === 'string' && payload.sort_by) normalized.sort_by = payload.sort_by;
    if (typeof payload.sort_how === 'string' && payload.sort_how) normalized.sort_how = payload.sort_how;
    
    return normalized;
  }

  function makePaginationMeta(items, page, limit) {
    let count = Array.isArray(items) ? items.length : 0;
    let total = (page - 1) * limit + count;
    let total_pages = count === limit ? page + 1 : page;
    return { total, total_pages, page };
  }

  function withNoCache(url) {
    let separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}`;
  }

  const api$1 = {
    addToHistory: addToHistory$1,
    
    formatListsResults(items, likedListIds = [], options = {}) {
      try {
        return formatListCards(items, { likedListIds, ...options });
      } catch (error) {
        return { results: [] };
      }
    },
    
    get(url, unauthorized = false) {
      return requestApi('GET', url, {}, unauthorized);
    },
    
    async recommendations(options = {}) {
      let limit = options.limit || 36;
      let page = options.page || 1;
      let fetchLimit = limit * 5; 
      
      try {
        let [moviesResponse, showsResponse] = await Promise.all([
          requestApi('GET', `/recommendations/movies?extended=images&ignore_collected=true&ignore_watchlisted=true&limit=${fetchLimit}`),
          requestApi('GET', `/recommendations/shows?extended=images&ignore_collected=true&ignore_watchlisted=true&limit=${fetchLimit}`)
        ]);
        
        let formattedMovies = moviesResponse.map(movie => ({
          component: 'full',
          id: movie.ids.tmdb,
          ids: movie.ids,
          title: movie.title,
          original_title: movie.title,
          release_date: movie.year ? String(movie.year) : '',
          vote_average: movie.rating || 0,
          poster: getImageUrl(movie, 'poster'),
          method: 'movie',
          card_type: 'movie'
        }));
        
        let formattedShows = showsResponse.map(show => ({
          component: 'full',
          id: show.ids.tmdb,
          ids: show.ids,
          title: show.title,
          original_title: show.title,
          release_date: show.year ? String(show.year) : '',
          vote_average: show.rating || 0,
          poster: getImageUrl(show, 'poster'),
          type: 'tv',
          method: 'tv',
          card_type: 'tv'
        }));
        
        let combinedResults = [...formattedMovies, ...formattedShows];
        
        // Shuffle (перемішування)
        for (let i = combinedResults.length - 1; i > 0; i--) {
          let j = Math.floor(Math.random() * (i + 1));
          [combinedResults[i], combinedResults[j]] = [combinedResults[j], combinedResults[i]];
        }
        
        let total = combinedResults.length;
        let total_pages = Math.max(1, Math.ceil(total / limit));
        let offset = (page - 1) * limit;
        let paginatedResults = combinedResults.slice(offset, offset + limit);
        
        return { results: paginatedResults, total, total_pages, page };
      } catch (error) {
        console.error('TraktTV', error);
        // Fallback: якщо запит серіалів впав, тягнемо тільки фільми
        let response = await requestApi('GET', `/recommendations/movies?extended=images&ignore_collected=true&ignore_watchlisted=true&limit=${fetchLimit}`);
        let formattedResults = response.map(movie => ({
          component: 'full',
          id: movie.ids.tmdb,
          ids: movie.ids,
          title: movie.title,
          original_title: movie.title,
          release_date: movie.year ? String(movie.year) : '',
          vote_average: movie.rating || 0,
          poster: getImageUrl(movie, 'poster'),
          method: 'movie',
          card_type: 'movie'
        }));
        
        let total = formattedResults.length;
        let total_pages = Math.max(1, Math.ceil(total / limit));
        let offset = (page - 1) * limit;
        let paginatedResults = formattedResults.slice(offset, offset + limit);
        
        return { results: paginatedResults, total, total_pages, page };
      }
    },
    
    async watchlist(params) {
      let page = params.page || 1;
      let limit = params.limit || 36;
      let response = await requestApi('GET', '/sync/watchlist/movies,shows/added/asc?extended=images');
      
      let total = response.length;
      let total_pages = Math.max(1, Math.ceil(total / limit));
      let offset = (page - 1) * limit;
      let paginatedResults = response.slice(offset, offset + limit);
      
      let formattedData = formatTraktResults(paginatedResults);
      formattedData.total = total;
      formattedData.total_pages = total_pages;
      formattedData.page = page;
      return formattedData;
    },

    async upnext(params) {
      let logging = Lampa.Storage.field('trakt_enable_logging');
      let page = params.page || 1;
      let limit = params.limit || 36;
      
      let watchedResponse = await requestApi('GET', '/sync/watched/shows?extended=images,full,seasons');
      if (logging) console.log('TraktTV', 'upnext: watchedResponse', watchedResponse);
      
      let watched = Array.isArray(watchedResponse) ? watchedResponse : [];
      let watching = watched.filter(item => {
        if (!item.show || typeof item.show.aired_episodes !== 'number') return false;
        let totalEpisodes = item.show.aired_episodes;
        let watchedEpisodes = 0;
        if (Array.isArray(item.seasons)) {
          item.seasons.forEach(season => {
            if (Array.isArray(season.episodes) && season.number > 0) {
              watchedEpisodes += season.episodes.length;
            }
          });
        }
        return totalEpisodes > watchedEpisodes;
      });
      
      if (logging) console.log('TraktTV', 'upnext: watching (filtered)', watching);
      
      let lastEpisodePromises = watching.map(async (item) => {
        let showId = item.show.ids.trakt;
        let watchedEpisodes = 0;
        if (Array.isArray(item.seasons)) {
          item.seasons.forEach(season => {
            if (Array.isArray(season.episodes) && season.number > 0) {
              watchedEpisodes += season.episodes.length;
            }
          });
        }
        
        try {
          let lastEpisode = await requestApi('GET', `/shows/${showId}/last_episode?extended=full`);
          return {
            component: 'full',
            id: item.show.ids.tmdb || item.show.ids.trakt,
            ids: item.show.ids,
            title: item.show.title,
            original_title: item.show.original_title || item.show.title,
            release_date: item.show.year ? String(item.show.year) : '',
            vote_average: item.show.rating || 0,
            poster: getImageUrl(item.show, 'poster'),
            image: getImageUrl(item.show, 'fanart'),
            method: 'tv',
            trakt_upnext_watched: watchedEpisodes,
            trakt_upnext_total: item.show.aired_episodes,
            trakt_upnext_progress: `${watchedEpisodes}/${item.show.aired_episodes}`,
            status: item.show.status,
            last_aired: lastEpisode?.first_aired || null
          };
        } catch (error) {
          if (logging) console.warn('TraktTV', `Failed to get last episode for show ${item.show.title}:`, error);
          return {
            component: 'full',
            id: item.show.ids.tmdb || item.show.ids.trakt,
            ids: item.show.ids,
            title: item.show.title,
            original_title: item.show.original_title || item.show.title,
            release_date: item.show.year ? String(item.show.year) : '',
            vote_average: item.show.rating || 0,
            poster: getImageUrl(item.show, 'poster'),
            image: getImageUrl(item.show, 'fanart'),
            method: 'tv',
            trakt_upnext_watched: watchedEpisodes,
            trakt_upnext_total: item.show.aired_episodes,
            trakt_upnext_progress: `${watchedEpisodes}/${item.show.aired_episodes}`,
            status: item.show.status,
            last_aired: null
          };
        }
      });
      
      let results = await Promise.all(lastEpisodePromises);
      if (logging) console.log('TraktTV', 'upnext: results (mapped)', results);
      
      results.sort((a, b) => {
        if (!a.last_aired && !b.last_aired) return 0;
        if (!a.last_aired) return 1;
        if (!b.last_aired) return -1;
        return new Date(b.last_aired) - new Date(a.last_aired);
      });
      
      let total = results.length;
      let total_pages = Math.max(1, Math.ceil(total / limit));
      let offset = (page - 1) * limit;
      let paginatedResults = results.slice(offset, offset + limit);
      
      return { results: paginatedResults, total, total_pages, page };
    },

/* ========================================================
             ЧАСТИНА 4 ======================================================== */

    async calendar(params = {}) {
      let page = params.page || 1;
      let limit = params.limit || 36;
      let days = params.days || 31;
      let startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // Починаємо з учорашнього дня
      let dateString = startDate.toISOString().split('T')[0];
      
      let response = await requestApi('GET', `/calendars/my/shows/${dateString}/${days}?extended=images,full`);
      
      let formattedResults = response.map(item => {
        let show = item.show;
        let episode = item.episode;
        if (!show || !show.ids) return null;
        
        let releaseDateStr = item.first_aired ? new Date(item.first_aired).toLocaleDateString() : '';
        let episodeInfo = episode ? `s${String(episode.season).padStart(2, '0')}e${String(episode.number).padStart(2, '0')}` : '';
        let titleInfo = episodeInfo ? `${show.title} (${episodeInfo})` : show.title;
        
        return {
          component: 'full',
          id: show.ids.tmdb || show.ids.trakt,
          ids: show.ids,
          title: titleInfo,
          original_title: show.title,
          release_date: releaseDateStr,
          vote_average: show.rating || 0,
          poster: getImageUrl(show, 'poster'),
          image: getImageUrl(show, 'fanart'),
          method: 'tv',
          card_type: 'tv',
          trakt_calendar_date: item.first_aired,
          episode_title: episode?.title || '',
          episode: episode?.number,
          season: episode?.season
        };
      }).filter(Boolean);
      
      let total = formattedResults.length;
      let total_pages = Math.max(1, Math.ceil(total / limit));
      let offset = (page - 1) * limit;
      let paginatedResults = formattedResults.slice(offset, offset + limit);
      
      return { results: paginatedResults, total, total_pages, page };
    },

    async lists() {
      return await requestApi('GET', '/users/me/lists');
    },

    async likedLists(params = {}) {
      let page = params.page || 1;
      let limit = params.limit || 36;
      let response = await requestApi('GET', `/users/likes/lists?page=${page}&limit=${limit}`);
      // Trakt API повертає пагінацію в заголовках, але ми працюємо з тим, що є в тілі
      return response; 
    },

    async listItems(listId, params = {}) {
      let type = params.type || 'all'; // movies, shows, all
      let endpoint = `/users/me/lists/${listId}/items/${type}?extended=images,full`;
      
      // Якщо це не наш список, а чийсь лайкнутий, ендпоінт інший
      if (params.is_liked) {
        endpoint = `/lists/${listId}/items/${type}?extended=images,full`;
      }
      
      let response = await requestApi('GET', endpoint);
      let formattedData = formatTraktResults(response);
      formattedData.page = 1; // Без пагінації для вмісту списку (Trakt повертає все одразу)
      formattedData.total_pages = 1;
      return formattedData;
    },

    async createList(payload) {
      let data = sanitizeListPayload(payload);
      if (!data.name) throw new Error('List name is required');
      return await requestApi('POST', '/users/me/lists', data);
    },

    async editList(listId, payload) {
      let data = sanitizeListPayload(payload);
      return await requestApi('PUT', `/users/me/lists/${listId}`, data);
    },

    async deleteList(listId) {
      return await requestApi('DELETE', `/users/me/lists/${listId}`);
    },

    async addToList(listId, itemParams) {
      let payload = buildSyncPayload(itemParams);
      if (!listId) {
        // Додавання у Watchlist
        return await requestApi('POST', '/sync/watchlist', payload);
      }
      return await requestApi('POST', `/users/me/lists/${listId}/items`, payload);
    },

    async removeFromList(listId, itemParams) {
      let payload = buildSyncPayload(itemParams);
      if (!listId) {
        // Видалення з Watchlist
        return await requestApi('POST', '/sync/watchlist/remove', payload);
      }
      return await requestApi('POST', `/users/me/lists/${listId}/items/remove`, payload);
    },

    auth: {
      device: {
        async login() {
          let logging = Lampa.Storage.field('trakt_enable_logging');
          if (logging) console.log('TraktTV', 'auth.device.login: start');
          
          let response = await _performRequest('POST', '/oauth/device/code', {
            client_id: CLIENT_ID
          }, true);
          
          if (!response || !response.device_code) {
            throw new Error('Invalid device code response');
          }
          
          Lampa.Storage.set('trakt_active_device_auth', true);
          Lampa.Storage.set('trakt_active_device_auth_started_at', Date.now());
          
          return response;
        },

        async poll(deviceCode) {
          let logging = Lampa.Storage.field('trakt_enable_logging');
          if (logging) console.log('TraktTV', 'auth.device.poll: checking code');
          
          let response = await _performRequest('POST', '/oauth/device/token', {
            code: deviceCode,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
          }, true);
          
          if (response && response.access_token) {
            saveTokens(response);
            Lampa.Storage.set('trakt_active_device_auth', false);
            Lampa.Storage.set('trakt_active_device_auth_started_at', null);
            if (logging) console.log('TraktTV', 'auth.device.poll: success!');
            return response;
          }
          throw new Error('No access token in response');
        }
      }
    }
  };

  // Експорт глобального API для доступу з інших частин плагіна
  window.TraktTvApi = api$1;
  function getGlobalApi() {
    return window.TraktTvApi;
  }

/* ========================================================
        ЧАСТИНА 5  ======================================================== */

  // --- Модуль відстеження перегляду (Scrobbling) ---
  
  let scrobblePending = false;
  let lastScrobbleTime = 0;
  const SCROBBLE_COOLDOWN = 2000; // Мінімальна затримка між запитами (2 секунди)

  function getScrobbleThreshold() {
    let val = Number(Lampa.Storage.field('trakt_scrobble_percent'));
    return Number.isFinite(val) ? val : 80; // За замовчуванням 80%
  }

  function buildScrobblePayload(data, progress) {
    let payload = { progress: parseFloat(progress).toFixed(2) };
    
    if (data.method === 'movie') {
      payload.movie = { ids: { tmdb: data.id } };
    } else if (data.method === 'tv' || data.method === 'show') {
      payload.show = { ids: { tmdb: data.id } };
      payload.episode = { season: data.season, number: data.episode };
    }
    return payload;
  }

  async function sendScrobble(action, data, progress) {
    if (!Lampa.Storage.get('trakt_token')) return;
    
    // Захист від спаму подіями від плеєра (Debounce)
    let now = Date.now();
    if (scrobblePending || (now - lastScrobbleTime < SCROBBLE_COOLDOWN)) return;
    
    scrobblePending = true;
    let payload = buildScrobblePayload(data, progress);
    
    try {
      await requestApi('POST', `/scrobble/${action}`, payload);
      lastScrobbleTime = Date.now();
      
      if (Lampa.Storage.field('trakt_enable_logging')) {
        console.log('TraktTV', `Scrobble [${action}] success. Progress: ${progress}%`);
      }
    } catch (e) {
      if (Lampa.Storage.field('trakt_enable_logging')) {
        console.error('TraktTV', `Scrobble [${action}] failed:`, e);
      }
    } finally {
      scrobblePending = false;
    }
  }

  function handlePlaybackEvent(eventData, action) {
    if (!eventData || !eventData.id) return;
    
    // В Lampa прогрес може приходити по-різному (percent або time/duration)
    let progress = eventData.percent || 0;
    if (eventData.time && eventData.duration) {
      progress = (eventData.time / eventData.duration) * 100;
    }
    
    sendScrobble(action, eventData, progress);
  }

  function initWatching() {
    // Підписка на події плеєра Lampa
    Lampa.Player.listener.follow('start', (e) => {
      handlePlaybackEvent(e.data, 'start');
    });

    Lampa.Player.listener.follow('pause', (e) => {
      handlePlaybackEvent(e.data, 'pause');
    });

    Lampa.Player.listener.follow('stop', (e) => {
      if (!e.data || !e.data.id) return;
      
      let progress = e.percent || 0;
      if (e.data.time && e.data.duration) {
        progress = (e.data.time / e.data.duration) * 100;
      }
      
      let threshold = getScrobbleThreshold();
      
      // Якщо переглянуто більше встановленого порогу - зберігаємо в історію
      if (progress >= threshold) {
        if (Lampa.Storage.field('trakt_enable_logging')) {
          console.log('TraktTV', `Progress ${progress}% >= ${threshold}%. Adding to history.`);
        }
        
        api$1.addToHistory(e.data).catch(err => {
          if (Lampa.Storage.field('trakt_enable_logging')) {
            console.error('TraktTV', 'Failed to add to history on stop:', err);
          }
        });
      } else {
        // Інакше просто фіксуємо зупинку прогресу (scrobble stop)
        sendScrobble('stop', e.data, progress);
      }
    });

    // Оновлення таймлайну (кожні кілька хвилин під час перегляду)
    Lampa.Timeline.listener.follow('update', (e) => {
      if (e.data && e.data.id && e.percent) {
        // Відправляємо 'start' з новим прогресом (Trakt API використовує start для оновлення)
        sendScrobble('start', e.data, e.percent);
      }
    });
  }

  // --- Модуль роботи з QR-кодом для авторизації ---
  
  function getQrCodeUrl(text, size = 400) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }

  function showDeviceAuthModal(deviceCodeData) {
    let modalContent = $(`
      <div class="trakt-auth-modal" style="text-align: center; padding: 20px;">
        <div style="font-size: 1.2em; margin-bottom: 15px;">
          ${Lampa.Lang.translate('trakttv_auth_step1') || 'Перейдіть за посиланням:'}
        </div>
        <div style="font-size: 1.5em; font-weight: bold; color: #fff; margin-bottom: 20px;">
          ${deviceCodeData.verification_url}
        </div>
        <div style="font-size: 1.2em; margin-bottom: 15px;">
          ${Lampa.Lang.translate('trakttv_auth_step2') || 'Та введіть код:'}
        </div>
        <div style="font-size: 2.5em; font-weight: bold; color: #ffeb3b; letter-spacing: 5px; margin-bottom: 30px;">
          ${deviceCodeData.user_code}
        </div>
        <div>
          <img src="${getQrCodeUrl(deviceCodeData.verification_url)}" alt="QR Code" style="border-radius: 10px; width: 250px; height: 250px; border: 5px solid #fff;" />
        </div>
        <div style="margin-top: 20px; font-size: 0.9em; opacity: 0.7;">
          ${Lampa.Lang.translate('trakttv_auth_waiting') || 'Очікування підтвердження...'}
        </div>
      </div>
    `);

    Lampa.Modal.open({
      title: 'Trakt.TV Авторизація',
      html: modalContent,
      size: 'medium',
      onBack: () => {
        Lampa.Modal.close();
      }
    });
  }

/* ========================================================
          ЧАСТИНА 6 ======================================================== */

  // --- Продовження логіки авторизації ---

  async function pollAuth(deviceCodeData) {
    let interval = (deviceCodeData.interval || 5) * 1000;
    let expiresAt = Date.now() + (deviceCodeData.expires_in * 1000);
    
    while (Date.now() < expiresAt) {
      // Якщо модальне вікно закрили або прапорець скинувся - припиняємо опитування
      if (!Lampa.Storage.get('trakt_active_device_auth')) {
        if (Lampa.Storage.field('trakt_enable_logging')) console.log('TraktTV', 'Auth polling cancelled by user.');
        return;
      }
      
      try {
        await api$1.auth.device.poll(deviceCodeData.device_code);
        
        Lampa.Noty.show(Lampa.Lang.translate('trakttv_auth_success') || 'Trakt: Успішно авторизовано!');
        Lampa.Modal.close(); // Закриваємо модалку з QR-кодом
        
        // Оновлюємо статус іконки в хедері (якщо вона там є)
        if (typeof window.updateTraktHeadStatus === 'function') {
          window.updateTraktHeadStatus($('.trakt-head-action'));
        }
        return; // Успішно завершили
      } catch (error) {
        let status = error.status || 0;
        
        if (status === 400) {
          // Очікуємо (Pending) - користувач ще не ввів код
        } else if (status === 429) {
          // Slow Down - Trakt просить сповільнити запити
          interval += 5000;
        } else if (status === 404 || status === 410) {
          Lampa.Noty.show(Lampa.Lang.translate('trakttv_auth_expired') || 'Код застарів або недійсний.');
          Lampa.Modal.close();
          Lampa.Storage.set('trakt_active_device_auth', false);
          return;
        } else if (status === 418) {
          Lampa.Noty.show('Авторизацію відхилено користувачем.');
          Lampa.Modal.close();
          Lampa.Storage.set('trakt_active_device_auth', false);
          return;
        } else {
          // Невідома помилка, але продовжуємо пробувати
          if (Lampa.Storage.field('trakt_enable_logging')) console.error('TraktTV', 'Poll error:', error);
        }
      }
      
      // Чекаємо перед наступним запитом
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    Lampa.Noty.show('Час очікування авторизації минув.');
    Lampa.Modal.close();
    Lampa.Storage.set('trakt_active_device_auth', false);
  }

  async function startDeviceAuthFlow() {
    try {
      let deviceCodeData = await api$1.auth.device.login();
      showDeviceAuthModal(deviceCodeData);
      pollAuth(deviceCodeData); // Запускаємо опитування без await, щоб не блокувати UI
    } catch (e) {
      Lampa.Noty.show('Помилка з\'єднання з Trakt: ' + (e.message || ''));
      Lampa.Storage.set('trakt_active_device_auth', false);
    }
  }


  // --- Модуль синхронізації закладок (Bookmarks Sync) ---

  const bookmarksSync = {
    // Створює UI для відображення прогресу
    createProgressModal(title) {
      let html = $(`
        <div class="trakt-sync-modal" style="text-align: center; padding: 20px;">
          <div style="font-size: 1.2em; margin-bottom: 20px;" class="sync-status-text">${title}</div>
          <div style="width: 100%; background: #333; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
            <div class="sync-progress-bar" style="width: 0%; background: #ffeb3b; height: 100%; transition: width 0.3s;"></div>
          </div>
          <div style="font-size: 1em; opacity: 0.8;" class="sync-stats">0 / 0</div>
          <div style="margin-top: 15px; font-size: 0.9em; display: flex; justify-content: space-around;">
            <span style="color: #4caf50;">Додано: <b class="sync-added">0</b></span>
            <span style="color: #9e9e9e;">Дублі: <b class="sync-skipped">0</b></span>
            <span style="color: #f44336;">Помилки: <b class="sync-errors">0</b></span>
          </div>
        </div>
      `);

      Lampa.Modal.open({
        title: 'Синхронізація',
        html: html,
        size: 'medium',
        onBack: () => {
          Lampa.Modal.close();
        }
      });

      return {
        update(current, total, added, skipped, errors) {
          let percent = total > 0 ? Math.round((current / total) * 100) : 100;
          html.find('.sync-progress-bar').css('width', percent + '%');
          html.find('.sync-stats').text(`${current} / ${total} (${percent}%)`);
          html.find('.sync-added').text(added);
          html.find('.sync-skipped').text(skipped);
          html.find('.sync-errors').text(errors);
        },
        setStatus(text) {
          html.find('.sync-status-text').text(text);
        },
        close() {
          setTimeout(() => Lampa.Modal.close(), 1500);
        }
      };
    },

    // Отримує всі елементи з Lampa Favorite (за категоріями: like, book, wath, history)
    getLampaFavorites(category) {
      let items = Lampa.Favorite.get({ type: category }) || [];
      return items.filter(item => item.id || item.tmdb || item.imdb);
    },

    // Отримує всі елементи з конкретного списку Trakt (або Watchlist)
    async getTraktItems(listId) {
      try {
        let items = [];
        if (!listId || listId === 'watchlist') {
          // Отримуємо Watchlist (без пагінації тягнемо максимум)
          items = await requestApi('GET', '/sync/watchlist/movies,shows/added/asc?extended=full');
        } else {
          // Отримуємо кастомний список
          items = await requestApi('GET', `/users/me/lists/${listId}/items/all?extended=full`);
        }
        return items;
      } catch (e) {
        console.error('TraktTV Sync', 'Failed to get trakt items', e);
        return [];
      }
    },

    // Основна функція синхронізації
    // direction: 'lampa_to_trakt' або 'trakt_to_lampa'
    async run(direction, lampaCategory, traktListId) {
      if (!Lampa.Storage.get('trakt_token')) {
        Lampa.Noty.show('Потрібна авторизація в Trakt.TV');
        return;
      }

      let ui = this.createProgressModal('Отримання даних...');
      let added = 0, skipped = 0, errors = 0;

      try {
        let lampaItems = this.getLampaFavorites(lampaCategory);
        let traktData = await this.getTraktItems(traktListId);
        
        let traktItemsParsed = traktData.map(item => {
          let media = item.movie || item.show;
          return {
            ids: media.ids,
            type: item.movie ? 'movie' : 'tv',
            raw: item
          };
        }).filter(item => item.ids);

        ui.setStatus('Порівняння списків...');

        if (direction === 'lampa_to_trakt') {
          // --- ЕКСПОРТ: З Lampa в Trakt ---
          let total = lampaItems.length;
          ui.update(0, total, added, skipped, errors);

          for (let i = 0; i < total; i++) {
            let lampaItem = lampaItems[i];
            
            // Перевіряємо чи є вже цей елемент у Trakt
            let isDuplicate = traktItemsParsed.some(t => {
               return t.ids.tmdb == lampaItem.id || t.ids.imdb == lampaItem.imdb_id;
            });

            if (isDuplicate) {
              skipped++;
            } else {
              try {
                let params = { 
                  id: lampaItem.id, 
                  method: lampaItem.name || lampaItem.title ? (lampaItem.first_air_date ? 'tv' : 'movie') : 'movie' 
                };
                if (lampaItem.imdb_id) params.imdb = lampaItem.imdb_id;

                await api$1.addToList(traktListId === 'watchlist' ? null : traktListId, params);
                added++;
              } catch (e) {
                errors++;
              }
            }
            ui.update(i + 1, total, added, skipped, errors);
          }

        } else if (direction === 'trakt_to_lampa') {
          // --- ІМПОРТ: З Trakt в Lampa ---
          let total = traktItemsParsed.length;
          ui.update(0, total, added, skipped, errors);

          for (let i = 0; i < total; i++) {
            let traktItem = traktItemsParsed[i];
            let media = traktItem.raw.movie || traktItem.raw.show;
            
            // Перевіряємо чи є вже в Lampa
            let isDuplicate = lampaItems.some(l => l.id == media.ids.tmdb);

            if (isDuplicate) {
              skipped++;
            } else {
              try {
                // Формуємо об'єкт картки для Lampa
                let card = {
                  id: media.ids.tmdb,
                  title: media.title,
                  original_title: media.title,
                  release_date: media.year ? String(media.year) : '',
                  vote_average: media.rating || 0,
                  poster_path: media.images?.poster?.[0] || '', // Адаптовано для Lampa
                  name: media.title // Для серіалів
                };
                
                Lampa.Favorite.add(lampaCategory, card);
                added++;
              } catch (e) {
                errors++;
              }
            }
            ui.update(i + 1, total, added, skipped, errors);
          }
        }

        ui.setStatus('Синхронізацію завершено!');
        ui.close();

      } catch (error) {
        console.error('TraktTV Sync Error', error);
        ui.setStatus('Помилка синхронізації!');
        ui.close();
        Lampa.Noty.show('Не вдалося завершити синхронізацію.');
      }
    }
  };

/* ========================================================
          ЧАСТИНА 7 ======================================================== */

  // --- UI Компоненти: Каталоги (Watchlist, UpNext, Calendar, Recommendations) ---

  class TraktCatalog {
    constructor(object) {
      this.object = object;
      this.page = 1;
      this.limit = 36;
      this.data = { results: [] };
      this.active = false;
      
      // Створюємо базовий UI за допомогою сучасного модульного API Lampa
      this.category = Lampa.Maker.make('Category', {
        title: this.object.title,
        url: this.object.url,
        card: this.getCardType()
      });
    }

    getCardType() {
      // Для UpNext та Календаря картки можуть мати специфічний дизайн (якщо потрібно)
      if (this.object.url === 'upnext') return 'trakt_upnext_card';
      if (this.object.url === 'calendar') return 'trakt_calendar_card';
      return 'card'; 
    }

    async load() {
      if (!Lampa.Storage.get('trakt_token')) {
        this.empty(Lampa.Lang.translate('trakttv_auth_required') || 'Потрібна авторизація. Перейдіть у Налаштування -> Trakt.TV');
        return;
      }

      this.category.loader.show();

      try {
        let params = { page: this.page, limit: this.limit };
        let response;

        // Викликаємо відповідний метод API залежно від URL
        switch (this.object.url) {
          case 'watchlist':
            response = await api$1.watchlist(params);
            break;
          case 'upnext':
            response = await api$1.upnext(params);
            break;
          case 'calendar':
            response = await api$1.calendar(params);
            break;
          case 'recommendations':
            response = await api$1.recommendations(params);
            break;
          default:
            throw new Error('Unknown Trakt catalog section');
        }

        this.append(response);
      } catch (error) {
        console.error('TraktTV Catalog Error', error);
        this.empty('Помилка завантаження даних: ' + (error.message || ''));
      }
    }

    append(response) {
      this.category.loader.hide();
      
      if (response && response.results && response.results.length > 0) {
        this.data.results = this.data.results.concat(response.results);
        this.page++;
        
        // Будуємо картки
        response.results.forEach(item => {
          let card = Lampa.Maker.make('Card', item, {
            card_category: true,
            object: this.object
          });
          
          let cardHtml = card.render();

          // Кастомний рендер для UpNext (додаємо прогрес-бар/лічильник)
          if (this.object.url === 'upnext' && item.trakt_upnext_progress) {
             cardHtml.find('.card__age').text(item.trakt_upnext_progress).css({
               'background': '#ff9800',
               'color': '#fff'
             });
          }
          
          // Кастомний рендер для Календаря (додаємо назву епізоду)
          if (this.object.url === 'calendar' && item.episode_title) {
             let epInfo = `S${String(item.season).padStart(2, '0')}E${String(item.episode).padStart(2, '0')} - ${item.episode_title}`;
             cardHtml.find('.card__title').text(epInfo);
          }

          card.onHover((target) => {
             this.category.info.update(item);
          });
          
          card.onEnter(() => {
             // Відкриваємо повну карточку фільму/серіалу
             Lampa.Activity.push({
               url: '',
               title: item.title,
               component: 'full',
               id: item.id,
               method: item.method,
               card: item
             });
          });

          this.category.append(card);
        });

        // Перевіряємо, чи є ще сторінки для пагінації (нескінченний скрол)
        if (response.page < response.total_pages) {
          this.category.observer.observe(true); 
        } else {
          this.category.observer.observe(false);
        }

      } else if (this.data.results.length === 0) {
        this.empty(Lampa.Lang.translate('trakttv_empty_list') || 'Список порожній');
      }
    }

    empty(msg) {
      this.category.loader.hide();
      this.category.empty(msg);
    }

    create() {
      // Ініціалізація компонента
      this.category.create();
      this.category.observer.onVisible = () => this.load(); // Завантаження наступної сторінки при скролі
      return this.category.render();
    }

    start() {
      this.active = true;
      if (this.data.results.length === 0) {
        this.load();
      }
    }

    pause() {
      this.active = false;
    }

    stop() {
      this.active = false;
      this.category.destroy();
    }

    render() {
      return this.category.render();
    }
  }

  // Реєструємо компонент у системі Lampa
  Lampa.Component.add('trakt_catalog', TraktCatalog);

/* ========================================================
   ЧАСТИНА 8
   ======================================================== */

  // --- UI Компоненти: Списки користувача (My Lists, Liked Lists) ---

  class TraktLists {
    constructor(object) {
      this.object = object; // Очікується url: 'lists' або 'liked_lists'
      this.page = 1;
      this.limit = 36;
      this.data = { results: [] };
      this.active = false;

      this.category = Lampa.Maker.make('Category', {
        title: this.object.title,
        url: this.object.url,
        card: 'trakt_list' // Спеціальний тип картки для списку
      });
    }

    async load() {
      if (!Lampa.Storage.get('trakt_token')) {
        this.empty(Lampa.Lang.translate('trakttv_auth_required') || 'Потрібна авторизація. Перейдіть у Налаштування -> Trakt.TV');
        return;
      }

      this.category.loader.show();

      try {
        let response;
        if (this.object.url === 'lists') {
          // Власні списки (Trakt API віддає всі одразу, без пагінації)
          let listsRaw = await api$1.lists();
          response = api$1.formatListsResults(listsRaw, [], { canManage: true, wide: false });
          response.total_pages = 1; 
        } else if (this.object.url === 'liked_lists') {
          // Лайкнуті списки (з пагінацією)
          let likedRaw = await api$1.likedLists({ page: this.page, limit: this.limit });
          let likedIds = likedRaw.map(l => l.list.ids.trakt);
          response = api$1.formatListsResults(likedRaw, likedIds, { canManage: false, wide: false });
          response.page = this.page;
          response.total_pages = likedRaw.length === this.limit ? this.page + 1 : this.page; 
        }

        this.append(response);
      } catch (error) {
        console.error('TraktTV Lists Error', error);
        this.empty('Помилка завантаження списків.');
      }
    }

    append(response) {
      this.category.loader.hide();
      
      if (response && response.results && response.results.length > 0) {
        this.data.results = this.data.results.concat(response.results);
        this.page++;
        
        response.results.forEach(item => {
          let card = Lampa.Maker.make('Card', item, {
            card_category: true,
            object: this.object
          });
          
          card.onEnter(() => {
            // При кліку на список - відкриваємо його вміст як звичайний каталог
            Lampa.Activity.push({
              url: 'list_items', // Спеціальний URL для розпізнавання
              title: item.list_title || item.title,
              component: 'trakt_catalog', // Використовуємо компонент з Частини 7
              list_id: item.list_id,
              is_liked: item.is_liked,
              page: 1
            });
          });

          this.category.append(card);
        });

        if (response.page < response.total_pages) {
          this.category.observer.observe(true); 
        } else {
          this.category.observer.observe(false);
        }
      } else if (this.data.results.length === 0) {
        this.empty(Lampa.Lang.translate('trakttv_empty_list') || 'Списків не знайдено');
      }
    }

    empty(msg) {
      this.category.loader.hide();
      this.category.empty(msg);
    }

    create() {
      this.category.create();
      this.category.observer.onVisible = () => this.load();
      return this.category.render();
    }

    start() { 
      this.active = true;
      if (this.data.results.length === 0) this.load(); 
    }
    
    pause() { this.active = false; }
    
    stop() { 
      this.active = false;
      this.category.destroy(); 
    }
    
    render() { return this.category.render(); }
  }

  // Реєструємо компонент списків
  Lampa.Component.add('trakt_lists', TraktLists);

  // Доповнення (Monkey Patch) для TraktCatalog з Частини 7
  // Навчаємо каталог завантажувати вміст конкретного списку (url === 'list_items')
  let originalCatalogLoad = Lampa.Component.get('trakt_catalog').prototype.load;
  Lampa.Component.get('trakt_catalog').prototype.load = async function() {
    if (this.object.url === 'list_items') {
      if (!Lampa.Storage.get('trakt_token')) return this.empty('Потрібна авторизація.');
      this.category.loader.show();
      try {
        let response = await api$1.listItems(this.object.list_id, { is_liked: this.object.is_liked });
        this.append(response);
      } catch (e) {
        this.empty('Помилка завантаження вмісту списку.');
      }
    } else {
      // Викликаємо оригінальний метод для watchlist, upnext, calendar тощо
      originalCatalogLoad.call(this); 
    }
  };


  // --- Інтеграція в Головне Меню (Menu Integration) ---

  const TRAKT_MENU_ITEMS = [
    {
      title: 'Recommendations',
      url: 'recommendations',
      component: 'trakt_catalog'
    },
    {
      title: 'Watchlist',
      url: 'watchlist',
      component: 'trakt_catalog'
    },
    {
      title: 'Up Next',
      url: 'upnext',
      component: 'trakt_catalog'
    },
    {
      title: 'Calendar',
      url: 'calendar',
      component: 'trakt_catalog'
    },
    {
      title: 'My Lists',
      url: 'lists',
      component: 'trakt_lists' // Використовуємо новий клас списків
    },
    {
      title: 'Liked Lists',
      url: 'liked_lists',
      component: 'trakt_lists'
    }
  ];

  function buildTraktMenu() {
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') {
        // Додаємо пункт Trakt.TV у бокове меню Lampa
        let menu_item = $(`
          <li class="menu__item selector" data-action="trakt">
            <div class="menu__ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M24 6.30906L11.9961 0L0 6.30906V19.4632L11.9961 24L24 19.4632V6.30906ZM6.24831 8.87979L11.996 11.8988V20.1472L7.33089 17.6974V10.2764L6.24831 9.7077V8.87979ZM17.7517 8.87979L12.004 11.8988V20.1472L16.6691 17.6974V10.2764L17.7517 9.7077V8.87979ZM22.5029 7.4217L11.9961 12.9431L1.48924 7.4217L11.9961 1.90029L22.5029 7.4217Z" fill="currentColor"/>
              </svg>
            </div>
            <div class="menu__text">Trakt.TV</div>
          </li>
        `);

        menu_item.on('hover:enter', function () {
          Lampa.Select.show({
            title: 'Trakt.TV',
            items: TRAKT_MENU_ITEMS,
            onSelect: (item) => {
              Lampa.Activity.push({
                url: item.url,
                title: item.title,
                component: item.component,
                page: 1
              });
            },
            onBack: () => {
              Lampa.Controller.toggle('menu');
            }
          });
        });

        // Вставляємо в меню після пунктів "Закладки" або "Історія"
        let insertAfter = $('.menu__list .menu__item[data-action="bookmarks"]').length ? 
                          $('.menu__list .menu__item[data-action="bookmarks"]') : 
                          $('.menu__list .menu__item[data-action="history"]');
                          
        if (insertAfter.length) {
          insertAfter.after(menu_item);
        } else {
          $('.menu__list').append(menu_item);
        }
      }
    });
  }

/* ========================================================
   ЧАСТИНА 9
   ======================================================== */

  // --- Локалізація (Translations) ---

  const translations = {
    trakttv_auth_required: {
      ru: 'Требуется авторизация в Trakt.TV',
      uk: 'Потрібна авторизація в Trakt.TV',
      en: 'Trakt.TV authorization required'
    },
    trakttv_auth_step1: {
      ru: 'Перейдите по ссылке:',
      uk: 'Перейдіть за посиланням:',
      en: 'Go to the link:'
    },
    trakttv_auth_step2: {
      ru: 'И введите код:',
      uk: 'Та введіть код:',
      en: 'And enter the code:'
    },
    trakttv_auth_waiting: {
      ru: 'Ожидание подтверждения...',
      uk: 'Очікування підтвердження...',
      en: 'Waiting for confirmation...'
    },
    trakttv_auth_success: {
      ru: 'Успешная авторизация в Trakt.TV!',
      uk: 'Успішна авторизація в Trakt.TV!',
      en: 'Trakt.TV authorization successful!'
    },
    trakttv_empty_list: {
      ru: 'Список пуст',
      uk: 'Список порожній',
      en: 'List is empty'
    },
    trakttv_add_to_list: {
      ru: 'Управление списками',
      uk: 'Керування списками',
      en: 'Manage lists'
    },
    trakttv_manage_lists_title: {
      ru: 'Списки Trakt.TV',
      uk: 'Списки Trakt.TV',
      en: 'Trakt.TV Lists'
    },
    trakttv_settings_title: {
      ru: 'Настройки Trakt.TV',
      uk: 'Налаштування Trakt.TV',
      en: 'Trakt.TV Settings'
    },
    trakttv_login: {
      ru: 'Войти',
      uk: 'Увійти',
      en: 'Login'
    },
    trakttv_logout: {
      ru: 'Выйти из аккаунта',
      uk: 'Вийти з акаунта',
      en: 'Logout'
    },
    trakttv_scrobble_percent: {
      ru: 'Процент просмотра для отметки "Просмотрено"',
      uk: 'Відсоток перегляду для позначки "Переглянуто"',
      en: 'Watch percentage for "Watched" mark'
    }
  };

  // Додаємо переклади в систему Lampa
  for (let key in translations) {
    Lampa.Lang.add({
      [key]: translations[key]
    });
  }


  // --- Налаштування плагіна (Settings API) ---

  function initSettings() {
    // Реєструємо вкладку в налаштуваннях
    Lampa.SettingsApi.addParam({
      component: 'trakt',
      param: {
        name: 'trakt_scrobble_percent',
        type: 'select',
        values: {
          50: '50%',
          70: '70%',
          80: '80%',
          90: '90%',
          95: '95%',
          100: '100%'
        },
        default: '80'
      },
      field: {
        name: Lampa.Lang.translate('trakttv_scrobble_percent'),
        description: 'Коли відео досягне цього відсотка, воно автоматично відмітиться як переглянуте.'
      },
      onChange: (value) => {
        Lampa.Storage.set('trakt_scrobble_percent', value);
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'trakt',
      param: {
        name: 'trakt_enable_logging',
        type: 'trigger',
        default: false
      },
      field: {
        name: 'Увімкнути логування (Debug)',
        description: 'Виводити детальну інформацію про запити Trakt у консоль розробника.'
      },
      onChange: (value) => {
        Lampa.Storage.set('trakt_enable_logging', value);
      }
    });

    // Створюємо саму сторінку налаштувань
    Lampa.SettingsApi.addComponent({
      component: 'trakt',
      name: 'Trakt.TV',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 6.30906L11.9961 0L0 6.30906V19.4632L11.9961 24L24 19.4632V6.30906ZM6.24831 8.87979L11.996 11.8988V20.1472L7.33089 17.6974V10.2764L6.24831 9.7077V8.87979ZM17.7517 8.87979L12.004 11.8988V20.1472L16.6691 17.6974V10.2764L17.7517 9.7077V8.87979ZM22.5029 7.4217L11.9961 12.9431L1.48924 7.4217L11.9961 1.90029L22.5029 7.4217Z"/></svg>'
    });

    // Динамічні кнопки авторизації
    Lampa.Settings.listener.follow('open', function (e) {
      if (e.name === 'trakt') {
        let isAuthorized = !!Lampa.Storage.get('trakt_token');
        let buttonHtml = isAuthorized 
          ? `<div class="settings-param selector" data-type="button" data-name="trakt_logout"><div class="settings-param__name">${Lampa.Lang.translate('trakttv_logout')}</div><div class="settings-param__value" style="color:#f44336">Відключити акаунт</div></div>`
          : `<div class="settings-param selector" data-type="button" data-name="trakt_login"><div class="settings-param__name">${Lampa.Lang.translate('trakttv_login')}</div><div class="settings-param__value" style="color:#4caf50">Авторизувати пристрій</div></div>`;

        let btn = $(buttonHtml);
        
        btn.on('hover:enter', function () {
          if (isAuthorized) {
            clearAuthStorage();
            Lampa.Noty.show('Ви вийшли з акаунта Trakt.TV');
            Lampa.Controller.toggle('settings_component'); // Оновлюємо сторінку
          } else {
            startDeviceAuthFlow();
          }
        });

        e.body.prepend(btn);
        
        // Додаємо кнопки синхронізації закладок (якщо авторизовані)
        if (isAuthorized) {
          let syncWatchBtn = $(`<div class="settings-param selector" data-type="button"><div class="settings-param__name">Експорт закладок (Watch) в Trakt Watchlist</div></div>`);
          syncWatchBtn.on('hover:enter', () => bookmarksSync.run('lampa_to_trakt', 'wath', 'watchlist'));
          
          let importWatchBtn = $(`<div class="settings-param selector" data-type="button"><div class="settings-param__name">Імпорт Trakt Watchlist в Lampa (Watch)</div></div>`);
          importWatchBtn.on('hover:enter', () => bookmarksSync.run('trakt_to_lampa', 'wath', 'watchlist'));

          e.body.append('<div class="settings-param-title"><span>Синхронізація (Експеріментально)</span></div>');
          e.body.append(syncWatchBtn);
          e.body.append(importWatchBtn);
        }
      }
    });
  }


  // --- Кнопка "Управління списками" у картці фільму (Full Card) ---

  async function showManageListsModal(movieData) {
    if (!Lampa.Storage.get('trakt_token')) {
      return Lampa.Noty.show(Lampa.Lang.translate('trakttv_auth_required'));
    }

    let params = {
      id: movieData.id,
      imdb: movieData.imdb_id,
      method: movieData.name || movieData.title ? (movieData.first_air_date ? 'tv' : 'movie') : 'movie'
    };

    Lampa.Modal.open({
      title: 'Завантаження списків...',
      html: '<div style="padding:20px; text-align:center;">Зачекайте...</div>',
      size: 'medium'
    });

    try {
      // Завантажуємо власні списки користувача
      let userLists = await api$1.lists();
      
      let html = $('<div class="trakt-manage-lists" style="padding: 10px;"></div>');
      
      // Кнопка Watchlist
      let watchlistBtn = $(`<div class="selector" style="padding: 15px; margin-bottom: 5px; background: rgba(255,255,255,0.1); border-radius: 5px; cursor: pointer;">&#128278; Додати у Watchlist</div>`);
      watchlistBtn.on('hover:enter', async () => {
        try {
          await api$1.addToList(null, params); // null = watchlist
          Lampa.Noty.show('Додано у Watchlist');
          Lampa.Modal.close();
        } catch(e) { Lampa.Noty.show('Помилка додавання'); }
      });
      html.append(watchlistBtn);

      // Кнопки кастомних списків
      if (userLists && userLists.length > 0) {
        html.append('<div style="margin: 15px 0 5px 0; opacity: 0.7;">Мої списки:</div>');
        userLists.forEach(list => {
          let listBtn = $(`<div class="selector" style="padding: 15px; margin-bottom: 5px; background: rgba(255,255,255,0.05); border-radius: 5px; cursor: pointer;">&#128194; ${list.name}</div>`);
          listBtn.on('hover:enter', async () => {
            try {
              await api$1.addToList(list.ids.trakt, params);
              Lampa.Noty.show(`Додано у список: ${list.name}`);
              Lampa.Modal.close();
            } catch(e) { Lampa.Noty.show('Помилка додавання'); }
          });
          html.append(listBtn);
        });
      }

      Lampa.Modal.update({
        title: Lampa.Lang.translate('trakttv_manage_lists_title'),
        html: html
      });
    } catch (e) {
      Lampa.Noty.show('Не вдалося завантажити списки');
      Lampa.Modal.close();
    }
  }

  function bindFullCardEvents() {
    Lampa.Listener.follow('full', function (e) {
      if (e.type === 'build') {
        let isTraktAuth = !!Lampa.Storage.get('trakt_token');
        if (!isTraktAuth) return;

        // Створюємо кнопку керування списками
        let btnHtml = $(`
          <div class="full-start__button selector" data-action="trakt_lists" style="background: #ed1c24;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 5px;">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M24 6.30906L11.9961 0L0 6.30906V19.4632L11.9961 24L24 19.4632V6.30906ZM6.24831 8.87979L11.996 11.8988V20.1472L7.33089 17.6974V10.2764L6.24831 9.7077V8.87979ZM17.7517 8.87979L12.004 11.8988V20.1472L16.6691 17.6974V10.2764L17.7517 9.7077V8.87979ZM22.5029 7.4217L11.9961 12.9431L1.48924 7.4217L11.9961 1.90029L22.5029 7.4217Z" fill="currentColor"/>
            </svg>
            <span>Trakt Lists</span>
          </div>
        `);

        btnHtml.on('hover:enter', function () {
          showManageListsModal(e.data);
        });

        // Вставляємо кнопку після кнопки "Дивитися" або "Трейлер"
        let buttonsGroup = e.object.activity.render().find('.full-start__buttons');
        if (buttonsGroup.length) {
          buttonsGroup.append(btnHtml);
        }
      }
    });
  }

/* ========================================================
   ЧАСТИНА 10
   ======================================================== */

  // --- Кнопка в хедері (Top Header Action) ---

  function setTraktHeadStatus(button, status) {
    button.removeClass('trakt-head-action--ok trakt-head-action--error');
    if (status === 'ok') {
      button.addClass('trakt-head-action--ok');
    } else {
      button.addClass('trakt-head-action--error');
    }
  }

  window.updateTraktHeadStatus = function(button) {
    if (!button) return;
    let token = Lampa.Storage.get('trakt_token');
    if (!token) return setTraktHeadStatus(button, 'error');
    
    // Перевіряємо валідність токена запитом профілю
    api$1.get('/users/me').then(() => {
      setTraktHeadStatus(button, 'ok');
    }).catch(() => {
      setTraktHeadStatus(button, 'error');
    });
  };

  function initHeadAction() {
    let button = $(`
      <div class="head__action selector trakt-head-action">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M24 6.30906L11.9961 0L0 6.30906V19.4632L11.9961 24L24 19.4632V6.30906ZM6.24831 8.87979L11.996 11.8988V20.1472L7.33089 17.6974V10.2764L6.24831 9.7077V8.87979ZM17.7517 8.87979L12.004 11.8988V20.1472L16.6691 17.6974V10.2764L17.7517 9.7077V8.87979ZM22.5029 7.4217L11.9961 12.9431L1.48924 7.4217L11.9961 1.90029L22.5029 7.4217Z" fill="currentColor"/>
        </svg>
      </div>
    `);

    button.on('hover:enter', function () {
      // При кліку на іконку відкриваємо налаштування Trakt
      Lampa.Controller.toggle('settings');
      setTimeout(() => {
        if (Lampa.Settings && typeof Lampa.Settings.create === 'function') {
          Lampa.Settings.create('trakt');
        }
      }, 0);
    });

    // Додаємо стилі для індикатора статусу (крапочки)
    $('head').append(`
      <style>
        .trakt-head-action { position: relative; }
        .trakt-head-action::after { content: ''; position: absolute; top: 5px; right: 5px; width: 8px; height: 8px; border-radius: 50%; background: #9e9e9e; transition: background 0.3s;}
        .trakt-head-action--ok::after { background: #4caf50; box-shadow: 0 0 5px #4caf50;}
        .trakt-head-action--error::after { background: #f44336; box-shadow: 0 0 5px #f44336;}
      </style>
    `);

    // Вставляємо іконку перед іконкою пошуку або налаштувань
    let insertBefore = $('.head__actions .head__action').first();
    if (insertBefore.length) {
      insertBefore.before(button);
    } else {
      $('.head__actions').append(button);
    }

    // Перевіряємо статус при запуску
    window.updateTraktHeadStatus(button);
  }

  // --- ГОЛОВНА ІНІЦІАЛІЗАЦІЯ ПЛАГІНА ---

  if (!window.plugin_trakt_ready) {
    window.plugin_trakt_ready = true;

    // Ініціалізуємо всі наші модулі
    initSettings();
    buildTraktMenu();
    initWatching();
    bindFullCardEvents();

    // Чекаємо, поки Lampa повністю завантажить DOM, щоб додати іконку в хедер
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') {
        initHeadAction();
      }
    });

    console.log('TraktTV', 'Plugin successfully loaded and refactored (ES6+ mode).');
  }

})(); // Закриття головної функції (почалася в Частині 1)
