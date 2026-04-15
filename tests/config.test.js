import { test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { saveConfig, loadConfig } from "../src/config.js";

test("config module", async (t) => {
    const configDir = path.join(process.cwd(), ".npm-time-machine");
    const configFile = path.join(configDir, "config.json");

    // Cleanup before tests
    if (fs.existsSync(configDir)) {
        fs.rmSync(configDir, { recursive: true, force: true });
    }

    try {
        await t.test("saveConfig creates config directory and file", () => {
            saveConfig({ date: "2024-01-15" });
            
            assert.ok(fs.existsSync(configDir), "Config directory should exist");
            assert.ok(fs.existsSync(configFile), "Config file should exist");
            
            const content = JSON.parse(fs.readFileSync(configFile, "utf-8"));
            assert.strictEqual(content.date, "2024-01-15");
        });

        await t.test("loadConfig reads config file", () => {
            saveConfig({ date: "2024-06-01" });
            const config = loadConfig();
            
            assert.strictEqual(config.date, "2024-06-01");
        });

        await t.test("loadConfig throws error if config missing", () => {
            if (fs.existsSync(configDir)) {
                fs.rmSync(configDir, { recursive: true, force: true });
            }
            
            assert.throws(() => {
                loadConfig();
            }, /No ntm config found/);
        });

    } finally {
        if (fs.existsSync(configDir)) {
            fs.rmSync(configDir, { recursive: true, force: true });
        }
    }
});
