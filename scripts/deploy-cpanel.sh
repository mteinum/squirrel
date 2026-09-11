#!/usr/bin/env bash
# Upload the built site over SSH; no cPanel API token or server-side Node.js needed.
set -Eeuo pipefail

fail() { printf 'Deployment error: %s\n' "$*" >&2; exit 1; }
required=(CPANEL_USERNAME CPANEL_DEPLOY_PATH CPANEL_SSH_KEY CPANEL_SSH_KNOWN_HOSTS)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || fail "Set $name in GitHub Actions secrets/variables."
done

host=${CPANEL_HOST:-backend08.cpanel.center}
port=${CPANEL_PORT:-22}
user=$CPANEL_USERNAME
destination=${CPANEL_DEPLOY_PATH%/}
build_dir=${1:-dist}

[[ "$host" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]] || fail 'CPANEL_HOST must be a hostname without a scheme or port.'
[[ "$port" =~ ^[0-9]{1,5}$ ]] && ((10#$port > 0 && 10#$port <= 65535)) || fail 'CPANEL_PORT must be a valid port number.'
((10#$port != 2083)) || fail '2083 is the HTTPS cPanel interface. Set the SSH port, usually 22.'
[[ "$user" =~ ^[A-Za-z0-9_][A-Za-z0-9_-]*$ ]] || fail 'CPANEL_USERNAME must be the SSH account username.'
[[ "$destination" =~ ^/[A-Za-z0-9_./-]+/squirrel$ ]] || fail 'CPANEL_DEPLOY_PATH must be an absolute path ending in /squirrel, without spaces or shell characters.'
[[ "$destination" != *'//'* && "$destination/" != *'/../'* && "$destination/" != *'/./'* ]] || fail 'CPANEL_DEPLOY_PATH must not contain empty, . or .. path segments.'
[[ -f "$build_dir/index.html" && -d "$build_dir/assets" && -f "$build_dir/data/census.json" && -f "$build_dir/data/park.json" ]] || fail 'Build the complete site before deploying.'
grep -q '/squirrel/assets/' "$build_dir/index.html" || fail 'Build with BASE_PATH=/squirrel/ before deploying.'
for command in ssh ssh-agent ssh-add ssh-keygen rsync; do
  command -v "$command" >/dev/null || fail "Install $command before deploying."
done

umask 077
ssh_dir=$(mktemp -d /tmp/squirrel-deploy.XXXXXXXX)
agent_started=false
cleanup() {
  if [[ "$agent_started" == true ]]; then ssh-agent -k >/dev/null 2>&1 || true; fi
  rm -rf -- "$ssh_dir"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '%s\n' "$CPANEL_SSH_KEY" | tr -d '\r' > "$ssh_dir/id"
printf '%s\n' "$CPANEL_SSH_KNOWN_HOSTS" | tr -d '\r' > "$ssh_dir/known_hosts"
lookup=$host
if ((10#$port != 22)); then lookup="[$host]:$port"; fi
ssh-keygen -F "$lookup" -f "$ssh_dir/known_hosts" >/dev/null || fail 'CPANEL_SSH_KNOWN_HOSTS has no entry for the configured SSH host and port.'

# SSH_ASKPASS supplies an optional passphrase without logging it or putting it on
# a command line. An isolated agent and temporary identity are removed on exit.
cat > "$ssh_dir/askpass" <<'ASKPASS'
#!/usr/bin/env bash
printf '%s\n' "${CPANEL_PASSWORD:-}"
ASKPASS
chmod 700 "$ssh_dir/askpass"
eval "$(ssh-agent -s)" >/dev/null
agent_started=true
export CPANEL_PASSWORD=${CPANEL_PASSWORD:-}
SSH_ASKPASS="$ssh_dir/askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=squirrel:0 \
  ssh-add "$ssh_dir/id" </dev/null >/dev/null 2>&1 || fail 'Could not load the private key. Check its OpenSSH/PEM format and CPANEL_PASSWORD.'
ssh-add -L > "$ssh_dir/id.pub"
unset CPANEL_SSH_KEY CPANEL_PASSWORD

cat > "$ssh_dir/config" <<CONFIG
Host squirrel-deploy
  HostName $host
  User $user
  Port $port
  IdentityFile $ssh_dir/id
  UserKnownHostsFile $ssh_dir/known_hosts
  GlobalKnownHostsFile /dev/null
  StrictHostKeyChecking yes
  IdentitiesOnly yes
  BatchMode yes
  ConnectTimeout 20
  ServerAliveInterval 15
  ServerAliveCountMax 4
CONFIG
export SAFARI_SSH_CONFIG="$ssh_dir/config"
cat > "$ssh_dir/transport" <<'TRANSPORT'
#!/usr/bin/env bash
exec ssh -F "$SAFARI_SSH_CONFIG" "$@"
TRANSPORT
chmod 700 "$ssh_dir/transport"

parent=${destination%/*}
# Values interpolated into remote commands are restricted to safe path characters above.
ssh -F "$ssh_dir/config" squirrel-deploy \
  "command -v rsync >/dev/null || { echo 'The hosting account needs rsync and SSH shell access.' >&2; exit 1; }
   if ! test -d '$parent'; then
     echo 'The parent document root does not exist.' >&2
     if test -d \"\$HOME/${parent#/}\"; then
       printf 'Account-relative parent resolves to: '
       (cd -- \"\$HOME/${parent#/}\" && pwd -P)
     fi
     exit 1
   fi
   mkdir -p -- '$destination'"

# Keep older hashed assets for open browser tabs. Do not delete any remote files.
rsync -rlz --delay-updates --chmod=D755,F644 --exclude=/index.html \
  --rsh="$ssh_dir/transport" "$build_dir/" "squirrel-deploy:$destination/"

# Publish index.html only after its assets have arrived. mv is atomic within this directory.
remote_index="$destination/.index-$(basename "$ssh_dir").html"
rsync -rlz --chmod=F644 --rsh="$ssh_dir/transport" \
  "$build_dir/index.html" "squirrel-deploy:$remote_index"
ssh -F "$ssh_dir/config" squirrel-deploy "mv -f -- '$remote_index' '$destination/index.html'"
printf 'Published build to https://app.teinum.no/squirrel/\n'
