// DOM Elements
const terminalInput = document.getElementById('terminalInput');
const terminalOutput = document.getElementById('terminalOutput');
const cursor = document.querySelector('.cursor');
const promptEl = document.querySelector('.terminal-prompt');
const terminalContainer = document.getElementById('terminalContainer');
const contentContainer = document.getElementById('contentContainer');
const contentBody = document.getElementById('contentBody');

// Command history
let commandHistory = [];
let historyIndex = -1;

// File system structure
const fileSystem = {
    name: 'home',
    type: 'section',
    children: [
        {
            name: 'works',
            type: 'section',
            children: [
                {
                    name: 'project_A',
                    type: 'file',
                    path: 'assets/home/works/project_A.html'
                }
            ]
        },
        {
            name: 'blog',
            type: 'section',
            children: [
                {
                    name: 'blog_B',
                    type: 'file',
                    path: 'assets/home/blog/blog_B.html'
                }
            ]
        },
        {
            name: 'about',
            type: 'file',
            path: 'assets/home/about.html'
        },
        {
            name: 'contact',
            type: 'file',
            path: 'assets/home/contact.html'
        }
    ]
};

// Current directory tracking
let currentPath = [];
let currentDirectory = fileSystem;

// Available commands
const commands = {
    'help': handleHelp,
    'clear': handleClear,
    'ls': handleLs,
    'explore': handleExplore
};

// Initialize
function init() {
    terminalInput.focus();
    updatePrompt();

    // Keep input focused
    document.addEventListener('click', (e) => {
        // Only focus if not clicking on content
        if (!contentContainer.classList.contains('active') ||
            terminalContainer.contains(e.target)) {
            terminalInput.focus();
        }
    });

    // Handle Enter key
    terminalInput.addEventListener('keydown', handleKeyDown);

    // Position cursor at the end of input
    terminalInput.addEventListener('input', updateCursor);
    terminalInput.addEventListener('click', updateCursor);

    // Handle resize so cursor stays aligned
    window.addEventListener('resize', updateCursor);

    // Handle ESC key to close file view
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && contentContainer.classList.contains('active')) {
            closeFileView();
        }
    });

    // Initial placement
    updateCursor();
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
    const container = terminalInput.parentElement;
    const containerRect = container.getBoundingClientRect();
    const inputRect = terminalInput.getBoundingClientRect();

    const gap = parseFloat(window.getComputedStyle(container).gap || 0);
    const promptWidth = promptEl ? promptEl.getBoundingClientRect().width : 0;
    const textWidth = getTextWidth(terminalInput.value, terminalInput);

    // Align cursor immediately after the prompt + gap + typed text
    const leftOffset = promptWidth + gap + textWidth;
    cursor.style.left = `${leftOffset}px`;
    cursor.style.top = `${inputRect.top - containerRect.top}px`;
    cursor.style.height = `${inputRect.height}px`;
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
function executeCommand(commandStr) {
    // If viewing a file, close the file view first
    if (contentContainer.classList.contains('active')) {
        closeFileView();
    }

    // Display the command in output
    addOutput(`${getPrompt()} ${commandStr}`, 'command');

    // Parse command and arguments
    const parts = commandStr.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check if command exists
    if (commands[command]) {
        commands[command](args);
    } else {
        handleUnknownCommand(commandStr);
    }

    // Scroll to bottom
    scrollToBottom();
}

// Get current prompt
function getPrompt() {
    const path = currentPath.length === 0 ? '~' : `~/${currentPath.join('/')}`;
    return `${path}$`;
}

// Update prompt display
function updatePrompt() {
    promptEl.textContent = getPrompt();
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

// Command: help
function handleHelp() {
    addOutput('');
    addOutput('Available Commands:', 'prompt');
    addOutput('  ls              - List contents of current directory');
    addOutput('  explore <name>  - Navigate to section or view file');
    addOutput('  explore ..      - Go back to parent directory');
    addOutput('  explore ~       - Go back to home directory');
    addOutput('  clear           - Clear the terminal screen');
    addOutput('  help            - Display this help information');
    addOutput('');
    addOutput('Tips:', 'success');
    addOutput('  • Press ESC or type any command to close file view');
    addOutput('  • Use arrow keys to navigate command history');
    addOutput('');
}

// Command: clear
function handleClear() {
    terminalOutput.innerHTML = '';
    updatePrompt();
}

// Command: ls
function handleLs() {
    addOutput('');
    if (currentDirectory.children && currentDirectory.children.length > 0) {
        printTree(currentDirectory.children);
    } else {
        addOutput('(empty directory)');
    }
    addOutput('');
}

// Print tree structure (only direct children, no grandchildren)
function printTree(items) {
    items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const line = connector + item.name;

        addOutput(line);
    });
}

// Command: explore
function handleExplore(args) {
    if (args.length === 0) {
        addOutput('Usage: explore <name>', 'error');
        addOutput('');
        return;
    }

    const targetName = args[0];

    // Special case: go back to parent (..)
    if (targetName === '..') {
        if (currentPath.length === 0) {
            addOutput('Already at root directory', 'error');
            addOutput('');
            return;
        }

        // Go back one level
        currentPath.pop();
        currentDirectory = navigateToPath(currentPath);
        updatePrompt();
        addOutput('');
        return;
    }

    // Special case: go to home (~)
    if (targetName === '~') {
        currentPath = [];
        currentDirectory = fileSystem;
        updatePrompt();
        addOutput('');
        return;
    }

    // Find the target in current directory
    const target = currentDirectory.children?.find(item => item.name === targetName);

    if (!target) {
        addOutput(`explore: ${targetName}: No such file or directory`, 'error');
        addOutput('');
        return;
    }

    if (target.type === 'section') {
        // Navigate into the section
        currentPath.push(target.name);
        currentDirectory = target;
        updatePrompt();
        addOutput('');
    } else if (target.type === 'file') {
        // Display the file content
        displayFile(target);
    }
}

// Display file content and minimize terminal
async function displayFile(file) {
    try {
        // Fetch the HTML content
        const response = await fetch(file.path);
        if (!response.ok) {
            throw new Error('Failed to load file');
        }
        const content = await response.text();

        // Show content container
        contentContainer.classList.add('active');
        contentBody.innerHTML = content;

        // Minimize terminal and clear output
        terminalContainer.classList.add('minimized');
        terminalOutput.innerHTML = '';
    } catch (error) {
        addOutput(`Error loading file: ${error.message}`, 'error');
        addOutput('');
    }
}

// Navigate to a specific path
function navigateToPath(path) {
    let dir = fileSystem;
    for (const segment of path) {
        dir = dir.children?.find(item => item.name === segment && item.type === 'section');
        if (!dir) return fileSystem;
    }
    return dir;
}

// Close file view and restore terminal
function closeFileView() {
    contentContainer.classList.remove('active');
    terminalContainer.classList.remove('minimized');
    terminalInput.focus();
}

// Handle unknown command
function handleUnknownCommand(command) {
    addOutput(`Command not found: ${command}`, 'error');
    addOutput('Type help for available commands.', 'error');
    addOutput('');
}

// Start the terminal
init();
