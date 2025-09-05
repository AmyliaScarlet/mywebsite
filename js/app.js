// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    const pageRenderConfigs = [
        { templateName: 'header', moduleName: 'site', containerSelector: 'header .container' },
        { templateName: 'hero', moduleName: 'site', containerSelector: '.hero .container' },
        { templateName: 'mobile', moduleName: 'mobile', containerSelector: '#mobile-content' },
        { templateName: 'pc', moduleName: 'pc', containerSelector: '#pc-content' },
        { templateName: 'ai', moduleName: 'ai', containerSelector: '#ai-content' },
        { templateName: 'other', moduleName: 'other', containerSelector: '#other-content' },
        { templateName: 'footer', moduleName: 'site', containerSelector: 'footer .container' }
    ];

    const engine = new ASTemplateEngine();
    engine.renderMode = 'parallel'; // serial 或 parallel
    engine.initPage(pageRenderConfigs);
});