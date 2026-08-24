(function startBarMartiri() {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuData = window.BAR_MARTIRI_MENU || {
    categories: [],
    products: [],
    productTranslations: {},
    categoryOverrides: {},
  };
  const supabaseConfig = window.BAR_MARTIRI_SUPABASE || {};
  const localProductImages = window.BAR_MARTIRI_LOCAL_PRODUCT_IMAGES || {};
  const story = document.querySelector('.flavor-story');
  const dock = document.querySelector('[data-bottom-dock]');
  const dockActions = [...document.querySelectorAll('[data-dock-action]')];
  const panelLayer = document.querySelector('[data-panel-layer]');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const menuPanel = panels.find((panel) => panel.dataset.panel === 'menu') || null;
  const closeButtons = [...document.querySelectorAll('[data-panel-close]')];
  const categoryTabs = document.querySelector('[data-category-tabs]');
  const productGrid = document.querySelector('[data-product-grid]');
  const menuStatus = document.querySelector('[data-menu-status]');
  const menuSearchInput = document.querySelector('[data-menu-search]');
  const cookieBanner = document.querySelector('[data-cookie-banner]');
  const languageSwitches = [...document.querySelectorAll('[data-language-switch]')];
  const languageSwitchers = [...document.querySelectorAll('[data-language-switcher]')];
  const LANGUAGE_META = Object.freeze({
    sq: { flag: '🇦🇱', code: 'SQ' },
    it: { flag: '🇮🇹', code: 'IT' },
    en: { flag: '🇬🇧', code: 'EN' },
  });
  const mapFrame = document.querySelector('[data-map-shell] iframe');
  const mapPlaceholder = document.querySelector('[data-map-placeholder]');
  const reviewRatingEl = document.querySelector('[data-review-rating]');
  const reviewCopyEl = document.querySelector('[data-review-copy]');
  const reviewsListEl = document.querySelector('.reviews-list');
  const gallerySection = document.querySelector('[data-gallery-section]');
  const galleryGridEl = document.querySelector('[data-gallery-grid]');
  const storySection = document.querySelector('[data-story-section]');
  const storyTitleEl = document.querySelector('[data-story-title]');
  const storyBodyEl = document.querySelector('[data-story-body]');
  const whatsappButton = document.querySelector('[data-whatsapp-button]');
  const siteHeader = document.querySelector('.site-header');
  const chatMessagesEl = document.querySelector('[data-chat-messages]');
  const chatEmptyEl = document.querySelector('[data-chat-empty]');
  const chatFormEl = document.querySelector('[data-chat-form]');
  const chatNameInputEl = document.querySelector('[data-chat-name-input]');
  const chatUnreadBadge = document.querySelector('[data-chat-unread]');
  const basketItemsEl = document.querySelector('[data-basket-items]');
  const basketEmptyEl = document.querySelector('[data-basket-empty]');
  const basketSummaryEl = document.querySelector('[data-basket-summary]');
  const basketTotalEl = document.querySelector('[data-basket-total]');
  const basketCountEls = [...document.querySelectorAll('[data-basket-count]')];
  const checkoutForm = document.querySelector('[data-checkout-form]');
  const checkoutErrorEl = document.querySelector('[data-checkout-error]');
  const umbrellaRowSelect = document.querySelector('[data-umbrella-row]');
  const umbrellaNumberSelect = document.querySelector('[data-umbrella-number]');
  const basketStatusEl = document.querySelector('[data-basket-status]');
  const basketStatusHeadlineEl = document.querySelector('[data-basket-status-headline]');
  const basketStatusDetailEl = document.querySelector('[data-basket-status-detail]');
  const basketNewOrderButton = document.querySelector('[data-basket-new-order]');
  const MENU_CACHE_KEY = 'barMartiri.publicMenu.v3';
  const MENU_CACHE_TTL = 24 * 60 * 60 * 1000;
  const MENU_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  const WEATHER_CACHE_KEY = 'barMartiri.spilleWeather.v1';
  const WEATHER_CACHE_TTL = 60 * 60 * 1000;
  const SPILLE_COORDS = { latitude: 41.0966, longitude: 19.4583 };
  const COOKIE_NAME = 'bar_martiri_cookie_pref';
  const LANGUAGE_COOKIE_NAME = 'bar_martiri_language';
  const COOKIE_MAX_AGE = 180 * 24 * 60 * 60;
  const LANGUAGE_KEY = 'barMartiri.language.v1';

  const LANGUAGE_LOCALES = Object.freeze({
    sq: 'sq-AL',
    it: 'it-IT',
    en: 'en-GB',
  });

  // The sunbed day rate is editable from /admin, so it is fetched rather than
  // hardcoded. The build injects the same value into the static HTML for
  // crawlers; this keeps the page correct between deploys.
  let sunbedSettings = null;

  async function refreshSunbedPrice() {
    if (!supabaseConfig.url || !supabaseConfig.publishableKey) return;
    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/site_settings?select=sunbed_price,sunbed_currency&id=eq.main`,
        {
          headers: {
            apikey: supabaseConfig.publishableKey,
            Authorization: `Bearer ${supabaseConfig.publishableKey}`,
          },
        }
      );
      if (!response.ok) return;
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return;
      const raw = row.sunbed_price;
      const price = raw === null || raw === undefined || raw === '' ? null : Number.parseInt(raw, 10);
      sunbedSettings = {
        price: Number.isFinite(price) && price > 0 ? price : null,
        currency: String(row.sunbed_currency || 'ALL').trim() || 'ALL',
      };
      renderSunbedPrice();
    } catch {
      // Leave whatever the build injected; a stale price beats no price.
    }
  }

  function renderSunbedPrice() {
    const slot = document.querySelector('[data-sunbed-price]');
    if (!slot || !sunbedSettings) return;
    if (!sunbedSettings.price) {
      // No price published yet, or it was cleared from /admin -- show nothing
      // rather than a placeholder, and clear anything the build injected.
      slot.textContent = '';
      slot.hidden = true;
      return;
    }
    slot.textContent = `${sunbedSettings.price} ${sunbedSettings.currency} ${dynamicText('sunbedPerDay')}`;
    slot.hidden = false;
  }

  const GALLERY_ALT = Object.freeze({
    sq: 'Bar Martiri në Spille, Shqipëri — foto',
    it: 'Bar Martiri a Spille, Albania — foto',
    en: 'Bar Martiri in Spille, Albania — photo',
  });

  function galleryFallbackAlt(index) {
    const base = GALLERY_ALT[currentLanguage] || GALLERY_ALT.sq;
    return `${base} ${index + 1}`;
  }

  const LANGUAGE_OFFER = Object.freeze({
    sq: { label: 'Kjo faqe disponohet edhe në shqip.', accept: 'Shiko në shqip', dismiss: 'Mbyll' },
    it: { label: 'Questa pagina è disponibile anche in italiano.', accept: 'Vedi in italiano', dismiss: 'Chiudi' },
    en: { label: 'This page is also available in English.', accept: 'View in English', dismiss: 'Dismiss' },
  });

  const SEO_TEXT = Object.freeze({
    sq: {
      title: 'Bar Martiri Spille | Akullore dhe Shezlone Pranë Detit',
      description:
        'Bar Martiri në Spille, Shqipëri: shezlone, parkim falas, akullore, kafe dhe pije pranë detit për pushimet tuaja verore.',
      path: '/',
    },
    it: {
      title: 'Bar Martiri Spille | Gelato e Lettini vicino al Mare',
      description:
        'Bar Martiri a Spille, Albania: lettini, parcheggio gratuito, gelato, caffè e bibite vicino al mare.',
      path: '/it/',
    },
    en: {
      title: 'Bar Martiri Spille | Ice Cream & Sunbeds by the Sea',
      description:
        'Bar Martiri in Spille, Albania: sunbeds, free parking, ice cream, coffee and cold drinks by the sea.',
      path: '/en/',
    },
  });

  const UI_TEXT = Object.freeze({
    'Kalo te permbajtja': { sq: 'Kalo te përmbajtja', it: 'Vai al contenuto', en: 'Skip to content' },
    'Kreu i faqes': { sq: 'Kreu i faqes', it: 'Intestazione del sito', en: 'Site header' },
    'Bar Martiri, kryefaqja': { sq: 'Bar Martiri, kryefaqja', it: 'Bar Martiri, pagina iniziale', en: 'Bar Martiri, home page' },
    'Zgjedhja e gjuhës': { sq: 'Zgjedhja e gjuhës', it: 'Scelta della lingua', en: 'Language selection' },
    'Ndrysho gjuhën': { sq: 'Ndrysho gjuhën', it: 'Cambia lingua', en: 'Change language' },
    'Navigimi kryesor': { sq: 'Navigimi kryesor', it: 'Navigazione principale', en: 'Main navigation' },
    'Shërbimet e Bar Martiri': { sq: 'Shërbimet e Bar Martiri', it: 'Servizi di Bar Martiri', en: 'Bar Martiri services' },
    'Shijet e akullores': { sq: 'Shijet e akullores', it: 'Gusti del gelato', en: 'Ice cream flavours' },
    'Akullore vanilje qe vendoset ne kaush': { sq: 'Akullore vanilje që vendoset në kaush', it: 'Gelato alla vaniglia servito nel cono', en: 'Vanilla ice cream placed in a cone' },
    'Akullore e plote me cokollate': { sq: 'Akullore e plotë me çokollatë', it: 'Gelato interamente al cioccolato', en: 'Full chocolate ice cream' },
    'Akullore gjysme vanilje dhe gjysme cokollate': { sq: 'Akullore gjysmë vanilje dhe gjysmë çokollatë', it: 'Gelato metà vaniglia e metà cioccolato', en: 'Half vanilla and half chocolate ice cream' },
    'Akullore gjysme vanilje dhe gjysme luleshtrydhe': { sq: 'Akullore gjysmë vanilje dhe gjysmë luleshtrydhe', it: 'Gelato metà vaniglia e metà fragola', en: 'Half vanilla and half strawberry ice cream' },
    'Akullore e plote me luleshtrydhe': { sq: 'Akullore e plotë me luleshtrydhe', it: 'Gelato interamente alla fragola', en: 'Full strawberry ice cream' },
    '5 nga 5': { sq: '5 nga 5', it: '5 su 5', en: '5 out of 5' },
    'BAR MARTIRI · SPILLE · AKULLORE · KAFE · DET ·': { sq: 'BAR MARTIRI · SPILLE · AKULLORE · KAFE · DET ·', it: 'BAR MARTIRI · SPILLE · GELATO · CAFFÈ · MARE ·', en: 'BAR MARTIRI · SPILLE · ICE CREAM · COFFEE · SEA ·' },
    'Bar · Akullore · Spille': { sq: 'Bar · Akullore · Spille', it: 'Bar · Gelateria · Spille', en: 'Bar · Ice Cream · Spille' },
    'Hap menune': { sq: 'Hap menunë', it: 'Apri il menu', en: 'Open menu' },
    'Mbyll menune': { sq: 'Mbyll menunë', it: 'Chiudi il menu', en: 'Close menu' },
    'Hap vendndodhjen': { sq: 'Hap vendndodhjen', it: 'Apri la posizione', en: 'Open location' },
    'Mbyll vendndodhjen': { sq: 'Mbyll vendndodhjen', it: 'Chiudi la posizione', en: 'Close location' },
    'Hap informacionin': { sq: 'Hap informacionin', it: 'Apri le informazioni', en: 'Open information' },
    'Mbyll informacionin': { sq: 'Mbyll informacionin', it: 'Chiudi le informazioni', en: 'Close information' },
    'Kategorite e menuse': { sq: 'Kategoritë e menusë', it: 'Categorie del menu', en: 'Menu categories' },
    'Lidhje te tjera': { sq: 'Lidhje të tjera', it: 'Altri collegamenti', en: 'Other links' },
    'Sherbimet e Bar Martiri': { sq: 'Shërbimet e Bar Martiri', it: 'Servizi di Bar Martiri', en: 'Bar Martiri services' },
    'Spille · Shqipëri': { sq: 'Spille · Shqipëri', it: 'Spille · Albania', en: 'Spille · Albania' },
    'Akullore në Bar Martiri': { sq: 'Akullore në Bar Martiri', it: 'Gelato al Bar Martiri', en: 'Ice cream at Bar Martiri' },
    'Akullore e freskët buzë detit në Spille.': { sq: 'Akullore e freskët buzë detit në Spille.', it: 'Gelato fresco in riva al mare a Spille.', en: 'Fresh ice cream by the sea in Spille.' },
    'Vanilje e freskët, e servirur në kaush krokant për një pushim të ëmbël gjatë ditëve të verës në Spille.': { sq: 'Vanilje e freskët, e servirur në kaush krokant për një pushim të ëmbël gjatë ditëve të verës në Spille.', it: 'Vaniglia fresca servita in un cono croccante, per una dolce pausa nelle giornate estive a Spille.', en: 'Fresh vanilla served in a crisp cone for a sweet break during summer days in Spille.' },
    'Informacion për akulloren': { sq: 'Informacion për akulloren', it: 'Informazioni sul gelato', en: 'Ice cream information' },
    'Shërbehet e freskët': { sq: 'Shërbehet e freskët', it: 'Servito fresco', en: 'Served fresh' },
    'Shiko menunë': { sq: 'Shiko menunë', it: 'Vedi il menu', en: 'View the menu' },
    'Lëvize akulloren majtas ose djathtas.': { sq: 'Lëvize akulloren majtas ose djathtas.', it: 'Sposta il gelato a sinistra o a destra.', en: 'Move the ice cream left or right.' },
    'Akullore vanilje në kaush; lëvize majtas ose djathtas': { sq: 'Akullore vanilje në kaush; lëvize majtas ose djathtas', it: 'Gelato alla vaniglia nel cono; spostalo a sinistra o a destra', en: 'Vanilla ice cream in a cone; move it left or right' },
    'Kaush krokant': { sq: 'Kaush krokant', it: 'Cono croccante', en: 'Crisp cone' },
    'Pesë akullore': { sq: 'Pesë akullore', it: 'Cinque gelati', en: 'Five ice creams' },
    'Zgjidh shijen tënde.': { sq: 'Zgjidh shijen tënde.', it: 'Scegli il tuo gusto.', en: 'Choose your flavour.' },
    'Vazhdo poshtë për të parë të pesë shijet.': { sq: 'Vazhdo poshtë për të parë të pesë shijet.', it: 'Continua a scorrere per vedere tutti e cinque i gusti.', en: 'Keep scrolling to see all five flavours.' },
    'Vazhdo poshtë': { sq: 'Vazhdo poshtë', it: 'Continua a scorrere', en: 'Keep scrolling' },
    'Vanilje': { sq: 'Vanilje', it: 'Vaniglia', en: 'Vanilla' },
    'Vanilje dhe çokollatë': { sq: 'Vanilje dhe çokollatë', it: 'Vaniglia e cioccolato', en: 'Vanilla and chocolate' },
    'Çokollatë': { sq: 'Çokollatë', it: 'Cioccolato', en: 'Chocolate' },
    'Vanilje dhe luleshtrydhe': { sq: 'Vanilje dhe luleshtrydhe', it: 'Vaniglia e fragola', en: 'Vanilla and strawberry' },
    'Luleshtrydhe': { sq: 'Luleshtrydhe', it: 'Fragola', en: 'Strawberry' },
    'Bar në Spille': { sq: 'Bar në Spille', it: 'Bar a Spille', en: 'Bar in Spille' },
    'Vera nis tek Bar Martiri.': { sq: 'Vera nis tek Bar Martiri.', it: "L'estate inizia al Bar Martiri.", en: 'Summer starts at Bar Martiri.' },
    'Bar Martiri në Spille, Shqipëri, është ndalesa pranë plazhit për shezlone, akullore, kafe dhe pije të freskëta. Parkimi falas dhe aksesi i thjeshtë e bëjnë ditën në det më të lehtë.': { sq: 'Bar Martiri në Spille, Shqipëri, është ndalesa pranë plazhit për shezlone, akullore, kafe dhe pije të freskëta. Parkimi falas dhe aksesi i thjeshtë e bëjnë ditën në det më të lehtë.', it: 'Bar Martiri a Spille, Albania, è una sosta vicino alla spiaggia per lettini, gelato, caffè e bibite. Il parcheggio gratuito e il facile accesso rendono più semplice la giornata al mare.', en: 'Bar Martiri in Spille, Albania, is a beachside stop for sunbeds, ice cream, coffee and cold drinks. Free parking and easy access make a day by the sea simpler.' },
    'Shezlone pranë detit': { sq: 'Shezlone pranë detit', it: 'Lettini vicino al mare', en: 'Sunbeds by the sea' },
    'Rezervo vendin tënd për një ditë pushimi në Spille.': { sq: 'Rezervo vendin tënd për një ditë pushimi në Spille.', it: 'Prenota il tuo posto per una giornata di relax a Spille.', en: 'Book your spot for a relaxing day in Spille.' },
    'Parkim falas': { sq: 'Parkim falas', it: 'Parcheggio gratuito', en: 'Free parking' },
    'Parkim pa pagesë për klientët e Bar Martiri.': { sq: 'Parkim pa pagesë për klientët e Bar Martiri.', it: 'Parcheggio gratuito per i clienti di Bar Martiri.', en: 'Free parking for Bar Martiri customers.' },
    'Shije verore': { sq: 'Shije verore', it: "Sapori d'estate", en: 'Summer flavours' },
    'Akullore, kafe dhe pije të freskëta pranë plazhit.': { sq: 'Akullore, kafe dhe pije të freskëta pranë plazhit.', it: 'Gelato, caffè e bibite vicino alla spiaggia.', en: 'Ice cream, coffee and cold drinks by the beach.' },
    'Po marrim kushtet e fundit.': { sq: 'Po marrim kushtet e fundit.', it: 'Stiamo caricando le condizioni attuali.', en: 'Loading the latest conditions.' },
    'Moti: MET Norway': { sq: 'Moti: MET Norway', it: 'Meteo: MET Norway', en: 'Weather: MET Norway' },
    'Prane detit': { sq: 'Pranë detit', it: 'Vicino al mare', en: 'By the sea' },
    'Ndal per shijen.': { sq: 'Ndal për shijen.', it: 'Fermati per il gusto.', en: 'Stop for the flavour.' },
    'Qendro per pamjen.': { sq: 'Qëndro për pamjen.', it: 'Resta per la vista.', en: 'Stay for the view.' },
    'Orari': { sq: 'Orari', it: 'Orari', en: 'Hours' },
    'Cdo dite': { sq: 'Çdo ditë', it: 'Tutti i giorni', en: 'Every day' },
    'Sezoni': { sq: 'Sezoni', it: 'Stagione', en: 'Season' },
    'Maj–Shtator': { sq: 'Maj–Shtator', it: 'Maggio–Settembre', en: 'May–September' },
    'Hap ne harte': { sq: 'Hap në hartë', it: 'Apri la mappa', en: 'Open map' },
    'Google Reviews': { sq: 'Vlerësime në Google', it: 'Recensioni Google', en: 'Google Reviews' },
    'Vlerësimi, i verifikuar për herë të fundit më 3 gusht 2026, bazohet në': { sq: 'Vlerësimi, i verifikuar për herë të fundit më 3 gusht 2026, bazohet në', it: 'La valutazione, verificata l’ultima volta il 3 agosto 2026, si basa su', en: 'The rating, last verified on 3 August 2026, is based on' },
    'vlerësime në Google.': { sq: 'vlerësime në Google.', it: 'recensioni su Google.', en: 'Google reviews.' },
    'Shiko te gjitha ne Google': { sq: 'Shiko të gjitha në Google', it: 'Vedi tutte su Google', en: 'See all on Google' },
    'Shihemi tek': { sq: 'Shihemi tek', it: 'Ci vediamo al', en: 'See you at' },
    'Bar Martiri.': { sq: 'Bar Martiri.', it: 'Bar Martiri.', en: 'Bar Martiri.' },
    'Akullore, kafe dhe pije te fresketa, cdo dite nga 06:00 deri ne 23:00, Maj–Shtator.': { sq: 'Akullore, kafe dhe pije të freskëta, çdo ditë nga 06:00 deri në 23:00, Maj–Shtator.', it: 'Gelato, caffè e bibite, tutti i giorni dalle 06:00 alle 23:00, da maggio a settembre.', en: 'Ice cream, coffee and cold drinks, every day from 06:00 to 23:00, May–September.' },
    'Na gjen ketu': { sq: 'Na gjen këtu', it: 'Ci trovi qui', en: 'Find us here' },
    'Harta ngarkohet vetem kur e kerkon ti.': { sq: 'Harta ngarkohet vetëm kur e kërkon ti.', it: 'La mappa si carica solo quando lo richiedi.', en: 'The map loads only when you request it.' },
    'Ngarko Google Maps': { sq: 'Ngarko Google Maps', it: 'Carica Google Maps', en: 'Load Google Maps' },
    'Adresa': { sq: 'Adresa', it: 'Indirizzo', en: 'Address' },
    'Merr drejtimin': { sq: 'Merr drejtimin', it: 'Indicazioni stradali', en: 'Get directions' },
    'Informacion': { sq: 'Informacion', it: 'Informazioni', en: 'Information' },
    'Pushimi yt ne Spille': { sq: 'Pushimi yt në Spille', it: 'La tua vacanza a Spille', en: 'Your break in Spille' },
    'Deti, hija dhe gjithcka qe te duhet per nje dite te qete.': { sq: 'Deti, hija dhe gjithçka që të duhet për një ditë të qetë.', it: 'Il mare, l’ombra e tutto ciò che serve per una giornata tranquilla.', en: 'The sea, shade and everything you need for a relaxed day.' },
    'Bar Martiri eshte prane plazhit, me sherbim te thjeshte dhe hapesire per te kaluar diten me familjen ose miqte.': { sq: 'Bar Martiri është pranë plazhit, me shërbim të thjeshtë dhe hapësirë për të kaluar ditën me familjen ose miqtë.', it: 'Bar Martiri è vicino alla spiaggia, con un servizio semplice e spazio per trascorrere la giornata con la famiglia o gli amici.', en: 'Bar Martiri is by the beach, with simple service and space to spend the day with family or friends.' },
    'Shezlone': { sq: 'Shezlone', it: 'Lettini', en: 'Sunbeds' },
    'Rezervo vendin tënd pranë detit me një telefonatë.': { sq: 'Rezervo vendin tënd pranë detit me një telefonatë.', it: 'Prenota il tuo posto vicino al mare con una telefonata.', en: 'Book your place by the sea with one phone call.' },
    'Parkim pa pagese per klientet e Bar Martiri.': { sq: 'Parkim pa pagesë për klientët e Bar Martiri.', it: 'Parcheggio gratuito per i clienti di Bar Martiri.', en: 'Free parking for Bar Martiri customers.' },
    'Akses i thjeshte': { sq: 'Akses i thjeshtë', it: 'Accesso facile', en: 'Easy access' },
    'Na gjen lehte nga Rruga e Pishave ne Spille.': { sq: 'Na gjen lehtë nga Rruga e Pishave në Spille.', it: 'Ci trovi facilmente da Rruga e Pishave a Spille.', en: 'Find us easily from Rruga e Pishave in Spille.' },
    'Hapur cdo dite': { sq: 'Hapur çdo ditë', it: 'Aperto ogni giorno', en: 'Open every day' },
    'Te presim nga ora 06:00 deri ne 23:00, Maj–Shtator.': { sq: 'Të presim nga ora 06:00 deri në 23:00, Maj–Shtator.', it: 'Ti aspettiamo dalle 06:00 alle 23:00, da maggio a settembre.', en: 'We welcome you from 06:00 to 23:00, May–September.' },
    'Rezervime shezlonesh': { sq: 'Rezervime shezlonesh', it: 'Prenotazione lettini', en: 'Sunbed reservations' },
    'Rezervo me telefon': { sq: 'Rezervo me telefon', it: 'Prenota per telefono', en: 'Book by phone' },
    'Telefono tani': { sq: 'Telefono tani', it: 'Chiama ora', en: 'Call now' },
    'Menuja e Bar Martiri': { sq: 'Menuja e Bar Martiri', it: 'Menu di Bar Martiri', en: 'Bar Martiri menu' },
    'Zgjidh kategorinë ose kërko produktin.': { sq: 'Zgjidh kategorinë ose kërko produktin.', it: 'Scegli una categoria o cerca un prodotto.', en: 'Choose a category or search for a product.' },
    'Mini menuja e kategorive': { sq: 'Mini menuja e kategorive', it: 'Mini menu delle categorie', en: 'Category mini menu' },
    'Kërko në menu': { sq: 'Kërko në menu', it: 'Cerca nel menu', en: 'Search the menu' },
    'Kërko produktin': { sq: 'Kërko produktin', it: 'Cerca un prodotto', en: 'Search for a product' },
    'Cookies': { sq: 'Cookies', it: 'Cookie', en: 'Cookies' },
    'Privatësia dhe cookies': { sq: 'Privatësia dhe cookies', it: 'Privacy e cookie', en: 'Privacy and cookies' },
    'Menaxho cookies': { sq: 'Menaxho cookies', it: 'Gestisci i cookie', en: 'Manage cookies' },
    'Për Google Maps kërkohet pëlqimi yt.': { sq: 'Për Google Maps kërkohet pëlqimi yt.', it: 'Google Maps richiede il tuo consenso.', en: 'Google Maps needs your consent.' },
    'Lexo politikën e privatësisë': { sq: 'Lexo politikën e privatësisë', it: 'Leggi l’informativa sulla privacy', en: 'Read the privacy policy' },
    'Anulo': { sq: 'Anulo', it: 'Rifiuta', en: 'Decline' },
    'Prano': { sq: 'Prano', it: 'Accetta', en: 'Accept' },
    'Home': { sq: 'Kryefaqja', it: 'Home', en: 'Home' },
    'Kryefaqja': { sq: 'Kryefaqja', it: 'Home', en: 'Home' },
    'Location': { sq: 'Vendndodhja', it: 'Posizione', en: 'Location' },
    'Info': { sq: 'Info', it: 'Info', en: 'Info' },
    'Shporta': { sq: 'Shporta', it: 'Carrello', en: 'Basket' },
    'Hap shportën': { sq: 'Hap shportën', it: 'Apri il carrello', en: 'Open basket' },
    'Mbyll shportën': { sq: 'Mbyll shportën', it: 'Chiudi il carrello', en: 'Close basket' },
    'Porosia jote': { sq: 'Porosia jote', it: 'Il tuo ordine', en: 'Your order' },
    'Shporta eshte bosh.': { sq: 'Shporta është bosh.', it: 'Il carrello è vuoto.', en: 'Your basket is empty.' },
    'Totali': { sq: 'Totali', it: 'Totale', en: 'Total' },
    'Emri': { sq: 'Emri', it: 'Nome', en: 'Name' },
    'Telefoni (opsionale)': { sq: 'Telefoni (opsionale)', it: 'Telefono (facoltativo)', en: 'Phone (optional)' },
    'Telefoni': { sq: 'Telefoni', it: 'Telefono', en: 'Phone' },
    'Zgjidh': { sq: 'Zgjidh', it: 'Scegli', en: 'Choose' },
    'Numri i sektorit, i rreshtit dhe i çadrës janë të shkruar në shtyllën e çadrës tënde. Porosinë ta sjellim aty, zakonisht brenda 10 minutash. Paguhet në dorëzim.': {
      sq: 'Numri i sektorit, i rreshtit dhe i çadrës janë të shkruar në shtyllën e çadrës tënde. Porosinë ta sjellim aty, zakonisht brenda 10 minutash. Paguhet në dorëzim.',
      it: "Il settore, la fila e il numero dell'ombrellone sono scritti sul palo del tuo ombrellone. Portiamo l'ordine lì, di solito entro 10 minuti. Si paga alla consegna.",
      en: 'Your section, row and umbrella number are printed on your umbrella pole. We bring the order there, usually within 10 minutes. You pay on delivery.',
    },
    'Shenim shtese (opsionale)': { sq: 'Shënim shtesë (opsionale)', it: 'Nota aggiuntiva (facoltativa)', en: 'Additional note (optional)' },
    'Ku je?': { sq: 'Ku je?', it: 'Dove sei?', en: 'Where are you?' },
    'Sektori': { sq: 'Sektori', it: 'Settore', en: 'Section' },
    'Rreshti': { sq: 'Rreshti', it: 'Fila', en: 'Row' },
    'Çadra': { sq: 'Çadra', it: 'Ombrellone', en: 'Umbrella' },
    'Porosit': { sq: 'Porosit', it: 'Ordina', en: 'Place order' },
    'Porosi e re': { sq: 'Porosi e re', it: 'Nuovo ordine', en: 'New order' },
    'Galeria': { sq: 'Galeria', it: 'Galleria', en: 'Gallery' },
    'Shkruaj në WhatsApp': { sq: 'Shkruaj në WhatsApp', it: 'Scrivici su WhatsApp', en: 'Message us on WhatsApp' },
    'Emri yt (opsionale)': { sq: 'Emri yt (opsionale)', it: 'Il tuo nome (opzionale)', en: 'Your name (optional)' },
    'Hap chat-in me ne': { sq: 'Hap chat-in me ne', it: 'Apri la chat con noi', en: 'Open chat with us' },
    'Mbyll chat-in': { sq: 'Mbyll chat-in', it: 'Chiudi la chat', en: 'Close chat' },
    'Shkruaji Bar Martiri': { sq: 'Shkruaji Bar Martiri', it: 'Scrivi a Bar Martiri', en: 'Message Bar Martiri' },
    'Na shkruaj një mesazh dhe do të përgjigjemi sa më shpejt.': {
      sq: 'Na shkruaj një mesazh dhe do të përgjigjemi sa më shpejt.',
      it: 'Scrivici un messaggio e ti risponderemo il prima possibile.',
      en: 'Send us a message and we will reply as soon as we can.',
    },
    'Shkruaj një mesazh...': { sq: 'Shkruaj një mesazh...', it: 'Scrivi un messaggio...', en: 'Write a message...' },
    'Dërgo': { sq: 'Dërgo', it: 'Invia', en: 'Send' },
    'Harta e Bar Martiri në Spille': {
      sq: 'Harta e Bar Martiri në Spille',
      it: 'Mappa di Bar Martiri a Spille',
      en: 'Map of Bar Martiri in Spille',
    },
    'Preferencat e cookies': { sq: 'Preferencat e cookies', it: 'Preferenze cookie', en: 'Cookie preferences' },
    'Spille Sot': { sq: 'Spille Sot', it: 'Spille oggi', en: 'Spille today' },
  });

  const DYNAMIC_TEXT = Object.freeze({
    refreshingMenu: { sq: 'Po përditësojmë menunë…', it: 'Aggiornamento del menu…', en: 'Updating the menu…' },
    cachedMenu: { sq: 'Po shfaqet menuja e ruajtur. Provo përsëri pas pak për përditësimet.', it: 'Mostriamo il menu salvato. Riprova tra poco per gli aggiornamenti.', en: 'Showing the saved menu. Try again shortly for updates.' },
    offlineMenu: { sq: 'Lidhja me menunë nuk është e disponueshme. Po shfaqen vetëm produktet bazë.', it: 'Il collegamento al menu non è disponibile. Vengono mostrati solo i prodotti di base.', en: 'The menu connection is unavailable. Only the basic products are shown.' },
    products: { sq: 'produkte', it: 'prodotti', en: 'products' },
    comingSoon: { sq: 'Së shpejti', it: 'Prossimamente', en: 'Coming soon' },
    emptyCategory: { sq: 'Produktet e kësaj kategorie do të shtohen së shpejti.', it: 'I prodotti di questa categoria saranno aggiunti presto.', en: 'Products in this category will be added soon.' },
    noResults: { sq: 'Nuk u gjet asnjë produkt. Provo një emër tjetër.', it: 'Nessun prodotto trovato. Prova un altro nome.', en: 'No products found. Try another name.' },
    unnamedProduct: { sq: 'Pa emër', it: 'Senza nome', en: 'Unnamed' },
    sunbedPerDay: { sq: 'në ditë', it: 'al giorno', en: 'per day' },
    chooseOption: { sq: 'Zgjidh', it: 'Scegli', en: 'Choose' },
    orderConfirm: {
      sq: 'E sjellim te sektori {section}, rreshti {row}, çadra {number}.',
      it: 'Lo portiamo al settore {section}, fila {row}, ombrellone {number}.',
      en: 'We will bring it to section {section}, row {row}, umbrella {number}.',
    },
    reviewVerifiedPrefix: { sq: 'Vlerësimi, i verifikuar për herë të fundit më', it: 'La valutazione, verificata l’ultima volta il', en: 'The rating, last verified on' },
    reviewBasedOnSuffix: { sq: 'bazohet në', it: 'si basa su', en: 'is based on' },
    reviewCountSuffix: { sq: 'vlerësime në Google.', it: 'recensioni su Google.', en: 'Google reviews.' },
    ratingOutOf5: { sq: 'nga 5', it: 'su 5', en: 'out of 5' },
    addToBasket: { sq: 'Shto', it: 'Aggiungi', en: 'Add' },
    removeFromBasket: { sq: 'Hiq', it: 'Rimuovi', en: 'Remove' },
    sendingOrder: { sq: 'Po dërgohet porosia…', it: 'Invio dell’ordine…', en: 'Sending your order…' },
    orderSentHeadline: { sq: 'Porosia u dërgua!', it: 'Ordine inviato!', en: 'Order sent!' },
    orderSentDetail: { sq: 'Po presim konfirmimin nga Bar Martiri.', it: 'In attesa di conferma da Bar Martiri.', en: 'Waiting for confirmation from Bar Martiri.' },
    orderConfirmedHeadline: { sq: 'Porosia u konfirmua!', it: 'Ordine confermato!', en: 'Order confirmed!' },
    orderConfirmedDetail: { sq: 'Do të vijë shpejt te ti.', it: 'Arriverà presto da te.', en: 'It’s on its way to you.' },
    orderCancelledHeadline: { sq: 'Porosia u anulua.', it: 'Ordine annullato.', en: 'Order cancelled.' },
    orderCancelledDetail: { sq: 'Na vjen keq. Provo përsëri ose na kontakto.', it: 'Ci dispiace. Riprova o contattaci.', en: 'Sorry about that. Try again or contact us.' },
    orderError: { sq: 'Porosia nuk mund të dërgohet. Provo përsëri.', it: 'L’ordine non può essere inviato. Riprova.', en: 'The order couldn’t be sent. Try again.' },
    newOrder: { sq: 'Porosi e re', it: 'Nuovo ordine', en: 'New order' },
    storyEyebrow: { sq: 'Rreth Nesh', it: 'Chi Siamo', en: 'About Us' },
  });

  const optimizedLocalImages = {
    'assets/icecream-gallery/ice-cream-cone-transparent.png':
      'assets/optimized/ice-cream-cone.webp',
    'assets/icecream-gallery/vanilla-chocolate-cone-transparent.png':
      'assets/optimized/vanilla-chocolate-cone.webp',
    'assets/icecream-gallery/chocolate-cone-transparent.png':
      'assets/optimized/chocolate-cone.webp',
    'assets/icecream-gallery/vanilla-pink-cone-transparent.png':
      'assets/optimized/vanilla-pink-cone.webp',
    'assets/icecream-gallery/pink-cone-transparent.png':
      'assets/optimized/pink-cone.webp',
  };

  let activePanel = null;
  let activeCategory = menuData.categories[0]?.id || '';
  let previousFocus = null;
  let closeTimer = 0;
  let menuRendered = false;
  let catalogProducts = menuData.products.map(normalizeProduct);
  let lastScrollY = window.scrollY;
  let lastPanelScrollY = 0;
  let scrollFrame = 0;
  let currentLanguage = 'sq';
  let menuLoadPromise = null;
  let productImageObserver = null;
  let menuSearchQuery = '';
  const CART_KEY = 'barMartiri.cart.v1';
  const PENDING_ORDER_KEY = 'barMartiri.pendingOrder.v1';
  const ORDER_POLL_INTERVAL = 4000;
  const VAPID_PUBLIC_KEY =
    'BBNd3SdADUSjP5Y4gCBjiMJi7gfO0xulbR24YX5RBM_9bMvOYTubWDw2kddV2sny7wQE6zO2nAO8kEKcJOJ9jUQ';
  const UMBRELLA_ROWS = 8;
  function umbrellasInRow(row) {
    return row <= 4 ? 13 : 12;
  }
  let cart = [];
  let pendingOrderId = null;
  let orderPollTimer = 0;
  let placingOrder = false;
  const DEFAULT_REVIEWS = Object.freeze({
    ratingValue: '3.9',
    reviewCount: 31,
    lastVerified: '2026-08-03',
    testimonials: [
      { author: 'Doctor Who', rating: 5, quote: 'That ice-cream was awesome.' },
      { author: 'E Cabej', rating: 5, quote: 'The service is excellent.' },
    ],
  });
  let reviewSummary = DEFAULT_REVIEWS;
  const DEFAULT_STORY = Object.freeze({
    titleSq: '',
    bodySq: '',
    titleIt: '',
    bodyIt: '',
    titleEn: '',
    bodyEn: '',
  });
  let storyData = DEFAULT_STORY;

  function dynamicText(key) {
    return DYNAMIC_TEXT[key]?.[currentLanguage] || DYNAMIC_TEXT[key]?.sq || '';
  }

  function setDynamicText(element, key) {
    if (!element) return;
    element.dataset.i18nDynamic = key;
    element.textContent = dynamicText(key);
  }

  function translateTextNodes(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
        const trimmed = node.nodeValue.trim();
        const normalized = trimmed.replace(/\s+/g, ' ');
        if (normalized) {
          if (!node.__barMartiriSourceText) {
            node.__barMartiriSourceText = UI_TEXT[normalized]
              ? normalized
              : Object.keys(UI_TEXT).find((key) =>
                  Object.values(UI_TEXT[key] || {}).includes(normalized)
                );
          }
          const source = node.__barMartiriSourceText;
          const translated = source && UI_TEXT[source]?.[currentLanguage];
          if (translated) {
            const leading = node.nodeValue.match(/^\s*/)?.[0] || '';
            const trailing = node.nodeValue.match(/\s*$/)?.[0] || '';
            node.nodeValue = `${leading}${translated}${trailing}`;
          }
        }
      }
      node = walker.nextNode();
    }
  }

  function translateAttributes(root = document.body) {
    if (!root) return;
    const attributes = ['aria-label', 'title', 'placeholder', 'alt', 'data-dock-label'];
    root.querySelectorAll(attributes.map((name) => `[${name}]`).join(',')).forEach((element) => {
      attributes.forEach((name) => {
        if (!element.hasAttribute(name)) return;
        const sourceKey = `i18nSource${name.replace(/(^|-)(\w)/g, (_, dash, letter) => letter.toUpperCase())}`;
        const current = element.getAttribute(name);
        if (!element.dataset[sourceKey]) {
          const source = UI_TEXT[current]
            ? current
            : Object.keys(UI_TEXT).find((key) =>
                Object.values(UI_TEXT[key] || {}).includes(current)
              );
          if (source) element.dataset[sourceKey] = source;
        }
        const source = element.dataset[sourceKey];
        const translated = source && UI_TEXT[source]?.[currentLanguage];
        if (translated) element.setAttribute(name, translated);
      });
    });
  }

  function categoryLabelFor(category) {
    return category?.labels?.[currentLanguage] || category?.label || '';
  }

  function productTranslationFor(product) {
    const localTranslation = menuData.productTranslations?.[product?.id]?.[currentLanguage];
    if (currentLanguage === 'sq') return localTranslation || null;
    const databaseTranslation = product?.translations?.[currentLanguage];
    if (databaseTranslation?.name || databaseTranslation?.description) return databaseTranslation;
    return localTranslation || null;
  }

  function updateDocumentMetadata() {
    const metadata = SEO_TEXT[currentLanguage] || SEO_TEXT.sq;
    const absoluteUrl = new URL(metadata.path, window.location.origin).href;
    document.title = metadata.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', metadata.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', metadata.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', metadata.description);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', absoluteUrl);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', metadata.title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', metadata.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', absoluteUrl);
  }

  function productNameFor(product) {
    return productTranslationFor(product)?.name || product?.name || dynamicText('unnamedProduct');
  }

  function productDescriptionFor(product) {
    return productTranslationFor(product)?.description || product.description || '';
  }

  // Chrome ships no `sq` locale, so Intl silently resolves 'sq-AL' to en-US and
  // Albanian dates came out as "August 3, 2026" -- month name and order both
  // wrong, and only in the site's own default language. Format Albanian by hand;
  // it-IT and en-GB are real locales and Intl handles them correctly.
  const SQ_MONTHS = [
    'janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor',
    'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor',
  ];

  function formatVerifiedDate(dateString) {
    try {
      const date = new Date(`${dateString}T00:00:00`);
      if (Number.isNaN(date.getTime())) return dateString;
      if (currentLanguage === 'sq') {
        return `${date.getDate()} ${SQ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      }
      return date.toLocaleDateString(LANGUAGE_LOCALES[currentLanguage], {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  // Same reason: 'sq-AL' would fall back to en-US and print 2.7 where Albanian
  // and Italian both write 2,7.
  function formatDecimal(value) {
    const text = String(value);
    return currentLanguage === 'en' ? text : text.replace('.', ',');
  }

  function renderReviews() {
    if (reviewRatingEl) reviewRatingEl.textContent = reviewSummary.ratingValue;

    if (reviewCopyEl) {
      reviewCopyEl.replaceChildren(
        `${dynamicText('reviewVerifiedPrefix')} ${formatVerifiedDate(reviewSummary.lastVerified)}, ${dynamicText('reviewBasedOnSuffix')} `
      );
      const count = document.createElement('strong');
      count.textContent = reviewSummary.reviewCount;
      reviewCopyEl.append(count, ` ${dynamicText('reviewCountSuffix')}`);
    }

    if (reviewsListEl) {
      reviewsListEl.replaceChildren();
      reviewSummary.testimonials.forEach((testimonial) => {
        const ratingValue = Number(testimonial.rating) || 5;
        const article = document.createElement('article');
        article.className = 'review-row';

        const meta = document.createElement('div');
        meta.className = 'review-meta';
        const ratingSpan = document.createElement('span');
        ratingSpan.className = 'review-rating';
        ratingSpan.setAttribute('aria-label', `${ratingValue} ${dynamicText('ratingOutOf5')}`);
        ratingSpan.textContent = `${ratingValue.toFixed(1)} / 5`;
        const authorParagraph = document.createElement('p');
        authorParagraph.textContent = `${testimonial.author} · Google`;
        meta.append(ratingSpan, authorParagraph);

        const quote = document.createElement('blockquote');
        quote.lang = 'en';
        quote.textContent = `“${testimonial.quote}”`;

        article.append(meta, quote);
        reviewsListEl.append(article);
      });
    }
  }

  async function loadReviewSummary() {
    if (!supabaseConfig.url || !supabaseConfig.publishableKey) return;
    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/site_reviews?id=eq.main&select=rating_value,review_count,last_verified,testimonials`,
        {
          headers: {
            apikey: supabaseConfig.publishableKey,
            Authorization: `Bearer ${supabaseConfig.publishableKey}`,
          },
        }
      );
      if (!response.ok) return;
      const rows = await response.json();
      const row = rows?.[0];
      if (!row) return;
      reviewSummary = {
        ratingValue: String(row.rating_value ?? DEFAULT_REVIEWS.ratingValue),
        reviewCount: Number(row.review_count ?? DEFAULT_REVIEWS.reviewCount),
        lastVerified: String(row.last_verified ?? DEFAULT_REVIEWS.lastVerified),
        testimonials:
          Array.isArray(row.testimonials) && row.testimonials.length
            ? row.testimonials
            : DEFAULT_REVIEWS.testimonials,
      };
      renderReviews();
    } catch {
      // Keep showing the default review summary when the table isn't reachable yet.
    }
  }

  function renderStory() {
    if (!storySection || !storyTitleEl || !storyBodyEl) return;
    const byLanguage = {
      sq: { title: storyData.titleSq, body: storyData.bodySq },
      it: { title: storyData.titleIt, body: storyData.bodyIt },
      en: { title: storyData.titleEn, body: storyData.bodyEn },
    };
    const current = byLanguage[currentLanguage] || byLanguage.sq;
    if (!current.body) {
      storySection.hidden = true;
      return;
    }
    storyTitleEl.textContent = current.title;
    storyBodyEl.textContent = current.body;
    storySection.hidden = false;
  }

  async function loadStory() {
    if (!supabaseConfig.url || !supabaseConfig.publishableKey) return;
    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/site_story?id=eq.main&select=title_sq,body_sq,title_it,body_it,title_en,body_en`,
        {
          headers: {
            apikey: supabaseConfig.publishableKey,
            Authorization: `Bearer ${supabaseConfig.publishableKey}`,
          },
        }
      );
      if (!response.ok) return;
      const rows = await response.json();
      const row = rows?.[0];
      if (!row) return;
      storyData = {
        titleSq: String(row.title_sq || ''),
        bodySq: String(row.body_sq || ''),
        titleIt: String(row.title_it || ''),
        bodyIt: String(row.body_it || ''),
        titleEn: String(row.title_en || ''),
        bodyEn: String(row.body_en || ''),
      };
      renderStory();
    } catch {
      // Keep the story section hidden when the table isn't reachable yet.
    }
  }

  const CHAT_CONVERSATION_KEY = 'barMartiri.chatConversation.v1';
  const CHAT_POLL_INTERVAL = 4000;
  const CHAT_BACKGROUND_POLL_INTERVAL = 20000;
  let chatConversationId = localStorage.getItem(CHAT_CONVERSATION_KEY) || null;
  let chatPollTimer = 0;
  let chatBackgroundPollTimer = 0;
  if (chatNameInputEl) chatNameInputEl.hidden = Boolean(chatConversationId);

  function chatRestHeaders(extra = {}) {
    return {
      apikey: supabaseConfig.publishableKey,
      Authorization: `Bearer ${supabaseConfig.publishableKey}`,
      ...extra,
    };
  }

  function renderChatMessages(messages) {
    if (!chatMessagesEl) return;
    chatMessagesEl.replaceChildren();
    messages.forEach((message) => {
      const bubble = document.createElement('p');
      bubble.className = `chat-message-bubble chat-message-bubble--${message.sender}`;
      bubble.textContent = message.body;
      chatMessagesEl.append(bubble);
    });
    if (chatEmptyEl) chatEmptyEl.hidden = messages.length > 0;
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  async function loadChatMessages() {
    if (!chatConversationId || !supabaseConfig.url || !supabaseConfig.publishableKey) return;
    try {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/get_chat_messages`, {
        method: 'POST',
        headers: chatRestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ p_conversation_id: chatConversationId }),
      });
      if (!response.ok) return;
      const rows = await response.json();
      renderChatMessages(
        (rows || []).map((row) => ({ sender: String(row.sender), body: String(row.body || '') }))
      );
    } catch {
      // Keep showing the last known thread if a refresh fails.
    }
  }

  async function ensureChatConversation(customerName) {
    if (chatConversationId) return chatConversationId;
    const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/start_chat_conversation`, {
      method: 'POST',
      headers: chatRestHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ p_customer_name: customerName || null }),
    });
    if (!response.ok) throw new Error(`Conversation request failed with ${response.status}`);
    const newId = await response.json();
    if (!newId) throw new Error('Conversation response missing id');
    chatConversationId = String(newId);
    localStorage.setItem(CHAT_CONVERSATION_KEY, chatConversationId);
    if (chatNameInputEl) chatNameInputEl.hidden = true;
    return chatConversationId;
  }

  async function sendChatMessage(body, customerName) {
    const conversationId = await ensureChatConversation(customerName);
    const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/send_chat_message`, {
      method: 'POST',
      headers: chatRestHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ p_conversation_id: conversationId, p_body: body }),
    });
    if (!response.ok) throw new Error(`Message request failed with ${response.status}`);
  }

  async function markChatReadByCustomer() {
    if (!chatConversationId) return;
    try {
      await fetch(`${supabaseConfig.url}/rest/v1/rpc/mark_chat_read_by_customer`, {
        method: 'POST',
        headers: chatRestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ p_id: chatConversationId }),
      });
    } catch {
      // Not critical if the read receipt fails to save.
    }
    if (chatUnreadBadge) chatUnreadBadge.hidden = true;
  }

  function stopChatPolling() {
    window.clearInterval(chatPollTimer);
    chatPollTimer = 0;
  }

  function startChatPolling() {
    stopChatPolling();
    chatPollTimer = window.setInterval(() => void loadChatMessages(), CHAT_POLL_INTERVAL);
  }

  async function openChatPanel() {
    await loadChatMessages();
    await markChatReadByCustomer();
    startChatPolling();
  }

  async function checkChatUnread() {
    if (!chatConversationId || !supabaseConfig.url || !supabaseConfig.publishableKey) return;
    try {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/get_chat_unread_by_customer`, {
        method: 'POST',
        headers: chatRestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ p_id: chatConversationId }),
      });
      if (!response.ok) return;
      const unread = await response.json();
      if (chatUnreadBadge) chatUnreadBadge.hidden = !unread;
    } catch {
      // Skip this check if the request fails.
    }
  }

  function startChatBackgroundPoll() {
    if (!chatConversationId || chatBackgroundPollTimer) return;
    void checkChatUnread();
    chatBackgroundPollTimer = window.setInterval(() => void checkChatUnread(), CHAT_BACKGROUND_POLL_INTERVAL);
  }

  chatFormEl?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = chatFormEl.querySelector('input[name="message"]');
    const body = input?.value.trim();
    if (!body) return;
    const submitButton = chatFormEl.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      await sendChatMessage(body, chatNameInputEl?.value.trim());
      input.value = '';
      await loadChatMessages();
    } catch {
      // Keep the typed text so the customer can retry sending it.
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  async function loadGalleryImages() {
    if (!supabaseConfig.url || !supabaseConfig.publishableKey || !galleryGridEl) return;
    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/gallery_images?select=*&order=sort_order.asc`,
        {
          headers: {
            apikey: supabaseConfig.publishableKey,
            Authorization: `Bearer ${supabaseConfig.publishableKey}`,
          },
        }
      );
      if (!response.ok) return;
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows.length) return;

      galleryGridEl.replaceChildren();
      rows.forEach((row, index) => {
        if (!row.image_url) return;
        const figure = document.createElement('figure');
        figure.className = 'gallery-item';
        const img = document.createElement('img');
        img.src = row.image_url;
        // These are the only photographs of the place on the site. An empty alt
        // keeps them out of image search entirely, so prefer a real caption from
        // the CMS and fall back to a truthful localized description.
        img.alt = String(row.alt_text || row.caption || '').trim() || galleryFallbackAlt(index);
        img.loading = 'lazy';
        img.decoding = 'async';
        figure.append(img);
        galleryGridEl.append(figure);
      });
      if (gallerySection) gallerySection.hidden = false;
    } catch {
      // Keep the gallery section hidden if it isn't reachable yet.
    }
  }

  const OPENING_HOUR = 6;
  const CLOSING_HOUR = 23;

  function isWhatsAppHour() {
    try {
      const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          hour12: false,
          timeZone: 'Europe/Tirane',
        }).format(new Date())
      );
      return hour >= OPENING_HOUR && hour < CLOSING_HOUR;
    } catch {
      const hour = new Date().getHours();
      return hour >= OPENING_HOUR && hour < CLOSING_HOUR;
    }
  }

  function updateWhatsAppVisibility() {
    if (whatsappButton) whatsappButton.hidden = !isWhatsAppHour();
  }

  function loadCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(stored)
        ? stored
            .map((item) => ({
              id: String(item.id || ''),
              name: String(item.name || ''),
              price: Number(item.price) || 0,
              qty: Math.max(1, Math.round(Number(item.qty) || 1)),
            }))
            .filter((item) => item.id && item.price > 0)
        : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // The basket still works for this visit when storage is unavailable.
    }
  }

  function cartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function cartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function updateBasketBadge() {
    const count = cartCount();
    basketCountEls.forEach((element) => {
      element.textContent = String(count);
      element.hidden = count === 0;
    });
  }

  function addToCart(product) {
    const price = Number(product.price);
    if (!Number.isFinite(price) || price <= 0) return;
    const existing = cart.find((item) => item.id === product.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: product.id, name: productNameFor(product), price, qty: 1 });
    saveCart();
    renderBasket();
  }

  function setCartQty(id, qty) {
    if (qty <= 0) cart = cart.filter((item) => item.id !== id);
    else {
      const item = cart.find((entry) => entry.id === id);
      if (item) item.qty = qty;
    }
    saveCart();
    renderBasket();
  }

  function createBasketRow(item) {
    const row = document.createElement('article');
    row.className = 'basket-row';

    const info = document.createElement('div');
    info.className = 'basket-row-info';
    const name = document.createElement('p');
    name.textContent = capitalizeWords(item.name);
    const price = document.createElement('span');
    price.textContent = formatPrice(item.price);
    info.append(name, price);

    const controls = document.createElement('div');
    controls.className = 'basket-row-controls';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `${dynamicText('removeFromBasket')} ${capitalizeWords(item.name)}`);
    minus.addEventListener('click', () => setCartQty(item.id, item.qty - 1));
    const qty = document.createElement('span');
    qty.className = 'basket-row-qty';
    qty.textContent = String(item.qty);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `${dynamicText('addToBasket')} ${capitalizeWords(item.name)}`);
    plus.addEventListener('click', () => setCartQty(item.id, item.qty + 1));
    controls.append(minus, qty, plus);

    row.append(info, controls);
    return row;
  }

  function renderBasket() {
    updateBasketBadge();
    if (pendingOrderId) {
      if (basketItemsEl) basketItemsEl.hidden = true;
      if (basketEmptyEl) basketEmptyEl.hidden = true;
      if (basketSummaryEl) basketSummaryEl.hidden = true;
      if (basketStatusEl) basketStatusEl.hidden = false;
      return;
    }
    if (basketStatusEl) basketStatusEl.hidden = true;
    if (!basketItemsEl) return;
    const hasItems = cart.length > 0;
    basketItemsEl.hidden = !hasItems;
    basketItemsEl.replaceChildren();
    cart.forEach((item) => basketItemsEl.append(createBasketRow(item)));
    if (basketEmptyEl) basketEmptyEl.hidden = hasItems;
    if (basketSummaryEl) basketSummaryEl.hidden = !hasItems;
    if (basketTotalEl) basketTotalEl.textContent = formatPrice(cartTotal()) || '0 ALL';
  }

  function showOrderStatus(order) {
    if (basketStatusHeadlineEl) {
      basketStatusHeadlineEl.textContent =
        order.status === 'confirmed'
          ? dynamicText('orderConfirmedHeadline')
          : order.status === 'cancelled'
            ? dynamicText('orderCancelledHeadline')
            : dynamicText('orderSentHeadline');
    }
    if (basketStatusDetailEl) {
      basketStatusDetailEl.textContent =
        order.status === 'confirmed'
          ? dynamicText('orderConfirmedDetail')
          : order.status === 'cancelled'
            ? dynamicText('orderCancelledDetail')
            : dynamicText('orderSentDetail');
    }
    if (basketNewOrderButton) {
      basketNewOrderButton.hidden = order.status === 'pending';
      basketNewOrderButton.textContent = dynamicText('newOrder');
    }
    if (basketStatusEl) basketStatusEl.hidden = false;
    if (basketItemsEl) basketItemsEl.hidden = true;
    if (basketEmptyEl) basketEmptyEl.hidden = true;
    if (basketSummaryEl) basketSummaryEl.hidden = true;
  }

  function notifyOrderStatus(status) {
    if (status !== 'confirmed') return;
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(dynamicText('orderConfirmedHeadline'), {
          body: dynamicText('orderConfirmedDetail'),
          icon: '/assets/optimized/favicon-96.png',
        });
      } catch {
        // Some browsers restrict direct Notification construction; ignore.
      }
    }
  }

  function stopOrderStatusPolling() {
    window.clearInterval(orderPollTimer);
    orderPollTimer = 0;
  }

  async function pollOrderStatus() {
    if (!pendingOrderId || !supabaseConfig.url || !supabaseConfig.publishableKey) return null;
    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/orders?id=eq.${pendingOrderId}&select=status`,
        {
          headers: {
            apikey: supabaseConfig.publishableKey,
            Authorization: `Bearer ${supabaseConfig.publishableKey}`,
          },
        }
      );
      if (!response.ok) return null;
      const rows = await response.json();
      const order = rows?.[0];
      if (!order) return null;
      showOrderStatus(order);
      if (order.status !== 'pending') {
        notifyOrderStatus(order.status);
        stopOrderStatusPolling();
      }
      return order.status;
    } catch {
      return null;
    }
  }

  function startOrderStatusPolling() {
    stopOrderStatusPolling();
    if (!pendingOrderId) return;
    orderPollTimer = window.setInterval(() => void pollOrderStatus(), ORDER_POLL_INTERVAL);
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function registerPushForOrder(orderId) {
    if (!orderId || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!supabaseConfig.url || !supabaseConfig.publishableKey) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subscriptionJson = subscription.toJSON();
      await fetch(`${supabaseConfig.url}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          apikey: supabaseConfig.publishableKey,
          Authorization: `Bearer ${supabaseConfig.publishableKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          order_id: orderId,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
        }),
      });
    } catch {
      // Push isn't available or was denied on this device; the poll-while-open fallback still works.
    }
  }

  async function initializeBasket() {
    cart = loadCart();
    updateBasketBadge();
    try {
      pendingOrderId = localStorage.getItem(PENDING_ORDER_KEY) || null;
    } catch {
      pendingOrderId = null;
    }
    if (pendingOrderId) {
      const status = await pollOrderStatus();
      if (status === 'pending' || status === null) startOrderStatusPolling();
      if (status === 'pending' && 'Notification' in window && Notification.permission === 'granted') {
        void registerPushForOrder(pendingOrderId);
      }
    }
  }

  function setCheckoutError(message) {
    if (checkoutErrorEl) checkoutErrorEl.textContent = message;
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (placingOrder || !cart.length || !checkoutForm) return;
    setCheckoutError('');

    const formData = new FormData(checkoutForm);
    const customerName = String(formData.get('name') || '').trim();
    const customerPhone = String(formData.get('phone') || '').trim();
    const note = String(formData.get('note') || '').trim();
    const umbrellaSection = String(formData.get('umbrellaSection') || '').trim();
    const umbrellaRow = Number(formData.get('umbrellaRow'));
    const umbrellaNumber = Number(formData.get('umbrellaNumber'));
    if (
      !customerName ||
      !customerPhone ||
      !umbrellaSection ||
      !Number.isFinite(umbrellaRow) ||
      umbrellaRow < 1 ||
      !Number.isFinite(umbrellaNumber) ||
      umbrellaNumber < 1 ||
      !supabaseConfig.url ||
      !supabaseConfig.publishableKey
    ) {
      setCheckoutError(dynamicText('orderError'));
      return;
    }

    placingOrder = true;
    const submitButton = checkoutForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = dynamicText('sendingOrder');
    }

    try {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          apikey: supabaseConfig.publishableKey,
          Authorization: `Bearer ${supabaseConfig.publishableKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone || null,
          note: note || null,
          umbrella_section: umbrellaSection,
          umbrella_row: umbrellaRow,
          umbrella_number: umbrellaNumber,
          items: cart.map((item) => ({ id: item.id, name: item.name, price: item.price, qty: item.qty })),
          total: cartTotal(),
        }),
      });
      if (!response.ok) throw new Error(`Order request failed with ${response.status}`);
      const rows = await response.json();
      const order = rows?.[0];
      if (!order?.id) throw new Error('Order response missing id');

      pendingOrderId = String(order.id);
      try {
        localStorage.setItem(PENDING_ORDER_KEY, pendingOrderId);
      } catch {
        // The order still went through even if we can't remember it locally.
      }
      cart = [];
      saveCart();
      checkoutForm.reset();
      showOrderStatus({ status: 'pending' });
      renderBasket();
      startOrderStatusPolling();
      void registerPushForOrder(pendingOrderId);
    } catch {
      setCheckoutError(dynamicText('orderError'));
    } finally {
      placingOrder = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel || submitButton.textContent;
      }
    }
  }

  function placeholderOption() {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = dynamicText('chooseOption');
    option.disabled = true;
    return option;
  }

  function updateOrderConfirm() {
    const slot = document.querySelector('[data-order-confirm]');
    if (!slot) return;
    const section = document.querySelector('[data-umbrella-section]')?.value;
    const row = umbrellaRowSelect?.value;
    const number = umbrellaNumberSelect?.value;
    if (!section || !row || !number) {
      slot.hidden = true;
      slot.textContent = '';
      return;
    }
    slot.textContent = dynamicText('orderConfirm')
      .replace('{section}', section)
      .replace('{row}', row)
      .replace('{number}', number);
    slot.hidden = false;
  }

  function populateUmbrellaNumbers() {
    if (!umbrellaRowSelect || !umbrellaNumberSelect) return;
    const row = Number(umbrellaRowSelect.value) || 0;
    const previous = Number(umbrellaNumberSelect.value) || 0;
    umbrellaNumberSelect.replaceChildren();
    umbrellaNumberSelect.append(placeholderOption());
    if (!row) {
      umbrellaNumberSelect.value = '';
      updateOrderConfirm();
      return;
    }
    const count = umbrellasInRow(row);
    for (let number = 1; number <= count; number += 1) {
      const option = document.createElement('option');
      option.value = String(number);
      option.textContent = String(number);
      umbrellaNumberSelect.append(option);
    }
    umbrellaNumberSelect.value = previous >= 1 && previous <= count ? String(previous) : '';
    updateOrderConfirm();
  }

  function populateUmbrellaSelectors() {
    if (!umbrellaRowSelect) return;
    if (!umbrellaRowSelect.children.length) {
      umbrellaRowSelect.append(placeholderOption());
      for (let row = 1; row <= UMBRELLA_ROWS; row += 1) {
        const option = document.createElement('option');
        option.value = String(row);
        option.textContent = String(row);
        umbrellaRowSelect.append(option);
      }
      umbrellaRowSelect.value = '';
    }
    populateUmbrellaNumbers();
  }

  umbrellaRowSelect?.addEventListener('change', populateUmbrellaNumbers);
  umbrellaNumberSelect?.addEventListener('change', updateOrderConfirm);
  document.querySelector('[data-umbrella-section]')?.addEventListener('change', updateOrderConfirm);

  // An empty basket used to say "your basket is empty" and offer no way out.
  document.querySelector('[data-basket-browse]')?.addEventListener('click', (event) => {
    openPanel('menu', event.currentTarget);
  });
  populateUmbrellaSelectors();

  checkoutForm?.addEventListener('submit', submitOrder);

  basketNewOrderButton?.addEventListener('click', () => {
    pendingOrderId = null;
    stopOrderStatusPolling();
    try {
      localStorage.removeItem(PENDING_ORDER_KEY);
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
    renderBasket();
  });

  function applyLanguage(language) {
    currentLanguage = LANGUAGE_LOCALES[language] ? language : 'sq';
    document.documentElement.lang = LANGUAGE_LOCALES[currentLanguage];
    updateDocumentMetadata();
    try {
      localStorage.setItem(LANGUAGE_KEY, currentLanguage);
    } catch {
      // The selected language still applies for this visit.
    }
    writeCookie(LANGUAGE_COOKIE_NAME, currentLanguage);

    translateTextNodes(document.body);
    translateAttributes(document.body);
    document.querySelectorAll('[data-i18n-dynamic]').forEach((element) => {
      element.textContent = dynamicText(element.dataset.i18nDynamic);
    });
    languageSwitches.forEach((button) => {
      const selected = button.dataset.languageSwitch === currentLanguage;
      button.setAttribute('aria-pressed', String(selected));
      if (button.getAttribute('role') === 'option') button.setAttribute('aria-selected', String(selected));
    });
    syncLanguageSwitchers();

    if (menuRendered) {
      renderCategories();
      renderProducts();
    }
    renderReviews();
    renderStory();
    renderSunbedPrice();
    renderBasket();
  }

  const SCROLL_RESTORE_KEY = 'barMartiri.scrollRestore.v1';

  function restoreScrollAfterLanguageSwitch() {
    let saved = null;
    try {
      saved = sessionStorage.getItem(SCROLL_RESTORE_KEY);
      sessionStorage.removeItem(SCROLL_RESTORE_KEY);
    } catch {
      return;
    }
    const top = Number(saved);
    if (!Number.isFinite(top) || top <= 0) return;
    // The pinned flavour section sets the page height, so wait until layout has
    // settled before jumping, and do it instantly rather than smooth-scrolling.
    const jump = () => window.scrollTo({ top, behavior: 'instant' });
    jump();
    window.setTimeout(jump, 120);
    window.addEventListener('load', () => window.setTimeout(jump, 60), { once: true });
  }

  function detectBrowserLanguage() {
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
    for (const candidate of candidates) {
      const code = String(candidate).slice(0, 2).toLowerCase();
      if (LANGUAGE_LOCALES[code]) return code;
    }
    return 'sq';
  }

  // Returns both the language and WHERE it came from. The source matters: a
  // language the visitor explicitly picked may redirect, a language merely
  // guessed from navigator.languages must not (see initializeLanguage).
  function getInitialLanguage() {
    const routeLanguage = document.documentElement.dataset.initialLanguage;
    if (LANGUAGE_LOCALES[routeLanguage]) return { language: routeLanguage, source: 'route' };
    const cookieLanguage = readCookie(LANGUAGE_COOKIE_NAME);
    if (LANGUAGE_LOCALES[cookieLanguage]) return { language: cookieLanguage, source: 'chosen' };
    try {
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
      if (LANGUAGE_LOCALES[savedLanguage]) return { language: savedLanguage, source: 'chosen' };
    } catch {
      // The language switcher remains available when storage is unavailable.
    }
    return { language: detectBrowserLanguage(), source: 'guessed' };
  }

  function initializeLanguage() {
    const { language: initialLanguage, source } = getInitialLanguage();
    const languagePath = SEO_TEXT[initialLanguage]?.path;
    const routeLanguage = document.documentElement.dataset.initialLanguage;
    const elsewhere = !routeLanguage && languagePath && window.location.pathname !== languagePath;

    // Only a language the visitor actually chose earns a redirect. "/" is our
    // canonical and hreflang x-default, and it used to bounce anyone whose
    // browser reported a non-Albanian locale -- including Googlebot, which
    // renders with an English locale. That made the default page redirect away
    // from itself and put its indexing at risk. Guessed languages now get a
    // dismissible suggestion instead, so "/" stays a real, crawlable page.
    if (elsewhere && source === 'chosen') {
      window.location.replace(languagePath);
      return;
    }

    applyLanguage(routeLanguage && LANGUAGE_LOCALES[routeLanguage] ? routeLanguage : (elsewhere ? 'sq' : initialLanguage));
    if (elsewhere && source === 'guessed') offerLanguage(initialLanguage, languagePath);
    void refreshProducts();
    void refreshSunbedPrice();
    restoreScrollAfterLanguageSwitch();
    scheduleStoryMotion();
  }

  // Non-blocking "this page is also available in X" bar. Replaces the old
  // automatic redirect; keeps the visitor one tap from their own language.
  function offerLanguage(language, languagePath) {
    const copy = LANGUAGE_OFFER[language];
    if (!copy || document.querySelector('[data-language-offer]')) return;

    const bar = document.createElement('aside');
    bar.className = 'language-offer';
    bar.setAttribute('data-language-offer', '');
    bar.lang = LANGUAGE_LOCALES[language] || language;

    const link = document.createElement('a');
    link.href = languagePath;
    link.className = 'language-offer-accept';
    link.textContent = copy.accept;
    link.addEventListener('click', () => {
      try {
        localStorage.setItem(LANGUAGE_KEY, language);
      } catch {
        // Navigation still applies when storage is unavailable.
      }
      writeCookie(LANGUAGE_COOKIE_NAME, language);
    });

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'language-offer-dismiss';
    dismiss.setAttribute('aria-label', copy.dismiss);
    dismiss.textContent = '×';
    dismiss.addEventListener('click', () => bar.remove());

    const label = document.createElement('span');
    label.textContent = copy.label;

    bar.append(label, link, dismiss);
    document.body.append(bar);
  }

  languageSwitches.forEach((button) => {
    button.addEventListener('click', () => {
      const language = button.dataset.languageSwitch;
      const languagePath = SEO_TEXT[language]?.path;
      if (languagePath && window.location.pathname !== languagePath) {
        try {
          localStorage.setItem(LANGUAGE_KEY, language);
        } catch {
          // Navigation still applies when storage is unavailable.
        }
        writeCookie(LANGUAGE_COOKIE_NAME, language);
        // Switching language is a full navigation, so the reader lands at the top
        // of the new page. Someone who scrolled to the address and then wanted it
        // in their own language had to scroll all the way back down. Carry the
        // position across and restore it once the new page is laid out.
        try {
          sessionStorage.setItem(SCROLL_RESTORE_KEY, String(Math.round(window.scrollY)));
        } catch {
          // Restoring is a nicety; navigate regardless.
        }
        window.location.assign(languagePath);
        return;
      }
      applyLanguage(language);
    });
  });

  function closeLanguageMenus(except) {
    languageSwitchers.forEach((switcher) => {
      if (switcher === except) return;
      const toggle = switcher.querySelector('[data-language-toggle]');
      const menu = switcher.querySelector('[data-language-menu]');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    });
  }

  function syncLanguageSwitchers() {
    const meta = LANGUAGE_META[currentLanguage] || LANGUAGE_META.sq;
    languageSwitchers.forEach((switcher) => {
      const flagEl = switcher.querySelector('[data-language-flag]');
      const codeEl = switcher.querySelector('[data-language-code]');
      if (flagEl) flagEl.textContent = meta.flag;
      if (codeEl) codeEl.textContent = meta.code;
    });
    closeLanguageMenus();
  }

  languageSwitchers.forEach((switcher) => {
    const toggle = switcher.querySelector('[data-language-toggle]');
    const menu = switcher.querySelector('[data-language-menu]');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      closeLanguageMenus(isOpen ? undefined : switcher);
      toggle.setAttribute('aria-expanded', String(!isOpen));
      menu.hidden = isOpen;
    });
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-language-switcher]')) return;
    closeLanguageMenus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLanguageMenus();
  });

  function normalizeDegrees(value) {
    return ((value % 360) + 360) % 360;
  }

  function calculateSunset(date, latitude, longitude) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const day = Math.floor(
      (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) /
        86400000
    );
    const longitudeHour = longitude / 15;
    const approximateTime = day + (18 - longitudeHour) / 24;
    const meanAnomaly = 0.9856 * approximateTime - 3.289;
    const trueLongitude = normalizeDegrees(
      meanAnomaly +
        1.916 * Math.sin((meanAnomaly * Math.PI) / 180) +
        0.02 * Math.sin((2 * meanAnomaly * Math.PI) / 180) +
        282.634
    );
    let rightAscension =
      (Math.atan(0.91764 * Math.tan((trueLongitude * Math.PI) / 180)) * 180) / Math.PI;
    rightAscension = normalizeDegrees(rightAscension);
    rightAscension +=
      Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
    rightAscension /= 15;

    const sinDeclination = 0.39782 * Math.sin((trueLongitude * Math.PI) / 180);
    const cosDeclination = Math.cos(Math.asin(sinDeclination));
    const cosHour =
      (Math.cos((90.833 * Math.PI) / 180) -
        sinDeclination * Math.sin((latitude * Math.PI) / 180)) /
      (cosDeclination * Math.cos((latitude * Math.PI) / 180));
    const hourAngle =
      (Math.acos(Math.min(1, Math.max(-1, cosHour))) * 180) / Math.PI / 15;
    const localMeanTime =
      hourAngle + rightAscension - 0.06571 * approximateTime - 6.622;
    const universalTime = ((localMeanTime - longitudeHour) % 24 + 24) % 24;
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        Math.floor(universalTime),
        Math.round((universalTime % 1) * 60)
      )
    );
  }

  function formatSpilleTime(date) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Tirane',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  function getSpilleCalendarDate(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Tirane',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return new Date(
      Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12)
    );
  }

  function getNextSunset(now = new Date()) {
    const today = getSpilleCalendarDate(now);
    let sunset = calculateSunset(today, SPILLE_COORDS.latitude, SPILLE_COORDS.longitude);
    let tomorrow = false;
    if (sunset <= now) {
      today.setUTCDate(today.getUTCDate() + 1);
      sunset = calculateSunset(today, SPILLE_COORDS.latitude, SPILLE_COORDS.longitude);
      tomorrow = true;
    }
    return { sunset, tomorrow };
  }

  function updateSunset() {
    const time = document.querySelector('[data-sunset-time]');
    const countdown = document.querySelector('[data-sunset-countdown]');
    const now = new Date();
    const { sunset, tomorrow } = getNextSunset(now);
    const totalMinutes = Math.max(0, Math.round((sunset - now) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (time) time.textContent = formatSpilleTime(sunset);
    if (countdown) {
      countdown.textContent =
        `${tomorrow ? 'Perendimi neser pas' : 'Perendimi pas'} ${hours}h ${minutes}m`;
    }
    document
      .querySelectorAll('[data-ticker-sunset]')
      .forEach((item) => (item.textContent = formatSpilleTime(sunset)));
  }

  // The Albanian here was previously unaccented ("Mundesi", "I qete", "ere") and
  // had no it/en equivalents, so /it/ and /en/ showed misspelled Albanian once
  // the widget loaded.
  const WEATHER_CONDITION = Object.freeze({
    thunder: { sq: 'Stuhi në afërsi', it: 'Temporali nelle vicinanze', en: 'Storms nearby' },
    rain: { sq: 'Mundësi reshjesh', it: 'Possibili piogge', en: 'Rain possible' },
    fog: { sq: 'Mjegull në breg', it: 'Nebbia sulla costa', en: 'Fog on the shore' },
    partlycloudy: { sq: 'Pjesërisht me re', it: 'Parzialmente nuvoloso', en: 'Partly cloudy' },
    cloudy: { sq: 'Me re', it: 'Nuvoloso', en: 'Cloudy' },
    fair: { sq: 'Kthjellime', it: 'Sereno', en: 'Fair' },
    clear: { sq: 'Qiell i kthjellët', it: 'Cielo sereno', en: 'Clear sky' },
  });

  const SEA_STATE = Object.freeze({
    calm: { sq: 'i qetë', it: 'calmo', en: 'calm' },
    light: { sq: 'me lëvizje të lehtë', it: 'poco mosso', en: 'slightly choppy' },
    windy: { sq: 'me erë', it: 'mosso', en: 'choppy' },
  });

  const WEATHER_SENTENCE = Object.freeze({
    sq: (c, t, uv, w, sea, at) =>
      `${c}, ${t} gradë. UV ${uv}, erë ${w} kilometra në orë, deti ${sea}. Përditësuar ${at}.`,
    it: (c, t, uv, w, sea, at) =>
      `${c}, ${t} gradi. UV ${uv}, vento ${w} chilometri orari, mare ${sea}. Aggiornato alle ${at}.`,
    en: (c, t, uv, w, sea, at) =>
      `${c}, ${t} degrees. UV ${uv}, wind ${w} kilometres per hour, sea ${sea}. Updated ${at}.`,
  });

  function localized(table, key) {
    return table[key]?.[currentLanguage] || table[key]?.sq || '';
  }

  function weatherDescription(symbolCode = '') {
    if (symbolCode.includes('thunder')) return localized(WEATHER_CONDITION, 'thunder');
    if (symbolCode.includes('rain') || symbolCode.includes('sleet')) return localized(WEATHER_CONDITION, 'rain');
    if (symbolCode.includes('fog')) return localized(WEATHER_CONDITION, 'fog');
    if (symbolCode.includes('partlycloudy')) return localized(WEATHER_CONDITION, 'partlycloudy');
    if (symbolCode.includes('cloudy')) return localized(WEATHER_CONDITION, 'cloudy');
    if (symbolCode.includes('fair')) return localized(WEATHER_CONDITION, 'fair');
    return localized(WEATHER_CONDITION, 'clear');
  }

  function coastalEstimate(windSpeedKmh) {
    if (windSpeedKmh < 12) return localized(SEA_STATE, 'calm');
    if (windSpeedKmh < 25) return localized(SEA_STATE, 'light');
    return localized(SEA_STATE, 'windy');
  }

  function weatherIcon(symbolCode = '') {
    if (symbolCode.includes('thunder')) return '#weather-icon-storm';
    if (symbolCode.includes('rain') || symbolCode.includes('sleet')) {
      return '#weather-icon-rain';
    }
    if (symbolCode.includes('cloud') || symbolCode.includes('fog')) {
      return '#weather-icon-cloud';
    }
    if (symbolCode.includes('night')) return '#weather-icon-moon';
    return '#weather-icon-sun';
  }

  function renderWeather(payload, savedAt = Date.now()) {
    const details = payload?.data?.instant?.details;
    if (!details) return false;

    const temperature = Math.round(details.air_temperature);
    const windSpeed = Math.round(details.wind_speed * 3.6);
    const uv = Math.round((details.ultraviolet_index_clear_sky || 0) * 10) / 10;
    const symbol = payload?.data?.next_1_hours?.summary?.symbol_code || '';
    document
      .querySelectorAll('[data-ticker-temp]')
      .forEach((item) => (item.textContent = temperature));
    document
      .querySelectorAll('[data-ticker-uv]')
      .forEach((item) => (item.textContent = formatDecimal(uv)));
    document
      .querySelectorAll('[data-ticker-wind]')
      .forEach((item) => (item.textContent = windSpeed));
    document.querySelectorAll('[data-ticker-condition-use]').forEach((icon) => {
      icon.setAttribute('href', weatherIcon(symbol));
    });
    const summary = document.querySelector('[data-weather-summary]');
    if (summary) {
      const sentence = WEATHER_SENTENCE[currentLanguage] || WEATHER_SENTENCE.sq;
      summary.textContent = sentence(
        weatherDescription(symbol),
        temperature,
        formatDecimal(uv),
        windSpeed,
        coastalEstimate(windSpeed),
        formatSpilleTime(new Date(savedAt))
      );
    }
    return true;
  }

  async function loadSpilleWeather() {
    if (!document.querySelector('[data-spille-dashboard]')) return;

    try {
      const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY));
      if (
        cached?.payload &&
        Date.now() - Number(cached.savedAt) < WEATHER_CACHE_TTL &&
        renderWeather(cached.payload, cached.savedAt)
      ) {
        return;
      }
    } catch {
      // Continue with a fresh request when storage is unavailable.
    }

    try {
      const query = new URLSearchParams({
        lat: SPILLE_COORDS.latitude,
        lon: SPILLE_COORDS.longitude,
      });
      const response = await fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/complete?${query}`
      );
      if (!response.ok) throw new Error(`Weather request failed with ${response.status}`);
      const forecast = await response.json();
      const payload = forecast?.properties?.timeseries?.[0];
      if (!renderWeather(payload)) {
        throw new Error('Weather response did not contain current data');
      }
      try {
        localStorage.setItem(
          WEATHER_CACHE_KEY,
          JSON.stringify({ payload, savedAt: Date.now() })
        );
      } catch {
        // Weather remains visible when storage is unavailable.
      }
    } catch (error) {
      console.error('Moti për Spillen nuk mund të përditësohet.', error);
      const summary = document.querySelector('[data-weather-summary]');
      if (summary) summary.textContent = 'Moti nuk u përditësua. Provo përsëri pas pak.';
    }
  }

  function normalizeProduct(product, index = 0) {
    const productId = String(product.id || `product-${index}`);
    const image = String(product.image || '');
    const localCatalogImage = localProductImages[productId];
    const localProductPrefix = `/assets/products/${productId}.`;
    const isLegacyLocalImage =
      image.startsWith(localProductPrefix) ||
      image.startsWith(localProductPrefix.slice(1)) ||
      image.startsWith(`${window.location.origin}${localProductPrefix}`);
    return {
      id: productId,
      name: String(product.name || '').slice(0, 80),
      category: menuData.categoryOverrides?.[String(product.id || '')] || String(product.category || ''),
      description: String(product.description || '').slice(0, 240),
      price:
        product.price === null || product.price === undefined
          ? ''
          : String(product.price),
      image:
        ((localCatalogImage?.source === image ||
          localCatalogImage?.local === image ||
          isLegacyLocalImage) &&
          localCatalogImage?.local) ||
        optimizedLocalImages[image] ||
        image,
      sortOrder: Number(product.sort_order ?? product.sortOrder ?? index),
      translations: {
        it: {
          name: String(product.name_it ?? product.translations?.it?.name ?? '').slice(0, 80),
          description: String(
            product.description_it ?? product.translations?.it?.description ?? ''
          ).slice(0, 240),
        },
        en: {
          name: String(product.name_en ?? product.translations?.en?.name ?? '').slice(0, 80),
          description: String(
            product.description_en ?? product.translations?.en?.description ?? ''
          ).slice(0, 240),
        },
      },
    };
  }

  function readCachedProducts() {
    try {
      const cached = JSON.parse(localStorage.getItem(MENU_CACHE_KEY));
      if (
        !cached ||
        !Array.isArray(cached.products) ||
        Date.now() - Number(cached.savedAt) > MENU_CACHE_MAX_AGE
      ) {
        return null;
      }
      return {
        products: cached.products.map(normalizeProduct),
        stale: Date.now() - Number(cached.savedAt) > MENU_CACHE_TTL,
      };
    } catch {
      return null;
    }
  }

  function cacheProducts(products) {
    try {
      localStorage.setItem(
        MENU_CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), products })
      );
    } catch {
      // The menu still works when storage is unavailable.
    }
  }

  function refreshProducts() {
    if (menuLoadPromise) return menuLoadPromise;

    menuLoadPromise = (async () => {
      const cached = readCachedProducts();
      if (cached?.products?.length) {
        catalogProducts = cached.products;
        if (menuRendered) renderProducts();
        if (menuStatus) {
          menuStatus.textContent = '';
          delete menuStatus.dataset.i18nDynamic;
        }
        if (!cached.stale) return catalogProducts;
      }

      if (!supabaseConfig.url || !supabaseConfig.publishableKey) return catalogProducts;
      setDynamicText(menuStatus, 'refreshingMenu');

      try {
        const requestProducts = async (includeTranslations = true) => {
          const fields = [
            'id',
            'name',
            'category',
            'description',
            'price',
            'image',
            'sort_order',
            'created_at',
          ];
          if (includeTranslations) {
            fields.push('name_it', 'name_en', 'description_it', 'description_en');
          }
          const query = new URLSearchParams({
            select: fields.join(','),
            order: 'sort_order.asc,created_at.asc',
          });
          return fetch(`${supabaseConfig.url}/rest/v1/products?${query.toString()}`, {
            headers: {
              apikey: supabaseConfig.publishableKey,
              Authorization: `Bearer ${supabaseConfig.publishableKey}`,
            },
          });
        };
        let response = await requestProducts(true);
        if (response.status === 400) response = await requestProducts(false);
        if (!response.ok) throw new Error(`Menu request failed with ${response.status}`);

        const products = (await response.json()).map(normalizeProduct);
        if (products.length) {
          catalogProducts = products;
          cacheProducts(products);
          if (menuRendered) renderProducts();
        }
        if (menuStatus) {
          menuStatus.textContent = '';
          delete menuStatus.dataset.i18nDynamic;
        }
      } catch (error) {
        console.error('Menuja nuk mund të përditësohet.', error);
        setDynamicText(menuStatus, cached?.products?.length ? 'cachedMenu' : 'offlineMenu');
      }
      return catalogProducts;
    })().finally(() => {
      menuLoadPromise = null;
    });

    return menuLoadPromise;
  }

  function formatPrice(price) {
    if (price === null || price === undefined || String(price).trim() === '') return '';
    return `${String(price).trim()} ALL`;
  }

  function capitalizeWords(value) {
    return String(value || '').replace(/(^|\s)(\S)/g, (match, space, letter) => {
      return `${space}${letter.toLocaleUpperCase(LANGUAGE_LOCALES[currentLanguage])}`;
    });
  }

  function productMatchesSearch(product) {
    if (!menuSearchQuery) return true;
    const searchable = `${productNameFor(product)} ${productDescriptionFor(product)}`
      .toLocaleLowerCase(LANGUAGE_LOCALES[currentLanguage])
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return searchable.includes(menuSearchQuery);
  }

  function renderCategories() {
    if (!categoryTabs) return;
    categoryTabs.replaceChildren();

    menuData.categories.forEach((category) => {
      const matchingProducts = catalogProducts.filter(
        (product) => product.category === category.id && productMatchesSearch(product)
      );
      const button = document.createElement('button');
      button.className = 'category-tab';
      button.type = 'button';
      button.dataset.category = category.id;
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'category-tab-icon');
      icon.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `#category-icon-${category.id}`);
      icon.append(use);
      const label = document.createElement('span');
      label.className = 'category-tab-label';
      label.textContent = capitalizeWords(categoryLabelFor(category));
      button.append(icon, label);
      button.setAttribute('aria-controls', `menu-category-${category.id}`);
      button.disabled = Boolean(menuSearchQuery && !matchingProducts.length);
      button.classList.toggle('is-active', category.id === activeCategory);
      button.addEventListener('click', () => {
        activeCategory = category.id;
        categoryTabs
          .querySelectorAll('.category-tab')
          .forEach((tab) => tab.classList.toggle('is-active', tab === button));
        menuPanel?.classList.add('is-header-compact');
        document
          .querySelector(`#menu-category-${category.id}`)
          ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
      categoryTabs.append(button);
    });
  }

  function createProductCard(product, priority = false) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const image = document.createElement('img');
    const source = product.image || '/assets/optimized/ice-cream-cone.webp';
    image.src = priority
      ? source
      : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    if (!priority) image.dataset.src = source;
    image.alt = productNameFor(product);
    image.loading = priority ? 'eager' : 'lazy';
    image.fetchPriority = priority ? 'high' : 'low';
    image.decoding = 'async';
    image.width = 560;
    image.height = 700;
    image.addEventListener('load', () => card.classList.add('is-image-ready'));
    image.addEventListener(
      'error',
      () => {
        if (!image.src.endsWith('/assets/optimized/ice-cream-cone.webp')) {
          image.src = '/assets/optimized/ice-cream-cone.webp';
        }
      },
      { once: true }
    );

    const body = document.createElement('div');
    const title = document.createElement('h4');
    const description = document.createElement('p');
    title.textContent = capitalizeWords(productNameFor(product));
    description.textContent = productDescriptionFor(product);
    body.append(title, description);

    const price = formatPrice(product.price);
    if (price) {
      const priceRow = document.createElement('div');
      priceRow.className = 'product-card-price-row';
      const priceElement = document.createElement('strong');
      priceElement.textContent = price;
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'add-to-basket';
      addButton.textContent = dynamicText('addToBasket');
      addButton.setAttribute('aria-label', `${dynamicText('addToBasket')} ${capitalizeWords(productNameFor(product))}`);
      addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        addToCart(product);
        addButton.classList.add('is-added');
        window.setTimeout(() => addButton.classList.remove('is-added'), 360);
      });
      priceRow.append(priceElement, addButton);
      body.append(priceRow);
    }

    card.append(image, body);
    return card;
  }

  function observeProductImages() {
    productImageObserver?.disconnect();
    const images = [...productGrid.querySelectorAll('img[data-src]')];
    const loadImage = (image) => {
      if (!image.dataset.src) return;
      image.src = image.dataset.src;
      delete image.dataset.src;
    };
    if (!('IntersectionObserver' in window)) {
      images.forEach(loadImage);
      return;
    }
    const menuPanel = panels.find((panel) => panel.dataset.panel === 'menu') || null;
    productImageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          productImageObserver?.unobserve(entry.target);
          loadImage(entry.target);
        });
      },
      { root: menuPanel, rootMargin: '180px 0px' }
    );
    images.forEach((image) => productImageObserver.observe(image));
  }

  function renderProducts() {
    if (!productGrid) return;
    menuRendered = true;
    productGrid.replaceChildren();

    let visibleProductCount = 0;
    menuData.categories.forEach((category) => {
      const products = catalogProducts.filter(
        (product) => product.category === category.id && productMatchesSearch(product)
      );
      const section = document.createElement('section');
      section.className = 'menu-category';
      section.id = `menu-category-${category.id}`;
      section.setAttribute('aria-labelledby', `menu-category-title-${category.id}`);
      if (menuSearchQuery && !products.length) section.hidden = true;
      visibleProductCount += products.length;

      const heading = document.createElement('header');
      const title = document.createElement('h3');
      const count = document.createElement('span');
      title.id = `menu-category-title-${category.id}`;
      title.textContent = capitalizeWords(categoryLabelFor(category));
      count.textContent = products.length
        ? `${products.length} ${dynamicText('products')}`
        : dynamicText('comingSoon');
      heading.append(title, count);

      const items = document.createElement('div');
      items.className = 'product-grid';
      if (products.length) {
        products.forEach((product, index) =>
          items.append(createProductCard(product, category.id === menuData.categories[0]?.id && index < 3))
        );
      } else {
        const empty = document.createElement('p');
        empty.className = 'empty-category';
        empty.textContent = dynamicText('emptyCategory');
        items.append(empty);
      }

      section.append(heading, items);
      productGrid.append(section);
    });
    if (menuSearchQuery && !visibleProductCount) {
      const empty = document.createElement('p');
      empty.className = 'menu-search-empty';
      empty.textContent = dynamicText('noResults');
      productGrid.append(empty);
    }
    observeProductImages();
  }

  menuSearchInput?.addEventListener('input', () => {
    menuSearchQuery = menuSearchInput.value
      .trim()
      .toLocaleLowerCase(LANGUAGE_LOCALES[currentLanguage])
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    renderCategories();
    renderProducts();
  });

  function setDockActive(name) {
    dockActions.forEach((action) => {
      const selected = action.dataset.dockAction === name;
      action.classList.toggle('is-active', selected);
      action.setAttribute('aria-pressed', String(selected));
    });
  }

  function getFocusable(container) {
    return [
      ...container.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((element) => !element.hidden);
  }

  function openPanel(name, trigger) {
    const target = panels.find((panel) => panel.dataset.panel === name);
    if (!target || !panelLayer) return;

    if (activePanel === name) {
      closePanel();
      return;
    }

    window.clearTimeout(closeTimer);
    panels.forEach((panel) => {
      panel.classList.remove('is-open');
      panel.hidden = panel !== target;
    });

    previousFocus = trigger || document.activeElement;
    activePanel = name;
    panelLayer.hidden = false;
    target.hidden = false;
    target.scrollTop = 0;
    target.classList.remove('is-header-compact');
    lastPanelScrollY = 0;
    document.body.classList.add('is-panel-open');
    document.getElementById('main')?.setAttribute('inert', '');
    document.querySelector('.site-header')?.setAttribute('inert', '');
    dock?.classList.remove('is-compact');
    setDockActive(name);

    if (name === 'menu') {
      if (!menuRendered) {
        renderCategories();
        renderProducts();
      }
      void refreshProducts();
    }
    if (name === 'info' && getCookiePreference() === 'all') loadMap();
    if (name === 'basket') renderBasket();
    if (name === 'chat') void openChatPanel();

    requestAnimationFrame(() => {
      panelLayer.classList.add('is-visible');
      target.classList.add('is-open');
      if (!reducedMotion && target.animate) {
        target.animate(
          [
            { opacity: 0, transform: 'translateY(18px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      }
      const closeButton = target.querySelector('[data-panel-close]');
      if (closeButton) {
        closeButton.focus();
      } else {
        target.setAttribute('tabindex', '-1');
        target.focus();
      }
    });
  }

  function closePanel(options = {}) {
    if (!panelLayer || !activePanel) {
      if (!options.keepActive) setDockActive('home');
      return;
    }

    const closingPanel = panels.find((panel) => panel.dataset.panel === activePanel);
    if (activePanel === 'chat') stopChatPolling();
    activePanel = null;
    panelLayer.classList.remove('is-visible');
    closingPanel?.classList.remove('is-open');
    document.body.classList.remove('is-panel-open');
    document.getElementById('main')?.removeAttribute('inert');
    document.querySelector('.site-header')?.removeAttribute('inert');
    if (!options.keepActive) setDockActive('home');

    closeTimer = window.setTimeout(() => {
      panels.forEach((panel) => {
        panel.hidden = true;
      });
      panelLayer.hidden = true;
    }, reducedMotion ? 0 : 320);

    if (options.restoreFocus !== false && previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
  }

  function handleDockAction(action) {
    const name = action.dataset.dockAction;
    if (name === 'home') {
      closePanel({ restoreFocus: false });
      document
        .querySelector('#home')
        ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      setDockActive('home');
      return;
    }
    openPanel(name, action);
  }

  dockActions.forEach((action) => {
    action.addEventListener('click', () => {
      if (!reducedMotion && action.animate) {
        action.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(0.94)' }, { transform: 'scale(1)' }],
          { duration: 240, easing: 'ease-out' }
        );
      }
      handleDockAction(action);
    });
  });

  document.querySelector('[data-hero-menu]')?.addEventListener('click', (event) => {
    openPanel('menu', event.currentTarget);
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => closePanel());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activePanel) {
      closePanel();
      return;
    }

    if (event.key !== 'Tab' || !activePanel) return;
    const currentPanel = panels.find((panel) => panel.dataset.panel === activePanel);
    const focusable = currentPanel ? getFocusable(currentPanel) : [];
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function updateDockForScroll(nextScrollY, isPanelScroll = false) {
    const previous = isPanelScroll ? lastPanelScrollY : lastScrollY;
    const delta = nextScrollY - previous;
    // Both bars stay put at every scroll position: the dock is the only
    // navigation and the header holds the language switcher, so neither may
    // disappear. The header shrinks instead, which keeps it reachable without
    // costing a fixed slice of a phone screen.
    if (!isPanelScroll) siteHeader?.classList.toggle('is-compact', nextScrollY > 90);
    if (Math.abs(delta) > 5) {
      dock?.classList.toggle('is-compact', delta > 0 && nextScrollY > 90);
    }
    if (isPanelScroll) lastPanelScrollY = nextScrollY;
    else lastScrollY = nextScrollY;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (scrollFrame || activePanel) return;
      scrollFrame = requestAnimationFrame(() => {
        updateDockForScroll(window.scrollY);
        scrollFrame = 0;
      });
    },
    { passive: true }
  );

  panels.forEach((panel) => {
    panel.addEventListener(
      'scroll',
      () => {
        if (panel.dataset.panel === activePanel) updateDockForScroll(panel.scrollTop, true);
        if (panel === menuPanel) panel.classList.toggle('is-header-compact', panel.scrollTop > 24);
      },
      { passive: true }
    );
  });

  function readCookie(name) {
    const cookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
  }

  function writeCookie(name, value) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  }

  function getCookiePreference() {
    return readCookie(COOKIE_NAME);
  }

  function saveCookiePreference(value) {
    writeCookie(COOKIE_NAME, value);
    hideCookieBanner();
  }

  function positionCookieBanner() {
    if (!cookieBanner || cookieBanner.hidden) {
      document.documentElement.style.removeProperty('--cookie-banner-offset');
      return;
    }
    const { top } = cookieBanner.getBoundingClientRect();
    const reserved = window.innerHeight - top + 16;
    document.documentElement.style.setProperty('--cookie-banner-offset', `${Math.max(0, reserved)}px`);
  }

  function showCookieBanner() {
    if (!cookieBanner) return;
    window.setTimeout(
      () => {
        cookieBanner.hidden = false;
        requestAnimationFrame(() => {
          cookieBanner.classList.add('is-visible');
          positionCookieBanner();
        });
        window.addEventListener('resize', positionCookieBanner);
      },
      reducedMotion ? 0 : 900
    );
  }

  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.classList.remove('is-visible');
    window.removeEventListener('resize', positionCookieBanner);
    document.documentElement.style.removeProperty('--cookie-banner-offset');
    window.setTimeout(() => {
      cookieBanner.hidden = true;
    }, reducedMotion ? 0 : 240);
  }

  function loadMap() {
    if (!mapFrame || mapFrame.src) return;
    mapFrame.src = mapFrame.dataset.src;
    mapFrame.hidden = false;
    if (mapPlaceholder) mapPlaceholder.hidden = true;
  }

  function unloadMap() {
    if (!mapFrame?.src) return;
    mapFrame.removeAttribute('src');
    mapFrame.hidden = true;
    if (mapPlaceholder) mapPlaceholder.hidden = false;
  }

  document.querySelectorAll('[data-cookie-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.cookieChoice === 'all' ? 'all' : 'essential';
      saveCookiePreference(choice);
      if (choice === 'all' && activePanel === 'info') loadMap();
      if (choice === 'essential') unloadMap();
    });
  });

  document.querySelector('[data-load-map]')?.addEventListener('click', () => {
    saveCookiePreference('all');
    loadMap();
  });

  document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
      showCookieBanner();
      cookieBanner?.querySelector('[data-cookie-choice="essential"]')?.focus();
    });
  });

  function createMarqueeVisibility() {
    const marquees = [...document.querySelectorAll('.footer-marquee, .weather-ticker-track')];
    if (!marquees.length || reducedMotion) return;
    if (!('IntersectionObserver' in window)) {
      marquees.forEach((marquee) => marquee.classList.add('is-running'));
      return;
    }

    marquees.forEach((marquee) => {
      const observer = new IntersectionObserver(
        ([entry]) => marquee.classList.toggle('is-running', entry.isIntersecting),
        { rootMargin: '120px 0px' }
      );
      observer.observe(marquee);
    });
  }

  function createStoryMotion() {
    if (reducedMotion || !story || !window.gsap || !window.ScrollTrigger) return;
    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    const flavorCards = [...document.querySelectorAll('[data-flavor-card]')];
    const flavorIntro = document.querySelector('.flavor-intro');
    const flavorCue = document.querySelector('.flavor-cue');
    const flavorProgress = document.querySelector('[data-flavor-progress]');
    const compactStory = window.matchMedia('(max-width: 640px)').matches;

    if (flavorCards.length === 5) {
      const spacing = () =>
        compactStory
          ? Math.min(74, window.innerWidth * 0.18)
          : Math.min(180, window.innerWidth * 0.15);
      const slotOrder = [0, -1, -2, 1, 2];
      const rotations = [0, -5, -10, 5, 10];
      const yOffsets = [0, 0, compactStory ? 10 : 22, 0, compactStory ? 10 : 22];
      const finalScale = compactStory ? 0.78 : 0.84;

      gsap.set(flavorCards, {
        autoAlpha: 0,
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 36,
        scale: 0.72,
        rotation: 0,
        transformOrigin: '50% 88%',
      });
      gsap.set(flavorCards[0], { autoAlpha: 1, y: 0, scale: 1 });

      const flavorTimeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'bar-martiri-flavors',
          trigger: story,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.22,
          invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set(flavorProgress, { scaleX: self.progress }),
        },
      });

      flavorTimeline
        .to(flavorCue, { autoAlpha: 0, y: 10, duration: 0.35 }, 0.3)
        .to(
          flavorIntro,
          { y: compactStory ? -8 : -14, duration: 0.8, ease: 'power2.inOut' },
          0.45
        )
        .to(
          flavorCards[0],
          { scale: finalScale, duration: 0.8, ease: 'power2.inOut' },
          0.6
        );

      [1, 3, 2, 4].forEach((cardIndex, revealIndex) => {
        flavorTimeline.to(
          flavorCards[cardIndex],
          {
            autoAlpha: 1,
            x: () => slotOrder[cardIndex] * spacing(),
            y: yOffsets[cardIndex],
            scale: finalScale,
            duration: 0.9,
            ease: 'power3.out',
          },
          1.05 + revealIndex * 0.72
        );
        flavorTimeline.to(
          flavorCards[cardIndex].querySelector('img'),
          {
            rotation: rotations[cardIndex],
            duration: 0.9,
            ease: 'power3.out',
          },
          1.05 + revealIndex * 0.72
        );
      });
      flavorTimeline.to({}, { duration: 0.85 });
    }

    [
      ['.visit-copy > *', '.visit-section'],
      ['.visit-details > *', '.visit-section'],
      ['.closing-section > *', '.closing-section'],
    ].forEach(([targets, triggerSelector]) => {
      const trigger = document.querySelector(triggerSelector);
      runWhenNear(trigger, () => {
        gsap.from(targets, {
          autoAlpha: 0,
          y: 24,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,transform',
        });
      }, '0px 0px -12%');
    });

    window.addEventListener('load', () => window.ScrollTrigger?.refresh(), { once: true });
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${source}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        }
        return;
      }
      const script = document.createElement('script');
      script.src = source;
      script.defer = true;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.append(script);
    });
  }

  async function loadStoryMotion() {
    if (reducedMotion) return;
    try {
      await loadScript('assets/vendor/gsap.min.js');
      await loadScript('assets/vendor/ScrollTrigger.min.js');
      createStoryMotion();
    } catch {
      story?.classList.add('is-static');
    }
  }

  function runWhenNear(element, callback, rootMargin = '600px 0px') {
    if (!element || !('IntersectionObserver' in window)) {
      const run = () => callback();
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1800 });
      else window.setTimeout(run, 700);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        callback();
      },
      { rootMargin }
    );
    observer.observe(element);
  }

  let storyMotionScheduled = false;
  function scheduleStoryMotion() {
    if (storyMotionScheduled) return;
    storyMotionScheduled = true;
    window.setTimeout(
      () => runWhenNear(story, () => void loadStoryMotion(), '700px 0px'),
      reducedMotion ? 0 : 120
    );
  }

  setDockActive('home');
  updateSunset();
  window.setInterval(updateSunset, 60 * 1000);
  runWhenNear(document.querySelector('[data-spille-dashboard]'), loadSpilleWeather, '500px 0px');
  createMarqueeVisibility();
  if (!getCookiePreference()) showCookieBanner();
  void loadReviewSummary();
  void loadStory();
  void loadGalleryImages();
  startChatBackgroundPoll();
  updateWhatsAppVisibility();
  window.setInterval(updateWhatsAppVisibility, 60 * 1000);
  void initializeBasket();
  initializeLanguage();
  const year = document.querySelector('[data-current-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
