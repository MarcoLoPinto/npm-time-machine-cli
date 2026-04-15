import semver from "semver";

/**
 * Filters package versions by a target date
 * @param {Object} packageData - NPM registry response with versions and time metadata
 * @param {Date} targetDate - Cutoff date for version filtering
 * @param {Object} options - Filter options
 * @param {boolean} options.allowFallback - If true, fallback to oldest version when none match
 * @param {boolean} options.allowPrerelease - If true, include pre-release versions
 * @returns {Object} Filtered versions object or null if no versions match
 */
export function filterVersionsByDate(packageData, targetDate, options = {}) {
    const { allowFallback = false, allowPrerelease = false } = options;
    const { versions, time } = packageData;

    if (!versions || !time) {
        return null;
    }

    const filtered = {};

    // Filter versions by publish date
    for (const [version, publishTime] of Object.entries(time)) {
        // Skip metadata entries
        if (["created", "modified"].includes(version)) continue;

        // Check if version exists and meets criteria
        if (
            new Date(publishTime) <= targetDate &&
            versions[version] &&
            (allowPrerelease || !semver.prerelease(version))
        ) {
            filtered[version] = versions[version];
        }
    }

    // Handle no versions before date
    if (Object.keys(filtered).length === 0) {
        if (allowFallback) {
            const allVersions = Object.keys(versions || {});
            const oldest = allVersions.sort(semver.compare)[0];

            if (oldest) {
                return {
                    versions: { [oldest]: versions[oldest] },
                    fallback: true,
                    fallbackVersion: oldest
                };
            }
            return null;
        }
        return null;
    }

    return { versions: filtered, fallback: false };
}

/**
 * Updates dist-tags in package metadata based on filtered versions
 * @param {Object} packageData - NPM registry response
 * @param {Object} filteredResult - Result from filterVersionsByDate
 * @returns {Object} Updated package data
 */
export function updateDistTags(packageData, filteredResult) {
    if (!filteredResult || !filteredResult.versions) {
        return packageData;
    }

    const versions = Object.keys(filteredResult.versions);
    if (versions.length > 0) {
        const latest = versions.sort(semver.rcompare)[0];
        packageData["dist-tags"] = packageData["dist-tags"] || {};
        packageData["dist-tags"].latest = latest;
    }

    return packageData;
}
