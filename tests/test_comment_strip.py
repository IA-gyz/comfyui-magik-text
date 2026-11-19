import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from comment_strip import strip_comments


class TestLineComments(unittest.TestCase):
    def test_full_line_comment_removed_but_newline_kept(self):
        self.assertEqual(strip_comments("a\n# note\nb"), "a\n\nb")

    def test_indented_line_comment(self):
        self.assertEqual(strip_comments("a\n   # note\nb"), "a\n   \nb")

    def test_hash_at_start_of_text(self):
        self.assertEqual(strip_comments("# hello"), "")

    def test_mid_line_hash_is_not_a_comment(self):
        self.assertEqual(strip_comments("color #ff0000"), "color #ff0000")

    def test_hash_after_text_on_same_line_kept(self):
        self.assertEqual(strip_comments("a # b"), "a # b")

    def test_multiple_line_comments(self):
        self.assertEqual(strip_comments("# a\nx\n# b\ny\n# c"), "\nx\n\ny\n")

    def test_comment_only_text(self):
        self.assertEqual(strip_comments("# only a comment"), "")

    def test_crlf_line_comment(self):
        self.assertEqual(strip_comments("a\r\n# note\r\nb"), "a\r\n\r\nb")

    def test_tab_indented_comment(self):
        self.assertEqual(strip_comments("\t# note\nx"), "\t\nx")


class TestBlockComments(unittest.TestCase):
    def test_inline_block_comment(self):
        self.assertEqual(strip_comments("a /* note */ b"), "a  b")

    def test_multiline_block_comment(self):
        self.assertEqual(strip_comments("a\n/* one\ntwo */\nb"), "a\n\nb")

    def test_block_comment_at_start(self):
        self.assertEqual(strip_comments("/* x */a"), "a")

    def test_block_comment_at_end(self):
        self.assertEqual(strip_comments("a/* x */"), "a")

    def test_unterminated_block_comment_runs_to_end(self):
        self.assertEqual(strip_comments("a /* never closed"), "a ")

    def test_hash_inside_block_comment(self):
        self.assertEqual(strip_comments("/* # not a line comment */a"), "a")

    def test_block_inside_line_comment(self):
        self.assertEqual(strip_comments("# /* still line comment\na"), "\na")

    def test_line_comment_inside_block(self):
        self.assertEqual(strip_comments("/*\n# x\n*/a"), "a")

    def test_stray_close_marker_is_literal(self):
        self.assertEqual(strip_comments("a */ b"), "a */ b")

    def test_slash_star_slash_edge(self):
        # "/*/" opens a block comment that is never closed
        self.assertEqual(strip_comments("a/*/b"), "a")

    def test_adjacent_block_comments(self):
        self.assertEqual(strip_comments("a/*1*//*2*/b"), "ab")


class TestPassthrough(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(strip_comments(""), "")

    def test_none_like_empty(self):
        self.assertEqual(strip_comments(None), "")

    def test_plain_text_unchanged(self):
        text = "a photo of a cat, (masterpiece:1.2), [dog|cat], <lora:x:0.8>"
        self.assertEqual(strip_comments(text), text)

    def test_slash_not_comment(self):
        self.assertEqual(strip_comments("see https://example.com/a"), "see https://example.com/a")

    def test_unicode_preserved(self):
        self.assertEqual(strip_comments("café ☕ # nope\n# yes"), "café ☕ # nope\n")

    def test_mixed(self):
        text = "line1\n# gone\nline2 /* gone */ tail\n# gone2\nline3"
        self.assertEqual(strip_comments(text), "line1\n\nline2  tail\n\nline3")


if __name__ == "__main__":
    unittest.main()
