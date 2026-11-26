import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "web", "magik_text.js"), "utf8");

function extractTopLevelFunction(name, nextMarker) {
  const start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} not found in web/magik_text.js`);
  const end = src.indexOf(nextMarker, start);
  assert.notEqual(end, -1, `end marker not found after ${name}`);
  return src.slice(start, end);
}

const code =
  extractTopLevelFunction("stripComments", "\nfunction processDynamicPrompt") +
  extractTopLevelFunction("processDynamicPrompt", "\nfunction loadCards") +
  "\nglobalThis.stripComments = stripComments;\nglobalThis.processDynamicPrompt = processDynamicPrompt;\n";

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const { stripComments, processDynamicPrompt } = sandbox;

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("ok -", name);
}

// stripComments mirrors tests/test_comment_strip.py
check("line comment removed, newline kept", () => assert.equal(stripComments("a\n# note\nb"), "a\n\nb"));
check("indented line comment keeps indent", () => assert.equal(stripComments("a\n   # note\nb"), "a\n   \nb"));
check("mid-line hash kept", () => assert.equal(stripComments("color #ff0000"), "color #ff0000"));
check("inline block comment", () => assert.equal(stripComments("a /* note */ b"), "a  b"));
check("unterminated block comment runs to end", () => assert.equal(stripComments("a /* never closed"), "a "));
check("empty", () => assert.equal(stripComments(""), ""));
check("slash is not a comment", () => assert.equal(stripComments("see https://example.com/a"), "see https://example.com/a"));

// processDynamicPrompt
check("choice block picks an option", () => assert.ok(["a", "b"].includes(processDynamicPrompt("{a|b}")), "bad choice"));
check("nested choice block", () => assert.ok(["a", "b", "c"].includes(processDynamicPrompt("{a|{b|c}}")), "bad nested choice"));
check("escaped brace is literal", () => assert.equal(processDynamicPrompt("\\{not a choice}"), "{not a choice}"));
check("trailing backslash stays a backslash", () => assert.equal(processDynamicPrompt("photo\\"), "photo\\"));
check("block comment stripped before expansion", () => assert.equal(processDynamicPrompt("a /* gone */ b"), "a  b"));
check("url is not truncated", () => {
  const out = processDynamicPrompt("see https://example.com/a {x|y}");
  assert.ok(out.startsWith("see https://example.com/a "), out);
  assert.ok(["x", "y"].includes(out.slice(-1)), out);
});
check("line-start // comment stripped, newline kept", () => {
  const out = processDynamicPrompt("a\n// gone\nb {x|y}");
  assert.ok(out.startsWith("a\n\nb "), out);
});
check("mid-line // is kept", () => assert.equal(processDynamicPrompt("see https://example.com"), "see https://example.com"));

console.log(`\n${passed} tests passed`);
