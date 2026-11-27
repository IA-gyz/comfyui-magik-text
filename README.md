# ComfyUI Magik Text

Custom nodes for multiline prompt text in ComfyUI, with a rich JS text editor
and support for comments inside prompts.

## Nodes

- **Magik Text** (`Magik.Text`) — a multiline text box with a dynamic number of
  panels. Every panel is a full text editor (with cards, comments and
  highlighting) and has its own output. The node has a menu row at the very top
  (above the first panel) holding the global UI-size slider, the panel count and
  the ＋ add-panel button (the node's right-click menu can also add/remove
  panels); each new panel adds one output, up to 10. Each panel has a prominent title row of
  its own just under its toolbar. Each panel has its own ✕ close button; closing a panel
  removes it and its output (values of the panels above shift up). A panel
  cannot be closed while its own output, or the output of any later panel (which would shift up), is connected. Each panel also has a ⧉ duplicate
  button; duplicating adds a copy of the panel (text, wildcards, collapsed state
  and title) as a new panel after the last one, up to 10 panels. Each panel also has
  a colored badge button labeled with the panel's index (1, 2, …): press and drag
  from one panel's badge onto another panel to concatenate them — the node gains a
  new output labeled with the joined panel names (e.g. `bob + alice`) whose value is
  the two panels' texts joined with a
  single space, computed live at queue time (comments stripped, panels beyond the
  count read as empty). Both concatenated panels then show the two badges side by
  side; click a linked badge without dragging to remove the link. Links are stored
  in the workflow (up to 10). Panels that are
  in use — their output is connected to another node's input, or their text field
  is converted to an input and linked — are highlighted with a prominent glowing
  border and title, so connected panels stand out at a glance. Every output label is
  prefixed with its 1-based index, e.g. `3-bob` for a panel titled `bob` in third
  position (matching the index badges). Each panel has an editable title
  field (left of its toolbar); renaming it renames the panel's output, and the
  name is saved in the workflow. Closing a panel shifts the titles and values
  of the panels above it up, so outputs keep matching their titles. The first
  panel keeps the name `text`, so existing single-text workflows keep working
  unchanged. Panels beyond the current count output an empty string, and
  comments are stripped from every panel output like in the other nodes.
- **Magik Text 7x Concat** (`Magik.Text7Concat`) — seven multiline text boxes
  (`text1`–`text7`) plus a `delimiter`. Outputs each box individually and a
  `concat` output joining all seven with the delimiter. Empty boxes are kept
  as empty entries. Use the literal `\n` (or `\t`) in the delimiter for newlines (tabs); escapes work anywhere in it, e.g. `, \n`.

## Text editor

The text boxes are rendered by a custom JS editor instead of the default
textarea. It provides:

- syntax highlighting for comments, prompt weights `(text:1.2)`, alternates
  `[a|b]` and embeddings `<lora:...>`
- comment toggling with the toolbar buttons or keyboard:
  `Ctrl+/` (or `Cmd+/`) toggles `#` line comments on the selected lines,
  `Ctrl+Shift+/` (or `Shift+Alt+A`, which works on any keyboard layout) toggles a
  `/* ... */` block comment around the selection
- `Tab` / `Shift+Tab` to indent or unindent (two spaces), `Enter` keeps the
  indentation of the previous line
- spellcheck toggle (`abc` button in the toolbar, on by default, persisted per panel):
  native browser spellcheck — misspelled words get squiggles and right-clicking one offers
  corrections. Prompt syntax (`<lora:...>`, `(text:1.2)`, `[a|b]`) is also checked, so
  turn it off per panel if that is noisy for you
- word-wrap toggle, a per-panel font-size setting (`A−` / `A+` in the toolbar, default 24 px, min 8 px, no upper limit),
  a per-panel text alignment (`L` button cycles left / center / right) and a per-panel font color
  (the color picker in the toolbar),
  and a per-panel height (drag the handle at the bottom of a panel, min 120 px, no upper limit).
  Font size, alignment, color, height, spellcheck and the word-wrap toggle are stored per panel in the node's properties, i.e. inside the
  workflow (so they travel with it, survive copy/paste, follow a panel when panels above it are closed, and are copied
  by the duplicate button). Values saved by older versions in local storage are imported once when such a workflow is
  loaded. There is also a global UI size setting
  (the `ui` slider in the menu row at the top of the node, stepping through
  75% / 85% / 100% / 115% / 130% / 150% / 175% / 200%): one global value for all panels that scales the whole panel UI
  (toolbar, cards, text and handle) at once through a single CSS variable, so every editor scales
  identically and panel heights / node layout stay unchanged (no gaps between panels). The one exception is very
  large UI sizes: a panel's height never drops below its (scaled) toolbar/title/cards plus a small text area, so it grows
  only as much as needed to keep the text visible, and collapsed panels scale with the UI size too. Persisted
  in local storage under a single global key, applied to every Magik text editor, independent of
  the per-panel font size. The status bar shows
  line/word/character counts, including the character count after comments
  are removed
- **cards**: the card strip below the toolbar holds buttons with predefined
  text. Clicking a card inserts its text into the editor at the cursor,
  replacing any selection. The `＋` button opens a panel to add,
  edit and remove cards. Cards are shared by all Magik text editors and stored
  in the browser's local storage.
- **wildcards toggle** (`wild` button in each panel's toolbar, on by default):
  when on, the panel's text is expanded with ComfyUI's dynamic-prompt rules
  at queue time — `{a|b|c}` picks one option at random (nesting and `\{`
  escapes work, `/* */` and `//` comments are stripped, exactly like ComfyUI's
  built-in dynamic prompts). When off, the text is sent verbatim.
- **panel title**: each panel has its own prominent title row (full-width, bold, larger
  font) just under its toolbar; renaming the title changes the **label** of the
  corresponding output slot to `<index>-<title>` (1-based index, e.g. `3-bob`; the
  output's internal name stays `text`, `text2`, …).
- **collapsible panels**: the `▾` button in each panel's toolbar collapses the
  panel (only the toolbar stays visible, the node shrinks accordingly; the
  collapsed row is highlighted and clicking it expands the panel again). The
  state is stored per panel in the workflow and restored on reload / tab switch.

## Comments

Commented parts of a prompt are **not part of the output**. Two comment forms
are recognized and stripped by the node at execution time:

- **Line comment** — a `#` as the first non-whitespace character of a line
  comments out the rest of that line:

  ```
  a beautiful landscape
  # this line is ignored
  dramatic lighting
  ```

- **Block comment** — `/* ... */` comments out everything between the markers,
  across as many lines as needed. An unterminated `/*` comments out the rest
  of the text:

  ```
  a beautiful landscape, /* alternate idea: at night */ dramatic lighting
  ```

A `#` in the middle of a line (e.g. a hex color) is kept as-is. Only the
comment text is removed; surrounding whitespace and newlines are preserved.
The full text, comments included, is stored in the workflow, so you can keep
commenting and uncommenting freely.

## Install

Clone into ComfyUI's `custom_nodes` directory:

```bash
git clone https://github.com/IA-gyz/comfyui-magik-text.git
```

## Development

Run the comment-stripping tests with:

```bash
python -m unittest discover -s tests -v
```
