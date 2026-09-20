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

  _getMinutesLeft(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':');
    const targetH = parseInt(parts[0], 10);
    const targetM = parseInt(parts[1], 10);

    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();

    let diff = (targetH * 60 + targetM) - (curH * 60 + curM);
    if (diff < 0) diff += 1440;
    return diff;
  }

  updateView() {
    if (!this._hass || !this._config || !this.content) return;
    const entityId = this._config.entity;
    
    if (!entityId) {
      this.content.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #94a3b8; font-family: sans-serif;">
          <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 38px; color: #38bdf8; margin-bottom: 6px;"></ha-icon>
          <div style="font-size: 15px; font-weight: 600; color: #f8fafc;">Остановка не выбрана</div>
        </div>
      `;
      return;
    }

    const stateObj = this._hass.states[entityId];
    if (!stateObj) {
      this.content.innerHTML = `<div style="padding: 16px; color: #ef4444; font-family: sans-serif;">Сущность <b>${entityId}</b> не найдена</div>`;
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
    const routeColors = ['#f59e0b', '#38bdf8', '#34d399', '#a855f7', '#fb7185'];

    const showWord = this._config.show_prefix === true;
    const showSubtext = this._config.show_subtext === true;

    const maxHeightStyle = this._config.max_height ? `max-height: ${this._config.max_height}; overflow-y: auto;` : '';
    const widthStyle = this._config.card_width ? `width: ${this._config.card_width}; margin: 0 auto;` : '';

    this.content.innerHTML = `
      <style>
        .yb-dashboard-card {
          background: #11141c;
          border-radius: 20px;
          padding: 14px 16px;
          color: #ffffff;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
          position: relative;
          box-sizing: border-box;
          ${widthStyle}
        }
        .yb-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 2px;
        }
        .yb-stop-header {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .yb-stop-main-title {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }
        .yb-clock-box {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 15px;
          font-weight: 600;
          color: #e2e8f0;
        }
        .yb-pulse-dot {
          width: 7px;
          height: 7px;
          background: #38bdf8;
          border-radius: 50%;
          box-shadow: 0 0 8px #38bdf8;
          animation: ybPulse 2s infinite;
        }
        @keyframes ybPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        .yb-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          ${maxHeightStyle}
          padding-right: ${this._config.max_height ? '4px' : '0'};
        }

        .yb-items-list::-webkit-scrollbar {
          width: 4px;
        }
        .yb-items-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }

        .yb-route-box {
          background: rgba(255, 255, 255, 0.035);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .yb-route-box:hover {
          background: rgba(255, 255, 255, 0.07);
          transform: translateY(-1px);
        }

        .yb-left-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 48px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding-right: 10px;
        }
        .yb-badge-num {
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .yb-badge-time {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
          margin-top: 3px;
          text-transform: uppercase;
        }

        .yb-track-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .yb-route-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .yb-route-dest {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .yb-line-wrap {
          position: relative;
          height: 28px;
          display: flex;
          align-items: center;
        }
        .yb-track-bg {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .yb-track-progress {
          position: absolute;
          left: 0;
          height: 3px;
          border-radius: 3px;
          overflow: hidden;
        }

        .yb-light-drop {
          position: absolute;
          top: 0;
          left: -40%;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%);
          animation: ybDropRun 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes ybDropRun {
          0% { left: -40%; }
          100% { left: 115%; }
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
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #334155;
          border: 1.5px solid #11141c;
        }
        .yb-stop-point.passed {
          background: #ffffff;
        }

        /* Увеличенная и четкая иконка автобуса */
        .yb-bus-runner {
          position: absolute;
          top: -1px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: left 0.4s ease;
          pointer-events: none;
        }
        .yb-bus-runner ha-icon {
          --mdc-icon-size: 25px;
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.8));
        }

        .yb-subtext-points {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
          font-weight: 500;
          margin-top: -1px;
        }
      </style>

      <div class="yb-dashboard-card">
        <div class="yb-top-bar">
          <div class="yb-stop-header" onclick="window.open('${mapStopUrl}', '_blank')">
            <span class="yb-stop-main-title">Остановка "${stopName}"</span>
            <ha-icon icon="mdi:open-in-new" style="--mdc-icon-size: 15px; color: #64748b;"></ha-icon>
          </div>
          <div class="yb-clock-box">
            <div class="yb-pulse-dot"></div>
            <span id="yb_clock">${nowTimeStr}</span>
          </div>
        </div>

        <div class="yb-items-list">
          ${routes.length === 0 ? '<div style="color: #64748b; text-align: center; padding: 14px;">Нет активных маршрутов</div>' : ''}
          ${routes.map((r, idx) => {
            const color = routeColors[idx % routeColors.length];
            const nextTime = r.next || (r.times && r.times[0]) || '--:--';
            const minsLeft = this._getMinutesLeft(nextTime);

            let progressPercent = 88 - (minsLeft * 4);
            if (progressPercent < 15) progressPercent = 15;
            if (progressPercent > 92) progressPercent = 92;

            const busUrl = r.map_url || `https://yandex.ru/maps/20/arkhangelsk/?text=автобус%20${encodeURIComponent(r.route)}&l=masstransit`;
            const arrivalLabel = showWord ? `Прибытие в ${nextTime}` : nextTime;

            return `
              <div class="yb-route-box" onclick="window.open('${busUrl}', '_blank')">
                <div class="yb-left-badge">
                  <div class="yb-badge-num" style="color: ${color};">${r.route}</div>
                  <div class="yb-badge-time">${minsLeft > 0 ? minsLeft + ' мин' : 'сейчас'}</div>
                </div>

                <div class="yb-track-container">
                  <div class="yb-route-meta">
                    <span class="yb-route-dest">${arrivalLabel}</span>
                  </div>

                  <div class="yb-line-wrap">
                    <div class="yb-track-bg"></div>
                    <div class="yb-track-progress" style="width: ${progressPercent}\%; background:${color};">
                      <div class="yb-light-drop"></div>
                    </div>

                    <div class="yb-points-row">
                      <div class="yb-stop-point passed"></div>
                      <div class="yb-stop-point ${progressPercent > 35 ? 'passed' : ''}"></div>
                      <div class="yb-stop-point ${progressPercent > 65 ? 'passed' : ''}"></div>
                      <div class="yb-stop-point ${progressPercent > 80 ? 'passed' : ''}"></div>
                      <div class="yb-stop-point" style="background: ${color};"></div>
                    </div>

                    <div class="yb-bus-runner" style="left: ${progressPercent}%;">
                      <ha-icon icon="mdi:bus-side" style="color: ${color};"></ha-icon>
                    </div>
                  </div>

                  ${showSubtext ? `
                    <div class="yb-subtext-points">
                      <span>ПРЕДЫДУЩАЯ</span>
                      <span>В ПУТИ</span>
                      <span>ОСТАНОВКА</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  static getConfigElement() {
    return document.createElement('yandex-bus-card-editor');
  }

  static getStubConfig() {
    return {
      entity: '',
      title: '',
      selected_buses: [],
      show_prefix: false,
      show_subtext: false,
      max_height: '',
      card_width: ''
    };
  }
}

class YandexBusCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
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
      selected_buses: Array.isArray(conf.selected_buses) ? conf.selected_buses.map(String) : [],
      show_prefix: conf.show_prefix === true,
      show_subtext: conf.show_subtext === true,
      max_height: conf.max_height || '',
      card_width: conf.card_width || ''
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

    schema.push(
      {
        name: 'max_height',
        selector: { text: {} }
      },
      {
        name: 'card_width',
        selector: { text: {} }
      },
      {
        name: 'show_prefix',
        selector: { boolean: {} }
      },
      {
        name: 'show_subtext',
        selector: { boolean: {} }
      }
    );

    this._form.schema = schema;

    this._form.computeLabel = (s) => {
      const labels = {
        entity: 'Остановка (сенсор)',
        title: 'Свое название остановки',
        selected_buses: 'Маршруты (мультивыбор)',
        max_height: 'Макс. высота карточки (напр. 350px)',
        card_width: 'Фиксированная ширина (напр. 400px или 100%)',
        show_prefix: 'Писать слово "Прибытие в"',
        show_subtext: 'Показывать нижние подписи точек трека'
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
    description: 'Компактное анимированное табло автобусов с чистой иконкой и настройкой размеров'
  });
}
