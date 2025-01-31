// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Современный модульный подход к управлению контрастом
class ContrastManager {
    constructor() {
        console.log('ContrastManager: Initializing...');
        this.site = null;
        this.shortcuts = {
            toggle: navigator.platform.includes('Mac') ? '⌘+Shift+F11' : 'Shift+F11',
            scheme: navigator.platform.includes('Mac') ? '⌘+Shift+F12' : 'Shift+F12'
        };
        console.log('ContrastManager: Shortcuts configured:', this.shortcuts);

        // Константы для схем контраста
        this.SCHEMES = {
            NORMAL: '0',
            INCREASED: '1',
            GRAYSCALE: '2',
            INVERTED: '3',
            INVERTED_GRAYSCALE: '4',
            YELLOW_ON_BLACK: '5'
        };

        this.init();
    }

    // Инициализация приложения
    async init() {
        console.log('ContrastManager: Starting initialization...');
        this.initializeI18n();
        this.setupEventListeners();
        await this.getCurrentTab();
        this.updateUI();
        console.log('ContrastManager: Initialization complete');
    }

    // Инициализация интернационализации
    initializeI18n() {
        console.log('ContrastManager: Initializing i18n...');
        document.querySelectorAll('[i18n-content]').forEach(element => {
            const msg = element.getAttribute('i18n-content');
            element.textContent = chrome.i18n.getMessage(msg);
        });
    }

