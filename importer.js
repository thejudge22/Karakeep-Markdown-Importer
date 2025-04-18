document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_KARAKEEP_TITLE_LENGTH = 255; // Keep for title truncation if needed

    // --- DOM Elements ---
    const karakeepUrlInput = document.getElementById('karakeepUrl');
    const karakeepApiKeyInput = document.getElementById('karakeepApiKey');
    const markdownFilesInput = document.getElementById('markdownFiles'); // Updated ID
    const startButton = document.getElementById('startButton');
    const logOutput = document.getElementById('logOutput');

    // --- Event Listener ---
    startButton.addEventListener('click', startImportProcess);

    // --- Helper Functions ---

    /**
     * Logs a message to the output area.
     * @param {string} message - The message to log.
     * @param {boolean} isError - Whether the message is an error.
     */
    function logMessage(message, isError = false) {
        const now = new Date();
        const timestamp = now.toISOString();
        const logEntry = document.createElement('div');
        logEntry.classList.add('log-entry');
        logEntry.textContent = `[${timestamp}] ${message}`;
        if (isError) {
            logEntry.classList.add('log-error');
            console.error(`[${timestamp}] ${message}`);
        } else {
            console.log(`[${timestamp}] ${message}`);
        }
        logOutput.appendChild(logEntry);
        // Scroll to the bottom
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    /**
     * Clears the log output area.
     */
    function clearLog() {
        logOutput.innerHTML = '';
        logMessage("Log cleared.");
    }

    /**
     * Pauses execution for a specified duration.
     * @param {number} ms - Milliseconds to sleep.
     * @returns {Promise<void>}
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Reads the content of a File object as text.
     * @param {File} file - The file object to read.
     * @returns {Promise<string>} The file content as a string.
     */
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            reader.onerror = (event) => {
                reject(new Error(`File "${file.name}" could not be read! Code: ${event.target.error.code}`));
            };
            reader.readAsText(file);
        });
    }

    /**
     * Performs a fetch request to the Karakeep API.
     * @param {string} url - The full API endpoint URL.
     * @param {string} method - HTTP method ('GET', 'POST', 'PUT', etc.).
     * @param {string} apiKey - The Karakeep API key.
     * @param {object|null} body - The request body object (will be JSON.stringify'd).
     * @returns {Promise<object|null>} The parsed JSON response or null for empty responses.
     * @throws {Error} If the fetch fails or the API returns an error status.
     */
    async function fetchKarakeep(url, method, apiKey, body = null) {
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        logMessage(`API Request: ${method} ${url}`, false); // Log request start

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                let errorText = `API Error: ${response.status} ${response.statusText}`;
                try {
                    const errorBody = await response.text();
                    errorText += ` - ${errorBody.substring(0, 200)}`; // Limit error body length
                } catch (e) { /* Ignore if reading body fails */ }
                 logMessage(`API Response Error: ${method} ${url} -> Status ${response.status}`, true);
                throw new Error(errorText);
            }

            // Handle empty responses (e.g., 204 No Content)
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                 logMessage(`API Response OK: ${method} ${url} -> Status ${response.status} (No Content)`, false);
                return null;
            }

            const data = await response.json();
            logMessage(`API Response OK: ${method} ${url} -> Status ${response.status}`, false);
            return data;

        } catch (error) {
            // Catch both fetch network errors and errors thrown above
            logMessage(`Fetch Error for ${method} ${url}: ${error.message}`, true);
            throw error; // Re-throw to be caught by the calling function
        }
    }

     /**
     * Extracts the filename without the extension.
     * @param {string} fullFileName - The full name of the file (e.g., "document.md").
     * @returns {string} The filename without the extension (e.g., "document").
     */
    function getFileNameWithoutExtension(fullFileName) {
        return fullFileName.replace(/\.[^/.]+$/, ""); // Remove last dot and extension
    }

    /**
     * Truncates a title if it exceeds the maximum allowed length.
     * @param {string} title - The original title.
     * @returns {string} The potentially truncated title.
     */
    function truncateTitle(title) {
        if (title.length > MAX_KARAKEEP_TITLE_LENGTH) {
            // Add ellipsis if space allows (at least 3 chars needed for ellipsis)
             if (MAX_KARAKEEP_TITLE_LENGTH >= 3) {
                return title.substring(0, MAX_KARAKEEP_TITLE_LENGTH - 3) + "...";
            } else { // Not enough space even for ellipsis, just truncate hard
                return title.substring(0, MAX_KARAKEEP_TITLE_LENGTH);
            }
        }
        return title;
    }


    /**
     * Creates a new item (bookmark) in Karakeep at the root level.
     * @param {string} apiUrl - Base Karakeep API URL.
     * @param {string} apiKey - Karakeep API Key.
     * @param {string} title - The title for the new item.
     * @param {string} textContent - The content (text) for the new item.
     * @returns {Promise<boolean>} True if creation was successful, false otherwise.
     */
    async function createRootItemInKarakeep(apiUrl, apiKey, title, textContent) {
        const truncatedTitle = truncateTitle(title);
        const payload = {
            title: truncatedTitle,
            text: textContent,
            type: "text",
            archived: false,
            favourited: false,
            note: `Imported from Markdown file: ${title}.md`, // Add original filename as note
            summary: "", // Could potentially add first few lines of text
            // url: "" // Not applicable for text type
        };

        const operation = "CREATE";
        logMessage(`Attempting ${operation}: Create global bookmark for "${title}"...`);
        const createUrl = `${apiUrl}/bookmarks`;

        try {
            // Step 1: Create global bookmark
            const createdBookmarkData = await fetchKarakeep(createUrl, 'POST', apiKey, payload);
            const newBookmarkId = createdBookmarkData?.id ? String(createdBookmarkData.id) : null;

            if (!newBookmarkId) {
                logMessage(`ERROR: Could not extract 'id' from POST /bookmarks response for "${title}". Response: ${JSON.stringify(createdBookmarkData).substring(0, 200)}...`, true);
                return false; // Creation failed
            }
            logMessage(`Successfully ${operation}D Bookmark ID ${newBookmarkId} for "${title}"`);
            return true; // Creation successful

        } catch (error) {
            // Catch errors from the CREATE step
            logMessage(`An unexpected error occurred during ${operation} for "${title}": ${error.message}`, true);
            return false;
        }
    }


    // --- Main Import Logic ---
    /**
     * Orchestrates the entire import process for Markdown files.
     */
    async function startImportProcess() {
        clearLog();
        startButton.disabled = true;
        logMessage("--- Starting Markdown Import Process ---");

        // --- Get User Inputs ---
        const apiUrl = karakeepUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
        const apiKey = karakeepApiKeyInput.value.trim();
        const files = markdownFilesInput.files; // Get FileList

        // --- Basic Validation ---
        if (!apiUrl || !apiKey || !files || files.length === 0) {
            logMessage("ERROR: Please fill in API URL, API Key, and select at least one Markdown file.", true);
            startButton.disabled = false;
            return;
        }
        if (!apiUrl.endsWith('/api/v1')) {
             logMessage("Warning: API URL doesn't end with '/api/v1'. Ensure it's correct.", true);
        }

        let filesProcessedCount = 0;
        let filesSyncedSuccessfully = 0;
        const totalFiles = files.length;

        try {
            // --- Process Files ---
            logMessage(`\n--- Processing ${totalFiles} Markdown file(s) ---`);

            for (const file of files) {
                filesProcessedCount++;
                const originalFileName = file.name;
                logMessage(`\n[${filesProcessedCount}/${totalFiles}] Processing file: ${originalFileName}`);

                if (!originalFileName.toLowerCase().endsWith('.md')) {
                     logMessage(`Skipping file "${originalFileName}" as it does not have a .md extension.`, true);
                     continue;
                }

                try {
                    // Read file content
                    const markdownContent = await readFileContent(file);
                    logMessage(`Read content of "${originalFileName}" (${markdownContent.length} chars)`);

                    // Determine title
                    const itemTitle = getFileNameWithoutExtension(originalFileName);

                    // Create item in Karakeep
                    const syncSuccess = await createRootItemInKarakeep(
                        apiUrl, apiKey, itemTitle, markdownContent
                    );

                    if (syncSuccess) {
                        filesSyncedSuccessfully++;
                    } else {
                        logMessage(`Failed to import "${originalFileName}" to Karakeep. Check logs above.`, true);
                    }

                } catch (fileReadError) {
                    logMessage(`Error processing file "${originalFileName}": ${fileReadError.message}`, true);
                    // Continue to next file
                }

                await sleep(100); // Delay between processing each file
            }

        } catch (error) {
            // Catch unexpected errors during the loop setup or fatal errors within loop not caught above
            logMessage(`FATAL ERROR during import process: ${error.message}`, true);
            logMessage("Import process halted.", true);
        } finally {
            // --- Finalize Run ---
            logMessage("\n--- Import Run Summary ---");
            logMessage(`Total Markdown Files Selected: ${totalFiles}`);
            logMessage(`Files Processed Attempted: ${filesProcessedCount}`);
            logMessage(`Files Imported Successfully to Karakeep: ${filesSyncedSuccessfully}`);
            logMessage("--- End of Run ---");
            startButton.disabled = false; // Re-enable button
        }
    }
}); // End DOMContentLoaded