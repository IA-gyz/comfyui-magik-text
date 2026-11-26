import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from panels import clamp_count, concat_outputs, panel_outputs, parse_links


class TestClampCount(unittest.TestCase):
    def test_normal(self):
        self.assertEqual(clamp_count(3, 10), 3)

    def test_bounds(self):
        self.assertEqual(clamp_count(0, 10), 1)
        self.assertEqual(clamp_count(-5, 10), 1)
        self.assertEqual(clamp_count(99, 10), 10)

    def test_messy_values(self):
        self.assertEqual(clamp_count(None, 10), 1)
        self.assertEqual(clamp_count("undefined", 10), 1)
        self.assertEqual(clamp_count("4", 10), 4)
        self.assertEqual(clamp_count(2.7, 10), 2)


class TestPanelOutputs(unittest.TestCase):
    def test_first_count_texts_then_empty(self):
        texts = ["a", "b", "c"]
        self.assertEqual(panel_outputs(2, texts, 4), ["a", "b", "", ""])

    def test_all_panels(self):
        texts = ["a", "b", "c"]
        self.assertEqual(panel_outputs(3, texts, 4), ["a", "b", "c", ""])

    def test_count_beyond_texts_pads_empty(self):
        self.assertEqual(panel_outputs(5, ["a"], 6), ["a", "", "", "", "", ""])

    def test_removed_panel_not_output(self):
        texts = ["a", "b", "c", "d"]
        self.assertEqual(panel_outputs(1, texts, 4), ["a", "", "", ""])

    def test_always_max_length(self):
        self.assertEqual(len(panel_outputs(1, [], 10)), 10)
        self.assertEqual(panel_outputs(1, [], 10), [""] * 10)

    def test_count_clamped(self):
        self.assertEqual(panel_outputs(99, ["a"], 3), ["a", "", ""])
        self.assertEqual(panel_outputs(0, ["a", "b"], 3), ["a", "", ""])


class TestParseLinks(unittest.TestCase):
    def test_valid_pair(self):
        self.assertEqual(parse_links("[[2, 0]]", 10), [(2, 0)])

    def test_empty_and_invalid(self):
        self.assertEqual(parse_links("", 10), [])
        self.assertEqual(parse_links(None, 10), [])
        self.assertEqual(parse_links("nope", 10), [])
        self.assertEqual(parse_links("undefined", 10), [])
        self.assertEqual(parse_links('{"a": 1}', 10), [])

    def test_filters_bad_entries(self):
        raw = '[[0, 0], [-1, 2], ["a", 1], [1], [0, 2], [2, 0]]'
        self.assertEqual(parse_links(raw, 10), [(0, 2)])

    def test_order_preserved_but_deduped_regardless_of_order(self):
        self.assertEqual(parse_links("[[2, 0], [0, 2]]", 10), [(2, 0)])

    def test_capped(self):
        raw = str([[i, i + 1] for i in range(10)])
        self.assertEqual(parse_links(raw, 3), [(0, 1), (1, 2), (2, 3)])


class TestConcatOutputs(unittest.TestCase):
    def test_space_join(self):
        self.assertEqual(concat_outputs("[[0, 2]]", ["a", "b", "c"], 10), ["a c"] + [""] * 9)

    def test_multiple_links(self):
        self.assertEqual(concat_outputs("[[0, 1], [2, 0]]", ["a", "b", "c"], 10), ["a b", "c a"] + [""] * 8)

    def test_out_of_range_index_is_empty(self):
        self.assertEqual(concat_outputs("[[0, 5]]", ["a"], 10), ["a"] + [""] * 9)

    def test_empty_sides_are_not_space_padded(self):
        self.assertEqual(concat_outputs("[[1, 2]]", ["a"], 10), [""] * 10)
        self.assertEqual(concat_outputs("[[0, 1]]", ["a", ""], 10), ["a"] + [""] * 9)

    def test_always_max_length(self):
        self.assertEqual(len(concat_outputs("[]", ["a"], 10)), 10)
        self.assertEqual(concat_outputs("[]", ["a"], 10), [""] * 10)
        self.assertEqual(len(concat_outputs("[[0, 1]]", ["a", "b"], 3)), 3)


if __name__ == "__main__":
    unittest.main()