    // Настройка слушателей событий
    setupEventListeners() {
        console.log('ContrastManager: Setting up event listeners...');

        document.querySelectorAll('input[name="scheme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    console.log('ContrastManager: Radio button changed to:', e.target.value);
                    this.handleSchemeChange(parseInt(e.target.value));
                }
            });
        });

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
        console.log('ContrastManager: Getting current tab...');
        try {
            await new Promise((resolve) => {
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, (tabs) => {
                    if (tabs && tabs.length > 0) {
                        const tab = tabs[0];
                        console.log('ContrastManager: Current tab:', tab.url);
                        if (this.isDisallowedUrl(tab.url)) {
                            console.log('ContrastManager: URL is disallowed, setting up default mode');
                            this.setupDefaultMode();
                        } else {
                            console.log('ContrastManager: Setting up site mode for:', tab.url);
                            this.setupSiteMode(tab.url);
                        }
                    } else {
                        console.warn('ContrastManager: No active tab found');
                        this.setupDefaultMode();
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('ContrastManager: Error getting current tab:', error);
            this.setupDefaultMode();
        }
    }

    // Проверка запрещенных URL
    isDisallowedUrl(url) {
        return url.startsWith('chrome') || url.startsWith('about');
    }

    // Настройка режима по умолчанию
    setupDefaultMode() {
        const schemeTitle = document.getElementById('scheme_title');
        schemeTitle.textContent = chrome.i18n.getMessage('highcontrast_default');
        document.getElementById('make_default').style.display = 'none';
    }

    // Настройка режима для конкретного сайта
    setupSiteMode(url) {
        this.site = new URL(url).hostname;
        const schemeTitle = document.getElementById('scheme_title');
        schemeTitle.innerHTML = chrome.i18n.getMessage('highcontrast_',
            `<b>${this.site}</b><br><span class="kb">(${this.shortcuts.scheme})</span>`);
        document.getElementById('make_default').style.display = 'block';
    }

    // Обновление UI
    updateUI() {
        console.log('ContrastManager: Updating UI...');
        const isEnabled = this.getEnabled();
        console.log('ContrastManager: Extension is enabled:', isEnabled);

        document.body.classList.toggle('disabled', !isEnabled);
        this.updateTitle(isEnabled);
        this.updateToggleButton(isEnabled);
        this.updateSubControls(isEnabled);
        this.updateSchemeSelection();
        this.updateDocumentAttributes();

        console.log('ContrastManager: Sending updateTabs message');
        chrome.runtime.sendMessage({ action: 'updateTabs' });
    }

    // Обновление заголовка
    updateTitle(isEnabled) {
        const titleKey = isEnabled ? 'highcontrast_enabled' : 'highcontrast_disabled';
        document.getElementById('title').textContent = chrome.i18n.getMessage(titleKey);
    }

    // Обновление кнопки переключения
    updateToggleButton(isEnabled) {
        const toggleKey = isEnabled ? 'highcontrast_disable' : 'highcontrast_enable';
        document.getElementById('toggle').innerHTML = `
            <b>${chrome.i18n.getMessage(toggleKey)}</b><br>
            <span class="kb">(${this.shortcuts.toggle})</span>
        `;
    }

    // Обновление дополнительных элементов управления
    updateSubControls(isEnabled) {
        const subcontrols = document.getElementById('subcontrols');
        subcontrols.style.display = isEnabled ? 'block' : 'none';
    }

    // Обновление выбора схемы
    updateSchemeSelection() {
        const scheme = this.site ?
            this.getSiteScheme(this.site) :
            this.getDefaultScheme();

        this.setRadioValue('scheme', scheme);

        if (this.site) {
            const makeDefaultBtn = document.getElementById('make_default');
            makeDefaultBtn.disabled = (scheme === this.getDefaultScheme());
        }
    }

    // Обновление атрибутов документа
    updateDocumentAttributes() {
        const scheme = this.site ?
            this.getSiteScheme(this.site) :
            this.getDefaultScheme();

        const hcValue = this.getEnabled() ? `a${scheme}` : 'a0';
        document.documentElement.setAttribute('hc', hcValue);
    }

    // Утилиты для работы с localStorage
    getEnabled() {
        const enabled = localStorage.getItem('enabled') !== 'false';
        console.log('ContrastManager: Getting enabled state:', enabled);
        return enabled;
    }

    setEnabled(enabled) {
        console.log('ContrastManager: Setting enabled state:', enabled);
        localStorage.setItem('enabled', enabled);
    }

    getDefaultScheme() {
        const scheme = localStorage.getItem('scheme');
        const result = scheme >= 0 && scheme <= 5 ? parseInt(scheme) : 3;
        console.log('ContrastManager: Getting default scheme:', result);
        return result;
    }

    getSiteScheme(site) {
        console.log('ContrastManager: Getting scheme for site:', site);
        try {
            const siteSchemes = JSON.parse(localStorage.getItem('siteschemes') || '{}');
            const scheme = siteSchemes[site];
            const result = scheme >= 0 && scheme <= 5 ? parseInt(scheme) : this.getDefaultScheme();
            console.log('ContrastManager: Site scheme:', result);
            return result;
        } catch (error) {
            console.error('ContrastManager: Error getting site scheme:', error);
            return this.getDefaultScheme();
        }
    }

    setSiteScheme(site, scheme) {
        console.log('ContrastManager: Setting scheme for site:', site, 'Scheme:', scheme);
        try {
            const siteSchemes = JSON.parse(localStorage.getItem('siteschemes') || '{}');
            siteSchemes[site] = scheme;
            localStorage.setItem('siteschemes', JSON.stringify(siteSchemes));
            console.log('ContrastManager: Successfully saved site scheme');
        } catch (error) {
            console.error('ContrastManager: Error saving site scheme:', error);
        }
    }

    // Обработчики действий пользователя
    toggleContrast() {
        const currentState = this.getEnabled();
        console.log('ContrastManager: Toggling contrast. Current state:', currentState);
        this.setEnabled(!currentState);
        this.updateUI();
    }

    handleSchemeChange(value) {
        console.log('ContrastManager: Handling scheme change. Value:', value, 'Site:', this.site);
        if (this.site) {
            console.log('ContrastManager: Setting site-specific scheme');
            this.setSiteScheme(this.site, value);
        } else {
            console.log('ContrastManager: Setting default scheme');
            localStorage.setItem('scheme', value);
        }
        this.updateUI();
        chrome.runtime.sendMessage({ action: 'updateTabs' });
    }

    makeDefault() {
        if (this.site) {
            const currentScheme = this.getSiteScheme(this.site);
            console.log('ContrastManager: Making current scheme default:', currentScheme);
            localStorage.setItem('scheme', currentScheme);
            this.updateUI();
        }
    }

    resetSettings() {
        console.log('ContrastManager: Resetting all site settings');
        localStorage.setItem('siteschemes', '{}');
        this.updateUI();
    }

    // Утилитарный метод для установки значения radio кнопок
    setRadioValue(name, value) {
        console.log('ContrastManager: Setting radio value:', name, value);
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        radios.forEach(radio => {
            radio.checked = radio.value === value.toString();
            radio.disabled = !this.getEnabled();
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new ContrastManager();
});
