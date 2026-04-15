import { spawn } from "child_process";

export function getNpmCommand() {
    return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function runInstall(port, args = ["install"]) {
    return new Promise((resolve, reject) => {
        const command = getNpmCommand();
        const child = spawn(
            command,
            [...args, "--registry", `http://localhost:${port}`],
            { stdio: "inherit" }
        );

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error("npm install failed"));
        });
    });
}
