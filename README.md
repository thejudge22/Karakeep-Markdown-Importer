# Karakeep Markdown Importer

A simple web-based tool to import multiple Markdown files into your Karakeep instance as text bookmarks.

## Features

*   **Batch Import:** Select and import multiple `.md` files at once.
*   **Automatic Title:** Uses the filename (without extension) as the Karakeep bookmark title.
*   **Content Import:** Imports the full Markdown content into the Karakeep bookmark's text field.
*   **Local Processing:** Runs entirely in your browser; your API key and file contents are sent directly to your Karakeep instance and are not stored elsewhere.
*   **Local Storage:** The Karakeep API URL and API Key are stored in your browser's local storage for quick access on subsequent uses.
*   **Basic Logging:** Provides feedback on the import process directly in the browser.

## How to Use

1.  **Clone or Download:** Get the code from this repository.
2.  **Open `index.html`:** Simply open the `index.html` file in your web browser. No server is required.
3.  **Enter Karakeep Details:**
    *   **Karakeep API URL:** Enter the base URL of your Karakeep instance's API, typically ending in `/api/v1` (e.g., `http://localhost:3000/api/v1`).
    *   **Karakeep API Key:** Enter your personal API key from your Karakeep settings.
4.  **Select Markdown Files:** Click the "Choose Files" button and select one or more `.md` files from your computer.
5.  **Start Import:** Click the "Start Import" button.
6.  **Monitor Log:** Watch the "Log Output" area for progress and any errors during the import process.

## Requirements

*   A running Karakeep instance.
*   A valid Karakeep API Key with permissions to create bookmarks.
*   A modern web browser.

## Security Note

Your Karakeep API Key and the content of your Markdown files are processed locally within your browser and are sent directly to the Karakeep API URL you provide. This tool does not send your data to any third-party servers.

## Development

This is a simple client-side tool built with HTML, CSS, and vanilla JavaScript. Contributions or suggestions are welcome!

## License

[Specify your license here, e.g., MIT License]