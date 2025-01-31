// Научные режимы контраста
const SCIENTIFIC_MODES = {
  // Режим 6: Дейтеранопия (красно-зеленая слепота)
  deuteranopia: {
    filters: 'grayscale(0.5) sepia(0.5) hue-rotate(320deg)',
    textColor: '#ffffff',
    backgroundColor: '#000033',
    linkColor: '#00ffff'
  },

  // Режим 7: Протанопия (красная слепота)
  protanopia: {
    filters: 'grayscale(0.6) sepia(0.4) hue-rotate(290deg)',
    textColor: '#ffffff',
    backgroundColor: '#000033',
    linkColor: '#00ffff'
  },

  // Режим 8: Тританопия (сине-желтая слепота)
  tritanopia: {
    filters: 'grayscale(0.4) sepia(0.6) hue-rotate(220deg)',
    textColor: '#ffff00',
    backgroundColor: '#000066',
    linkColor: '#00ff00'
  },

  // Режим 9: Повышенная читаемость
  enhanced_readability: {
    filters: 'contrast(110%) brightness(105%)',
    textColor: '#ffffff',
    backgroundColor: '#1a1a1a',
    linkColor: '#66ff66',
    fontSize: '110%',
    lineHeight: '1.5',
    letterSpacing: '0.5px'
  },

  // Режим 10: Режим ночного зрения
  night_vision: {
    filters: 'brightness(90%) sepia(30%) hue-rotate(320deg)',
    textColor: '#ff0000',
    backgroundColor: '#000000',
    linkColor: '#990000'
  }
};

function clearScientificModeStyles() {
  // Удаляем все старые стили научных режимов
  const oldStyles = document.querySelectorAll('style[data-scientific-mode]');
  oldStyles.forEach(style => style.remove());

  // Сбрасываем фильтры
  document.documentElement.style.filter = '';
  document.body.style.filter = '';

  // Сбрасываем inline стили, добавленные научными режимами
  document.body.style.backgroundColor = '';
  document.body.style.color = '';
  document.documentElement.style.backgroundColor = '';
  document.documentElement.style.color = '';
}

function applyScientificMode(mode) {
  const styles = SCIENTIFIC_MODES[mode];
  if (!styles) return;

  // Сначала очищаем старые стили
  clearScientificModeStyles();

  // Применяем фильтры
  document.documentElement.style.filter = styles.filters;
  document.documentElement.style.webkitFilter = styles.filters;

  // Создаем и применяем новые стили
  const styleSheet = document.createElement('style');
  styleSheet.setAttribute('data-scientific-mode', mode);
  styleSheet.textContent = `
    html {
      background-color: ${styles.backgroundColor} !important;
      color: ${styles.textColor} !important;
    }

    body {
      background-color: ${styles.backgroundColor} !important;
      color: ${styles.textColor} !important;
      ${styles.fontSize ? `font-size: ${styles.fontSize} !important;` : ''}
      ${styles.lineHeight ? `line-height: ${styles.lineHeight} !important;` : ''}
      ${styles.letterSpacing ? `letter-spacing: ${styles.letterSpacing} !important;` : ''}
    }

    a, a:visited, a:hover, a:active {
      color: ${styles.linkColor} !important;
    }

    /* Обеспечиваем контрастность для всех элементов */
    * {
      border-color: ${styles.textColor} !important;
      outline-color: ${styles.textColor} !important;
    }

    /* Улучшаем читаемость для элементов ввода */
    input, textarea, select {
      background-color: ${styles.backgroundColor} !important;
      color: ${styles.textColor} !important;
      border: 1px solid ${styles.textColor} !important;
    }

    /* Улучшаем контрастность для кнопок */
    button {
      background-color: ${styles.backgroundColor} !important;
      color: ${styles.textColor} !important;
      border: 1px solid ${styles.textColor} !important;
    }

    button:hover {
      background-color: ${styles.textColor} !important;
      color: ${styles.backgroundColor} !important;
    }
  `;

  document.head.appendChild(styleSheet);
}

// Экспортируем функции для использования в других файлах
window.HighContrastScientificModes = {
  applyMode: applyScientificMode,
  clearStyles: clearScientificModeStyles,
  modes: SCIENTIFIC_MODES
};
