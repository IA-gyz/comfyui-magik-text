import { app } from "../../scripts/app.js";

const EDITOR_HEIGHT = 200;
const MIN_HEIGHT = 120;
const COLLAPSED_HEIGHT = 48;
const DEFAULT_FONT_SIZE = 24;
const INDENT = "  ";
const CARDS_KEY = "magik-text.cards.v1";
const CARDS_EVENT = "magik-text-cards-changed";

const TEXT_FIELDS = {
  "Magik.Text7Concat": ["text1", "text2", "text3", "text4", "text5", "text6", "text7"],
};

const PANELS_NODE = "Magik.Text";
const MAX_PANELS = 10;
const PANEL_NAMES = ["text", ...Array.from({ length: MAX_PANELS - 1 }, (_, i) => `text${i + 2}`)];
const WILDCARD_NAMES = ["wildcards", ...Array.from({ length: MAX_PANELS - 1 }, (_, i) => `wildcards${i + 2}`)];
const COLLAPSE_NAMES = ["collapse", ...Array.from({ length: MAX_PANELS - 1 }, (_, i) => `collapse${i + 2}`)];
const panelsControls = new WeakMap();

const TOKEN_RE = /(\/\*[\s\S]*?(?:\*\/|$))|((?:^|\n)[ \t\r]*)(#[^\n]*)|(\([^()\n]*:-?\d+(?:\.\d+)?\))|(\[[^\]\n]*(?:\||:\d)[^\]\n]*\])|(<[^<>\n]+>)/g;

const CSS = `
.magik-text-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: var(--comfy-input-bg, #202020);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  overflow: hidden;
}
.magik-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  padding: 2px 4px;
  border-bottom: 1px solid var(--border-color, #333);
  background: var(--comfy-menu-bg, #262626);
}
.magik-toolbar button {
  background: transparent;
  color: var(--fg-color, #ddd);
  border: 1px solid transparent;
  border-radius: 4px;
  font: 11px/1.6 monospace;
  padding: 0 6px;
  cursor: pointer;
}
.magik-toolbar button:hover {
  background: var(--comfy-input-bg, #383838);
  border-color: var(--border-color, #444);
}
.magik-toolbar button.active {
  border-color: var(--fg-color, #ddd);
}
.magik-toolbar button.magik-wild.active {
  border-color: #c586c0;
  color: #c586c0;
}
.magik-stats {
  margin-left: auto;
  padding-right: 4px;
  font: 10px/1.6 monospace;
  color: var(--descrip-text, #888);
  white-space: nowrap;
  user-select: none;
}
.magik-cards {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  min-height: 26px;
  padding: 2px 4px;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--border-color, #333);
  background: var(--comfy-menu-bg, #262626);
}
.magik-card {
  flex: 0 0 auto;
  background: var(--comfy-input-bg, #383838);
  color: var(--fg-color, #ddd);
  border: 1px solid var(--border-color, #444);
  border-radius: 10px;
  font: 11px/1.6 monospace;
  padding: 0 8px;
  cursor: pointer;
  white-space: nowrap;
}
.magik-card:hover {
  border-color: var(--fg-color, #ddd);
}
.magik-card-add {
  border-style: dashed;
}
.magik-panel {
  position: absolute;
  top: 56px;
  right: 4px;
  z-index: 10;
  width: min(340px, 92%);
  max-height: calc(100% - 64px);
  overflow-y: auto;
  background: var(--comfy-menu-bg, #2a2a2a);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  padding: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
.magik-panel-row {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  margin-bottom: 6px;
}
.magik-panel-new {
  border-top: 1px solid var(--border-color, #333);
  padding-top: 6px;
}
.magik-panel-name {
  width: 84px;
  flex: 0 0 auto;
}
.magik-panel-text {
  flex: 1 1 auto;
  resize: vertical;
}
.magik-panel-name,
.magik-panel-text {
  background: var(--comfy-input-bg, #202020);
  color: var(--input-text, #ddd);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  padding: 2px 4px;
  font: 11px/1.4 monospace;
}
.magik-panel button {
  flex: 0 0 auto;
  background: transparent;
  color: var(--fg-color, #ddd);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  font: 11px/1.6 monospace;
  padding: 0 6px;
  cursor: pointer;
}
.magik-panel button:hover {
  background: var(--comfy-input-bg, #383838);
}
.magik-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}
.magik-body pre,
.magik-body textarea {
  position: absolute;
  inset: 0;
  margin: 0;
  border: 0;
  padding: 6px 8px;
  font-family: monospace;
  font-size: 24px;
  line-height: 1.5;
  tab-size: 4;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  box-sizing: border-box;
  scrollbar-gutter: stable;
}
.magik-body pre {
  overflow: hidden;
  pointer-events: none;
  color: var(--input-text, #ddd);
  background: transparent;
}
.magik-body pre code {
  font: inherit;
  white-space: inherit;
  overflow-wrap: inherit;
}
.magik-body textarea {
  overflow: auto;
  background: transparent;
  color: transparent;
  caret-color: var(--fg-color, #fff);
  caret-shape: bar;
  resize: none;
  outline: none;
}
.magik-panel-title {
  width: 110px;
  flex: 0 1 auto;
  background: transparent;
  color: #c586c0;
  border: 1px solid transparent;
  border-radius: 4px;
  font: bold 14px/1.6 monospace;
  padding: 0 4px;
}
.magik-panel-title:hover,
.magik-panel-title:focus {
  border-color: var(--border-color, #444);
  background: var(--comfy-input-bg, #383838);
  outline: none;
}
.magik-text-editor.magik-nowrap .magik-body pre,
.magik-text-editor.magik-nowrap .magik-body textarea {
  white-space: pre;
  overflow-wrap: normal;
}
.magik-toolbar-sep {
  width: 1px;
  align-self: stretch;
  margin: 2px 2px;
  background: var(--border-color, #444);
}
.magik-panels-label {
  font: 11px/1.6 monospace;
  color: var(--descrip-text, #888);
  padding: 0 2px;
  user-select: none;
  white-space: nowrap;
}
.magik-close {
  margin-left: 4px;
}
.magik-close:hover {
  color: var(--error-text, #f66);
}
.magik-resize-handle {
  flex: 0 0 auto;
  height: 8px;
  cursor: ns-resize;
  touch-action: none;
  border-top: 1px solid var(--border-color, #333);
  background: transparent;
}
.magik-resize-handle:hover,
.magik-resize-handle.magik-dragging {
  background: var(--border-color, #555);
}
.magik-text-editor.magik-collapsed .magik-body,
.magik-text-editor.magik-collapsed .magik-cards,
.magik-text-editor.magik-collapsed .magik-resize-handle {
  display: none;
}
.magik-text-editor.magik-collapsed {
  cursor: pointer;
}
.magik-text-editor.magik-collapsed .magik-collapse {
  border-color: #c586c0;
  color: #c586c0;
  font-weight: bold;
  padding: 0 10px;
}
.magik-text-editor.magik-connected {
  border-color: #569cd6;
  box-shadow: 0 0 0 1px #569cd6;
}
.magik-text-editor.magik-connected .magik-panel-title {
  color: #569cd6;
  border-color: #569cd6;
}
.magik-color {
  width: 22px;
  height: 20px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.magik-color:hover {
  border-color: var(--border-color, #444);
}
.magik-c { color: #6a9955; font-style: italic; }
.magik-w { color: #569cd6; }
.magik-a { color: #ce9178; }
.magik-e { color: #c586c0; }
`;

function injectStyles() {
  if (document.getElementById("magik-text-editor-style")) return;
  const style = document.createElement("style");
  style.id = "magik-text-editor-style";
  style.textContent = CSS;
  document.head.appendChild(style);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(value) {
  let out = "";
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(value)) !== null) {
    out += escapeHtml(value.slice(last, m.index));
    if (m[1] !== undefined) out += `<span class="magik-c">${escapeHtml(m[1])}</span>`;
    else if (m[3] !== undefined) out += `${escapeHtml(m[2])}<span class="magik-c">${escapeHtml(m[3])}</span>`;
    else if (m[4] !== undefined) out += `<span class="magik-w">${escapeHtml(m[4])}</span>`;
    else if (m[5] !== undefined) out += `<span class="magik-a">${escapeHtml(m[5])}</span>`;
    else if (m[6] !== undefined) out += `<span class="magik-e">${escapeHtml(m[6])}</span>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) TOKEN_RE.lastIndex++;
  }
  out += escapeHtml(value.slice(last));
  return out + "\n";
}

function stripComments(text) {
  if (!text) return "";
  let out = "";
  let i = 0;
  const n = text.length;
  let lineStart = true;
  while (i < n) {
    const c = text[i];
    if (lineStart && c === "#") {
      while (i < n && text[i] !== "\n" && text[i] !== "\r") i++;
      continue;
    }
    if (c === "/" && i + 1 < n && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    out += c;
    if (c === "\n") lineStart = true;
    else if (c !== " " && c !== "\t" && c !== "\r") lineStart = false;
    i++;
  }
  return out;
}

function processDynamicPrompt(input) {
  const strip = (str) => str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
  let i = 0;
  let result = "";
  input = strip(input);
  const handleEscape = () => {
    const nextChar = input[i++];
    return "\\" + nextChar;
  };
  function parseChoiceBlock() {
    const options = [];
    let choice = "";
    let depth = 0;
    while (i < input.length) {
      const char = input[i++];
      if (char === "\\") {
        choice += handleEscape();
        continue;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        if (!depth) break;
        depth--;
      } else if (char === "|") {
        if (!depth) {
          options.push(choice);
          choice = "";
          continue;
        }
      }
      choice += char;
    }
    options.push(choice);
    const chosen = options[Math.floor(Math.random() * options.length)];
    return processDynamicPrompt(chosen);
  }
  while (i < input.length) {
    const char = input[i++];
    if (char === "\\") result += handleEscape();
    else if (char === "{") result += parseChoiceBlock();
    else result += char;
  }
  return result.replace(/\\([{}|])/g, "$1");
}

function loadCards() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CARDS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && typeof c.name === "string" && typeof c.text === "string");
  } catch {
    return [];
  }
}

let cards = loadCards();

function saveCards() {
  try {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  } catch {
    // storage unavailable (private mode etc.) — cards stay session-local
  }
  window.dispatchEvent(new CustomEvent(CARDS_EVENT));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function canvasScale() {
  return app.canvas?.ds?.scale || app.canvas?.scale || 1;
}

class MagikTextEditor {
  constructor(placeholder) {
    injectStyles();

    this.root = el("div", "magik-text-editor");
    this.height = EDITOR_HEIGHT;
    this.collapsed = false;
    this.heightKeyFn = null;
    this.alignKeyFn = null;
    this.colorKeyFn = null;
    this.collapseSet = null;
    this.onHeightChanging = null;
    this.onHeightChanged = null;
    this.applyHeight();

    const toolbar = el("div", "magik-toolbar");
    this.toolbar = toolbar;
    toolbar.addEventListener("click", (e) => {
      if (this.collapsed && e.target === toolbar && this.collapseSet) {
        this.setCollapsed(false);
        this.collapseSet(false);
        if (this.onHeightChanged) this.onHeightChanged(true);
      }
    });
    const btnLine = el("button", null, "#");
    btnLine.title = "Toggle line comment — Ctrl+/ (commented text is not output)";
    btnLine.addEventListener("click", () => this.toggleLineComment());
    const btnBlock = el("button", null, "/* */");
    btnBlock.title = "Toggle block comment — Ctrl+Shift+/ (commented text is not output)";
    btnBlock.addEventListener("click", () => this.toggleBlockComment());
    this.btnWrap = el("button", null, "wrap");
    this.btnWrap.title = "Toggle word wrap";
    this.btnWrap.addEventListener("click", () => {
      this.root.classList.toggle("magik-nowrap");
      this.btnWrap.classList.toggle("active", this.root.classList.contains("magik-nowrap"));
    });
    const fontDown = el("button", null, "A−");
    fontDown.title = "Decrease font size";
    fontDown.addEventListener("click", () => this.setFontSize(this.fontSize - 1));
    const fontUp = el("button", null, "A+");
    fontUp.title = "Increase font size";
    fontUp.addEventListener("click", () => this.setFontSize(this.fontSize + 1));
    this.alignBtn = el("button", "magik-align", "L");
    this.alignBtn.title = "Text alignment: click to cycle left / center / right";
    this.alignBtn.addEventListener("click", () => {
      const order = ["left", "center", "right"];
      this.setAlign(order[(order.indexOf(this.align) + 1) % order.length]);
    });
    this.colorInput = document.createElement("input");
    this.colorInput.type = "color";
    this.colorInput.className = "magik-color";
    this.colorInput.value = "#dddddd";
    this.colorInput.title = "Text font color";
    this.colorInput.addEventListener("change", () => this.setFontColor(this.colorInput.value));
    this.stats = el("span", "magik-stats");
    toolbar.append(btnLine, btnBlock, this.btnWrap, fontDown, fontUp, this.alignBtn, this.colorInput, this.stats);

    this.fontSize = DEFAULT_FONT_SIZE;
    this.fontKeyFn = null;
    this.align = "left";

    this.cardsRow = el("div", "magik-cards");
    this.renderCards();

    this.body = el("div", "magik-body");
    this.pre = document.createElement("pre");
    this.pre.setAttribute("aria-hidden", "true");
    this.code = document.createElement("code");
    this.pre.appendChild(this.code);
    this.ta = document.createElement("textarea");
    this.ta.className = "magik-input";
    this.ta.spellcheck = false;
    this.ta.placeholder = placeholder;
    this.ta.setAttribute("data-testid", "magik-text-editor-input");
    this.body.append(this.pre, this.ta);
    this.setFontSize(DEFAULT_FONT_SIZE, false);
    this.setAlign("left", false);

    this.panel = el("div", "magik-panel");
    this.panel.style.display = "none";

    this.handle = el("div", "magik-resize-handle");
    this.handle.title = "Drag to resize this panel";
    this.handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const startH = this.height;
      this.handle.classList.add("magik-dragging");
      const move = (ev) => {
        this.setHeight(startH + (ev.clientY - startY) / canvasScale(), false);
        if (this.onHeightChanging) this.onHeightChanging();
      };
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        this.handle.classList.remove("magik-dragging");
        this.handle.removeEventListener("pointermove", move);
        this.handle.removeEventListener("pointerup", end);
        this.handle.removeEventListener("lostpointercapture", end);
        document.removeEventListener("pointerup", end, true);
        this.setHeight(this.height, true);
        if (this.onHeightChanged) this.onHeightChanged(true);
      };
      this.handle.addEventListener("pointermove", move);
      this.handle.addEventListener("pointerup", end);
      this.handle.addEventListener("lostpointercapture", end);
      document.addEventListener("pointerup", end, true);
      try {
        this.handle.setPointerCapture(e.pointerId);
      } catch {
        // capture unsupported — the document-level pointerup fallback still ends the drag
      }
    });

    this.root.append(toolbar, this.cardsRow, this.body, this.panel, this.handle);

    this.onChange = null;

    this.ta.addEventListener("input", () => this.commit());
    this.ta.addEventListener("scroll", () => this.syncScroll());
    this.ta.addEventListener("keydown", (e) => this.onKeydown(e));
    this.cardsListener = () => this.renderCards();
    window.addEventListener(CARDS_EVENT, this.cardsListener);
  }

  getValue() {
    return this.ta.value;
  }

  setValue(value) {
    if (this.ta.value === value) return;
    this.ta.value = value;
    this.render();
  }

  commit() {
    this.render();
    if (this.onChange) this.onChange(this.ta.value);
  }

  render() {
    this.code.innerHTML = highlight(this.ta.value);
    this.syncScroll();
    this.updateStats();
  }

  syncScroll() {
    this.pre.scrollTop = this.ta.scrollTop;
    this.pre.scrollLeft = this.ta.scrollLeft;
  }

  updateStats() {
    const v = this.ta.value;
    const lines = v === "" ? 0 : v.split("\n").length;
    const words = (v.match(/\S+/g) || []).length;
    const out = stripComments(v).length;
    let text = `${lines} ln · ${words} w · ${v.length} ch`;
    if (out !== v.length) text += ` · ${out} out`;
    this.stats.textContent = text;
    this.stats.title = "lines · words · characters · characters remaining after comments are removed";
  }

  renderCards() {
    this.cardsRow.replaceChildren();
    for (const card of cards) {
      const chip = el("button", "magik-card", card.name);
      chip.title = card.text;
      chip.addEventListener("click", () => this.insertCard(card.text));
      this.cardsRow.appendChild(chip);
    }
    const addChip = el("button", "magik-card magik-card-add", "＋");
    addChip.title = "Add / edit / remove cards";
    addChip.addEventListener("click", () => this.togglePanel());
    this.cardsRow.appendChild(addChip);
  }

  togglePanel() {
    const willOpen = this.panel.style.display === "none";
    this.panel.style.display = willOpen ? "block" : "none";
    if (willOpen) this.renderPanel();
  }

  renderPanel() {
    this.panel.replaceChildren();
    cards.forEach((card, i) => {
      const row = el("div", "magik-panel-row");
      const name = document.createElement("input");
      name.className = "magik-panel-name";
      name.placeholder = "name";
      name.value = card.name;
      name.addEventListener("input", () => {
        card.name = name.value;
        saveCards();
        this.renderCards();
      });
      const text = document.createElement("textarea");
      text.className = "magik-panel-text";
      text.placeholder = "text to insert";
      text.rows = 2;
      text.value = card.text;
      text.addEventListener("input", () => {
        card.text = text.value;
        saveCards();
        this.renderCards();
      });
      const del = el("button", null, "✕");
      del.title = "Remove card";
      del.addEventListener("click", () => {
        cards.splice(i, 1);
        saveCards();
        this.renderPanel();
      });
      row.append(name, text, del);
      this.panel.appendChild(row);
    });

    const addRow = el("div", "magik-panel-row magik-panel-new");
    this.newName = document.createElement("input");
    this.newName.className = "magik-panel-name";
    this.newName.placeholder = "name";
    this.newText = document.createElement("textarea");
    this.newText.className = "magik-panel-text";
    this.newText.placeholder = "text to insert";
    this.newText.rows = 2;
    const add = el("button", null, "Add");
    add.title = "Add card";
    add.addEventListener("click", () => {
      const text = this.newText.value;
      if (!text) return;
      const name = this.newName.value.trim() || text.trim().slice(0, 16) || `card ${cards.length + 1}`;
      cards.push({ name, text });
      saveCards();
      this.renderPanel();
      this.newName.value = "";
      this.newText.value = "";
    });
    addRow.append(this.newName, this.newText, add);
    this.panel.appendChild(addRow);
  }

  insertCard(text) {
    const ta = this.ta;
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
    this.commit();
    ta.focus();
  }

  setPanelsControls(onAdd) {
    const sep = el("span", "magik-toolbar-sep");
    this.panelLabel = el("span", "magik-panels-label", "");
    const plus = el("button", null, "＋");
    plus.title = "Add a text panel (adds one output)";
    plus.addEventListener("click", onAdd);
    this.toolbar.insertBefore(sep, this.stats);
    this.toolbar.insertBefore(this.panelLabel, this.stats);
    this.toolbar.insertBefore(plus, this.stats);
  }

  setCloseButton(onClose) {
    const btn = el("button", "magik-close", "✕");
    btn.title = "Close this panel (removes its output; blocked while the output is connected)";
    btn.addEventListener("click", onClose);
    this.closeBtn = btn;
    this.toolbar.appendChild(btn);
  }

  setCollapseControl(get, set) {
    const btn = el("button", "magik-collapse", "▾");
    btn.title = "Collapse / expand this panel";
    btn.addEventListener("click", () => {
      const v = !this.collapsed;
      this.setCollapsed(v);
      set(v);
      if (this.onHeightChanged) this.onHeightChanged(true);
    });
    this.collapseBtn = btn;
    this.collapseSet = set;
    if (this.closeBtn) this.toolbar.insertBefore(btn, this.closeBtn);
    else this.toolbar.appendChild(btn);
    this.setCollapsed(!!get());
  }

  setCollapsed(c) {
    this.collapsed = !!c;
    this.root.classList.toggle("magik-collapsed", this.collapsed);
    if (this.collapseBtn) this.collapseBtn.textContent = this.collapsed ? "▸" : "▾";
    this.applyHeight();
  }

  currentHeight() {
    return this.collapsed ? COLLAPSED_HEIGHT : this.height;
  }

  setConnected(v) {
    this.connected = !!v;
    this.root.classList.toggle("magik-connected", this.connected);
  }

  setFontSize(px, save = true) {
    this.fontSize = Math.max(8, Math.round(px));
    this.pre.style.fontSize = `${this.fontSize}px`;
    this.ta.style.fontSize = `${this.fontSize}px`;
    if (save && this.fontKeyFn) {
      try {
        localStorage.setItem(this.fontKeyFn(), String(this.fontSize));
      } catch {
        // storage unavailable — font size stays session-local
      }
    }
  }

  loadFontSize() {
    if (!this.fontKeyFn) return;
    try {
      const v = parseInt(localStorage.getItem(this.fontKeyFn()) || "", 10);
      if (Number.isFinite(v)) this.setFontSize(v, false);
    } catch {
      // ignore
    }
  }

  setAlign(mode, save = true) {
    if (!["left", "center", "right"].includes(mode)) mode = "left";
    this.align = mode;
    this.ta.style.textAlign = mode;
    this.pre.style.textAlign = mode;
    if (this.alignBtn) this.alignBtn.textContent = mode === "left" ? "L" : mode === "center" ? "C" : "R";
    if (save && this.alignKeyFn) {
      try {
        localStorage.setItem(this.alignKeyFn(), mode);
      } catch {
        // storage unavailable — alignment stays session-local
      }
    }
  }

  loadAlign() {
    if (!this.alignKeyFn) return;
    try {
      const v = localStorage.getItem(this.alignKeyFn());
      if (v) this.setAlign(v, false);
    } catch {
      // ignore
    }
  }

  setFontColor(hex, save = true) {
    this.pre.style.color = hex;
    if (this.colorInput && this.colorInput.value !== hex) this.colorInput.value = hex;
    if (save && this.colorKeyFn) {
      try {
        localStorage.setItem(this.colorKeyFn(), hex);
      } catch {
        // storage unavailable — color stays session-local
      }
    }
  }

  loadFontColor() {
    if (!this.colorKeyFn) return;
    try {
      const v = localStorage.getItem(this.colorKeyFn());
      if (v) this.setFontColor(v, false);
    } catch {
      // ignore
    }
  }

  applyHeight() {
    const h = this.currentHeight();
    this.root.style.setProperty("--comfy-widget-height", `${h}px`);
    this.root.style.setProperty("--comfy-widget-min-height", `${h}px`);
    this.root.style.setProperty("--comfy-widget-max-height", `${h}px`);
  }

  setHeight(px, save = true) {
    this.height = Math.max(MIN_HEIGHT, Math.round(px));
    this.applyHeight();
    if (save && this.heightKeyFn) {
      try {
        localStorage.setItem(this.heightKeyFn(), String(this.height));
      } catch {
        // storage unavailable — height stays session-local
      }
    }
  }

  loadHeight() {
    if (!this.heightKeyFn) return;
    try {
      const v = parseInt(localStorage.getItem(this.heightKeyFn()) || "", 10);
      if (Number.isFinite(v)) this.setHeight(v, false);
    } catch {
      // ignore
    }
  }

  setPanelTitle(title, onChange) {
    const input = document.createElement("input");
    input.className = "magik-panel-title";
    input.value = title;
    input.spellcheck = false;
    input.title = "Panel title — also used as this panel's output name";
    input.addEventListener("change", () => {
      const v = input.value.trim();
      if (v && v !== title) onChange(v);
      else input.value = title;
    });
    this.panelTitleInput = input;
    this.toolbar.insertBefore(input, this.toolbar.firstChild);
  }

  setPanelTitleValue(title) {
    if (this.panelTitleInput && document.activeElement !== this.panelTitleInput) {
      this.panelTitleInput.value = title;
    }
  }

  setWildcardToggle(get, set) {
    const btn = el("button", "magik-wild", "wild");
    btn.title = "Wildcards: when on, {a|b} dynamic-prompt choices are expanded at queue time (ComfyUI rules)";
    btn.addEventListener("click", () => {
      const v = !(this.wildBtn && this.wildBtn.classList.contains("active"));
      this.setWildcardValue(v);
      set(v);
    });
    this.wildBtn = btn;
    this.toolbar.insertBefore(btn, this.stats);
    this.setWildcardValue(!!get());
  }

  setWildcardValue(v) {
    if (this.wildBtn) this.wildBtn.classList.toggle("active", !!v);
  }

  setPanelsLabel(text) {
    if (this.panelLabel) this.panelLabel.textContent = text;
  }

  lineStartIndex(pos) {
    return pos > 0 ? this.ta.value.lastIndexOf("\n", pos - 1) + 1 : 0;
  }

  onKeydown(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.code === "Slash") {
      e.preventDefault();
      if (e.shiftKey) this.toggleBlockComment();
      else this.toggleLineComment();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      this.indent(!e.shiftKey);
      return;
    }
    if (e.key === "Enter" && !mod && !e.altKey) {
      e.preventDefault();
      this.insertNewlineWithIndent();
    }
  }

  toggleLineComment() {
    const ta = this.ta;
    const v = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const ls = this.lineStartIndex(s);
    let le = v.indexOf("\n", e);
    if (le === -1) le = v.length;
    const lines = v.slice(ls, le).split("\n");
    const content = lines.filter((l) => l.trim() !== "");
    const allCommented = content.length > 0 && content.every((l) => /^\s*#/.test(l));
    const next = lines
      .map((l) => {
        if (!l.trim()) return l;
        return allCommented ? l.replace(/^(\s*)#\s?/, "$1") : l.replace(/^(\s*)/, `$1# `);
      })
      .join("\n");
    ta.setRangeText(next, ls, le, "end");
    ta.selectionStart = ls;
    ta.selectionEnd = ls + next.length;
    this.commit();
  }

  toggleBlockComment() {
    const ta = this.ta;
    const v = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const before = v.slice(0, s);
    const sel = v.slice(s, e);
    const after = v.slice(e);
    let nv;
    let ns;
    let ne;
    if (before.endsWith("/*") && after.startsWith("*/")) {
      nv = before.slice(0, -2) + sel + after.slice(2);
      ns = Math.max(0, s - 2);
      ne = Math.max(0, e - 2);
    } else {
      nv = before + "/*" + sel + "*/" + after;
      ns = s + 2;
      ne = e + 2;
    }
    ta.value = nv;
    ta.selectionStart = ns;
    ta.selectionEnd = ne;
    this.commit();
  }

  indent(forward) {
    const ta = this.ta;
    const v = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    if (s === e) {
      if (forward) {
        ta.setRangeText(INDENT, s, e, "end");
      } else {
        const before = v.slice(0, s);
        const trailing = before.match(/ {1,2}$|\t$/);
        if (trailing) ta.setRangeText("", s - trailing[0].length, s, "end");
      }
      this.commit();
      return;
    }
    const ls = this.lineStartIndex(s);
    let le = v.indexOf("\n", e);
    if (le === -1) le = v.length;
    const lines = v.slice(ls, le).split("\n");
    const next = lines
      .map((l) => (forward ? INDENT + l : l.replace(/^(?: {1,2}|\t)/, "")))
      .join("\n");
    ta.setRangeText(next, ls, le, "end");
    ta.selectionStart = ls;
    ta.selectionEnd = ls + next.length;
    this.commit();
  }

  insertNewlineWithIndent() {
    const ta = this.ta;
    const v = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const ls = this.lineStartIndex(s);
    const indent = (v.slice(ls, s).match(/^[ \t]*/) || [""])[0];
    ta.setRangeText("\n" + indent, s, e, "end");
    this.commit();
  }
}

