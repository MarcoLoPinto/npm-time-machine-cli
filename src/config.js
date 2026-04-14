import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".npm-time-machine");
const file = path.join(dir, "config.json");

export function saveConfig(config) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

export function loadConfig() {
    if (!fs.existsSync(file)) {
        throw new Error("No ntm config found. Run 'ntm set <date>' first.");
    }

    return JSON.parse(fs.readFileSync(file));
}