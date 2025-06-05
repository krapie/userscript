// ==UserScript==
// @name         Drag to Proofread
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Drag to select text and get grammar suggestions from local Ollama
// @author       krpaie
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiUrl: 'http://localhost:11434/api/generate',
        model: 'llama3.2'
    };

    // Initialize the script
    init();

    function init() {
        setupTextSelection();
        addStyles();
    }

    function setupTextSelection() {
        let selectedText = '';
        let selectionRange = null;

        document.addEventListener('mouseup', function(e) {
            // Don't process text selection if clicking on our button
            if (e.target && (e.target.id === 'grammar-check-btn' || e.target.closest('#grammar-check-btn'))) {
                return;
            }
            
            // Add a small delay to ensure the selection is finalized
            setTimeout(() => {
                const selection = window.getSelection();
                selectedText = selection.toString().trim();
                
                if (selectedText.length > 0) {
                    try {
                        selectionRange = selection.getRangeAt(0);
                        showGrammarButton(e.pageX, e.pageY, selectedText, selectionRange);
                    } catch (error) {
                        // Ignore errors
                    }
                } else {
                    hideGrammarButton();
                }
            }, 10);
        });

        document.addEventListener('mousedown', function(e) {
            // Don't hide the button if clicking on the grammar button itself or any of its child elements
            if (e.target && (e.target.id === 'grammar-check-btn' || e.target.closest('#grammar-check-btn'))) {
                return;
            }
            
            hideGrammarButton();
        });
    }

    function showGrammarButton(x, y, text, range) {
        hideGrammarButton();
        
        const button = document.createElement('div');
        button.id = 'grammar-check-btn';
        button.innerHTML = 'Check Grammar';
        button.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y + 20}px;
            background: #0969da;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            z-index: 10000;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-weight: 500;
            border: 1px solid #0969da;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        button.addEventListener('mouseenter', () => {
            button.style.background = '#0860ca';
            button.style.borderColor = '#0860ca';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#0969da';
            button.style.borderColor = '#0969da';
        });

        button.addEventListener('click', (event) => {
            // Prevent all event propagation and default behavior
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.preventDefault();
            
            checkGrammar(text, range);
        }, true); // Use capture phase

        document.body.appendChild(button);
    }

    function hideGrammarButton() {
        const existingButton = document.getElementById('grammar-check-btn');
        if (existingButton) {
            existingButton.remove();
        }
    }

    function checkGrammar(text, range) {
        hideGrammarButton();
        showLoadingIndicator();

        const prompt = `Please proofread and improve the grammar of the following text. Return only the corrected version without any explanations or additional text:\n\n"${text}"`;

        const requestData = {
            model: CONFIG.model,
            prompt: prompt,
            stream: false
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: CONFIG.apiUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(requestData),
            timeout: 30000,
            onload: function(response) {
                hideLoadingIndicator();
                
                if (response.status !== 200) {
                    alert(`API request failed with status ${response.status}: ${response.responseText}`);
                    return;
                }

                try {
                    const data = JSON.parse(response.responseText);
                    
                    if (!data.response) {
                        alert('Invalid response from Ollama API. Please try again.');
                        return;
                    }

                    const suggestion = data.response.trim();
                    showSuggestion(text, suggestion, range);
                } catch (error) {
                    alert('Error parsing API response. Please try again.');
                }
            },
            onerror: function(error) {
                hideLoadingIndicator();
                alert('Failed to connect to Ollama API. Please check if Ollama is running on localhost:11434.');
            },
            ontimeout: function() {
                hideLoadingIndicator();
                alert('Request timed out. Please try again.');
            }
        });
    }

    function showLoadingIndicator() {
        const loader = document.createElement('div');
        loader.id = 'grammar-loader';
        loader.innerHTML = 'Checking grammar...';
        loader.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            background: #f6f8fa;
            color: #24292f;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10001;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            border: 1px solid #d0d7de;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        `;
        document.body.appendChild(loader);
    }

    function hideLoadingIndicator() {
        const loader = document.getElementById('grammar-loader');
        if (loader) {
            loader.remove();
        }
    }

    function showSuggestion(original, suggestion, range) {
        // Remove quotes if they exist
        const cleanSuggestion = suggestion.replace(/^["']|["']$/g, '');
        
        if (original === cleanSuggestion) {
            showNotification('No grammar issues found', '#28a745');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'grammar-suggestion-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10002;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #ffffff;
            padding: 24px;
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            border: 1px solid #d0d7de;
        `;

        content.innerHTML = `
            <h3 style="margin-top: 0; color: #24292f; font-weight: 600; font-size: 16px; margin-bottom: 16px;">Grammar Suggestion</h3>
            <div style="margin: 16px 0;">
                <div style="font-weight: 600; color: #656d76; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Original</div>
                <div style="background: #fff8c5; padding: 12px; border-radius: 6px; margin: 8px 0; border: 1px solid #d4a72c; font-size: 14px; line-height: 1.5;">${original}</div>
            </div>
            <div style="margin: 16px 0;">
                <div style="font-weight: 600; color: #656d76; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Suggested</div>
                <div style="background: #dafbe1; padding: 12px; border-radius: 6px; margin: 8px 0; border: 1px solid #28a745; font-size: 14px; line-height: 1.5;">${cleanSuggestion}</div>
            </div>
            <div style="text-align: right; margin-top: 24px; display: flex; gap: 8px; justify-content: flex-end;">
                <button id="discard-suggestion" style="background: #f6f8fa; color: #24292f; border: 1px solid #d0d7de; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500;">Close</button>
                <button id="copy-suggestion" style="background: #0969da; color: white; border: 1px solid #0969da; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500;">Copy to Clipboard</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('copy-suggestion').addEventListener('click', () => {
            navigator.clipboard.writeText(cleanSuggestion).then(() => {
                showNotification('Suggestion copied to clipboard', '#0969da');
                modal.remove();
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = cleanSuggestion;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showNotification('Suggestion copied to clipboard', '#0969da');
                modal.remove();
            });
        });

        document.getElementById('discard-suggestion').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    function showNotification(message, color) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            background: ${color};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10001;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-weight: 500;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #grammar-check-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
            }
            #copy-suggestion:hover {
                background: #0860ca !important;
                border-color: #0860ca !important;
            }
            #discard-suggestion:hover {
                background: #f3f4f6 !important;
                border-color: #afb8c1 !important;
            }
        `;
        document.head.appendChild(style);
    }

})();
