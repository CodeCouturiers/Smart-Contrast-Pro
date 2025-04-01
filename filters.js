class FilterGenerator {
  constructor() {
    this.filters = {};
  }

  generateSVG() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">

      <filter id="hc_extension_off">
        <feComponentTransfer>
          <feFuncR type="identity"/>
          <feFuncG type="identity"/>
          <feFuncB type="identity"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_high_contrast">
        <feComponentTransfer>
          <feFuncR type="linear" slope="3" intercept="-0.6"/>
          <feFuncG type="linear" slope="3" intercept="-0.6"/>
          <feFuncB type="linear" slope="3" intercept="-0.6"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_grayscale">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.5" intercept="-0.3"/>
          <feFuncG type="linear" slope="1.5" intercept="-0.3"/>
          <feFuncB type="linear" slope="1.5" intercept="-0.3"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_invert">
        <feComponentTransfer>
          <feFuncR type="table" tableValues="1 0"/>
          <feFuncG type="table" tableValues="1 0"/>
          <feFuncB type="table" tableValues="1 0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_invert_grayscale">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="1 0"/>
          <feFuncG type="table" tableValues="1 0"/>
          <feFuncB type="table" tableValues="1 0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_yellow_on_black">
        <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="-1" intercept="1"/>
          <feFuncG type="linear" slope="-0.7" intercept="0.7"/>
          <feFuncB type="linear" slope="0" intercept="0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_deuteranopia">
        <feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.4" intercept="-0.2"/>
          <feFuncG type="linear" slope="1.4" intercept="-0.2"/>
          <feFuncB type="linear" slope="1.4" intercept="-0.2"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_protanopia">
        <feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.4" intercept="-0.2"/>
          <feFuncG type="linear" slope="1.4" intercept="-0.2"/>
          <feFuncB type="linear" slope="1.4" intercept="-0.2"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_tritanopia">
        <feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.4" intercept="-0.2"/>
          <feFuncG type="linear" slope="1.4" intercept="-0.2"/>
          <feFuncB type="linear" slope="1.4" intercept="-0.2"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_high_legibility">
        <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="1" exponent="1.7" offset="0"/>
          <feFuncG type="gamma" amplitude="1" exponent="1.7" offset="0"/>
          <feFuncB type="gamma" amplitude="1" exponent="1.7" offset="0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_night_vision">
        <feColorMatrix type="matrix" values="0.2 0.4 -0.2 0 0 -0.2 0.6 0.2 0 0 -0.2 0.3 0.4 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.2" intercept="0"/>
          <feFuncG type="linear" slope="1.2" intercept="0"/>
          <feFuncB type="linear" slope="1.2" intercept="0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_black_on_white">
        <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="3" intercept="-1"/>
          <feFuncG type="linear" slope="3" intercept="-1"/>
          <feFuncB type="linear" slope="3" intercept="-1"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_light_sepia">
        <feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.1" intercept="0"/>
          <feFuncG type="linear" slope="1.1" intercept="0"/>
          <feFuncB type="linear" slope="1.1" intercept="0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_dark_sepia">
        <feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="1 0"/>
          <feFuncG type="table" tableValues="1 0"/>
          <feFuncB type="table" tableValues="1 0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_blue_light_filter">
        <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 0.9 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.05" intercept="0"/>
          <feFuncG type="linear" slope="1.05" intercept="0"/>
          <feFuncB type="linear" slope="0.8" intercept="0"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_monochrome_blue">
        <feColorMatrix type="matrix" values="0.2 0.25 0.55 0 0 0.2 0.25 0.55 0 0 0.2 0.25 0.55 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.5" intercept="-0.2"/>
          <feFuncG type="linear" slope="1.5" intercept="-0.2"/>
          <feFuncB type="linear" slope="1.5" intercept="-0.2"/>
        </feComponentTransfer>
      </filter>

      <filter id="hc_extension_2k_sharptext">
        <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="1" exponent="1.3" offset="0"/>
          <feFuncG type="gamma" amplitude="1" exponent="1.3" offset="0"/>
          <feFuncB type="gamma" amplitude="1" exponent="1.3" offset="0"/>
        </feComponentTransfer>
        <feConvolveMatrix order="3" kernelMatrix="0 -0.15 0 -0.15 1.8 -0.15 0 -0.15 0" divisor="1" bias="0"/>
      </filter>

    </svg>
    `;
  }
}
