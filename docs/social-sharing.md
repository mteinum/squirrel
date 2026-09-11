# Social sharing artwork

The page includes static [Open Graph metadata](https://ogp.me/) for Facebook and large-image card metadata for other sharing services. Crawlers can read it without JavaScript or WebGL.

The artwork is bundled at `public/social/squirrel-safari-v1.png` (1735 × 906 PNG, approximately 1.91:1). Vite copies it into `dist/social/`; the existing deployment uploads it before publishing `index.html`. It is not loaded by the application interface.

The absolute image URL and `og:url` in `index.html` target **https://app.teinum.no/squirrel/**. If the public domain or deployment subdirectory changes, update these metadata URLs as well as `BASE_PATH`. Relative asset URLs remain in use for the application itself.

This is an app-level preview: every observation uses the same title and artwork. Sharing services that honour `og:url` may link to the app homepage rather than retain a sighting query parameter. Direct copied sighting links continue to restore the selected observation. Per-observation crawler metadata would require separate generated pages or request-time HTML.

After deploying, check the public URL with [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) and request **Scrape Again** if Facebook still shows cached metadata. Actual Facebook rendering has not been verified locally. A replacement image should use a new versioned filename, with the HTML metadata updated to match, to avoid reusing an old cached image URL.

## Artwork provenance

Created with the built-in imagegen tool on 2026-09-11. This is illustrative promotional artwork, not a census photograph, a surveyed map or an exact screenshot of the app. The original generated PNG is copied unchanged into the repository; its actual dimensions are declared in the metadata.

### Generation prompt

```text
Use case: ads-marketing
Asset type: Facebook / Open Graph link preview for an existing web app called Squirrel Safari.
Create one polished finished wide landscape share card, approximately 1.91:1 aspect ratio, ideally 1536 x 800 pixels. All lettering and main subject comfortably inside a generous safe margin.
Scene: a charming miniature autumn Central Park diorama, an elongated park with a handful of low-poly polygonal trees in golden ochre, burnt orange, and forest green, a winding cream path and small muted sage pond. Illustrative scenery, no survey labels or fake data.
Subject: one delightful stylized low-poly gray squirrel in the foreground, upright with little ears, dark bead eyes, cream muzzle and belly, paws holding one acorn, large recognizable curved bushy tail. Expressive and friendly, sophisticated handmade toy proportions. It should dominate the right half of the composition.
Style: elegant 3D game key art, visibly faceted matte geometry, soft warm autumn light and restrained contact shadows, clean pale cream background. Small park diorama extends behind the squirrel; avoid visual clutter.
Composition: editorial title on the left, character and park on the right, enough negative space to make the title legible at a small social thumbnail size.
Text (verbatim): large forest-green warm bold serif title on two lines "Squirrel" and "Safari." with the period burnt orange. Below, smaller spaced uppercase text "A CENTRAL PARK FIELD TRIP". Small readable supporting line "Explore the 2018 Squirrel Census".
Palette: forest green #234b3a, cream #f8f5eb, burnt orange #c76c3c, muted sage and golden leaves.
Constraints: final finished image, no browser frame, no UI buttons, no watermark, no Facebook branding, no map pins or invented census numbers. Keep all text accurate and crisp. Full-bleed cream background, no outer border.
```
