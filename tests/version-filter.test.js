import { test } from "node:test";
import assert from "node:assert";
import { filterVersionsByDate, updateDistTags } from "../src/version-filter.js";

test("version filtering pipeline", async (t) => {
    const targetDate = new Date("2024-01-15");

    // Mock npm registry response
    const mockData = {
        versions: {
            "1.0.0": { name: "test-pkg", version: "1.0.0" },
            "1.1.0": { name: "test-pkg", version: "1.1.0" },
            "2.0.0": { name: "test-pkg", version: "2.0.0" },
            "2.1.0-beta": { name: "test-pkg", version: "2.1.0-beta" },
        },
        time: {
            "1.0.0": "2024-01-01T00:00:00Z",
            "1.1.0": "2024-01-10T00:00:00Z",
            "2.0.0": "2024-01-20T00:00:00Z", // After target date
            "2.1.0-beta": "2024-01-14T00:00:00Z",
            created: "2024-01-01T00:00:00Z",
            modified: "2024-01-20T00:00:00Z"
        },
        "dist-tags": { latest: "2.0.0" }
    };

    await t.test("filters versions by target date (strict mode)", () => {
        const result = filterVersionsByDate(mockData, targetDate, { allowFallback: false });

        assert.ok(result, "Should return a result");
        assert.strictEqual(result.fallback, false);
        
        const versions = Object.keys(result.versions);
        assert.deepStrictEqual(versions.sort(), ["1.0.0", "1.1.0"]);
        assert.ok(!versions.includes("2.0.0"), "Should exclude versions after target date");
        assert.ok(!versions.includes("2.1.0-beta"), "Should exclude pre-release by default");
    });

    await t.test("includes pre-release when allowed", () => {
        const result = filterVersionsByDate(mockData, targetDate, { allowPrerelease: true });

        assert.ok(result, "Should return a result");
        const versions = Object.keys(result.versions);
        assert.ok(versions.includes("2.1.0-beta"), "Should include pre-release when allowed");
    });

    await t.test("fallback to oldest version when none match date", () => {
        const futureDate = new Date("2023-01-01"); // Before all versions
        const result = filterVersionsByDate(mockData, futureDate, { allowFallback: true });

        assert.ok(result, "Should return a result");
        assert.strictEqual(result.fallback, true);
        assert.strictEqual(result.fallbackVersion, "1.0.0");
        assert.ok(result.versions["1.0.0"], "Should contain oldest version");
    });

    await t.test("returns null in strict mode when no versions match", () => {
        const futureDate = new Date("2023-01-01");
        const result = filterVersionsByDate(mockData, futureDate, { allowFallback: false });

        assert.strictEqual(result, null, "Should return null when no versions match");
    });

    await t.test("updates dist-tags with latest filtered version", () => {
        const data = { ...mockData };
        const result = filterVersionsByDate(data, targetDate);
        
        updateDistTags(data, result);

        assert.strictEqual(data["dist-tags"].latest, "1.1.0", "Should update latest to 1.1.0");
    });

    await t.test("preserves dist-tags when no versions filtered", () => {
        const data = { ...mockData, "dist-tags": { latest: "custom-tag", other: "value" } };
        const result = null; // No versions match
        
        updateDistTags(data, result);

        assert.strictEqual(data["dist-tags"].other, "value", "Should preserve other tags");
    });

    await t.test("handles empty version list", () => {
        const data = { versions: {}, time: { created: "2024-01-01", modified: "2024-01-01" } };
        const result = filterVersionsByDate(data, targetDate);

        assert.strictEqual(result, null, "Should return null for empty versions");
    });

    await t.test("handles missing versions or time metadata", () => {
        const result1 = filterVersionsByDate({}, targetDate);
        const result2 = filterVersionsByDate({ versions: {} }, targetDate);

        assert.strictEqual(result1, null);
        assert.strictEqual(result2, null);
    });
});

