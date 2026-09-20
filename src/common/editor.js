export class YandexBusBaseEditor extends HTMLElement {
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
