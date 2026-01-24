// DOM Elements
const terminalInput = document.getElementById('terminalInput');
const terminalOutput = document.getElementById('terminalOutput');
const cursor = document.querySelector('.cursor');

// Command history
let commandHistory = [];
let historyIndex = -1;

// Available commands
const commands = {
    '/help': handleHelp,
    '/clear': handleClear,
    'help': handleHelp,
    'clear': handleClear
};

// Initialize
function init() {
    terminalInput.focus();

    // Keep input focused
    document.addEventListener('click', () => {
        terminalInput.focus();
    });

    // Handle Enter key
    terminalInput.addEventListener('keydown', handleKeyDown);

    // Position cursor at the end of input
    terminalInput.addEventListener('input', updateCursor);
    terminalInput.addEventListener('click', updateCursor);
}

// Handle keyboard input
function handleKeyDown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const command = terminalInput.value.trim();

        if (command) {
            executeCommand(command);
            commandHistory.push(command);
            historyIndex = commandHistory.length;
        }

        terminalInput.value = '';
        updateCursor();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateHistory(1);
    }
}

// Navigate command history
function navigateHistory(direction) {
    if (commandHistory.length === 0) return;

    historyIndex += direction;

    if (historyIndex < 0) {
        historyIndex = 0;
    } else if (historyIndex >= commandHistory.length) {
        historyIndex = commandHistory.length;
        terminalInput.value = '';
        return;
    }

    terminalInput.value = commandHistory[historyIndex];
    updateCursor();
}

// Update cursor position
function updateCursor() {
    const inputRect = terminalInput.getBoundingClientRect();
    const textWidth = getTextWidth(terminalInput.value, terminalInput);
    cursor.style.marginLeft = `${textWidth - 8}px`;
}

// Get text width helper
function getTextWidth(text, element) {
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    const style = window.getComputedStyle(element);
    context.font = `${style.fontSize} ${style.fontFamily}`;
    return context.measureText(text).width;
}

// Execute command
function executeCommand(command) {
    // Display the command in output
    addOutput(`$ ${command}`, 'command');

    // Check if command exists
    if (commands[command.toLowerCase()]) {
        commands[command.toLowerCase()]();
    } else {
        handleUnknownCommand(command);
    }

    // Scroll to bottom
    scrollToBottom();
}

// Add output line
function addOutput(text, className = '') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminalOutput.appendChild(line);
}

// Scroll to bottom
function scrollToBottom() {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Command: /help
function handleHelp() {
    addOutput('');
    addOutput('═══════════════════════════════════════════════════════════', 'prompt');
    addOutput('                    HELP DOCUMENTATION                     ', 'prompt');
    addOutput('═══════════════════════════════════════════════════════════', 'prompt');
    addOutput('');
    addOutput('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
    addOutput('Sed do eiusmod tempor incididunt ut labore et dolore magna');
    addOutput('aliqua. Ut enim ad minim veniam, quis nostrud exercitation');
    addOutput('ullamco laboris nisi ut aliquip ex ea commodo consequat.');
    addOutput('');
    addOutput('Duis aute irure dolor in reprehenderit in voluptate velit');
    addOutput('esse cillum dolore eu fugiat nulla pariatur. Excepteur sint');
    addOutput('occaecat cupidatat non proident, sunt in culpa qui officia');
    addOutput('deserunt mollit anim id est laborum.');
    addOutput('');
    addOutput('Sed ut perspiciatis unde omnis iste natus error sit voluptatem');
    addOutput('accusantium doloremque laudantium, totam rem aperiam, eaque ipsa');
    addOutput('quae ab illo inventore veritatis et quasi architecto beatae vitae');
    addOutput('dicta sunt explicabo.');
    addOutput('');
    addOutput('Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit');
    addOutput('aut fugit, sed quia consequuntur magni dolores eos qui ratione');
    addOutput('voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem');
    addOutput('ipsum quia dolor sit amet, consectetur, adipisci velit.');
    addOutput('');
    addOutput('─────────────────────────────────────────────────────────────');
    addOutput('Available Commands:', 'success');
    addOutput('  /help  - Display this help information');
    addOutput('  /clear - Clear the terminal screen');
    addOutput('─────────────────────────────────────────────────────────────');
    addOutput('');
}

// Command: /clear
function handleClear() {
    terminalOutput.innerHTML = '';
    addOutput('Terminal cleared.', 'success');
    addOutput('');
}

// Handle unknown command
function handleUnknownCommand(command) {
    addOutput(`Command not found: ${command}`, 'error');
    addOutput('Type /help for options.', 'error');
    addOutput('');
}

// Start the terminal
init();
