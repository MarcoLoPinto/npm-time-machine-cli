import express from "express";
import fetch from "node-fetch";
import { getCache, setCache } from "./cache.js";
import { filterVersionsByDate, updateDistTags } from "./version-filter.js";
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
            const filterResult = filterVersionsByDate(data, targetDate, {
                allowFallback,
                allowPrerelease
            });

            if (filterResult === null) {
                console.error(
                    `❌ No versions available before ${targetDate.toISOString()} for ${req.url}`
                );
                return res
                    .status(404)
                    .send("No valid versions before selected date");
            }

            if (filterResult.fallback) {
                console.warn(`⚠ No versions before date for ${req.url}`);
                console.warn(`⚠ Fallback to oldest version: ${filterResult.fallbackVersion}`);
            }

            // Update data with filtered versions
            data.versions = filterResult.versions;

            // Update dist-tags
            updateDistTags(data, filterResult);

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
    console.log(`⚙️  Mode: ${allowFallback ? "fallback enabled" : "strict"}${allowPrerelease ? ", prerelease enabled" : ""}`);

    return {
        port,
        close: () => server.close()
    };
}