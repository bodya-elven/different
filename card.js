(function () {
    'use strict';

    const APPLECATION_VERSION = '1.2.1';

    // Іконка плагіна (Apple-style Squircle + TV)
    const PLUGIN_ICON = `<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="256" height="256" rx="56" fill="url(#applecation_bg)"/>
        
        <rect x="2" y="2" width="252" height="252" rx="54" stroke="white" stroke-opacity="0.1" stroke-width="4"/>
        
        <rect x="56" y="72" width="144" height="92" rx="16" stroke="white" stroke-width="12"/>
        
        <path d="M128 164V192" stroke="white" stroke-width="12" stroke-linecap="round"/>
        <path d="M100 192H156" stroke="white" stroke-width="12" stroke-linecap="round"/>
        
        <path d="M114 102L148 118L114 134V102Z" fill="white"/>
        
        <path d="M62 80C62 76.6863 64.6863 74 68 74H188C191.314 74 194 76.6863 194 80V96C150 90 100 100 62 115V80Z" fill="white" fill-opacity="0.08"/>
        
        <defs>
            <linearGradient id="applecation_bg" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
                <stop stop-color="#48484A"/>
                <stop offset="1" stop-color="#141415"/>
            </linearGradient>
        </defs>
    </svg>`;

    /**
     * Перевіряє, чи активність все ще активна
     */
    function isAlive(activity) {
        return activity && !activity.__destroyed;
    }

    /**
     * Аналізує якість контенту з даних ffprobe
     * Витягує інформацію лише про роздільну здатність, HDR та Dolby Vision
     */
    function analyzeContentQuality(ffprobe) {
        if (!ffprobe || !Array.isArray(ffprobe)) return null;

        const quality = {
            resolution: null,
            hdr: false,
            dolbyVision: false
        };

        // Аналіз відеопотоку
        const video = ffprobe.find(stream => stream.codec_type === 'video');
        if (video) {
            // Роздільна здатність
            if (video.width && video.height) {
                quality.resolution = `${video.width}x${video.height}`;
                
                // Визначаємо мітки якості
                if (video.height >= 2160 || video.width >= 3840) {
                    quality.resolutionLabel = '4K';
                } else if (video.height >= 1440 || video.width >= 2560) {
                    quality.resolutionLabel = '2K';
                } else if (video.height >= 1080 || video.width >= 1920) {
                    quality.resolutionLabel = 'FULL HD';
                } else if (video.height >= 720 || video.width >= 1280) {
                    quality.resolutionLabel = 'HD';
                }
            }

            // HDR визначається через side_data_list або color_transfer
            if (video.side_data_list) {
                const hasMasteringDisplay = video.side_data_list.some(data => 
                    data.side_data_type === 'Mastering display metadata'
                );
                const hasContentLight = video.side_data_list.some(data => 
                    data.side_data_type === 'Content light level metadata'
                );
                const hasDolbyVision = video.side_data_list.some(data => 
                    data.side_data_type === 'DOVI configuration record' ||
                    data.side_data_type === 'Dolby Vision RPU'
                );

                if (hasDolbyVision) {
                    quality.dolbyVision = true;
                    quality.hdr = true; // DV завжди включає HDR
                } else if (hasMasteringDisplay || hasContentLight) {
                    quality.hdr = true;
                }
            }

            // Альтернативна перевірка HDR через color_transfer
            if (!quality.hdr && video.color_transfer) {
                const hdrTransfers = ['smpte2084', 'arib-std-b67'];
                if (hdrTransfers.includes(video.color_transfer.toLowerCase())) {
                    quality.hdr = true;
                }
            }

            // Перевірка через codec_name для Dolby Vision
            if (!quality.dolbyVision && video.codec_name) {
                if (video.codec_name.toLowerCase().includes('dovi') || 
                    video.codec_name.toLowerCase().includes('dolby')) {
                    quality.dolbyVision = true;
                    quality.hdr = true;
                }
            }
        }

        return quality;
    }

    /**
     * Аналізує якість контенту при переході на сторінку full (без аудіо)
     */
    function analyzeContentQualities(movie, activity) {
        if (!movie || !Lampa.Storage.field('parser_use')) return;

        if (!Lampa.Parser || typeof Lampa.Parser.get !== 'function') {
            return;
        }

        const title = movie.title || movie.name || 'Невідомо';
        const year = ((movie.first_air_date || movie.release_date || '0000') + '').slice(0,4);
        const combinations = {
            'df': movie.original_title,
            'df_year': movie.original_title + ' ' + year,
            'df_lg': movie.original_title + ' ' + movie.title,
            'df_lg_year': movie.original_title + ' ' + movie.title + ' ' + year,
            'lg': movie.title,
            'lg_year': movie.title + ' ' + year,
            'lg_df': movie.title + ' ' + movie.original_title,
            'lg_df_year': movie.title + ' ' + movie.original_title + ' ' + year,
        };

        const searchQuery = combinations[Lampa.Storage.field('parse_lang')] || movie.title;

        Lampa.Parser.get({
            search: searchQuery,
            movie: movie,
            page: 1
        }, (results) => {
            if (!isAlive(activity)) return;
            if (!results || !results.Results || results.Results.length === 0) return;

            const availableQualities = {
                resolutions: new Set(),
                hdr: new Set()
            };

            results.Results.forEach((torrent) => {
                if (torrent.ffprobe && Array.isArray(torrent.ffprobe)) {
                    const quality = analyzeContentQuality(torrent.ffprobe);
                    if (quality && quality.resolutionLabel) {
                        availableQualities.resolutions.add(quality.resolutionLabel);
                    }
                }

                const titleLower = torrent.Title.toLowerCase();
                if (titleLower.includes('dolby vision') || titleLower.includes('dovi') || titleLower.match(/\bdv\b/)) {
                    availableQualities.hdr.add('Dolby Vision');
                }
                if (titleLower.includes('hdr10+')) {
                    availableQualities.hdr.add('HDR10+');
                }
                if (titleLower.includes('hdr10')) {
                    availableQualities.hdr.add('HDR10');
                }
                if (titleLower.includes('hdr')) {
                    availableQualities.hdr.add('HDR');
                }
            });

            const qualityInfo = {
                title: title,
                torrents_found: results.Results.length,
                quality: null,
                dv: false,
                hdr: false,
                hdr_type: null
            };

            if (availableQualities.resolutions.size > 0) {
                const resOrder = ['8K', '4K', '2K', 'FULL HD', 'HD'];
                for (const res of resOrder) {
                    if (availableQualities.resolutions.has(res)) {
                        qualityInfo.quality = res;
                        break;
                    }
                }
            }
            
            if (availableQualities.hdr.has('Dolby Vision')) {
                qualityInfo.dv = true;
                qualityInfo.hdr = true;
            }
            
            if (availableQualities.hdr.size > 0) {
                qualityInfo.hdr = true;
                const hdrOrder = ['HDR10+', 'HDR10', 'HDR'];
                for (const hdr of hdrOrder) {
                    if (availableQualities.hdr.has(hdr)) {
                        qualityInfo.hdr_type = hdr;
                        break;
                    }
                }
            }
            
            if (activity && activity.applecation_quality === undefined) {
                activity.applecation_quality = qualityInfo;
            }
            
        }, (error) => {});
    }

    // Головна функція плагіна
    function initializePlugin() {
        console.log('Applecation', 'v' + APPLECATION_VERSION);
        
        if (!Lampa.Platform.screen('tv')) {
            console.log('Applecation', 'TV mode only');
            return;
        }

        patchApiImg();
        addCustomTemplate();
        addOverlayTemplate();
        addStyles();
        addSettings();
        applyLiquidGlassClass();
        attachLogoLoader();
        attachEpisodesCorePatch();
    }
    /**
     * Патч логіки лінії епізодів
     */
    function attachEpisodesCorePatch(){
        try{
            if(window.applecation_episodes_core_patch) return;
            window.applecation_episodes_core_patch = true;

            window.episodes_order_fix = true;
            window.episodes_core_patch = true;

            if(!window.Lampa || !Lampa.Utils || typeof Lampa.Utils.createInstance !== 'function') return;
            if(Lampa.Utils.__applecation_episodes_core_patch_applied) return;
            Lampa.Utils.__applecation_episodes_core_patch_applied = true;

            function looksLikeEpisodesLinePayload(element){
                try{
                    if(!element) return false;
                    if(!element.movie) return false;
                    if(!Array.isArray(element.results) || !element.results.length) return false;

                    var hits = 0;
                    for(var i = 0; i < element.results.length; i++){
                        var r = element.results[i];
                        if(!r) continue;

                        if(typeof r.episode_number === 'number') hits++;
                        if(typeof r.season_number === 'number') hits++;
                        if(r.comeing) hits++;
                        if(r.air_date) hits++;
                    }

                    return hits >= 3;
                }catch(e){
                    return false;
                }
            }

            function normalizeEpisodesResults(element){
                try{
                    var results = element.results || [];
                    var next = [];
                    var list = [];

                    for(var i = 0; i < results.length; i++){
                        var r = results[i];
                        if(!r) continue;
                        if(r.comeing) next.push(r);
                        else list.push(r);
                    }

                    list.sort(function(a,b){
                        return (a.episode_number || 0) - (b.episode_number || 0);
                    });

                    element.results = list.concat(next);
                }catch(e){}
            }

            function patchScrollAppendToKeepMoreLast(line){
                try{
                    if(!line || !line.scroll || typeof line.scroll.append !== 'function') return;
                    if(line.__applecation_episodes_scroll_append_patched) return;
                    line.__applecation_episodes_scroll_append_patched = true;

                    var originalAppend = line.scroll.append.bind(line.scroll);

                    line.scroll.append = function(object){
                        var node = object instanceof jQuery ? object[0] : object;

                        if(node && node.classList && node.classList.contains('card-more')){
                            return originalAppend(object);
                        }

                        var body = typeof line.scroll.body === 'function' ? line.scroll.body(true) : null;
                        if(body){
                            var more = body.querySelector('.card-more');
                            if(more && node && node !== more){
                                body.insertBefore(node, more);
                                return;
                            }
                        }

                        return originalAppend(object);
                    };
                }catch(e){}
            }

            function patchLineCreate(line){
                try{
                    if(!line || typeof line.create !== 'function') return;
                    if(line.__applecation_episodes_create_patched) return;
                    line.__applecation_episodes_create_patched = true;

                    var originalCreate = line.create.bind(line);

                    line.create = function(){
                        patchScrollAppendToKeepMoreLast(line);
                        var res = originalCreate();

                        setTimeout(function(){
                            try{
                                var body = line && line.scroll && typeof line.scroll.body === 'function' ? line.scroll.body(true) : null;
                                var more = body ? body.querySelector('.card-more') : null;
                                if(more) more.classList.remove('card-more--first');
                            }catch(e){}
                        }, 0);

                        return res;
                    };
                }catch(e){}
            }

            var original = Lampa.Utils.createInstance;

            Lampa.Utils.createInstance = function(BaseClass, element, add_params, replace){
                var isEpisodesLine = looksLikeEpisodesLinePayload(element);
                var shouldReverse = Lampa.Storage.get('applecation_reverse_episodes', true);

                if(isEpisodesLine && shouldReverse){
                    normalizeEpisodesResults(element);
                }

                var instance = original.call(this, BaseClass, element, add_params, replace);

                if(isEpisodesLine && shouldReverse){
                    patchLineCreate(instance);
                }

                return instance;
            };
        }catch(e){}
    }

    // Переклади для налаштувань (очищено від рейтингів та реакцій)
    const translations = {
        show_foreign_logo: {
            en: 'No language logo',
            uk: 'Логотип англійською',
        },
        show_foreign_logo_desc: {
            en: 'Show no language logo if localized version is missing',
            uk: 'Показувати логотип на англійській мові, якщо немає на українській',
        },
        year_short: {
            en: '',
            uk: ' р.',
        },
        logo_scale: {
            en: 'Logo Size',
            uk: 'Розмір логотипу',
        },
        logo_scale_desc: {
            en: 'Movie logo scale',
            uk: 'Масштаб логотипу фільму',
        },
        text_scale: {
            en: 'Text Size',
            uk: 'Розмір тексту',
        },
        text_scale_desc: {
            en: 'Movie data text scale',
            uk: 'Масштаб тексту даних про фільм',
        },
        scale_default: {
            en: 'Default',
            uk: 'За замовчуванням',
        },
        spacing_scale: {
            en: 'Spacing Between Lines',
            uk: 'Відступи між рядками',
        },
        spacing_scale_desc: {
            en: 'Distance between information elements',
            uk: 'Відстань між елементами інформації',
        },
        settings_title_display: {
            en: 'Display',
            uk: 'Відображення',
        },
        settings_title_scaling: {
            en: 'Scaling',
            uk: 'Масштабування',
       },
        show_episode_count: {
            en: 'Episode Count',
            uk: 'Кількість серій',
        },
        show_episode_count_desc: {
            en: 'Show total episode count for TV shows',
            uk: 'Показувати загальну кількість серій для серіалів',
        },
        reverse_episodes: {
            en: 'Reverse Episodes List',
            uk: 'Перевернути список епізодів',
        },
        reverse_episodes_desc: {
            en: 'Show episodes in reverse order (from newest to oldest)',
            uk: 'Показувати епізоди у зворотному порядку (від нових до старих)',
        },
        description_overlay: {
            en: 'Description in Overlay',
            uk: 'Опис в оверлеї',
        },
        description_overlay_desc: {
            en: 'Show description in a separate window when clicked',
            uk: 'Показувати опис в окремому вікні при натисканні',
        },
        liquid_glass: {
            en: 'Liquid Glass',
            uk: 'Рідке скло',
        },
        liquid_glass_desc: {
            en: '"Glassy" card effect on focus in episodes and cast',
            uk: 'Ефект «скляних» карток при наведенні в епізодах та акторах',
        },
        about_author: {
            en: 'Author',
            uk: 'Автор',
       },
        about_description: {
            en: 'Makes the movie card interface look like Apple TV and optimizes for 4K',
            uk: 'Робить інтерфейс у картці фільму схожим на Apple TV та оптимізує під 4K',
        }
    };

    function t(key) {
        let lang = Lampa.Storage.get('language', 'uk');
        if (lang === 'ru') lang = 'uk';
        return translations[key] && translations[key][lang] || translations[key].uk;
    }

    // Застосовуємо клас для управління ефектом рідкого скла
    function applyLiquidGlassClass() {
        if (Lampa.Storage.get('applecation_liquid_glass', true)) {
            $('body').removeClass('applecation--no-liquid-glass');
        } else {
            $('body').addClass('applecation--no-liquid-glass');
        }
    }
        // Додаємо налаштування плагіна
    function addSettings() {
        if (Lampa.Storage.get('applecation_logo_scale') === undefined) {
            Lampa.Storage.set('applecation_logo_scale', '100');
        }
        if (Lampa.Storage.get('applecation_text_scale') === undefined) {
            Lampa.Storage.set('applecation_text_scale', '100');
        }
        if (Lampa.Storage.get('applecation_spacing_scale') === undefined) {
            Lampa.Storage.set('applecation_spacing_scale', '100');
        }
        if (Lampa.Storage.get('applecation_reverse_episodes') === undefined) {
            Lampa.Storage.set('applecation_reverse_episodes', true);
        }
        if (Lampa.Storage.get('applecation_description_overlay') === undefined) {
            Lampa.Storage.set('applecation_description_overlay', true);
        }
        if (Lampa.Storage.get('applecation_show_foreign_logo') === undefined) {
            Lampa.Storage.set('applecation_show_foreign_logo', true);
        }
        if (Lampa.Storage.get('applecation_liquid_glass') === undefined) {
            Lampa.Storage.set('applecation_liquid_glass', true);
        }
        if (Lampa.Storage.get('applecation_show_episode_count') === undefined) {
            Lampa.Storage.set('applecation_show_episode_count', false);
        }

        Lampa.SettingsApi.addComponent({
            component: 'applecation_settings',
            name: 'Applecation',
            icon: PLUGIN_ICON
        });
        
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_about', type: 'static' },
            field: { name: '<div>Applecation v' + APPLECATION_VERSION + '</div>' },
            onRender: function(item) {
                item.css('opacity', '0.7');
                item.find('.settings-param__name').css({
                    'font-size': '1.2em', 'margin-bottom': '0.3em'
                });
                item.append('<div style="font-size: 0.9em; padding: 0 1.2em; line-height: 1.4;">' + t('about_author') + ': DarkestClouds<br>' + t('about_description') + '</div>');
            }
        });

        // Заголовок: Відображення
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_display_title', type: 'title' },
            field: { name: t('settings_title_display') }
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_show_foreign_logo', type: 'trigger', default: true },
            field: { name: t('show_foreign_logo'), description: t('show_foreign_logo_desc') }
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_reverse_episodes', type: 'trigger', default: true },
            field: { name: t('reverse_episodes'), description: t('reverse_episodes_desc') },
            onChange: function(value) { Lampa.Storage.set('applecation_reverse_episodes', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_description_overlay', type: 'trigger', default: true },
            field: { name: t('description_overlay'), description: t('description_overlay_desc') },
            onChange: function(value) { Lampa.Storage.set('applecation_description_overlay', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_show_episode_count', type: 'trigger', default: false },
            field: { name: t('show_episode_count'), description: t('show_episode_count_desc') }
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_liquid_glass', type: 'trigger', default: true },
            field: { name: t('liquid_glass'), description: t('liquid_glass_desc') },
            onChange: function(value) {
                Lampa.Storage.set('applecation_liquid_glass', value);
                applyLiquidGlassClass();
            }
        });

        // Заголовок: Масштабування
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_scaling_title', type: 'title' },
            field: { name: t('settings_title_scaling') }
        });

        const scaleValues = {
            '50': '50%', '60': '60%', '70': '70%', '80': '80%', '90': '90%',
            '100': t('scale_default'), '110': '110%', '120': '120%', '130': '130%',
            '140': '140%', '150': '150%', '160': '160%', '170': '170%', '180': '180%'
        };

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_logo_scale', type: 'select', values: scaleValues, default: '100' },
            field: { name: t('logo_scale'), description: t('logo_scale_desc') },
            onChange: function(value) { Lampa.Storage.set('applecation_logo_scale', value); applyScales(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_text_scale', type: 'select', values: scaleValues, default: '100' },
            field: { name: t('text_scale'), description: t('text_scale_desc') },
            onChange: function(value) { Lampa.Storage.set('applecation_text_scale', value); applyScales(); }
        });

        const spacingValues = { ...scaleValues, '200': '200%', '250': '250%', '300': '300%' };
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_spacing_scale', type: 'select', values: spacingValues, default: '100' },
            field: { name: t('spacing_scale'), description: t('spacing_scale_desc') },
            onChange: function(value) { Lampa.Storage.set('applecation_spacing_scale', value); applyScales(); }
        });
        
        applyScales();
    }

    // Застосовуємо масштабування контенту
    function applyScales() {
        const logoScale = parseInt(Lampa.Storage.get('applecation_logo_scale', '100'));
        const textScale = parseInt(Lampa.Storage.get('applecation_text_scale', '100'));
        const spacingScale = parseInt(Lampa.Storage.get('applecation_spacing_scale', '100'));

        $('style[data-id="applecation_scales"]').remove();

        const scaleStyles = `
            <style data-id="applecation_scales">
                .applecation .applecation__logo img {
                    max-width: ${35 * logoScale / 100}vw !important;
                    max-height: ${180 * logoScale / 100}px !important;
                }
                .applecation .applecation__content-wrapper { font-size: ${textScale}% !important; }
                .applecation .full-start-new__title { margin-bottom: ${0.5 * spacingScale / 100}em !important; }
                .applecation .applecation__meta { margin-bottom: ${0.5 * spacingScale / 100}em !important; }
                .applecation .applecation__description {
                    max-width: ${35 * textScale / 100}vw !important;
                    margin-bottom: ${0.5 * spacingScale / 100}em !important;
                }
                .applecation .applecation__info { margin-bottom: ${0.5 * spacingScale / 100}em !important; }
            </style>
        `;
        $('body').append(scaleStyles);
    }

    // Реєструємо шаблон для оверлею опису
    function addOverlayTemplate() {
        const overlayTemplate = `
            <div class="applecation-description-overlay">
                <div class="applecation-description-overlay__bg"></div>
                <div class="applecation-description-overlay__content selector">
                    <div class="applecation-description-overlay__logo"></div>
                    <div class="applecation-description-overlay__title">{title}</div>
                    <div class="applecation-description-overlay__text">{text}</div>
                    <div class="applecation-description-overlay__details">
                        <div class="applecation-description-overlay__info">
                            <div class="applecation-description-overlay__info-name">#{full_date_of_release}</div>
                            <div class="applecation-description-overlay__info-body">{relise}</div>
                        </div>
                        <div class="applecation-description-overlay__info applecation--budget">
                            <div class="applecation-description-overlay__info-name">#{full_budget}</div>
                            <div class="applecation-description-overlay__info-body">{budget}</div>
                        </div>
                        <div class="applecation-description-overlay__info applecation--countries">
                            <div class="applecation-description-overlay__info-name">#{full_countries}</div>
                            <div class="applecation-description-overlay__info-body">{countries}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        Lampa.Template.add('applecation_overlay', overlayTemplate);
    }
        // Реєструємо кастомний шаблон сторінки full
    function addCustomTemplate() {
        const template = `<div class="full-start-new applecation">
        <div class="full-start-new__body">
            <div class="full-start-new__left hide">
                <div class="full-start-new__poster">
                    <img class="full-start-new__img full--poster" />
                </div>
            </div>

            <div class="full-start-new__right">
                <div class="applecation__left">
                    <div class="applecation__logo"></div>
                    
                    <div class="applecation__content-wrapper">
                        <div class="full-start-new__title" style="display: none;">{title}</div>
                        
                        <div class="applecation__meta">
                            <div class="applecation__meta-left">
                                <span class="applecation__network"></span>
                                <span class="applecation__meta-text"></span>
                                <div class="full-start__pg hide"></div>
                            </div>
                        </div>
                        
                        <div class="applecation__description-wrapper">
                            <div class="applecation__description"></div>
                        </div>
                        <div class="applecation__info"></div>
                    </div>
                    
                    <div class="full-start-new__head" style="display: none;"></div>
                    <div class="full-start-new__details" style="display: none;"></div>

                    <div class="full-start-new__buttons">
                        <div class="full-start__button selector button--play">
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>
                                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>
                            </svg>
                            <span>#{title_watch}</span>
                        </div>

                        <div class="full-start__button selector button--book">
                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>
                            </svg>
                            <span>#{settings_input_links}</span>
                        </div>

                        <div class="full-start__button selector button--subscribe hide">
                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>
                                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>
                            </svg>
                            <span>#{title_subscribe}</span>
                        </div>

                        <div class="full-start__button selector button--options">
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>
                                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>
                                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="applecation__right">
                    <div class="rating--modss" style="display: none;"></div>
                </div>
            </div>
        </div>

        <div class="hide buttons--container">
            <div class="full-start__button view--torrent hide">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50px" height="50px">
                    <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/>
                </svg>
                <span>#{full_torrents}</span>
            </div>

            <div class="full-start__button selector view--trailer">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                </svg>
                <span>#{full_trailers}</span>
            </div>
        </div>
    </div>`;

        Lampa.Template.add('full_start_new', template);

        const episodeTemplate = `<div class="full-episode selector layer--visible">
            <div class="full-episode__img">
                <img />
                <div class="full-episode__time">{time}</div>
            </div>

            <div class="full-episode__body">
                <div class="full-episode__num">#{full_episode} {num}</div>
                <div class="full-episode__name">{name}</div>
                <div class="full-episode__overview">{overview}</div>
                <div class="full-episode__date">{date}</div>
            </div>
        </div>`;
        
        Lampa.Template.add('full_episode', episodeTemplate);
    }
        function disableFullDescription(e) {
        if (e.type === 'start' && e.link) {
            // Видаляємо 'description' зі списку rows перед рендерингом
            const rows = e.link.rows;
            const index = rows.indexOf('description');
            if (index > -1) {
                rows.splice(index, 1);
            }
        }
    }

    function addStyles() {
        const styles = `<style>

/* Основний контейнер */
.applecation {
    transition: all .3s;
}

.applecation .full-start-new__body {
    height: 80vh;
}

.applecation .full-start-new__right {
    display: flex;
    align-items: flex-end;
}

.applecation .full-start-new__title {
    font-size: 2.5em;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 0.5em;
    text-shadow: 0 0 .1em rgba(0, 0, 0, 0.3);
}

/* Логотип */
.applecation__logo {
    margin-bottom: 0.5em;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.applecation__logo.loaded {
    opacity: 1;
    transform: translateY(0);
}

.applecation__logo img {
    display: block;
    max-width: 35vw;
    max-height: 180px;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: left center;
}

/* Контейнер для контенту, що масштабується */
.applecation__content-wrapper {
    font-size: 100%;
}

/* Метаінформація (Тип/Жанр) */
.applecation__meta {
    display: flex;
    align-items: center;
    color: #fff;
    font-size: 1.1em;
    margin-bottom: 0.5em;
    line-height: 1;
    opacity: 0;
    transform: translateY(15px);
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;
    transition-delay: 0.05s;
}

.applecation__meta.show {
    opacity: 1;
    transform: translateY(0);
}

.applecation__meta-left {
    display: flex;
    align-items: center;
    line-height: 1;
}

.applecation__network {
    display: inline-flex;
    align-items: center;
    line-height: 1;
    margin-right: 1em;
}

.applecation__network img {
    display: block;
    max-height: 0.8em;
    width: auto;
    object-fit: contain;
    filter: brightness(0) invert(1);
}

.applecation__meta-text {
    line-height: 1;
}

.applecation__meta .full-start__pg {
    margin: 0 0 0 0.6em;
    padding: 0.2em 0.5em;
    font-size: 0.85em;
    font-weight: 600;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
    border-radius: 0.3em;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    line-height: 1;
    vertical-align: middle;
}

/* Обгортка для опису */
.applecation__description-wrapper {
    background-color: transparent;
    padding: 0;
    border-radius: 1em;
    width: fit-content;
    opacity: 0;
    transform: translateY(15px);
    transition:
        padding 0.25s ease,
        transform 0.25s ease,
        opacity 0.4s ease-out;
    transition-delay: 0.1s;
}

.applecation__description-wrapper.show {
    opacity: 1;
    transform: translateY(0);
}

.applecation__description-wrapper.focus {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.28),
    rgba(255, 255, 255, 0.18)
  );
  padding: .15em .4em 0 .7em;
  border-radius: 1em;
  width: fit-content;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35);

  transform: scale(1.07) translateY(0);
  
  transition-delay: 0s;
}

