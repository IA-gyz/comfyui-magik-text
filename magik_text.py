from comfy_api.latest import ComfyExtension, io

CATEGORY = "Magik/Text"
TEXT_COUNT = 7


def _clean(value):
    """Frontend can hand over the literal string 'undefined' for unset widgets."""
    return "" if value == "undefined" else value


class MagikText(io.ComfyNode):
    """Multiline text passthrough with dynamic prompt support."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Magik.Text",
            display_name="Magik Text",
            category=CATEGORY,
            inputs=[
                io.String.Input("text", multiline=True, default="", dynamic_prompts=True),
            ],
            outputs=[
                io.String.Output("text"),
            ],
        )

    @classmethod
    def execute(cls, text):
        return io.NodeOutput(text)


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
        texts = [_clean(t) for t in (text1, text2, text3, text4, text5, text6, text7)]

        if delimiter == "\\n":
            delimiter = "\n"

        concat = delimiter.join(texts)
        return io.NodeOutput(*texts, concat)


class MagikTextExtension(ComfyExtension):
    async def get_node_list(self):
        return [MagikText, MagikText7Concat]


async def comfy_entrypoint():
    return MagikTextExtension()
