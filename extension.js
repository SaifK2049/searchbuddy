const vscode = require('vscode');
const axios = require('axios');
const { XMLParser, XMLValidator } = require('fast-xml-parser');  // Import XMLParser, XMLValidator

const GJU_SEARCH_URL = 'https://www.gju.edu.jo/en/search/node/';  // GJU search page base URL

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // Register a new TreeView (Sidebar) to show GJU RSS Feed and Search Results
    const gjuTreeProvider = new GJUTreeDataProvider();
    vscode.window.createTreeView('gjuSidebar', { treeDataProvider: gjuTreeProvider });

    // Register the command to fetch and display RSS feed in the sidebar
    let fetchRSSCommand = vscode.commands.registerCommand('searchbuddy.fetchRSS', async function () {
        try {
            const response = await axios.get('https://www.gju.edu.jo/rss.xml');
            const xmlData = response.data;

            if (XMLValidator.validate(xmlData) === true) {
                const parser = new XMLParser();
                let jsonObj = parser.parse(xmlData);

                const items = jsonObj?.rss?.channel?.item || [];
                gjuTreeProvider.setItems(items);
            } else {
                vscode.window.showErrorMessage('Invalid XML data');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch RSS feed: ${error.message}`);
        }
    });

    // Command to search the GJU website
    let searchGJUCommand = vscode.commands.registerCommand('searchbuddy.searchGJU', async function () {
        try {
            const searchTerm = await vscode.window.showInputBox({
                prompt: 'Enter search term for GJU website',
                placeHolder: 'e.g., admissions, courses, campus'
            });

            if (searchTerm) {
                const searchUrl = `${GJU_SEARCH_URL}${encodeURIComponent(searchTerm)}`;
                const response = await axios.get(searchUrl);
                const searchResults = response.data;

                // Display search results in a new webview
                const panel = vscode.window.createWebviewPanel(
                    'searchGJU',
                    `Search Results for "${searchTerm}"`,
                    vscode.ViewColumn.One,
                    {}
                );
                panel.webview.html = getWebviewContent(searchResults);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to search GJU website: ${error.message}`);
        }
    });

    context.subscriptions.push(fetchRSSCommand, searchGJUCommand);
}

// Helper function to return the webview's HTML content
function getWebviewContent(content) {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GJU Webview</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                table, th, td {
                    border: 1px solid #ddd;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                }
                th {
                    background-color: #f4f4f4;
                }
                tr:hover {
                    background-color: #f1f1f1;
                }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>`;
}

// TreeDataProvider for the sidebar
class GJUTreeDataProvider {
    constructor() {
        this.items = [];
        this.onDidChangeTreeData = new vscode.EventEmitter();
    }

    setItems(items) {
        this.items = items;
        this.onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(element.title);
        treeItem.command = {
            command: 'searchbuddy.openItem',
            title: 'Open RSS Item',
            arguments: [element]
        };
        treeItem.tooltip = element.title;
        treeItem.description = element.link;
        return treeItem;
    }

    getChildren() {
        if (!this.items.length) {
            return [new vscode.TreeItem('No items available')];
        }
        return this.items;
    }
}

// Command to open a specific RSS item
vscode.commands.registerCommand('searchbuddy.openItem', function (item) {
    const panel = vscode.window.createWebviewPanel(
        'searchGJU',
        item.title,
        vscode.ViewColumn.One,
        {}
    );
    panel.webview.html = getWebviewContent(`<h1>${item.title}</h1><p>${item.description}</p><a href="${item.link}" target="_blank">${item.link}</a>`);
});

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
