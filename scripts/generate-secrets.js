// Prints a fresh JWT signing secret and a VAPID key pair for web push.
//
//   npm run generate-secrets
//
// Copy the output into .env locally and into Vercel's environment variables.
import crypto from "node:crypto";
import webpush from "web-push";

const vapid = webpush.generateVAPIDKeys();

console.log(`JWT_SECRET=${crypto.randomBytes(48).toString("base64url")}`);
console.log(`VAPID_PUBLIC_KEY=${vapid.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapid.privateKey}`);
