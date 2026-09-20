/**
 * ASTRA CANTEEN - KITCHEN KANBAN CONTROLLER
 * Real-time kitchen dashboard, order preparation timers, 1-click progression
 */

const KitchenPortal = {
  stationFilter: 'all',
  searchQuery: '',

  async init() {
    this.setupFilters();
    await this.loadKitchenOrders();
  },

  setupFilters() {
    const stationSelect = document.getElementById('kitchen-station-filter');
    const searchInput = document.getElementById('kitchen-search-input');

    if (stationSelect) {
      stationSelect.addEventListener('change', (e) => {
        this.stationFilter = e.target.value;
        this.renderKanban();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderKanban();
      });
    }
  },

  async loadKitchenOrders() {
    try {
      const res = await fetch(`${AppState.apiBase}/api/orders`);
      if (res.ok) {
        AppState.kitchenOrders = await res.json();
        this.renderKanban();
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    }
  },

  renderKanban() {
    let orders = AppState.kitchenOrders;

    // Apply Station Filter
    if (this.stationFilter === 'hot') {
      orders = orders.filter(o => o.items.some(i => !i.name.toLowerCase().includes('coffee') && !i.name.toLowerCase().includes('tea') && !i.name.toLowerCase().includes('juice') && !i.name.toLowerCase().includes('lassi')));
    } else if (this.stationFilter === 'cold') {
      orders = orders.filter(o => o.items.some(i => i.name.toLowerCase().includes('coffee') || i.name.toLowerCase().includes('tea') || i.name.toLowerCase().includes('juice') || i.name.toLowerCase().includes('lassi') || i.name.toLowerCase().includes('puff') || i.name.toLowerCase().includes('samosa')));
    }

    // Apply Search Query Filter
    if (this.searchQuery) {
      orders = orders.filter(o => 
        o.token_number.toLowerCase().includes(this.searchQuery) ||
        o.student_name.toLowerCase().includes(this.searchQuery) ||
        o.student_id.toLowerCase().includes(this.searchQuery)
      );
    }

    const colPlaced = orders.filter(o => o.status === 'PLACED');
    const colPrep = orders.filter(o => o.status === 'PREPARING');
    const colReady = orders.filter(o => o.status === 'READY_FOR_PICKUP');
    const colDone = orders.filter(o => o.status === 'PICKED_UP');

    // Update column counters
    this.updateCounter('col-placed-count', colPlaced.length);
    this.updateCounter('col-prep-count', colPrep.length);
    this.updateCounter('col-ready-count', colReady.length);
    this.updateCounter('col-done-count', colDone.length);

    // Render cards into column bodies
    this.renderColumn('kanban-col-placed', colPlaced, 'PLACED');
    this.renderColumn('kanban-col-prep', colPrep, 'PREPARING');
    this.renderColumn('kanban-col-ready', colReady, 'READY_FOR_PICKUP');
    this.renderColumn('kanban-col-done', colDone.slice(0, 8), 'PICKED_UP'); // show last 8 completed
  },

  updateCounter(elementId, count) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = count;
  },

  renderColumn(elementId, ordersList, status) {
    const col = document.getElementById(elementId);
    if (!col) return;

    if (ordersList.length === 0) {
      col.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-dim); font-size: 0.85rem;">
          No orders in this stage
        </div>
      `;
      return;
    }

    col.innerHTML = ordersList.map(order => {
      let actionBtn = '';
      if (status === 'PLACED') {
        actionBtn = `
          <button class="k-action-btn" onclick="KitchenPortal.updateStatus('${order.id}', 'PREPARING')">
            <span>🍳</span> Start Cooking
          </button>
        `;
      } else if (status === 'PREPARING') {
        actionBtn = `
          <button class="k-action-btn ready-btn" onclick="KitchenPortal.updateStatus('${order.id}', 'READY_FOR_PICKUP')">
            <span>🔔</span> Mark Ready
          </button>
        `;
      } else if (status === 'READY_FOR_PICKUP') {
        actionBtn = `
          <button class="k-action-btn" style="background: #10b981;" onclick="KitchenPortal.updateStatus('${order.id}', 'PICKED_UP')">
            <span>✅</span> Confirm Handover
          </button>
        `;
      }

      return `
        <div class="kitchen-card ${status === 'PREPARING' ? 'urgent' : ''}" id="k-card-${order.id}">
          <div class="k-card-header">
            <div>
              <span class="k-token">${order.token_number}</span>
              <div class="k-student-meta">
                <strong>${order.student_name}</strong> (${order.student_id})
              </div>
            </div>
            <span class="k-slot-badge">${order.pickup_slot_label}</span>
          </div>

          <div class="k-items-box">
            ${order.items.map(i => `
              <div class="k-item-line">
                <span><span class="k-item-qty">${i.quantity}x</span>${i.name}</span>
                <span style="color: var(--text-muted); font-size: 0.78rem;">${i.dietary}</span>
              </div>
            `).join('')}
          </div>

          ${order.special_instructions ? `
            <div class="k-special-instructions">
              ⚠️ Note: ${order.special_instructions}
            </div>
          ` : ''}

          <div class="k-card-footer">
            <span class="k-elapsed-time">Ordered: ${order.created_at}</span>
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');
  },

  async updateStatus(orderId, newStatus) {
    try {
      const res = await fetch(`${AppState.apiBase}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const updated = await res.json();
        showToast(`Order ${updated.token_number} moved to ${newStatus.replace(/_/g, ' ')}`, 'success');
        await this.loadKitchenOrders();
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      showToast('Status update failed', 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  KitchenPortal.init();
});

window.KitchenPortal = KitchenPortal;
