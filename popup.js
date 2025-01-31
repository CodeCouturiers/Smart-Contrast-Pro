// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Современный модульный подход к управлению контрастом
class ContrastManager {
    constructor() {
        this.site = null;
        this.shortcuts = {
            toggle: navigator.platform.includes('Mac') ? '⌘+Shift+F11' : 'Shift+F11',
            scheme: navigator.platform.includes('Mac') ? '⌘+Shift+F12' : 'Shift+F12'
        };

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
        this.initializeI18n();
        this.setupEventListeners();
        await this.getCurrentTab();
        this.updateUI();
    }

    // Инициализация интернационализации
    initializeI18n() {
        document.querySelectorAll('[i18n-content]').forEach(element => {
            const msg = element.getAttribute('i18n-content');
            element.textContent = chrome.i18n.getMessage(msg);
        });
    }

    // Настройка слушателей событий
    setupEventListeners() {
        // Использование делегирования событий для радио кнопок
        document.querySelectorAll('input[name="scheme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.handleSchemeChange(parseInt(e.target.value));
                }
            });
        });

        // Кнопки управления
        document.getElementById('toggle').addEventListener('click', () => this.toggleContrast());
        document.getElementById('make_default').addEventListener('click', () => this.makeDefault());
        document.getElementById('forget').addEventListener('click', () => this.resetSettings());
    }

    // Получение текущей вкладки
    async getCurrentTab() {
        try {
            await new Promise((resolve) => {
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, (tabs) => {
                    if (tabs && tabs.length > 0) {
                        const tab = tabs[0];
                        if (this.isDisallowedUrl(tab.url)) {
                            this.setupDefaultMode();
                        } else {
                            this.setupSiteMode(tab.url);
                        }
                    } else {
                        console.warn('No active tab found');
                        this.setupDefaultMode();
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('Error getting current tab:', error);
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
        const isEnabled = this.getEnabled();
        document.body.classList.toggle('disabled', !isEnabled);

        this.updateTitle(isEnabled);
        this.updateToggleButton(isEnabled);
        this.updateSubControls(isEnabled);
        this.updateSchemeSelection();
        this.updateDocumentAttributes();

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
        return localStorage.getItem('enabled') !== 'false';
    }

    setEnabled(enabled) {
        localStorage.setItem('enabled', enabled);
    }

    getDefaultScheme() {
        const scheme = localStorage.getItem('scheme');
        return scheme >= 0 && scheme <= 5 ? parseInt(scheme) : 3;
    }

    getSiteScheme(site) {
        try {
            const siteSchemes = JSON.parse(localStorage.getItem('siteschemes') || '{}');
            const scheme = siteSchemes[site];
            return scheme >= 0 && scheme <= 5 ? parseInt(scheme) : this.getDefaultScheme();
        } catch {
            return this.getDefaultScheme();
        }
    }

    setSiteScheme(site, scheme) {
        try {
            const siteSchemes = JSON.parse(localStorage.getItem('siteschemes') || '{}');
            siteSchemes[site] = scheme;
            localStorage.setItem('siteschemes', JSON.stringify(siteSchemes));
        } catch (error) {
            console.error('Error saving site scheme:', error);
        }
    }

    // Обработчики действий пользователя
    toggleContrast() {
        this.setEnabled(!this.getEnabled());
        this.updateUI();
    }

    handleSchemeChange(value) {
        if (this.site) {
            this.setSiteScheme(this.site, value);
        } else {
            localStorage.setItem('scheme', value);
        }
        this.updateUI();
        // Отправляем сообщение для обновления всех вкладок
        chrome.runtime.sendMessage({ action: 'updateTabs' });
    }

    makeDefault() {
        if (this.site) {
            localStorage.setItem('scheme', this.getSiteScheme(this.site));
            this.updateUI();
        }
    }

    resetSettings() {
        localStorage.setItem('siteschemes', '{}');
        this.updateUI();
    }

    // Утилитарный метод для установки значения radio кнопок
    setRadioValue(name, value) {
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