function upgradeWidget(widget, name) {
  try {
    const editor = new MagikTextEditor(name);
    const initial = typeof widget.value === "string" ? widget.value : "";
    editor.setValue(initial);

    const options = widget.options ?? (widget.options = {});
    const origSetValue = options.setValue;
    options.getValue = () => editor.getValue();
    options.setValue = (v) => {
      editor.setValue(v == null ? "" : String(v));
      if (widget._state) widget._state.value = v;
      if (origSetValue) origSetValue.call(options, v);
    };
    options.hideOnZoom = false;
    options.getHeight = () => editor.currentHeight();
    options.getMinHeight = () => editor.currentHeight();
    options.getMaxHeight = () => editor.currentHeight();

    editor.onChange = (value) => {
      widget.value = value;
    };

    const node = widget.node;
    editor.fontKeyFn = () => `magik-text.font.${node?.id ?? "?"}.${name}`;
    editor.heightKeyFn = () => `magik-text.height.${node?.id ?? "?"}.${name}`;
    editor.alignKeyFn = () => `magik-text.align.${node?.id ?? "?"}.${name}`;
    editor.colorKeyFn = () => `magik-text.color.${node?.id ?? "?"}.${name}`;
    const growNode = () => {
      if (!node) return;
      const cs = node.computeSize();
      const cur = node.size ?? [0, 0];
      node.setSize([Math.max(cur[0], cs[0]), Math.max(cur[1], cs[1])]);
      node.setDirtyCanvas(true, true);
    };
    editor.onHeightChanging = growNode;
    editor.onHeightChanged = (settle) => {
      if (!node) return;
      const cs = node.computeSize();
      const cur = node.size ?? [0, 0];
      const h = settle ? cs[1] : Math.max(cur[1], cs[1]);
      node.setSize([Math.max(cur[0], cs[0]), h]);
      node.setDirtyCanvas(true, true);
      node.graph?.change?.();
    };
    const loadPrefs = () => {
      editor.loadFontSize();
      editor.loadHeight();
      editor.loadAlign();
      editor.loadFontColor();
      if (editor.onHeightChanged) editor.onHeightChanged();
    };
    if (node) {
      if (node.graph) {
        loadPrefs();
      } else {
        const prevOnAdded = node.onAdded;
        node.onAdded = function (...args) {
          const r = prevOnAdded?.apply(this, args);
          loadPrefs();
          return r;
        };
      }
    }

    const origOnRemove = widget.onRemove?.bind(widget);
    widget.onRemove = () => {
      window.removeEventListener(CARDS_EVENT, editor.cardsListener);
      if (origOnRemove) origOnRemove();
    };

    widget.element = editor.root;
    return editor;
  } catch (err) {
    console.warn("[magik-text] could not upgrade widget", name, err);
    return null;
  }
}

