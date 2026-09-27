# Debian (glibc), not Alpine: the SmartSpectra native runtime needs glibc >= 2.35.
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-bookworm-slim

WORKDIR /app

# CA certificates for the SmartSpectra key check; dbus provides the machine-id the
# native runtime uses as a device identifier.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates dbus \
    && dbus-uuidgen > /var/lib/dbus/machine-id \
    && rm -rf /var/lib/apt/lists/*

# The SDK loads a per-platform native library at runtime, so it isn't bundled into
# .output. Install just it (same version as package.json) and keep only this
# machine's binary; the other platforms add ~250 MB.
# package.json is kept outside /app so this installs only the SDK, not every app dependency.
COPY package.json /tmp/app-package.json
RUN version="$(node -p "require('/tmp/app-package.json').dependencies['@smartspectra/node-sdk']")" \
    && npm install --omit=dev --no-save --no-package-lock "@smartspectra/node-sdk@${version}" \
    && keep="node-sdk-linux-$(node -p process.arch)" \
    && for d in node_modules/@smartspectra/node-sdk-*; do [ "$(basename "$d")" = "$keep" ] || rm -rf "$d"; done \
    && npm cache clean --force

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
