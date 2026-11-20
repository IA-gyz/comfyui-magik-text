# ComfyUI Magik Text

Custom nodes for multiline prompt text in ComfyUI, with a rich JS text editor
and support for comments inside prompts.

## Nodes

- **Magik Text** (`Magik.Text`) — a multiline text box with a dynamic number of
  panels. Every panel is a full text editor (with cards, comments and
  highlighting) and has its own output. Use the ＋ button in the first panel's
  toolbar (or the node's right-click menu) to add a panel — each new panel adds
  one output, up to 10. Each panel has its own ✕ close button; closing a panel
  removes it and its output (values of the panels above shift up). A panel
  whose output is connected cannot be closed. Each panel has an editable title
  field (left of its toolbar); renaming it renames the panel's output, and the
  name is saved in the workflow. Closing a panel shifts the titles and values
  of the panels above it up, so outputs keep matching their titles. The first
  panel keeps the name `text`, so existing single-text workflows keep working
  unchanged. Panels beyond the current count output an empty string, and
  comments are stripped from every panel output like in the other nodes.
- **Magik Text 7x Concat** (`Magik.Text7Concat`) — seven multiline text boxes
  (`text1`–`text7`) plus a `delimiter`. Outputs each box individually and a
  `concat` output joining all seven with the delimiter. Empty boxes are kept
  as empty entries. Use the literal `\n` as delimiter for newlines.

## Text editor

The text boxes are rendered by a custom JS editor instead of the default
textarea. It provides:

- syntax highlighting for comments, prompt weights `(text:1.2)`, alternates
  `[a|b]` and embeddings `<lora:...>`
- comment toggling with the toolbar buttons or keyboard:
  `Ctrl+/` (or `Cmd+/`) toggles `#` line comments on the selected lines,
  `Ctrl+Shift+/` toggles a `/* ... */` block comment around the selection
- `Tab` / `Shift+Tab` to indent or unindent (two spaces), `Enter` keeps the
  indentation of the previous line
- word-wrap toggle, a per-panel font-size setting (`A−` / `A+` in the toolbar, min 8 px, no upper limit),
  a per-panel text alignment (`L` button cycles left / center / right) and a per-panel font color
  (the color picker in the toolbar),
  and a per-panel height (drag the handle at the bottom of a panel, min 120 px, no upper limit).
  Font size, alignment, color and height are persisted per panel in local storage (keyed by node id +
  widget name) and restored on reload / tab switch. The status bar shows
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
- **panel title**: the input at the far left of each panel's toolbar is the
  panel's title; renaming it changes the **label** of the corresponding output
  slot (the output's internal name stays `text`, `text2`, …).
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