/* Опис */
.applecation__description {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.95em;
    line-height: 1.5;
    margin-bottom: 0.5em;
    max-width: 35vw;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.focus .applecation__description {
  color: rgba(255, 255, 255, 0.92);
}

/* Додаткова інформація (Рік/тривалість) */
.applecation__info {
    color: rgba(255, 255, 255, 0.75);
    font-size: 1em;
    line-height: 1.4;
    margin-bottom: 0.5em;
    opacity: 0;
    transform: translateY(15px);
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;
    transition-delay: 0.15s;
}

.applecation__info.show {
    opacity: 1;
    transform: translateY(0);
}

/* Ліва та права частини */
.applecation__left {
    flex-grow: 1;
}

.applecation__right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    position: relative;
}

/* Приховуємо стандартний rate-line (використовується тільки для статусу) */
.applecation .full-start-new__rate-line {
    margin: 0;
    height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
}

/* Фон - перевизначаємо стандартну анімацію на fade */
.full-start__background {
    height: calc(100% + 6em);
    left: 0 !important;
    opacity: 0 !important;
    transition: opacity 0.6s ease-out, filter 0.3s ease-out !important;
    animation: none !important;
    transform: none !important;
    will-change: opacity, filter;
}

.full-start__background.loaded:not(.dim) {
    opacity: 1 !important;
}

