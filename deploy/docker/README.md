# Frontend in Docker: one image, deployed to every site

`webcoop/esstrapis-front:v5-vue3-<sha>` is built by `.github/workflows/master.yml` on every push to `master`, and deployed to every site on the VPS by the same workflow (pairs with `esstrapis-back:v5`).

Each site runs its own container (nginx serving the app under `/stats/`) from `/var/www/<site>/docker/docker-compose.yml`, on the port in that dir's `.env` (`EXTERNAL_PORT`). The API URL and paths come from the same `.env` at container start (`docker-entrypoint.sh` writes `config.js`), so one image serves every site.

## Deploys (`/var/www/esstrapis-front`)

A push to `master` runs the unit tests and the Vue 3 lint, pushes the image, then SSHes to the VPS and runs `deploy.sh v5-vue3-<sha>`. The SSH key is restricted to that script (`command="/var/www/esstrapis-front/deploy.sh",restrict` in `authorized_keys`), and GitHub pins the host key.

For each site in `sites.conf`, `deploy.sh`:
1. pins the site's `docker-compose.yml` to the new tag;
2. recreates the container (a second or two without answering);
3. waits until `http://127.0.0.1:<EXTERNAL_PORT>/stats/` serves the app.

The canary `demo` goes first, then the rest one by one. If a site doesn't come back, it and every site already switched in that run go back to the tag they had, and the job fails. The log is in `deploy.log`.

```bash
./deploy.sh v5-vue3-<sha>                    # every site (what CI runs)
./deploy.sh v5-vue3-<sha> demo ladili_test   # only some (e.g. a preview build from the vue-3 branch)
./deploy.sh v5-vue3-<previous sha>           # roll everything back
```

The scripts on the server are copies of `deploy/docker/`. After changing them here, copy them to `/var/www/esstrapis-front`. Pushes that only touch `deploy/`, `docs/`, `manual/` or Markdown files don't build or deploy.

Secrets in GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`. Add required reviewers to the `production` environment to approve each deploy by hand.

## Adding a site

Create its `docker/` dir with `docker-compose.yml` (image `webcoop/esstrapis-front:<current tag>`) and `.env` (`EXTERNAL_PORT`, `VUE_APP_API_URL`, `VUE_APP_RESET_PASSWORD`, `VUE_APP_PATH=/stats/`), start it once with `docker compose up -d`, point its nginx `/stats/` at the port, and add `<site> <dir>` to `sites.conf`.
