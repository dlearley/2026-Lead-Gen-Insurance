#!/bin/bash

# Exit on error
set -e

# Configuration
OPENAPI_SPEC="http://localhost:3000/openapi.json"
OUTPUT_DIR="packages/sdks"
LANGUAGES=("typescript-axios" "python" "go")

# Create output directory
mkdir -p $OUTPUT_DIR

# Generate SDK for each language
for LANG in "${LANGUAGES[@]}"; do
  echo "Generating SDK for $LANG..."
  npx @openapitools/openapi-generator-cli generate \
    -i $OPENAPI_SPEC \
    -g $LANG \
    -o "$OUTPUT_DIR/$LANG" \
    --skip-validate-spec
done

echo "SDK generation complete!"