.full-start__background.dim {
  filter: blur(30px);
}

/* Утримуємо opacity при завантаженні нового фону */
.full-start__background.loaded.applecation-animated {
    opacity: 1 !important;
}

body:not(.menu--open) .full-start__background {
    mask-image: none;
}

/* Відключаємо стандартну анімацію Lampa для фону */
body.advanced--animation:not(.no--animation) .full-start__background.loaded {
    animation: none !important;
}

/* Приховуємо статус для запобігання виходу елементів за екран */
.applecation .full-start__status {
    display: none;
}

/* Оверлей для затемнення лівого краю */
.applecation__overlay {
    width: 90vw;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.792) 0%, rgba(0, 0, 0, 0.504) 25%, rgba(0, 0, 0, 0.264) 45%, rgba(0, 0, 0, 0.12) 55%, rgba(0, 0, 0, 0.043) 60%, rgba(0, 0, 0, 0) 65%);
}

/* Бейджі якості (залишено тільки 4K/HDR) */
.applecation__quality-badges {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    margin-left: 0.6em;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.applecation__quality-badges.show {
    opacity: 1;
    transform: translateY(0);
}

.quality-badge {
    display: inline-flex;
    height: 0.8em;
}

.quality-badge svg {
    height: 100%;
    width: auto;
    display: block;
}

.quality-badge--res svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.quality-badge--dv svg,
.quality-badge--hdr svg {
    color: rgba(255, 255, 255, 0.85);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* Епізоди Apple TV */
.applecation .full-episode--small {
    width: 20em !important;
    height: auto !important;
    margin-right: 1.5em !important;
    background: none !important;
    display: flex !important;
    flex-direction: column !important;
    transition: transform 0.3s !important;
}

.applecation .full-episode--small.focus {
    transform: scale(1.02);
}

.applecation .full-episode--next .full-episode__img::after {
  border: none !important;
}

.applecation .full-episode__img {
    padding-bottom: 56.25% !important;
    border-radius: 0.8em !important;
    margin-bottom: 1em !important;
    background-color: rgba(255,255,255,0.05) !important;
    position: relative !important;
    overflow: visible !important;
}

.applecation .full-episode__img img {
    border-radius: 0.8em !important;
    object-fit: cover !important;
}

.applecation .full-episode__time {
    position: absolute;
    bottom: 0.8em;
    left: 0.8em;
    background: rgba(0,0,0,0.6);
    padding: 0.2em 0.5em;
    border-radius: 0.4em;
    font-size: 0.75em;
    font-weight: 600;
    color: #fff;
    backdrop-filter: blur(5px);
    z-index: 2;
}

.applecation .full-episode__time:empty {
    display: none;
}

.applecation .full-episode__body {
    position: static !important;
    display: flex !important;
    flex-direction: column !important;
    background: none !important;
    padding: 0 0.5em !important;
    opacity: 0.6;
    transition: opacity 0.3s;
}

.applecation .full-episode.focus .full-episode__body {
    opacity: 1;
}

.applecation .full-episode__num {
    font-size: 0.75em !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    color: rgba(255,255,255,0.4) !important;
    margin-bottom: 0.2em !important;
    letter-spacing: 0.05em !important;
}

.applecation .full-episode__name {
    font-size: 1.1em !important;
    font-weight: 600 !important;
    color: #fff !important;
    margin-bottom: 0.4em !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    line-height: 1.4 !important;
    padding-bottom: 0.1em !important;
}

.applecation .full-episode__overview {
    font-size: 0.85em !important;
    line-height: 1.4 !important;
    color: rgba(255,255,255,0.5) !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    margin-bottom: 0.6em !important;
    height: 2.8em !important;
}

.applecation .full-episode__date {
    font-size: 0.8em !important;
    color: rgba(255,255,255,0.3) !important;
}

/* =========================================================
   БАЗА: нічого не блюримо/не затемнюємо без фокусу
   ========================================================= */

.applecation .full-episode{
  position: relative;
  z-index: 1;
  opacity: 1;
  filter: none;
  transition: transform .6s cubic-bezier(.16,1,.3,1);
}

/* без фокусу — взагалі без ефектів */
.applecation .full-episode:not(.focus){
  transform: none;
}

/* фокус — м'який “apple” підйом */
.applecation .full-episode.focus{
  z-index: 10;
  transform: scale(1.03) translateY(-6px);
}

/* =========================================================
   КАРТИНКА
   ========================================================= */

.applecation .full-episode__img{
  position: relative;
  overflow: hidden;
  border-radius: inherit;
  transition:
    box-shadow .6s cubic-bezier(.16,1,.3,1),
    backdrop-filter .6s cubic-bezier(.16,1,.3,1),
    transform .6s cubic-bezier(.16,1,.3,1);
}

/* =========================================================
   РІДКЕ СКЛО — ТІЛЬКИ НА ФОКУСІ
   ========================================================= */

.applecation .full-episode.focus .full-episode__img{
  box-shadow:
    0 0 0 1px rgba(255,255,255,.18),
    0 26px 65px rgba(0,0,0,.4) !important;

  -webkit-backdrop-filter: blur(14px) saturate(1.25) contrast(1.05);
  backdrop-filter: blur(14px) saturate(1.25) contrast(1.05);

  background: rgba(255,255,255,.06);
}

/* товщина скла */
.applecation .full-episode.focus .full-episode__img::before{
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;

  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.22),
    inset 0 0 18px rgba(255,255,255,.12),
    inset 0 -14px 22px rgba(0,0,0,.18);

  filter: blur(.35px);
  opacity: 1;
  transition: opacity .45s ease;
}

/* відблиск */
.applecation .full-episode.focus .full-episode__img::after{
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 3;

  background:
    radial-gradient(120% 85% at 18% 10%,
      rgba(255,255,255,.38),
      rgba(255,255,255,.10) 38%,
      transparent 62%),
    linear-gradient(135deg,
      rgba(255,255,255,.20),
      rgba(255,255,255,0) 52%,
      rgba(255,255,255,.06));

  mix-blend-mode: screen;
  opacity: .95;

  transition:
    opacity .45s ease,
    transform .65s cubic-bezier(.16,1,.3,1);
}

/* коли фокусу немає — просто не показуємо шари скла */
.applecation .full-episode:not(.focus) .full-episode__img::before,
.applecation .full-episode:not(.focus) .full-episode__img::after{
  opacity: 0;
}

/* прибрати старий оверлей */
.applecation .full-episode.focus::after{
  display: none !important;
}

.applecation .full-episode__viewed {
    top: 0.8em !important;
    right: 0.8em !important;
    background: rgba(0,0,0,0.5) !important;
    border-radius: 50% !important;
    padding: 0.3em !important;
    backdrop-filter: blur(10px) !important;
}

/* Статус наступної серії */
.applecation .full-episode--next .full-episode__img:after {
    border-radius: 0.8em !important;
}

/* Оверлей для повного опису */
.applecation-description-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}

