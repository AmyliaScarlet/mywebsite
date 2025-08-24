// js/core/loader.js
class ResourceLoader {
    constructor() {
        this.cache = new Map();
    }

    async loadJSON(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.cache.set(url, data);
            return data;
        } catch (error) {
            console.error('Failed to load JSON:', error);
            return null;
        }
    }

    async loadTemplate(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const template = await response.text();
            this.cache.set(url, template);
            return template;
        } catch (error) {
            console.error('Failed to load template:', error);
            return null;
        }
    }
}