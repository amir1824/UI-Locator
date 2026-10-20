#!/bin/sh
# Stands in for the IDE CLI during e2e runs: records the arguments the plugin
# passed so a spec can assert on them, without launching a real editor.
printf '%s\n' "$@" > "$E2E_EDITOR_LOG"
