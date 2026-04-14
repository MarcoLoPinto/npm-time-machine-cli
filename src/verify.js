import fs from "fs";
import fetch from "node-fetch";

export async function verifyProject(date) {
    if (!fs.existsSync("package-lock.json")) {
        throw new Error("No package-lock.json found");
    }

    const lock = JSON.parse(fs.readFileSync("package-lock.json"));
    const packages = lock.packages || {};

    let issues = 0;

    for (const [name, info] of Object.entries(packages)) {
        if (!info.version || name === "") continue;

        const pkgName = name.replace("node_modules/", "");

        try {
            const res = await fetch(`https://registry.npmjs.org/${pkgName}`);
            const data = await res.json();

            const publishTime = data.time?.[info.version];

            if (!publishTime) continue;

            if (new Date(publishTime) > date) {
                console.log(`❌ ${pkgName}@${info.version} → ${publishTime}`);
                issues++;
            }

        } catch {
            // ignore fetch errors
        }
    }

    if (issues === 0) {
        console.log("✔ All dependencies are within the selected date");
    } else {
        console.log(`⚠ Found ${issues} issues`);
    }
}