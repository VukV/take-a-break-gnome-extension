# Take A Break - GNOME Extension

GNOME Shell extension that reminds you to take regular breaks.

## Compatibility

Because GNOME 45+ moved extensions to ESM while GNOME 42-44 still use legacy `imports.*`, this project builds two packages:

- legacy package: GNOME 42 - 44
- modern package: GNOME 45 - 49

## Features

- Break reminder toggle in the top panel menu
- Configurable interval from `5` to `90` minutes (5-minute steps)
- Recurring break notifications

## Source Layout

- `src/legacy`: GNOME 42-44 implementation (`imports.*`)
- `src/modern`: GNOME 45-49 implementation (ESM)
- `icons/` and `stylesheet.css`: shared assets
- `scripts/build-packages.sh`: builds one selected extension zip bundle

## Build

### Requirements

- `gnome-extensions`

### Command

```bash
# Default: modern package only
./scripts/build-packages.sh

# Explicit modern package
./scripts/build-packages.sh modern

# Legacy package (GNOME 42-44)
./scripts/build-packages.sh legacy

# Optional: keep temporary build/ staging directory
KEEP_BUILD=1 ./scripts/build-packages.sh legacy
```

Build output path:

- `dist/modern/take-a-break@vukv.github.com.shell-extension.zip` for `modern` or default call
- `dist/legacy/take-a-break@vukv.github.com.shell-extension.zip` for `legacy`

Install the package that matches your GNOME Shell version.
