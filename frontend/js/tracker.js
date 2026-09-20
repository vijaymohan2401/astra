/**
 * ASTRA CANTEEN - DIGITAL QR TOKEN PASS & LIVE TRACKER
 * Renders boarding pass ticket, scannable QR code, and real-time order progression
 */

const TrackerPortal = {
  countdownInterval: null,

  init() {
    this.renderActiveOrder();
  },

  async renderActiveOrder() {
    const container = document.getElementById('tracker-content-area');
    if (!container) return;

    // If no order currently placed, fetch most recent order or show empty
    if (!AppState.activeOrder) {
      try {
        const res = await fetch(`${AppState.apiBase}/api/orders`);
        if (res.ok) {
          const orders = await res.json();
          if (orders && orders.length > 0) {
            AppState.activeOrder = orders[0];
          }
        }
      } catch (e) {}
    }

    const order = AppState.activeOrder;

    if (!order) {
      container.innerHTML = `
        <div class="tracker-empty">
          <div class="tracker-empty-icon">🎫</div>
          <h2>No Active Pickup Pass</h2>
          <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">Pre-order your favorite meal from the menu to receive your instant QR pickup pass!</p>
          <button class="add-cart-btn" style="margin: 0 auto;" onclick="switchView('student')">Browse Canteen Menu</button>
        </div>
      `;
      return;
    }

    // Determine Stepper States
    const statusOrder = ['PLACED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'];
    const currentIndex = statusOrder.indexOf(order.status);
    
    let stepPercent = '10%';
    if (currentIndex === 1) stepPercent = '42%';
    if (currentIndex === 2) stepPercent = '72%';
    if (currentIndex >= 3) stepPercent = '100%';

    let statusHeadline = 'Order Placed & Queued';
    let statusClass = 'placed';
    if (order.status === 'PREPARING') {
      statusHeadline = 'Chef is Preparing Your Food in Kitchen 🍳';
      statusClass = 'preparing';
    } else if (order.status === 'READY_FOR_PICKUP') {
      statusHeadline = 'Food is Packaged & Ready at Counter! 🔔';
      statusClass = 'ready';
    } else if (order.status === 'PICKED_UP') {
      statusHeadline = 'Picked Up & Verified! Enjoy Your Meal! 😋';
      statusClass = 'picked';
    }

    container.innerHTML = `
      <div class="tracker-container">
        <!-- Digital Boarding Pass Token -->
        <div class="token-pass-card">
          <div class="pass-header">
            <div class="pass-header-left">
              <span class="pass-badge">SMART CAMPUS PASS</span>
              <span style="font-weight: 700; font-size: 0.85rem; opacity: 0.9;">ASTRA CANTEEN COUNTER #2</span>
            </div>
            <div class="pass-token-large">${order.token_number}</div>
          </div>

          <div class="pass-body">
            <!-- Left Info Area -->
            <div class="pass-info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <label>Student Name</label>
                  <span>${order.student_name}</span>
                </div>
                <div class="info-cell">
                  <label>Roll Number</label>
                  <span>${order.student_id}</span>
                </div>
              </div>

              <div class="slot-highlight-box">
                <div class="slot-box-left">
                  <small>SCHEDULED COUNTER PICKUP</small>
                  <strong>${order.pickup_slot_label}</strong>
                </div>
                <div class="countdown-timer-chip" id="slot-countdown">
                  ⏱️ Ready by ${order.estimated_ready_time}
                </div>
              </div>

              <div class="info-row">
                <div class="info-cell">
                  <label>Payment Method</label>
                  <span>${order.payment_method.replace('_', ' ')} (PAID)</span>
                </div>
                <div class="info-cell">
                  <label>Order Time</label>
                  <span>${order.created_at}</span>
                </div>
              </div>

              ${order.special_instructions ? `
                <div class="info-cell">
                  <label>Kitchen Instruction</label>
                  <span style="font-size: 0.88rem; color: #fbbf24;">"${order.special_instructions}"</span>
                </div>
              ` : ''}
            </div>

            <!-- Right QR Code Area -->
            <div class="pass-qr-side">
              <div class="qr-frame">
                <img src="${order.qr_code_data_uri}" alt="Token QR Pass" id="order-qr-image">
              </div>
              <div class="qr-caption">Show at Counter Scanner</div>
              <div class="qr-subtext">Instant verification & crowd-free handoff</div>
            </div>
          </div>

          <!-- Live Order Status Stepper -->
          <div class="pass-status-section">
            <div class="status-headline-wrap">
              <div class="status-headline">
                <span>⚡</span> ${statusHeadline}
              </div>
              <span class="status-badge-chip ${statusClass}">${order.status.replace(/_/g, ' ')}</span>
            </div>

            <div class="stepper-container">
              <div class="stepper-progress-bar-bg"></div>
              <div class="stepper-progress-bar-fill" style="width: ${stepPercent};"></div>

              <div class="step-node ${currentIndex >= 0 ? (currentIndex === 0 ? 'active' : 'completed') : ''}">
                <div class="step-circle">1</div>
                <span class="step-title">Placed</span>
              </div>

              <div class="step-node ${currentIndex >= 1 ? (currentIndex === 1 ? 'active' : 'completed') : ''}">
                <div class="step-circle">🍳</div>
                <span class="step-title">Preparing</span>
              </div>

              <div class="step-node ${currentIndex >= 2 ? (currentIndex === 2 ? 'active' : 'completed') : ''}">
                <div class="step-circle">🔔</div>
                <span class="step-title">At Counter</span>
              </div>

              <div class="step-node ${currentIndex >= 3 ? 'completed active' : ''}">
                <div class="step-circle">✨</div>
                <span class="step-title">Collected</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Itemized Tax Invoice -->
        <div class="invoice-card">
          <div class="invoice-header">
            <div class="invoice-title">
              <span>🧾</span> Itemized Digital Tax Invoice
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">#${order.id}</span>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>
                    <strong>${item.name}</strong>
                    <span style="font-size: 0.75rem; margin-left: 0.35rem;">(${item.dietary})</span>
                  </td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700;">₹${item.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="invoice-summary">
            <div class="summary-line">
              <span>Subtotal</span>
              <span>₹${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-line">
              <span>GST (5% SGST + CGST)</span>
              <span>₹${order.tax.toFixed(2)}</span>
            </div>
            <div class="summary-line grand-total">
              <span>Total Paid</span>
              <span style="color: #38bdf8;">₹${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${order.status === 'READY_FOR_PICKUP' ? `
          <div class="ready-notification-banner">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.6rem;">🔔</span>
              <div>
                <div class="ready-notification-text">TOKEN ${order.token_number} IS READY AT COUNTER #2!</div>
                <div style="font-size: 0.78rem; color: #a7f3d0; opacity: 0.9;">Please show your QR pass to the express counter scanner for instant handoff.</div>
              </div>
            </div>
            <button class="pass-action-btn primary" onclick="playSoundChime('ready')">🔊 Sound Chime</button>
          </div>
        ` : ''}

        <!-- Action Bar -->
        <div class="pass-actions-toolbar">
          <button class="pass-action-btn" onclick="TrackerPortal.simulateNextStatus('${order.id}')" title="Test real-time status progression in demo">
            <span>⚡</span> Advance Status
          </button>
          <button class="pass-action-btn primary" onclick="TrackerPortal.copyPassSummary()">
            <span>📋</span> Copy Token Details
          </button>
          <button class="pass-action-btn" onclick="window.print()">
            <span>🖨️</span> Print / Save Pass
          </button>
          <button class="pass-action-btn" onclick="StudentPortal.openHistoryModal()">
            <span>📜</span> All My Passes
          </button>
          <button class="pass-action-btn" style="background: var(--accent-gradient); color: #fff;" onclick="switchView('student')">
            <span>+</span> Order More
          </button>
        </div>
      </div>
    `;
  },

  copyPassSummary() {
    if (!AppState.activeOrder) return;
    const o = AppState.activeOrder;
    const items = o.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    const text = `🎫 ASTRA PASS: ${o.token_number}\nStudent: ${o.student_name} (${o.student_id})\nSlot: ${o.pickup_slot_label}\nStatus: ${o.status}\nDishes: ${items}\nTotal: ₹${o.total_amount.toFixed(2)}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied token details to clipboard!', 'success');
      }).catch(() => {
        showToast(`Token: ${o.token_number} | Slot: ${o.pickup_slot_label}`, 'info');
      });
    } else {
      showToast(`Token: ${o.token_number} | Slot: ${o.pickup_slot_label}`, 'info');
    }
  },

  async simulateNextStatus(orderId) {
    if (!AppState.activeOrder) return;
    const current = AppState.activeOrder.status;
    let nextStatus = 'PREPARING';
    if (current === 'PLACED') nextStatus = 'PREPARING';
    else if (current === 'PREPARING') nextStatus = 'READY_FOR_PICKUP';
    else if (current === 'READY_FOR_PICKUP') nextStatus = 'PICKED_UP';
    else if (current === 'PICKED_UP') nextStatus = 'PLACED';

    try {
      const res = await fetch(`${AppState.apiBase}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        AppState.activeOrder = await res.json();
        this.renderActiveOrder();
        if (nextStatus === 'READY_FOR_PICKUP') {
          playSoundChime('ready');
        }
        showToast(`Status updated to ${nextStatus}`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  TrackerPortal.init();
});

window.TrackerPortal = TrackerPortal;
