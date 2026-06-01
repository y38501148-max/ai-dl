#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${DEBIAN_BUILDER_IMAGE:-muz-choice-blank-bank-debian-builder:bookworm}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker image inspect "${IMAGE_NAME}" >/dev/null 2>&1 || \
  docker build -f "${ROOT_DIR}/docker/Dockerfile.debian" -t "${IMAGE_NAME}" "${ROOT_DIR}"

docker run --rm \
  -v "${ROOT_DIR}:/work" \
  -v "muz-choice-blank-bank-node-modules:/work/node_modules" \
  -v "muz-choice-blank-bank-cargo-registry:/usr/local/cargo/registry" \
  -v "muz-choice-blank-bank-cargo-git:/usr/local/cargo/git" \
  -e CARGO_TARGET_DIR=/work/src-tauri/target-linux-arm64 \
  -e PATH=/usr/local/cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  -w /work \
  "${IMAGE_NAME}" \
  bash -c 'set -euo pipefail; npm ci; npm run tauri -- build --bundles deb'
