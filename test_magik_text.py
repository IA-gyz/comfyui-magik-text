"""Tests for the node classes. ``comfy_api`` is stubbed so no ComfyUI install is needed."""

import importlib.util
import os
import sys
import types
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _load_module():
    class _Spec:
        def __init__(self, id_, **kw):
            self.id = id_
            self.kw = kw

    def _kind():
        class Kind:
            class Input(_Spec):
                pass

            class Output(_Spec):
                pass

        return Kind

    io = types.SimpleNamespace(
        ComfyNode=object,
        Int=_kind(),
        String=_kind(),
        Boolean=_kind(),
        Schema=lambda **kw: types.SimpleNamespace(**kw),
        NodeOutput=lambda *a: a,
    )
    api = types.ModuleType("comfy_api")
    latest = types.ModuleType("comfy_api.latest")
    latest.ComfyExtension = object
    latest.io = io
    sys.modules["comfy_api"] = api
    sys.modules["comfy_api.latest"] = latest

    # Load as a throw-away package so the real __init__.py (which needs ComfyUI) is not run.
    pkg = types.ModuleType("magik_text_pkg")
    pkg.__path__ = [ROOT]
    sys.modules["magik_text_pkg"] = pkg
    spec = importlib.util.spec_from_file_location("magik_text_pkg.magik_text", os.path.join(ROOT, "magik_text.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules["magik_text_pkg.magik_text"] = mod
    spec.loader.exec_module(mod)
    return mod


mt = _load_module()


class MagikTextSchemaTests(unittest.TestCase):
    def setUp(self):
        self.schema = mt.MagikText.define_schema()
        self.in_ids = [i.id for i in self.schema.inputs]
        self.out_ids = [o.id for o in self.schema.outputs]

    def test_panel_one_keeps_legacy_names(self):
        self.assertEqual(mt._panel_names()[:3], ["text", "text2", "text3"])
        self.assertEqual(mt._wildcard_names()[:2], ["wildcards", "wildcards2"])
        self.assertEqual(mt._collapse_names()[:2], ["collapse", "collapse2"])

    def test_output_layout_matches_frontend(self):
        # 10 panel outputs, then 10 concat outputs: the JS addresses concat k at index 10 + k.
        self.assertEqual(len(self.out_ids), 2 * mt.PANEL_COUNT)
        self.assertEqual(self.out_ids[:2], ["text", "text2"])
        self.assertEqual(self.out_ids[mt.PANEL_COUNT : mt.PANEL_COUNT + 2], ["concat", "concat2"])
        self.assertEqual(self.out_ids[-1], f"concat{mt.PANEL_COUNT}")

    def test_frontend_only_inputs_are_optional(self):
        # The frontend leaves collapse* out of the prompt, so the backend must not require them.
        optional = {i.id: i.kw.get("optional", False) for i in self.schema.inputs}
        for name in mt._collapse_names() + mt._wildcard_names() + ["links"]:
            self.assertTrue(optional[name], name)
        for name in ["count"] + mt._panel_names():
            self.assertFalse(optional[name], name)


class MagikTextExecuteTests(unittest.TestCase):
    def run_node(self, count, links="[]", **texts):
        return mt.MagikText.execute(count, links=links, **texts)

    def test_returns_all_outputs(self):
        self.assertEqual(len(self.run_node(1, text="a")), 2 * mt.PANEL_COUNT)

    def test_comments_stripped_and_unset_undefined_cleaned(self):
        out = self.run_node(2, text="a # not a comment\n# comment\nb", text2="undefined")
        self.assertEqual(out[0], "a # not a comment\n\nb")
        self.assertEqual(out[1], "")

    def test_panels_beyond_count_are_empty(self):
        out = self.run_node(1, text="a", text2="hidden")
        self.assertEqual(out[1], "")

    def test_concat_links_use_masked_values(self):
        out = self.run_node(2, links="[[1,0],[0,2]]", text="a", text2="b", text3="hidden")
        concat = out[mt.PANEL_COUNT :]
        self.assertEqual(concat[0], "b a")
        self.assertEqual(concat[1], "a")  # panel 3 is beyond count -> empty, no stray space
        self.assertEqual(concat[2:], tuple([""] * (mt.PANEL_COUNT - 2)))

    def test_frontend_only_kwargs_are_ignored(self):
        out = self.run_node(1, text="a", collapse=True, wildcards=False, collapse2=True)
        self.assertEqual(out[0], "a")

    def test_missing_texts_do_not_raise(self):
        self.assertEqual(self.run_node(1)[0], "")


class Text7ConcatTests(unittest.TestCase):
    def run_node(self, delimiter, **over):
        texts = {f"text{i}": over.get(f"text{i}", str(i)) for i in range(1, 8)}
        return mt.MagikText7Concat.execute(delimiter=delimiter, **texts)

    def test_comma(self):
        self.assertEqual(self.run_node(",")[-1], "1,2,3,4,5,6,7")

    def test_literal_backslash_n_becomes_newline(self):
        self.assertEqual(self.run_node("\\n")[-1], "1\n2\n3\n4\n5\n6\n7")

    def test_escape_inside_longer_delimiter(self):
        self.assertEqual(self.run_node(", \\n", text3="x")[-1].split("\n")[0], "1, ")
        self.assertIn("2, \nx, \n4", self.run_node(", \\n", text3="x")[-1])

    def test_tab_escape_and_empty_entries_kept(self):
        self.assertEqual(self.run_node("\\t", text2="")[-1], "1\t\t3\t4\t5\t6\t7")

    def test_individual_outputs_stripped(self):
        out = self.run_node(",", text1="a /* b */ c", text2="# gone\nkept")
        self.assertEqual(out[0], "a  c")
        self.assertEqual(out[1], "\nkept")


if __name__ == "__main__":
    unittest.main()
