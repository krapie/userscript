// ==UserScript==
// @name         Markdown-Enhanced Textarea
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Enhances textarea with Markdown formatting and preview
// @match        http://localhost:*/*
// @match        https://localhost:*/*
// @match        http://127.0.0.1:*/*
// @match        https://127.0.0.1:*/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/marked/4.0.16/marked.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Styling for the markdown preview and toolbar
    GM_addStyle(`
        .markdown-toolbar {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
        }
        .markdown-toolbar button {
            background-color: #e0e0e0;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 3px;
        }
        .markdown-toolbar button:hover {
            background-color: #d0d0d0;
        }
        .markdown-preview {
            border: 1px solid #ddd;
            padding: 10px;
            margin-top: 10px;
            min-height: 100px;
            background-color: #fff;
            border-radius: 4px;
        }
        .markdown-container {
            max-width: 800px;
            margin: 20px auto;
        }
    `);

    // Function to create markdown-enhanced textarea
    function enhanceTextareaWithMarkdown(textarea) {
        // Wrap the textarea in a container
        const container = document.createElement('div');
        container.className = 'markdown-container';
        textarea.parentNode.insertBefore(container, textarea);
        container.appendChild(textarea);

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'markdown-toolbar';
        container.insertBefore(toolbar, textarea);

        // Markdown formatting buttons
        const formatButtons = [
            { text: 'Bold', format: '**' },
            { text: 'Italic', format: '*' },
            { text: 'Code', format: '`' },
            { text: 'Link', format: '[text](url)' },
            { text: 'Heading', format: '# ' }
        ];

        formatButtons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.addEventListener('click', () => {
                insertMarkdownFormat(textarea, btn.format);
            });
            toolbar.appendChild(button);
        });

        // Create preview area
        const preview = document.createElement('div');
        preview.className = 'markdown-preview';
        container.appendChild(preview);

        // Setup syntax highlighting and markdown parsing
        marked.setOptions({
            highlight: function(code, lang) {
                return hljs.highlightAuto(code).value;
            }
        });

        // Update preview on input
        textarea.addEventListener('input', () => {
            preview.innerHTML = marked.parse(textarea.value);
        });

        // Function to insert markdown formatting
        function insertMarkdownFormat(textarea, format) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selected = textarea.value.substring(start, end);
            
            let newText;
            if (format === '[text](url)') {
                newText = `[${selected || 'link text'}](${selected ? '' : 'https://example.com'})`;
            } else {
                newText = `${format}${selected}${format}`;
            }

            textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
            
            // Set cursor position
            const newCursorPos = start + newText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();

            // Trigger preview update
            textarea.dispatchEvent(new Event('input'));
        }
    }

    // Function to find and enhance textareas
    function findAndEnhanceTextareas() {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            if (!textarea.classList.contains('markdown-enhanced')) {
                enhanceTextareaWithMarkdown(textarea);
                textarea.classList.add('markdown-enhanced');
            }
        });
    }

    // Run on page load and when new elements are added
    findAndEnhanceTextareas();
    
    // Use MutationObserver to catch dynamically added textareas
    const observer = new MutationObserver(findAndEnhanceTextareas);
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
})();