function setPanelVisible(widget, visible, restoreType = "customtext") {
  if (!widget) return;
  if (visible) {
    widget.type = restoreType;
    widget.hidden = false;
    if (widget.options) widget.options.hidden = false;
    if (widget.element) widget.element.style.display = "";
  } else {
    widget.hidden = true;
    widget.type = "hidden";
    if (widget.options) widget.options.hidden = true;
    if (widget.element) widget.element.style.display = "none";
  }
}

function setupPanelsNode(node) {
  if (panelsControls.has(node)) return;
  const countWidget = node.widgets?.find((w) => w.name === "count");
  if (!countWidget) return;
  setPanelVisible(countWidget, false, "number");

  const textWidgets = [];
  const editors = [];
  const wildWidgets = [];
  const collapseWidgets = [];
  const titles = PANEL_NAMES.slice();
  let firstEditor = null;
  PANEL_NAMES.forEach((name, i) => {
    const widget = node.widgets?.find((w) => w.name === name && w.element);
    if (!widget) return;
    const editor = upgradeWidget(widget, name);
    if (!editor) return;
    textWidgets[i] = widget;
    editors[i] = editor;
    if (!firstEditor) firstEditor = editor;
    editor.setCloseButton(() => closePanel(i));
    editor.setPanelTitle(titles[i], (t) => renamePanel(i, t));
    const ww = node.widgets?.find((w) => w.name === WILDCARD_NAMES[i]);
    if (ww) {
      wildWidgets[i] = ww;
      setPanelVisible(ww, false, "toggle");
      widget.dynamicPrompts = false;
      widget.serializeValue = () => {
        const v = editor.getValue();
        return ww.value === true ? processDynamicPrompt(v) : v;
      };
      editor.setWildcardToggle(() => ww.value === true, (v) => {
        ww.value = v;
      });
    }
    const cw = node.widgets?.find((w) => w.name === COLLAPSE_NAMES[i]);
    if (cw) {
      collapseWidgets[i] = cw;
      setPanelVisible(cw, false, "toggle");
      editor.setCollapseControl(() => cw.value === true, (v) => {
        cw.value = v;
      });
    }
  });
  if (textWidgets.length === 0 || !firstEditor) return;

  const renamePanel = (i, title) => {
    titles[i] = title;
    const out = node.outputs[i];
    if (out) out.label = title;
    node.setDirtyCanvas(true, true);
  };

  const getCount = () => {
    const v = parseInt(countWidget.value, 10);
    return Number.isFinite(v) ? Math.min(MAX_PANELS, Math.max(1, v)) : 1;
  };

  let initialized = false;
  let lastCount = 0;
  const syncPanels = () => {
    const n = getCount();
    firstEditor.setPanelsLabel(`${n} panel${n === 1 ? "" : "s"}`);
    textWidgets.forEach((widget, i) => setPanelVisible(widget, i < n));
    while (node.outputs.length > n) node.removeOutput(node.outputs.length - 1);
    while (node.outputs.length < n) {
      const idx = node.outputs.length;
      const title = titles[idx] ?? PANEL_NAMES[idx];
      const out = node.addOutput(PANEL_NAMES[idx] ?? title, "STRING");
      if (out) out.label = title;
    }
    for (let i = 0; i < node.outputs.length; i++) {
      const out = node.outputs[i];
      const label = out?.label || out?.name;
      if (label) {
        titles[i] = label;
        if (editors[i]) editors[i].setPanelTitleValue(label);
      }
    }
    wildWidgets.forEach((w, i) => {
      if (w && editors[i]) editors[i].setWildcardValue(w.value === true);
    });
    collapseWidgets.forEach((w, i) => {
      if (w && editors[i]) editors[i].setCollapsed(w.value === true);
    });
    syncConnections();
    const cs = node.computeSize();
    const cur = node.size ?? [0, 0];
    const w = Math.max(cur[0], cs[0]);
    if (!initialized) {
      initialized = true;
      if (!node.graph) node.setSize([w, cs[1]]);
    } else if (n > lastCount) {
      node.setSize([w, Math.max(cur[1], cs[1])]);
    } else if (n < lastCount) {
      node.setSize([w, cs[1]]);
    }
    lastCount = n;
    node.setDirtyCanvas(true, true);
    node.graph?.change?.();
  };

  const panelConnected = (i) => {
    const input = node.inputs?.find((inp) => inp.name === PANEL_NAMES[i] && inp.link != null);
    if (input) return true;
    if (node.isOutputConnected) return !!node.isOutputConnected(i);
    return (node.outputs?.[i]?.links?.length ?? 0) > 0;
  };

  const syncConnections = () => {
    editors.forEach((editor, i) => {
      if (editor) editor.setConnected(panelConnected(i));
    });
  };

  const setCount = (n) => {
    try {
      n = Math.min(MAX_PANELS, Math.max(1, n));
      countWidget.value = n;
      syncPanels();
    } catch (err) {
      console.error("[magik-text] could not change panel count", err);
    }
  };

  const closePanel = (i) => {
    const n = getCount();
    if (i >= n) return;
    if (n <= 1) {
      console.warn("[magik-text] cannot close the last remaining panel");
      return;
    }
    const connected =
      node.isOutputConnected?.(i) ?? ((node.outputs[i]?.links?.length ?? 0) > 0);
    if (connected) {
      console.warn("[magik-text] cannot close panel: its output is connected");
      return;
    }
    try {
      for (let j = i; j < n - 1; j++) {
        if (textWidgets[j + 1]) textWidgets[j].value = textWidgets[j + 1].value;
        if (wildWidgets[j + 1]) wildWidgets[j].value = wildWidgets[j + 1].value;
        if (collapseWidgets[j + 1]) collapseWidgets[j].value = collapseWidgets[j + 1].value;
        titles[j] = titles[j + 1] ?? PANEL_NAMES[j];
        const out = node.outputs[j];
        if (out) out.label = titles[j];
      }
      if (textWidgets[n - 1]) textWidgets[n - 1].value = "";
      if (wildWidgets[n - 1]) wildWidgets[n - 1].value = false;
      if (collapseWidgets[n - 1]) collapseWidgets[n - 1].value = false;
      setCount(n - 1);
    } catch (err) {
      console.error("[magik-text] could not close panel", err);
    }
  };

  firstEditor.setPanelsControls(() => setCount(getCount() + 1));

  const origCallback = countWidget.callback;
  countWidget.callback = function (v) {
    if (origCallback) {
      try {
        origCallback.call(this, v);
      } catch (err) {
        console.error("[magik-text] count widget callback failed", err);
      }
    }
    try {
      syncPanels();
    } catch (err) {
      console.error("[magik-text] panel sync failed", err);
    }
  };

  const prevOnConnectionsChange = node.onConnectionsChange;
  node.onConnectionsChange = function (...args) {
    if (prevOnConnectionsChange) prevOnConnectionsChange.apply(this, args);
    try {
      syncConnections();
    } catch (err) {
      console.error("[magik-text] connection sync failed", err);
    }
  };

  panelsControls.set(node, { getCount, setCount, sync: syncPanels, closePanel });
  syncPanels();
}

