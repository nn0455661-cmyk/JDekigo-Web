import { spawn } from "node:child_process";
import { access, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const projectDir = process.cwd();

export function loadProjectEnv() {
    loadEnvConfig(projectDir);
}

export function getRequiredEnv(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing ${name}. Add it to .env.local or .env first.`);
    }

    return value;
}

export function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function ensureBackupDirectory() {
    const backupDirectory = path.join(projectDir, "mongo-backups");
    await mkdir(backupDirectory, { recursive: true });
    return backupDirectory;
}

export async function assertFileExists(filePath) {
    await access(filePath);
}

async function resolveMongoTool(command) {
    if (process.platform !== "win32") {
        return command;
    }

    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const installedTool = path.join(
        programFiles,
        "MongoDB",
        "Tools",
        "100",
        "bin",
        `${command}.exe`,
    );

    try {
        await access(installedTool);
        return installedTool;
    } catch {
        return command;
    }
}

export async function runMongoTool(command, args) {
    const executable = await resolveMongoTool(command);

    return new Promise((resolve, reject) => {
        const child = spawn(executable, args, {
            cwd: projectDir,
            stdio: "inherit",
            windowsHide: true,
        });

        child.once("error", (error) => {
            if (error.code === "ENOENT") {
                reject(
                    new Error(
                        `${command} was not found. Install MongoDB Database Tools and add it to PATH.`,
                    ),
                );
                return;
            }

            reject(error);
        });

        child.once("exit", (code, signal) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(
                new Error(
                    signal
                        ? `${command} was stopped by signal ${signal}.`
                        : `${command} exited with code ${code}.`,
                ),
            );
        });
    });
}

export async function finalizeBackup(partialPath, finalPath) {
    await rename(partialPath, finalPath);
}

export async function removePartialBackup(partialPath) {
    await rm(partialPath, { force: true });
}

export function fail(error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nError: ${message}`);
    process.exitCode = 1;
}
