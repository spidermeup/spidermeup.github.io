// Command handlers and filesystem-navigation logic. The actual data
// (links, resume entries, publications, etc.) lives in content.js.

async function getLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            throw new Error(`ipapi.co returned HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`ipapi.co error: ${data.reason || 'unknown'}`);
        }
        const parts = [data.city, data.region, data.country_name].filter(Boolean);
        return parts.length ? parts.join(', ') : 'Unknown';
    } catch (err) {
        console.error('Location lookup failed:', err);
        return 'Unknown';
    }
}

async function whoami() {
    const cpuCores = navigator.hardwareConcurrency;
    const ramMemory = navigator.deviceMemory;
    const osInfo = navigator.platform;
    const location = await getLocation();

    const lines = [];
    if (cpuCores) lines.push(`CPU Cores: ${cpuCores}`);
    if (ramMemory) lines.push(`RAM: ${ramMemory} GB`);
    if (osInfo) lines.push(`OS: ${osInfo}`);
    if (location !== 'Unknown') lines.push(`Location: ${location}`);

    appendLine(lines.length ? lines.join('\n') : 'Nothing to report.');
}

let cwdParts = [];

function getCwdString() {
    return cwdParts.length === 0 ? '~' : '~/' + cwdParts.join('/');
}

function getPromptText() {
    return `guest:${getCwdString()}$ `;
}

function getNode(parts) {
    let node = { type: 'dir', children: fs };
    for (const p of parts) {
        if (node.type !== 'dir') return null;
        node = node.children[p];
        if (!node) return null;
    }
    return node;
}

function resolvePath(path) {
    if (!path) return [...cwdParts];
    if (path === '~' || path === '/') return [];
    let parts;
    if (path.startsWith('~/')) {
        parts = path.slice(2).split('/').filter(Boolean);
    } else if (path.startsWith('/')) {
        parts = path.slice(1).split('/').filter(Boolean);
    } else {
        parts = [...cwdParts, ...path.split('/').filter(Boolean)];
    }
    const out = [];
    for (const p of parts) {
        if (p === '.') continue;
        if (p === '..') { if (out.length) out.pop(); continue; }
        out.push(p);
    }
    return out;
}

const COMMANDS = ['ls', 'cd', 'pwd', 'cat', 'clear', 'whoami', 'date', 'help'];

function renderListing(node) {
    const names = Object.keys(node.children).sort();
    return names.map(n => {
        const child = node.children[n];
        return child.type === 'dir'
            ? `<span class="dir">${n}</span>`
            : n;
    }).join('   ');
}

async function handleCommand(line) {
    const tokens = line.trim().split(/\s+/);
    const command = (tokens[0] || '').toLowerCase();
    const args = tokens.slice(1).filter(a => a.length > 0);

    switch (command) {
        case '':
            break;

        case 'help':
            appendLine(
                'Available commands:\n' +
                '  ls [path]    list directory contents\n' +
                '  cd [path]    change directory\n' +
                '  pwd          print working directory\n' +
                '  cat <file>   print file contents\n' +
                '  whoami       your system info\n' +
                '  date         current date/time\n' +
                '  clear        clear the screen\n' +
                '  help         this list\n\n' +
                'Try: ls  ->  cd resume  ->  cat experience'
            );
            break;

        case 'clear':
            document.getElementById('terminal').innerHTML = '';
            break;

        case 'whoami':
            await whoami();
            break;

        case 'date':
            appendLine(new Date().toString());
            break;

        case 'pwd':
            appendLine(getCwdString());
            break;

        case 'ls': {
            const targets = args.length ? args : [null];
            for (const target of targets) {
                const parts = target ? resolvePath(target) : cwdParts;
                const node = getNode(parts);
                if (!node) {
                    appendLine(`ls: cannot access '${target}': No such file or directory`);
                    continue;
                }
                if (node.type === 'file') {
                    appendLine(target);
                    continue;
                }
                const heading = targets.length > 1 && target ? `${target}:\n` : '';
                appendLine(heading + renderListing(node), false, true);
            }
            break;
        }

        case 'cd': {
            const target = args[0];
            if (!target || target === '~' || target === '/') {
                cwdParts = [];
                break;
            }
            const parts = resolvePath(target);
            const node = getNode(parts);
            if (!node) {
                appendLine(`cd: no such file or directory: ${target}`);
                break;
            }
            if (node.type !== 'dir') {
                appendLine(`cd: not a directory: ${target}`);
                break;
            }
            cwdParts = parts;
            break;
        }

        case 'cat': {
            if (args.length === 0) {
                appendLine('cat: missing operand');
                break;
            }
            for (const target of args) {
                const parts = resolvePath(target);
                const node = getNode(parts);
                if (!node) {
                    appendLine(`cat: ${target}: No such file or directory`);
                    continue;
                }
                if (node.type !== 'file') {
                    appendLine(`cat: ${target}: Is a directory`);
                    continue;
                }
                const content = typeof node.content === 'function'
                    ? node.content()
                    : node.content;
                appendLine(content, false, !!node.html);
            }
            break;
        }

        default:
            appendLine(`bash: ${command}: command not found`);
    }

    appendLine(getPromptText(), true);
}
