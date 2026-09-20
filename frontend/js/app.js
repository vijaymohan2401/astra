/**
 * ASTRA CANTEEN - CORE APPLICATION CONTROLLER
 * State management, WebSocket synchronization, audio chimes, navigation
 */

  const AppState = {
  apiBase: 'https://canteenmanagement-vert.vercel.app',
  wsUrl: 'wss://canteenmanagement-vert.vercel.app/ws',
  ws: null,
  currentView: 'student',
  soundEnabled: true,
  audioCtx: null,

  // Student State
  menuItems: [],
  cart: {}, // { itemId: { item, quantity, notes } }
  slots: [],
  selectedSlotId: null,
  activeOrder: null, // Currently tracked order

  // Staff State
  kitchenOrders: [],
  analyticsData: null
};

// Audio Synthesizer (Web Audio API - reliable, no external files)
function initAudio() {
  if (!AppState.audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      AppState.audioCtx = new AudioContext();
    }
  }
  if (AppState.audioCtx && AppState.audioCtx.state === 'suspended') {
    AppState.audioCtx.resume();
  }
}

function playTone(freq, type = 'sine', duration = 0.2, startTime = 0) {
  if (!AppState.soundEnabled || !AppState.audioCtx) return;
  try {
    const osc = AppState.audioCtx.createOscillator();
    const gain = AppState.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, AppState.audioCtx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0.15, AppState.audioCtx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, AppState.audioCtx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(AppState.audioCtx.destination);
    osc.start(AppState.audioCtx.currentTime + startTime);
    osc.stop(AppState.audioCtx.currentTime + startTime + duration);
  } catch (e) {
    console.error('Audio playback error', e);
  }
}

function playSoundChime(soundType) {
  initAudio();
  if (soundType === 'new_order') {
    // Pleasant dual chime for new incoming order in kitchen
    playTone(587.33, 'triangle', 0.25, 0);    // D5
    playTone(880.00, 'triangle', 0.35, 0.15); // A5
  } else if (soundType === 'ready') {
    // Upbeat fanfare for student: Order Ready!
    playTone(523.25, 'sine', 0.18, 0);    // C5
    playTone(659.25, 'sine', 0.18, 0.12); // E5
    playTone(783.99, 'sine', 0.3, 0.24);  // G5
  } else if (soundType === 'success') {
    // Scanner pickup validated
    playTone(659.25, 'sine', 0.15, 0);    // E5
    playTone(1046.50, 'sine', 0.35, 0.12); // C6
  } else if (soundType === 'chime') {
    // Gentle positive coupon chime
    playTone(523.25, 'sine', 0.15, 0);    // C5
    playTone(659.25, 'sine', 0.25, 0.1);  // E5
  } else if (soundType === 'error') {
    // Duplicate or invalid token alert
    playTone(220.00, 'sawtooth', 0.25, 0); // A3
    playTone(185.00, 'sawtooth', 0.3, 0.15); // F#3
  }
}

// Navigation & Tab Switching
function switchView(viewName) {
  AppState.currentView = viewName;

  // Update tabs
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Update view sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${viewName}`);
  });

  // Refresh view data
  if (viewName === 'student') {
    window.StudentPortal?.renderMenu();
  } else if (viewName === 'tracker') {
    window.TrackerPortal?.renderActiveOrder();
  } else if (viewName === 'kitchen') {
    window.KitchenPortal?.loadKitchenOrders();
  } else if (viewName === 'scanner') {
    window.ScannerPortal?.initScannerView();
  } else if (viewName === 'stock') {
    window.StockPortal?.loadStockTable();
  } else if (viewName === 'analytics') {
    window.AnalyticsPortal?.loadAnalytics();
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// WebSocket Connection
function initWebSocket() {
  try {
    const ws = new WebSocket(AppState.wsUrl);

    ws.onopen = () => {
      console.log('Connected to Astra Live WebSocket');
      const pill = document.getElementById('header-live-text');
      if (pill) pill.textContent = 'Live Synced';
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleWebSocketEvent(payload);
      } catch (err) {
        console.warn('WS Message parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WS Disconnected. Reconnecting in 3s...');
      const pill = document.getElementById('header-live-text');
      if (pill) pill.textContent = 'Reconnecting...';
      setTimeout(initWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('WS Error:', err);
      ws.close();
    };

    AppState.ws = ws;
  } catch (err) {
    console.error('Failed to initialize WebSocket:', err);
  }
}

function handleWebSocketEvent(msg) {
  const { event, data } = msg;

  if (event === 'new_order') {
    // Kitchen receives live order alert
    playSoundChime('new_order');
    showToast(`🔔 Kitchen: New order ${data.order.token_number} placed!`, 'warning');
    if (window.KitchenPortal) window.KitchenPortal.loadKitchenOrders();
    if (window.AnalyticsPortal) window.AnalyticsPortal.loadAnalytics();
  } 
  else if (event === 'order_status_updated') {
    // Check if it's current student's active order
    if (AppState.activeOrder && AppState.activeOrder.id === data.order_id) {
      AppState.activeOrder = data.order;
      if (window.TrackerPortal) window.TrackerPortal.renderActiveOrder();
      
      if (data.status === 'READY_FOR_PICKUP') {
        playSoundChime('ready');
        showToast(`🎉 Your Food is Ready! Collect with Token ${data.token_number} at Counter`, 'success');
      } else if (data.status === 'PICKED_UP') {
        playSoundChime('success');
        showToast(`✨ Food Picked Up! Enjoy your meal!`, 'success');
      }
    }

    if (window.KitchenPortal) window.KitchenPortal.loadKitchenOrders();
    if (window.AnalyticsPortal) window.AnalyticsPortal.loadAnalytics();
  }
  else if (event === 'stock_updated') {
    showToast(`Stock updated: ${data.item_name} is ${data.is_available ? 'now In Stock' : 'Sold Out'}`, 'info');
    if (window.StudentPortal) window.StudentPortal.refreshMenuStock(data);
    if (window.StockPortal) window.StockPortal.loadStockTable();
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Sound toggle button
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      AppState.soundEnabled = !AppState.soundEnabled;
      soundBtn.innerHTML = AppState.soundEnabled ? '🔔' : '🔕';
      showToast(AppState.soundEnabled ? 'Sound alerts enabled' : 'Sound alerts muted', 'info');
      initAudio();
    });
  }

  // Navigation tab clicks
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      switchView(btn.dataset.view);
    });
  });

  // Connect WebSocket
  initWebSocket();

  // Load initial view
  switchView('student');
});

window.AppState = AppState;
window.switchView = switchView;
window.showToast = showToast;
window.playSoundChime = playSoundChime;
