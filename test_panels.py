import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from panels import clamp_count, concat_outputs, panel_outputs, parse_links  # noqa: E402


class ClampCountTests(unittest.TestCase):
    def test_in_range(self):
        self.assertEqual(clamp_count(3, 10), 3)

    def test_clamps(self):
        self.assertEqual(clamp_count(0, 10), 1)
        self.assertEqual(clamp_count(-5, 10), 1)
        self.assertEqual(clamp_count(99, 10), 10)

    def test_messy_values(self):
        self.assertEqual(clamp_count("4", 10), 4)
        self.assertEqual(clamp_count(2.9, 10), 2)
        self.assertEqual(clamp_count(None, 10), 1)
        self.assertEqual(clamp_count("abc", 10), 1)


class PanelOutputsTests(unittest.TestCase):
    def test_always_max_panels_long(self):
        self.assertEqual(len(panel_outputs(1, ["a"], 5)), 5)

    def test_panels_beyond_count_are_empty_even_with_text(self):
        self.assertEqual(panel_outputs(2, ["a", "b", "c"], 4), ["a", "b", "", ""])

    def test_short_text_list(self):
        self.assertEqual(panel_outputs(3, ["a"], 3), ["a", "", ""])


class ParseLinksTests(unittest.TestCase):
    def test_valid_pairs_keep_order(self):
        self.assertEqual(parse_links("[[0,1],[2,1]]", 10), [(0, 1), (2, 1)])

    def test_empty_and_malformed(self):
        self.assertEqual(parse_links("", 10), [])
        self.assertEqual(parse_links(None, 10), [])
        self.assertEqual(parse_links("not json", 10), [])
        self.assertEqual(parse_links('{"a": 1}', 10), [])

    def test_drops_self_negative_and_bad_entries(self):
        raw = '[[1,1],[-1,2],[0,"x"],[0],[0,1,2],"ab",[3,4]]'
        self.assertEqual(parse_links(raw, 10), [(3, 4)])

    def test_dedupes_regardless_of_order_first_wins(self):
        self.assertEqual(parse_links("[[0,1],[1,0],[0,1]]", 10), [(0, 1)])

    def test_cap(self):
        self.assertEqual(len(parse_links("[[0,1],[0,2],[0,3]]", 2)), 2)

    def test_numeric_strings_accepted(self):
        self.assertEqual(parse_links('[["0","1"]]', 10), [(0, 1)])


class ConcatOutputsTests(unittest.TestCase):
    TEXTS = ["a", "", "c"]

    def test_joined_with_single_space_in_drag_order(self):
        self.assertEqual(concat_outputs("[[2,0]]", self.TEXTS, 3)[0], "c a")

    def test_empty_side_has_no_stray_space(self):
        self.assertEqual(concat_outputs("[[0,1],[1,2]]", self.TEXTS, 3)[:2], ["a", "c"])

    def test_both_empty(self):
        self.assertEqual(concat_outputs("[[1,1],[1,5]]", self.TEXTS, 3)[0], "")

    def test_out_of_range_index_reads_empty(self):
        self.assertEqual(concat_outputs("[[0,9]]", self.TEXTS, 3)[0], "a")

    def test_padded_to_max_links(self):
        out = concat_outputs("[[0,2]]", self.TEXTS, 4)
        self.assertEqual(out, ["a c", "", "", ""])

    def test_no_links(self):
        self.assertEqual(concat_outputs("[]", self.TEXTS, 3), ["", "", ""])


if __name__ == "__main__":
    unittest.main()
