// Creates the ADMIN_PASSWORD_HASH value for your admin login.
//
//   npm run hash-password
//
// The password is typed at a hidden prompt (it is never echoed, never written
// to disk, and never appears in your shell history). Only the salted scrypt
// hash is printed — put THAT in your .env / Vercel environment variables.
import readline from "node:readline";
import { hashPassword } from "../src/lib/auth.js";

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    // Mute echo so the password is not shown while typing.
    rl._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });

// Piped input (e.g. CI) is also supported: `echo "..." | npm run hash-password`
const readPiped = async () => {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, "");
};

const password = process.stdin.isTTY ? await ask("New admin password: ") : await readPiped();

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

console.log("\nAdd this line to .env locally and to Vercel → Settings → Environment Variables:\n");
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
