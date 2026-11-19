"""Panel-count handling for the dynamic text-panels node."""


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
