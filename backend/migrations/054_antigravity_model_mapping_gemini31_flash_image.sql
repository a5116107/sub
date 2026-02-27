-- Update Antigravity model_mapping: route legacy image model ids to gemini-3.1-flash-image.
--
-- Background:
-- Upstream image generation model moved from gemini-3-pro-image to gemini-3.1-flash-image.
--
-- Strategy:
-- Keep existing operator custom mappings, only touch the image-related keys.
-- This migration is intentionally incremental (does NOT overwrite the whole model_mapping object).

UPDATE accounts
SET credentials = jsonb_set(
    jsonb_set(
        jsonb_set(
            jsonb_set(credentials, '{model_mapping,gemini-3.1-flash-image}', '"gemini-3.1-flash-image"'::jsonb),
            '{model_mapping,gemini-3.1-flash-image-preview}', '"gemini-3.1-flash-image"'::jsonb
        ),
        '{model_mapping,gemini-3-pro-image}', '"gemini-3.1-flash-image"'::jsonb
    ),
    '{model_mapping,gemini-3-pro-image-preview}', '"gemini-3.1-flash-image"'::jsonb
)
WHERE platform = 'antigravity'
  AND deleted_at IS NULL
  AND credentials->'model_mapping' IS NOT NULL
  AND jsonb_typeof(credentials->'model_mapping') = 'object';

