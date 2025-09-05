// js/core/ast-engine.js
class ASTemplateEngine {
    constructor() {
        this.loader = new ResourceLoader();
        this.templateCache = new Map();
        this.dataCache = new Map();
        this.renderMode = 'parallel';
    }

    // 编译模板
    compile(template, data) {
        // 创建临时容器
        const container = document.createElement('div');
        container.innerHTML = template;
        
        // 处理模板指令
        this.processNode(container, data);
        
        return container.innerHTML;
    }

    // 处理DOM节点
    processNode(node, data) {
        // 处理当前节点的指令
        this.processDirectives(node, data);
        
        // 递归处理子节点
        const children = Array.from(node.childNodes);
        for (const child of children) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                this.processNode(child, data);
            } else if (child.nodeType === Node.TEXT_NODE) {
                this.processTextNode(child, data);
            }
        }
    }

    // 处理文本节点的变量插值
    processTextNode(node, data) {
        const text = node.textContent;
        if (text.includes('{{')) {
            const newText = text.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
                const value = this.getNestedValue(data, path);
                return value !== undefined && value !== null ? value : '';
            });
            node.textContent = newText;
        }
    }

    // 处理节点上的指令
    processDirectives(node, data) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        
        // 处理ast-for指令
        if (node.hasAttribute('ast-for')) {
            this.processForDirective(node, data);
            return; // 处理完for指令后不再处理其他指令
        }
        
        // 处理ast-if指令
        if (node.hasAttribute('ast-if')) {
            this.processIfDirective(node, data);
        }
        
        // 处理属性中的变量
        this.processAttributes(node, data);
    }

    // 处理属性中的变量
    processAttributes(node, data) {
        const attributes = Array.from(node.attributes);
        for (const attr of attributes) {
            if (attr.value.includes('{{')) {
                const newValue = attr.value.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
                    const value = this.getNestedValue(data, path);
                    return value !== undefined && value !== null ? value : '';
                });
                node.setAttribute(attr.name, newValue);
            }
        }
    }

    // 处理ast-for指令
    processForDirective(element, data) {
        const forExpression = element.getAttribute('ast-for');
        element.removeAttribute('ast-for');
        
        // 解析for表达式: "item in items" 或 "(item, index) in items"
        const forParts = forExpression.match(/(?:\(([^,]+),\s*([^)]+)\)|(\w+))\s+in\s+([\w.]+)/);
        
        if (!forParts) return;
        
        const itemName = forParts[1] || forParts[3];
        const indexName = forParts[2];
        const dataPath = forParts[4];
        
        const value = this.getNestedValue(data, dataPath);
        
        if (!Array.isArray(value)) return;
        
        // 保存原始内容
        const originalContent = element.innerHTML;
        const fragment = document.createDocumentFragment();
        
        // 为每个数组项生成内容
        value.forEach((item, index) => {
            // 创建子上下文
            const childContext = { ...data };
            childContext[itemName] = item;
            if (indexName) {
                childContext[indexName] = index;
            }
            
            // 创建临时元素来编译内容
            const tempElement = document.createElement('div');
            tempElement.innerHTML = originalContent;
            
            // 处理子内容 - 这里需要递归处理所有子节点
            this.processNode(tempElement, childContext);
            
            // 创建克隆节点
            const clone = element.cloneNode(true);
            clone.innerHTML = tempElement.innerHTML;
            
            // 处理克隆节点的属性（包括属性中的模板变量）
            this.processAttributes(clone, childContext);
            
            // 添加到文档片段
            fragment.appendChild(clone);
        });
        
        // 用生成的内容替换原始元素
        element.parentNode.replaceChild(fragment, element);
    }

    // 处理ast-if指令
    processIfDirective(element, data) {
        const conditionExpression = element.getAttribute('ast-if');
        element.removeAttribute('ast-if');
        
        // 支持简单的表达式求值
        let conditionValue = false;
        
        try {
            // 创建求值上下文
            const context = { ...data };
            
            // 将表达式中的变量替换为上下文中的值
            let evalExpression = conditionExpression;
            const variables = conditionExpression.match(/(\w+\.?\w*)/g) || [];
            
            variables.forEach(variable => {
                if (variable.includes('.')) {
                    // 处理嵌套属性
                    const value = this.getNestedValue(data, variable);
                    if (value !== undefined) {
                        evalExpression = evalExpression.replace(
                            new RegExp(`\\b${variable}\\b`, 'g'), 
                            JSON.stringify(value)
                        );
                    }
                } else if (data[variable] !== undefined) {
                    // 处理简单属性
                    evalExpression = evalExpression.replace(
                        new RegExp(`\\b${variable}\\b`, 'g'), 
                        JSON.stringify(data[variable])
                    );
                }
            });
            
            // 安全地求值
            conditionValue = (new Function('return ' + evalExpression))();
        } catch (error) {
            console.error('Error evaluating ast-if expression:', error);
            conditionValue = false;
        }
        
        if (!conditionValue) {
            element.parentNode.removeChild(element);
        }
    }

    // 获取嵌套对象属性
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : '';
        }, obj);
    }

    // 渲染模板到指定元素
    async render(templateName, dataName, containerSelector) {
        try {
            const [template, data] = await Promise.all([
                this.loader.loadTemplate(`templates/${templateName}.asth`),
                this.loader.loadJSON(`data/${dataName}.json`)
            ]);

            if (!template || !data) {
                console.error('Failed to load template or data');
                return;
            }

            const compiled = this.compile(template, data);
            const container = document.querySelector(containerSelector);
            
            if (container) {
                container.innerHTML = compiled;
            } else {
                console.error(`Container ${containerSelector} not found`);
            }
        } catch (error) {
            console.error('Rendering error:', error);
        }
    }

    // 初始化页面
    async initPage(renderConfigs = []) {
        try {
            // 支持并行或串行渲染
            // serial 或 parallel
            if (this.renderMode === 'parallel') {
                // 并行渲染（更快但可能占用更多资源）
                await Promise.all(renderConfigs.map(config => 
                    this.render(config.templateName, config.moduleName, config.containerSelector)
                ));
            } else {
                // 串行渲染（默认，更稳定）
                for (const config of renderConfigs) {
                    try {
                        await this.render(
                            config.templateName, 
                            config.moduleName, 
                            config.containerSelector,
                            config.renderOptions // 可选的额外参数
                        );
                    } catch (error) {
                        console.error(`渲染 ${config.templateName} 失败:`, error);
                        // 可选择是否继续渲染其他模块
                        if (config.critical) {
                            throw error;
                        }
                    }
                }
            }
            
            // 初始化页面交互
            this.initInteractions();
            
        } catch (error) {
            console.error('页面初始化失败:', error);
            throw error;
        }
    }
    // 初始化页面交互
    initInteractions() {
        // 平滑滚动效果
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // 卡片悬停动画
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
        
        // 导航栏滚动效果
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
                header.style.background = 'rgba(255, 255, 255, 0.98)';
            } else {
                header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
                header.style.background = 'rgba(255, 255, 255, 0.98)';
            }
        });
    }
}