import { spawn } from "child_process";

export function runInstall(port, args = ["install"]) {
    return new Promise((resolve, reject) => {
        const child = spawn(
            "npm",
            [...args, "--registry", `http://localhost:${port}`],
            { stdio: "inherit" }
        );

        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error("npm install failed"));
        });
    });
}