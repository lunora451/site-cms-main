# 📖 READ ME - Mise en place du projet

## 🚀 Mise en place initiale

```bash
# 1. Installer les dépendances
npm install

# 2. Connexion Cloudflare
npx wrangler login

# 3. Nettoyage Git
# Modifier wrangler.jsonc -> set new name project

# 4. Configuration du nom
# Supprimer le remote git d'origine et republier la branche sous le nouveau nom du projet

# 5. Setup Cloudflare Workers
# Aller dans Cloudflare Workers -> Create application -> Setup new project with the git repository

# 8. Script de configuration
**Configuration & Déploiement** : `npm run deploy`
```

> 💡 **Note :** Voir la récupération des différentes variables dans la catégorie "Variables d’environnements" ci-dessous.

-----

## 🔑 Guide des variables d'environnement

### 🗄️ Cloudflare D1 (Base de données)

Récupération de l’ID + Name à mettre dans `wrangler.jsonc`.

<img width="1877" height="535" alt="image" src="https://github.com/user-attachments/assets/a46f30f3-bf32-40b0-bd20-4a06bdde79f0" />


**Mettre à jour `wrangler.jsonc` avec tes valeurs :**

```jsonc
{
  "name": "mon-projet",               // ← Nom de ton projet
  "d1_databases": [
    {
      "binding": "myDB_D1",            // ← Ne pas changer (nom de référence utilisé dans le code)
      "database_name": "ma-base-auth", // ← Nom choisi à la création (le "Name")
      "database_id": "COLLER-L-ID-ICI" // ← ID reçu de wrangler (le "UUID")
    }
  ]
}
```

**Migration des tables :**
Copier les tables contenues dans `.migrations` dans le fichier `0000_steady_doctor_doom.sql` (ou nom similaire) pour l’exécuter dans l’interface Cloudflare.

-----

### 📦 Stockage R2

1.  Créer un bucket avec un nom.
2.  Ajouter un **Custom Domain** qui servira de sous-domaine pour l'utilisation des fichiers.

<img width="1757" height="521" alt="image (1)" src="https://github.com/user-attachments/assets/f8979195-0897-4894-955d-11399a53a061" />


-----

### 🔐 Better-auth

  * **BETTER\_AUTH\_URL** : `https://domain.tld`
  * **BETTER\_AUTH\_SECRET** :
      * *Comment le générer ?* `openssl rand -base64 32` dans le terminal ou via [better-auth.com/docs/installation](https://better-auth.com/docs/installation).
      * ⚠️ **Attention :** Chaque projet doit avoir son propre secret. Ne jamais réutiliser le même secret entre projets.

-----

### 🛡️ Cloudflare Turnstile

1.  Créer dans Cloudflare : *Protect & connect \> Application security \> Turnstile*.
2.  **Important :** Ne pas oublier d'ajouter le hostname `https://domain.tld`.
3.  Récupérer la `site-key` et la `secret-key` pour les mettre dans les secrets.

-----

### 🌐 Google OAuth (Authentification client via Better-auth)

**Variables :** `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`.

#### Étapes détaillées :

**3.1 — Accéder à Google Cloud Console**
Aller sur [console.cloud.google.com](https://console.cloud.google.com) et se connecter.

**3.2 — Créer un projet**

  * En haut à gauche, cliquer sur le sélecteur de projet.
  * Cliquer sur **"Nouveau projet"**, donner un nom (ex: "Mon App Auth") et cliquer sur **"Créer"**.

**3.3 — Configurer l'écran de consentement OAuth**
⚠️ *Cette étape est obligatoire avant de pouvoir créer des identifiants.*

  * Menu latéral → **APIs & Services** → **OAuth consent screen**.
  * Sélectionner **"External"** lors de la création (sauf si compte Google Workspace).
  * Cliquer sur **"Créer un client OAuth"** dans Présentation.

<img width="1902" height="323" alt="image (3)" src="https://github.com/user-attachments/assets/a76ff7f1-ba67-48ee-9d71-38df78dce981" />


**3.4 — Créer les identifiants OAuth**

  * Menu → **APIs & Services** → **Credentials** (Identifiants).
  * Cliquer sur **"+ Créer des identifiants"** → **"ID client OAuth"**.
  * **Type d’application** : Application Web.
  * **Nom** : "Mon App Auth - Web".
  * **Origines JavaScript autorisées** :
      * `http://localhost:4321`
      * `https://ton-domaine.com`
  * **URI de redirection autorisés** :
      * `http://localhost:4321/api/auth/callback/google`
      * `https://ton-domaine.com/api/auth/callback/google`
  * Cliquer sur **"Créer"**, copier le Client ID / Client Secret et **télécharger le JSON**.

**3.5 — Publier l'application**
Tant que l'app est en mode "Test", seuls les utilisateurs ajoutés dans "Test users" peuvent se connecter.

  * OAuth consent screen → Cliquer sur **"Publier l'application"**.

<img width="687" height="202" alt="image (2)" src="https://github.com/user-attachments/assets/62c424af-acf5-4d67-b814-9df7e2d19520" />


  * **Derniers réglages :**
      * Dans **Accès aux données** \> **Ajouter ou supprimer des niveaux d'accès** : Ajouter `email`, `profile`, `openid`.
      * Remplir l’onglet **Branding**.
      * 💡 *Note : Un seul compte Google peut gérer des dizaines de projets OAuth.*

-----

### 🐙 GitHub API

  * **GITHUB\_TOKEN** = `ghp_votre_token_ici`
      * *Chemin :* Settings \> Developer Settings \> Personal access tokens \> Tokens (classic).
      * *Scopes à cocher :* `repo`, `workflow`, `write:packages`, `delete:packages`.
  * **GITHUB\_OWNER** = `lunora451`
  * **GITHUB\_REPO** = `le-nom-du-repos` (ex: the-real-cms-r2)

-----

### 📧 Resend (Service Email)

**Variable :** `RESEND_API_KEY`.

1.  **Créer un compte** sur [resend.com](https://resend.com).
2.  **Configurer un domaine (Prod) :** Dashboard → Domains → Add Domain. Ajouter les enregistrements DNS fournis (MX, TXT SPF, CNAME DKIM, TXT DMARC) chez votre gestionnaire (Cloudflare, etc.).
3.  **API Key :** Dashboard → API Keys → Create API Key (Permission : Sending access).
4.  ⚠️ **Important :** L'adresse `from` dans le code (`auth.ts` ligne 28) doit correspondre au domaine vérifié (ex: `starter@lunorastart.eu`).

-----

### Turnstile CD

<img width="989" height="601" alt="image" src="https://github.com/user-attachments/assets/4adb6609-9bb4-4dcd-bc7f-bdd552c400fb" />


## ✅ Checklist pré-launch

Configurations à vérifier avant le lancement :

  * [ ] **Sitemap** : `astro.config.mjs`
  * [ ] **Fichiers SEO** : `robots.txt`
  * [ ] **Cloudflare Settings** :
      * [ ] Cache
      * [ ] Rate limiting
      * [ ] CORS
      * [ ] CSP (Content Security Policy)