.applecation-description-overlay.show {
    opacity: 1;
    visibility: visible;
    pointer-events: all;
}

.applecation-description-overlay__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    -webkit-backdrop-filter: blur(100px);
    backdrop-filter: blur(100px);
}

.applecation-description-overlay__content {
    position: relative;
    z-index: 1;
    max-width: 60vw;
    max-height: 90vh;
    overflow-y: auto;
}

.applecation-description-overlay__logo {
    text-align: center;
    margin-bottom: 1.5em;
    display: none;
}

.applecation-description-overlay__logo img {
    max-width: 40vw;
    max-height: 150px;
    width: auto;
    height: auto;
    object-fit: contain;
}

.applecation-description-overlay__title {
    font-size: 2em;
    font-weight: 600;
    margin-bottom: 1em;
    color: #fff;
    text-align: center;
}

.applecation-description-overlay__text {
    font-size: 1.2em;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    white-space: pre-wrap;
    margin-bottom: 1.5em;
}

.applecation-description-overlay__details {
    display: flex;
    flex-wrap: wrap;
    margin: -1em;
}

.applecation-description-overlay__details > * {
    margin: 1em;
}

.applecation-description-overlay__info-name {
    font-size: 1.1em;
    margin-bottom: 0.5em;
}

.applecation-description-overlay__info-body {
    font-size: 1.2em;
    opacity: 0.6;
}

