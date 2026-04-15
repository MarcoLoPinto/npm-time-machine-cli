import { test } from "node:test";
import assert from "node:assert";
import { getCache, setCache } from "../src/cache.js";

test("cache module", async (t) => {
    // Clear cache by reimporting would require module reloading
    // For now, use unique keys for each test

    await t.test("setCache stores and getCache retrieves values", () => {
        const key = "test-key-1";
        const value = { data: "test value" };
        
        setCache(key, value);
        const retrieved = getCache(key);
        
        assert.deepStrictEqual(retrieved, value);
    });

    await t.test("getCache returns undefined for missing keys", () => {
        const key = "nonexistent-key-" + Date.now();
        const value = getCache(key);
        
        assert.strictEqual(value, undefined);
    });

    await t.test("cache can store complex objects", () => {
        const key = "complex-key";
        const value = {
            versions: { "1.0.0": {}, "2.0.0": {} },
            "dist-tags": { latest: "2.0.0" }
        };
        
        setCache(key, value);
        const retrieved = getCache(key);
        
        assert.deepStrictEqual(retrieved, value);
    });

    await t.test("overwriting cache key updates value", () => {
        const key = "update-key";
        
        setCache(key, "first value");
        assert.strictEqual(getCache(key), "first value");
        
        setCache(key, "second value");
        assert.strictEqual(getCache(key), "second value");
    });
});
