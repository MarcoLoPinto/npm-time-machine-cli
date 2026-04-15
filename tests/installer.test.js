import { test } from "node:test";
import assert from "node:assert";
import { getNpmCommand } from "../src/installer.js";

test("getNpmCommand returns a valid npm executable for the current platform", () => {
    const expected = process.platform === "win32" ? "npm.cmd" : "npm";
    assert.strictEqual(getNpmCommand(), expected);
});
