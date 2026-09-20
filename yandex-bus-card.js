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

  updateView() {
    if (!this._hass || !this._config || !this.content) return;
    const entityId = this._config.entity;
    
    if (!entityId) {
      this.content.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--secondary-text-color);">
          <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 40px; color: var(--primary-color); margin-bottom: 8px;"></ha-icon>
          <div style="font-size: 16px; font-weight: 600; color: var(--primary-text-color);">Остановка не выбрана</div>
          <div style="font-size: 13px; margin-top: 4px;">Выберите сенсор остановки в настройках</div>
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

    const selected = (this._config.selected_buses || []).map(s => String(s).trim());
    if (selected.length > 0) {
      routes = routes.filter(r => selected.includes(String(r.route)));
    }

    const mapStopUrl = stopId 
      ? `https://yandex.ru/maps/20/arkhangelsk/?masstransit%5BstopId%5D=stop__${stopId}&l=masstransit`
      : 'https://yandex.ru/maps/20/arkhangelsk/?l=masstransit';

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
          position: relative;
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
          user-select: none;
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
          color: inherit;
          transition: background 0.2s, transform 0.1s;
          cursor: pointer;
          user-select: none;
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
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }
        .yb-modal-container {
          position: relative;
          z-index: 10000;
          width: 90vw;
          max-width: 800px;
          height: 80vh;
          max-height: 700px;
          background: #1e222b;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .yb-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #14171d;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .yb-modal-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
        }
        .yb-modal-close {
          background: transparent;
          border: none;
          color: #8c9ba5;
          font-size: 18px;
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

      <div class="yb-card">
        <div class="yb-header">
          <div class="yb-stop-box" id="btn_stop_map">
            <div class="yb-stop-icon">
              <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 22px;"></ha-icon>
            </div>
            <div>
              <div class="yb-title">${stopName}</div>
              <div class="yb-subtitle">Показать остановку на карте</div>
            </div>
          </div>
          <ha-icon icon="mdi:bus" style="color: #4cd964; --mdc-icon-size: 20px;"></ha-icon>
        </div>

        <div class="yb-list">
          ${routes.length === 0 ? '<div style="color: #8c9ba5; font-size: 13px; padding: 6px;">Нет маршрутов</div>' : ''}
          ${routes.map(r => {
            const nextTime = r.next || (r.times && r.times[0]) || '-';
            const upcoming = (r.times || []).slice(1, 4).join(', ');
            return `
              <div class="yb-row" data-route="${r.route}" data-url="${r.map_url || ''}">
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

    const stopBtn = this.content.querySelector('#btn_stop_map');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.openModal(mapStopUrl, `Остановка: ${stopName}`);
      });
    }

    const rows = this.content.querySelectorAll('.yb-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const route = row.getAttribute('data-route');
        const url = row.getAttribute('data-url');
        const targetUrl = url || `https://yandex.ru/maps/20/arkhangelsk/?text=автобус%20${encodeURIComponent(route)}&l=masstransit`;
        this.openModal(targetUrl, `Автобус №${route} на карте Архангельска`);
      });
    });
  }

  static async getConfigElement() {
    return document.createElement('yandex-bus-card-editor');
  }

  static getStubConfig() {
    return {
      entity: 'sensor.taimyrskaia_ulitsa',
      title: '',
      selected_buses: []
    };
  }
}

