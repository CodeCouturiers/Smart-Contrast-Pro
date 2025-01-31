// Современный модульный подход к управлению контрастом
class ContrastManager {
  constructor() {
    console.log("ContrastManager: Initializing...");
    this.site = null;
    this.shortcuts = {
      toggle: navigator.platform.includes("Mac") ? "⌘+Shift+F11" : "Shift+F11",
      scheme: navigator.platform.includes("Mac") ? "⌘+Shift+F12" : "Shift+F12",
    };
    console.log("ContrastManager: Shortcuts configured:", this.shortcuts);

    // Константы для схем контраста
    this.SCHEMES = {
      NORMAL: "0",
      INCREASED: "1",
      GRAYSCALE: "2",
      INVERTED: "3",
      INVERTED_GRAYSCALE: "4",
      YELLOW_ON_BLACK: "5",
    };

    this.init();
  }

  // Инициализация приложения
  async init() {
    console.log("ContrastManager: Starting initialization...");
    this.initializeI18n();
    this.loadCustomStyles();
    this.setupEventListeners();
    await this.getCurrentTab();
    this.updateUI();
    console.log("ContrastManager: Initialization complete");
  }

  // Инициализация интернационализации
  initializeI18n() {
    console.log("ContrastManager: Initializing i18n...");
    document.querySelectorAll("[i18n-content]").forEach((element) => {
      const msg = element.getAttribute("i18n-content");
      element.textContent = chrome.i18n.getMessage(msg);
    });
  }

