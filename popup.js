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
    console.log("ContrastManager: Extension is enabled:", isEnabled);

    document.body.classList.toggle("disabled", !isEnabled);
    this.updateTitle(isEnabled);
    this.updateToggleButton(isEnabled);
    this.updateSubControls(isEnabled);
    this.updateSchemeSelection();
    this.updateDocumentAttributes();

    console.log("ContrastManager: Sending updateTabs message");
    chrome.runtime.sendMessage({ action: "updateTabs" });
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
  updateSchemeSelection() {
    const scheme = this.site
      ? this.getSiteScheme(this.site)
      : this.getDefaultScheme();

    this.setRadioValue("scheme", scheme);

    if (this.site) {
      const makeDefaultBtn = document.getElementById("make_default");
      makeDefaultBtn.disabled = scheme === this.getDefaultScheme();
    }
  }

  // Обновление атрибутов документа
  updateDocumentAttributes() {
    const scheme = this.site
      ? this.getSiteScheme(this.site)
      : this.getDefaultScheme();

    const hcValue = this.getEnabled() ? `a${scheme}` : "a0";
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
    const scheme = localStorage.getItem("scheme");
    const result = scheme >= 0 && scheme <= 5 ? parseInt(scheme) : 3;
    console.log("ContrastManager: Getting default scheme:", result);
    return result;
  }

  getSiteScheme(site) {
    console.log("ContrastManager: Getting scheme for site:", site);
    try {
      const siteSchemes = JSON.parse(
        localStorage.getItem("siteschemes") || "{}"
      );
      const scheme = siteSchemes[site];
      const result =
        scheme >= 0 && scheme <= 5 ? parseInt(scheme) : this.getDefaultScheme();
      console.log("ContrastManager: Site scheme:", result);
      return result;
    } catch (error) {
      console.error("ContrastManager: Error getting site scheme:", error);
      return this.getDefaultScheme();
    }
  }

  setSiteScheme(site, scheme) {
    console.log(
      "ContrastManager: Setting scheme for site:",
      site,
      "Scheme:",
      scheme
    );
    try {
      const siteSchemes = JSON.parse(
        localStorage.getItem("siteschemes") || "{}"
      );
      siteSchemes[site] = scheme;
      localStorage.setItem("siteschemes", JSON.stringify(siteSchemes));
      console.log("ContrastManager: Successfully saved site scheme");
    } catch (error) {
      console.error("ContrastManager: Error saving site scheme:", error);
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
    console.log(
      "ContrastManager: Handling scheme change. Value:",
      value,
      "Site:",
      this.site
    );
    if (this.site) {
      console.log("ContrastManager: Setting site-specific scheme");
      this.setSiteScheme(this.site, value);
    } else {
      console.log("ContrastManager: Setting default scheme");
      localStorage.setItem("scheme", value);
    }
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
    console.log('ContrastManager: Resetting all settings');

    // Сбрасываем настройки для сайтов
    localStorage.setItem('siteschemes', '{}');

    // Восстанавливаем настройки по умолчанию
    const defaultStyles = {
        contrast: '150',
        brightness: '120',
        textColor: '#ffffff',
        bgColor: '#000000',
        linkColor: '#00ff00',
        enabled: true
    };

    // Загружаем сохраненные настройки по умолчанию, если они есть
    const savedDefaults = JSON.parse(localStorage.getItem('defaultCustomStyles') || '{}');
    const customStyles = Object.keys(savedDefaults).length > 0 ? savedDefaults : defaultStyles;

    console.log('ContrastManager: Restoring default styles:', customStyles);

    // Обновляем значения в интерфейсе
    document.getElementById('contrast').value = customStyles.contrast;
    document.getElementById('contrastValue').textContent = customStyles.contrast + '%';
    document.getElementById('brightness').value = customStyles.brightness;
    document.getElementById('brightnessValue').textContent = customStyles.brightness + '%';
    document.getElementById('textColor').value = customStyles.textColor;
    document.getElementById('bgColor').value = customStyles.bgColor;
    document.getElementById('linkColor').value = customStyles.linkColor;

    // Сохраняем и применяем настройки
    localStorage.setItem('customStyles', JSON.stringify(customStyles));

    this.updateUI();
    chrome.runtime.sendMessage({
        action: 'updateTabs',
        customStyles: customStyles
    });
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
