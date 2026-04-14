import express from "express";
import fetch from "node-fetch";
import semver from "semver";
import { getCache, setCache } from "./cache.js";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

export async function startProxy(targetDate, options = {}) {
    const { allowFallback = false, allowPrerelease = false } = options;

    const app = express();

    app.get("/*", async (req, res) => {
        try {
            const url = `https://registry.npmjs.org${req.url}`;

            // Check if this is a tarball request
            if (req.url.endsWith(".tgz")) {
                const response = await fetch(url);

                if (!response.ok) {
                    return res.status(response.status).send("Upstream error");
                }

                res.status(response.status);

                const excludedHeaders = ["content-encoding", "transfer-encoding"];

                response.headers.forEach((value, key) => {
                    if (!excludedHeaders.includes(key.toLowerCase())) {
                        res.setHeader(key, value);
                    }
                });

                try {
                    await streamPipeline(response.body, res);
                } catch (err) {
                    console.error("Stream error:", err.message);
                }

                return;
            }

            // Metadata request (JSON)
            const cached = getCache(req.url);
            if (cached) {
                return res.json(cached);
            }

            const response = await fetch(url);

            if (!response.ok) {
                return res.status(response.status).send("Upstream error");
            }

            const data = await response.json();

            // filter versions
            if (data.versions && data.time) {
                const filtered = {};

                for (const [version, time] of Object.entries(data.time)) {
                    if (["created", "modified"].includes(version)) continue;

                    if (
                        new Date(time) <= targetDate &&
                        data.versions[version] &&
                        (allowPrerelease || !semver.prerelease(version)) // Exclude pre-releases unless explicitly allowed
                    ) {
                        filtered[version] = data.versions[version];
                    }
                }

                // No versions before date
                if (Object.keys(filtered).length === 0) {
                    if (allowFallback) {
                        console.warn(`⚠ No versions before date for ${req.url}`);

                        const allVersions = Object.keys(data.versions || {});
                        const oldest = allVersions.sort(semver.compare)[0];

                        if (oldest) {
                            filtered[oldest] = data.versions[oldest];
                            console.warn(`⚠ Fallback to oldest version: ${oldest}`);
                        } else {
                            return res.status(404).send("No versions available");
                        }

                    } else {
                        console.error(
                            `❌ No versions available before ${targetDate.toISOString()} for ${req.url}`
                        );
                        return res
                            .status(404)
                            .send("No valid versions before selected date");
                    }
                }

                data.versions = filtered;

                // update dist-tags
                const versions = Object.keys(filtered);

                if (versions.length > 0) {
                    const latest = versions.sort(semver.rcompare)[0];

                    data["dist-tags"] = data["dist-tags"] || {};
                    data["dist-tags"].latest = latest;
                }
            }

            // set cache
            setCache(req.url, data);

            res.json(data);

        } catch (err) {
            console.error(`❌ Proxy error for ${req.url}:`, err.message);

            return res.status(502).send("Bad gateway");
        }
    });

    const server = app.listen(0);
    const port = server.address().port;

    console.log(`⏳ NTM proxy running on http://localhost:${port}`);
    console.log(`⚙️ Mode: ${allowFallback ? "fallback enabled" : "strict"}${allowPrerelease ? ", prerelease enabled" : ""}`);

    return {
        port,
        close: () => server.close()
    };
}