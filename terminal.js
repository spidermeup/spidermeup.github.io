console.log("loaded");

const terminal = document.getElementById('terminal');

const history = [];
let historyIndex = 0;

function setCursorToEnd(input) {
  input.selectionStart = input.selectionEnd = input.value.length;
  input.renderLine();
}

function navigateHistory(input, delta) {
  if (history.length === 0) return;
  historyIndex = Math.max(0, Math.min(history.length, historyIndex + delta));
  input.value = historyIndex === history.length ? '' : history[historyIndex];
  setCursorToEnd(input);
}

function longestCommonPrefix(items) {
  if (items.length === 0) return '';
  let prefix = items[0];
  for (const item of items) {
    while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function showListing(items, currentLine) {
  const listing = document.createElement('div');
  listing.className = 'line';
  listing.innerHTML = items.join('   ');
  terminal.insertBefore(listing, currentLine);
  window.scrollTo(0, document.body.scrollHeight);
}

function handleTab(input, currentLine) {
  const raw = input.value;
  const leading = raw.match(/^\s*/)[0];
  const rest = raw.slice(leading.length);

  // No space yet -> completing the command name.
  if (!rest.includes(' ')) {
    const partial = rest.toLowerCase();
    if (!partial) return;
    const matches = COMMANDS.filter(c => c.startsWith(partial));
    if (matches.length === 0) return;
    if (matches.length === 1) {
      input.value = leading + matches[0] + ' ';
      setCursorToEnd(input);
      return;
    }
    const prefix = longestCommonPrefix(matches);
    if (prefix.length > partial.length) {
      input.value = leading + prefix;
      setCursorToEnd(input);
    }
    showListing(matches, currentLine);
    return;
  }

  // Otherwise complete the last token as a filesystem path.
  const tokens = rest.split(/\s+/);
  const last = tokens[tokens.length - 1] || '';
  const lastSlash = last.lastIndexOf('/');
  const dirPart = lastSlash >= 0 ? last.slice(0, lastSlash + 1) : '';
  const namePart = lastSlash >= 0 ? last.slice(lastSlash + 1) : last;

  const baseParts = dirPart ? resolvePath(dirPart) : cwdParts;
  const node = getNode(baseParts);
  if (!node || node.type !== 'dir') return;

  const names = Object.keys(node.children)
    .filter(n => n.toLowerCase().startsWith(namePart.toLowerCase()))
    .sort();
  if (names.length === 0) return;

  if (names.length === 1) {
    const child = node.children[names[0]];
    const suffix = child.type === 'dir' ? '/' : ' ';
    tokens[tokens.length - 1] = dirPart + names[0] + suffix;
    input.value = leading + tokens.join(' ');
    setCursorToEnd(input);
    return;
  }

  const prefix = longestCommonPrefix(names);
  if (prefix.length > namePart.length) {
    tokens[tokens.length - 1] = dirPart + prefix;
    input.value = leading + tokens.join(' ');
    setCursorToEnd(input);
  }
  showListing(
    names.map(n => node.children[n].type === 'dir'
      ? `<span class="dir">${n}</span>`
      : n),
    currentLine
  );
}

function appendLine(content = '', withInput = false, isHtml = false) {
  const line = document.createElement('div');
  line.className = 'line';

  const span = document.createElement('span');
  if (isHtml) {
    span.innerHTML = content;
  } else {
    span.textContent = content;
  }
  line.appendChild(span);

  if (withInput) {
    line.className = 'line prompt-line';
    // The input itself is invisible (see .hidden-input); it only holds the
    // value and the caret. `entry` is the visible copy, redrawn on every
    // change, which is what lets the block cursor sit on a character mid-line
    // and lets a long command wrap instead of scrolling inside a box.
    const entry = document.createElement('span');
    entry.className = 'entry';

    const input = document.createElement('input');
    input.className = 'hidden-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('aria-label', 'Terminal input');

    function render() {
      // A render can still be queued when Enter lands; don't put the cursor
      // back on a line that has already been submitted.
      if (!input.isConnected) return;
      const value = input.value;
      const pos = Math.min(input.selectionStart ?? value.length, value.length);

      // One cell per character, always value.length + 1 of them, with only
      // the cursor's class changing. Splitting the text at the caret instead
      // moves an inline-box boundary as you arrow along the line, and on a
      // wrapped line the break point shifts a character along with it.
      // The trailing cell is where the cursor rests at end of line.
      const cells = document.createDocumentFragment();
      for (let i = 0; i <= value.length; i++) {
        const cell = document.createElement('span');
        if (i === pos) cell.className = 'cursor';
        // A space (and the empty cell past the end) needs a glyph with width,
        // or the cursor block collapses whenever it lands on one.
        const ch = value[i];
        cell.textContent = ch === undefined || ch === ' ' ? '\u00a0' : ch;
        cells.appendChild(cell);
      }
      entry.replaceChildren(cells);
    }
    input.renderLine = render;
    const scheduleRender = () => requestAnimationFrame(render);

    // Caret moves (arrows, Home/End, click, drag) have no single event that
    // reports them, so redraw after anything that could have moved it.
    for (const ev of ['input', 'keyup', 'click', 'select', 'focus']) {
      input.addEventListener(ev, scheduleRender);
    }

    input.addEventListener('keydown', function (e) {
      const ctrlC = e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey &&
                    e.key.toLowerCase() === 'c';

      // Ctrl+C abandons the line: mark it ^C, drop it without running it or
      // recording it in history, and open a fresh prompt. If text is selected
      // the browser's copy wins instead, since that is what a ctrl+c in a
      // web page is usually asking for.
      if (ctrlC && window.getSelection()?.isCollapsed !== false) {
        e.preventDefault();
        entry.textContent = input.value + '^C';
        input.remove();
        historyIndex = history.length;
        appendLine(getPromptText(), true);
      } else if (e.key === 'Enter') {
        const value = input.value;
        const command = value.trim();
        if (command) history.push(command);
        historyIndex = history.length;
        // Leave the executed line behind as plain text: no stray input box,
        // and it wraps and selects like the rest of the scrollback.
        entry.textContent = value;
        input.remove();
        handleCommand(value);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleTab(input, line);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateHistory(input, -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateHistory(input, 1);
      } else {
        scheduleRender(); // held-down keys repeat without firing keyup
      }
    });

    line.appendChild(entry);
    line.appendChild(input);
    setTimeout(() => input.focus(), 0);
  }

  terminal.appendChild(line);
  // Draw the cursor once the line is in the document; render() bails on a
  // detached input, so this has to come after the append.
  line.querySelector('input.hidden-input')?.renderLine();
  window.scrollTo(0, document.body.scrollHeight);
}

// Click anywhere in the terminal area to refocus the active input.
// Footer links keep their own click behavior.
document.addEventListener('click', (e) => {
  if (e.target.closest('a')) return;
  // Only the active line still has an input; finished lines dropped theirs.
  const input = terminal.querySelector('input.hidden-input');
  if (input) input.focus();
});

appendLine('Hi, I’m Ilias! A hardware engineer with a love for solving tough problems and making systems faster and more efficient. Right now, I’m at NVIDIA, focusing on CPU design efforts for high-performance computing. Before that, I spent years at Arm working on everything from branch prediction and memory translation to speculative execution and heterogeneous systems. I’ve got a PhD in computer science, a few cool patents, and a real passion for pushing the boundaries of what hardware can do.\n\nType `help` for commands, or run `ls` to start exploring.');
appendLine(getPromptText(), true);