// Визуальный редактор с динамической подгрузкой списка автобусов
class YandexBusCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  setConfig(config) {
    this._config = config ? { ...config } : {};
    if (!Array.isArray(this._config.selected_buses)) {
      this._config.selected_buses = [];
    }
    this.render();
  }

  render() {
    if (!this._hass) return;

    const currentEntity = this._config.entity || '';
    const stateObj = currentEntity ? this._hass.states[currentEntity] : null;
    const availableRoutes = (stateObj && stateObj.attributes && stateObj.attributes.routes) 
      ? stateObj.attributes.routes.map(r => String(r.route))
      : [];

    const selectedBuses = (this._config.selected_buses || []).map(String);

    // Список всех сенсоров с транспортом
    const busEntities = Object.keys(this._hass.states).filter(e => 
      e.startsWith('sensor.') && (e.includes('bus') || e.includes('ulitsa') || e.includes('ostanovka') || e.includes('taimyrskaia'))
    );

    this.innerHTML = `
      <style>
        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 0;
          font-family: inherit;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-weight: 500;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        .form-subtext {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .bus-chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .bus-chip {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: var(--primary-text-color);
          transition: all 0.2s ease;
          user-select: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bus-chip:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .bus-chip.selected {
          background: #0288d1;
          color: #ffffff;
          border-color: #0288d1;
          box-shadow: 0 2px 8px rgba(2, 136, 209, 0.4);
        }
        .chip-check {
          font-size: 12px;
        }
        .btn-action {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          background: transparent;
          border: 1px solid var(--divider-color);
          color: var(--primary-text-color);
          cursor: pointer;
        }
        .btn-action:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      </style>

      <div class="editor-container">
        <div class="form-group">
          <label class="form-label">Сенсор остановки</label>
          <ha-entity-picker
            id="entity_picker"
            .hass=${this._hass}
            .value=${currentEntity}
            .includeDomains=${['sensor']}
            allow-custom-entity
            style="display: block; width: 100%;"
          ></ha-entity-picker>
        </div>

        <div class="form-group">
          <label class="form-label">Свое название остановки</label>
          <ha-textfield
            id="title_input"
            .value=${this._config.title || ''}
            placeholder="По умолчанию из сенсора"
            style="display: block; width: 100%;"
          ></ha-textfield>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="form-label">Маршруты на этой остановке</label>
            ${availableRoutes.length > 0 ? `
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn-action" id="btn_select_all">Все</button>
                <button type="button" class="btn-action" id="btn_clear_all">Сбросить</button>
              </div>
            ` : ''}
          </div>
          <div class="form-subtext">
            ${availableRoutes.length === 0 
              ? 'Сначала выберите сенсор остановки выше, чтобы загрузить автобусы' 
              : selectedBuses.length === 0 
                ? 'Отображаются все автобусы. Нажмите на номер, чтобы отфильтровать:' 
                : 'Показываются только выбранные:'}
          </div>

          <div class="bus-chips-container" id="chips_container">
            ${availableRoutes.map(route => {
              const isSelected = selectedBuses.includes(route);
              return `
                <div class="bus-chip ${isSelected ? 'selected' : ''}" data-route="${route}">
                  <span>№ ${route}</span>
                  <span class="chip-check">${isSelected ? '✓' : '+'}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Привязка обработчиков
    const picker = this.querySelector('#entity_picker');
    picker.addEventListener('value-changed', (e) => {
      const newEntity = e.detail.value;
      if (newEntity !== this._config.entity) {
        // При смене остановки сбрасываем фильтр автобусов
        this._updateConfig({ entity: newEntity, selected_buses: [] });
      }
    });

    const titleInput = this.querySelector('#title_input');
    titleInput.addEventListener('input', (e) => {
      this._updateConfig({ title: e.target.value });
    });

    const chips = this.querySelectorAll('.bus-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const route = chip.getAttribute('data-route');
        let currentSelected = [...(this._config.selected_buses || [])].map(String);

        if (currentSelected.includes(route)) {
          currentSelected = currentSelected.filter(r => r !== route);
        } else {
          currentSelected.push(route);
        }

        this._updateConfig({ selected_buses: currentSelected });
      });
    });

    const btnAll = this.querySelector('#btn_select_all');
    if (btnAll) {
      btnAll.addEventListener('click', () => {
        this._updateConfig({ selected_buses: availableRoutes });
      });
    }

    const btnClear = this.querySelector('#btn_clear_all');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this._updateConfig({ selected_buses: [] });
      });
    }
  }

  _updateConfig(patch) {
    this._config = { ...this._config, ...patch };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
    this.render();
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
    description: 'Табло остановки с живым расписанием, фильтром маршрутов и модальной картой'
  });
}
