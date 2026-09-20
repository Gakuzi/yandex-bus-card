export class YandexBusCityPylonCard extends HTMLElement {
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
    this._config = config ? JSON.parse(JSON.stringify(config)) : {};
    this.updateView();
  }

  _getMinutesLeft(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':');
    const targetH = parseInt(parts[0], 10);
    const targetM = parseInt(parts[1], 10);

    const now = new Date();
    let diff = (targetH * 60 + targetM) - (now.getHours() * 60 + now.getMinutes());
    if (diff < 0) diff += 1440;
    return diff;
  }

  updateView() {
    if (!this._hass || !this._config || !this.content) return;
    const entityId = this._config.entity;
    
    if (!entityId) {
      this.content.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #475569; font-family: sans-serif;">
          <ha-icon icon="mdi:bus-stop" style="--mdc-icon-size: 38px; color: #3b82f6; margin-bottom: 6px;"></ha-icon>
          <div style="font-size: 15px; font-weight: 700; color: #1e293b;">Остановка не выбрана</div>
        </div>`;
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

    const palette = ['#10b981', '#3b82f6', '#f97316', '#6366f1', '#eab308'];
    const maxHeightStyle = this._config.max_height ? `max-height: ${this._config.max_height}; overflow-y: auto;` : '';
    const widthStyle = this._config.card_width ? `width: ${this._config.card_width}; margin: 0 auto;` : '';

    this.content.innerHTML = `
      <style>
        .yb-pylon-card {
          background: linear-gradient(180deg, #9ca8b7 0%, #bdc8d5 100%);
          border-radius: 28px;
          padding: 16px 14px 20px 14px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 35px rgba(0,0,0,0.3);
          border: 4px solid #475569;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-sizing: border-box;
          ${widthStyle}
        }
        .yb-pylon-title {
          text-align: center;
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 1px;
          text-transform: uppercase;
          text-shadow: 0 1px 2px rgba(0,0,0,0.25);
          margin-bottom: 14px;
          cursor: pointer;
        }
        .yb-pylon-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          ${maxHeightStyle}
        }
        .yb-pylon-list::-webkit-scrollbar { width: 4px; }
        .yb-pylon-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .yb-pylon-item {
          background: linear-gradient(180deg, #edf1f6 0%, #d8e0ea 100%);
          border-radius: 16px;
          padding: 12px 14px 14px 14px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08), inset 0 1px 1px #ffffff;
          border: 1px solid rgba(255,255,255,0.6);
          cursor: pointer;
        }
        .yb-pylon-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .yb-pylon-left { display: flex; align-items: center; gap: 10px; }
        .yb-pylon-badge {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }
        .yb-pylon-routename {
          font-size: 15px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .yb-pylon-right { text-align: right; }
        .yb-pylon-time { font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.1; }
        .yb-pylon-stops-count { font-size: 10px; font-weight: 600; color: #64748b; }
        .yb-pylon-track-wrap { position: relative; height: 22px; display: flex; align-items: center; }
        .yb-pylon-track-bar {
          position: absolute; left: 0; right: 0; height: 6px;
          background: #c3cedb; border-radius: 6px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
        }
        .yb-pylon-progress-bar { position: absolute; left: 0; height: 6px; border-radius: 6px; overflow: hidden; }
        .yb-pylon-dots {
          position: absolute; left: 0; right: 0; display: flex;
          justify-content: space-between; align-items: center; padding: 0 4px;
        }
        .yb-pylon-dot {
          width: 6px; height: 6px; background: #ffffff;
          border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .yb-pylon-dot.end { background: #0f172a; width: 7px; height: 7px; }
        .yb-pylon-runner {
          position: absolute; top: -3px; transform: translateX(-50%);
          display: flex; align-items: center; justify-content: center; transition: left 0.4s ease;
        }
        .yb-pylon-bus-box {
          width: 26px; height: 26px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center; color: #ffffff;
          border: 1px solid rgba(255,255,255,0.7);
        }
      </style>

      <div class="yb-pylon-card">
        <div class="yb-pylon-title" onclick="window.open('${mapStopUrl}', '_blank')">${stopName}</div>
        <div class="yb-pylon-list">
          ${routes.length === 0 ? '<div style="color: #475569; text-align: center; padding: 14px;">Нет активных маршрутов</div>' : ''}
          ${routes.map((r, idx) => {
            const color = palette[idx % palette.length];
            const nextTime = r.next || (r.times && r.times[0]) || '--:--';
            const minsLeft = this._getMinutesLeft(nextTime);

            let progressPercent = 88 - (minsLeft * 4);
            if (progressPercent < 15) progressPercent = 15;
            if (progressPercent > 90) progressPercent = 90;

            const busUrl = r.map_url || `https://yandex.ru/maps/20/arkhangelsk/?text=автобус%20${encodeURIComponent(r.route)}&l=masstransit`;
            const labelText = isNaN(r.route) ? r.route : `АВТОБУС ${r.route}`;

            return `
              <div class="yb-pylon-item" onclick="window.open('${busUrl}', '_blank')">
                <div class="yb-pylon-top">
                  <div class="yb-pylon-left">
                    <div class="yb-pylon-badge" style="background: ${color}; box-shadow: 0 3px 8px${color}88;">
                      <ha-icon icon="mdi:bus" style="--mdc-icon-size: 19px;"></ha-icon>
                    </div>
                    <span class="yb-pylon-routename">${labelText}</span>
                  </div>
                  <div class="yb-pylon-right">
                    <div class="yb-pylon-time">${minsLeft > 0 ? minsLeft + ' мин' : 'сейчас'}</div>
                    <div class="yb-pylon-stops-count">${nextTime}</div>
                  </div>
                </div>

                <div class="yb-pylon-track-wrap">
                  <div class="yb-pylon-track-bar"></div>
                  <div class="yb-pylon-progress-bar" style="width: ${progressPercent}\%; background:${color};">
                    <div style="position:absolute; top:0; left:-40%; width:40%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); animation: ybDropRun 2s infinite;"></div>
                  </div>
                  <div class="yb-pylon-dots">
                    <div class="yb-pylon-dot"></div>
                    <div class="yb-pylon-dot"></div>
                    <div class="yb-pylon-dot"></div>
                    <div class="yb-pylon-dot"></div>
                    <div class="yb-pylon-dot end"></div>
                  </div>
                  <div class="yb-pylon-runner" style="left: ${progressPercent}%;">
                    <div class="yb-pylon-bus-box" style="background: ${color}; box-shadow: 0 4px 10px${color}aa;">
                      <ha-icon icon="mdi:bus" style="--mdc-icon-size: 17px;"></ha-icon>
                    </div>
                  </div>
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
      max_height: '',
      card_width: ''
    };
  }
}
