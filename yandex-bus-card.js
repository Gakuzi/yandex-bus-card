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
    if (!config.entity) {
      throw new Error('Укажите сущность (entity)');
    }
    this._config = config;
  }

  updateView() {
    if (!this._hass || !this._config) return;
    const entityId = this._config.entity;
    const stateObj = this._hass.states[entityId];

    if (!stateObj) {
      this.content.innerHTML = `<div style="padding: 16px; color: #ff5252;">Сущность ${entityId} не найдена</div>`;
      return;
    }

    const title = this._config.title || stateObj.attributes.friendly_name || 'Остановка';
    const stopId = stateObj.attributes.stop_id || '';
    
    let buses = stateObj.attributes.buses || [];
    if (!Array.isArray(buses) || buses.length === 0) {
      buses = [
        { number: stateObj.state || '10', destination: stateObj.attributes.destination || 'В центр', time: stateObj.state || '5', is_live: true }
      ];
    }

    const selected = this._config.selected_buses || [];
    if (selected.length > 0) {
      buses = buses.filter(b => selected.includes(String(b.number)));
    }

    const mapStopUrl = stopId 
      ? `https://yandex.ru/maps/20/arkhangelsk/?masstransit%5BstopId%5D=stop__${stopId}`
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
          font-size: 12px;
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
          border: 1px solid rgba(255,255,255,0.04);
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
          padding: 3px 10px;
          border-radius: 8px;
          min-width: 30px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(2,136,209,0.4);
        }
        .yb-dest-box {
          margin-left: 12px;
          flex: 1;
        }
        .yb-dest {
          font-size: 14px;
          font-weight: 500;
          color: #f1f3f5;
        }
        .yb-status {
          font-size: 11px;
          color: #4cd964;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .yb-dot {
          width: 6px;
          height: 6px;
          background: #4cd964;
          border-radius: 50%;
          box-shadow: 0 0 6px #4cd964;
        }
        .yb-time {
          font-size: 16px;
          font-weight: 700;
          color: #ffcc00;
          text-align: right;
        }
        .yb-time span {
          font-size: 11px;
          color: #8c9ba5;
          margin-left: 2px;
        }
      </style>

      <div class="yb-card">
        <div class="yb-header">
          <div class="yb-stop-box" onclick="window.open('${mapStopUrl}', '_blank')">
            <div class="yb-stop-icon">
              <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 22px;"></ha-icon>
            </div>
            <div>
              <div class="yb-title">${title}</div>
              <div class="yb-subtitle">Яндекс Карты (нажмите для перехода)</div>
            </div>
          </div>
          <ha-icon icon="mdi:wifi" style="color: #4cd964; --mdc-icon-size: 20px;"></ha-icon>
        </div>

        <div class="yb-list">
          ${buses.map(b => {
            const busMapUrl = `https://yandex.ru/maps/20/arkhangelsk/?text=автобус%20${encodeURIComponent(b.number)}`;
            return `
              <div class="yb-row" onclick="window.open('${busMapUrl}', '_blank')">
                <div style="display: flex; align-items: center;">
                  <div class="yb-num">${b.number}</div>
                  <div class="yb-dest-box">
                    <div class="yb-dest">${b.destination || 'По маршруту'}</div>
                    <div class="yb-status">
                      <span class="yb-dot"></span> Онлайн
                    </div>
                  </div>
                </div>
                <div class="yb-time">${b.time}<span>мин</span></div>
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
      title: 'Остановка',
      selected_buses: []
    };
  }
}

class YandexBusCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  render() {
    if (!this._hass || !this._config) return;

    const entities = Object.keys(this._hass.states).filter(e => e.startsWith('sensor.yandex_bus') || e.includes('bus'));

    this.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 12px 0;">
        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 4px;">Сенсор остановки</label>
          <select id="entity_select" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color);">
            <option value="">Выберите сенсор</option>
            ${entities.map(e => `<option value="${e}" ${this._config.entity === e ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 4px;">Название остановки</label>
          <input type="text" id="title_input" value="${this._config.title || ''}" placeholder="Например: Пл. Ленина" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color);">
        </div>

        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 4px;">Нужные маршруты (через запятую)</label>
          <input type="text" id="buses_input" value="${(this._config.selected_buses || []).join(', ')}" placeholder="Например: 10, 54, 65 (пусто = показывать все)" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color);">
          <div style="font-size: 11px; color: var(--secondary-text-color); margin-top: 4px;">Оставьте пустым, чтобы выводить все автобусы с этой остановки.</div>
        </div>
      </div>
    `;

    this.querySelector('#entity_select').addEventListener('change', (e) => this._valueChanged('entity', e.target.value));
    this.querySelector('#title_input').addEventListener('input', (e) => this._valueChanged('title', e.target.value));
    this.querySelector('#buses_input').addEventListener('input', (e) => {
      const arr = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      this._valueChanged('selected_buses', arr);
    });
  }

  _valueChanged(key, value) {
    if (!this._config) return;
    const newConfig = { ...this._config, [key]: value };
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define('yandex-bus-card-editor', YandexBusCardEditor);
customElements.define('yandex-bus-card', YandexBusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yandex-bus-card',
  name: 'Яндекс Автобусы (Остановка)',
  description: 'Табло остановки с живым расписанием, фильтром маршрутов и кликом на карту'
});
