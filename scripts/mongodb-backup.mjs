import path from "node:path";
import {
    ensureBackupDirectory,
    fail,
    finalizeBackup,
    getRequiredEnv,
    loadProjectEnv,
    removePartialBackup,
    runMongoTool,
    timestamp,
} from "./mongodb-tools.mjs";

async function main() {
    loadProjectEnv();

    const sourceUri = getRequiredEnv("MONGODB_URI");
    const backupDirectory = await ensureBackupDirectory();
    const fileName = `mongodb-${timestamp()}.archive.gz`;
    const finalPath = path.join(backupDirectory, fileName);
    const partialPath = `${finalPath}.partial`;

    console.log(`Creating MongoDB backup: ${finalPath}`);

    try {
        await runMongoTool("mongodump", [
            `--uri=${sourceUri}`,
            `--archive=${partialPath}`,
            "--gzip",
        ]);
        await finalizeBackup(partialPath, finalPath);
    } catch (error) {
        await removePartialBackup(partialPath);
        throw error;
    }

    console.log(`\nBackup completed: ${finalPath}`);
}

main().catch(fail);
