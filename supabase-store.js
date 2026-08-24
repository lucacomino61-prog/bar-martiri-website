(function defineBarMartiriStore() {
  'use strict';

  const PRODUCTS_KEY = 'barMartiri.products.v1';
  const REVIEWS_KEY = 'barMartiri.reviews.v1';
  const DEFAULT_REVIEWS = Object.freeze({
    ratingValue: '3.9',
    reviewCount: 31,
    lastVerified: '2026-08-03',
    testimonials: [
      { author: 'Doctor Who', rating: 5, quote: 'That ice-cream was awesome.' },
      { author: 'E Cabej', rating: 5, quote: 'The service is excellent.' },
    ],
  });
  const STORY_KEY = 'barMartiri.story.v1';
  const DEFAULT_STORY = Object.freeze({
    titleSq: '',
    bodySq: '',
    titleIt: '',
    bodyIt: '',
    titleEn: '',
    bodyEn: '',
  });
  const config = window.BAR_MARTIRI_SUPABASE || {};
  const menuData = window.BAR_MARTIRI_MENU || { products: [] };
  const isConfigured = Boolean(
    config.url &&
      config.publishableKey &&
      window.supabase?.createClient
  );
  const client = isConfigured
    ? window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
  const BASE_COLUMNS = 'id,name,category,description,price,image,sort_order';
  const TRANSLATION_COLUMNS = 'name_it,name_en,description_it,description_en';
  let translationColumnsSupported = null;

  function isMissingTranslationsError(error) {
    return (
      ['42703', 'PGRST204'].includes(error?.code) ||
      /name_it|name_en|description_it|description_en/i.test(String(error?.message || ''))
    );
  }

  function isMissingFunctionError(error) {
    return ['42883', 'PGRST202'].includes(error?.code);
  }

  function normalizeProduct(product, index = 0) {
    return {
      id: String(product.id || `product-${Date.now()}-${index}`),
      name: String(product.name || '').slice(0, 80),
      category: String(product.category || ''),
      description: String(product.description || '').slice(0, 240),
      price:
        product.price === null || product.price === undefined
          ? ''
          : String(product.price),
      image: String(product.image || ''),
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

  function loadLocalProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem(PRODUCTS_KEY));
      return Array.isArray(stored)
        ? stored.map(normalizeProduct)
        : menuData.products.map(normalizeProduct);
    } catch {
      return menuData.products.map(normalizeProduct);
    }
  }

  function saveLocalProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  function toDatabaseProduct(product, index = 0, includeTranslations = true) {
    const normalized = normalizeProduct(product, index);
    const numericPrice =
      normalized.price.trim() === '' ? null : Number(normalized.price);

    const databaseProduct = {
      id: normalized.id,
      name: normalized.name,
      category: normalized.category,
      description: normalized.description,
      price: Number.isFinite(numericPrice) ? numericPrice : null,
      image: normalized.image,
      sort_order: normalized.sortOrder,
      updated_at: new Date().toISOString(),
    };
    if (includeTranslations) {
      databaseProduct.name_it = normalized.translations.it.name || null;
      databaseProduct.name_en = normalized.translations.en.name || null;
      databaseProduct.description_it = normalized.translations.it.description || null;
      databaseProduct.description_en = normalized.translations.en.description || null;
    }
    return databaseProduct;
  }

  async function listProducts() {
    if (!client) return loadLocalProducts();

    const requestProducts = (includeTranslations) =>
      client
        .from('products')
        .select(`${BASE_COLUMNS}${includeTranslations ? `,${TRANSLATION_COLUMNS}` : ''}`)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
    let { data, error } = await requestProducts(translationColumnsSupported !== false);
    if (error && isMissingTranslationsError(error)) {
      translationColumnsSupported = false;
      ({ data, error } = await requestProducts(false));
    } else if (!error) {
      translationColumnsSupported = true;
    }

    if (error) throw error;
    return (data || []).map(normalizeProduct);
  }

  async function saveProduct(product) {
    const normalized = normalizeProduct(product);
    if (!client) {
      const products = loadLocalProducts();
      const index = products.findIndex((item) => item.id === normalized.id);
      if (index >= 0) products[index] = normalized;
      else products.unshift(normalized);
      saveLocalProducts(products);
      return normalized;
    }

    const saveRemoteProduct = (includeTranslations) =>
      client
        .from('products')
        .upsert(toDatabaseProduct(normalized, 0, includeTranslations), { onConflict: 'id' })
        .select(`${BASE_COLUMNS}${includeTranslations ? `,${TRANSLATION_COLUMNS}` : ''}`)
        .single();
    let { data, error } = await saveRemoteProduct(translationColumnsSupported !== false);
    if (error && isMissingTranslationsError(error)) {
      translationColumnsSupported = false;
      ({ data, error } = await saveRemoteProduct(false));
    }

    if (error) throw error;
    return normalizeProduct(data);
  }

  async function deleteProduct(id) {
    if (!client) {
      saveLocalProducts(loadLocalProducts().filter((product) => product.id !== id));
      return;
    }

    const { error } = await client.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async function replaceProducts(products) {
    const normalized = products.map(normalizeProduct);
    if (!client) {
      saveLocalProducts(normalized);
      return normalized;
    }

    const includeTranslations = translationColumnsSupported !== false;
    const payload = normalized.map((product, index) =>
      toDatabaseProduct(product, index, includeTranslations)
    );
    const { error: rpcError } = await client.rpc('replace_products_transactional', {
      product_payload: payload,
    });
    if (!rpcError) return normalized;
    if (!isMissingFunctionError(rpcError) && !isMissingTranslationsError(rpcError)) {
      throw rpcError;
    }

    // Safe compatibility path: upsert first, then remove obsolete rows. A failed
    // upsert never deletes the existing catalog.
    if (payload.length) {
      let { error: upsertError } = await client
        .from('products')
        .upsert(payload, { onConflict: 'id' });
      if (upsertError && isMissingTranslationsError(upsertError)) {
        translationColumnsSupported = false;
        ({ error: upsertError } = await client
          .from('products')
          .upsert(
            normalized.map((product, index) => toDatabaseProduct(product, index, false)),
            { onConflict: 'id' }
          ));
      }
      if (upsertError) throw upsertError;
    }
    const { data: existing, error: listError } = await client.from('products').select('id');
    if (listError) throw listError;
    const importedIds = new Set(normalized.map((product) => product.id));
    const obsoleteIds = (existing || [])
      .map((product) => String(product.id))
      .filter((id) => !importedIds.has(id));
    if (obsoleteIds.length) {
      const { error: deleteError } = await client.from('products').delete().in('id', obsoleteIds);
      if (deleteError) throw deleteError;
    }
    return normalized;
  }

  async function saveProductOrder(products) {
    const normalized = products
      .map(normalizeProduct)
      .map((product, index) => ({ ...product, sortOrder: index }));
    if (!client) {
      saveLocalProducts(normalized);
      return normalized;
    }

    const orderPayload = normalized.map((product) => ({
      id: product.id,
      sort_order: product.sortOrder,
    }));
    const { error: rpcError } = await client.rpc('update_product_order', {
      order_payload: orderPayload,
    });
    if (!rpcError) return normalized;
    if (!isMissingFunctionError(rpcError)) throw rpcError;

    const { data, error } = await client
      .from('products')
      .upsert(
        normalized.map((product, index) =>
          toDatabaseProduct(product, index, translationColumnsSupported !== false)
        ),
        { onConflict: 'id' }
      )
      .select(`${BASE_COLUMNS}${translationColumnsSupported !== false ? `,${TRANSLATION_COLUMNS}` : ''}`);

    if (error) throw error;
    return (data?.length ? data : normalized)
      .map(normalizeProduct)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async function uploadImage(file, originalName = 'product.webp', bucket = config.imageBucket) {
    if (!client) return '';

    if (!(file instanceof Blob) || !file.type.startsWith('image/')) {
      throw new Error('Skedari duhet të jetë një fotografi e vlefshme.');
    }
    if (file.size > 500 * 1024) {
      throw new Error('Fotografia e optimizuar duhet të jetë më e vogël se 500 KB.');
    }

    const extension = String(originalName).split('.').pop()?.toLowerCase() || 'webp';
    const safeExtension = ['png', 'jpg', 'jpeg', 'webp'].includes(extension)
      ? extension
      : 'webp';
    const uniqueId =
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${uniqueId}.${safeExtension}`;
    const targetBucket = bucket || 'product-images';
    const { error } = await client.storage.from(targetBucket).upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type || 'image/webp',
      upsert: false,
    });

    if (error) throw error;
    return client.storage.from(targetBucket).getPublicUrl(path).data.publicUrl;
  }

  async function signIn(password) {
    if (!client) return { error: null };
    return client.auth.signInWithPassword({
      email: config.adminEmail,
      password,
    });
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  function normalizeReviews(row) {
    const source = row || {};
    const testimonials = Array.isArray(source.testimonials)
      ? source.testimonials
      : DEFAULT_REVIEWS.testimonials;
    return {
      ratingValue: String(source.rating_value ?? source.ratingValue ?? DEFAULT_REVIEWS.ratingValue),
      reviewCount: Number(source.review_count ?? source.reviewCount ?? DEFAULT_REVIEWS.reviewCount),
      lastVerified: String(source.last_verified ?? source.lastVerified ?? DEFAULT_REVIEWS.lastVerified),
      testimonials: testimonials.map((item) => ({
        author: String(item.author || '').slice(0, 80),
        rating: Number(item.rating) || 5,
        quote: String(item.quote || '').slice(0, 240),
      })),
    };
  }

  function loadLocalReviews() {
    try {
      const stored = JSON.parse(localStorage.getItem(REVIEWS_KEY));
      return stored ? normalizeReviews(stored) : normalizeReviews(DEFAULT_REVIEWS);
    } catch {
      return normalizeReviews(DEFAULT_REVIEWS);
    }
  }

  function saveLocalReviews(summary) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(summary));
  }

  async function getReviewSummary() {
    if (!client) return loadLocalReviews();
    try {
      const { data, error } = await client
        .from('site_reviews')
        .select('rating_value,review_count,last_verified,testimonials')
        .eq('id', 'main')
        .single();
      if (error) throw error;
      return normalizeReviews(data);
    } catch {
      return loadLocalReviews();
    }
  }

  async function saveReviewSummary(summary) {
    const normalized = normalizeReviews(summary);
    if (!client) {
      saveLocalReviews(normalized);
      return normalized;
    }

    const { error } = await client.from('site_reviews').upsert(
      {
        id: 'main',
        rating_value: Number(normalized.ratingValue),
        review_count: normalized.reviewCount,
        last_verified: normalized.lastVerified,
        testimonials: normalized.testimonials,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
    return normalized;
  }

  function normalizeStory(row) {
    const source = row || {};
    return {
      titleSq: String(source.title_sq ?? source.titleSq ?? '').slice(0, 120),
      bodySq: String(source.body_sq ?? source.bodySq ?? '').slice(0, 2000),
      titleIt: String(source.title_it ?? source.titleIt ?? '').slice(0, 120),
      bodyIt: String(source.body_it ?? source.bodyIt ?? '').slice(0, 2000),
      titleEn: String(source.title_en ?? source.titleEn ?? '').slice(0, 120),
      bodyEn: String(source.body_en ?? source.bodyEn ?? '').slice(0, 2000),
    };
  }

  function loadLocalStory() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORY_KEY));
      return stored ? normalizeStory(stored) : normalizeStory(DEFAULT_STORY);
    } catch {
      return normalizeStory(DEFAULT_STORY);
    }
  }

  function saveLocalStory(story) {
    localStorage.setItem(STORY_KEY, JSON.stringify(story));
  }

  async function getStory() {
    if (!client) return loadLocalStory();
    try {
      const { data, error } = await client
        .from('site_story')
        .select('title_sq,body_sq,title_it,body_it,title_en,body_en')
        .eq('id', 'main')
        .single();
      if (error) throw error;
      return normalizeStory(data);
    } catch {
      return loadLocalStory();
    }
  }

  async function saveStory(story) {
    const normalized = normalizeStory(story);
    if (!client) {
      saveLocalStory(normalized);
      return normalized;
    }

    const { error } = await client.from('site_story').upsert(
      {
        id: 'main',
        title_sq: normalized.titleSq,
        body_sq: normalized.bodySq,
        title_it: normalized.titleIt,
        body_it: normalized.bodyIt,
        title_en: normalized.titleEn,
        body_en: normalized.bodyEn,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
    return normalized;
  }

  const SETTINGS_KEY = 'barMartiri.admin.settings.v1';
  // sunbedPrice is null until one is published from /admin. Null is the normal
  // resting state, not an error: the site simply shows no price.
  const DEFAULT_SETTINGS = Object.freeze({ sunbedPrice: null, sunbedCurrency: 'ALL' });

  function normalizeSettings(row) {
    const raw = row?.sunbed_price ?? row?.sunbedPrice;
    const price = raw === null || raw === undefined || raw === '' ? null : Number.parseInt(raw, 10);
    const currency = String(row?.sunbed_currency ?? row?.sunbedCurrency ?? '').trim();
    return {
      sunbedPrice: Number.isFinite(price) && price > 0 ? price : null,
      sunbedCurrency: currency || DEFAULT_SETTINGS.sunbedCurrency,
    };
  }

  function loadLocalSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async function getSettings() {
    if (!client) return loadLocalSettings();
    try {
      const { data, error } = await client
        .from('site_settings')
        .select('sunbed_price,sunbed_currency')
        .eq('id', 'main')
        .single();
      if (error) throw error;
      return normalizeSettings(data);
    } catch {
      return loadLocalSettings();
    }
  }

  async function saveSettings(settings) {
    const normalized = normalizeSettings(settings);
    if (!client) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
      return normalized;
    }
    const { error } = await client.from('site_settings').upsert(
      {
        id: 'main',
        sunbed_price: normalized.sunbedPrice,
        sunbed_currency: normalized.sunbedCurrency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
    return normalized;
  }

  function normalizeOrder(row) {
    return {
      id: String(row.id),
      status: String(row.status || 'pending'),
      customerName: String(row.customer_name || ''),
      customerPhone: String(row.customer_phone || ''),
      note: String(row.note || ''),
      umbrellaSection: row.umbrella_section ? String(row.umbrella_section) : '',
      umbrellaRow: row.umbrella_row ?? null,
      umbrellaNumber: row.umbrella_number ?? null,
      items: Array.isArray(row.items) ? row.items : [],
      total: Number(row.total) || 0,
      createdAt: String(row.created_at || ''),
      confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    };
  }

  async function listOrders() {
    if (!client) return [];
    const { data, error } = await client
      .from('orders')
      .select('id,status,customer_name,customer_phone,note,umbrella_section,umbrella_row,umbrella_number,items,total,created_at,confirmed_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeOrder);
  }

  async function updateOrderStatus(id, status) {
    if (!client) throw new Error('Admin panel unavailable without Supabase.');
    const payload = { status };
    if (status === 'confirmed') payload.confirmed_at = new Date().toISOString();
    const { data, error } = await client
      .from('orders')
      .update(payload)
      .eq('id', id)
      .select('id,status,customer_name,customer_phone,note,umbrella_section,umbrella_row,umbrella_number,items,total,created_at,confirmed_at')
      .single();
    if (error) throw error;
    return normalizeOrder(data);
  }

  function normalizeBotSettings(row) {
    const source = row || {};
    return {
      botName: String(source.bot_name || ''),
      botToken: String(source.bot_token || ''),
      chatId: String(source.chat_id || ''),
    };
  }

  async function getBotSettings() {
    if (!client) return normalizeBotSettings(null);
    const { data, error } = await client
      .from('bot_settings')
      .select('bot_name,bot_token,chat_id')
      .eq('id', 'main')
      .single();
    if (error) throw error;
    return normalizeBotSettings(data);
  }

  async function saveBotSettings(settings) {
    if (!client) throw new Error('Admin panel unavailable without Supabase.');
    const { error } = await client.from('bot_settings').upsert(
      {
        id: 'main',
        bot_name: settings.botName || null,
        bot_token: settings.botToken || null,
        chat_id: settings.chatId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
    return normalizeBotSettings({
      bot_name: settings.botName,
      bot_token: settings.botToken,
      chat_id: settings.chatId,
    });
  }

  function normalizeGalleryImage(row) {
    return {
      id: String(row.id),
      imageUrl: String(row.image_url || ''),
      sortOrder: Number(row.sort_order) || 0,
    };
  }

  async function listGalleryImages() {
    if (!client) return [];
    const { data, error } = await client
      .from('gallery_images')
      .select('id,image_url,sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeGalleryImage);
  }

  async function saveGalleryImage(image) {
    if (!client) throw new Error('Admin panel unavailable without Supabase.');
    const payload = {
      image_url: image.imageUrl,
      sort_order: Number(image.sortOrder) || 0,
    };
    if (image.id) payload.id = image.id;
    const { data, error } = await client
      .from('gallery_images')
      .upsert(payload, { onConflict: 'id' })
      .select('id,image_url,sort_order')
      .single();
    if (error) throw error;
    return normalizeGalleryImage(data);
  }

  async function deleteGalleryImage(id) {
    if (!client) throw new Error('Admin panel unavailable without Supabase.');
    const { error } = await client.from('gallery_images').delete().eq('id', id);
    if (error) throw error;
  }

  function normalizeConversation(row) {
    return {
      id: String(row.id),
      customerName: String(row.customer_name || ''),
      createdAt: String(row.created_at || ''),
      lastMessageAt: String(row.last_message_at || ''),
      lastMessagePreview: String(row.last_message_preview || ''),
      unreadByAdmin: Boolean(row.unread_by_admin),
    };
  }

  function normalizeChatMessage(row) {
    return {
      id: String(row.id),
      conversationId: String(row.conversation_id),
      sender: String(row.sender || 'customer'),
      body: String(row.body || ''),
      createdAt: String(row.created_at || ''),
    };
  }

  async function listChatConversations() {
    if (!client) return [];
    const { data, error } = await client
      .from('chat_conversations')
      .select('id,customer_name,created_at,last_message_at,last_message_preview,unread_by_admin')
      .order('last_message_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeConversation);
  }

  async function listChatMessages(conversationId) {
    if (!client) return [];
    const { data, error } = await client
      .from('chat_messages')
      .select('id,conversation_id,sender,body,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeChatMessage);
  }

  async function sendAdminChatMessage(conversationId, body) {
    if (!client) throw new Error('Admin panel unavailable without Supabase.');
    const { data, error } = await client
      .from('chat_messages')
      .insert({ conversation_id: conversationId, sender: 'admin', body })
      .select('id,conversation_id,sender,body,created_at')
      .single();
    if (error) throw error;
    return normalizeChatMessage(data);
  }

  async function markConversationReadByAdmin(conversationId) {
    if (!client) return;
    const { error } = await client
      .from('chat_conversations')
      .update({ unread_by_admin: false })
      .eq('id', conversationId);
    if (error) throw error;
  }

  async function saveAdminPushSubscription(subscription) {
    if (!client) throw new Error('Admin panel unavailable without Supabase.');
    const { error } = await client.from('admin_push_subscriptions').upsert(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      { onConflict: 'endpoint' }
    );
    if (error) throw error;
  }

  window.BAR_MARTIRI_STORE = Object.freeze({
    isRemote: () => Boolean(client),
    hasTranslationColumns: () => translationColumnsSupported,
    listProducts,
    saveProduct,
    deleteProduct,
    replaceProducts,
    saveProductOrder,
    uploadImage,
    signIn,
    getSession,
    signOut,
    getReviewSummary,
    saveReviewSummary,
    listOrders,
    updateOrderStatus,
    getBotSettings,
    saveBotSettings,
    listGalleryImages,
    saveGalleryImage,
    deleteGalleryImage,
    getStory,
    saveStory,
    getSettings,
    saveSettings,
    listChatConversations,
    listChatMessages,
    sendAdminChatMessage,
    markConversationReadByAdmin,
    saveAdminPushSubscription,
  });
})();
