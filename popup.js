// Современный модульный подход к управлению контрастом
class ContrastManager {
  constructor() {
    console.log("ContrastManager: Initializing...");
    this.site = null;
    this.shortcuts = {
      toggle: navigator.platform.includes("Mac") ? "⌘+Shift+F11" : "Shift+F11",
      scheme: navigator.platform.includes("Mac") ? "⌘+Shift+F12" : "Shift+F12",
    };

    // Кэш для часто используемых значений
    this.cache = {
      enabled: null,
      defaultScheme: null,
      siteSchemes: null,
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
      DEUTERANOPIA: "6",    // Для дейтеранопии (красно-зеленая слепота)
      PROTANOPIA: "7",      // Для протанопии (красная слепота)
      TRITANOPIA: "8",      // Для тританопии (сине-желтая слепота)
      HIGH_LEGIBILITY: "9", // Повышенная читаемость
      NIGHT_VISION: "10",   // Режим ночного зрения
      BLACK_ON_WHITE: "11", // Черное на белом (высокий контраст)
      LIGHT_SEPIA: "12",    // Светлая сепия
      DARK_SEPIA: "13",     // Темная сепия
      BLUE_LIGHT_FILTER: "14", // Фильтр синего света
      MONOCHROME_BLUE: "15", // Монохромный синий
      SHARP_2K: "16"        // Оптимизирован для 2K мониторов
    };

    // Добавляем названия схем
    this.SCHEME_NAMES = {
      "0": "Нормальный контраст",
      "1": "Повышенный контраст",
      "2": "Оттенки серого",
      "3": "Инвертированные цвета",
      "4": "Инвертированные оттенки серого",
      "5": "Желтый на черном",
      "6": "Дейтеранопия",
      "7": "Протанопия",
      "8": "Тританопия",
      "9": "Повышенная читаемость",
      "10": "Ночное зрение",
      "11": "Черное на белом",
      "12": "Светлая сепия",
      "13": "Темная сепия",
      "14": "Фильтр синего света",
      "15": "Монохромный синий",
      "16": "2K - Четкий текст"
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
    document.querySelectorAll('input[name="scheme"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          console.log(
            "ContrastManager: Radio button changed to:",
            e.target.value
          );
          this.handleSchemeChange(parseInt(e.target.value));
        }
      });
    });

    // Слушатели для ползунков - только обновляем отображение значений
    document.getElementById("contrast").addEventListener("input", (e) => {
      document.getElementById("contrastValue").textContent =
        e.target.value + "%";
    });

    document.getElementById("brightness").addEventListener("input", (e) => {
      document.getElementById("brightnessValue").textContent =
        e.target.value + "%";
    });

    // Кнопка применения пользовательских настроек
    document
      .getElementById("apply_custom_styles")
      .addEventListener("click", () => {
        console.log("ContrastManager: Applying custom styles");
        this.updateCustomStyles();
      });

    // Существующие слушатели
    document.getElementById("toggle").addEventListener("click", () => {
      console.log("ContrastManager: Toggle button clicked");
      this.toggleContrast();
    });

    document.getElementById("make_default").addEventListener("click", () => {
      console.log("ContrastManager: Make default button clicked");
      this.makeDefault();
    });

    document.getElementById("forget").addEventListener("click", () => {
      console.log("ContrastManager: Forget button clicked");
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
    const scheme = !this.site
      ? this.getDefaultScheme()
      : this.getSiteScheme(this.site);
    console.log(
      `ContrastManager: Current scheme for ${this.site || "default"}: ${scheme}`
    );
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

    // Добавляем классы для научных режимов
    document.body.classList.toggle('scientific-mode', scheme >= 6 && isEnabled);
    document.body.classList.toggle(`mode-${scheme}`, isEnabled);
  }

  // Оптимизированные методы работы с кэшем
  clearCache() {
    this.cache = {
      enabled: null,
      defaultScheme: null,
      siteSchemes: null,
    };
  }

  getEnabled() {
    if (this.cache.enabled === null) {
      this.cache.enabled = localStorage.getItem("enabled") !== "false";
      console.log(
        "ContrastManager: Getting enabled state:",
        this.cache.enabled
      );
    }
    return this.cache.enabled;
  }

  setEnabled(enabled) {
    console.log("ContrastManager: Setting enabled state:", enabled);
    localStorage.setItem("enabled", enabled);
    this.cache.enabled = enabled;
  }

  getDefaultScheme() {
    if (this.cache.defaultScheme === null) {
      const scheme = localStorage.getItem("scheme");
      this.cache.defaultScheme =
        scheme !== null && scheme >= 0 && scheme <= 15 ? parseInt(scheme) : 3;
      console.log(
        "ContrastManager: Getting default scheme:",
        this.cache.defaultScheme
      );
    }
    return this.cache.defaultScheme;
  }

  getSiteSchemes() {
    if (this.cache.siteSchemes === null) {
      try {
        this.cache.siteSchemes = JSON.parse(
          localStorage.getItem("siteschemes") || "{}"
        );
      } catch (error) {
        console.error("ContrastManager: Error parsing site schemes:", error);
        this.cache.siteSchemes = {};
      }
    }
    return this.cache.siteSchemes;
  }

  getSiteScheme(site) {
    if (!site) {
      return this.getDefaultScheme();
    }

    const siteSchemes = this.getSiteSchemes();
    const scheme = siteSchemes[site];

    // Проверяем, что схема существует и валидна
    if (scheme !== undefined && scheme >= 0 && scheme <= 15) {
      console.log(`ContrastManager: Site scheme for ${site}: ${scheme}`);
      return parseInt(scheme);
    }

    // Если схема невалидна, возвращаем схему по умолчанию
    const defaultScheme = this.getDefaultScheme();
    console.log(
      `ContrastManager: Using default scheme for ${site}: ${defaultScheme}`
    );
    return defaultScheme;
  }

  setSiteScheme(site, scheme) {
    const oldScheme = this.getSiteScheme(site);
    console.log(
      `ContrastManager: Updating scheme for ${site}: ${oldScheme} (${this.getSchemeName(oldScheme)}) → ${scheme} (${this.getSchemeName(scheme)})`
    );

    try {
      const siteSchemes = this.getSiteSchemes();
      siteSchemes[site] = scheme;
      localStorage.setItem("siteschemes", JSON.stringify(siteSchemes));
      this.cache.siteSchemes = siteSchemes;
      console.log(`ContrastManager: Successfully updated scheme for ${site} to "${this.getSchemeName(scheme)}"`);
    } catch (error) {
      console.error(
        `ContrastManager: Failed to update scheme for ${site}:`,
        error
      );
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
    const site = this.site;

    // Проверка на валидность значения схемы
    if (value < 0 || value > 15) {
      console.error(`ContrastManager: Invalid scheme value: ${value}`);
      return;
    }

    // Добавляем детальное логирование выбора режима
    console.log(`[ModeSelected] ID: ${value}, Name: "${this.getSchemeName(value)}",
      Type: ${value >= 6 ? 'Scientific' : 'Basic'},
      Site: ${site || 'Global'},
      Previous Mode: ${oldScheme} (${this.getSchemeName(oldScheme)})`);

    // Расширенное логирование для научных режимов
    const isScientificMode = value >= 6;
    if (isScientificMode) {
      console.groupCollapsed('[ModeDetails] Scientific Mode Properties');
      console.log('Mode Type:', this.getSchemeName(value));
      console.log('Description:', this.getScientificModeDescription(value));
      console.log('Target:', site ? `Site: ${site}` : 'Global Default');
      console.groupEnd();
    }

    console.log(
      `ContrastManager: Scheme change initiated - From: ${oldScheme} (${this.getSchemeName(oldScheme)}) To: ${value} (${this.getSchemeName(value)})`
    );

    try {
      if (site) {
        console.log(
          `ContrastManager: Updating site-specific scheme for ${site} from "${this.getSchemeName(oldScheme)}" to "${this.getSchemeName(value)}"`
        );
        this.setSiteScheme(site, value);
      } else {
        console.log(`ContrastManager: Updating default scheme from "${this.getSchemeName(oldScheme)}" to "${this.getSchemeName(value)}"`);
        localStorage.setItem("scheme", value);
        this.cache.defaultScheme = value;
      }

      // Добавляем логирование применения научного режима
      if (isScientificMode) {
        console.log(`ContrastManager: Applying scientific mode effects for ${this.getSchemeName(value)}`);
      }

      console.log(
        `ContrastManager: Scheme transition completed: ${this.getSchemeName(oldScheme)} → ${this.getSchemeName(value)}`
      );

      // Кэшируем состояние перед обновлением UI
      const cachedState = {
        enabled: this.getEnabled(),
        scheme: value,
        site: site,
      };

      // Обновляем UI с использованием кэшированного состояния
      this.updateUIWithState(cachedState);

      // Отправляем сообщение об обновлении только после успешного изменения
      chrome.runtime.sendMessage({
        action: "updateTabs",
        scheme: value,
        site: site,
      });
    } catch (error) {
      console.error(`ContrastManager: Failed to change scheme:`, error);
      this.handleSchemeError(oldScheme);
    }
  }

  // Новый метод для обновления UI с кэшированным состоянием
  updateUIWithState(state) {
    console.log("ContrastManager: Updating UI with cached state:", state);

    document.body.classList.toggle("disabled", !state.enabled);
    this.updateTitle(state.enabled);
    this.updateToggleButton(state.enabled);
    this.updateSubControls(state.enabled);

    // Обновляем выбор схемы без дополнительных запросов к localStorage
    this.setRadioValue("scheme", state.scheme);

    if (state.site) {
      const makeDefaultBtn = document.getElementById("make_default");
      const defaultScheme = this.getDefaultScheme();
      makeDefaultBtn.disabled = state.scheme === defaultScheme;
    }

    // Обновляем атрибуты документа
    const hcValue = state.enabled ? `a${state.scheme}` : "a0";
    document.documentElement.setAttribute("hc", hcValue);
  }

  // Новый метод для обработки ошибок при переключении схем
  handleSchemeError(previousScheme) {
    console.log(
      `ContrastManager: Reverting to previous scheme: ${previousScheme}`
    );

    if (this.site) {
      this.setSiteScheme(this.site, previousScheme);
    } else {
      localStorage.setItem("scheme", previousScheme);
    }

    this.updateUI();
  }

  makeDefault() {
    console.log("ContrastManager: Making current settings default");

    // Сохраняем текущую схему до очистки
    let currentScheme;
    if (this.site) {
      currentScheme = this.getSiteScheme(this.site);
      console.log(
        `ContrastManager: Saving current scheme before cleanup: ${currentScheme} (${this.getSchemeName(currentScheme)})`
      );
    }

    // Очищаем все настройки для отдельных сайтов
    localStorage.removeItem("siteschemes");
    this.clearCache(); // Полная очистка кэша

    // Устанавливаем сохраненную схему как схему по умолчанию
    if (currentScheme !== undefined) {
      console.log(
        `ContrastManager: Setting saved scheme as default: ${currentScheme} (${this.getSchemeName(currentScheme)})`
      );
      localStorage.setItem("scheme", currentScheme);
      this.cache.defaultScheme = currentScheme;
    }

    // Сохраняем текущие пользовательские настройки как настройки по умолчанию
    const customStyles = {
      contrast: document.getElementById("contrast").value,
      brightness: document.getElementById("brightness").value,
      textColor: document.getElementById("textColor").value,
      bgColor: document.getElementById("bgColor").value,
      linkColor: document.getElementById("linkColor").value,
      enabled: true,
    };

    console.log("ContrastManager: Saving default custom styles:", customStyles);
    localStorage.setItem("defaultCustomStyles", JSON.stringify(customStyles));
    localStorage.setItem("customStyles", JSON.stringify(customStyles));

    // Принудительно обновляем UI перед перезагрузкой
    this.updateUI();

    // Отправляем сообщение об обновлении с новыми настройками
    chrome.runtime.sendMessage({
      action: "updateTabs",
      scheme: currentScheme,
      customStyles: customStyles,
      resetSiteSchemes: true // Добавляем флаг для полного сброса настроек сайтов
    });

    // Перезагружаем текущую вкладку для применения изменений
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log("ContrastManager: Reloading current tab to apply changes");
        chrome.tabs.reload(tabs[0].id);
      }
    });

    // Повторно обновляем UI после небольшой задержки
    setTimeout(() => {
      this.clearCache(); // Повторная очистка кэша
      this.updateUI();
    }, 100);
  }

  resetSettings() {
    console.log("ContrastManager: Starting settings reset...");

    // Сохраняем текущие настройки для логирования
    const currentSettings = {
      scheme: this.getCurrentScheme(),
      styles: JSON.parse(localStorage.getItem("customStyles") || "{}"),
      siteSchemes: this.getSiteSchemes(),
    };

    console.log(
      "ContrastManager: Current settings before reset:",
      currentSettings
    );

    // Сбрасываем все настройки в localStorage
    const keysToRemove = [
      "siteschemes",
      "scheme",
      "customStyles",
      "defaultCustomStyles",
    ];
    console.log("ContrastManager: Removing stored settings:", keysToRemove);
    keysToRemove.forEach((key) => {
      console.log(`ContrastManager: Removing ${key} from localStorage`);
      localStorage.removeItem(key);
    });

    // Очищаем кэш
    this.clearCache();

    // Устанавливаем начальные значения
    const defaultStyles = {
      contrast: "150",
      brightness: "120",
      textColor: "#ffffff",
      bgColor: "#000000",
      linkColor: "#00ff00",
      enabled: true,
    };

    console.log("ContrastManager: Restoring to default styles:", defaultStyles);

    // Обновляем значения в интерфейсе с подробным логированием
    const elements = {
      contrast: ["value", "%"],
      brightness: ["value", "%"],
      textColor: ["value", ""],
      bgColor: ["value", ""],
      linkColor: ["value", ""],
    };

    Object.entries(elements).forEach(([id, [prop, suffix]]) => {
      const element = document.getElementById(id);
      const oldValue = element.value;
      const newValue = defaultStyles[id];

      console.log(`ContrastManager: Updating ${id}: ${oldValue} → ${newValue}`);
      element.value = newValue;

      const valueDisplay = document.getElementById(id + "Value");
      if (valueDisplay) {
        valueDisplay.textContent = newValue + suffix;
      }
    });

    // Устанавливаем схему по умолчанию
    const defaultScheme = "3";
    console.log(
      `ContrastManager: Setting default scheme: ${currentSettings.scheme} → ${defaultScheme}`
    );
    localStorage.setItem("scheme", defaultScheme);
    localStorage.setItem("customStyles", JSON.stringify(defaultStyles));

    console.log("ContrastManager: Reset summary:", {
      "Previous Settings": currentSettings,
      "New Settings": {
        scheme: defaultScheme,
        styles: defaultStyles,
        siteSchemes: {},
      },
    });

    // Обновляем UI и отправляем сообщение об обновлении
    this.updateUI();
    chrome.runtime.sendMessage({
      action: "updateTabs",
      customStyles: defaultStyles,
    });

    // Перезагружаем текущую вкладку
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log("ContrastManager: Reloading current tab to apply changes");
        chrome.tabs.reload(tabs[0].id);
      }
    });

    console.log("ContrastManager: Settings reset completed");
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
    console.log("ContrastManager: Updating custom styles");
    const contrast = document.getElementById("contrast").value;
    const brightness = document.getElementById("brightness").value;
    const textColor = document.getElementById("textColor").value;
    const bgColor = document.getElementById("bgColor").value;
    const linkColor = document.getElementById("linkColor").value;

    const customStyles = {
      contrast,
      brightness,
      textColor,
      bgColor,
      linkColor,
      enabled: true, // Добавляем флаг активации
    };

    console.log("ContrastManager: New custom styles:", customStyles);
    localStorage.setItem("customStyles", JSON.stringify(customStyles));

    // Отправляем сообщение для обновления всех вкладок с новыми стилями
    chrome.runtime.sendMessage({
      action: "updateTabs",
      customStyles: customStyles,
    });

    // Принудительно обновляем текущую вкладку
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          enabled: true,
          customStyles: customStyles,
        });
      }
    });
  }

  loadCustomStyles() {
    const savedStyles = JSON.parse(
      localStorage.getItem("customStyles") || "{}"
    );

    if (savedStyles.contrast) {
      document.getElementById("contrast").value = savedStyles.contrast;
      document.getElementById("contrastValue").textContent =
        savedStyles.contrast + "%";
    }
    if (savedStyles.brightness) {
      document.getElementById("brightness").value = savedStyles.brightness;
      document.getElementById("brightnessValue").textContent =
        savedStyles.brightness + "%";
    }
    if (savedStyles.textColor) {
      document.getElementById("textColor").value = savedStyles.textColor;
    }
    if (savedStyles.bgColor) {
      document.getElementById("bgColor").value = savedStyles.bgColor;
    }
    if (savedStyles.linkColor) {
      document.getElementById("linkColor").value = savedStyles.linkColor;
    }
  }

  // Добавляем метод для получения названия схемы
  getSchemeName(schemeId) {
    return this.SCHEME_NAMES[schemeId] || `Неизвестная схема (${schemeId})`;
  }

  // Добавляем новый метод для получения описания научного режима
  getScientificModeDescription(schemeId) {
    const descriptions = {
      '6': 'Симуляция дейтеранопии - нарушения восприятия зеленого цвета. Адаптирует контент для людей с красно-зеленой цветовой слепотой.',
      '7': 'Симуляция протанопии - нарушения восприятия красного цвета. Адаптирует контент для людей с нарушением восприятия красных оттенков.',
      '8': 'Симуляция тританопии - нарушения восприятия синего цвета. Адаптирует контент для людей с сине-желтой цветовой слепотой.',
      '9': 'Режим повышенной читаемости с оптимизированным контрастом и увеличенным межстрочным интервалом.',
      '10': 'Специальный ночной режим с пониженной яркостью и теплыми оттенками для комфортного чтения в темноте.',
      '11': 'Высококонтрастный режим с четким черным текстом на белом фоне. Идеально для максимальной читаемости текста.',
      '12': 'Светлая сепия создает мягкий янтарный оттенок, снижающий нагрузку на глаза при длительном чтении.',
      '13': 'Темная сепия с теплыми коричневыми тонами на темном фоне. Комфортно для глаз в условиях низкой освещенности.',
      '14': 'Уменьшает количество синего света, излучаемого экраном. Помогает снизить усталость глаз и улучшить качество сна при использовании компьютера вечером.',
      '15': 'Монохромный синий режим с преобладанием синих оттенков. Может быть полезен при определенных нарушениях зрения.',
      '16': 'Оптимизирован для 2K дисплеев. Повышает чёткость текста и улучшает детализацию изображений на экранах с высоким разрешением. Идеально для продолжительной работы с текстом на 2K мониторах.'
    };
    return descriptions[schemeId] || 'Описание недоступно';
  }
}

// Инициализация приложения
document.addEventListener("DOMContentLoaded", () => {
  new ContrastManager();
});
