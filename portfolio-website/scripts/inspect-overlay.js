/**
 * inspect-overlay.js — Reusable InspectOverlay for simulation cards.
 * Attaches a JSON metadata overlay to each .s2-sim-card[data-sim-id]
 * triggered by a ⚙ INSPECT button injected into each card.
 */

/* ── Simulation metadata ──────────────────────────────────── */
const SIM_METADATA = {
  sim01: {
    simulation_type: "AC Noise Analysis",
    theorem_validated: "Theorem 6.4 — Isotropic Thermal Dissipation",
    cell_resistance_Rcell: "1000 Ω",
    temperature_T: "300 K",
    supply_voltage: "1.0 V",
    adc_resolution_bits: 10,
    V_LSB: "9.76e-4 V",
    simulated_V_noise: "2.77e-6 V",
    suppression_ratio: "352x below LSB",
    epsilon_arith_bound: "1.004e-12",
    result: "VALIDATED ✓"
  },
  sim02: {
    simulation_type: "Transient — Mutual Inductive Coupling",
    theorem_validated: "Theorem 6.3 — CHS Electromagnetic Decoupling",
    k_coupling_unshielded: 0.01,
    k_coupling_shielded: 1e-7,
    delta_shield: 1e-5,
    interconnect_length_Lz: "100 μm",
    shield_radius_rs: "50 nm",
    line_separation_D: "200 nm",
    dI_dt: "1e7 A/s",
    V_noise_shielded: "2.77e-6 V",
    V_LSB: "9.76e-4 V",
    suppression_factor: "100000x",
    result: "VALIDATED ✓"
  },
  sim03: {
    simulation_type: "Transient — Analog Drift vs Digital Restore",
    lemma_validated: "Lemma 6.2 — Zero-Drift Rollback via DASM",
    simulation_duration: "200 ns",
    drift_phase: "0 to 100 ns",
    rollback_trigger: "t = 100 ns",
    restore_phase: "100 ns to 200 ns",
    SRAM_BER: "< 1e-15",
    analog_drift_RMS_before: "accumulating (unbounded)",
    rollback_error_RMS_after: 0,
    E_error_rollback: "≡ 0 (exact)",
    result: "VALIDATED ✓"
  },
  sim04: {
    simulation_type: "Numerical — Online Eigenvalue Tracking",
    algorithm_validated: "Algorithm 1 — Quicksand Oja++",
    matrix_dimension_d: 10,
    subspace_rank_k: 3,
    delta_min_threshold: 0.05,
    adversarial_injection_start: 480,
    adversarial_injection_end: 600,
    GIM_trigger_epoch: 481,
    GIM_recovery_epoch: 603,
    false_positive_rate: 0,
    false_negative_rate: 0,
    total_epochs_simulated: 1000,
    result: "VALIDATED ✓"
  },
  sim05: {
    simulation_type: "Numerical — Stiefel Manifold Subspace Tracking",
    theorem_validated: "Theorem 3.2 — Event-Driven Subspace Tracking",
    initial_step_size_eta0: 0.010,
    adversarial_injection_epoch: 400,
    subspace_rank_k: 3,
    ambient_dimension_d: 50,
    QuicksandOja_convergence_epoch: 210,
    StandardOja_divergence_epoch: 412,
    speedup_factor: "4.2x faster convergence",
    residual_error_floor: "1.004e-12",
    asymptotic_bound_order: "O(eta_t * B^4 / delta_k)",
    result: "VALIDATED ✓"
  }
};

