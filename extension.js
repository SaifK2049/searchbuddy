const vscode = require('vscode');
const axios = require('axios');
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser');  // Import XMLParser, XMLBuilder, and XMLValidator

/**
 * @param {vscode.ExtensionContext} context
 */

/*

*/
function activate(context) {
    // Register the command
    let disposable = vscode.commands.registerCommand('searchbuddy.Searchexample', async function () {
        try {
            // Fetch the RSS XML data
            const response = await axios.get('https://www.gju.edu.jo/rss.xml');
            const xmlData = response.data;

            // Validate the XML data before parsing
            if (XMLValidator.validate(xmlData) === true) {
                // Create an instance of XMLParser
                const parser = new XMLParser();
                
                // Parse the XML data into a JSON object
                let jsonObj = parser.parse(xmlData);
                
                // Create an instance of XMLBuilder
                const builder = new XMLBuilder();
                
                // Rebuild the XML from the JSON object
                let sampleXmlData = builder.build(jsonObj);

                // Create and show a new webview
                const panel = vscode.window.createWebviewPanel(
                    'searchGJU', // Internal identifier for the webview
                    'GJU RSS Feed', // Title of the webview
                    vscode.ViewColumn.One, // Editor column to show the new webview in
                    {} // Webview options (e.g. enabling scripts)
                );

                // Convert the parsed data into a pretty-printed HTML table
                let tableContent = `<h1>GJU RSS Feed</h1><table border="1"><tr><th>Title</th><th>Link</th></tr>`;
                const items = jsonObj.rss.channel.item;

                for (let item of items) {
                    tableContent += `<tr><td>${item.title}</td><td><a href="${item.link}" target="_blank">${item.link}</a></td></tr>`;
                }
                tableContent += '</table>';

                // Set the content of the webview
                panel.webview.html = getWebviewContent(tableContent);

            } else {
                vscode.window.showErrorMessage('Invalid XML data');
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch RSS feed: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

// Helper function to return the webview's HTML content
function getWebviewContent(tableContent) {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GJU RSS Feed</title>
        </head>
        <body>
            ${tableContent}
        </body>
        </html>`;
}

module.exports = {
    activate,
    deactivate
}
