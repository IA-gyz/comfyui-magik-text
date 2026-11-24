"""Panel-count handling for the dynamic text-panels node."""

import json


def clamp_count(count, max_panels):
    """Clamp a (possibly messy) widget value to ``1..max_panels``."""
    try:
        n = int(count)
    except (TypeError, ValueError):
        return 1
    return max(1, min(max_panels, n))


def panel_outputs(count, texts, max_panels):
    """Return exactly ``max_panels`` outputs: the first ``count`` texts, then empty strings.

    Panels beyond ``count`` output an empty string even if their widget still
    holds text, so a removed panel is never output.
    """
    n = clamp_count(count, max_panels)
    out = []
    for i in range(max_panels):
        if i < n and i < len(texts):
            out.append(texts[i])
        else:
            out.append("")
    return out


def parse_links(raw, max_links):
    """Parse the frontend-serialized link list into deduped 0-based index pairs.

    Pair order (drag source first) is preserved so the concatenation follows the
    drag direction; duplicates are detected regardless of order. Self-links,
    negative and malformed entries are dropped, and the result is capped at
    ``max_links``.
    """
    try:
        data = json.loads(raw) if raw else []
    except (TypeError, ValueError):
        return []
    if not isinstance(data, list):
        return []
    seen = set()
    out = []
    for pair in data:
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            continue
        try:
            a, b = int(pair[0]), int(pair[1])
        except (TypeError, ValueError):
            continue
        if a == b or a < 0 or b < 0:
            continue
        key = (min(a, b), max(a, b))
        if key in seen:
            continue
        seen.add(key)
        out.append((a, b))
        if len(out) >= max_links:
            break
    return out


def concat_outputs(links, texts, max_links):
    """One output per link — ``texts[a] + " " + texts[b]`` — then empty strings up to ``max_links``."""
    out = []
    for a, b in parse_links(links, max_links):
        ta = texts[a] if 0 <= a < len(texts) else ""
        tb = texts[b] if 0 <= b < len(texts) else ""
        out.append(f"{ta} {tb}")
    while len(out) < max_links:
        out.append("")
    return out
