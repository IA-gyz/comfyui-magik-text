from comfy_api.latest import ComfyExtension, io

from .comment_strip import strip_comments
from .panels import panel_outputs

CATEGORY = "Magik/Text"
TEXT_COUNT = 7
PANEL_COUNT = 10


def _clean(value):
    """Frontend can hand over the literal string 'undefined' for unset widgets."""
    if value is None or value == "undefined":
        return ""
    return value


def _panel_names():
    """Widget/output names per panel. Panel 1 stays ``text`` so existing workflows keep working."""
    return ["text"] + [f"text{i}" for i in range(2, PANEL_COUNT + 1)]


def _wildcard_names():
    """Per-panel wildcard toggle names. Expansion itself happens frontend-side at queue time."""
    return ["wildcards"] + [f"wildcards{i}" for i in range(2, PANEL_COUNT + 1)]


def _collapse_names():
    """Per-panel collapse toggle names. Collapsed state is frontend-only."""
    return ["collapse"] + [f"collapse{i}" for i in range(2, PANEL_COUNT + 1)]


class MagikText(io.ComfyNode):
    """Multiline text with a dynamic number of panels/outputs.

    The frontend shows ``count`` panels, each a text widget with its own output.
    The schema declares the maximum (PANEL_COUNT) so every widget value and
    output link stays valid. Panels beyond ``count`` output an empty string.
    """

    @classmethod
    def define_schema(cls):
        names = _panel_names()
        inputs = [
            io.Int.Input("count", default=1, min=1, max=PANEL_COUNT,
                         tooltip="Number of visible text panels/outputs"),
        ]
        inputs += [
            io.String.Input(name, multiline=True, default="", dynamic_prompts=True)
            for name in names
        ]
        inputs += [
            io.Boolean.Input(
                name,
                default=True,
                optional=True,
                tooltip="When on, this panel's text is expanded with ComfyUI dynamic-prompt wildcards ({a|b} choices) at queue time",
            )
            for name in _wildcard_names()
        ]
        inputs += [
            io.Boolean.Input(
                name,
                default=False,
                optional=True,
                tooltip="When on, this panel is collapsed (editor hidden, only the toolbar shows)",
            )
            for name in _collapse_names()
        ]
        outputs = [io.String.Output(name) for name in names]
        return io.Schema(
            node_id="Magik.Text",
            display_name="Magik Text",
            category=CATEGORY,
            inputs=inputs,
            outputs=outputs,
        )

    @classmethod
    def execute(cls, count, text, text2, text3, text4, text5, text6, text7, text8, text9, text10,
                wildcards, wildcards2, wildcards3, wildcards4, wildcards5,
                wildcards6, wildcards7, wildcards8, wildcards9, wildcards10,
                collapse, collapse2, collapse3, collapse4, collapse5,
                collapse6, collapse7, collapse8, collapse9, collapse10):
        raw = (text, text2, text3, text4, text5, text6, text7, text8, text9, text10)
        stripped = [strip_comments(_clean(t)) for t in raw]
        return io.NodeOutput(*panel_outputs(count, stripped, PANEL_COUNT))


class MagikText7Concat(io.ComfyNode):
    """Concatenate seven text boxes with a delimiter. Empty boxes are kept as empty entries."""

    @classmethod
    def define_schema(cls):
        inputs = [
            io.String.Input(f"text{i}", multiline=True, default="", dynamic_prompts=True)
            for i in range(1, TEXT_COUNT + 1)
        ]
        inputs.append(io.String.Input("delimiter", default=",", multiline=False))
        outputs = [io.String.Output(f"text{i}") for i in range(1, TEXT_COUNT + 1)]
        outputs.append(io.String.Output("concat"))
        return io.Schema(
            node_id="Magik.Text7Concat",
            display_name="Magik Text 7x Concat",
            category=CATEGORY,
            inputs=inputs,
            outputs=outputs,
        )

    @classmethod
    def execute(cls, text1, text2, text3, text4, text5, text6, text7, delimiter):
        texts = [strip_comments(_clean(t)) for t in (text1, text2, text3, text4, text5, text6, text7)]

        if delimiter == "\\n":
            delimiter = "\n"

        concat = delimiter.join(texts)
        return io.NodeOutput(*texts, concat)


class MagikTextExtension(ComfyExtension):
    async def get_node_list(self):
        return [MagikText, MagikText7Concat]


async def comfy_entrypoint():
    return MagikTextExtension()
