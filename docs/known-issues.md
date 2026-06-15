# Known Issues & Gotchas

## Function naming collisions

`index.html` has ~167 functions in a single global script scope. Before adding a new function, grep the file for the name:

```bash
grep -n "function myFunctionName" index.html
```

Duplicate `function` declarations in non-strict mode silently overwrite each other. This has caused bugs before.

## Variable name collisions

Same risk for `const`/`let` at the top level of the script block. Check before adding.

## Original manifest.json icon bug (resolved)

The original `manifest.json` had its single icon declared as `"type": "image/png"` but the base64 data was JPEG (header `/9j/4AAQ`). This mismatch caused silent install failures on strict clients. Fixed in the PWA conversion — icons are now proper PNG files in `icons/`.

## `catch {}` without binding (ES2019)

The codebase uses `catch { return null; }` without a binding variable in `loadSession()`. This is valid ES2019 but not supported by older syntax checkers (esprima < 4). Use acorn or a modern validator.

## Service worker — cache invalidation

When you deploy a change to `index.html` or `sw.js`, users on old versions will get the new SW after their next page load (because `skipWaiting` fires on install). However, if they have the app open and don't reload, they'll stay on the old version until they do. This is expected behavior.

To force cache invalidation (e.g. when icons or the manifest change), bump the version suffix in `sw.js`:
```js
const CACHE_SHELL = 'washboard-shell-v2';  // was v1
const CACHE_DATA  = 'washboard-data-v2';   // was v1
```

## Offline write limitations (phase one)

Write actions (clock-in, messages, supply requests, etc.) show a "You're offline" banner when `navigator.onLine` is false. They do NOT queue for later sync. If a user is offline and performs a write action, the action is lost — they must retry when reconnected.

`navigator.onLine` is optimistic: it returns `true` if a network interface exists, even if the internet is actually unreachable. The write functions also catch Supabase errors, so true connectivity failures will still surface an error response, but the banner won't show in that case. Phase two will implement full offline write-queuing via IndexedDB + Background Sync.

## iOS PWA limitations

iOS Safari does not support the Background Sync API or Push Notifications for PWAs. The service worker install/activate/fetch lifecycle works normally. iOS requires the user to use "Add to Home Screen" in Safari — there is no automatic install prompt on iOS.

## Supabase anon key in source

The Supabase anon key is visible in `index.html`. This is expected for a client-side app with Supabase RLS. Ensure Row Level Security policies are correctly configured in the Supabase dashboard. Do not store service role keys in the client.