/* Скролбар для опису */
.applecation-description-overlay__content::-webkit-scrollbar {
    width: 0.5em;
}

.applecation-description-overlay__content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1em;
}

.applecation-description-overlay__content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 1em;
}

.applecation-description-overlay__content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
}

/* =========================================================
   ПЕРСОНИ (АКТОРИ ТА ЗНІМАЛЬНА ГРУПА) - APPLE TV СТИЛЬ
   ========================================================= */

.applecation .full-person {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    width: 10.7em !important;
    background: none !important;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform;
    -webkit-animation: none !important;
    animation: none !important;
    margin-left: 0;
}

.applecation .full-person.focus {
    transform: scale(1.08) translateY(-6px) !important;
    z-index: 10;
}

/* Фото персони - кругле */
.applecation .full-person__photo {
    position: relative !important;
    width: 9.4em !important;
    height: 9.4em !important;
    margin: 0 0 .3em 0 !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    background: rgba(255, 255, 255, 0.05) !important;
    flex-shrink: 0 !important;
    transition: 
        box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1),
        backdrop-filter 0.6s cubic-bezier(0.16, 1, 0.3, 1),
        -webkit-backdrop-filter 0.6s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
        background 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform, box-shadow, backdrop-filter;
    -webkit-animation: none !important;
    animation: none !important;
}

.applecation .full-person__photo img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    border-radius: 50% !important;
}

/* Зміщуємо обличчя тільки при високій якості (w500), оскільки там інший кроп у TMDB */
.applecation.applecation--poster-high .full-person__photo img {
    object-position: center calc(50% + 20px) !important;
}

/* Дефолтні заглушки залишаємо по центру, щоб не ламати симетрію іконок */
.applecation .full-person__photo img[src*="actor.svg"],
.applecation .full-person__photo img[src*="img_broken.svg"] {
    object-position: center !important;
}

/* РІДКЕ СКЛО — БАЗОВІ ШАРИ (приховані) */
.applecation .full-person__photo::before,
.applecation .full-person__photo::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: opacity;
}

/* товщина скла */
.applecation .full-person__photo::before {
    z-index: 2;
    box-shadow:
        inset 2px 2px 1px rgba(255, 255, 255, 0.30),
        inset -2px -2px 2px rgba(255, 255, 255, 0.30);
}

