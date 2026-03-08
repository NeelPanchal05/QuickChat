const { execSync } = require("child_process");

try {
  console.log("Starting installation...");
  const output = execSync("npm install react-easy-crop --legacy-peer-deps", { stdio: "pipe", encoding: "utf8" });
  console.log("Install output:", output);
} catch (error) {
  console.error("Install failed:");
  console.error("Status:", error.status);
  console.error("Stdout:", error.stdout);
  console.error("Stderr:", error.stderr);
}
