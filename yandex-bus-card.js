class YandexBusCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      const card = document.createElement('ha-card');
      this.content = document.createElement('div');
      card.appendChild(this.content);
      this.appendChild(card);
    }
    this.updateView();
  }

  setConfig(config) {
    this._config = config ? { ...config } : {};
    this.updateView();
  }

  updateView() {
    if (!this._hass || !this._config || !this.content) return;
    const entityId = this._config.entity;
    
    if (!entityId) {
      this.content.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--secondary-text-color);">
          <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 40px; color: var(--primary-color); margin-bottom: 8px;"></ha-icon>
          <div style="font-size: 16px; font-weight: 600; color: var(--primary-text-color);">Остановка не выбрана</div>
          <div style="font-size: 13px; margin-top: 4px;">Выберите сенсор остановки в редакторе</div>
        </div>
      `;
      return;
    }

    const stateObj = this._hass.states[entityId];
    if (!stateObj) {
      this.content.innerHTML = `<div style="padding: 16px; color: var(--error-color);">Сущность <b>${entityId}</b> не найдена</div>`;
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
      : 'https://yandex.ru/maps/20/arkhangelsk/';

    this.content.innerHTML = `
      <style>
        .yb-card {
          background: linear-gradient(135deg, #1b1f27 0%, #11141a 100%);
          color: #ffffff;
          padding: 18px 20px;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.06);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .yb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .yb-stop-box {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .yb-stop-icon {
          background: #ffcc00;
          color: #111;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(255,204,0,0.3);
        }
        .yb-title {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.2px;
        }
        .yb-subtitle {
          font-size: 11px;
          color: #8c9ba5;
        }
        .yb-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .yb-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 10px 14px;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: background 0.2s, transform 0.1s;
          cursor: pointer;
        }
        .yb-row:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-1px);
        }
        .yb-num {
          background: #0288d1;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          padding: 4px 10px;
          border-radius: 8px;
          min-width: 32px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(2,136,209,0.4);
        }
        .yb-dest-box {
          margin-left: 12px;
          flex: 1;
        }
        .yb-dest {
          font-size: 13px;
          font-weight: 600;
          color: #f1f3f5;
        }
        .yb-times-list {
          font-size: 11px;
          color: #8c9ba5;
          margin-top: 2px;
        }
        .yb-time {
          font-size: 16px;
          font-weight: 700;
          color: #ffcc00;
          text-align: right;
        }
      </style>

      <div class="yb-card">
        <div class="yb-header">
          <div class="yb-stop-box" onclick="window.open('${mapStopUrl}', '_blank')">
            <div class="yb-stop-icon">
              <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 22px;"></ha-icon>
            </div>
            <div>
              <div class="yb-title">${stopName}</div>
              <div class="yb-subtitle">Яндекс Карты (открыть остановку)</div>
            </div>
          </div>
          <ha-icon icon="mdi:bus" style="color: #4cd964; --mdc-icon-size: 20px;"></ha-icon>
        </div>

        <div class="yb-list">
          ${routes.length === 0 ? '<div style="color: #8c9ba5; font-size: 13px; padding: 6px;">Нет маршрутов</div>' : ''}
          ${routes.map(r => {
            const nextTime = r.next || (r.times && r.times[0]) || '-';
            const upcoming = (r.times || []).slice(1, 4).join(', ');
            const busUrl = r.map_url || `https://yandex.ru/maps/20/arkhangelsk/?text=автобус%20${encodeURIComponent(r.route)}`;

            return `
              <div class="yb-row" onclick="window.open('${busUrl}', '_blank')">
                <div style="display: flex; align-items: center;">
                  <div class="yb-num">${r.route}</div>
                  <div class="yb-dest-box">
                    <div class="yb-dest">Автобус ${r.route}</div>${upcoming ? `<div class="yb-times-list">Далее: ${upcoming}</div>` : ''}
                  </div>
                </div>
                <div class="yb-time">${nextTime}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  static async getConfigElement() {
    return document.createElement('yandex-bus-card-editor');
  }

  static getStubConfig() {
    return {
      entity: 'sensor.taimyrskaia_ulitsa',
      title: '',
      selected_buses: ''
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
    this._config = config ? { ...config } : {};
    this.render();
  }

  render() {
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this.appendChild(this._form);

      this._form.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        const value = ev.detail.value || {};
        const newConfig = { ...this._config, ...value };
        this._config = newConfig;

        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: newConfig },
          bubbles: true,
          composed: true
        }));
      });
    }

    if (this._hass) {
      this._form.hass = this._hass;
    }

    const conf = this._config || {};
    this._form.data = {
      entity: conf.entity || '',
      title: conf.title || '',
      selected_buses: Array.isArray(conf.selected_buses) 
        ? conf.selected_buses.join(', ') 
        : (conf.selected_buses || '')
    };

    this._form.schema = [
      {
        name: 'entity',
        required: true,
        selector: { entity: { domain: 'sensor' } }
      },
      {
        name: 'title',
        selector: { text: {} }
      },
      {
        name: 'selected_buses',
        selector: { text: {} }
      }
    ];

    this._form.computeLabel = (schema) => {
      const labels = {
        entity: 'Сенсор остановки',
        title: 'Название остановки (необязательно)',
        selected_buses: 'Нужные маршруты через запятую (например: 1, 9, 10)'
      };
      return labels[schema.name] || schema.name;
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
    description: 'Табло остановки с живым расписанием, фильтром маршрутов и кликом на карту'
  });
}