/* ореол та відблиск */
.applecation .full-person__photo::after {
    z-index: 3;
    background:
        radial-gradient(circle at center,
            transparent 58%,
            rgba(255, 255, 255, 0.22) 75%,
            rgba(255, 255, 255, 0.38) 90%),
        radial-gradient(120% 85% at 18% 10%,
            rgba(255, 255, 255, 0.35),
            rgba(255, 255, 255, 0.10) 38%,
            transparent 62%);
    mix-blend-mode: screen;
}

/* ЕФЕКТИ ПРИ ФОКУСІ */

.applecation .full-person.focus .full-person__photo::before,
.applecation .full-person.focus .full-person__photo::after {
    opacity: 1;
}

.applecation .full-person.focus .full-person__photo::after {
    opacity: 0.9;
}

/* Текстова інформація */
.applecation .full-person__body {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    width: 100% !important;
    padding: 0 0.3em !important;
}

/* Ім'я персони */
.applecation .full-person__name {
    font-size: 1em !important;
    font-weight: 600 !important;
    color: #fff !important;
    line-height: 1.3 !important;
    width: 100% !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    position: relative !important;
}

/* Рухомий рядок для довгих імен */
.applecation .full-person__name.marquee-active {
    text-overflow: clip !important;
    mask-image: linear-gradient(to right, #000 92%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, #000 92%, transparent 100%);
}

/* При фокусі (коли рядок їде) прозорість з обох сторін */
.applecation .full-person.focus .full-person__name.marquee-active {
    mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);
}

.applecation .marquee__inner {
    display: inline-block;
    white-space: nowrap;
}

.applecation .marquee__inner span {
    padding-right: 2.5em;
    display: inline-block;
}

/* Запуск анімації при фокусі */
.applecation .full-person.focus .full-person__name.marquee-active .marquee__inner {
    animation: marquee var(--marquee-duration, 5s) linear infinite;
}

@keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}

/* Роль персони */
.applecation .full-person__role {
    font-size: 0.8em !important;
    font-weight: 400 !important;
    color: rgba(255, 255, 255, 0.5) !important;
    line-height: 1.3 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    width: 100% !important;
    margin-top: 0;
}

.applecation .full-person.focus .full-person__role {
    color: rgb(255, 255, 255) !important;
}

/* ВІДКЛЮЧЕННЯ РІДКОГО СКЛА */
body.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img,
body.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(255,255,255,0.05) !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
}

