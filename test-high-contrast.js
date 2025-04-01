// Simplified High Contrast Manager for testing
class TestHighContrastManager {
  constructor() {
    this.isProd = false;
    this.enabled = false;
    this.scheme = 0;
    this.customStyles = null;

    // Color schemes definition (same as in highcontrast.js)
    this.COLOR_SCHEMES = {
      0: {
        // Normal contrast
        type: "svg",
        filter: "url(#hc_extension_off)",
        background: "inherit",
      },
      1: {
        // High contrast
        type: "svg",
        filter: "url(#hc_extension_high_contrast)",
        background: "white",
      },
      2: {
        // Grayscale
        type: "svg",
        filter: "url(#hc_extension_grayscale)",
        background: "inherit",
      },
      3: {
        // Invert colors
        type: "svg",
        filter: "url(#hc_extension_invert)",
        background: "inherit",
      },
      4: {
        // Negative
        type: "svg",
        filter: "url(#hc_extension_invert_grayscale)",
        background: "inherit",
      },
      5: {
        // Yellow on black
        type: "svg",
        filter: "url(#hc_extension_yellow_on_black)",
        background: "black",
      },
      6: {
        // Deuteranopia
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
    };

    this.log("TestHighContrastManager: Initializing");
    this.init();
  }

  // Logging methods
  log(...args) {
    if (!this.isProd) {
      console.log(...args);
    }
  }

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

  init() {
    this.setupSvgFilters();
    this.setupTestControls();
  }

  setupTestControls() {
    // Override chrome.runtime.sendMessage for testing
    if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined') {
      window.chrome = {
        runtime: {
          sendMessage: (message) => {
            this.log("Message sent:", message);
            if (message.action === 'toggleSite') {
              this.enabled = !this.enabled;
              this.update();
            } else if (message.action === 'changeScheme') {
              this.enabled = message.enabled;
              this.scheme = message.scheme;
              this.update();
            }
          }
        }
      };
    }
  }

  update() {
    this.log("TestHighContrastManager: Updating with state:", {
      enabled: this.enabled,
      scheme: this.scheme,
    });

    if (!document.body) {
      this.log("TestHighContrastManager: No body element, delaying update");
      setTimeout(() => this.update(), 100);
      return;
    }

    const html = document.documentElement;

    if (this.enabled) {
      this.log(
        "TestHighContrastManager: Applying enabled state with scheme:",
        this.scheme
      );
      this.clearAllStyles();
      document.documentElement.classList.add("high-contrast-enabled");
      this.applyColorScheme(this.scheme);
      this.updateHtmlAttributes(html);
    } else {
      this.log("TestHighContrastManager: Applying disabled state");
      document.documentElement.classList.remove("high-contrast-enabled");
      this.disableHighContrast(html);
    }
  }

  applyColorScheme(schemeId) {
    const scheme = this.COLOR_SCHEMES[schemeId] || this.COLOR_SCHEMES[0];

    this.group("TestHighContrastManager: Applying Color Scheme");
    this.log("Scheme ID:", schemeId);
    this.log("Scheme Type:", scheme.type);
    this.log("Scheme Config:", scheme);

    // Clear existing styles
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

        /* Text elements */
        p, span, div, li, td, th, h1, h2, h3, h4, h5, h6 {
          color: ${scheme.textColor} !important;
        }

        /* Links */
        a, a:visited, a:hover, a:active {
          color: ${scheme.linkColor} !important;
        }

        /* Form elements */
        input, textarea, select, button {
          background-color: ${scheme.background} !important;
          color: ${scheme.textColor} !important;
          border: 1px solid ${scheme.textColor} !important;
        }

        button:hover {
          background-color: ${scheme.textColor} !important;
          color: ${scheme.background} !important;
        }

        /* Images */
        img {
          filter: ${scheme.filter} !important;
        }

        /* Additional elements */
        iframe, canvas, svg {
          filter: ${scheme.filter} !important;
        }
      `;
    }

    style.textContent = css;
    document.head.appendChild(style);
    this.groupEnd();
  }

  clearAllStyles() {
    // Remove existing styles
    const oldStyle = document.getElementById("hc_style");
    if (oldStyle) {
      oldStyle.remove();
    }

    // Reset filters
    document.documentElement.style.filter = "";
    document.body.style.filter = "";

    // Reset inline styles
    document.documentElement.style.backgroundColor = "";
    document.documentElement.style.color = "";
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
  }

  updateHtmlAttributes(html) {
    const mode = "a"; // Always use top-level mode for testing
    const newHcValue = mode + this.scheme;

    if (html.getAttribute("hc") !== newHcValue) {
      html.setAttribute("hc", newHcValue);
    }

    if (html.getAttribute("hcx") !== String(this.scheme)) {
      html.setAttribute("hcx", String(this.scheme));
    }
  }

  disableHighContrast(html) {
    html.setAttribute("hc", "a0");
    html.setAttribute("hcx", "0");

    // Clear styles
    this.clearAllStyles();

    setTimeout(() => {
      html.removeAttribute("hc");
      html.removeAttribute("hcx");
    }, 0);
  }

  setupSvgFilters() {
    if (document.getElementById("hc_extension_svg_filters")) return;

    const wrap = document.createElement("span");
    wrap.id = "hc_extension_svg_filters";
    wrap.hidden = true;
    wrap.innerHTML = this.getSvgContent();
    document.body.appendChild(wrap);
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

          <!-- Scientific modes -->
          <filter id="hc_extension_deuteranopia">
            <feColorMatrix type="matrix" values="
              0.625 0.375 0 0 0
              0.7 0.3 0 0 0
              0 0.3 0.7 0 0
              0 0 0 1 0"/>
          </filter>

          <filter id="hc_extension_protanopia">
            <feColorMatrix type="matrix" values="
              0.567 0.433 0 0 0
              0.558 0.442 0 0 0
              0 0.242 0.758 0 0
              0 0 0 1 0"/>
          </filter>

          <filter id="hc_extension_tritanopia">
            <feColorMatrix type="matrix" values="
              0.95 0.05 0 0 0
              0 0.433 0.567 0 0
              0 0.475 0.525 0 0
              0 0 0 1 0"/>
          </filter>

          <filter id="hc_extension_high_legibility">
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.2"/>
              <feFuncG type="linear" slope="1.2"/>
              <feFuncB type="linear" slope="1.2"/>
            </feComponentTransfer>
            <feColorMatrix type="saturate" values="0.9"/>
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
              <feFuncB type="linear" slope="0.4" intercept="0"/>
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
    `;
  }
}

// Initialize the test manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new TestHighContrastManager();
});
