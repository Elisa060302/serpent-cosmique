#!/bin/sh
# Fabrique les fichiers d'une version à partir de dist/ : archive du site, SBOM CycloneDX et SHA256SUMS.
# Usage : sh scripts/release-files.sh <version> <dossier de sortie>   (après « npm ci » et « npm run build »)
set -eu

version="${1:-}"
output="${2:-}"
case "$version" in
  '' | *[!0-9.]*) echo "Version invalide : indiquez MAJEUR.MINEUR.CORRECTIF." >&2; exit 1 ;;
esac
[ -n "$output" ] || { echo "Dossier de sortie manquant." >&2; exit 1; }

root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$output"
output=$(cd "$output" && pwd)
archive="serpent-cosmique-${version}.zip"
sbom="serpent-cosmique-${version}.cdx.json"

(cd "$root/dist" && zip -r -X -q "$output/$archive" .)
(cd "$root" && npm sbom --sbom-format cyclonedx > "$output/$sbom")
(cd "$output" && sha256sum "$archive" "$sbom" > SHA256SUMS && sha256sum --check SHA256SUMS)
