// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

class HighContrastBackground {
    constructor() {
        this.init();
    }

    async init() {
        this.injectContentScripts();
        this.setupMessageListeners();
        this.setupStorageListener();
        this.setupBrowserAction();
    }

    async injectContentScripts() {
        try {
            // Используем callback-стиль для chrome.windows.getAll
            const windows = await new Promise((resolve) => {
                chrome.windows.getAll({ populate: true }, (windows) => {
                    resolve(windows);
                });
            });

            for (const window of windows) {
                if (window.tabs) {
                    for (const tab of window.tabs) {
                        if (this.isAllowedUrl(tab.url)) {
                            try {
                                await this.injectScriptsIntoTab(tab.id);
                            } catch (tabError) {
                                console.error(`Failed to inject scripts into tab ${tab.id}:`, tabError);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error getting windows:', error);
        }
    }

    isAllowedUrl(url) {
        return !url.startsWith('chrome') && !url.startsWith('about');
    }

    async injectScriptsIntoTab(tabId) {
        try {
            // First inject CSS
            await new Promise((resolve, reject) => {
                chrome.tabs.insertCSS(tabId, {
                    file: 'highcontrast.css',
                    allFrames: true
                }, () => {
                    const err = chrome.runtime.lastError;
                    if (err) {
                        console.log(`CSS injection error for tab ${tabId}:`, err.message);
                        // Don't reject on CSS injection failure, just log it
                        resolve();
                    } else {
                        resolve();
                    }
                });
            });

            // Then inject JavaScript only if it's not already injected via content_scripts
            if (!this.isContentScriptInjected(tabId)) {
                await new Promise((resolve, reject) => {
                    chrome.tabs.executeScript(tabId, {
                        file: 'highcontrast.js',
                        allFrames: true
                    }, () => {
                        const err = chrome.runtime.lastError;
                        if (err) {
                            console.log(`JS injection error for tab ${tabId}:`, err.message);
                            reject(new Error(err.message));
                        } else {
                            resolve();
                        }
                    });
                });
            }
        } catch (error) {
            console.error(`Failed to inject scripts into tab ${tabId}:`, error.message);
            throw error;
        }
    }

    isContentScriptInjected(tabId) {
        // Since we have content_scripts in manifest.json, we don't need to manually inject the JS
        return true;
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateTabs') {
                this.updateAllTabs();
            }
            if (request.action === 'toggleGlobal') {
                this.toggleEnabled();
            }
            if (request.action === 'toggleSite') {
                this.toggleSite(sender.tab?.url || 'www.example.com');
            }
            if (request.action === 'getInitialState') {
                const scheme = sender.tab ?
                    this.getSiteScheme(this.getSiteFromUrl(sender.tab.url)) :
                    this.getDefaultScheme();

                sendResponse({
                    enabled: this.getEnabled(),
                    scheme: scheme
                });
            }
        });
    }

    setupStorageListener() {
        window.addEventListener('storage', () => {
            this.updateAllTabs();
        });
    }

    setupBrowserAction() {
        if (navigator.platform.includes('Mac')) {
            chrome.browserAction.setTitle({
                title: 'High Contrast (⌘+Shift+F11)'
            });
        }
    }

    async updateAllTabs() {
        try {
            // Используем тот же callback-стиль для chrome.windows.getAll
            const windows = await new Promise((resolve) => {
                chrome.windows.getAll({ populate: true }, (windows) => {
                    resolve(windows);
                });
            });

            for (const window of windows) {
                if (window.tabs) {
                    for (const tab of window.tabs) {
                        if (this.isAllowedUrl(tab.url)) {
                            try {
                                const site = this.getSiteFromUrl(tab.url);
                                await chrome.tabs.sendMessage(tab.id, {
                                    enabled: this.getEnabled(),
                                    scheme: this.getSiteScheme(site)
                                });
                            } catch (tabError) {
                                console.error(`Failed to update tab ${tab.id}:`, tabError);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating tabs:', error);
        }
    }

    toggleEnabled() {
        const currentState = this.getEnabled();
        localStorage.setItem('enabled', !currentState);
        this.updateAllTabs();
    }

    toggleSite(url) {
        const site = this.getSiteFromUrl(url);
        let scheme = this.getSiteScheme(site);

        if (scheme > 0) {
            scheme = 0;
        } else {
            scheme = this.getDefaultScheme() > 0 ?
                this.getDefaultScheme() :
                3; // DEFAULT_SCHEME
        }

        this.setSiteScheme(site, scheme);
        this.updateAllTabs();
    }

    // Утилитарные методы
    getEnabled() {
        return localStorage.getItem('enabled') !== 'false';
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

    getSiteFromUrl(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }
}

// Инициализация фонового процесса
new HighContrastBackground();
