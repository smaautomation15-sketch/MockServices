# XO Platform regression-testing mock services.
#
# Built on the Echo golden Node base (base-node.echo.Dockerfile in harness-common),
# which is shared by XO10 and XO11 and is therefore project-neutral.
#
# THE ENTRYPOINT CONTRACT IS THE EASY THING TO GET WRONG. The Echo bases end with
#   WORKDIR /data
#   USER kore          (uid/gid 1024)
#   ENTRYPOINT ["/data/scripts/start.sh"]
# The base does NOT ship that script -- each consumer image must generate it, or
# the container exits 128 immediately with no useful log. A CMD does not help: it
# is demoted to arguments of the inherited ENTRYPOINT.
#
# THIS REPO HAS THREE package.json FILES, NOT ONE. app.js:25 ensureDependencies()
# npm-installs into ./, ./auth-profiles and ./customer-validation-botkit at every
# boot unless AUTO_NPM_INSTALL=false. That is not cosmetic: `morgan` is required by
# customer-validation-botkit/lib/app/index.js, is declared only in that
# sub-package, and its node_modules is NOT committed -- so a root-only `npm ci`
# produces an image that crash-loops on MODULE_NOT_FOUND before it ever binds a
# port. All three installs happen here, at build time, so the container can run
# with AUTO_NPM_INSTALL=false and no network.
ARG BASE_RUNTIME_IMAGE=pkg.harness.io/mphrlwifs6aj_4tbslmv0w/koreai-registry-dev/echo-base-node:echo-24.21.0
FROM ${BASE_RUNTIME_IMAGE}

USER root
WORKDIR /data/app

# Manifests first so the dependency layer caches across source-only changes.
# Every package-lock.json referenced here is committed on this branch.
COPY package.json package-lock.json ./
COPY auth-profiles/package.json auth-profiles/package-lock.json ./auth-profiles/
COPY customer-validation-botkit/package.json customer-validation-botkit/package-lock.json ./customer-validation-botkit/

# Written out as three separate commands on purpose. A shell for-loop would report
# only its LAST iteration's exit status, so a failed install in an earlier
# directory would ship a broken image on a green build.
RUN npm ci --omit=dev \
 && npm ci --omit=dev --prefix auth-profiles \
 && npm ci --omit=dev --prefix customer-validation-botkit

COPY . .

# Generate the entrypoint the Echo base expects, then hand the tree to the
# unprivileged kore user. db/.local-data is written at runtime when MongoDB is
# absent, so /data/app must be writable by kore -- hence the recursive chown.
#
# The asserts are the point: each of these failures would otherwise surface only
# as a CrashLoopBackOff with no build-time signal.
RUN mkdir -p /data/scripts \
 && printf '#!/bin/sh\nset -e\nexec node /data/app/app.js\n' > /data/scripts/start.sh \
 && chmod 0755 /data/scripts/start.sh \
 && chown -R kore:kore /data/app /data/scripts \
 && test -x /data/scripts/start.sh \
 && test -f /data/app/app.js \
 && node -e "require('/data/app/node_modules/express')" \
 && node -e "require('/data/app/customer-validation-botkit/node_modules/morgan')" \
 && echo "entrypoint, express and morgan verified"

USER kore
