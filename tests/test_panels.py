import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from panels import clamp_count, panel_outputs


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


if __name__ == "__main__":
    unittest.main()
