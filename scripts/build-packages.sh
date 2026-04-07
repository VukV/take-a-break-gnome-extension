#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/src"
BUILD_DIR="$ROOT_DIR/build"
DIST_DIR="$ROOT_DIR/dist"

require_command() {
    local command_name="$1"

    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Missing required command: $command_name" >&2
        exit 1
    fi
}

copy_shared_assets() {
    local stage_dir="$1"

    cp "$ROOT_DIR/stylesheet.css" "$stage_dir/stylesheet.css"
    cp "$ROOT_DIR/icons/timer-symbolic.svg" "$stage_dir/timer-symbolic.svg"
}

pack_target() {
    local target_name="$1"
    local target_source_dir="$SOURCE_DIR/$target_name"
    local target_stage_dir="$BUILD_DIR/$target_name"
    local target_out_dir="$DIST_DIR/$target_name"

    if [[ ! -d "$target_source_dir" ]]; then
        echo "Missing source directory: $target_source_dir" >&2
        exit 1
    fi

    rm -rf "$target_stage_dir" "$target_out_dir"
    mkdir -p "$target_stage_dir" "$target_out_dir"

    cp "$target_source_dir/extension.js" "$target_stage_dir/extension.js"
    cp "$target_source_dir/metadata.json" "$target_stage_dir/metadata.json"
    copy_shared_assets "$target_stage_dir"

    (
        cd "$target_stage_dir"
        gnome-extensions pack . --force --out-dir "$target_out_dir" --quiet --extra-source=timer-symbolic.svg
    )

    local package_path
    package_path="$(find "$target_out_dir" -maxdepth 1 -name '*.zip' -print -quit)"

    if [[ -z "$package_path" ]]; then
        echo "No package produced for $target_name" >&2
        exit 1
    fi

    echo "$target_name package: $package_path"
}

require_command gnome-extensions

target="${1:-modern}"

case "$target" in
    modern)
        pack_target modern
        ;;
    legacy)
        pack_target legacy
        ;;
    *)
        echo "Usage: $0 [modern|legacy]" >&2
        exit 1
        ;;
esac

if [[ "${KEEP_BUILD:-0}" != "1" ]]; then
    rm -rf "$BUILD_DIR"
fi