/* ── Inject styles once ───────────────────────────────────── */
(function injectStyles() {
  if (document.getElementById('inspect-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'inspect-overlay-styles';
  style.textContent = `
    /* ── Inspect button ── */
    .s2-inspect-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 9px;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      background: var(--substrate);
      border: 1px solid var(--text-muted);
      padding: 3px 7px;
      cursor: pointer;
      text-transform: uppercase;
      transition: color 0.2s, border-color 0.2s;
      z-index: 5;
      line-height: 1.4;
    }
    .s2-inspect-btn:hover {
      color: var(--spectral-1);
      border-color: var(--spectral-1);
    }

    /* ── Overlay panel ── */
    .inspect-overlay {
      position: absolute;
      inset: 0;
      background: rgba(5, 5, 12, 0.96);
      backdrop-filter: blur(4px);
      border: 1px solid var(--spectral-1);
      border-radius: 4px;
      padding: 20px;
      z-index: 10;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      color: var(--text-primary);
      overflow-y: auto;
      box-sizing: border-box;
      /* Animate-in state */
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }
    .inspect-overlay.inspect-overlay-visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    /* ── Close button ── */
    .inspect-overlay-close {
      position: absolute;
      top: 8px;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      z-index: 11;
    }
    .inspect-overlay-close:hover { color: var(--text-primary); }

    /* ── JSON content ── */
    .inspect-overlay-content { margin-top: 4px; }
    .inspect-json {
      margin: 0;
      padding: 0;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.9;
      font-size: 10.5px;
      font-family: 'IBM Plex Mono', monospace;
    }
    .ij-key    { color: var(--spectral-1); }
    .ij-string { color: var(--neural-green); }
    .ij-number { color: var(--gold); }
    .ij-bool   { color: var(--spectral-2); }
    .ij-null   { color: var(--text-muted); }

    /* ── Mobile: full-screen overlay ── */
    @media (max-width: 768px) {
      .inspect-overlay {
        position: fixed;
        inset: 0;
        border-radius: 0;
        z-index: 9999;
        padding: 24px 20px;
      }
      .s2-inspect-btn {
        padding: 6px 12px;
        font-size: 10px;
      }
    }

    /* ── no-blur class (set by performance.js) ── */
    .no-blur .inspect-overlay {
      backdrop-filter: none !important;
    }
  `;
  document.head.appendChild(style);
})();

/* ── InspectOverlay class ─────────────────────────────────── */
class InspectOverlay {
  constructor(cardEl, jsonData) {
    this.card    = cardEl;
    this.data    = jsonData;
    this.overlay = null;
    this._onKeydown      = this._onKeydown.bind(this);
    this._onClickOutside = this._onClickOutside.bind(this);
    this._build();
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'inspect-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Simulation Parameters');

    // Close ×
    const closeBtn = document.createElement('button');
    closeBtn.className = 'inspect-overlay-close';
    closeBtn.setAttribute('aria-label', 'Close inspection panel');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });

    // Content
    const content = document.createElement('div');
    content.className = 'inspect-overlay-content';
    content.innerHTML = this._renderJSON(this.data);

    this.overlay.appendChild(closeBtn);
    this.overlay.appendChild(content);
    this.card.appendChild(this.overlay);
  }

  _renderJSON(data) {
    const entries = Object.entries(data);
    let rows = '';
    entries.forEach(([key, value], i) => {
      const comma = i < entries.length - 1 ? ',' : '';
      const kh = `<span class="ij-key">"${this._esc(key)}"</span>`;
      let vh;
      if (typeof value === 'string') {
        vh = `<span class="ij-string">"${this._esc(value)}"</span>`;
      } else if (typeof value === 'number') {
        vh = `<span class="ij-number">${value}</span>`;
      } else if (typeof value === 'boolean') {
        vh = `<span class="ij-bool">${value}</span>`;
      } else if (value === null) {
        vh = `<span class="ij-null">null</span>`;
      } else {
        vh = `<span class="ij-string">"${this._esc(String(value))}"</span>`;
      }
      rows += `  ${kh}: ${vh}${comma}\n`;
    });
    return `<pre class="inspect-json">{\n${rows}}</pre>`;
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  open() {
    this.overlay.style.display = 'block';
    // RAF to allow display:block to paint before transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.overlay.classList.add('inspect-overlay-visible');
      });
    });
    document.addEventListener('keydown', this._onKeydown);
    // Delay click-outside to avoid immediate close on same click
    setTimeout(() => document.addEventListener('click', this._onClickOutside), 50);
  }

  close() {
    this.overlay.classList.remove('inspect-overlay-visible');
    const hide = () => { this.overlay.style.display = 'none'; };
    this.overlay.addEventListener('transitionend', hide, { once: true });
    // Fallback in case transitionend doesn't fire
    setTimeout(hide, 250);
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('click', this._onClickOutside);
  }

  _onKeydown(e) { if (e.key === 'Escape') this.close(); }

  _onClickOutside(e) {
    if (!this.overlay.contains(e.target) &&
        !e.target.classList.contains('s2-inspect-btn')) {
      this.close();
    }
  }
}

/* ── Initialize all sim cards ─────────────────────────────── */
function initInspectOverlays() {
  document.querySelectorAll('.s2-sim-card[data-sim-id]').forEach(card => {
    const simId = card.dataset.simId;
    const data  = SIM_METADATA[simId];
    if (!data) return;

    const overlay = new InspectOverlay(card, data);

    const btn = card.querySelector('.s2-inspect-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.open();
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInspectOverlays);
} else {
  initInspectOverlays();
}
