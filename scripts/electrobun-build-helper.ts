import { readdirSync, renameSync, existsSync, mkdirSync, cpSync, rmSync } from "fs";
import { join, extname, dirname } from "path";
import packageJson from "../package.json";

/**
 * This script renames Electrobun artifacts and organizes the release folder
 * to match the pattern used in the Electron builder setup.
 */

const productName = packageJson.name;
const version = packageJson.version;

function getLocalTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}_${hours}_${minutes}`;
}

const timestamp = process.env.BUILD_TIMESTAMP || getLocalTimestamp();
const releaseRoot = join(process.cwd(), "release", "electrobun");
const targetFolder = join(releaseRoot, `${version}_${timestamp}`);

// Sources (Electrobun defaults)
const buildFolder = join(process.cwd(), "build");
const artifactsFolder = join(process.cwd(), "artifacts");

// Create target directory
if (!existsSync(targetFolder)) {
  mkdirSync(targetFolder, { recursive: true });
}

console.log(`Organizing Electrobun release in ${targetFolder}...`);

// 1. Copy uncompressed "unpacked" bundles from 'build' directory
// This mimics electron-builder's unpacked output
if (existsSync(buildFolder)) {
  const platforms = readdirSync(buildFolder);
  platforms.forEach((platform) => {
    // Avoid copying hidden folders or staging dirs
    if (platform.startsWith(".") || platform.includes("staging")) return;
    
    const platformPath = join(buildFolder, platform);
    const destUnpacked = join(targetFolder, "unpacked", platform);
    
    const parentDir = dirname(destUnpacked);
    if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
    }
    
    console.log(`Copying unpacked bundle for ${platform}...`);
    try {
        // Use recursive copy, don't dereference to preserve symlinks (critical for Linux libraries)
        cpSync(platformPath, destUnpacked, { recursive: true, dereference: false });
    } catch (err) {
        console.error(`Failed to copy ${platform}:`, err);
    }
  });
}

// 2. Process and Rename final artifacts from 'artifacts' directory
if (existsSync(artifactsFolder)) {
  const files = readdirSync(artifactsFolder);
  files.forEach((file) => {
    // Electrobun artifact pattern: channel-os-arch-filename.ext
    // e.g., stable-linux-x64-installer
    const parts = file.split("-");
    if (parts.length < 3) return;

    const os = parts[1];  // macos, win, linux
    const arch = parts[2]; // arm64, x64
    const ext = extname(file);
    
    let newName: string;
    if (file.includes("update.json")) {
      newName = `${productName}_${version}_${timestamp}_${os}_${arch}_update.json`;
    } else {
      // For installers/binaries, keep the extension if it exists
      newName = `${productName}_${version}_${timestamp}_${os}_${arch}${ext}`;
    }
    
    const srcPath = join(artifactsFolder, file);
    const destPath = join(targetFolder, newName);
    
    console.log(`Moving artifact: ${file} -> ${newName}`);
    try {
        cpSync(srcPath, destPath, { dereference: true });
    } catch (err) {
        console.error(`Failed to move artifact ${file}:`, err);
    }
  });
}

console.log("Release organization complete!");
