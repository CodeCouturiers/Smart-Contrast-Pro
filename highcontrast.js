// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

class HighContrastManager {
    constructor() {
        this.enabled = false;
        this.scheme = 0;
        this.mode = window.self === window.top ? 'a' : 'b';

        this.init();
    }

    async init() {
        this.setupMessageListener();
        this.setupKeyboardListener();
        this.requestInitialState();
        this.setupMutationObserver();

        // Отложенные обновления для надежности
        setTimeout(() => this.updateExtraElements(), 2000);
        window.addEventListener('load', () => this.onLoadComplete());
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request) => {
            if (this.enabled !== request.enabled || this.scheme !== request.scheme) {
                this.enabled = request.enabled;
                this.scheme = request.scheme;
                this.update();
            }
        });
    }

    setupKeyboardListener() {
        document.addEventListener('keydown', (event) => {
            if (event.shiftKey) {
                if (event.key === 'F11') {
                    chrome.runtime.sendMessage({ action: 'toggleGlobal' });
                    event.preventDefault();
                } else if (event.key === 'F12') {
                    chrome.runtime.sendMessage({ action: 'toggleSite' });
                    event.preventDefault();
                }
            }
        });
    }

    requestInitialState() {
        chrome.runtime.sendMessage(
            { action: 'getInitialState' },
            (response) => {
                this.enabled = response.enabled;
                this.scheme = response.scheme;
                this.update();
            }
        );
    }

    setupMutationObserver() {
        if (document.body) {
            this.observeBodyChanges();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
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
            characterData: false
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
            this.updateExtraElements();
            this.updateHtmlAttributes(html);
            this.triggerRepaint();
        } else {
            this.disableHighContrast(html);
        }
    }

    updateHtmlAttributes(html) {
        const newHcValue = this.mode + this.scheme;
        if (html.getAttribute('hc') !== newHcValue) {
            html.setAttribute('hc', newHcValue);
        }

        if (html.getAttribute('hcx') !== String(this.scheme)) {
            html.setAttribute('hcx', String(this.scheme));
        }
    }

    triggerRepaint() {
        if (window === window.top) {
            window.scrollBy(0, 1);
            window.scrollBy(0, -1);
        }
    }

    disableHighContrast(html) {
        html.setAttribute('hc', this.mode + '0');
        html.setAttribute('hcx', '0');

        setTimeout(() => {
            html.removeAttribute('hc');
            html.removeAttribute('hcx');
            const bg = document.getElementById('hc_extension_bkgnd');
            if (bg) bg.style.display = 'none';
        }, 0);
    }

    updateExtraElements() {
        if (!this.enabled) return;

        this.updateStyleElement();
        this.updateBackgroundElement();
        this.updateSvgFilters();
    }

    updateStyleElement() {
        let style = document.getElementById('hc_style');
        if (!style) {
            const baseUrl = window.location.href.replace(window.location.hash, '');
            const css = this.getCssTemplate().replace(/#/g, baseUrl + '#');

            style = document.createElement('style');
            style.id = 'hc_style';
            style.setAttribute('type', 'text/css');
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    updateBackgroundElement() {
        let bg = document.getElementById('hc_extension_bkgnd');
        if (!bg) {
            bg = document.createElement('div');
            bg.id = 'hc_extension_bkgnd';
            Object.assign(bg.style, {
                position: 'fixed',
                left: '0px',
                top: '0px',
                right: '0px',
                bottom: '0px',
                zIndex: '-1999999999'
            });
            document.body.appendChild(bg);
        }

        bg.style.display = 'block';
        const computedBg = window.getComputedStyle(document.body).background;
        bg.style.background = computedBg;

        // Обработка прозрачного фона
        this.handleTransparentBackground(bg);
    }

    handleTransparentBackground(bg) {
        const bgColor = bg.style.backgroundColor;
        const rgba = bgColor.match(/^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*\.[\d]+)\)/);

        if (rgba && rgba[4] === '0') {
            bg.style.backgroundColor = '#fff';
        }
    }

    updateSvgFilters() {
        if (document.getElementById('hc_extension_svg_filters')) return;

        const wrap = document.createElement('span');
        wrap.id = 'hc_extension_svg_filters';
        wrap.hidden = true;
        wrap.innerHTML = this.getSvgContent();
        document.body.appendChild(wrap);
    }

    // Шаблоны и контент
    getCssTemplate() {
        // Здесь должен быть ваш CSS шаблон
        return `/* Ваш CSS шаблон */`;
    }

    getSvgContent() {
        // Здесь должен быть ваш SVG контент
        return `/* Ваш SVG контент */`;
    }
}

// Инициализация менеджера высокого контраста
new HighContrastManager();
