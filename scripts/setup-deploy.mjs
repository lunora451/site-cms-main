import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { execSync } from "node:child_process";

// Name of the folder we're running in (e.g. the cloned repo dir) — used as a default.
const cwdName = path.basename(process.cwd());

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(question, defaultValue) {
  const answer = await rl.question(`${question} [${defaultValue}]: `);
  return answer.trim() || defaultValue;
}

// Cloudflare Worker names: lowercase, alphanumeric and hyphens only.
function sanitizeWorkerName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Validate the GitHub token + repo write access. Returns { ok, reason }.
// The CMS writes ALL content to GitHub through this token. An invalid token =
// a silently broken admin ("Bad credentials" on save). Catch it here, not in prod.
async function validateGithub(token, owner, repo) {
  if (!token) return { ok: false, reason: "token vide" };
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "setup-deploy-script",
  };
  try {
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (userRes.status === 401)
      return { ok: false, reason: "Bad credentials (token invalide ou expiré)" };
    if (!userRes.ok)
      return { ok: false, reason: `GitHub /user a renvoyé ${userRes.status}` };

    // Classic PATs expose scopes in this header; fine-grained PATs leave it empty.
    const scopes = (userRes.headers.get("x-oauth-scopes") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (scopes.length && !scopes.includes("repo")) {
      return {
        ok: false,
        reason: `scope "repo" manquant (scopes actuels : ${scopes.join(", ") || "aucun"})`,
      };
    }

    const repoRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers },
    );
    if (repoRes.status === 404)
      return {
        ok: false,
        reason: `repo ${owner}/${repo} introuvable ou token sans accès`,
      };
    if (!repoRes.ok)
      return { ok: false, reason: `GitHub /repos a renvoyé ${repoRes.status}` };
    const repoData = await repoRes.json();
    if (!repoData.permissions?.push) {
      return {
        ok: false,
        reason: `pas de droit d'écriture (push) sur ${owner}/${repo}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `erreur réseau : ${err.message}` };
  }
}

async function setup() {
  console.log("🚀 Starting Cloudflare Workers Setup...\n");

  // Load existing .env values if they exist
  const existingEnv = {};
  if (fs.existsSync(".env")) {
    const lines = fs.readFileSync(".env", "utf-8").split("\n");
    for (const line of lines) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        existingEnv[key.trim()] = valueParts.join("=").trim();
      }
    }
  }

  const envVars = {
    // Admin CMS
    ADMIN_USERNAME: await ask(
      "Enter ADMIN_USERNAME",
      existingEnv.ADMIN_USERNAME || "admin",
    ),
    ADMIN_PASSWORD: await ask(
      "Enter ADMIN_PASSWORD",
      existingEnv.ADMIN_PASSWORD || "admin123",
    ),
    ADMIN_SECRET: await ask(
      "Enter ADMIN_SECRET (Long random string)",
      existingEnv.ADMIN_SECRET || "generate-a-long-secret-key-here",
    ),

    // GitHub Integration
    GITHUB_TOKEN: await ask(
      "Enter GITHUB_TOKEN (Personal Access Token)",
      existingEnv.GITHUB_TOKEN || "",
    ),
    GITHUB_OWNER: await ask(
      "Enter GITHUB_OWNER",
      existingEnv.GITHUB_OWNER || "lunora451",
    ),
    GITHUB_REPO: await ask(
      "Enter GITHUB_REPO",
      existingEnv.GITHUB_REPO || cwdName,
    ),

    // R2 Storage
    R2_PUBLIC_URL: await ask(
      "Enter R2_PUBLIC_URL",
      existingEnv.R2_PUBLIC_URL || "https://media.yourdomain.com",
    ),

    // Contact Form & Turnstile
    PUBLIC_TURNSTILE_SITE_KEY: await ask(
      "Enter PUBLIC_TURNSTILE_SITE_KEY",
      existingEnv.PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
    ),
    TURNSTILE_SECRET_KEY: await ask(
      "Enter TURNSTILE_SECRET_KEY",
      existingEnv.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA",
    ),
    RESEND_API_KEY: await ask(
      "Enter RESEND_API_KEY",
      existingEnv.RESEND_API_KEY || "re_xxxxxxxxx",
    ),
    CONTACT_TO_EMAIL: await ask(
      "Enter CONTACT_TO_EMAIL",
      existingEnv.CONTACT_TO_EMAIL || "isabelletroussicot80@gmail.com",
    ),
    CONTACT_FROM_EMAIL: await ask(
      "Enter CONTACT_FROM_EMAIL",
      existingEnv.CONTACT_FROM_EMAIL || "starter@lunorastart.eu",
    ),
  };

  // Validate GitHub access NOW — refuse to finish with a dead token, the #1 cause of a
  // "deploy worked but admin is broken" (save → Bad credentials, content never commits).
  console.log("\n🔎 Vérification du token GitHub...");
  while (true) {
    const check = await validateGithub(
      envVars.GITHUB_TOKEN,
      envVars.GITHUB_OWNER,
      envVars.GITHUB_REPO,
    );
    if (check.ok) {
      console.log("✅ Token GitHub valide (accès en écriture confirmé).");
      break;
    }
    console.error(`❌ Token GitHub invalide : ${check.reason}`);
    console.error(
      "   Le CMS ne pourra pas enregistrer le contenu sans token valide.",
    );
    console.error(
      "   Crée un PAT avec le scope 'repo' : https://github.com/settings/tokens",
    );
    const retry = await ask(
      "Re-saisir le GITHUB_TOKEN (ou tape 'skip' pour continuer quand même)",
      "",
    );
    if (retry.toLowerCase() === "skip") {
      console.warn(
        "⚠️  Tu continues avec un token non valide : l'admin restera cassé tant qu'il n'est pas corrigé.",
      );
      break;
    }
    if (retry) envVars.GITHUB_TOKEN = retry;
  }

  // Worker name — MUST match the Cloudflare project you connected to this GitHub repo.
  // Defaults to the repo name so each clone targets its own Worker (not the template's).
  const workerName = sanitizeWorkerName(
    await ask(
      "Enter WORKER_NAME (must match your Cloudflare project name)",
      sanitizeWorkerName(envVars.GITHUB_REPO || "site-simple-contact"),
    ),
  );

  // 1. Update .env for local development
  console.log("\n📝 Updating .env file for local development...");
  let envContent = "";
  for (const [key, value] of Object.entries(envVars)) {
    envContent += `${key}=${value}\n`;
  }
  fs.writeFileSync(".env", envContent);

  // 2. Set the Worker name in wrangler.jsonc so deploy + secrets target the right Worker.
  // This is the fix for the deploy landing in the template Worker (site-simple-contact-cms):
  // the name was hardcoded, so wrangler always pushed there.
  console.log(`\n🔧 Setting Worker name in wrangler.jsonc to "${workerName}"...`);
  const wranglerPath = "wrangler.jsonc";
  if (fs.existsSync(wranglerPath)) {
    let wranglerContent = fs.readFileSync(wranglerPath, "utf-8");
    const nameRegex = /("name"\s*:\s*")[^"]*(")/;
    if (nameRegex.test(wranglerContent)) {
      wranglerContent = wranglerContent.replace(nameRegex, `$1${workerName}$2`);
      fs.writeFileSync(wranglerPath, wranglerContent);
    } else {
      console.error(
        '⚠️  Could not find a "name" field in wrangler.jsonc. Set it manually to ' +
          `"${workerName}".`,
      );
    }
  } else {
    console.error("⚠️  wrangler.jsonc not found. Skipping name update.");
  }

  // 3. Build and Deploy (creates the Worker if it does not exist yet, under the right name).
  console.log("\n🏗️  Building and Deploying to Cloudflare ...");
  console.log(`Target Worker: ${workerName}`);
  console.log(
    "Note: You might be prompted to log in if you haven't already (npx wrangler login).\n",
  );
  let deployed = false;
  try {
    console.log("Running: npm run build");
    execSync("npm run build", { stdio: "inherit" });

    console.log("\nRunning: npx wrangler deploy");
    execSync("npx wrangler deploy", { stdio: "inherit" });
    deployed = true;
  } catch (error) {
    console.error("\n❌ Deployment failed. Check the errors above.");
  }

  // 4. Set runtime Secrets on the Worker (the Worker now exists from the deploy above).
  // Secrets persist across later deploys (keep_vars: true), including Cloudflare git builds.
  console.log(`\n🔐 Setting secrets on Cloudflare Worker "${workerName}"...`);
  for (const [key, value] of Object.entries(envVars)) {
    try {
      console.log(`Setting ${key}...`);
      // Pipe the value into wrangler secret put. --name makes the target explicit.
      execSync(`npx wrangler secret put ${key} --name ${workerName}`, {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
      });
    } catch (error) {
      console.error(
        `⚠️  Failed to set secret ${key}. Make sure you are logged in (npx wrangler login) ` +
          `and that the Worker "${workerName}" exists.`,
      );
    }
  }

  if (deployed) {
    console.log("\n✅ Deployment successful!");
    console.log(
      `Your site is live on the "${workerName}" Worker (workers.dev subdomain or your custom route).`,
    );
  }

  // 5. Reminder: the git-connected Cloudflare build reads wrangler.jsonc from the repo,
  // so the new name must be committed or future pushes will redeploy to the old Worker.
  console.log(
    "\n📌 IMPORTANT: commit & push the updated wrangler.jsonc so your Cloudflare\n" +
      "   git-connected build deploys to this same Worker on the next push:\n" +
      "   git add wrangler.jsonc && git commit -m \"chore: set worker name\" && git push",
  );

  rl.close();
}

setup().catch((err) => {
  console.error("An error occurred:", err);
  rl.close();
});
