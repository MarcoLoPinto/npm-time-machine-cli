import fs from "fs";
import fetch from "node-fetch";
import semver from "semver";

export function extractPackageName(packagePath) {
    if (!packagePath || packagePath === "") {
        return null;
    }

    const marker = "node_modules/";
    const markerIndex = packagePath.lastIndexOf(marker);

    if (markerIndex === -1) {
        return packagePath;
    }

    return packagePath.slice(markerIndex + marker.length) || null;
}

function collectFromPackageEntries(packages) {
    const collected = [];

    for (const [packagePath, info] of Object.entries(packages)) {
        if (!info?.version || !semver.valid(info.version)) continue;

        const packageName = extractPackageName(packagePath);
        if (!packageName) continue;

        collected.push({ name: packageName, version: info.version });
    }

    return collected;
}

function collectFromDependencyTree(dependencies, collected = []) {
    if (!dependencies) {
        return collected;
    }

    for (const [name, info] of Object.entries(dependencies)) {
        if (info?.version && semver.valid(info.version)) {
            collected.push({ name, version: info.version });
        }

        collectFromDependencyTree(info?.dependencies, collected);
    }

    return collected;
}

export function collectLockfilePackages(lock) {
    if (lock.packages && typeof lock.packages === "object") {
        return collectFromPackageEntries(lock.packages);
    }

    if (lock.dependencies && typeof lock.dependencies === "object") {
        return collectFromDependencyTree(lock.dependencies);
    }

    return [];
}

export async function verifyProject(date) {
    if (!fs.existsSync("package-lock.json")) {
        throw new Error("No package-lock.json found");
    }

    const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf-8"));
    const packages = collectLockfilePackages(lock);

    let issues = 0;
    const metadataCache = new Map();
    const lookupFailures = [];
    const seen = new Set();

    for (const pkg of packages) {
        const key = `${pkg.name}@${pkg.version}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let data = metadataCache.get(pkg.name);

        try {
            if (!data) {
                const res = await fetch(`https://registry.npmjs.org/${pkg.name}`);
                if (!res.ok) {
                    throw new Error(`Registry responded with ${res.status}`);
                }

                data = await res.json();
                metadataCache.set(pkg.name, data);
            }

            const publishTime = data.time?.[pkg.version];

            if (!publishTime) {
                lookupFailures.push(`${pkg.name}@${pkg.version}`);
                continue;
            }

            if (new Date(publishTime) > date) {
                console.log(`❌ ${pkg.name}@${pkg.version} → ${publishTime}`);
                issues++;
            }

        } catch (error) {
            lookupFailures.push(`${pkg.name}@${pkg.version} (${error.message})`);
        }
    }

    if (lookupFailures.length > 0) {
        const preview = lookupFailures.slice(0, 5).join(", ");
        throw new Error(
            `Failed to verify ${lookupFailures.length} package(s): ${preview}`
        );
    }

    if (issues === 0) {
        console.log("✔ All dependencies are within the selected date");
    } else {
        console.log(`⚠ Found ${issues} issues`);
    }
}
