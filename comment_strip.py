"""Prompt comment stripping.

Two comment forms are recognized and removed from the output:

- Line comments: a ``#`` that is the first non-whitespace character of a
  line comments out the rest of that line.
- Block comments: ``/* ... */`` comments out everything between the markers,
  including across multiple lines. An unterminated ``/*`` comments out the
  rest of the text.

Everything else (including ``#`` in the middle of a line) is kept as-is.
Surrounding whitespace and newlines are preserved; only the comment text
itself is removed.
"""


def strip_comments(text):
    """Return ``text`` with line and block comments removed."""
    if not text:
        return ""

    out = []
    i = 0
    n = len(text)
    line_start = True  # only whitespace seen since the last newline

    while i < n:
        c = text[i]

        if line_start and c == "#":
            # Skip to the end of the line, keeping the line terminator itself.
            while i < n and text[i] != "\n" and text[i] != "\r":
                i += 1
            continue

        if c == "/" and i + 1 < n and text[i + 1] == "*":
            end = text.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue

        out.append(c)
        if c == "\n":
            line_start = True
        elif c not in " \t\r":
            line_start = False
        i += 1

    return "".join(out)
