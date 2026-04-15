#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "module";
import { saveConfig, loadConfig } from "../src/config.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
const program = new Command();

program
    .name("ntm")
    .description("npm time machine")
    .version(version);

// SET
program
    .command("set")
    .argument("<date>", "Target date (YYYY-MM-DD)")
    .description("Set the target date for dependency resolution")
    .action((date) => {
        const targetDate = new Date(date);

        if (isNaN(targetDate)) {
            console.error("❌ Invalid date");
            process.exit(1);
        }

        saveConfig({ date });
        console.log(`✔ Date set to ${date}`);
    });

// INSTALL
program
    .command("install")
    .argument("[packages...]", "Packages to install")
    .option("--fallback", "Allow fallback to oldest version if none match date")
    .option("--allow-prerelease", "Include pre-release versions in version resolution")
    .description("Install dependencies using frozen time")
    .action(async (packages = [], options) => {
        try {
            const { startProxy } = await import("../src/proxy.js");
            const { runInstall } = await import("../src/installer.js");

            const { date } = loadConfig();
            const targetDate = new Date(date);

            console.log(`⏳ Installing with frozen date ${date}`);
            console.log(`⚙️  Mode: ${options.fallback ? "fallback" : "strict"}${options.allowPrerelease ? ", prerelease enabled" : ""}`);

            const proxy = await startProxy(targetDate, {
                allowFallback: options.fallback || false,
                allowPrerelease: options.allowPrerelease || false
            });

            try {
                const args = ["install"];

                if (packages.length > 0) {
                    args.push(...packages);
                }

                await runInstall(proxy.port, args);

            } finally {
                proxy.close();
            }

        } catch (err) {
            console.error(`❌ ${err.message}`);
            process.exit(1);
        }
    });

// VERIFY
program
    .command("verify")
    .argument("[date]", "Optional date override")
    .description("Verify installed dependencies against a date")
    .action(async (dateArg) => {
        try {
            const { verifyProject } = await import("../src/verify.js");

            let date;

            if (dateArg) {
                date = new Date(dateArg);
            } else {
                const config = loadConfig();
                date = new Date(config.date);
            }

            if (isNaN(date)) {
                console.error("❌ Invalid date");
                process.exit(1);
            }

            await verifyProject(date);

        } catch (err) {
            console.error(`❌ ${err.message}`);
            process.exit(1);
        }
    });

// RESET
program
    .command("reset")
    .description("Remove ntm configuration")
    .action(async () => {
        const { resetProject } = await import("../src/reset.js");
        await resetProject();
    });

program.parse();
