import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from comment_strip import strip_comments  # noqa: E402


class StripCommentsTests(unittest.TestCase):
    def test_empty_and_none(self):
        self.assertEqual(strip_comments(""), "")
        self.assertEqual(strip_comments(None), "")

    def test_plain_text_untouched(self):
        self.assertEqual(strip_comments("a beautiful landscape"), "a beautiful landscape")

    def test_line_comment_removed_keeps_newlines(self):
        text = "a beautiful landscape\n# this line is ignored\ndramatic lighting"
        self.assertEqual(strip_comments(text), "a beautiful landscape\n\ndramatic lighting")

    def test_indented_line_comment(self):
        self.assertEqual(strip_comments("one\n   \t# note\ntwo"), "one\n   \t\ntwo")

    def test_hash_mid_line_is_kept(self):
        self.assertEqual(strip_comments("color #ff00ff, red"), "color #ff00ff, red")

    def test_comment_on_first_line(self):
        self.assertEqual(strip_comments("# only a comment"), "")

    def test_block_comment_inline(self):
        text = "a beautiful landscape, /* alternate idea: at night */ dramatic lighting"
        self.assertEqual(strip_comments(text), "a beautiful landscape,  dramatic lighting")

    def test_block_comment_multiline(self):
        self.assertEqual(strip_comments("a/* x\ny\nz */b"), "ab")

    def test_unterminated_block_comment_eats_rest(self):
        self.assertEqual(strip_comments("keep /* drop\neverything"), "keep ")

    def test_hash_inside_block_comment(self):
        self.assertEqual(strip_comments("a /* # b */ c"), "a  c")

    def test_block_opener_inside_line_comment_is_not_a_block(self):
        # A '#' line comment runs to the end of the line: a '/*' in it must not
        # open a block comment that swallows the following lines.
        self.assertEqual(strip_comments("# note /*\nreal text\n*/"), "\nreal text\n*/")

    def test_carriage_return_line_endings(self):
        self.assertEqual(strip_comments("a\r\n# c\r\nb"), "a\r\n\r\nb")

    def test_hash_after_block_comment_counts_as_line_start(self):
        # Documented quirk (README item 17): whitespace/comments before '#' keep it a line comment.
        self.assertEqual(strip_comments("/* x */ # y"), " ")


if __name__ == "__main__":
    unittest.main()
