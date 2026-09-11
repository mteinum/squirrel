# Deploy to app.teinum.no/squirrel

The existing [teinum.no workflow](https://github.com/mteinum/teinum.no/blob/main/.github/workflows/build.yml) deploys with rsync over SSH. Squirrel Safari uses the same connection-variable and key-secret names, supports encrypted keys, and publishes only its own app directory.

Keep the hosting account's connection details in GitHub Actions configuration rather than in source files or public documentation. The examples below use placeholders. The SSH port defaults to **22**. Port **2083** is the HTTPS cPanel interface and is not used by this deployment. Confirm with the host if this account has a different SSH port. See [cPanel service ports](https://docs.cpanel.net/knowledge-base/general-systems-administration/how-to-configure-your-firewall-for-cpanel-services/).

## 1. Deployment destination

The path displayed by cPanel may be relative to the account's home directory. Configure the absolute SSH path for the app's final upload folder. For example, replacing `ACCOUNT` with the actual account directory:

```text
CPANEL_DEPLOY_PATH=/home/ACCOUNT/app.teinum.no/squirrel
```

The workflow uses this absolute path exactly and does not append another `squirrel` folder. The script requires the parent directory to exist and creates the final `squirrel` directory if needed. It rejects destinations without the `/squirrel` suffix and paths containing traversal or shell characters. If an absolute parent is missing but its account-relative equivalent exists, it reports the resolved path without uploading files.

**The teinum.no workflow runs `rsync --delete` into `public_html/`.** If the app's document root is inside that directory, the next teinum.no deployment can remove the app. Use a separate document root outside `public_html/`, or first add a directory-specific exclusion to the teinum.no workflow. That repository has not been modified here.

The domain must point to this hosting account and have a working HTTPS certificate. Apache should serve the directory's `index.html`; `/squirrel` normally redirects to `/squirrel/`. No application server, cPanel API token, database or rewrite fallback is required. Share links use query parameters on the same page.

## 2. Add repository variables

Open [squirrel-safari → Settings → Secrets and variables → Actions](https://github.com/mteinum/squirrel-safari/settings/secrets/actions). Under **Variables**, configure:

| Name                 | Value                                                   |
| -------------------- | ------------------------------------------------------- |
| `CPANEL_USERNAME`    | The SSH account username                                |
| `CPANEL_DEPLOY_PATH` | The verified absolute upload path ending in `/squirrel` |
| `CPANEL_HOST`        | The SSH hostname supplied by the hosting provider       |
| `CPANEL_PORT`        | Optional; defaults to `22`                              |

`CPANEL_HOST`, `CPANEL_USERNAME` and `CPANEL_DEPLOY_PATH` have been configured for this repository. Repository variables and secrets from `mteinum/teinum.no` are **not automatically available** to `mteinum/squirrel-safari`. The deployment job is associated with GitHub's `production` environment; you can alternatively keep the same values in that environment. Creating an environment is not necessary when using repository secrets.

## 3. Add secrets

On the same page, under **Secrets**, add:

| Name                     | Contents                                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CPANEL_SSH_KEY`         | Complete private key from cPanel, including its BEGIN/END lines and newlines. Use OpenSSH or PEM format, not PuTTY `.ppk`.                                                                                            |
| `CPANEL_PASSWORD`        | The private key's **passphrase**, matching the existing teinum.no workflow's convention. This is not your cPanel login password unless you deliberately used the same value. Omit this secret for an unencrypted key. |
| `CPANEL_SSH_KNOWN_HOSTS` | Verified SSH server host-key entry/entries for the configured hostname and port. See below.                                                                                                                           |

In **cPanel → SSH Access → Manage SSH Keys**, make sure the matching **public** key is **Authorized**. The private key authenticates GitHub Actions; the public key stays authorized on the hosting account. SSH shell access and `rsync` must be available for the configured account, as required by the existing deployment. [cPanel's SSH documentation](https://docs.cpanel.net/cpanel/security/ssh-access/) explains key authorization.

GitHub cannot reveal existing secret values. Download the private key from cPanel again or use your existing original copy, then add it to this repository. Do not commit keys or paste them into issue/PR text.

### Server host-key verification

The server host key is different from your account's public/private authentication key pair. Obtain a verified `known_hosts` entry from your existing trusted SSH setup or the hosting provider.

You can collect candidate entries locally with:

```sh
ssh-keyscan -p 22 cpanel.example.com > /tmp/squirrel-cpanel-known-hosts
ssh-keygen -lf /tmp/squirrel-cpanel-known-hosts
```

Replace `cpanel.example.com` with the configured hostname. Compare those fingerprints with the hosting provider or another trusted channel before putting the file's contents in `CPANEL_SSH_KNOWN_HOSTS`. The keyscan command alone does not authenticate the server. If available, cPanel's authenticated Terminal can show server fingerprints with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`; some jailed accounts cannot read that location. Use the provider in that case. A nonstandard SSH port requires entries for `[HOSTNAME]:PORT`.

The workflow requires strict host-key matching. It does not reuse the existing site's `StrictHostKeyChecking=no` setting.

## 4. Push and deploy

Configure the values above **before pushing the new workflow**. Then a push to `main` builds, tests and deploys automatically. You can also select **Actions → Build → Run workflow**, with branch **main**, to deploy manually. Pull requests run the build and tests only and cannot reach the deployment job.

The workflow:

1. Runs `npm ci`, all focused tests and a production build with `BASE_PATH=/squirrel/`.
2. Uploads that build as `squirrel-safari-dist` and passes it to the deployment job.
3. Loads the key through a temporary SSH agent, supplying its optional passphrase without printing it.
4. Uploads assets and census snapshots with rsync; no remote files are deleted.
5. Uploads `index.html` under a temporary name, then renames it into place after assets arrive.
6. Downloads `https://app.teinum.no/squirrel/` with a cache-busting parameter and verifies that its HTML matches the uploaded build.
7. Removes the temporary key, SSH configuration and agent on exit.

Main-branch runs queue instead of cancelling an active deployment. Older hashed assets remain available for open browser tabs; they can be pruned manually later if disk usage warrants it. Existing files elsewhere in the hosting account are untouched. A deployment can overwrite files with the same names within the configured app directory.

## Local verification and troubleshooting

### HTTP compression

`public/.htaccess` enables Apache gzip compression for HTML, CSS, JavaScript, JSON, plain text and SVG through `mod_deflate`. It applies only to the app directory. PNG and JPEG files are not included. The build artifact includes hidden files so this configuration reaches cPanel with each deployment. Apache negotiates compression using `Accept-Encoding` and sets `Vary: Accept-Encoding`.

Verify the live response after changing hosting settings:

```sh
curl -sS -H 'Accept-Encoding: gzip' -D - -o /dev/null https://app.teinum.no/squirrel/data/census.json
```

Look for `Content-Encoding: gzip`. If an nginx proxy serves static files directly or removes compression, its configuration may also need updating by the hosting provider. See [Apache compression](https://httpd.apache.org/docs/2.4/mod/mod_deflate.html) and [cPanel compression settings](https://docs.cpanel.net/cpanel/software/optimize-website/).

### Build and deployment checks

```sh
npm test
BASE_PATH=/squirrel/ npm run build
BASE_PATH=/squirrel/ npm run preview
```

Open `http://127.0.0.1:4173/squirrel/`. To run the browser smoke test against that preview:

```sh
TEST_BASE_URL=http://127.0.0.1:4173/squirrel/ npm run test:browser -- --grep 'production assets'
```

If deployment fails:

- **Missing setting:** add the exact secret or variable named in the error.
- **Could not load private key:** check multiline key formatting and its passphrase.
- **Permission denied (publickey):** verify username, authorized public key and shell access.
- **Host-key verification failed:** verify the host/port and provider fingerprint before replacing the known-hosts secret.
- **SSH connection timed out:** confirm the SSH port and that the host accepts connections from GitHub-hosted runners.
- **Parent document root missing:** use the actual absolute path from cPanel Domains.
- **Public HTML mismatch:** check domain routing, the deployment directory, and any CDN/HTML rewriting or caching. The files may have uploaded successfully even though the public URL is serving another directory or cached page.

The transfer tests use temporary generated keys and stubbed remote commands. They verify passphrase handling, path checks, upload ordering and cleanup without contacting the production host. A real deployment still requires the configured credentials and confirmed document root.