body.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img::before,
body.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img::after,
body.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo::before,
body.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo::after {
    display: none !important;
}
</style>`;
        
        Lampa.Template.add('applecation_css', styles);
        $('body').append(Lampa.Template.get('applecation_css', {}, true));
    }
        // Патчимо внутрішні методи Лампи для коректної роботи епізодів та якості
    function patchApiImg() {
        const tmdbSource = Lampa.Api.sources.tmdb;

        if (!tmdbSource) return;

        // 0. Патчимо формування URL для TMDB, щоб додати логотипи в основний запит (append_to_response)
        if (window.Lampa && Lampa.TMDB && Lampa.TMDB.api) {
            const originalTmdbApi = Lampa.TMDB.api;
            Lampa.TMDB.api = function(url) {
                let newUrl = url;
                if (typeof newUrl === 'string' && newUrl.indexOf('append_to_response=') !== -1 && newUrl.indexOf('images') === -1) {
                    newUrl = newUrl.replace('append_to_response=', 'append_to_response=images,');
                    
                    if (newUrl.indexOf('include_image_language=') === -1) {
                        const lang = Lampa.Storage.field('tmdb_lang') || Lampa.Storage.get('language') || 'uk';
                        newUrl += (newUrl.indexOf('?') === -1 ? '?' : '&') + 'include_image_language=en,null,' + lang;
                    }
                }
                return originalTmdbApi.call(Lampa.TMDB, newUrl);
            };
        }
        
        // 1. Патчимо шаблонізатор, щоб примусово змінити формат дати та часу в картках
        const originalTemplateJs = Lampa.Template.js;
        Lampa.Template.js = function(name, vars) {
            if (name === 'full_episode' && vars) {
                if (vars.runtime > 0) {
                    vars.time = Lampa.Utils.secondsToTimeHuman(vars.runtime * 60).replace(/\./g, '');
                } else {
                    vars.time = '';
                }

                if (vars.air_date) {
                    const dateObj = new Date(vars.air_date.replace(/-/g, '/'));
                    const month = dateObj.getMonth() + 1;
                    const monthEnd = Lampa.Lang.translate('month_' + month + '_e');
                    const yearSuffix = t('year_short');
                    vars.date = dateObj.getDate() + ' ' + monthEnd + ' ' + dateObj.getFullYear() + yearSuffix;
                }
            }
            return originalTemplateJs.call(Lampa.Template, name, vars);
        };

        // 2. Патчимо метод зображень для покращення якості
        const originalImg = tmdbSource.img;
        tmdbSource.img = function(src, size) {
            const posterSize = Lampa.Storage.field('poster_size');

            if (size === 'w1280') {
                const backdropMap = {
                    'w200': 'w780',
                    'w300': 'w1280',
                    'w500': 'original'
                };
                size = backdropMap[posterSize] || 'w1280';
            }

            if (size === 'w300') {
                const episodeMap = {
                    'w200': 'w300',
                    'w300': 'w780',
                    'w500': 'w780'
                };
                size = episodeMap[posterSize] || 'w300';
            }

            if (size === 'w276_and_h350_face' && posterSize === 'w500') {
                size = 'w600_and_h900_face';
            }

            return originalImg.call(tmdbSource, src, size);
        };

        Lampa.Api.img = tmdbSource.img;
    }

    // Отримуємо якість логотипу на основі poster_size
    function getLogoQuality() {
        const posterSize = Lampa.Storage.field('poster_size');
        const qualityMap = {
            'w200': 'w300',      
            'w300': 'w500',      
            'w500': 'original'   
        };
        return qualityMap[posterSize] || 'w500';
    }

    // Отримуємо локалізований тип медіа
    function getMediaType(data) {
        const lang = Lampa.Storage.get('language', 'uk');
        const isTv = !!data.name;
        
        const types = {
            en: isTv ? 'TV Series' : 'Movie',
            uk: isTv ? 'Серіал' : 'Фільм',
        };
        
        return types[lang] || types['uk'] || types['en'];
    }

    // Завантажуємо іконку студії/мережі
    function loadNetworkIcon(activity, data) {
        const networkContainer = activity.render().find('.applecation__network');
        
        if (data.networks && data.networks.length) {
            const network = data.networks[0];
            if (network.logo_path) {
                const logoUrl = Lampa.Api.img(network.logo_path, 'w200');
                networkContainer.html(`<img src="${logoUrl}" alt="${network.name}">`);
                return;
            }
        }
        
        if (data.production_companies && data.production_companies.length) {
            const company = data.production_companies[0];
            if (company.logo_path) {
                const logoUrl = Lampa.Api.img(company.logo_path, 'w200');
                networkContainer.html(`<img src="${logoUrl}" alt="${company.name}">`);
                return;
            }
        }
        
        networkContainer.remove();
    }

    // Заповнюємо метаінформацію (Тип/Жанр)
    function fillMetaInfo(activity, data) {
        const metaTextContainer = activity.render().find('.applecation__meta-text');
        const metaParts = [];

        metaParts.push(getMediaType(data));

        if (data.genres && data.genres.length) {
            const genres = data.genres.slice(0, 2).map(g => 
                Lampa.Utils.capitalizeFirstLetter(g.name)
            );
            metaParts.push(...genres);
        }

        metaTextContainer.html(metaParts.join(' · '));
        loadNetworkIcon(activity, data);
    }

    // Заповнюємо опис
    function fillDescription(activity, data) {
        const descContainer = activity.render().find('.applecation__description');
        const descWrapper = activity.render().find('.applecation__description-wrapper');
        const description = data.overview || '';
        const useOverlay = Lampa.Storage.get('applecation_description_overlay', true);
        
        descContainer.text(description);
        
        if (useOverlay) {
            createDescriptionOverlay(activity, data);
            descWrapper.off('hover:enter').on('hover:enter', function() {
                showFullDescription();
            });
        } else {
            descWrapper.off('hover:enter');
            $('.applecation-description-overlay').remove();
        }
    }
    
    // Оновлюємо логотип в оверлеї
    function updateOverlayLogo(logoUrl) {
        const overlay = $('.applecation-description-overlay');
        if (!overlay.length) return;
        
        if (logoUrl) {
            const newLogoImg = $('<img>').attr('src', logoUrl);
            overlay.find('.applecation-description-overlay__logo').html(newLogoImg).css('display', 'block');
            overlay.find('.applecation-description-overlay__title').css('display', 'none');
        }
    }
    
    // Парсимо країни з локалізацією
    function parseCountries(movie) {
        if (!movie.production_countries) return [];
        
        return movie.production_countries.map(country => {
            const isoCode = country.iso_3166_1;
            const langKey = 'country_' + isoCode.toLowerCase();
            const translated = Lampa.Lang.translate(langKey);
            return translated !== langKey ? translated : country.name;
        });
    }
    
    // Створюємо оверлей заздалегідь
    function createDescriptionOverlay(activity, data) {
        const text = data.overview || '';
        const title = data.title || data.name;
        
        if (!text) return;
        
        $('.applecation-description-overlay').remove();
        
        const date = (data.release_date || data.first_air_date || '') + '';
        const relise = date.length > 3 ? Lampa.Utils.parseTime(date).full : date.length > 0 ? date : Lampa.Lang.translate('player_unknown');
        const budget = '$ ' + Lampa.Utils.numberWithSpaces(data.budget || 0);
        const countriesArr = parseCountries(data);
        const countries = countriesArr.join(', ');
        
        const overlay = $(Lampa.Template.get('applecation_overlay', {
            title: title,
            text: text,
            relise: relise,
            budget: budget,
            countries: countries
        }));
        
        if (!data.budget || data.budget === 0) overlay.find('.applecation--budget').remove();
        if (!countries) overlay.find('.applecation--countries').remove();
        
        $('body').append(overlay);
        overlay.data('controller-created', false);
    }
    
    // Показуємо повний опис в оверлеї
    function showFullDescription() {
        const overlay = $('.applecation-description-overlay');
        if (!overlay.length) return;
        
        setTimeout(() => overlay.addClass('show'), 10);
        
        if (!overlay.data('controller-created')) {
            const controller = {
                toggle: function() {
                    Lampa.Controller.collectionSet(overlay);
                    Lampa.Controller.collectionFocus(overlay.find('.applecation-description-overlay__content'), overlay);
                },
                back: function() {
                    closeDescriptionOverlay();
                }
            };
            
            Lampa.Controller.add('applecation_description', controller);
            overlay.data('controller-created', true);
        }
        
        Lampa.Controller.toggle('applecation_description');
    }
    
    // Закриваємо оверлей з описом
    function closeDescriptionOverlay() {
        const overlay = $('.applecation-description-overlay');
        if (!overlay.length) return;
        
        overlay.removeClass('show');
        setTimeout(() => {
            Lampa.Controller.toggle('content');
        }, 300);
    }

    // Відмінювання сезонів з локалізацією
    function formatSeasons(count) {
        const lang = Lampa.Storage.get('language', 'uk');
        
        if (['ru', 'uk', 'be', 'bg'].includes(lang)) {
            const cases = [2, 0, 1, 1, 1, 2];
            const titles = {
                uk: ['сезон', 'сезони', 'сезонів'],
            };
            const langTitles = titles['uk'];
            const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];
            return `${count} ${langTitles[caseIndex]}`;
        }
        
        if (lang === 'en') return count === 1 ? `${count} Season` : `${count} Seasons`;
        const seasonWord = Lampa.Lang.translate('full_season');
        return count === 1 ? `${count} ${seasonWord}` : `${count} ${seasonWord}s`;
    }

    // Відмінювання серій з локалізацією
    function formatEpisodes(count) {
        const lang = Lampa.Storage.get('language', 'uk');
        
        if (['ru', 'uk', 'be', 'bg'].includes(lang)) {
            const cases = [2, 0, 1, 1, 1, 2];
            const titles = {
                uk: ['серія', 'серії', 'серій'],
            };
            const langTitles = titles['uk'];
            const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];
            return `${count} ${langTitles[caseIndex]}`;
        }
        
        if (lang === 'en') return count === 1 ? `${count} Episode` : `${count} Episodes`;
        const episodeWord = Lampa.Lang.translate('full_episode');
        return count === 1 ? `${count} ${episodeWord}` : `${count} ${episodeWord}s`;
    }

    // Заповнюємо додаткову інформацію (Рік/тривалість)
    function fillAdditionalInfo(activity, data) {
        const infoContainer = activity.render().find('.applecation__info');
        const infoParts = [];

        const releaseDate = data.release_date || data.first_air_date || '';
        if (releaseDate) {
            const year = releaseDate.split('-')[0];
            infoParts.push(year);
        }

        if (data.name) {
            if (data.episode_run_time && data.episode_run_time.length) {
                const avgRuntime = data.episode_run_time[0];
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');
                infoParts.push(`${avgRuntime} ${timeM}`);
            }
            
            const seasons = Lampa.Utils.countSeasons(data);
            if (seasons) {
                infoParts.push(formatSeasons(seasons));
            }

            if (Lampa.Storage.get('applecation_show_episode_count', false)) {
                const episodes = data.number_of_episodes;
                if (episodes) {
                    infoParts.push(formatEpisodes(episodes));
                }
            }
        } else {
            if (data.runtime && data.runtime > 0) {
                const hours = Math.floor(data.runtime / 60);
                const minutes = data.runtime % 60;
                const timeH = Lampa.Lang.translate('time_h').replace('.', '');
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');
                const timeStr = hours > 0 
                    ? `${hours} ${timeH} ${minutes} ${timeM}` 
                    : `${minutes} ${timeM}`;
                infoParts.push(timeStr);
            }
        }

        const textContent = infoParts.length > 0 ? infoParts.join(' · ') : '';
        infoContainer.html(textContent + '<span class="applecation__quality-badges"></span>');
    }
        // Завантажуємо логотип фільму
    function loadLogo(event) {
        const data = event.data.movie;
        const activity = event.object.activity;
        
        if (!data || !activity) return;

        fillMetaInfo(activity, data);
        fillDescription(activity, data);
        fillAdditionalInfo(activity, data);

        waitForBackgroundLoad(activity, () => {
            if (!isAlive(activity)) return;

            activity.render().find('.applecation__meta').addClass('show');
            
            const useOverlay = Lampa.Storage.get('applecation_description_overlay', true);
            const descWrapper = activity.render().find('.applecation__description-wrapper').addClass('show');
            
            if (useOverlay) {
                descWrapper.addClass('selector');
                if (window.Lampa && Lampa.Controller) {
                    Lampa.Controller.collectionAppend(descWrapper);
                }
            }
            
            activity.render().find('.applecation__info').addClass('show');
            // Видалено код для анімації рейтингів
        });

        const logoContainer = activity.render().find('.applecation__logo');
        const titleElement = activity.render().find('.full-start-new__title');

        const renderLogo = (logoPath) => {
            const quality = getLogoQuality();
            const logoUrl = Lampa.TMDB.image(`/t/p/${quality}${logoPath}`);

            const img = new Image();
            img.onload = () => {
                if (!isAlive(activity)) return;

                logoContainer.html(`<img src="${logoUrl}" alt="" />`);
                waitForBackgroundLoad(activity, () => {
                    if (!isAlive(activity)) return;
                    logoContainer.addClass('loaded');
                });
                
                updateOverlayLogo(logoUrl);
            };
            img.src = logoUrl;
        };

        if (data.images && data.images.logos && data.images.logos.length > 0) {
            const lang = Lampa.Storage.field('tmdb_lang') || Lampa.Storage.get('language') || 'uk';
            let logo = data.images.logos.find(l => l.iso_639_1 === lang);
            
            if (!logo && Lampa.Storage.get('applecation_show_foreign_logo', true)) {
                logo = data.images.logos.find(l => l.iso_639_1 === 'en');
                if (!logo) logo = data.images.logos.find(l => !l.iso_639_1);
                if (!logo) logo = data.images.logos[0];
            }

            if (logo && logo.file_path) return renderLogo(logo.file_path);
        }

        const mediaType = data.name ? 'tv' : 'movie';
        const apiUrl = Lampa.TMDB.api(
            `${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}&language=${Lampa.Storage.get('language')}`
        );

        $.get(apiUrl, (imagesData) => {
            if (!isAlive(activity)) return;

            if (imagesData.logos && imagesData.logos.length > 0) {
                const lang = Lampa.Storage.field('tmdb_lang') || Lampa.Storage.get('language') || 'uk';
                let logo = imagesData.logos.find(l => l.iso_639_1 === lang);

                if (!logo && Lampa.Storage.get('applecation_show_foreign_logo', true)) {
                    logo = imagesData.logos.find(l => l.iso_639_1 === 'en') || imagesData.logos.find(l => !l.iso_639_1) || imagesData.logos[0];
                }

                if (logo && logo.file_path) return renderLogo(logo.file_path);
            }
            
            titleElement.show();
            waitForBackgroundLoad(activity, () => {
                logoContainer.addClass('loaded');
            });
        }).fail(() => {
            titleElement.show();
            waitForBackgroundLoad(activity, () => {
                logoContainer.addClass('loaded');
            });
        });
    }

    // Чекаємо завантаження та появи фону
    function waitForBackgroundLoad(activity, callback) {
        const background = activity.render().find('.full-start__background:not(.applecation__overlay)');
        
        if (!background.length) {
            callback();
            return;
        }

        if (background.hasClass('loaded') && background.hasClass('applecation-animated')) {
            callback();
            return;
        }

        if (background.hasClass('loaded')) {
            setTimeout(() => {
                background.addClass('applecation-animated');
                callback();
            }, 350);
            return;
        }

        const checkInterval = setInterval(() => {
            if (!isAlive(activity)) {
                clearInterval(checkInterval);
                return;
            }

            if (background.hasClass('loaded')) {
                clearInterval(checkInterval);
                setTimeout(() => {
                    if (!isAlive(activity)) return;
                    background.addClass('applecation-animated');
                    callback();
                }, 650);
            }
        }, 50);

        setTimeout(() => {
            clearInterval(checkInterval);
            if (!background.hasClass('applecation-animated')) {
                background.addClass('applecation-animated');
                callback();
            }
        }, 2000);
    }

    // Додаємо оверлей поруч із фоном
    function addOverlay(activity) {
        const background = activity.render().find('.full-start__background');
        if (background.length && !background.next('.applecation__overlay').length) {
            background.after('<div class="full-start__background loaded applecation__overlay"></div>');
        }
    }

    // Застосовуємо розмиття фону при прокручуванні
    function attachScrollBlur(activity) {
        const background = activity.render().find('.full-start__background:not(.applecation__overlay)')[0];
        const scrollBody = activity.render().find('.scroll__body')[0];
        
        if (!background || !scrollBody) return;
        
        let isBlurred = false;
        
        const originalDescriptor = Object.getOwnPropertyDescriptor(scrollBody.style, '-webkit-transform') || 
                                   Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'webkitTransform');
        
        Object.defineProperty(scrollBody.style, '-webkit-transform', {
            set: function(value) {
                if (value) {
                    const yStart = value.indexOf(',') + 1;
                    const yEnd = value.indexOf(',', yStart);
                    if (yStart > 0 && yEnd > yStart) {
                        const yValue = parseFloat(value.substring(yStart, yEnd));
                        const shouldBlur = yValue < 0;
                        
                        if (shouldBlur !== isBlurred) {
                            isBlurred = shouldBlur;
                            background.classList.toggle('dim', shouldBlur);
                        }
                    }
                }
                
                if (originalDescriptor && originalDescriptor.set) {
                    originalDescriptor.set.call(this, value);
                } else {
                    this.setProperty('-webkit-transform', value);
                }
            },
            get: function() {
                if (originalDescriptor && originalDescriptor.get) {
                    return originalDescriptor.get.call(this);
                }
                return this.getPropertyValue('-webkit-transform');
            },
            configurable: true
        });
    }

    // Додаємо рухомий рядок для довгих імен персон
    function attachPersonMarquee(activity) {
        const render = activity.render();
        const names = render.find('.full-person__name');
        
        names.each(function() {
            const nameElement = $(this);
            if (nameElement.hasClass('marquee-processed')) {
                const originalText = nameElement.find('span').first().text();
                if (originalText) {
                    nameElement.text(originalText);
                    nameElement.removeClass('marquee-processed marquee-active');
                    nameElement.css('--marquee-duration', '');
                }
            }
        });

        function isTextOverflowing(element) {
            return element.scrollWidth > element.clientWidth + 1;
        }
        
        setTimeout(() => {
            if (!isAlive(activity)) return;

            names.each(function() {
                const nameElement = $(this);
                const text = nameElement.text().trim();
                
                if (!text) return;
                
                if (isTextOverflowing(nameElement[0])) {
                    const duration = Math.min(Math.max(text.length * 0.25, 5), 20);
                    
                    nameElement.addClass('marquee-processed marquee-active');
                    nameElement.css('--marquee-duration', duration + 's');
                    
                    const span1 = $('<span>').text(text);
                    const span2 = $('<span>').text(text);
                    const inner = $('<div class="marquee__inner">').append(span1).append(span2);
                    
                    nameElement.empty().append(inner);
                } else {
                    nameElement.addClass('marquee-processed');
                }
            });
        }, 100);
    }

    // Підключаємо завантаження логотипів та загальний патчинг
    function attachLogoLoader() {
        Lampa.Listener.follow('full', (event) => {
            if (Lampa.Storage.get('applecation_description_overlay', true)) {
                disableFullDescription(event);
            }
            
            if (event.type === 'complite') {
                const activity = event.object.activity;
                const render = activity.render();
                
                render.addClass('applecation');
                activity.__destroyed = false;
                
                var originalDestroy = activity.destroy;
                activity.destroy = function() {
                    activity.__destroyed = true;
                    if (originalDestroy) originalDestroy.apply(activity, arguments);
                };

                const posterSize = Lampa.Storage.field('poster_size');
                render.toggleClass('applecation--poster-high', posterSize === 'w500');

                addOverlay(activity);
                loadLogo(event);
                
                attachScrollBlur(activity);
                attachPersonMarquee(activity);

                const movie = event.data && event.data.movie;
                if (movie) {
                    analyzeContentQualities(movie, activity);
                }
            }
        });
    }

    // Реєстрація плагіна в маніфесті
    var pluginManifest = {
        type: 'other',
        version: APPLECATION_VERSION,
        name: 'Applecation (Cleaned)',
        description: 'Оновлений інтерфейс у картці фільму під Apple TV з оптимізацією (Очищена версія).',
        author: '@darkestclouds & Modified',
        icon: PLUGIN_ICON
    };

    if (Lampa.Manifest && Lampa.Manifest.plugins) {
        Lampa.Manifest.plugins = pluginManifest;
    }

    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', (event) => {
            if (event.type === 'ready') {
                initializePlugin();
            }
        });
    }

})();