app.registerExtension({
  name: "magik.text.editor",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== PANELS_NODE) return;
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (...args) {
      if (onNodeCreated) onNodeCreated.apply(this, args);
      setupPanelsNode(this);
    };
    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (...args) {
      if (onConfigure) onConfigure.apply(this, args);
      const controls = panelsControls.get(this);
      if (controls) {
        try {
          controls.sync();
        } catch (err) {
          console.error("[magik-text] panel sync after load failed", err);
        }
      }
    };
    const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function (...args) {
      const options = (getExtraMenuOptions ? getExtraMenuOptions.apply(this, args) : args[1]) ?? args[1];
      const controls = panelsControls.get(this);
      if (controls && Array.isArray(options)) {
        options.push(
          {
            content: "Add text panel (adds one output)",
            callback: () => controls.setCount(controls.getCount() + 1),
          },
          {
            content: "Remove last text panel (removes its output)",
            callback: () => controls.closePanel(controls.getCount() - 1),
          },
        );
      }
      return options;
    };
  },
  async nodeCreated(node) {
    const nodeClass = node.comfyClass ?? node.type;
    if (nodeClass === PANELS_NODE) {
      setupPanelsNode(node);
      return;
    }
    const fields = TEXT_FIELDS[nodeClass];
    if (!fields || !node.widgets) return;
    for (const name of fields) {
      const widget = node.widgets.find((w) => w.name === name && w.element);
      if (widget) upgradeWidget(widget, name);
    }
  },
});
