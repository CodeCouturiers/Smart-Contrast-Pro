class HighContrastManager {
  constructor() {
    this.enabled = false;
    this.scheme = 0;
    this.mode = window.self === window.top ? "a" : "b";
    this.customStyles = null;

    this.init();
  }

  async init() {
    this.setupMessageListener();
    this.setupKeyboardListener();
    this.requestInitialState();
    this.setupMutationObserver();

    // Отложенные обновления для надежности
    setTimeout(() => this.updateExtraElements(), 2000);
    window.addEventListener("load", () => this.onLoadComplete());
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request) => {
      if (request.customStyles) {
        console.log('Received custom styles:', request.customStyles);
        this.customStyles = request.customStyles;
        this.enabled = true;
        this.update();
      }
      if (this.enabled !== request.enabled || this.scheme !== request.scheme) {
        this.enabled = request.enabled;
        this.scheme = request.scheme;
        this.update();
      }
    });
  }

  setupKeyboardListener() {
    document.addEventListener("keydown", (event) => {
      if (event.shiftKey) {
        if (event.key === "F11") {
          chrome.runtime.sendMessage({ action: "toggleGlobal" });
          event.preventDefault();
        } else if (event.key === "F12") {
          chrome.runtime.sendMessage({ action: "toggleSite" });
          event.preventDefault();
        }
      }
    });
  }

  requestInitialState() {
    chrome.runtime.sendMessage({ action: "getInitialState" }, (response) => {
      this.enabled = response.enabled;
      this.scheme = response.scheme;
      this.update();
    });
  }

  setupMutationObserver() {
    if (document.body) {
      this.observeBodyChanges();
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        this.observeBodyChanges();
      });
    }
  }

  observeBodyChanges() {
    const observer = new MutationObserver(() => {
      this.updateExtraElements();
    });

    observer.observe(document.body, {
      attributes: true,
      childList: false,
      characterData: false,
    });
  }

  onLoadComplete() {
    this.updateExtraElements();
    this.setupMutationObserver();
  }

  update() {
    if (!document.body) {
      setTimeout(() => this.update(), 100);
      return;
    }

    const html = document.documentElement;

    if (this.enabled) {
      // Удаляем старый стиль, чтобы применить новые настройки
      const oldStyle = document.getElementById("hc_style");
      if (oldStyle) {
        oldStyle.remove();
      }

      this.updateExtraElements();
      this.updateHtmlAttributes(html);
      this.triggerRepaint();
    } else {
      this.disableHighContrast(html);
    }
  }

  updateHtmlAttributes(html) {
    const newHcValue = this.mode + this.scheme;
    if (html.getAttribute("hc") !== newHcValue) {
      html.setAttribute("hc", newHcValue);
    }

    if (html.getAttribute("hcx") !== String(this.scheme)) {
      html.setAttribute("hcx", String(this.scheme));
    }
  }

  triggerRepaint() {
    if (window === window.top) {
      window.scrollBy(0, 1);
      window.scrollBy(0, -1);
    }
  }

  disableHighContrast(html) {
    html.setAttribute("hc", this.mode + "0");
    html.setAttribute("hcx", "0");

    setTimeout(() => {
      html.removeAttribute("hc");
      html.removeAttribute("hcx");
      const bg = document.getElementById("hc_extension_bkgnd");
      if (bg) bg.style.display = "none";
    }, 0);
  }

  updateExtraElements() {
    if (!this.enabled) return;

    this.updateStyleElement();
    this.updateBackgroundElement();
    this.updateSvgFilters();
  }

  updateStyleElement() {
    let style = document.getElementById("hc_style");
    if (!style) {
      const baseUrl = window.location.href.replace(window.location.hash, "");
      let css = this.getCssTemplate().replace(/#/g, baseUrl + "#");

      // Применяем пользовательские стили
      if (this.customStyles && this.customStyles.enabled) {
        css += `
          html[hc] {
            filter: contrast(${this.customStyles.contrast}%) brightness(${this.customStyles.brightness}%) !important;
          }
          html[hc] body {
            background-color: ${this.customStyles.bgColor} !important;
            color: ${this.customStyles.textColor} !important;
          }
          html[hc] a {
            color: ${this.customStyles.linkColor} !important;
          }
        `;
      }

      style = document.createElement("style");
      style.id = "hc_style";
      style.setAttribute("type", "text/css");
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  updateBackgroundElement() {
    let bg = document.getElementById("hc_extension_bkgnd");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "hc_extension_bkgnd";
      Object.assign(bg.style, {
        position: "fixed",
        left: "0px",
        top: "0px",
        right: "0px",
        bottom: "0px",
        zIndex: "-1999999999",
      });
      document.body.appendChild(bg);
    }

    bg.style.display = "block";
    const computedBg = window.getComputedStyle(document.body).background;
    bg.style.background = computedBg;

    // Обработка прозрачного фона
    this.handleTransparentBackground(bg);
  }

  handleTransparentBackground(bg) {
    const bgColor = bg.style.backgroundColor;
    const rgba = bgColor.match(
      /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*\.[\d]+)\)/
    );

    if (rgba && rgba[4] === "0") {
      bg.style.backgroundColor = "#fff";
    }
  }

  updateSvgFilters() {
    if (document.getElementById("hc_extension_svg_filters")) return;

    const wrap = document.createElement("span");
    wrap.id = "hc_extension_svg_filters";
    wrap.hidden = true;
    wrap.innerHTML = this.getSvgContent();
    document.body.appendChild(wrap);
  }

  // Шаблоны и контент
  getCssTemplate() {
    return `
            /* Базовые стили для всех схем */
            html[hc] {
                filter: url(#hc_extension_off) !important;
            }

            /* Схема 1: Резкий контраст */
            html[hc="a1"] {
                filter: url(#hc_extension_high_contrast) !important;
                background: white !important;
            }

            /* Схема 2: Оттенки серого */
            html[hc="a2"] {
                filter: url(#hc_extension_grayscale) !important;
            }

            /* Схема 3: Инверсия цвета */
            html[hc="a3"] {
                filter: url(#hc_extension_invert) !important;
            }

            /* Схема 4: Негатив */
            html[hc="a4"] {
                filter: url(#hc_extension_invert_grayscale) !important;
            }

            /* Схема 5: Желтый на черном */
            html[hc="a5"] {
                filter: url(#hc_extension_yellow_on_black) !important;
                background: black !important;
            }
        `;
  }

  getSvgContent() {
    return `
            <svg xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="hc_extension_off">
                        <feComponentTransfer>
                            <feFuncR type="identity"/>
                            <feFuncG type="identity"/>
                            <feFuncB type="identity"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_high_contrast">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="3" intercept="-1"/>
                            <feFuncG type="linear" slope="3" intercept="-1"/>
                            <feFuncB type="linear" slope="3" intercept="-1"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_grayscale">
                        <feColorMatrix type="matrix" values="
                            0.2126 0.7152 0.0722 0 0
                            0.2126 0.7152 0.0722 0 0
                            0.2126 0.7152 0.0722 0 0
                            0 0 0 1 0"/>
                    </filter>

                    <filter id="hc_extension_invert">
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues="1 0"/>
                            <feFuncG type="table" tableValues="1 0"/>
                            <feFuncB type="table" tableValues="1 0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_invert_grayscale">
                        <feColorMatrix type="matrix" values="
                            0.2126 0.7152 0.0722 0 0
                            0.2126 0.7152 0.0722 0 0
                            0.2126 0.7152 0.0722 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues="1 0"/>
                            <feFuncG type="table" tableValues="1 0"/>
                            <feFuncB type="table" tableValues="1 0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_yellow_on_black">
                        <feColorMatrix type="matrix" values="
                            0.3 0.5 0.2 0 0
                            0.3 0.5 0.2 0 0
                            0 0 0 0 0
                            0 0 0 1 0"/>
                    </filter>
                </defs>
            </svg>
        `;
  }
}

