/**
 * ASTRA CANTEEN - COUNTER STAFF QR SCANNER & TOKEN VERIFIER
 * Validates student QR passes, checks items, prevents duplicate pickup
 */

const ScannerPortal = {
  videoStream: null,

  init() {
    this.setupEventListeners();
  },

  initScannerView() {
    // Fill sample quick tokens if available
    const quickBar = document.getElementById('scanner-quick-tokens');
    if (quickBar) {
      const readyOrders = AppState.kitchenOrders.filter(o => o.status === 'READY_FOR_PICKUP' || o.status === 'PREPARING');
      if (readyOrders.length > 0) {
        quickBar.innerHTML = `
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-right: 0.5rem;">Quick Test Tokens:</span>
          ${readyOrders.slice(0, 3).map(o => `
            <button class="pass-action-btn" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;" 
                    onclick="ScannerPortal.verifyCode('${o.token_number}')">
              ${o.token_number} (${o.student_name.split(' ')[0]})
            </button>
          `).join('')}
        `;
      } else {
        quickBar.innerHTML = '';
      }
    }
  },

  setupEventListeners() {
    const verifyBtn = document.getElementById('scanner-verify-btn');
    const inputEl = document.getElementById('scanner-token-input');

    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        const val = inputEl?.value.trim();
        if (val) this.verifyCode(val);
      });
    }

    if (inputEl) {
      inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const val = inputEl.value.trim();
          if (val) this.verifyCode(val);
        }
      });
    }
  },

  async verifyCode(tokenOrPayload) {
    const inputEl = document.getElementById('scanner-token-input');
    if (inputEl) inputEl.value = tokenOrPayload;

    const resultCard = document.getElementById('verification-result-card');
    if (!resultCard) return;

    try {
      const res = await fetch(`${AppState.apiBase}/api/scanner/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_query: tokenOrPayload })
      });

      if (!res.ok) throw new Error('Verification request failed');

      const data = await res.json();
      this.displayVerificationResult(data);

      if (data.success) {
        playSoundChime('success');
        showToast('Token Verified! Food handed over to student.', 'success');
      } else {
        playSoundChime('error');
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error('Scan error:', err);
      showToast('Network error during token verification', 'error');
    }
  },

  displayVerificationResult(data) {
    const resultCard = document.getElementById('verification-result-card');
    if (!resultCard) return;

    resultCard.classList.remove('success', 'error', 'show');
    resultCard.classList.add('show', data.success ? 'success' : 'error');

    const order = data.order;

    if (!data.success) {
      resultCard.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
          <div style="font-size: 2.5rem;">❌</div>
          <div>
            <h3 style="color: #f87171; font-size: 1.25rem; font-weight: 800; margin-bottom: 0.35rem;">
              VERIFICATION REJECTED
            </h3>
            <p style="font-size: 0.92rem; color: #fca5a5; margin-bottom: 0.75rem;">
              ${data.message}
            </p>
            ${order ? `
              <div style="background: rgba(0,0,0,0.3); padding: 0.6rem 0.85rem; border-radius: 8px; font-size: 0.82rem;">
                <strong>Token:</strong> ${order.token_number} &nbsp;|&nbsp; 
                <strong>Student:</strong> ${order.student_name} (${order.student_id}) &nbsp;|&nbsp;
                <strong>Current Status:</strong> ${order.status}
              </div>
            ` : ''}
          </div>
        </div>
      `;
      return;
    }

    resultCard.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(16, 185, 129, 0.3); padding-bottom: 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #10b981; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white;">
              ✓
            </div>
            <div>
              <h3 style="color: #34d399; font-size: 1.3rem; font-weight: 900; margin-bottom: 0.15rem;">
                TOKEN VERIFIED • HAND OVER MEAL
              </h3>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${data.message}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 1.6rem; font-weight: 900; color: #38bdf8;">${order.token_number}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${order.pickup_slot_label}</div>
          </div>
        </div>

        <!-- Student Details Row -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; background: rgba(0,0,0,0.2); padding: 0.85rem 1rem; border-radius: 8px;">
          <div>
            <small style="display: block; font-size: 0.72rem; color: var(--text-muted);">STUDENT NAME</small>
            <strong style="font-size: 0.95rem;">${order.student_name}</strong>
          </div>
          <div>
            <small style="display: block; font-size: 0.72rem; color: var(--text-muted);">ROLL NUMBER</small>
            <strong style="font-size: 0.95rem;">${order.student_id}</strong>
          </div>
          <div>
            <small style="display: block; font-size: 0.72rem; color: var(--text-muted);">PAYMENT STATUS</small>
            <strong style="color: #34d399; font-size: 0.95rem;">PAID (₹${order.total_amount.toFixed(2)})</strong>
          </div>
        </div>

        <!-- Items Checklist for Counter Staff -->
        <div>
          <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">
            Dishes to Package & Hand Over:
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.45rem;">
            ${order.items.map(item => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.85rem; background: rgba(255,255,255,0.04); border-radius: 6px;">
                <span>
                  <strong style="color: #38bdf8; font-size: 0.95rem; margin-right: 0.5rem;">${item.quantity}x</strong>
                  <span style="font-weight: 600;">${item.name}</span>
                </span>
                <span style="font-size: 0.78rem; color: #a5b4fc; background: rgba(99,102,241,0.15); padding: 0.2rem 0.5rem; border-radius: 4px;">
                  ${item.dietary.toUpperCase()}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        ${order.special_instructions ? `
          <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); padding: 0.6rem 0.85rem; border-radius: 6px; font-size: 0.82rem; color: #fbbf24;">
            <strong>Student Note:</strong> ${order.special_instructions}
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
          <button class="scanner-verify-btn" style="background: #10b981;" onclick="ScannerPortal.resetResult()">
            Ready for Next Student
          </button>
        </div>
      </div>
    `;
  },

  resetResult() {
    const inputEl = document.getElementById('scanner-token-input');
    const resultCard = document.getElementById('verification-result-card');
    if (inputEl) inputEl.value = '';
    if (resultCard) resultCard.classList.remove('show');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ScannerPortal.init();
});

window.ScannerPortal = ScannerPortal;