  // Настройка слушателей событий
  setupEventListeners() {
    console.log("ContrastManager: Setting up event listeners...");

    // Слушатели для радио кнопок
    document.querySelectorAll('input[name="scheme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          console.log('ContrastManager: Radio button changed to:', e.target.value);
          this.handleSchemeChange(parseInt(e.target.value));
        }
      });
    });

    // Слушатели для ползунков - только обновляем отображение значений
    document.getElementById('contrast').addEventListener('input', (e) => {
      document.getElementById('contrastValue').textContent = e.target.value + '%';
    });

    document.getElementById('brightness').addEventListener('input', (e) => {
      document.getElementById('brightnessValue').textContent = e.target.value + '%';
    });

    // Кнопка применения пользовательских настроек
    document.getElementById('apply_custom_styles').addEventListener('click', () => {
      console.log('ContrastManager: Applying custom styles');
      this.updateCustomStyles();
    });

    // Существующие слушатели
    document.getElementById('toggle').addEventListener('click', () => {
      console.log('ContrastManager: Toggle button clicked');
      this.toggleContrast();
    });

    document.getElementById('make_default').addEventListener('click', () => {
      console.log('ContrastManager: Make default button clicked');
      this.makeDefault();
    });

    document.getElementById('forget').addEventListener('click', () => {
      console.log('ContrastManager: Forget button clicked');
      this.resetSettings();
    });
  }

  // Получение текущей вкладки
  async getCurrentTab() {
    console.log("ContrastManager: Getting current tab...");
    try {
      await new Promise((resolve) => {
        chrome.tabs.query(
          {
            active: true,
            currentWindow: true,
          },
          (tabs) => {
            if (tabs && tabs.length > 0) {
              const tab = tabs[0];
              console.log("ContrastManager: Current tab:", tab.url);
              if (this.isDisallowedUrl(tab.url)) {
                console.log(
                  "ContrastManager: URL is disallowed, setting up default mode"
                );
                this.setupDefaultMode();
              } else {
                console.log(
                  "ContrastManager: Setting up site mode for:",
                  tab.url
                );
                this.setupSiteMode(tab.url);
              }
            } else {
              console.warn("ContrastManager: No active tab found");
              this.setupDefaultMode();
            }
            resolve();
          }
        );
      });
    } catch (error) {
      console.error("ContrastManager: Error getting current tab:", error);
      this.setupDefaultMode();
    }
  }

  // Проверка запрещенных URL
  isDisallowedUrl(url) {
    return url.startsWith("chrome") || url.startsWith("about");
  }

  // Настройка режима по умолчанию
  setupDefaultMode() {
    const schemeTitle = document.getElementById("scheme_title");
    schemeTitle.textContent = chrome.i18n.getMessage("highcontrast_default");
    document.getElementById("make_default").style.display = "none";
  }

  // Настройка режима для конкретного сайта
  setupSiteMode(url) {
    this.site = new URL(url).hostname;
    const schemeTitle = document.getElementById("scheme_title");
    schemeTitle.innerHTML = chrome.i18n.getMessage(
      "highcontrast_",
      `<b>${this.site}</b><br><span class="kb">(${this.shortcuts.scheme})</span>`
    );
    document.getElementById("make_default").style.display = "block";
  }

  // Обновление UI
  updateUI() {
    console.log("ContrastManager: Updating UI...");
    const isEnabled = this.getEnabled();
    const currentScheme = this.getCurrentScheme();

    console.log("ContrastManager: Extension is enabled:", isEnabled);
    console.log("ContrastManager: Current scheme:", currentScheme);

    document.body.classList.toggle("disabled", !isEnabled);
    this.updateTitle(isEnabled);
    this.updateToggleButton(isEnabled);
    this.updateSubControls(isEnabled);
    this.updateSchemeSelection(currentScheme, isEnabled);
    this.updateDocumentAttributes(currentScheme, isEnabled);

    console.log("ContrastManager: Sending updateTabs message");
    chrome.runtime.sendMessage({ action: "updateTabs" });
  }

  // Получение текущей схемы с учетом сайта
  getCurrentScheme() {
    const scheme = !this.site ? this.getDefaultScheme() : this.getSiteScheme(this.site);
    console.log(`ContrastManager: Current scheme for ${this.site || 'default'}: ${scheme}`);
    return scheme;
  }

  // Обновление заголовка
  updateTitle(isEnabled) {
    const titleKey = isEnabled
      ? "highcontrast_enabled"
      : "highcontrast_disabled";
    document.getElementById("title").textContent =
      chrome.i18n.getMessage(titleKey);
  }

  // Обновление кнопки переключения
  updateToggleButton(isEnabled) {
    const toggleKey = isEnabled
      ? "highcontrast_disable"
      : "highcontrast_enable";
    document.getElementById("toggle").innerHTML = `
            <b>${chrome.i18n.getMessage(toggleKey)}</b><br>
            <span class="kb">(${this.shortcuts.toggle})</span>
        `;
  }

  // Обновление дополнительных элементов управления
  updateSubControls(isEnabled) {
    const subcontrols = document.getElementById("subcontrols");
    subcontrols.style.display = isEnabled ? "block" : "none";
  }

  // Обновление выбора схемы
  updateSchemeSelection(scheme, isEnabled) {
    this.setRadioValue("scheme", scheme);

    if (this.site) {
      const makeDefaultBtn = document.getElementById("make_default");
      makeDefaultBtn.disabled = scheme === this.getDefaultScheme();
    }
  }

  // Обновление атрибутов документа
  updateDocumentAttributes(scheme, isEnabled) {
    const hcValue = isEnabled ? `a${scheme}` : "a0";
    document.documentElement.setAttribute("hc", hcValue);
  }

  // Утилиты для работы с localStorage
  getEnabled() {
    const enabled = localStorage.getItem("enabled") !== "false";
    console.log("ContrastManager: Getting enabled state:", enabled);
    return enabled;
  }

  setEnabled(enabled) {
    console.log("ContrastManager: Setting enabled state:", enabled);
    localStorage.setItem("enabled", enabled);
  }

  getDefaultScheme() {
    const scheme = localStorage.getItem('scheme');
    // Если схема не установлена или некорректна, возвращаем 3 (стандартная схема)
    const result = (scheme !== null && scheme >= 0 && scheme <= 5) ? parseInt(scheme) : 3;
    console.log('ContrastManager: Getting default scheme:', result);
    return result;
  }

  getSiteScheme(site) {
    console.log('ContrastManager: Getting scheme for site:', site);
    try {
        const siteSchemes = JSON.parse(localStorage.getItem('siteschemes') || '{}');
        const scheme = siteSchemes[site];
        // Проверяем, что схема существует и валидна
        const result = (scheme !== undefined && scheme >= 0 && scheme <= 5) ?
            parseInt(scheme) :
            this.getDefaultScheme();
        console.log('ContrastManager: Site scheme:', result);
        return result;
    } catch (error) {
        console.error('ContrastManager: Error getting site scheme:', error);
        return this.getDefaultScheme();
    }
  }

  setSiteScheme(site, scheme) {
    const oldScheme = this.getSiteScheme(site);
    console.log(
      `ContrastManager: Updating scheme for ${site}: ${oldScheme} → ${scheme}`
    );

    try {
      const siteSchemes = JSON.parse(
        localStorage.getItem("siteschemes") || "{}"
      );
      siteSchemes[site] = scheme;
      localStorage.setItem("siteschemes", JSON.stringify(siteSchemes));
      console.log(`ContrastManager: Successfully updated scheme for ${site}`);
    } catch (error) {
      console.error(`ContrastManager: Failed to update scheme for ${site}:`, error);
    }
  }

  // Обработчики действий пользователя
  toggleContrast() {
    const currentState = this.getEnabled();
    console.log(
      "ContrastManager: Toggling contrast. Current state:",
      currentState
    );
    this.setEnabled(!currentState);
    this.updateUI();
  }

  handleSchemeChange(value) {
    const oldScheme = this.getCurrentScheme();
    console.log(
      `ContrastManager: Scheme change initiated - From: ${oldScheme} To: ${value}`
    );

    if (this.site) {
      console.log(`ContrastManager: Updating site-specific scheme for ${this.site}`);
      this.setSiteScheme(this.site, value);
    } else {
      console.log("ContrastManager: Updating default scheme");
      localStorage.setItem("scheme", value);
    }

    console.log(`ContrastManager: Scheme transition completed: ${oldScheme} → ${value}`);
    this.updateUI();
    chrome.runtime.sendMessage({ action: "updateTabs" });
  }

  makeDefault() {
    console.log('ContrastManager: Making current settings default');
    if (this.site) {
        // Сохраняем текущую схему как схему по умолчанию
        const currentScheme = this.getSiteScheme(this.site);
        localStorage.setItem('scheme', currentScheme);
    }

    // Сохраняем текущие пользовательские настройки как настройки по умолчанию
    const customStyles = {
        contrast: document.getElementById('contrast').value,
        brightness: document.getElementById('brightness').value,
        textColor: document.getElementById('textColor').value,
        bgColor: document.getElementById('bgColor').value,
        linkColor: document.getElementById('linkColor').value,
        enabled: true
    };

    console.log('ContrastManager: Saving default custom styles:', customStyles);
    localStorage.setItem('defaultCustomStyles', JSON.stringify(customStyles));
    localStorage.setItem('customStyles', JSON.stringify(customStyles));

    this.updateUI();
    chrome.runtime.sendMessage({
        action: 'updateTabs',
        customStyles: customStyles
    });
  }

  resetSettings() {
    console.log('ContrastManager: Starting settings reset...');

    // Сохраняем текущие настройки для логирования
    const currentSettings = {
      scheme: this.getCurrentScheme(),
      styles: JSON.parse(localStorage.getItem('customStyles') || '{}'),
      siteSchemes: JSON.parse(localStorage.getItem('siteschemes') || '{}')
    };

    console.log('ContrastManager: Current settings before reset:', currentSettings);

    // Сбрасываем все настройки в localStorage
    const keysToRemove = ['siteschemes', 'scheme', 'customStyles', 'defaultCustomStyles'];
    console.log('ContrastManager: Removing stored settings:', keysToRemove);
    keysToRemove.forEach(key => {
      console.log(`ContrastManager: Removing ${key} from localStorage`);
      localStorage.removeItem(key);
    });

    // Устанавливаем начальные значения
    const defaultStyles = {
      contrast: '150',
      brightness: '120',
      textColor: '#ffffff',
      bgColor: '#000000',
      linkColor: '#00ff00',
      enabled: true
    };

    console.log('ContrastManager: Restoring to default styles:', defaultStyles);

    // Обновляем значения в интерфейсе с подробным логированием
    const elements = {
      contrast: ['value', '%'],
      brightness: ['value', '%'],
      textColor: ['value', ''],
      bgColor: ['value', ''],
      linkColor: ['value', '']
    };

    Object.entries(elements).forEach(([id, [prop, suffix]]) => {
      const element = document.getElementById(id);
      const oldValue = element.value;
      const newValue = defaultStyles[id];

      console.log(`ContrastManager: Updating ${id}: ${oldValue} → ${newValue}`);
      element.value = newValue;

      const valueDisplay = document.getElementById(id + 'Value');
      if (valueDisplay) {
        valueDisplay.textContent = newValue + suffix;
      }
    });

    // Устанавливаем схему по умолчанию
    const defaultScheme = '3';
    console.log(`ContrastManager: Setting default scheme: ${currentSettings.scheme} → ${defaultScheme}`);
    localStorage.setItem('scheme', defaultScheme);
    localStorage.setItem('customStyles', JSON.stringify(defaultStyles));

    console.log('ContrastManager: Reset summary:', {
      'Previous Settings': currentSettings,
      'New Settings': {
        scheme: defaultScheme,
        styles: defaultStyles,
        siteSchemes: {}
      }
    });

    // Обновляем UI и отправляем сообщение об обновлении
    this.updateUI();
    chrome.runtime.sendMessage({
      action: 'updateTabs',
      customStyles: defaultStyles
    });

    // Перезагружаем текущую вкладку
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log('ContrastManager: Reloading current tab to apply changes');
        chrome.tabs.reload(tabs[0].id);
      }
    });

    console.log('ContrastManager: Settings reset completed');
  }

  // Утилитарный метод для установки значения radio кнопок
  setRadioValue(name, value) {
    console.log("ContrastManager: Setting radio value:", name, value);
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    radios.forEach((radio) => {
      radio.checked = radio.value === value.toString();
      radio.disabled = !this.getEnabled();
    });
  }

  updateCustomStyles() {
    console.log('ContrastManager: Updating custom styles');
    const contrast = document.getElementById('contrast').value;
    const brightness = document.getElementById('brightness').value;
    const textColor = document.getElementById('textColor').value;
    const bgColor = document.getElementById('bgColor').value;
    const linkColor = document.getElementById('linkColor').value;

    const customStyles = {
        contrast,
        brightness,
        textColor,
        bgColor,
        linkColor,
        enabled: true // Добавляем флаг активации
    };

    console.log('ContrastManager: New custom styles:', customStyles);
    localStorage.setItem('customStyles', JSON.stringify(customStyles));

    // Отправляем сообщение для обновления всех вкладок с новыми стилями
    chrome.runtime.sendMessage({
        action: 'updateTabs',
        customStyles: customStyles
    });

    // Принудительно обновляем текущую вкладку
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                enabled: true,
                customStyles: customStyles
            });
        }
    });
  }

  loadCustomStyles() {
    const savedStyles = JSON.parse(localStorage.getItem('customStyles') || '{}');

    if (savedStyles.contrast) {
      document.getElementById('contrast').value = savedStyles.contrast;
      document.getElementById('contrastValue').textContent = savedStyles.contrast + '%';
    }
    if (savedStyles.brightness) {
      document.getElementById('brightness').value = savedStyles.brightness;
      document.getElementById('brightnessValue').textContent = savedStyles.brightness + '%';
    }
    if (savedStyles.textColor) {
      document.getElementById('textColor').value = savedStyles.textColor;
    }
    if (savedStyles.bgColor) {
      document.getElementById('bgColor').value = savedStyles.bgColor;
    }
    if (savedStyles.linkColor) {
      document.getElementById('linkColor').value = savedStyles.linkColor;
    }
  }
}

// Инициализация приложения
document.addEventListener("DOMContentLoaded", () => {
  new ContrastManager();
});
