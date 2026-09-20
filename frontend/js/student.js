/**
 * ASTRA CANTEEN - STUDENT PORTAL MODULE
 * Handles menu rendering, filtering, cart management, slot selection, and checkout
 */

const StudentPortal = {
  currentCategory: 'all',
  currentDietary: 'all',
  currentTag: 'all',
  currentSort: 'recommended',
  searchQuery: '',
  selectedPayment: 'UPI_QR',
  appliedPromo: null, // { code, discount, label }

  async init() {
    await this.fetchMenu();
    await this.fetchSlots();
    this.setupEventListeners();
    this.renderMenu();
    this.updateCartBadge();
  },

  async fetchMenu() {
    try {
      const res = await fetch(`${AppState.apiBase}/api/menu`);
      if (res.ok) {
        AppState.menuItems = await res.json();
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    }
  },

  async fetchSlots() {
    try {
      const res = await fetch(`${AppState.apiBase}/api/slots`);
      if (res.ok) {
        AppState.slots = await res.json();
        if (!AppState.selectedSlotId && AppState.slots.length > 0) {
          // Default to first available slot with lowest crowd
          const available = AppState.slots.filter(s => s.is_available);
          if (available.length > 0) {
            AppState.selectedSlotId = available[0].id;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  },

  setupEventListeners() {
    // Category pills
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.dataset.category;
        this.renderMenu();
      });
    });

    // Dietary switch
    document.querySelectorAll('.diet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diet-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentDietary = btn.dataset.diet;
        this.renderMenu();
      });
    });

    // Quick tag pills
    document.querySelectorAll('.quick-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quick-tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTag = btn.dataset.tag;
        this.renderMenu();
      });
    });

    // Sort select
    const sortSelect = document.getElementById('menu-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderMenu();
      });
    }

    // Search box
    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderMenu();
      });
    }

    // Cart trigger button
    const cartTrigger = document.getElementById('cart-trigger-btn');
    if (cartTrigger) {
      cartTrigger.addEventListener('click', () => this.openCart());
    }

    // Cart close button & overlay
    const cartClose = document.getElementById('cart-close-btn');
    const cartOverlay = document.getElementById('cart-drawer-overlay');
    if (cartClose) cartClose.addEventListener('click', () => this.closeCart());
    if (cartOverlay) cartOverlay.addEventListener('click', () => this.closeCart());

    // Order History trigger & close
    const historyBtn = document.getElementById('history-modal-btn');
    const historyOverlay = document.getElementById('history-modal-overlay');
    const historyClose = document.getElementById('history-modal-close');
    if (historyBtn) historyBtn.addEventListener('click', () => this.openHistoryModal());
    if (historyOverlay) {
      historyOverlay.addEventListener('click', (e) => {
        if (e.target === historyOverlay) this.closeHistoryModal();
      });
    }
    if (historyClose) historyClose.addEventListener('click', () => this.closeHistoryModal());

    // Promo code apply & remove buttons
    const promoApplyBtn = document.getElementById('promo-apply-btn');
    const promoRemoveBtn = document.getElementById('promo-remove-btn');
    if (promoApplyBtn) {
      promoApplyBtn.addEventListener('click', () => this.applyPromo());
    }
    if (promoRemoveBtn) {
      promoRemoveBtn.addEventListener('click', () => this.removePromo());
    }

    // Payment method buttons
    document.querySelectorAll('.payment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedPayment = btn.dataset.payment;
      });
    });

    // Checkout submit button
    const checkoutBtn = document.getElementById('checkout-submit-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.submitOrder());
    }
  },

  renderMenu() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;

    let items = AppState.menuItems;

    // Filter category
    if (this.currentCategory !== 'all') {
      items = items.filter(i => i.category.toLowerCase() === this.currentCategory.toLowerCase());
    }

    // Filter dietary
    if (this.currentDietary !== 'all') {
      items = items.filter(i => i.dietary.toLowerCase() === this.currentDietary.toLowerCase());
    }

    // Filter quick tags
    if (this.currentTag === 'fast') {
      items = items.filter(i => i.prep_time_mins <= 10);
    } else if (this.currentTag === 'budget') {
      items = items.filter(i => i.price <= 100);
    } else if (this.currentTag === 'healthy') {
      items = items.filter(i => i.calories <= 350);
    } else if (this.currentTag === 'spicy') {
      items = items.filter(i => (i.tags && i.tags.some(t => t.toLowerCase().includes('spice') || t.toLowerCase().includes('south'))) || i.description.toLowerCase().includes('spice'));
    }

    // Filter search
    if (this.searchQuery) {
      items = items.filter(i => 
        i.name.toLowerCase().includes(this.searchQuery) ||
        i.description.toLowerCase().includes(this.searchQuery) ||
        i.tags.some(t => t.toLowerCase().includes(this.searchQuery))
      );
    }

    // Sorting
    if (this.currentSort === 'price-asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (this.currentSort === 'price-desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (this.currentSort === 'prep-asc') {
      items.sort((a, b) => a.prep_time_mins - b.prep_time_mins);
    } else if (this.currentSort === 'calories-asc') {
      items.sort((a, b) => a.calories - b.calories);
    }

    // Update count indicator
    const countEl = document.getElementById('menu-dishes-count');
    if (countEl) {
      countEl.textContent = `Showing ${items.length} of ${AppState.menuItems.length} dishes`;
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <h3>No dishes match your filter</h3>
          <p style="font-size: 0.9rem;">Try selecting a different category or clearing your search.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => {
      const inCart = AppState.cart[item.id];
      const qty = inCart ? inCart.quantity : 0;
      const isSoldOut = !item.is_available || item.stock_quantity <= 0;

      let stockTag = '';
      if (isSoldOut) {
        stockTag = `<span class="stock-tag-float out-of-stock">🚫 Sold Out</span>`;
      } else if (item.stock_quantity <= 5) {
        stockTag = `<span class="stock-tag-float low-stock">⚡ Only ${item.stock_quantity} left</span>`;
      } else {
        stockTag = `<span class="stock-tag-float in-stock">🟢 In Stock</span>`;
      }

      return `
        <div class="food-card ${isSoldOut ? 'sold-out' : ''}" data-id="${item.id}">
          <div class="food-card-img-wrap">
            <img src="${item.image_url}" alt="${item.name}" class="food-card-img" loading="lazy">
            <div class="diet-tag">
              <span class="diet-dot ${item.dietary === 'veg' ? 'veg' : 'non-veg'}"></span>
            </div>
            <div class="prep-badge">
              <span>⏱️ ${item.prep_time_mins} mins</span>
            </div>
            ${stockTag}
          </div>

          <div class="food-card-body">
            <div class="food-card-header">
              <h3 class="food-card-title">${item.name}</h3>
              <span class="calorie-tag">🔥 ${item.calories} cal</span>
            </div>

            <p class="food-card-desc">${item.description}</p>

            <div class="food-card-footer">
              <div class="food-price">
                <small>₹</small>${item.price.toFixed(2)}
              </div>

              ${isSoldOut ? `
                <button class="add-cart-btn" disabled>Unavailable</button>
              ` : qty > 0 ? `
                <div class="card-qty-control">
                  <button class="qty-btn" onclick="StudentPortal.updateCartQuantity('${item.id}', -1)">-</button>
                  <span class="qty-number">${qty}</span>
                  <button class="qty-btn" onclick="StudentPortal.updateCartQuantity('${item.id}', 1)">+</button>
                </div>
              ` : `
                <button class="add-cart-btn" onclick="StudentPortal.addToCart('${item.id}')">
                  <span>+</span> Add
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  refreshMenuStock(stockData) {
    const item = AppState.menuItems.find(i => i.id === stockData.item_id);
    if (item) {
      item.is_available = stockData.is_available;
      item.stock_quantity = stockData.stock_quantity;
      this.renderMenu();
      this.renderCart();
    }
  },

  addToCart(itemId) {
    const item = AppState.menuItems.find(i => i.id === itemId);
    if (!item || !item.is_available || item.stock_quantity <= 0) return;

    if (!AppState.cart[itemId]) {
      AppState.cart[itemId] = {
        item: item,
        quantity: 1,
        notes: ''
      };
    } else {
      AppState.cart[itemId].quantity += 1;
    }

    this.updateCartBadge();
    this.renderMenu();
    this.renderCart();
    showToast(`Added ${item.name} to cart`, 'success');
  },

  updateCartQuantity(itemId, delta) {
    if (!AppState.cart[itemId]) return;

    AppState.cart[itemId].quantity += delta;
    if (AppState.cart[itemId].quantity <= 0) {
      delete AppState.cart[itemId];
    }

    this.updateCartBadge();
    this.renderMenu();
    this.renderCart();
  },

  updateCartItemNotes(itemId, notes) {
    if (AppState.cart[itemId]) {
      AppState.cart[itemId].notes = notes;
    }
  },

  updateCartBadge() {
    const totalCount = Object.values(AppState.cart).reduce((sum, entry) => sum + entry.quantity, 0);
    const badge = document.getElementById('cart-count-badge');
    if (badge) {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    // Sync Floating Sticky Cart FAB
    const fab = document.getElementById('floating-cart-fab');
    const fabCount = document.getElementById('fab-cart-count');
    const fabTotal = document.getElementById('fab-cart-total');
    if (fab) {
      if (totalCount > 0) {
        fab.style.display = 'flex';
        if (fabCount) fabCount.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
        
        // Calculate estimated total for FAB
        let sub = Object.values(AppState.cart).reduce((s, e) => s + (e.item.price * e.quantity), 0);
        let disc = 0;
        if (this.appliedPromo) disc = this.appliedPromo.discount;
        let grand = Math.max(0, sub - disc) * 1.05;
        if (fabTotal) fabTotal.textContent = `₹${grand.toFixed(2)}`;
      } else {
        fab.style.display = 'none';
      }
    }
  },

  openCart() {
    this.renderCart();
    this.renderSlots();
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
  },

  closeCart() {
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
  },

  applyPromo(presetCode) {
    const input = document.getElementById('promo-coupon-input');
    const code = presetCode || (input ? input.value : '');
    const cleanCode = code ? code.trim().toUpperCase() : '';
    if (!cleanCode) {
      showToast('Please enter a coupon code', 'warning');
      return;
    }

    const subtotal = Object.values(AppState.cart).reduce((s, e) => s + (e.item.price * e.quantity), 0);
    if (subtotal <= 0) {
      showToast('Add items to cart before applying coupon!', 'warning');
      return;
    }

    let discount = 0;
    let label = '';

    if (cleanCode === 'CAMPUS20') {
      discount = Math.round(subtotal * 0.20);
      label = '20% Student Subsidy';
    } else if (cleanCode === 'FREEDRINK') {
      discount = Math.min(40, subtotal);
      label = '₹40 Beverage Credit';
    } else if (cleanCode === 'EXAMBOOST') {
      discount = Math.min(30, subtotal);
      label = '₹30 Exam Snack Booster';
    } else {
      showToast(`Invalid coupon '${cleanCode}'. Try CAMPUS20, FREEDRINK, or EXAMBOOST`, 'error');
      return;
    }

    this.appliedPromo = { code: cleanCode, discount: discount, label: label };
    
    const wrap = document.getElementById('promo-applied-wrap');
    const inputRow = document.getElementById('promo-input-row');
    const text = document.getElementById('promo-applied-text');
    if (wrap) wrap.style.display = 'block';
    if (inputRow) inputRow.style.display = 'none';
    if (text) text.textContent = `🎉 ${label} (-₹${discount})`;

    playSoundChime('chime');
    showToast(`Coupon applied: Saved ₹${discount}!`, 'success');
    this.renderCart();
    this.updateCartBadge();
  },

  removePromo() {
    this.appliedPromo = null;
    const wrap = document.getElementById('promo-applied-wrap');
    const inputRow = document.getElementById('promo-input-row');
    const input = document.getElementById('promo-coupon-input');
    if (wrap) wrap.style.display = 'none';
    if (inputRow) inputRow.style.display = 'flex';
    if (input) input.value = '';
    showToast('Coupon removed', 'warning');
    this.renderCart();
    this.updateCartBadge();
  },

  renderSlots() {
    const slotContainer = document.getElementById('slot-picker-grid');
    if (!slotContainer) return;

    slotContainer.innerHTML = AppState.slots.map(s => {
      const isSelected = s.id === AppState.selectedSlotId;
      let crowdClass = 'low';
      let crowdText = '🟢 Low Crowd';
      if (s.crowd_level === 'MODERATE') {
        crowdClass = 'moderate';
        crowdText = '🟡 Normal';
      } else if (s.crowd_level === 'HIGH') {
        crowdClass = 'high';
        crowdText = '🔴 Busy';
      }

      return `
        <div class="slot-card ${isSelected ? 'selected' : ''} ${!s.is_available ? 'disabled' : ''}" 
             onclick="StudentPortal.selectSlot('${s.id}')">
          <div class="slot-time">${s.label}</div>
          <div class="slot-crowd-tag ${crowdClass}">${crowdText}</div>
        </div>
      `;
    }).join('');
  },

  selectSlot(slotId) {
    AppState.selectedSlotId = slotId;
    this.renderSlots();
  },

  renderCart() {
    const cartList = document.getElementById('cart-items-list');
    const emptyState = document.getElementById('cart-empty-state');
    const checkoutBtn = document.getElementById('checkout-submit-btn');
    if (!cartList) return;

    const cartEntries = Object.values(AppState.cart);

    if (cartEntries.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      cartList.innerHTML = '';
      if (checkoutBtn) checkoutBtn.disabled = true;
      this.updateBillTotals(0, 0, 0, 0);
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;

    let subtotal = 0;

    cartList.innerHTML = cartEntries.map(entry => {
      const item = entry.item;
      const lineTotal = item.price * entry.quantity;
      subtotal += lineTotal;

      return `
        <div class="cart-item-card">
          <div class="cart-item-top">
            <span class="cart-item-name">${item.name}</span>
            <span class="cart-item-price">₹${lineTotal.toFixed(2)}</span>
          </div>

          <div class="cart-item-bottom">
            <div class="card-qty-control" style="background: rgba(255,255,255,0.05);">
              <button class="qty-btn" onclick="StudentPortal.updateCartQuantity('${item.id}', -1)">-</button>
              <span class="qty-number">${entry.quantity}</span>
              <button class="qty-btn" onclick="StudentPortal.updateCartQuantity('${item.id}', 1)">+</button>
            </div>

            <input type="text" class="cart-notes-input" placeholder="Cooking note (e.g. less spice)" 
                   value="${entry.notes || ''}" 
                   onchange="StudentPortal.updateCartItemNotes('${item.id}', this.value)">
          </div>
        </div>
      `;
    }).join('');

    let discount = 0;
    if (this.appliedPromo) {
      discount = this.appliedPromo.discount;
      if (discount > subtotal) discount = subtotal;
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = discountedSubtotal * 0.05;
    const grandTotal = discountedSubtotal + tax;
    this.updateBillTotals(subtotal, discount, tax, grandTotal);
  },

  updateBillTotals(subtotal, discount, tax, grandTotal) {
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    
    if (discountRow && discountEl) {
      if (discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-₹${discount.toFixed(2)}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${grandTotal.toFixed(2)}`;
  },

  async submitOrder() {
    const cartEntries = Object.values(AppState.cart);
    if (cartEntries.length === 0) {
      showToast('Your cart is empty!', 'warning');
      return;
    }

    const nameInput = document.getElementById('student-name-input');
    const rollInput = document.getElementById('student-roll-input');
    const phoneInput = document.getElementById('student-phone-input');

    const studentName = nameInput?.value.trim() || 'Aarav Sharma';
    const studentRoll = rollInput?.value.trim() || 'CS24B112';
    const studentPhone = phoneInput?.value.trim() || '9876543210';

    if (!AppState.selectedSlotId) {
      showToast('Please select a pickup time slot', 'warning');
      return;
    }

    const payload = {
      student_name: studentName,
      student_id: studentRoll,
      student_phone: studentPhone,
      items: cartEntries.map(e => ({
        item_id: e.item.id,
        quantity: e.quantity,
        notes: e.notes || ''
      })),
      pickup_slot_id: AppState.selectedSlotId,
      payment_method: this.selectedPayment,
      special_instructions: ''
    };

    const checkoutBtn = document.getElementById('checkout-submit-btn');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<span>⏳</span> Securing Order & QR Pass...';
    }

    try {
      const res = await fetch(`${AppState.apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Order placement failed');
      }

      const orderData = await res.json();
      AppState.activeOrder = orderData;
      
      // Save order to history for 1-click reorder
      this.saveOrderToHistory(orderData);

      AppState.cart = {};
      this.appliedPromo = null;
      this.updateCartBadge();
      this.closeCart();

      playSoundChime('ready');
      showToast(`Order Confirmed! Your pickup token is ${orderData.token_number}`, 'success');

      // Transition to Tracker
      switchView('tracker');

      // Refresh slots for crowd adjustments
      await this.fetchSlots();
      await this.fetchMenu();
    } catch (err) {
      console.error('Order error:', err);
      showToast(err.message, 'error');
    } finally {
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = '<span>⚡</span> Confirm & Generate QR Pass';
      }
    }
  },

  // =========================================================================
  // ORDER HISTORY & RE-ORDER CAPABILITIES
  // =========================================================================
  saveOrderToHistory(order) {
    try {
      let history = JSON.parse(localStorage.getItem('astra_order_history') || '[]');
      history = history.filter(o => o.id !== order.id);
      history.unshift({
        id: order.id,
        token_number: order.token_number,
        student_name: order.student_name,
        student_id: order.student_id,
        created_at: order.created_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pickup_slot_label: order.pickup_slot_label,
        items: order.items,
        total_amount: order.total_amount,
        status: order.status,
        qr_code_data_uri: order.qr_code_data_uri
      });
      localStorage.setItem('astra_order_history', JSON.stringify(history.slice(0, 25)));
    } catch (e) {
      console.warn('History storage error:', e);
    }
  },

  openHistoryModal() {
    this.renderHistory();
    const overlay = document.getElementById('history-modal-overlay');
    if (overlay) overlay.classList.add('open');
  },

  closeHistoryModal() {
    const overlay = document.getElementById('history-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  renderHistory() {
    const container = document.getElementById('history-modal-body');
    if (!container) return;

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('astra_order_history') || '[]');
    } catch (e) {}

    // Seed with activeOrder if list is empty
    if (history.length === 0 && AppState.activeOrder) {
      this.saveOrderToHistory(AppState.activeOrder);
      try {
        history = JSON.parse(localStorage.getItem('astra_order_history') || '[]');
      } catch (e) {}
    }

    if (history.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📜</div>
          <h4 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.25rem;">No Past Passes Found</h4>
          <p style="font-size: 0.85rem;">Your generated QR token passes will be archived here for instant 1-click re-ordering!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = history.map(order => {
      const itemsText = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      const statusClean = (order.status || 'PLACED').replace(/_/g, ' ');

      return `
        <div class="history-card">
          <div class="history-card-header">
            <div>
              <span class="history-token">${order.token_number}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">• ${order.created_at}</span>
            </div>
            <span class="nav-tab-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
              ${statusClean}
            </span>
          </div>

          <div class="history-items-summary">
            <strong>Slot:</strong> ${order.pickup_slot_label}<br>
            <strong>Dishes:</strong> ${itemsText}
          </div>

          <div class="history-card-footer">
            <div style="font-size: 1.05rem; font-weight: 800; color: #38bdf8;">
              ₹${Number(order.total_amount).toFixed(2)}
            </div>
            <div class="history-actions">
              <button class="btn-reorder" onclick="StudentPortal.reorderPastOrder('${order.id}')">
                <span>🔁</span> 1-Click Re-Order
              </button>
              <button class="btn-view-pass" onclick="StudentPortal.viewPastPass('${order.id}')">
                <span>🎫</span> View Pass
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  reorderPastOrder(orderId) {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('astra_order_history') || '[]');
    } catch (e) {}
    const order = history.find(o => o.id === orderId);
    if (!order) return;

    // Load items into cart
    let addedCount = 0;
    order.items.forEach(itm => {
      const menuItem = AppState.menuItems.find(m => m.id === itm.item_id || m.name === itm.name);
      if (menuItem && menuItem.is_available) {
        if (!AppState.cart[menuItem.id]) {
          AppState.cart[menuItem.id] = { item: menuItem, quantity: itm.quantity, notes: '' };
        } else {
          AppState.cart[menuItem.id].quantity += itm.quantity;
        }
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.updateCartBadge();
      this.renderMenu();
      this.closeHistoryModal();
      this.openCart();
      playSoundChime('ready');
      showToast(`Loaded ${order.token_number} meal items into your cart!`, 'success');
    } else {
      showToast('Items from this order are currently unavailable or sold out.', 'warning');
    }
  },

  viewPastPass(orderId) {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('astra_order_history') || '[]');
    } catch (e) {}
    const order = history.find(o => o.id === orderId);
    if (order) {
      AppState.activeOrder = order;
      this.closeHistoryModal();
      switchView('tracker');
      showToast(`Viewing pass ${order.token_number}`, 'info');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  StudentPortal.init();
});

window.StudentPortal = StudentPortal;
