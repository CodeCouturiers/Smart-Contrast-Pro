class HighContrastManager {
  constructor() {
    this.isProd = false; // Set to false during testing to enable logging
    this.enabled = false;
    this.scheme = 0;
    this.mode = window.self === window.top ? "a" : "b";
    this.customStyles = null;

    // Определяем все цветовые схемы
    this.COLOR_SCHEMES = {
      0: {
        // Нормальный контраст
        type: "svg",
        filter: "url(#hc_extension_off)",
        background: "inherit",
      },
      1: {
        // Резкий контраст
        type: "svg",
        filter: "url(#hc_extension_high_contrast)",
        background: "white",
      },
      2: {
        // Оттенки серого
        type: "svg",
        filter: "url(#hc_extension_grayscale)",
        background: "inherit",
      },
      3: {
        // Инверсия цвета
        type: "svg",
        filter: "url(#hc_extension_invert)",
        background: "inherit",
      },
      4: {
        // Негатив
        type: "svg",
        filter: "url(#hc_extension_invert_grayscale)",
        background: "inherit",
      },
      5: {
        // Желтый на черном
        type: "svg",
        filter: "url(#hc_extension_yellow_on_black)",
        background: "black",
      },
      6: {
        // Дейтеранопия
        type: "svg",
        filter: "url(#hc_extension_deuteranopia)",
        background: "#000033",
      },
      7: {
        // Протанопия
        type: "svg",
        filter: "url(#hc_extension_protanopia)",
        background: "#000033",
      },
      8: {
        // Тританопия
        type: "svg",
        filter: "url(#hc_extension_tritanopia)",
        background: "#000066",
      },
      9: {
        // Повышенная читаемость
        type: "svg",
        filter: "url(#hc_extension_high_legibility)",
        background: "#1a1a1a",
      },
      10: {
        // Ночное зрение
        type: "svg",
        filter: "url(#hc_extension_night_vision)",
        background: "#000000",
      },
      11: {
        // Черное на белом (высокий контраст)
        type: "svg",
        filter: "url(#hc_extension_black_on_white)",
        background: "white",
      },
      12: {
        // Светлая сепия
        type: "svg",
        filter: "url(#hc_extension_light_sepia)",
        background: "#f4ecd8",
      },
      13: {
        // Темная сепия
        type: "svg",
        filter: "url(#hc_extension_dark_sepia)",
        background: "#2a2018",
      },
      14: {
        // Фильтр синего света
        type: "svg",
        filter: "url(#hc_extension_blue_light_filter)",
        background: "inherit",
      },
      15: {
        // Монохромный синий
        type: "svg",
        filter: "url(#hc_extension_monochrome_blue)",
        background: "#000022",
      },
      16: {
        // Оптимизировано для 2K - Четкий текст
        type: "svg",
        filter: "url(#hc_extension_2k_sharptext)",
        background: "inherit",
      },
    };

    this.log(
      "HighContrastManager: Initializing with default scheme:",
      this.scheme
    );
    this.init();
  }

  // New logging helper method
  log(...args) {
    if (!this.isProd) {
      console.log(...args);
    }
  }

  // Similar methods for other console functions
  warn(...args) {
    if (!this.isProd) {
      console.warn(...args);
    }
  }

  group(label) {
    if (!this.isProd) {
      console.group(label);
    }
  }

  groupEnd() {
    if (!this.isProd) {
      console.groupEnd();
    }
  }

  async init() {
    // Calculate and save the maximum scheme number
    this.calculateMaxScheme();

    this.setupMessageListener();
    this.setupKeyboardListener();
    this.requestInitialState();
    this.setupMutationObserver();

    // Отложенные обновления для надежности
    setTimeout(() => this.updateExtraElements(), 2000);
    window.addEventListener("load", () => this.onLoadComplete());
  }

  calculateMaxScheme() {
    // Get the highest scheme number defined in COLOR_SCHEMES
    const schemeNumbers = Object.keys(this.COLOR_SCHEMES).map((key) =>
      parseInt(key)
    );
    const maxScheme = Math.max(...schemeNumbers);

    this.log("HighContrastManager: Maximum scheme number:", maxScheme);

    // Store in localStorage so background script can access it
    localStorage.setItem("maxScheme", maxScheme.toString());

    // Also send to background script immediately
    chrome.runtime.sendMessage({
      action: "updateMaxScheme",
      maxScheme: maxScheme,
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request) => {
      this.log("HighContrastManager: Received message:", request);

      if (request.customStyles) {
        this.log(
          "HighContrastManager: Received custom styles:",
          request.customStyles
        );
        this.customStyles = request.customStyles;
        this.enabled = true;
        this.update();
      }

      const schemeChanged = this.scheme !== request.scheme;
      const enabledChanged = this.enabled !== request.enabled;

      if (enabledChanged || schemeChanged) {
        this.log("HighContrastManager: State change detected", {
          enabled: `${this.enabled} → ${request.enabled}`,
          scheme: `${this.scheme} → ${request.scheme}`,
        });

        this.enabled = request.enabled;
        if (request.scheme !== undefined && request.scheme !== null) {
          this.scheme = this.validateScheme(request.scheme);
        }
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
    this.log("HighContrastManager: Requesting initial state...");

    chrome.runtime.sendMessage({ action: "getInitialState" }, (response) => {
      this.log("HighContrastManager: Received initial state:", response);

      if (response && typeof response === "object") {
        this.enabled = !!response.enabled;

        if (response.scheme !== undefined && response.scheme !== null) {
          this.scheme = this.validateScheme(response.scheme);
        } else {
          this.scheme = 0;
        }

        this.log("HighContrastManager: Initial state set:", {
          enabled: this.enabled,
          scheme: this.scheme,
        });
      } else {
        this.warn(
          "HighContrastManager: Invalid response from background script, using defaults"
        );
        this.enabled = false;
        this.scheme = 0;
      }

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
    this.log("HighContrastManager: Updating with state:", {
      enabled: this.enabled,
      scheme: this.scheme,
    });

    if (!document.body) {
      this.log("HighContrastManager: No body element, delaying update");
      setTimeout(() => this.update(), 100);
      return;
    }

    const html = document.documentElement;

    if (this.enabled) {
      this.log(
        "HighContrastManager: Applying enabled state with scheme:",
        this.scheme
      );
      this.clearAllStyles();
      document.documentElement.classList.add("high-contrast-enabled");
      this.applyColorScheme(this.scheme);
      this.updateExtraElements();
      this.updateHtmlAttributes(html);
      this.triggerRepaint();
    } else {
      this.log("HighContrastManager: Applying disabled state");
      document.documentElement.classList.remove("high-contrast-enabled");
      this.disableHighContrast(html);
    }
  }

  applyColorScheme(schemeId) {
    const validSchemeId = this.validateScheme(schemeId);
    const scheme = this.COLOR_SCHEMES[validSchemeId];

    this.group("HighContrastManager: Applying Color Scheme");
    this.log("Scheme ID:", validSchemeId);
    this.log("Scheme Type:", scheme.type);
    this.log("Scheme Config:", scheme);

    // Очищаем все существующие стили перед применением новых
    this.clearAllStyles();

    const style = document.createElement("style");
    style.id = "hc_style";
    let css = "";

    if (scheme.type === "svg") {
      this.log("Applying SVG Filter Mode");
      css = `
        html {
          filter: ${scheme.filter} !important;
          ${
            scheme.background !== "inherit"
              ? `background: ${scheme.background} !important;`
              : ""
          }
        }
      `;
    } else if (scheme.type === "css") {
      this.log("Applying CSS Mode with styles:");

      const htmlStyles = {
        filter: scheme.filter,
        background: scheme.background,
        color: scheme.textColor,
        fontSize: scheme.fontSize,
        lineHeight: scheme.lineHeight,
        letterSpacing: scheme.letterSpacing,
      };
      this.log("HTML Styles:", htmlStyles);

      const bodyStyles = {
        backgroundColor: scheme.background,
        color: scheme.textColor,
        fontSize: scheme.fontSize,
        lineHeight: scheme.lineHeight,
        letterSpacing: scheme.letterSpacing,
      };
      this.log("Body Styles:", bodyStyles);

      const elementStyles = {
        textColor: scheme.textColor,
        linkColor: scheme.linkColor,
        background: scheme.background,
        filter: scheme.filter,
      };
      this.log("Element Styles:", elementStyles);

      css = `
        html {
          filter: ${scheme.filter} !important;
          background: ${scheme.background} !important;
          color: ${scheme.textColor} !important;
          ${scheme.fontSize ? `font-size: ${scheme.fontSize} !important;` : ""}
          ${
            scheme.lineHeight
              ? `line-height: ${scheme.lineHeight} !important;`
              : ""
          }
          ${
            scheme.letterSpacing
              ? `letter-spacing: ${scheme.letterSpacing} !important;`
              : ""
          }
        }

        body {
          background-color: ${scheme.background} !important;
          color: ${scheme.textColor} !important;
          ${scheme.fontSize ? `font-size: ${scheme.fontSize} !important;` : ""}
          ${
            scheme.lineHeight
              ? `line-height: ${scheme.lineHeight} !important;`
              : ""
          }
          ${
            scheme.letterSpacing
              ? `letter-spacing: ${scheme.letterSpacing} !important;`
              : ""
          }
        }

        /* Основные текстовые элементы */
        p, span, div, li, td, th, h1, h2, h3, h4, h5, h6 {
          color: ${scheme.textColor} !important;
        }

        /* Ссылки */
        a, a:visited, a:hover, a:active {
          color: ${scheme.linkColor} !important;
        }

        /* Элементы форм */
        input, textarea, select, button {
          background-color: ${scheme.background} !important;
          color: ${scheme.textColor} !important;
          border: 1px solid ${scheme.textColor} !important;
        }

        button:hover {
          background-color: ${scheme.textColor} !important;
          color: ${scheme.background} !important;
        }

        /* Изображения */
        img {
          filter: ${scheme.filter} !important;
        }

        /* Дополнительные элементы */
        iframe, canvas, svg {
          filter: ${scheme.filter} !important;
        }
      `;
    }

    style.textContent = css;
    document.head.appendChild(style);

    // Проверяем применение стилей
    setTimeout(() => {
      this.group("Style Application Check");

      const html = document.documentElement;
      const body = document.body;

      this.log("Applied HTML Styles:", {
        filter: getComputedStyle(html).filter,
        background: getComputedStyle(html).background,
        color: getComputedStyle(html).color,
        fontSize: getComputedStyle(html).fontSize,
        lineHeight: getComputedStyle(html).lineHeight,
        letterSpacing: getComputedStyle(html).letterSpacing,
      });

      this.log("Applied Body Styles:", {
        backgroundColor: getComputedStyle(body).backgroundColor,
        color: getComputedStyle(body).color,
        fontSize: getComputedStyle(body).fontSize,
        lineHeight: getComputedStyle(body).lineHeight,
        letterSpacing: getComputedStyle(body).letterSpacing,
      });

      // Проверяем применение стилей к ссылкам
      const firstLink = document.querySelector("a");
      if (firstLink) {
        this.log("Link Styles:", {
          color: getComputedStyle(firstLink).color,
        });
      }

      this.groupEnd();
    }, 100);

    this.groupEnd();
  }

  clearAllStyles() {
    // Удаляем все стили
    const oldStyle = document.getElementById("hc_style");
    if (oldStyle) {
      oldStyle.remove();
    }

    // Сбрасываем фильтры
    document.documentElement.style.filter = "";
    document.body.style.filter = "";

    // Сбрасываем inline стили
    document.documentElement.style.backgroundColor = "";
    document.documentElement.style.color = "";
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
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

    // Очищаем все стили
    this.clearAllStyles();

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

        /* Схема 6: Дейтеранопия */
        html[hc="a6"] {
            filter: url(#hc_extension_deuteranopia) !important;
            background: #000033 !important;
        }

        /* Схема 7: Протанопия */
        html[hc="a7"] {
            filter: url(#hc_extension_protanopia) !important;
            background: #000033 !important;
        }

        /* Схема 8: Тританопия */
        html[hc="a8"] {
            filter: url(#hc_extension_tritanopia) !important;
            background: #000066 !important;
        }

        /* Схема 9: Повышенная читаемость */
        html[hc="a9"] {
            filter: url(#hc_extension_high_legibility) !important;
            background: #1a1a1a !important;
        }

        /* Схема 10: Ночное зрение */
        html[hc="a10"] {
            filter: url(#hc_extension_night_vision) !important;
            background: #000000 !important;
        }

        /* Схема 11: Черное на белом (высокий контраст) */
        html[hc="a11"] {
            filter: url(#hc_extension_black_on_white) !important;
            background: white !important;
        }

        /* Схема 12: Светлая сепия */
        html[hc="a12"] {
            filter: url(#hc_extension_light_sepia) !important;
            background: #f4ecd8 !important;
        }

        /* Схема 13: Темная сепия */
        html[hc="a13"] {
            filter: url(#hc_extension_dark_sepia) !important;
            background: #2a2018 !important;
        }

        /* Схема 14: Фильтр синего света */
        html[hc="a14"] {
            filter: url(#hc_extension_blue_light_filter) !important;
            background: inherit !important;
        }

        /* Схема 15: Монохромный синий */
        html[hc="a15"] {
            filter: url(#hc_extension_monochrome_blue) !important;
            background: #000022 !important;
        }

        /* Схема 16: Оптимизирована для 2K - Четкий текст */
        html[hc="a16"] {
            filter: url(#hc_extension_2k_sharptext) !important;
            background: inherit !important;
        }

        /* 2K-оптимизированные стили */
        @media screen and (min-width: 1920px) {
            html[hc] * {
                text-rendering: optimizeLegibility !important;
            }

            /* Улучшаем читаемость текста на 2K дисплеях */
            html[hc] p, html[hc] span, html[hc] div, html[hc] h1, html[hc] h2, html[hc] h3, html[hc] h4, html[hc] h5, html[hc] h6 {
                letter-spacing: 0.01em !important;
            }
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
                            <feFuncR type="linear" slope="3.5" intercept="-1"/>
                            <feFuncG type="linear" slope="3.5" intercept="-1"/>
                            <feFuncB type="linear" slope="3.5" intercept="-1"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.3"></feGaussianBlur>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.05" intercept="0"/>
                            <feFuncG type="linear" slope="1.05" intercept="0"/>
                            <feFuncB type="linear" slope="1.05" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_grayscale">
                        <feColorMatrix type="matrix" values="
                            0.2126 0.7152 0.0722 0 0
                            0.2126 0.7152 0.0722 0 0
                            0.2126 0.7152 0.0722 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.2" intercept="0"/>
                            <feFuncG type="linear" slope="1.2" intercept="0"/>
                            <feFuncB type="linear" slope="1.2" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_invert">
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues="1 0"/>
                            <feFuncG type="table" tableValues="1 0"/>
                            <feFuncB type="table" tableValues="1 0"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.3"></feGaussianBlur>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.05" intercept="0"/>
                            <feFuncG type="linear" slope="1.05" intercept="0"/>
                            <feFuncB type="linear" slope="1.05" intercept="0"/>
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
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.2" intercept="0"/>
                            <feFuncG type="linear" slope="1.2" intercept="0"/>
                            <feFuncB type="linear" slope="1.2" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_yellow_on_black">
                        <feColorMatrix type="matrix" values="
                            0.35 0.55 0.25 0 0
                            0.35 0.55 0.25 0 0
                            0 0 0 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.1" intercept="0"/>
                            <feFuncG type="linear" slope="1.1" intercept="0"/>
                            <feFuncB type="linear" slope="1.1" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <!-- Научные режимы -->
                    <filter id="hc_extension_deuteranopia">
                        <feColorMatrix type="matrix" values="
                            0.625 0.375 0 0 0
                            0.7 0.3 0 0 0
                            0 0.3 0.7 0 0
                            0 0 0 1 0"/>
                        <feGaussianBlur stdDeviation="0.2"></feGaussianBlur>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.3" intercept="0"/>
                            <feFuncG type="linear" slope="1.3" intercept="0"/>
                            <feFuncB type="linear" slope="1.3" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_protanopia">
                        <feColorMatrix type="matrix" values="
                            0.567 0.433 0 0 0
                            0.558 0.442 0 0 0
                            0 0.242 0.758 0 0
                            0 0 0 1 0"/>
                        <feGaussianBlur stdDeviation="0.2"></feGaussianBlur>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.3" intercept="0"/>
                            <feFuncG type="linear" slope="1.3" intercept="0"/>
                            <feFuncB type="linear" slope="1.3" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_tritanopia">
                        <feColorMatrix type="matrix" values="
                            0.95 0.05 0 0 0
                            0 0.433 0.567 0 0
                            0 0.475 0.525 0 0
                            0 0 0 1 0"/>
                        <feGaussianBlur stdDeviation="0.2"></feGaussianBlur>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.3" intercept="0"/>
                            <feFuncG type="linear" slope="1.3" intercept="0"/>
                            <feFuncB type="linear" slope="1.3" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_high_legibility">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.4"/>
                            <feFuncG type="linear" slope="1.4"/>
                            <feFuncB type="linear" slope="1.4"/>
                        </feComponentTransfer>
                        <feColorMatrix type="saturate" values="0.9"/>
                        <feGaussianBlur stdDeviation="0.2"></feGaussianBlur>
                        <feConvolveMatrix order="3" kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0" edgeMode="duplicate"/>
                    </filter>

                    <filter id="hc_extension_night_vision">
                        <feColorMatrix type="matrix" values="
                            0.299 0.587 0.114 0 0
                            0.299 0.587 0.114 0 0
                            0.299 0.587 0.114 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="0.8" intercept="0.2"/>
                            <feFuncG type="linear" slope="0.4" intercept="0"/>
                            <feFuncB type="linear" slope="0.3" intercept="0"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.3"></feGaussianBlur>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.05" intercept="0"/>
                            <feFuncG type="linear" slope="1.05" intercept="0"/>
                            <feFuncB type="linear" slope="1.05" intercept="0"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_black_on_white">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="4" intercept="-0.3"/>
                            <feFuncG type="linear" slope="4" intercept="-0.3"/>
                            <feFuncB type="linear" slope="4" intercept="-0.3"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.3"></feGaussianBlur>
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues="0 0 0 0 0 0 0 0 0 1"/>
                            <feFuncG type="table" tableValues="0 0 0 0 0 0 0 0 0 1"/>
                            <feFuncB type="table" tableValues="0 0 0 0 0 0 0 0 0 1"/>
                        </feComponentTransfer>
                    </filter>

                    <filter id="hc_extension_light_sepia">
                        <feColorMatrix type="matrix" values="
                            0.393 0.769 0.189 0 0
                            0.349 0.686 0.168 0 0
                            0.272 0.534 0.131 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.2" intercept="0"/>
                            <feFuncG type="linear" slope="1.2" intercept="0"/>
                            <feFuncB type="linear" slope="0.9" intercept="0"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.2"></feGaussianBlur>
                    </filter>

                    <filter id="hc_extension_dark_sepia">
                        <feColorMatrix type="matrix" values="
                            0.393 0.769 0.189 0 0
                            0.349 0.686 0.168 0 0
                            0.272 0.534 0.131 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="0.7" intercept="0.1"/>
                            <feFuncG type="linear" slope="0.6" intercept="0.08"/>
                            <feFuncB type="linear" slope="0.4" intercept="0.05"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.2"></feGaussianBlur>
                    </filter>

                    <filter id="hc_extension_blue_light_filter">
                        <feColorMatrix type="matrix" values="
                            1 0 0 0 0
                            0 0.9 0 0 0
                            0 0 0.6 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.1" intercept="0"/>
                            <feFuncG type="linear" slope="1.1" intercept="0"/>
                            <feFuncB type="linear" slope="0.4" intercept="0"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.2"></feGaussianBlur>
                    </filter>

                    <filter id="hc_extension_monochrome_blue">
                        <feColorMatrix type="matrix" values="
                            0.2 0.25 0.2 0 0
                            0.2 0.25 0.2 0 0
                            0.7 0.6 0.7 0 0
                            0 0 0 1 0"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="0.5" intercept="0"/>
                            <feFuncG type="linear" slope="0.5" intercept="0"/>
                            <feFuncB type="linear" slope="1.3" intercept="0"/>
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="0.3"></feGaussianBlur>
                    </filter>

                    <!-- 2K-оптимизированные режимы -->
                    <filter id="hc_extension_2k_sharptext">
                        <feConvolveMatrix order="3" kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0" edgeMode="duplicate"/>
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.2" intercept="0"/>
                            <feFuncG type="linear" slope="1.2" intercept="0"/>
                            <feFuncB type="linear" slope="1.2" intercept="0"/>
                        </feComponentTransfer>
                    </filter>
                </defs>
            </svg>
        `;
  }

  validateScheme(scheme) {
    this.log("HighContrastManager: Validating scheme:", scheme);

    if (scheme === undefined || scheme === null) {
      this.warn(
        "HighContrastManager: Scheme is undefined or null, using default (0)"
      );
      return 0;
    }

    const schemeId = parseInt(scheme);

    if (isNaN(schemeId)) {
      this.warn(
        `HighContrastManager: Invalid scheme format: ${scheme}, using default (0)`
      );
      return 0;
    }

    if (this.COLOR_SCHEMES.hasOwnProperty(schemeId)) {
      this.log(`HighContrastManager: Scheme ${schemeId} is valid`);
      return schemeId;
    }

    this.warn(
      `HighContrastManager: Invalid scheme value: ${scheme}, using default (0)`
    );
    return 0;
  }
}

// Инициализация менеджера высокого контраста
new HighContrastManager();
