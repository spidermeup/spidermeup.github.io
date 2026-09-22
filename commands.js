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

// The multi-target `ls` heading echoes the path the user typed into a line
// rendered as HTML, so it has to be escaped: `ls ~ <style>body{display:none}/..`
// resolves to a real directory (the `..` pops the payload back off) and would
// otherwise inject live markup.
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

function pathString(parts) {
    return parts.length === 0 ? '~' : '~/' + parts.join('/');
}

// Size in characters of what `cat` would actually print, so the number in a
// long listing is real rather than decorative. Directories report their entry
// count; there are no blocks on disk to report instead.
function entrySize(node) {
    if (node.type === 'dir') return Object.keys(node.children).length;
    const content = typeof node.content === 'function' ? node.content() : node.content;
    return node.html ? content.replace(/<[^>]*>/g, '').length : content.length;
}

// Every entry carries the command it runs when clicked, so the filesystem can
// be navigated by tapping — on a phone reached from an NFC card, typing
// `cd resume` on a touch keyboard is the main thing standing in the way.
// Paths are absolute so a listing stays correct after the cwd moves on.
function entryHtml(name, node, target) {
    const cmd = node.type === 'dir'
        ? `cd ${target} && ls -la`
        : `cat ${target}`;
    const cls = node.type === 'dir' ? 'tap dir' : 'tap';
    return `<span class="${cls}" data-cmd="${escapeHtml(cmd)}">${escapeHtml(name)}</span>`;
}

function renderListing(node, parts, opts = {}) {
    const entries = Object.keys(node.children).sort().map(name => ({
        name,
        node: node.children[name],
        target: pathString([...parts, name])
    }));

    if (opts.all) {
        // `.` and `..` are directories for listing purposes; the node stands in
        // for the real one, which is only needed for its type and size here.
        entries.unshift(
            { name: '.',  node: node, target: pathString(parts) },
            { name: '..', node: getNode(parts.slice(0, -1)) || node,
              target: pathString(parts.slice(0, -1)) }
        );
    }

    if (!opts.long) {
        return entries.map(e => entryHtml(e.name, e.node, e.target)).join('   ');
    }

    // One entry per line: type, size, name. Full-width rows are far easier to
    // hit than names packed three-to-a-row.
    return entries.map(e => {
        const type = e.node.type === 'dir' ? 'd' : '-';
        const size = String(entrySize(e.node)).padStart(6);
        return `${type}  ${size}  ${entryHtml(e.name, e.node, e.target)}`;
    }).join('\n');
}

// Commands can be chained with `&&`, which is what lets clicking a directory
// run `cd <dir> && ls -la` — it moves the prompt and shows you what is there,
// and the echoed line is something you could have typed yourself.
async function handleCommand(line) {
    for (const part of line.split('&&')) {
        await runSingleCommand(part);
    }
    appendLine(getPromptText(), true);
}

async function runSingleCommand(line) {
    const tokens = line.trim().split(/\s+/);
    const command = (tokens[0] || '').toLowerCase();
    const args = tokens.slice(1).filter(a => a.length > 0);

    switch (command) {
        case '':
            break;

        case 'help':
            appendLine(
                'Available commands:\n' +
                '  ls [-la]     list directory contents (-l long, -a all)\n' +
                '  cd [path]    change directory\n' +
                '  pwd          print working directory\n' +
                '  cat <file>   print file contents\n' +
                '  whoami       your system info\n' +
                '  date         current date/time\n' +
                '  clear        clear the screen\n' +
                '  help         this list\n\n' +
                'Try: ls  ->  cd resume  ->  cat experience\n' +
                'Names in a listing can also be clicked.'
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
            // A lone '-' is a path, not a flag, same as a real shell.
            const isFlag = a => a.startsWith('-') && a.length > 1;
            const flagChars = new Set(
                args.filter(isFlag).join('').split('').filter(c => c !== '-')
            );
            const unknown = [...flagChars].find(c => !'la'.includes(c));
            if (unknown) {
                appendLine(`ls: invalid option -- '${unknown}'\nTry 'help' for more information.`);
                break;
            }
            const opts = { long: flagChars.has('l'), all: flagChars.has('a') };

            const paths = args.filter(a => !isFlag(a));
            const targets = paths.length ? paths : [null];
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
                const heading = targets.length > 1 && target ? `${escapeHtml(target)}:\n` : '';
                appendLine(heading + renderListing(node, parts, opts), false, true);
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
}