// Инициализация менеджера высокого контраста
new HighContrastManager();

// Функция для применения стилей контраста
function applyHighContrast(scheme) {
    // Удаляем предыдущие стили
    document.documentElement.removeAttribute('hc');
    document.body.classList.remove('high-contrast-enabled');

    // Применяем новые стили
    if (scheme) {
        document.documentElement.setAttribute('hc', `a${scheme}`);
        document.body.classList.add('high-contrast-enabled');

        // Добавляем стили для научных режимов
        const styles = `
            /* Дейтеранопия */
            html[hc="a6"] {
                filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter></svg>#deuteranopia');
            }

            /* Протанопия */
            html[hc="a7"] {
                filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="protanopia"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/></filter></svg>#protanopia');
            }

            /* Тританопия */
            html[hc="a8"] {
                filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0"/></filter></svg>#tritanopia');
            }

            /* Повышенная читаемость */
            html[hc="a9"] {
                background-color: #f8f9fa !important;
                color: #000000 !important;
                filter: contrast(120%) brightness(105%) saturate(90%);
            }

            html[hc="a9"] * {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Open Sans', sans-serif !important;
                letter-spacing: 0.03em !important;
                line-height: 1.5 !important;
                text-shadow: none !important;
            }

            /* Ночное зрение */
            html[hc="a10"] {
                filter: brightness(80%) sepia(30%) hue-rotate(320deg) saturate(40%);
                background-color: #1a0f0f !important;
                color: #ff4d4d !important;
            }

            html[hc="a10"] * {
                text-shadow: none !important;
            }
        `;

        // Добавляем стили на страницу
        const styleSheet = document.createElement('style');
        styleSheet.id = 'high-contrast-scientific-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// Слушаем сообщения от popup.js и background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);

    if (request.action === 'updateTabs') {
        applyHighContrast(request.scheme);
    }

    if (request.enabled !== undefined) {
        if (request.enabled) {
            applyHighContrast(request.scheme);
        } else {
            // Отключаем все стили
            document.documentElement.removeAttribute('hc');
            document.body.classList.remove('high-contrast-enabled');
            const styleSheet = document.getElementById('high-contrast-scientific-styles');
            if (styleSheet) {
                styleSheet.remove();
            }
        }
    }
});

// Применяем сохраненные настройки при загрузке страницы
chrome.storage.local.get(['enabled', 'scheme'], (result) => {
    if (result.enabled) {
        applyHighContrast(result.scheme);
    }
});
