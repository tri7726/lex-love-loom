#!/usr/bin/env bash
# Regenerate supabase/clean_schema/UNIFIED_SCHEMA.sql by concatenating
# all migrations in supabase/migrations in chronological order.
#
# Usage:
#   bash scripts/regenerate-unified-schema.sh
#
# The output file is for REFERENCE / fresh installs only.
# Supabase tracks migrations by filename in supabase/migrations — do NOT
# delete or rename those files, or the next deploy will replay from scratch
# (the baseline migration drops the public schema and will wipe data).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
OUT_DIR="$ROOT_DIR/supabase/clean_schema"
OUT_FILE="$OUT_DIR/UNIFIED_SCHEMA.sql"

mkdir -p "$OUT_DIR"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

{
  echo "-- ============================================================"
  echo "-- UNIFIED SCHEMA (auto-generated)"
  echo "-- Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "-- Source: supabase/migrations/*.sql (chronological)"
  echo "--"
  echo "-- DO NOT EDIT BY HAND. Re-run scripts/regenerate-unified-schema.sh"
  echo "-- This file is a snapshot for reference / fresh installs only."
  echo "-- Supabase deploys run from supabase/migrations, not from here."
  echo "-- ============================================================"
  echo ""
} > "$TMP_FILE"

count=0
# Sort by filename (timestamp prefix ensures chronological order).
while IFS= read -r -d '' file; do
  rel="${file#$ROOT_DIR/}"
  {
    echo ""
    echo "-- ------------------------------------------------------------"
    echo "-- >>> $rel"
    echo "-- ------------------------------------------------------------"
    cat "$file"
    echo ""
  } >> "$TMP_FILE"
  count=$((count + 1))
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)

if [ "$count" -eq 0 ]; then
  echo "⚠️  No migration files found in $MIGRATIONS_DIR" >&2
  exit 1
fi

mv "$TMP_FILE" "$OUT_FILE"
trap - EXIT

bytes=$(wc -c < "$OUT_FILE" | tr -d ' ')
lines=$(wc -l < "$OUT_FILE" | tr -d ' ')
echo "✅ Wrote $OUT_FILE"
echo "   Migrations merged: $count"
echo "   Size: ${bytes} bytes, ${lines} lines"
