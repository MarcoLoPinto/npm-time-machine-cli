import fs from "fs";
import path from "path";

export async function resetProject() {
    const dir = path.join(process.cwd(), ".npm-time-machine");

    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log("✔ Removed ntm configuration");
    } else {
        console.log("Nothing to reset");
    }
}