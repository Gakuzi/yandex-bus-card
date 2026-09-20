import { YandexBusBaseEditor } from './src/common/editor.js';
import { YandexBusDarkGlassCard } from './src/cards/dark-glass-card.js';
import { YandexBusCityPylonCard } from './src/cards/city-pylon-card.js';

// Регистрируем общий редактор
if (!customElements.get('yandex-bus-card-editor')) {
  customElements.define('yandex-bus-card-editor', YandexBusBaseEditor);
}

// Карточка 1: Темный стекломорфизм
if (!customElements.get('yandex-bus-card')) {
  customElements.define('yandex-bus-card', YandexBusDarkGlassCard);
}

// Карточка 2: Городская стела (City Pylon)
if (!customElements.get('yandex-bus-pylon-card')) {
  customElements.define('yandex-bus-pylon-card', YandexBusCityPylonCard);
}

// Добавляем обе карточки в меню выбора Home Assistant
window.customCards = window.customCards || [];

if (!window.customCards.some(card => card.type === 'yandex-bus-card')) {
  window.customCards.push({
    type: 'yandex-bus-card',
    name: 'Яндекс Автобусы (Тёмное стекло)',
    description: 'Компактное темное неоновое табло с часами и бегущим лучом'
  });
}

if (!window.customCards.some(card => card.type === 'yandex-bus-pylon-card')) {
  window.customCards.push({
    type: 'yandex-bus-pylon-card',
    name: 'Яндекс Автобусы (Городская стела)',
    description: 'Светлое уличное информационное табло в алюминиевом корпусе'
  });
}
