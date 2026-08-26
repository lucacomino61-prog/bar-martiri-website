(function startAdmin() {
  'use strict';

  const menuData = window.BAR_MARTIRI_MENU || { categories: [], products: [] };
  const store = window.BAR_MARTIRI_STORE;
  const supabaseConfig = window.BAR_MARTIRI_SUPABASE || {};

  // Translates a batch of Albanian strings to Italian and English via the
  // translate-text Edge Function (DeepL). Returns { it: string[], en: string[] },
  // matching the order of the input texts. Throws if translation fails, so
  // callers can decide whether to block the save or fall back to Albanian text.
  async function translateToItEn(texts) {
    const session = await store.getSession();
    if (!session?.access_token) throw new Error('Duhet të jesh i kyçur për të përkthyer.');
    const response = await fetch(`${supabaseConfig.url}/functions/v1/translate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseConfig.publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ texts, targetLangs: ['IT', 'EN'] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Përkthimi dështoi.');
    return { it: data.translations.IT, en: data.translations.EN };
  }

  const authShell = document.querySelector('[data-auth-shell]');
  const loginView = document.querySelector('[data-login-view]');
  const adminApp = document.querySelector('[data-admin-app]');
  const loginForm = document.querySelector('[data-login-form]');
  const productForm = document.querySelector('[data-product-form]');
  const productList = document.querySelector('[data-admin-product-list]');
  const productCount = document.querySelector('[data-product-count]');
  const categorySelect = document.querySelector('[data-category-select]');
  const editorTitle = document.querySelector('[data-editor-title]');
  const deleteButton = document.querySelector('[data-delete-product]');
  const imageInput = document.querySelector('[data-image-input]');
  const dropZone = document.querySelector('[data-drop-zone]');
  const imagePreview = document.querySelector('[data-image-preview]');
  const dropCopy = document.querySelector('[data-drop-copy]');
  const productError = document.querySelector('[data-product-error]');
  const storageStatus = document.querySelector('[data-storage-status]');
  const storageNotice = document.querySelector('[data-storage-notice]');
  const sortMode = document.querySelector('[data-sort-mode]');
  const applySortButton = document.querySelector('[data-apply-sort]');
  const sortStatus = document.querySelector('[data-sort-status]');
  const reviewsForm = document.querySelector('[data-reviews-form]');
  const testimonialsList = document.querySelector('[data-testimonials-list]');
  const addTestimonialButton = document.querySelector('[data-add-testimonial]');
  const reviewsError = document.querySelector('[data-reviews-error]');
  const reviewsStatus = document.querySelector('[data-reviews-status]');
  const ordersList = document.querySelector('[data-orders-list]');
  const ordersEmpty = document.querySelector('[data-orders-empty]');
  const refreshOrdersButton = document.querySelector('[data-refresh-orders]');
  const pendingOrdersBadge = document.querySelector('[data-pending-orders-badge]');
  const analyticsStats = document.querySelector('[data-analytics-stats]');
  const topItemsList = document.querySelector('[data-top-items]');
  const hourBars = document.querySelector('[data-hour-bars]');
  const analyticsEmpty = document.querySelector('[data-analytics-empty]');
  const refreshAnalyticsButton = document.querySelector('[data-refresh-analytics]');
  const adminGalleryGrid = document.querySelector('[data-admin-gallery-grid]');
  const galleryCount = document.querySelector('[data-gallery-count]');
  const galleryEmpty = document.querySelector('[data-gallery-empty]');
  const galleryDropZone = document.querySelector('[data-gallery-drop-zone]');
  const galleryImageInput = document.querySelector('[data-gallery-image-input]');
  const galleryError = document.querySelector('[data-gallery-error]');
  const galleryStatus = document.querySelector('[data-gallery-status]');
  const botSettingsForm = document.querySelector('[data-bot-settings-form]');
  const botSettingsError = document.querySelector('[data-bot-settings-error]');
  const botSettingsStatus = document.querySelector('[data-bot-settings-status]');
  const storyForm = document.querySelector('[data-story-form]');
  const storyError = document.querySelector('[data-story-error]');
  const storyStatus = document.querySelector('[data-story-status]');
  const settingsForm = document.querySelector('[data-settings-form]');
  const settingsError = document.querySelector('[data-settings-error]');
  const settingsStatus = document.querySelector('[data-settings-status]');
  const chatConversationsList = document.querySelector('[data-chat-conversations-list]');
  const chatConversationsEmpty = document.querySelector('[data-chat-conversations-empty]');
  const refreshChatsButton = document.querySelector('[data-refresh-chats]');
  const unreadChatsBadge = document.querySelector('[data-unread-chats-badge]');
  const chatThreadMessages = document.querySelector('[data-chat-thread-messages]');
  const chatThreadEmpty = document.querySelector('[data-chat-thread-empty]');
  const chatReplyForm = document.querySelector('[data-chat-reply-form]');
  const chatReplyError = document.querySelector('[data-chat-reply-error]');
  const enableChatPushButton = document.querySelector('[data-enable-chat-push]');
  const chatView = document.querySelector('[data-chat-view]');
  const chatThreadBack = document.querySelector('[data-chat-thread-back]');
  const chatThreadAvatar = document.querySelector('[data-chat-thread-avatar]');
  const chatThreadName = document.querySelector('[data-chat-thread-name]');
  let products = [...menuData.products];
  let currentImage = '';
  let pendingImage = null;
  let testimonials = [];
  let orders = [];
  let ordersPollTimer = 0;
  let galleryImages = [];
  let chatConversations = [];
  let activeConversationId = null;
  let chatsPollTimer = 0;
  let chatThreadPollTimer = 0;

  const workspaceEyebrow = document.querySelector('[data-workspace-eyebrow]');
  const workspaceTitle = document.querySelector('[data-workspace-title]');
  const newProductButton = document.querySelector('[data-new-product]');
  const WORKSPACE_HEADINGS = {
    products: { eyebrow: 'Katalogu', title: 'Produktet' },
    reviews: { eyebrow: 'Reputacioni', title: 'Vlerësimet' },
    orders: { eyebrow: 'Shitjet', title: 'Porositë' },
    chats: { eyebrow: 'Klientët', title: 'Bisedat' },
    analytics: { eyebrow: 'Statistikat', title: 'Analitika' },
    gallery: { eyebrow: 'Faqja', title: 'Galeria' },
    story: { eyebrow: 'Faqja', title: 'Historia' },
    settings: { eyebrow: 'Faqja', title: 'Çmimet' },
  };

  document.querySelectorAll('[data-admin-view-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.adminViewTab;
      document.querySelectorAll('[data-admin-view-tab]').forEach((button) => {
        button.classList.toggle('is-active', button === tab);
      });
      document.querySelectorAll('[data-admin-view-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.adminViewPanel !== view;
      });
      const heading = WORKSPACE_HEADINGS[view];
      if (heading) {
        if (workspaceEyebrow) workspaceEyebrow.textContent = heading.eyebrow;
        if (workspaceTitle) workspaceTitle.textContent = heading.title;
      }
      if (newProductButton) newProductButton.hidden = view !== 'products';
      if (view === 'orders') {
        void loadOrdersPanel();
        startOrdersPolling();
      } else {
        stopOrdersPolling();
      }
      if (view === 'chats') {
        void loadChatsPanel();
        startChatsPolling();
      } else {
        stopChatsPolling();
        stopChatThreadPolling();
      }
      if (view === 'analytics') void loadAnalyticsPanel();
      if (view === 'gallery') void loadGalleryPanel();
      if (view === 'story') void loadStoryPanel();
      if (view === 'settings') void loadSettingsPanel();
    });
  });

  function createTestimonialRow(testimonial = { author: '', rating: 5, quote: '' }) {
    const row = document.createElement('div');
    row.className = 'testimonial-row';
    row.dataset.testimonialRow = '';

    const formRow = document.createElement('div');
    formRow.className = 'form-row';

    const authorLabel = document.createElement('label');
    authorLabel.textContent = 'Autori';
    const authorInput = document.createElement('input');
    authorInput.type = 'text';
    authorInput.maxLength = 80;
    authorInput.dataset.field = 'author';
    authorInput.value = testimonial.author || '';
    authorInput.required = true;
    authorLabel.append(authorInput);

    const ratingLabel = document.createElement('label');
    ratingLabel.textContent = 'Vlerësimi (nga 5)';
    const ratingInput = document.createElement('input');
    ratingInput.type = 'number';
    ratingInput.min = '1';
    ratingInput.max = '5';
    ratingInput.step = '0.1';
    ratingInput.dataset.field = 'rating';
    ratingInput.value = testimonial.rating ?? 5;
    ratingInput.required = true;
    ratingLabel.append(ratingInput);

    formRow.append(authorLabel, ratingLabel);

    const quoteLabel = document.createElement('label');
    quoteLabel.textContent = 'Citimi';
    const quoteInput = document.createElement('textarea');
    quoteInput.rows = 2;
    quoteInput.maxLength = 240;
    quoteInput.dataset.field = 'quote';
    quoteInput.value = testimonial.quote || '';
    quoteInput.required = true;
    quoteLabel.append(quoteInput);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'icon-button';
    removeButton.dataset.removeTestimonial = '';
    removeButton.setAttribute('aria-label', 'Hiq përshtypjen');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => row.remove());

    row.append(formRow, quoteLabel, removeButton);
    return row;
  }

  function renderTestimonials(items) {
    if (!testimonialsList) return;
    testimonialsList.replaceChildren();
    (items.length ? items : [{ author: '', rating: 5, quote: '' }]).forEach((item) => {
      testimonialsList.append(createTestimonialRow(item));
    });
  }

  function collectTestimonials() {
    return [...(testimonialsList?.querySelectorAll('[data-testimonial-row]') || [])]
      .map((row) => ({
        author: row.querySelector('[data-field="author"]')?.value.trim() || '',
        rating: Number(row.querySelector('[data-field="rating"]')?.value) || 5,
        quote: row.querySelector('[data-field="quote"]')?.value.trim() || '',
      }))
      .filter((item) => item.author && item.quote);
  }

  addTestimonialButton?.addEventListener('click', () => {
    testimonialsList?.append(createTestimonialRow({ author: '', rating: 5, quote: '' }));
  });

  async function loadReviewsPanel() {
    if (!store?.getReviewSummary) return;
    try {
      const summary = await store.getReviewSummary();
      testimonials = summary.testimonials;
      if (reviewsForm) {
        reviewsForm.elements.ratingValue.value = summary.ratingValue;
        reviewsForm.elements.reviewCount.value = summary.reviewCount;
        reviewsForm.elements.lastVerified.value = summary.lastVerified;
      }
      renderTestimonials(testimonials);
    } catch {
      setError(reviewsError, 'Vlerësimet nuk mund të ngarkohen.');
    }
  }

  reviewsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(reviewsError, '');
    if (reviewsStatus) reviewsStatus.textContent = '';

    const collected = collectTestimonials();
    if (!collected.length) {
      setError(reviewsError, 'Shto të paktën një përshtypje.');
      return;
    }

    const summary = {
      ratingValue: reviewsForm.elements.ratingValue.value,
      reviewCount: Number(reviewsForm.elements.reviewCount.value) || 0,
      lastVerified: reviewsForm.elements.lastVerified.value,
      testimonials: collected,
    };

    const submitButton = reviewsForm.querySelector('button[type="submit"]');
    try {
      if (submitButton) submitButton.disabled = true;
      await store.saveReviewSummary(summary);
      testimonials = collected;
      if (reviewsStatus) reviewsStatus.textContent = 'Vlerësimet u ruajtën.';
      window.BAR_MARTIRI_INDEXNOW?.submit();
    } catch (error) {
      setError(reviewsError, error.message || 'Vlerësimet nuk mund të ruhen.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  let lastLoadedStory = null;

  async function loadStoryPanel() {
    if (!store?.getStory || !storyForm) return;
    try {
      const story = await store.getStory();
      lastLoadedStory = story;
      storyForm.elements.titleSq.value = story.titleSq;
      storyForm.elements.bodySq.value = story.bodySq;
    } catch {
      setError(storyError, 'Historia nuk mund të ngarkohet.');
    }
  }

  async function loadSettingsPanel() {
    if (!store?.getSettings || !settingsForm) return;
    try {
      const settings = await store.getSettings();
      settingsForm.elements.sunbedPrice.value = settings.sunbedPrice ?? '';
      settingsForm.elements.sunbedCurrency.value = settings.sunbedCurrency;
    } catch {
      setError(settingsError, 'Çmimi nuk mund të ngarkohet.');
    }
  }

  settingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(settingsError, '');
    if (settingsStatus) settingsStatus.textContent = '';

    const rawPrice = settingsForm.elements.sunbedPrice.value.trim();
    const sunbedPrice = rawPrice === '' ? null : Number.parseInt(rawPrice, 10);
    const sunbedCurrency = settingsForm.elements.sunbedCurrency.value.trim();

    // Empty is a valid choice: it hides the price line on the site.
    if (rawPrice !== '' && (!Number.isFinite(sunbedPrice) || sunbedPrice <= 0)) {
      setError(settingsError, 'Shkruaj një çmim të vlefshëm ose lëre bosh.');
      return;
    }
    if (!sunbedCurrency) {
      setError(settingsError, 'Shkruaj monedhën.');
      return;
    }

    const submitButton = settingsForm.querySelector('button[type="submit"]');
    try {
      if (submitButton) submitButton.disabled = true;
      await store.saveSettings({ sunbedPrice, sunbedCurrency });
      if (settingsStatus)
        settingsStatus.textContent = sunbedPrice ? 'Çmimi u ruajt.' : 'Çmimi u hoq nga faqja.';
      window.BAR_MARTIRI_INDEXNOW?.submit();
    } catch (error) {
      setError(settingsError, error.message || 'Çmimi nuk mund të ruhet.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  storyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(storyError, '');
    if (storyStatus) storyStatus.textContent = '';

    const titleSq = storyForm.elements.titleSq.value.trim();
    const bodySq = storyForm.elements.bodySq.value.trim();

    const submitButton = storyForm.querySelector('button[type="submit"]');
    try {
      if (submitButton) submitButton.disabled = true;
      // Keep any previously-translated it/en text unless a fresh translation succeeds,
      // so editing Albanian without a working translator doesn't wipe them out.
      let titleIt = lastLoadedStory?.titleIt || '';
      let bodyIt = lastLoadedStory?.bodyIt || '';
      let titleEn = lastLoadedStory?.titleEn || '';
      let bodyEn = lastLoadedStory?.bodyEn || '';
      let translationFailed = false;
      try {
        const translated = await translateToItEn([titleSq, bodySq]);
        [titleIt, bodyIt] = translated.it;
        [titleEn, bodyEn] = translated.en;
      } catch {
        // Save the Albanian text anyway rather than blocking the admin, but do
        // not stay quiet about it: swallowing this silently is why the story sat
        // untranslated -- the save said "u ruajt" while it/en stayed empty and
        // the About section never appeared on /it/ or /en/.
        translationFailed = true;
      }
      lastLoadedStory = await store.saveStory({ titleSq, bodySq, titleIt, bodyIt, titleEn, bodyEn });
      if (storyStatus) {
        storyStatus.textContent = translationFailed
          ? 'Historia u ruajt vetëm në shqip — përkthimi nuk u krye, ndaj nuk shfaqet te /it/ dhe /en/.'
          : 'Historia u ruajt.';
      }
      window.BAR_MARTIRI_INDEXNOW?.submit();
    } catch (error) {
      setError(storyError, error.message || 'Historia nuk mund të ruhet.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  const ORDER_STATUS_LABEL = { pending: 'Në pritje', confirmed: 'Konfirmuar', cancelled: 'Anuluar' };

  function formatOrderTime(value) {
    try {
      return new Date(value).toLocaleString('sq-AL', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value || '';
    }
  }

  function createOrderCard(order) {
    const card = document.createElement('article');
    card.className = 'order-card';

    const header = document.createElement('div');
    header.className = 'order-card-header';
    const title = document.createElement('h4');
    title.textContent = `#${order.id.slice(0, 8)}`;
    const time = document.createElement('time');
    time.textContent = formatOrderTime(order.createdAt);
    const badge = document.createElement('span');
    badge.className = `order-status-badge is-${order.status}`;
    badge.textContent = ORDER_STATUS_LABEL[order.status] || order.status;
    header.append(title, time, badge);

    const contact = document.createElement('p');
    contact.className = 'order-card-contact';
    contact.textContent = [order.customerName, order.customerPhone].filter(Boolean).join(' · ') || '—';

    const location = document.createElement('p');
    location.className = 'order-card-location';
    location.textContent = order.umbrellaSection
      ? `📍 Sektori ${order.umbrellaSection} · Rreshti ${order.umbrellaRow} · Çadra ${order.umbrellaNumber}`
      : '';

    const items = document.createElement('ul');
    items.className = 'order-card-items';
    order.items.forEach((item) => {
      const row = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = `${item.name} ×${item.qty}`;
      const price = document.createElement('span');
      price.textContent = `${Number(item.price) * Number(item.qty)} ALL`;
      row.append(name, price);
      items.append(row);
    });

    const total = document.createElement('div');
    total.className = 'order-card-total';
    const totalLabel = document.createElement('span');
    totalLabel.textContent = 'Totali';
    const totalValue = document.createElement('span');
    totalValue.textContent = `${order.total} ALL`;
    total.append(totalLabel, totalValue);

    card.append(header, contact);
    if (order.umbrellaSection) card.append(location);
    if (order.note) {
      const note = document.createElement('p');
      note.className = 'order-card-note';
      note.textContent = order.note;
      card.append(note);
    }
    card.append(items, total);

    if (order.status === 'pending') {
      const actions = document.createElement('div');
      actions.className = 'order-card-actions';
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'primary-button';
      confirmButton.textContent = 'Konfirmo';
      confirmButton.addEventListener('click', () => void changeOrderStatus(order.id, 'confirmed', confirmButton));
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'danger-button';
      cancelButton.textContent = 'Anulo';
      cancelButton.addEventListener('click', () => void changeOrderStatus(order.id, 'cancelled', cancelButton));
      actions.append(confirmButton, cancelButton);
      card.append(actions);
    }

    return card;
  }

  function renderOrders() {
    if (!ordersList) return;
    ordersList.replaceChildren();
    orders.forEach((order) => ordersList.append(createOrderCard(order)));
    if (ordersEmpty) ordersEmpty.hidden = orders.length > 0;

    const pendingCount = orders.filter((order) => order.status === 'pending').length;
    if (pendingOrdersBadge) {
      pendingOrdersBadge.textContent = String(pendingCount);
      pendingOrdersBadge.hidden = pendingCount === 0;
    }
  }

  async function loadOrdersPanel() {
    if (!store?.listOrders) return;
    try {
      orders = await store.listOrders();
      renderOrders();
    } catch {
      // Keep showing the last known order list if a refresh fails.
    }
  }

  async function changeOrderStatus(id, status, button) {
    if (!store?.updateOrderStatus) return;
    if (button) button.disabled = true;
    try {
      const updated = await store.updateOrderStatus(id, status);
      const index = orders.findIndex((order) => order.id === updated.id);
      if (index >= 0) orders[index] = updated;
      renderOrders();
    } catch {
      if (button) button.disabled = false;
    }
  }

  function stopOrdersPolling() {
    window.clearInterval(ordersPollTimer);
    ordersPollTimer = 0;
  }

  function startOrdersPolling() {
    stopOrdersPolling();
    ordersPollTimer = window.setInterval(() => void loadOrdersPanel(), 10000);
  }

  function timeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'tani';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} orë`;
    return `${Math.round(hours / 24)} ditë`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
    ));
  }

  function initialOf(name) {
    return (name || 'K').trim().charAt(0).toUpperCase() || 'K';
  }

  function renderChatConversations() {
    if (!chatConversationsList) return;
    chatConversationsList.replaceChildren();
    chatConversations.forEach((conversation) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'chat-conversation-item';
      item.classList.toggle('is-active', conversation.id === activeConversationId);
      item.classList.toggle('is-unread', conversation.unreadByAdmin);
      const name = conversation.customerName || 'Klient';
      item.innerHTML = `
        <span class="chat-conversation-avatar" aria-hidden="true">${escapeHtml(initialOf(name))}</span>
        <span class="chat-conversation-body">
          <span class="chat-conversation-top">
            <span class="chat-conversation-name">${escapeHtml(name)}</span>
            <span class="chat-conversation-time">${timeAgo(conversation.lastMessageAt)}</span>
          </span>
          <span class="chat-conversation-preview">${escapeHtml(conversation.lastMessagePreview || '')}</span>
        </span>
      `;
      item.addEventListener('click', () => void openConversation(conversation.id));
      chatConversationsList.append(item);
    });
    if (chatConversationsEmpty) chatConversationsEmpty.hidden = chatConversations.length > 0;

    const unreadCount = chatConversations.filter((conversation) => conversation.unreadByAdmin).length;
    if (unreadChatsBadge) {
      unreadChatsBadge.textContent = String(unreadCount);
      unreadChatsBadge.hidden = unreadCount === 0;
    }
  }

  async function loadChatsPanel() {
    if (!store?.listChatConversations) return;
    try {
      chatConversations = await store.listChatConversations();
      renderChatConversations();
    } catch {
      // Keep showing the last known conversation list if a refresh fails.
    }
  }

  function renderChatThread(messages) {
    if (!chatThreadMessages) return;
    chatThreadMessages.replaceChildren();
    messages.forEach((message) => {
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble chat-bubble--${message.sender}`;
      bubble.textContent = message.body;
      chatThreadMessages.append(bubble);
    });
    chatThreadMessages.scrollTop = chatThreadMessages.scrollHeight;
  }

  async function loadChatThread(conversationId) {
    if (!store?.listChatMessages) return;
    try {
      const messages = await store.listChatMessages(conversationId);
      if (conversationId === activeConversationId) renderChatThread(messages);
    } catch {
      // Keep showing the last known thread if a refresh fails.
    }
  }

  async function openConversation(conversationId) {
    activeConversationId = conversationId;
    renderChatConversations();
    const conversation = chatConversations.find((item) => item.id === conversationId);
    const name = conversation?.customerName || 'Klient';
    if (chatThreadAvatar) chatThreadAvatar.textContent = initialOf(name);
    if (chatThreadName) chatThreadName.textContent = name;
    chatView?.classList.add('is-thread-open');
    if (chatThreadEmpty) chatThreadEmpty.hidden = true;
    if (chatReplyForm) chatReplyForm.hidden = false;
    await loadChatThread(conversationId);
    stopChatThreadPolling();
    chatThreadPollTimer = window.setInterval(() => void loadChatThread(conversationId), 4000);
    try {
      await store.markConversationReadByAdmin(conversationId);
      const conversation = chatConversations.find((item) => item.id === conversationId);
      if (conversation) conversation.unreadByAdmin = false;
      renderChatConversations();
    } catch {
      // Not critical if the read receipt fails to save.
    }
  }

  chatReplyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeConversationId) return;
    if (chatReplyError) chatReplyError.textContent = '';
    const textarea = chatReplyForm.querySelector('textarea[name="body"]');
    const body = textarea?.value.trim();
    if (!body) return;
    const submitButton = chatReplyForm.querySelector('button[type="submit"]');
    try {
      if (submitButton) submitButton.disabled = true;
      await store.sendAdminChatMessage(activeConversationId, body);
      textarea.value = '';
      await loadChatThread(activeConversationId);
    } catch (error) {
      if (chatReplyError) chatReplyError.textContent = error.message || 'Mesazhi nuk u dërgua.';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  chatReplyForm?.querySelector('textarea[name="body"]')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      chatReplyForm.requestSubmit();
    }
  });

  refreshChatsButton?.addEventListener('click', () => void loadChatsPanel());

  chatThreadBack?.addEventListener('click', () => {
    chatView?.classList.remove('is-thread-open');
    activeConversationId = null;
    stopChatThreadPolling();
    renderChatConversations();
  });

  function stopChatsPolling() {
    window.clearInterval(chatsPollTimer);
    chatsPollTimer = 0;
  }

  function startChatsPolling() {
    stopChatsPolling();
    chatsPollTimer = window.setInterval(() => void loadChatsPanel(), 10000);
  }

  function stopChatThreadPolling() {
    window.clearInterval(chatThreadPollTimer);
    chatThreadPollTimer = 0;
  }

  const CHAT_VAPID_PUBLIC_KEY =
    'BBNd3SdADUSjP5Y4gCBjiMJi7gfO0xulbR24YX5RBM_9bMvOYTubWDw2kddV2sny7wQE6zO2nAO8kEKcJOJ9jUQ';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  const chatPushStatus = document.querySelector('[data-chat-push-status]');

  function setChatPushStatus(message) {
    if (chatPushStatus) chatPushStatus.textContent = message;
  }

  async function subscribeAdminPush() {
    setChatPushStatus('');
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isIOS && !isStandalone) {
      setChatPushStatus(
        'Në iPhone, njoftimet kërkojnë që faqja të shtohet te "Home Screen": hap /admin në Safari → Share → Add to Home Screen, pastaj hape prej andej dhe provo përsëri.'
      );
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setChatPushStatus('Ky browser nuk i mbështet njoftimet push.');
      return;
    }
    if (!store?.saveAdminPushSubscription) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      let permission = Notification.permission;
      if (permission === 'denied') {
        setChatPushStatus(
          'Njoftimet janë të bllokuara për këtë faqe. Kliko ikonën pranë URL-së (🔒 ose ⓘ) → Site settings → Notifications → Allow, pastaj provo përsëri.'
        );
        return;
      }
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setChatPushStatus('Nuk u dha leje për njoftime.');
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(CHAT_VAPID_PUBLIC_KEY),
        });
      }
      const subscriptionJson = subscription.toJSON();
      await store.saveAdminPushSubscription({
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
      });
      if (enableChatPushButton) enableChatPushButton.textContent = 'Njoftimet janë aktive';
      setChatPushStatus('Njoftimet u aktivizuan me sukses.');
    } catch (error) {
      setChatPushStatus(error.message || 'Aktivizimi i njoftimeve dështoi. Provo përsëri.');
    }
  }

  enableChatPushButton?.addEventListener('click', () => void subscribeAdminPush());

  refreshOrdersButton?.addEventListener('click', () => void loadOrdersPanel());

  function formatCurrency(amount) {
    return `${Math.round(amount)} ALL`;
  }

  function renderAnalytics(ordersData) {
    if (!analyticsStats) return;
    const confirmedOrders = ordersData.filter((order) => order.status === 'confirmed');
    const pendingCount = ordersData.filter((order) => order.status === 'pending').length;
    const confirmedRevenue = confirmedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const avgOrderValue = confirmedOrders.length ? confirmedRevenue / confirmedOrders.length : 0;

    const stats = [
      { label: 'Porosi gjithsej', value: String(ordersData.length) },
      { label: 'Të ardhura (konfirmuar)', value: formatCurrency(confirmedRevenue) },
      { label: 'Në pritje', value: String(pendingCount) },
      { label: 'Vlera mesatare', value: formatCurrency(avgOrderValue) },
    ];

    analyticsStats.replaceChildren();
    stats.forEach((stat) => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      const label = document.createElement('p');
      label.className = 'eyebrow';
      label.textContent = stat.label;
      const value = document.createElement('strong');
      value.textContent = stat.value;
      card.append(label, value);
      analyticsStats.append(card);
    });

    const itemTotals = new Map();
    ordersData.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.name || 'Produkt';
        const qty = Number(item.qty) || 1;
        itemTotals.set(key, (itemTotals.get(key) || 0) + qty);
      });
    });
    const topItems = [...itemTotals.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5);

    if (topItemsList) {
      topItemsList.replaceChildren();
      if (!topItems.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-list';
        empty.textContent = 'Ende s’ka të dhëna.';
        topItemsList.append(empty);
      } else {
        topItems.forEach(([name, qty]) => {
          const row = document.createElement('li');
          row.className = 'top-item-row';
          const nameSpan = document.createElement('span');
          nameSpan.textContent = name;
          const qtySpan = document.createElement('strong');
          qtySpan.textContent = `×${qty}`;
          row.append(nameSpan, qtySpan);
          topItemsList.append(row);
        });
      }
    }

    const hourCounts = new Array(24).fill(0);
    ordersData.forEach((order) => {
      const date = new Date(order.createdAt);
      if (!Number.isNaN(date.getTime())) hourCounts[date.getHours()] += 1;
    });
    const maxHourCount = Math.max(1, ...hourCounts);

    if (hourBars) {
      hourBars.replaceChildren();
      hourCounts.forEach((count, hour) => {
        if (!count) return;
        const row = document.createElement('div');
        row.className = 'hour-bar-row';
        const label = document.createElement('span');
        label.textContent = `${String(hour).padStart(2, '0')}:00`;
        const track = document.createElement('div');
        track.className = 'hour-bar-track';
        const fill = document.createElement('div');
        fill.className = 'hour-bar-fill';
        fill.style.width = `${Math.round((count / maxHourCount) * 100)}%`;
        track.append(fill);
        const countLabel = document.createElement('span');
        countLabel.textContent = String(count);
        row.append(label, track, countLabel);
        hourBars.append(row);
      });
      if (!hourCounts.some(Boolean)) {
        const empty = document.createElement('p');
        empty.className = 'empty-list';
        empty.textContent = 'Ende s’ka të dhëna.';
        hourBars.append(empty);
      }
    }

    if (analyticsEmpty) analyticsEmpty.hidden = ordersData.length > 0;
  }

  async function loadAnalyticsPanel() {
    if (!store?.listOrders) return;
    try {
      const allOrders = await store.listOrders();
      renderAnalytics(allOrders);
    } catch {
      // Keep showing the last known analytics if a refresh fails.
    }
  }

  refreshAnalyticsButton?.addEventListener('click', () => void loadAnalyticsPanel());

  async function loadBotSettingsPanel() {
    if (!store?.getBotSettings || !botSettingsForm) return;
    try {
      const settings = await store.getBotSettings();
      botSettingsForm.elements.botName.value = settings.botName;
      botSettingsForm.elements.botToken.value = settings.botToken;
      botSettingsForm.elements.chatId.value = settings.chatId;
    } catch {
      setError(botSettingsError, 'Lidhja me Telegram nuk mund të ngarkohet.');
    }
  }

  botSettingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(botSettingsError, '');
    if (botSettingsStatus) botSettingsStatus.textContent = '';

    const settings = {
      botName: botSettingsForm.elements.botName.value.trim(),
      botToken: botSettingsForm.elements.botToken.value.trim(),
      chatId: botSettingsForm.elements.chatId.value.trim(),
    };

    const submitButton = botSettingsForm.querySelector('button[type="submit"]');
    try {
      if (submitButton) submitButton.disabled = true;
      await store.saveBotSettings(settings);
      if (botSettingsStatus) botSettingsStatus.textContent = 'Lidhja u ruajt.';
    } catch (error) {
      setError(botSettingsError, error.message || 'Lidhja nuk mund të ruhet.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  function showAuthView() {
    authShell.hidden = false;
    adminApp.hidden = true;
    loginView.hidden = false;
    loginView.querySelector('input[name="password"]')?.focus();
  }

  async function showAdmin() {
    authShell.hidden = true;
    adminApp.hidden = false;
    renderProducts();
    resetEditor();
    try {
      products = await store.listProducts();
      renderProducts();
    } catch {
      productError.textContent = 'Produktet nuk mund të ngarkohen nga Supabase.';
    }
    void loadReviewsPanel();
    void loadOrdersPanel();
    void loadBotSettingsPanel();
  }

  function setError(element, message) {
    if (element) element.textContent = message;
  }

  // Reveals the password, never stores or transmits it: the input type flips and
  // that is all. aria-pressed carries the state, so a screen reader knows the
  // field is currently readable on screen.
  document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
    const field = toggle.closest('.password-field')?.querySelector('input');
    if (!field) return;
    toggle.addEventListener('click', () => {
      const shown = field.type === 'text';
      field.type = shown ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!shown));
      toggle.setAttribute('aria-label', shown ? 'Shfaq fjalëkalimin' : 'Fshih fjalëkalimin');
      // Typing should carry on where it left off, not jump to the end.
      const caret = field.selectionStart;
      field.focus();
      if (caret !== null) field.setSelectionRange(caret, caret);
    });
  });
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = String(new FormData(loginForm).get('password') || '');
    const error = document.querySelector('[data-login-error]');

    if (!store?.isRemote()) {
      setError(error, 'Paneli nuk mund të hapet pa një lidhje të sigurt me Supabase.');
      return;
    }
    try {
      const { error: loginError } = await store.signIn(password);
      if (loginError) throw loginError;
      loginForm.reset();
      setError(error, '');
      await showAdmin();
    } catch {
      setError(error, 'Fjalëkalimi nuk është i saktë ose shërbimi nuk është i disponueshëm.');
    }
  });

  function renderCategoryOptions() {
    if (!categorySelect) return;
    categorySelect.replaceChildren();
    menuData.categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.label;
      categorySelect.append(option);
    });
  }

  function categoryLabel(categoryId) {
    return menuData.categories.find((category) => category.id === categoryId)?.label || categoryId;
  }

  function formatPrice(price) {
    return String(price || '').trim() ? `${price} ALL` : 'Pa çmim';
  }

  function normalizeSortOrders(items) {
    return items.map((product, index) => ({ ...product, sortOrder: index }));
  }

  function categoryRank(categoryId) {
    const index = menuData.categories.findIndex((category) => category.id === categoryId);
    return index < 0 ? menuData.categories.length : index;
  }

  function sortWithinCategories(items, compare) {
    return [...items].sort((left, right) => {
      const categoryDifference = categoryRank(left.category) - categoryRank(right.category);
      return categoryDifference || compare(left, right);
    });
  }

  async function persistProductOrder(nextProducts, successMessage) {
    if (!store?.saveProductOrder) throw new Error('Ruajtja e renditjes nuk është e disponueshme.');
    if (sortStatus) sortStatus.textContent = 'Po ruhet renditja…';
    if (applySortButton) applySortButton.disabled = true;
    try {
      products = await store.saveProductOrder(normalizeSortOrders(nextProducts));
      renderProducts();
      window.BAR_MARTIRI_INDEXNOW?.submit();
      if (sortStatus) sortStatus.textContent = successMessage;
    } catch (error) {
      if (sortStatus) sortStatus.textContent = error.message || 'Renditja nuk mund të ruhet.';
    } finally {
      if (applySortButton) applySortButton.disabled = false;
    }
  }

  async function moveProduct(productId, direction) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const peers = products.filter((item) => item.category === product.category);
    const peerIndex = peers.findIndex((item) => item.id === productId);
    const neighbour = peers[peerIndex + direction];
    if (!neighbour) return;

    const currentIndex = products.findIndex((item) => item.id === productId);
    const neighbourIndex = products.findIndex((item) => item.id === neighbour.id);
    const reordered = [...products];
    [reordered[currentIndex], reordered[neighbourIndex]] = [
      reordered[neighbourIndex],
      reordered[currentIndex],
    ];
    await persistProductOrder(reordered, 'Renditja manuale u ruajt.');
  }

  function createMoveButton(product, direction, disabled) {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = disabled;
    button.setAttribute(
      'aria-label',
      direction < 0 ? `Lëviz ${product.name} lart` : `Lëviz ${product.name} poshtë`
    );
    button.innerHTML =
      direction < 0
        ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"></path></svg>'
        : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"></path></svg>';
    button.addEventListener('click', () => void moveProduct(product.id, direction));
    return button;
  }

  function renderProducts() {
    if (!productList) return;
    productList.replaceChildren();
    productCount.textContent = String(products.length);

    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-list';
      empty.textContent = 'Nuk ka ende produkte.';
      productList.append(empty);
      return;
    }

    products.forEach((product) => {
      const row = document.createElement('tr');
      row.className = 'admin-product-row';
      row.dataset.productId = product.id;

      const imageCell = document.createElement('td');
      imageCell.className = 'col-image';
      const image = document.createElement('img');
      image.src = product.image || 'assets/icecream-gallery/ice-cream-cone-transparent.png';
      image.alt = '';
      imageCell.append(image);

      const nameCell = document.createElement('td');
      const selectProduct = document.createElement('button');
      selectProduct.className = 'admin-product-select';
      selectProduct.type = 'button';
      selectProduct.setAttribute('aria-label', `Ndrysho ${product.name || 'produktin'}`);
      selectProduct.textContent = product.name || 'Pa emer';
      selectProduct.addEventListener('click', () => editProduct(product.id));
      nameCell.append(selectProduct);

      const categoryCell = document.createElement('td');
      categoryCell.className = 'admin-product-category';
      categoryCell.textContent = categoryLabel(product.category);

      const priceCell = document.createElement('td');
      priceCell.className = 'col-price admin-product-price';
      priceCell.textContent = formatPrice(product.price);

      const categoryProducts = products.filter((item) => item.category === product.category);
      const categoryIndex = categoryProducts.findIndex((item) => item.id === product.id);
      const reorderCell = document.createElement('td');
      reorderCell.className = 'col-reorder';
      const controls = document.createElement('div');
      controls.className = 'reorder-controls';
      controls.append(
        createMoveButton(product, -1, categoryIndex === 0),
        createMoveButton(product, 1, categoryIndex === categoryProducts.length - 1)
      );
      reorderCell.append(controls);

      row.append(imageCell, nameCell, categoryCell, priceCell, reorderCell);
      productList.append(row);
    });
  }

  function showImage(source, alt = '') {
    currentImage = source || '';
    imagePreview.src = currentImage;
    imagePreview.alt = alt;
    imagePreview.hidden = !currentImage;
    dropCopy.hidden = Boolean(currentImage);
  }

  function resetEditor() {
    productForm?.reset();
    pendingImage = null;
    if (productForm?.elements.category && menuData.categories[0]) {
      productForm.elements.category.value = menuData.categories[0].id;
    }
    if (productForm?.elements.id) productForm.elements.id.value = '';
    editorTitle.textContent = 'Shto produkt';
    deleteButton.hidden = true;
    productError.textContent = '';
    showImage('');
    document.querySelectorAll('.admin-product-row').forEach((row) => row.classList.remove('is-selected'));
  }

  function editProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product || !productForm) return;

    pendingImage = null;
    productForm.elements.id.value = product.id;
    productForm.elements.name.value = product.name || '';
    productForm.elements.category.value = product.category || menuData.categories[0]?.id || '';
    productForm.elements.price.value = product.price || '';
    productForm.elements.description.value = product.description || '';
    editorTitle.textContent = 'Ndrysho produktin';
    deleteButton.hidden = false;
    productError.textContent = '';
    showImage(product.image, product.name);

    document.querySelectorAll('.admin-product-row').forEach((row) => {
      row.classList.toggle('is-selected', row.dataset.productId === id);
    });
    if (window.matchMedia('(max-width: 1050px)').matches) {
      document.querySelector('.product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function createId() {
    return window.crypto?.randomUUID?.() || `product-${Date.now()}`;
  }

  productForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(productForm);
    const id = String(data.get('id') || '');
    const existingProduct = products.find((item) => item.id === id);
    const product = {
      id: id || createId(),
      name: String(data.get('name') || '').trim(),
      category: String(data.get('category') || ''),
      price: String(data.get('price') || '').trim(),
      description: String(data.get('description') || '').trim(),
      translations: existingProduct?.translations || { it: {}, en: {} },
      image: currentImage,
      sortOrder: existingProduct?.sortOrder ?? products.length,
    };

    if (!product.name || !product.category) {
      productError.textContent = 'Emri dhe kategoria janë të detyrueshme.';
      return;
    }

    const submitButton = productForm.querySelector('button[type="submit"]');
    try {
      submitButton.disabled = true;
      productError.textContent = '';
      if (pendingImage && store.isRemote()) {
        product.image = await store.uploadImage(pendingImage.blob, pendingImage.name);
      }
      let productTranslationFailed = false;
      try {
        const translated = await translateToItEn([product.name, product.description]);
        product.translations = {
          it: { name: translated.it[0], description: translated.it[1] },
          en: { name: translated.en[0], description: translated.en[1] },
        };
      } catch {
        // Save the Albanian text anyway rather than blocking the admin, but
        // surface it: a silent failure here leaves the product untranslated on
        // /it/ and /en/ with nothing to indicate it.
        productTranslationFailed = true;
      }
      const savedProduct = await store.saveProduct(product);
      const existingIndex = products.findIndex((item) => item.id === savedProduct.id);
      if (existingIndex >= 0) products[existingIndex] = savedProduct;
      else products.push(savedProduct);
      products.sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder));
      renderProducts();
      resetEditor();
      // resetEditor clears the message slot, so report after it. There is no
      // separate status element on this form, and a translation that silently
      // did nothing is worth the admin seeing.
      if (productTranslationFailed) {
        productError.textContent =
          'Produkti u ruajt vetëm në shqip — përkthimi nuk u krye, ndaj emri dhe përshkrimi nuk shfaqen te /it/ dhe /en/.';
      }
      window.BAR_MARTIRI_INDEXNOW?.submit();
    } catch (error) {
      productError.textContent =
        error.message || 'Produkti nuk mund të ruhet.';
    } finally {
      submitButton.disabled = false;
    }
  });

  deleteButton?.addEventListener('click', async () => {
    const id = productForm?.elements.id.value;
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (!window.confirm(`Të fshihet "${product.name}"?`)) return;
    try {
      deleteButton.disabled = true;
      await store.deleteProduct(id);
      products = products.filter((item) => item.id !== id);
      renderProducts();
      resetEditor();
      window.BAR_MARTIRI_INDEXNOW?.submit();
    } catch (error) {
      productError.textContent = error.message || 'Produkti nuk mund të fshihet.';
    } finally {
      deleteButton.disabled = false;
    }
  });

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result || '')));
      reader.addEventListener('error', () => reject(reader.error));
      reader.readAsDataURL(blob);
    });
  }

  function encodeCanvas(canvas, mimeType, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
  }

  async function compressImage(file) {
    if (!file.type.startsWith('image/')) throw new Error('Zgjidh një skedar fotografie.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Fotografia duhet të jetë më e vogël se 8 MB.');

    const bitmap = await createImageBitmap(file);
    const maxSide = 800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let mimeType = 'image/webp';
    let quality = 0.78;
    let blob = await encodeCanvas(canvas, mimeType, quality);
    if (!blob || blob.type !== mimeType) {
      // Safari silently substitutes PNG when it can't encode WebP, and PNG
      // ignores the quality argument entirely, so the file stays huge no
      // matter how much we lower it. JPEG compresses reliably everywhere.
      mimeType = 'image/jpeg';
      blob = await encodeCanvas(canvas, mimeType, quality);
    }
    while (blob && blob.size > 180 * 1024 && quality > 0.4) {
      quality -= 0.08;
      blob = await encodeCanvas(canvas, mimeType, quality);
    }
    if (!blob) throw new Error('Fotografia nuk mund të kompresohet.');
    return {
      blob,
      extension: mimeType === 'image/webp' ? 'webp' : 'jpg',
      dataUrl: await blobToDataUrl(blob),
    };
  }

  async function handleImage(file) {
    if (!file) return;
    try {
      productError.textContent = '';
      const compressed = await compressImage(file);
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'product';
      pendingImage = {
        blob: compressed.blob,
        name: `${baseName}.${compressed.extension}`,
      };
      showImage(compressed.dataUrl, 'Pamja e fotos se produktit');
    } catch (error) {
      productError.textContent = error.message || 'Fotografia nuk mund të lexohet.';
    }
  }

  imageInput?.addEventListener('change', () => handleImage(imageInput.files?.[0]));

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('is-dragging');
    });
  });

  dropZone?.addEventListener('drop', (event) => handleImage(event.dataTransfer?.files?.[0]));

  function renderGalleryGrid() {
    if (!adminGalleryGrid) return;
    adminGalleryGrid.replaceChildren();
    if (galleryCount) galleryCount.textContent = String(galleryImages.length);
    if (galleryEmpty) galleryEmpty.hidden = galleryImages.length > 0;

    galleryImages.forEach((image, index) => {
      const item = document.createElement('div');
      item.className = 'admin-gallery-item';

      const img = document.createElement('img');
      img.src = image.imageUrl;
      img.alt = '';
      item.append(img);

      const actions = document.createElement('div');
      actions.className = 'admin-gallery-item-actions';

      const leftButton = document.createElement('button');
      leftButton.type = 'button';
      leftButton.disabled = index === 0;
      leftButton.setAttribute('aria-label', 'Lëviz majtas');
      leftButton.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"></path></svg>';
      leftButton.addEventListener('click', () => void moveGalleryImage(image.id, -1));

      const rightButton = document.createElement('button');
      rightButton.type = 'button';
      rightButton.disabled = index === galleryImages.length - 1;
      rightButton.setAttribute('aria-label', 'Lëviz djathtas');
      rightButton.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"></path></svg>';
      rightButton.addEventListener('click', () => void moveGalleryImage(image.id, 1));

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.dataset.removeGalleryImage = '';
      removeButton.setAttribute('aria-label', 'Fshi foton');
      removeButton.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
      removeButton.addEventListener('click', () => void removeGalleryImage(image.id));

      actions.append(leftButton, rightButton, removeButton);
      item.append(actions);
      adminGalleryGrid.append(item);
    });
  }

  async function loadGalleryPanel() {
    if (!store?.listGalleryImages) return;
    try {
      galleryImages = await store.listGalleryImages();
      renderGalleryGrid();
    } catch {
      if (galleryStatus) galleryStatus.textContent = 'Fotot nuk mund të ngarkohen.';
    }
  }

  async function moveGalleryImage(id, direction) {
    const index = galleryImages.findIndex((image) => image.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= galleryImages.length) return;
    const reordered = [...galleryImages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    galleryImages = reordered;
    renderGalleryGrid();
    try {
      const resaved = await Promise.all(
        galleryImages.map((image, sortOrder) => store.saveGalleryImage({ ...image, sortOrder }))
      );
      galleryImages = resaved;
      renderGalleryGrid();
    } catch {
      if (galleryStatus) galleryStatus.textContent = 'Renditja nuk mund të ruhet.';
      void loadGalleryPanel();
    }
  }

  async function removeGalleryImage(id) {
    if (!window.confirm('Ta fshij këtë foto?')) return;
    try {
      await store.deleteGalleryImage(id);
      galleryImages = galleryImages.filter((image) => image.id !== id);
      renderGalleryGrid();
    } catch {
      if (galleryStatus) galleryStatus.textContent = 'Fotoja nuk mund të fshihet.';
    }
  }

  async function handleGalleryImage(file) {
    if (!file) return;
    if (galleryError) galleryError.textContent = '';
    if (galleryStatus) galleryStatus.textContent = 'Po ngarkohet…';
    try {
      const compressed = await compressImage(file);
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'gallery';
      const imageUrl = await store.uploadImage(
        compressed.blob,
        `${baseName}.${compressed.extension}`,
        window.BAR_MARTIRI_SUPABASE?.galleryBucket
      );
      const saved = await store.saveGalleryImage({ imageUrl, sortOrder: galleryImages.length });
      galleryImages.push(saved);
      renderGalleryGrid();
      if (galleryStatus) galleryStatus.textContent = 'Fotoja u shtua.';
    } catch (error) {
      if (galleryError) galleryError.textContent = error.message || 'Fotografia nuk mund të ngarkohet.';
      if (galleryStatus) galleryStatus.textContent = '';
    }
  }

  galleryImageInput?.addEventListener('change', () => handleGalleryImage(galleryImageInput.files?.[0]));

  ['dragenter', 'dragover'].forEach((eventName) => {
    galleryDropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      galleryDropZone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    galleryDropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      galleryDropZone.classList.remove('is-dragging');
    });
  });

  galleryDropZone?.addEventListener('drop', (event) => handleGalleryImage(event.dataTransfer?.files?.[0]));

  document.querySelector('[data-new-product]')?.addEventListener('click', () => {
    resetEditor();
    document.querySelector('.product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    productForm?.elements.name.focus();
  });
  document.querySelector('[data-cancel-edit]')?.addEventListener('click', resetEditor);

  sortMode?.addEventListener('change', () => {
    if (!sortStatus) return;
    sortStatus.textContent =
      sortMode.value === 'manual'
        ? 'Për renditjen manuale përdor shigjetat pranë çdo produkti.'
        : 'Kliko Apliko për ta ruajtur këtë renditje.';
  });

  applySortButton?.addEventListener('click', async () => {
    const mode = sortMode?.value || 'manual';
    if (mode === 'manual') {
      if (sortStatus) {
        sortStatus.textContent = 'Përdor shigjetat lart dhe poshtë pranë produkteve.';
      }
      return;
    }

    const byName = (left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''), 'sq-AL', {
        sensitivity: 'base',
      });
    let compare = byName;
    if (mode.startsWith('price-')) {
      const direction = mode === 'price-desc' ? -1 : 1;
      compare = (left, right) => {
        const leftPrice = String(left.price ?? '').trim() === '' ? null : Number(left.price);
        const rightPrice = String(right.price ?? '').trim() === '' ? null : Number(right.price);
        if (leftPrice === null && rightPrice === null) return byName(left, right);
        if (leftPrice === null) return 1;
        if (rightPrice === null) return -1;
        return (leftPrice - rightPrice) * direction || byName(left, right);
      };
    }

    const reordered = sortWithinCategories(products, compare);
    await persistProductOrder(
      reordered,
      mode === 'alphabetical'
        ? 'Renditja alfabetike u ruajt.'
        : 'Renditja sipas çmimit u ruajt.'
    );
  });

  document.querySelector('[data-apply-description-drafts]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (
      !window.confirm(
        'Të plotësohen përshkrimet bosh dhe të korrigjohen kategoritë e shënuara në draft?'
      )
    ) {
      return;
    }

    try {
      button.disabled = true;
      if (sortStatus) sortStatus.textContent = 'Po aplikohen përshkrimet draft…';
      const response = await fetch('backup/product-description-drafts-2026-08-03.json', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Skedari i përshkrimeve nuk u gjet.');
      const drafts = await response.json();
      const draftsById = new Map(drafts.map((draft) => [String(draft.id), draft]));
      let changed = 0;
      const merged = products.map((product) => {
        const draft = draftsById.get(String(product.id));
        if (!draft) return product;
        const next = { ...product };
        if (!String(product.description || '').trim() && String(draft.description || '').trim()) {
          next.description = String(draft.description).slice(0, 240);
        }
        if (draft.category && draft.category !== product.category) {
          next.category = String(draft.category);
        }
        if (next.description !== product.description || next.category !== product.category) changed += 1;
        return next;
      });
      products = await store.saveProductOrder(merged);
      renderProducts();
      resetEditor();
      window.BAR_MARTIRI_INDEXNOW?.submit();
      if (sortStatus) {
        sortStatus.textContent = `${changed} produkte u përditësuan. Kontrolloji nga formulari.`;
      }
    } catch (error) {
      if (sortStatus) {
        sortStatus.textContent = error.message || 'Përshkrimet nuk mund të aplikohen.';
      }
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('[data-export]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bar-martiri-menu-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector('[data-import]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported)) throw new Error();
      const importedProducts = imported
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => ({
          id: String(item.id || createId()),
          name: String(item.name || '').slice(0, 80),
          category: String(item.category || menuData.categories[0]?.id || ''),
          description: String(item.description || '').slice(0, 240),
          translations: {
            it: {
              name: String(item.name_it ?? item.translations?.it?.name ?? '').slice(0, 80),
              description: String(
                item.description_it ?? item.translations?.it?.description ?? ''
              ).slice(0, 240),
            },
            en: {
              name: String(item.name_en ?? item.translations?.en?.name ?? '').slice(0, 80),
              description: String(
                item.description_en ?? item.translations?.en?.description ?? ''
              ).slice(0, 240),
            },
          },
          price: String(item.price || ''),
          image: String(item.image || ''),
          sortOrder: Number(item.sortOrder ?? item.sort_order ?? index),
        }))
        .filter((item) => item.name);
      if (!window.confirm(`Të zëvendësohen produktet aktuale me ${importedProducts.length} produkte?`)) {
        return;
      }
      products = await store.replaceProducts(importedProducts);
      renderProducts();
      resetEditor();
      window.BAR_MARTIRI_INDEXNOW?.submit();
    } catch {
      window.alert('Skedari JSON nuk është i vlefshëm.');
    } finally {
      event.target.value = '';
    }
  });

  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    stopOrdersPolling();
    stopChatsPolling();
    stopChatThreadPolling();
    try {
      await store.signOut();
    } catch {
      // The local session is still cleared below.
    }
    showAuthView();
  });

  async function initializeAdmin() {
    renderCategoryOptions();
    if (store?.isRemote()) {
      if (storageStatus) {
        storageStatus.lastChild.textContent = ' Supabase online';
      }
      if (storageNotice) {
        storageNotice.querySelector('strong').textContent = 'Sinkronizim online';
        storageNotice.querySelector('p').textContent =
          'Ndryshimet ruhen në Supabase dhe shfaqen në të gjitha pajisjet.';
      }
      try {
        const session = await store.getSession();
        if (session) await showAdmin();
        else showAuthView();
      } catch {
        showAuthView();
      }
      return;
    }

    if (storageStatus) storageStatus.lastChild.textContent = ' Supabase i padisponueshëm';
    if (storageNotice) {
      storageNotice.querySelector('strong').textContent = 'Paneli është i bllokuar';
      storageNotice.querySelector('p').textContent =
        'Konfiguro lidhjen e sigurt me Supabase për të menaxhuar produktet.';
    }
    showAuthView();
    setError(
      document.querySelector('[data-login-error]'),
      'Paneli nuk mund të përdoret pa Supabase.'
    );
  }

  void initializeAdmin();
})();
