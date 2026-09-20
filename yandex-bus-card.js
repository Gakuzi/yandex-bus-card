class YandexBusCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      const card = document.createElement('ha-card');
      this.content = document.createElement('div');
      card.appendChild(this.content);
      this.appendChild(card);
      this._startTimeTicker();
    }
    this.updateView();
  }

  setConfig(config) {
    this._config = config ? JSON.parse(JSON.stringify(config)) : {};
    this.updateView();
  }

  disconnectedCallback() {
    if (this._timeTicker) clearInterval(this._timeTicker);
  }

  _startTimeTicker() {
    if (this._timeTicker) clearInterval(this._timeTicker);
    this._timeTicker = setInterval(() => {
      const timeElem = this.querySelector('#yb_clock');
      if (timeElem) {
        const now = new Date();
        timeElem.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }, 1000);
  }

  closeModal() {
    const modal = this.querySelector('.yb-modal-overlay');
    if (modal) modal.remove();
  }

  openModal(url, title) {
    this.closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'yb-modal-overlay';
    overlay.innerHTML = `
      <div class="yb-modal-backdrop"></div>
      <div class="yb-modal-container">
        <div class="yb-modal-header">
          <div class="yb-modal-title">
            <ha-icon icon="mdi:bus" style="--mdc-icon-size: 20px; color: #ffcc00;"></ha-icon>
            <span>${title}</span>
          </div>
          <button class="yb-modal-close" title="Закрыть">✕</button>
        </div>
        <div class="yb-modal-body">
          <iframe src="${url}" frameborder="0" allow="geolocation" allowfullscreen></iframe>
        </div>
      </div>
    `;

    overlay.querySelector('.yb-modal-backdrop').addEventListener('click', () => this.closeModal());
    overlay.querySelector('.yb-modal-close').addEventListener('click', () => this.closeModal());
    this.appendChild(overlay);
  }

  // Расчет оставшихся минут до времени "ЧЧ:ММ"
  _getMinutesLeft(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':');
    const targetH = parseInt(parts[0], 10);
    const targetM = parseInt(parts[1], 10);

    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();

    let diff = (targetH * 60 + targetM) - (curH * 60 + curM);
    if (diff < 0) diff += 1440; // перенос через полночь
    return diff;
  }

  updateView() {
    if (!this._hass || !this._config || !this.content) return;
    const entityId = this._config.entity;
    
    if (!entityId) {
      this.content.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #94a3b8; font-family: sans-serif;">
          <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 44px; color: #38bdf8; margin-bottom: 8px;"></ha-icon>
          <div style="font-size: 16px; font-weight: 600; color: #f8fafc;">Остановка не выбрана</div>
          <div style="font-size: 13px; margin-top: 4px;">Укажите сенсор остановки в настройках карточки</div>
        </div>
      `;
      return;
    }

    const stateObj = this._hass.states[entityId];
    if (!stateObj) {
      this.content.innerHTML = `<div style="padding: 18px; color: #ef4444; font-family: sans-serif;">Сущность <b>${entityId}</b> не найдена</div>`;
      return;
    }

    const attrs = stateObj.attributes || {};
    const stopName = this._config.title || attrs.stop_name || attrs.friendly_name || 'Остановка';
    const stopId = attrs.stop_id || '';
    
    let routes = attrs.routes || [];

    let selected = this._config.selected_buses || [];
    if (typeof selected === 'string') {
      selected = selected.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (Array.isArray(selected) && selected.length > 0) {
      routes = routes.filter(r => selected.includes(String(r.route)));
    }

    const mapStopUrl = stopId 
      ? `https://yandex.ru/maps/20/arkhangelsk/?masstransit%5BstopId%5D=stop__${stopId}&l=masstransit`
      : 'https://yandex.ru/maps/20/arkhangelsk/?l=masstransit';

    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Палитра акцентных цветов по маршрутам (как на макете)
    const routeColors = ['#f59e0b', '#38bdf8', '#34d399', '#a855f7', '#fb7185'];

    this.content.innerHTML = `
      <style>
        .yb-dashboard-card {
          background: #11141c;
          border-radius: 24px;
          padding: 22px;
          color: #ffffff;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .yb-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 0 4px;
        }
        .yb-stop-header {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .yb-stop-main-title {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .yb-clock-box {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 18px;
          font-weight: 600;
          color: #e2e8f0;
        }
        .yb-pulse-dot {
          width: 8px;
          height: 8px;
          background: #38bdf8;
          border-radius: 50%;
          box-shadow: 0 0 10px #38bdf8;
          animation: ybPulse 2s infinite;
        }
        @keyframes ybPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        .yb-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .yb-route-box {
          background: rgba(255, 255, 255, 0.035);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 18px;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
          position: relative;
        }
        .yb-route-box:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-1px);
        }

        .yb-left-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding-right: 14px;
        }
        .yb-badge-num {
          font-size: 26px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .yb-badge-time {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
          margin-top: 4px;
          text-transform: uppercase;
        }

        .yb-track-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .yb-route-meta {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .yb-route-meta-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          font-weight: 700;
        }
        .yb-route-dest {
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Линия движения с точками */
        .yb-line-wrap {
          position: relative;
          height: 38px;
          margin: 4px 0 2px 0;
          display: flex;
          align-items: center;
        }
        .yb-track-bg {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
        }
        .yb-track-progress {
          position: absolute;
          left: 0;
          height: 3px;
          border-radius: 3px;
          background-size: 200% 100%;
          animation: ybFlow 2.5s linear infinite;
        }
        @keyframes ybFlow {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }

        .yb-points-row {
          position: absolute;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .yb-stop-point {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #475569;
          border: 2px solid #11141c;
          transition: background 0.3s;
          position: relative;
        }
        .yb-stop-point.passed {
          background: #ffffff;
        }

        /* Бегущий автобус над линией */
        .yb-bus-runner {
          position: absolute;
          top: -2px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .yb-bus-icon-wrap {
          padding: 4px 6px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .yb-subtext-points {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
          font-weight: 500;
          letter-spacing: 0.2px;
          margin-top: -2px;
        }

        /* Модалка карты */
        .yb-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .yb-modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
        }
        .yb-modal-container {
          position: relative;
          z-index: 10000;
          width: 92vw;
          max-width: 860px;
          height: 82vh;
          max-height: 740px;
          background: #151821;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px rgba(0,0,0,0.7);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .yb-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #0d0f14;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .yb-modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
        }
        .yb-modal-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .yb-modal-close:hover {
          color: #ffffff;
          background: rgba(255,255,255,0.1);
        }
        .yb-modal-body {
          flex: 1;
          width: 100%;
          height: 100%;
          background: #fff;
        }
        .yb-modal-body iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>

      <div class="yb-dashboard-card">
        <div class="yb-top-bar">
          <div class="yb-stop-header" id="btn_open_stop">
            <span class="yb-stop-main-title">Остановка "${stopName}"</span>
            <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size: 18px; color: #64748b;"></ha-icon>
          </div>
          <div class="yb-clock-box">
            <div class="yb-pulse-dot"></div>
            <span id="yb_clock">${nowTimeStr}</span>
          </div>
        </div>

        <div class="yb-items-list">
          ${routes.length === 0 ? '<div style="color: #64748b; font-size: 14px; text-align: center; padding: 20px;">Нет активных маршрутов</div>' : ''}
          ${routes.map((r, idx) => {
            const color = routeColors[idx % routeColors.length];
            const nextTime = r.next || (r.times && r.times[0]) || '--:--';
            const minsLeft = this._getMinutesLeft(nextTime);

            // Расчет позиции автобуса на линии (от 15% до 90%)
            // Если ехать 1-2 мин: автобус близко (80-90%). Если 15 мин: автобус дальше (20-30%)
            let progressPercent = 85 - (minsLeft * 4);
            if (progressPercent < 15) progressPercent = 15;
            if (progressPercent > 92) progressPercent = 92;

            const busUrl = r.map_url || `https://yandex.ru/maps/20/arkhangelsk/?text=автобус%20${encodeURIComponent(r.route)}&l=masstransit`;

            return `
              <div class="yb-route-box" data-route="${r.route}" data-url="${busUrl}">
                <div class="yb-left-badge">
                  <div class="yb-badge-num" style="color: ${color};">${r.route}</div>
                  <div class="yb-badge-time">${minsLeft > 0 ? minsLeft + ' мин' : 'сейчас'}</div>
                </div>

                <div class="yb-track-container">
                  <div class="yb-route-meta">
                    <span class="yb-route-meta-label">АВТОБУС ${r.route}</span>
                    <span class="yb-route-dest">Прибытие в ${nextTime}</span>
                  </div>

                  <div class="yb-line-wrap">
                    <div class="yb-track-bg"></div>
                    <div class="yb-track-progress" style="width: ${progressPercent}%; background: linear-gradient(90deg, ${color}33 0\%,${color} 100%);"></div>

                    <div class="yb-points-row">
                      <div class="yb-stop-point passed"></div>
                      <div class="yb-stop-point ${progressPercent > 35 ? 'passed' : ''}"></div>
                      <div class="yb-stop-point ${progressPercent > 65 ? 'passed' : ''}"></div>
                      <div class="yb-stop-point ${progressPercent > 85 ? 'passed' : ''}"></div>
                      <div class="yb-stop-point" style="background: ${color}; box-shadow: 0 0 8px${color};"></div>
                    </div>

                    <div class="yb-bus-runner" style="left: ${progressPercent}%;">
                      <div class="yb-bus-icon-wrap" style="color: ${color}; box-shadow: 0 0 14px${color}55;">
                        <ha-icon icon="mdi:bus-side" style="--mdc-icon-size: 20px;"></ha-icon>
                      </div>
                    </div>
                  </div>

                  <div class="yb-subtext-points">
                    <span>ПРЕДЫДУЩАЯ</span>
                    <span>ПОДХОДИТ</span>
                    <span>ОСТАНОВКА (${minsLeft} МИН)</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const stopHeader = this.content.querySelector('#btn_open_stop');
    if (stopHeader) {
      stopHeader.addEventListener('click', () => {
        this.openModal(mapStopUrl, `Остановка: ${stopName}`);
      });
    }

    const rows = this.content.querySelectorAll('.yb-route-box');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const route = row.getAttribute('data-route');
        const url = row.getAttribute('data-url');
        this.openModal(url, `Автобус №${route} на карте Архангельска`);
      });
    });
  }

  static getConfigElement() {
    return document.createElement('yandex-bus-card-editor');
  }

  static getStubConfig() {
    return {
      entity: '',
      title: '',
      selected_buses: []
    };
  }
}

class YandexBusCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (this._form) {
      this._form.hass = hass;
    }
  }

  setConfig(config) {
    this._config = config ? JSON.parse(JSON.stringify(config)) : {};
    if (!Array.isArray(this._config.selected_buses)) {
      this._config.selected_buses = [];
    }
    this.render();
  }

  render() {
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this.appendChild(this._form);

      this._form.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        const value = ev.detail.value || {};
        const oldEntity = this._config ? this._config.entity : '';
        const newEntity = value.entity || '';

        if (oldEntity && newEntity && oldEntity !== newEntity) {
          value.selected_buses = [];
        }

        this._config = { ...(this._config || {}), ...value };
        
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: this._config },
          bubbles: true,
          composed: true
        }));

        this.render();
      });
    }

    if (this._hass) {
      this._form.hass = this._hass;
    }

    const conf = this._config || {};
    const curEntity = conf.entity || '';
    const stateObj = (curEntity && this._hass && this._hass.states) ? this._hass.states[curEntity] : null;
    
    let availableRoutes = [];
    if (stateObj && stateObj.attributes && Array.isArray(stateObj.attributes.routes)) {
      availableRoutes = stateObj.attributes.routes.map(r => String(r.route));
    }

    this._form.data = {
      entity: curEntity,
      title: conf.title || '',
      selected_buses: Array.isArray(conf.selected_buses) ? conf.selected_buses.map(String) : []
    };

    const schema = [
      {
        name: 'entity',
        required: true,
        selector: { entity: { domain: 'sensor' } }
      },
      {
        name: 'title',
        selector: { text: {} }
      }
    ];

    if (availableRoutes.length > 0) {
      schema.push({
        name: 'selected_buses',
        selector: {
          select: {
            multiple: true,
            mode: 'dropdown',
            options: availableRoutes.map(r => ({ value: r, label: `Автобус №${r}` }))
          }
        }
      });
    }

    this._form.schema = schema;

    this._form.computeLabel = (s) => {
      const labels = {
        entity: 'Остановка (сенсор)',
        title: 'Свое название остановки (необязательно)',
        selected_buses: 'Нужные автобусы (мультивыбор)'
      };
      return labels[s.name] || s.name;
    };
  }
}

if (!customElements.get('yandex-bus-card-editor')) {
  customElements.define('yandex-bus-card-editor', YandexBusCardEditor);
}

if (!customElements.get('yandex-bus-card')) {
  customElements.define('yandex-bus-card', YandexBusCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'yandex-bus-card')) {
  window.customCards.push({
    type: 'yandex-bus-card',
    name: 'Яндекс Автобусы (Остановка)',
    description: 'Анимированное табло движения автобусов с треком и картой'
  });
}
