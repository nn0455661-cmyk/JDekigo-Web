import path from "node:path";
import {
    assertFileExists,
    fail,
    getRequiredEnv,
    loadProjectEnv,
    runMongoTool,
} from "./mongodb-tools.mjs";

async function main() {
    loadProjectEnv();

    const archiveArgument = process.argv[2];
    const shouldDrop = process.argv.includes("--drop");

    if (!archiveArgument || archiveArgument === "--drop") {
        throw new Error(
            "Provide a backup file: npm run db:restore -- mongo-backups/<file>.archive.gz",
        );
    }

    const targetUri = getRequiredEnv("MONGODB_RESTORE_URI");
    const archivePath = path.resolve(archiveArgument);
    await assertFileExists(archivePath);

    const args = [
        `--uri=${targetUri}`,
        `--archive=${archivePath}`,
        "--gzip",
        "--stopOnError",
    ];

    if (shouldDrop) {
        args.push("--drop");
    }

    console.log(`Restoring MongoDB backup: ${archivePath}`);
    console.log(
        shouldDrop
            ? "Existing collections with matching names will be replaced (--drop)."
            : "Existing collections will not be dropped.",
    );

    await runMongoTool("mongorestore", args);
    console.log("\nRestore completed.");
}

main().catch(fail);
