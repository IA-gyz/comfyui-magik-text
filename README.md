# ComfyUI Magik Text

Custom nodes for multiline prompt text in ComfyUI, with a rich JS text editor
and support for comments inside prompts.

## Nodes

- **Magik Text** (`Magik.Text`) — a multiline text box that passes its text
  through to the `text` output.
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
- word-wrap toggle and a status bar with line/word/character counts,
  including the character count after comments are removed

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
