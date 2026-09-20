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

    const attrs = stateObj.attributes || {};
    const stopName = this._config.title || attrs.stop_name || attrs.friendly_name || 'Остановка';
    const stopId = attrs.stop_id || '';
    
    let routes = attrs.routes || [];

    // Если указаны конкретные автобусы в настройках, фильтруем
    const selected = (this._config.selected_buses || []).map(s => String(s).trim());
    if (selected.length > 0) {
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
          ${routes.length === 0 ? '<div style="color: #8c9ba5; font-size: 13px; padding: 6px;">Нет рейсов по заданным фильтрам</div>' : ''}
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
    this.render();
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  render() {
    if (!this._hass || !this._config) return;

    const entities = Object.keys(this._hass.states).filter(e => 
      e.startsWith('sensor.') && (e.includes('taimyrskaia') || e.includes('bus') || e.includes('yandex'))
    );

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
          <label style="display: block; font-weight: 500; margin-bottom: 4px;">Свое название остановки (необязательно)</label>
          <input type="text" id="title_input" value="${this._config.title || ''}" placeholder="По умолчанию из сенсора" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color);">
        </div>

        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 4px;">Нужные маршруты (через запятую)</label>
          <input type="text" id="buses_input" value="${(this._config.selected_buses || []).join(', ')}" placeholder="Например: 1, 5, 10 (пусто = показывать все)" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color);">
          <div style="font-size: 11px; color: var(--secondary-text-color); margin-top: 4px;">Оставьте пустым, чтобы выводить все автобусы.</div>
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
