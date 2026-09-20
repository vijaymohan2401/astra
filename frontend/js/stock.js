/**
 * ASTRA CANTEEN - STOCK MANAGER & CROWD ANALYTICS CONTROLLER
 * Live item availability toggles and queue reduction analytics
 */

const StockPortal = {
  async init() {
    await this.loadStockTable();
  },

  async loadStockTable() {
    const tableBody = document.getElementById('stock-table-body');
    if (!tableBody) return;

    try {
      const res = await fetch(`${AppState.apiBase}/api/menu`);
      if (res.ok) {
        const items = await res.json();
        AppState.menuItems = items;

        tableBody.innerHTML = items.map(item => `
          <tr id="stock-row-${item.id}">
            <td style="display: flex; align-items: center; gap: 0.85rem;">
              <img src="${item.image_url}" alt="${item.name}" 
                   style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;">
              <div>
                <strong>${item.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${item.category} • ₹${item.price.toFixed(2)}</div>
              </div>
            </td>

            <td>
              <span class="diet-dot ${item.dietary === 'veg' ? 'veg' : 'non-veg'}" style="display: inline-block; margin-right: 0.35rem;"></span>
              ${item.dietary.toUpperCase()}
            </td>

            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="qty-btn" style="width: 22px; height: 22px; font-size: 0.75rem;"
                        onclick="StockPortal.adjustStockQuantity('${item.id}', -5)">-</button>
                <span id="stock-qty-${item.id}" style="font-weight: 700; min-width: 24px; text-align: center;">
                  ${item.stock_quantity}
                </span>
                <button class="qty-btn" style="width: 22px; height: 22px; font-size: 0.75rem;"
                        onclick="StockPortal.adjustStockQuantity('${item.id}', 5)">+</button>
              </div>
            </td>

            <td>
              <span id="stock-badge-${item.id}" class="stock-tag-float ${item.is_available ? 'in-stock' : 'out-of-stock'}" style="position: static;">
                ${item.is_available ? '🟢 In Stock' : '🚫 Sold Out'}
              </span>
            </td>

            <td>
              <label class="stock-toggle-switch">
                <input type="checkbox" ${item.is_available ? 'checked' : ''} 
                       onchange="StockPortal.toggleStockAvailability('${item.id}', this.checked)">
                <span class="stock-slider"></span>
              </label>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading stock:', err);
    }
  },

  async toggleStockAvailability(itemId, isAvailable) {
    try {
      const item = AppState.menuItems.find(i => i.id === itemId);
      const newQty = isAvailable ? (item && item.stock_quantity > 0 ? item.stock_quantity : 25) : 0;

      const res = await fetch(`${AppState.apiBase}/api/menu/${itemId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_available: isAvailable,
          stock_quantity: newQty
        })
      });

      if (res.ok) {
        const updated = await res.json();
        showToast(`${updated.name} marked ${isAvailable ? 'IN STOCK' : 'SOLD OUT'}`, isAvailable ? 'success' : 'warning');
        await this.loadStockTable();
      }
    } catch (err) {
      console.error('Failed to update stock toggle:', err);
      showToast('Failed to update stock', 'error');
    }
  },

  async adjustStockQuantity(itemId, delta) {
    const item = AppState.menuItems.find(i => i.id === itemId);
    if (!item) return;

    const newQty = Math.max(0, item.stock_quantity + delta);
    const isAvail = newQty > 0;

    try {
      const res = await fetch(`${AppState.apiBase}/api/menu/${itemId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_available: isAvail,
          stock_quantity: newQty
        })
      });

      if (res.ok) {
        await this.loadStockTable();
      }
    } catch (err) {
      console.error('Failed to adjust quantity:', err);
    }
  }
};

const AnalyticsPortal = {
  async init() {
    await this.loadAnalytics();
  },

  async loadAnalytics() {
    try {
      const res = await fetch(`${AppState.apiBase}/api/analytics`);
      if (res.ok) {
        const data = await res.json();
        AppState.analyticsData = data;
        this.renderAnalytics(data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  },

  renderAnalytics(data) {
    // Header traffic status
    const trafficPill = document.getElementById('header-traffic-status');
    if (trafficPill) {
      trafficPill.textContent = `Counter: ${data.counter_traffic.status}`;
    }

    // Metric Cards
    const queueVal = document.getElementById('analytics-queue-val');
    const queueDesc = document.getElementById('analytics-queue-desc');
    if (queueVal) queueVal.textContent = `${data.counter_traffic.active_at_counter} Students`;
    if (queueDesc) queueDesc.textContent = `Avg wait: ~${data.counter_traffic.estimated_wait_seconds}s per pickup`;

    const reductionVal = document.getElementById('analytics-reduction-val');
    if (reductionVal) reductionVal.textContent = `${data.crowd_reduction_stats.queue_reduction_percentage}%`;

    const prepVal = document.getElementById('analytics-prep-val');
    if (prepVal) prepVal.textContent = `${data.kitchen_metrics.avg_prep_time_mins}m`;

    const revenueVal = document.getElementById('analytics-revenue-val');
    if (revenueVal) revenueVal.textContent = `₹${data.financials.total_revenue.toFixed(2)}`;

    // Slot Distribution
    const slotBarsContainer = document.getElementById('analytics-slot-bars');
    if (slotBarsContainer && data.slots_distribution) {
      slotBarsContainer.innerHTML = data.slots_distribution.map(slot => {
        let barColor = '#10b981';
        if (slot.occupancy_percent > 75) barColor = '#ef4444';
        else if (slot.occupancy_percent > 40) barColor = '#f59e0b';

        return `
          <div style="margin-bottom: 0.85rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.25rem;">
              <span style="font-weight: 700;">${slot.label}</span>
              <span style="color: var(--text-muted);">${slot.booked_count}/${slot.capacity} Booked (${slot.occupancy_percent}%)</span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
              <div style="width: ${slot.occupancy_percent}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.4s ease;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Popular items
    const popularContainer = document.getElementById('analytics-popular-items');
    if (popularContainer && data.popular_items) {
      popularContainer.innerHTML = data.popular_items.map((item, index) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 0.5rem;">
          <span style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem;">
            <span style="font-weight: 800; color: #6366f1;">#${index + 1}</span>
            <span>${item.name}</span>
          </span>
          <span style="font-weight: 700; color: #34d399; font-size: 0.85rem;">${item.count} orders</span>
        </div>
      `).join('');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  StockPortal.init();
  AnalyticsPortal.init();
});

window.StockPortal = StockPortal;
window.AnalyticsPortal = AnalyticsPortal;
