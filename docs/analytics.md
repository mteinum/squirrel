# Google Analytics

The standalone production entry point uses **G-FC34S4J2L2**, matching the measurement ID in `teinum.no`'s `src/components/BaseHead.astro`. It is a public GA4 measurement ID, not an API credential. No new GitHub secret, dependency or backend is required.

## Consent and scope

- The consent flow follows the existing site's opt-in approach. Neither the Google script nor a Google request is started before approval. Advertising consent remains denied.
- **Necessary only** declines analytics. **Privacy settings** in the footer lets the visitor allow or withdraw it later. The banner can also be closed while analytics stays off.
- The choice is stored under `squirrel-safari:analytics-consent:v1` for 365 days. Missing, expired, invalid and unreadable records start with analytics off. If saving fails, the choice applies for the current visit only. Changes in other tabs are applied.
- This choice is separate from `teinum.no` because the sites have different origins. The field notebook's storage is never cleared by analytics preferences.
- GA cookies use the `squirrel` prefix and the app's host and base path. Withdrawal sets Google's measurement-disable flag, updates consent to denied and removes cookies with this app's analytics prefix. Already transmitted data is not retroactively deleted.
- The explicit page-view event excludes query strings and fragments from page and referrer URLs. There are no custom events for observation selections, missions, searches or notebook contents. Google property settings such as enhanced measurement remain configured in GA itself.
- Google signals and ad-personalization signals are disabled in the client configuration. A blocked Google script leaves the app usable.

`mountSquirrelSafari()` does not install analytics. `src/main.ts` mounts it separately for production builds, so an embedding site can own its analytics and consent implementation. Its cleanup disables measurement, removes its script element and UI, and aborts its listeners. An already executed third-party script cannot be fully unloaded; the Google disable flag prevents further measurement for this property.

## Verification

`npm run dev` does not mount analytics. The browser test fixture explicitly mounts it with Google requests stubbed, testing consent, expiry, withdrawal, storage failures, cookie scope and cleanup without sending test visits to the live property.

```sh
npm test
BASE_PATH=/squirrel/ npm run build
# With the dev server running:
npm run test:browser -- tests/browser/analytics.spec.ts
```

Production previews also include the consent UI. Do not approve analytics while running manual local checks unless you intend to send a test visit; automated checks intercept Google requests.

After deployment, approve analytics on the live site and check the existing property's **Realtime** report for the `app.teinum.no` visit. Report ingestion and property settings require access to Google Analytics and have not been verified by the local tests.

References: [Google consent mode](https://developers.google.com/tag-platform/security/guides/consent), [GA4 configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [page-view measurement](https://developers.google.com/analytics/devguides/collection/ga4/views).
