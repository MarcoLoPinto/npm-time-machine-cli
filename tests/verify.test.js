import { test } from "node:test";
import assert from "node:assert";
import { collectLockfilePackages, extractPackageName } from "../src/verify.js";

test("extractPackageName handles nested and scoped node_modules paths", async (t) => {
    await t.test("returns null for the root package entry", () => {
        assert.strictEqual(extractPackageName(""), null);
    });

    await t.test("extracts a top-level package name", () => {
        assert.strictEqual(extractPackageName("node_modules/lodash"), "lodash");
    });

    await t.test("extracts the deepest nested package name", () => {
        assert.strictEqual(
            extractPackageName("node_modules/a/node_modules/@scope/pkg"),
            "@scope/pkg"
        );
    });
});

test("collectLockfilePackages supports modern and legacy lockfile formats", async (t) => {
    await t.test("collects packages from lockfileVersion >= 2", () => {
        const lock = {
            packages: {
                "": { name: "demo" },
                "node_modules/lodash": { version: "4.17.21" },
                "node_modules/a/node_modules/@scope/pkg": { version: "1.2.3" },
                "node_modules/local-link": { version: "file:../local-link" }
            }
        };

        assert.deepStrictEqual(collectLockfilePackages(lock), [
            { name: "lodash", version: "4.17.21" },
            { name: "@scope/pkg", version: "1.2.3" }
        ]);
    });

    await t.test("collects packages from lockfileVersion 1 dependency trees", () => {
        const lock = {
            dependencies: {
                react: {
                    version: "18.2.0",
                    dependencies: {
                        "loose-envify": {
                            version: "1.4.0"
                        }
                    }
                },
                "local-package": {
                    version: "file:../local-package"
                }
            }
        };

        assert.deepStrictEqual(collectLockfilePackages(lock), [
            { name: "react", version: "18.2.0" },
            { name: "loose-envify", version: "1.4.0" }
        ]);
    });
});
