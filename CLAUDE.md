# Baki Khata Mobile

A mobile version of the `../baki-khata` shop ledger: shops record **baki** (credit given) and **joma** (payment received) per customer. It is a standalone app that does **not** share a database or code with the Laravel `baki-khata`. That project is only the reference for the domain.

## Decisions (agreed with the user, do not re-ask)

- **Stack:** React Native with Expo (SDK 58, Expo Router) for `apps/mobile`. Express 5, Zod 4, Drizzle ORM and MySQL for `apps/api`. Zod schemas are shared through `packages/shared`.
- **Own database, single DB:** each shop's data is isolated by a `shop_id` column, not by a database per tenant as in the Laravel app. Every owner query must be scoped by the `shopId` from the JWT. Use `findShopCustomer()` in `routes/owner.ts`.
- **Users:** shop **owner** (full ledger) and **customer** (read-only: their own balance and history).
- **Audience is low-literacy.** UI rules:
  - **Two languages, Bangla (default) and English**, switched with `LanguageToggle` on the welcome screen and both home headers. The choice is stored in secure-store (`baki.lang`). Never hard-code UI text: add a key to both dictionaries in `apps/mobile/src/lib/i18n.tsx` and use `useI18n().t()`. Dates and counts follow the language (`num()`, `dateTime()`).
  - **Phone numbers, PINs and money amounts always use English digits** (`৳ 1,250`, `01712-345678`), in both languages and on the keypad (user request, 2026-11-18).
  - **Font: Kalpurush** (`apps/mobile/assets/fonts/Kalpurush.ttf`, OFL, user choice 2026-11-19). It is loaded with `useFonts` in `app/_layout.tsx`. React Native has no global font, so every text style must include `fontFamily` from `lib/theme.ts`. There is a single weight, so bold is synthesised.
  - Large icon buttons with short labels.
  - **Red = baki** (customer owes), **green = joma** (paid).
  - Customer **photos** (camera or gallery) so owners recognise people without reading.
  - A large custom on-screen **number keypad** for phone, PIN and amount, never the system keyboard.
  - At most one main decision per screen. Confirm with big ✓ / ✗ icons.
- **Auth:** phone (`01XXXXXXXXX`) plus a **4-digit PIN**, with no email. JWT bearer tokens (90 days) are stored in `expo-secure-store`. Auth routes are rate limited because PINs are weak.
  - Owner: registering creates the owner and one shop. There is one shop per owner for now.
  - Customer: the owner optionally sets a customer PIN. Customer login checks the phone and PIN against every shop and returns `{ sessions: [...] }`, one per matching shop. If there is more than one, the app asks which shop.
- **Money:** whole taka stored as `int`. `balance > 0` means the customer owes. Baki adds to it and joma subtracts. Recording an entry locks the customer row (`SELECT … FOR UPDATE`) inside a transaction and stores `balance_after`.
- **Errors:** the API returns `{ message, fieldErrors? }`. Code throws `HttpError(status, messageKey)` using keys from `packages/shared/src/messages.ts`, and Zod schemas use the same keys as their messages. The error handler in `app.ts` translates them using `Accept-Language` (`en` gives English, anything else Bangla); the app sends its current language. Unknown keys (default Zod messages) become `invalidValue`. Validation failures return 422 via `lib/validate.ts`.

## Layout

```
package.json            npm workspaces (apps/*, packages/*)
docker-compose.yml      db + api + mobile; apps/api/Dockerfile, apps/mobile/Dockerfile, docker/mysql/init/
packages/shared/        zod schemas + TS types (ships TS source, main=src/index.ts)
apps/api/               Express API
  src/db/schema.ts      owners, shops, customers, transactions (Drizzle mysql-core)
  src/db/client.ts      mysql2 pool + drizzle
  src/db/migrate.ts     applies ./drizzle migrations
  src/lib/              auth (jwt, bcrypt pin, requireRole), validate, http-error, serialize
  src/routes/auth.ts    POST /auth/owner/register, /auth/owner/login, /auth/customer/login
  src/routes/owner.ts   /owner/me, /summary, /customers (GET/POST, ?q=), /customers/:id (GET/PATCH),
                        /customers/:id/photo (multipart "photo"), /customers/:id/transactions (GET/POST),
                        DELETE /customers/:id/transactions/:txId (undo: latest entry only, within 24h),
                        /report?from&to (daily report; the app sends its local day as ISO instants)
  src/routes/customer.ts /customer/me, /customer/transactions
  src/app.ts            createApp() (used by server.ts and tests); serves /uploads statically
apps/api/test/          vitest + supertest against TEST_DATABASE_URL (global-setup rebuilds the DB from migrations)
apps/mobile/src/app/    Expo Router screens: index (role picker), owner-login, owner-register, customer-login,
                        owner/ (home, add-customer, report, customer/[id]/{index,entry,edit,statement}), customer/ (portal)
apps/mobile/src/lib/    api (fetch + ApiError), session (secure-store), i18n (bn/en strings + provider), format (taka, phone, dates),
                        queries (react-query), photo, reminder (তাগাদা + statement text, SMS/WhatsApp deep links),
                        promise (promise-date chips), methods (cash/bKash/Nagad/Rocket labels), theme
apps/mobile/src/components/  Keypad, NumberEntry, TextStep, BigButton, ConfirmBar, Avatar, Balance, LanguageToggle, ChipPicker
```

## Environment

- `apps/api/.env` exists locally (gitignored) and holds `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET` and `UPLOAD_DIR`. Template: `.env.example`. Never print or commit it.
- MySQL databases `baki_khata_mobile` and `baki_khata_mobile_test` are already created. They use the same local MySQL credentials as `../baki-khata`.
- Node 24 and npm. Commands run from the repo root: `npm run api`, `npm run mobile`, `npm test`, `npm run typecheck`.
- **Docker (no local Node/MySQL needed):** `docker compose up --build --watch` starts `db` (MySQL 8.4, host port 3307), `api` (runs migrations on start, port 4000) and `mobile` (Expo on 8081). Settings come from the root `.env` (gitignored, template `.env.example`): `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`, `HOST_IP`. Tests: `docker compose run --rm api npm test`. The images run `npm ci` from the lockfile, so after changing dependencies, rebuild (`--watch` does this when `package-lock.json` changes). See README.md.
- When the app runs on a phone, the API base URL must be the machine's LAN IP, not localhost.

## Status / next steps

Done (2026-11-18): install, migrations, API tests (34 passing, incl. cross-shop isolation and concurrent-entry locking), and every mobile screen listed in the original plan. `tsc`, `expo lint`, `expo-doctor` and an Android/iOS `expo export` are all clean.

- Added 2026-11-19, based on research into how Bangladeshi shops run baki:
  - তাগাদা (reminder) button: opens SMS or WhatsApp with a prefilled polite message. Nothing is sent from the server.
  - One-tap note chips on the entry confirm screen: items for baki, cash/bKash/Nagad/Rocket for joma. They are saved in `transactions.note`.
  - `customers.last_entry_at`: the home list shows "N days ago", plus a red "30+ days" badge when the customer owes money.
  - All / Owing filter on the owner home.
  - Undo of the latest entry within 24 hours.
- Added 2026-11-19 (second batch):
  - Quick amounts (৳50–1000) on the amount keypad.
  - A promise date (`customers.promised_on`) can be set when giving baki. It is cleared once the balance reaches 0 or below. The home screen shows a "due today" card, and the reminder message mentions the date.
  - The joma payment method is stored in `transactions.method`. It is a column, not note text, so the daily report can total by method.
  - Daily report screen, and a "send statement" screen that shares via WhatsApp or SMS.
  - Undo does not restore a cleared promise date.
- **Time zones:** `db/client.ts` forces every MySQL session to UTC (`timezone: 'Z'` and `SET time_zone`). Drizzle writes Dates as UTC strings, so without this, date filters and written timestamps shift by the host offset (+06 here). Don't remove it.
- Root `package.json` `overrides` pins `react`/`react-dom` to the app's React version. When upgrading the Expo SDK, update the overrides too, or two React copies get installed.
- The mobile API URL is `EXPO_PUBLIC_API_URL`, falling back to the Expo dev server's LAN host on port 4000.
- Not yet done: testing on a real device, a release build (Android release builds block cleartext HTTP, so the API needs HTTPS or a cleartext config), and deleting customers (no endpoint yet).

## Expo SDK 58 notes (verified from docs.expo.dev; see `apps/mobile/AGENTS.md`)

- Expo Router: set `"main": "expo-router/entry"`. In app.json add `"scheme"` and `"plugins": ["expo-router"]`. Routes live in `src/app/`. Stack `initialRouteName` is replaced by `export const unstable_settings = { anchor: 'index' }`.
- iOS 26 Stack headers are transparent by default. Don't use SafeAreaView to push content under the header. Use `contentInsetAdjustmentBehavior="automatic"` on scroll views or `headerTransparent: false`.
- Tabs only show screens declared in the layout. Hide one with `href: null`.
- expo-image-picker: `mediaTypes: ['images']` (the `MediaTypeOptions` enum is deprecated). Check `result.canceled`, then use `result.assets[0].uri`. Use `requestCameraPermissionsAsync()` and add the `expo-image-picker` plugin with permission strings in app.json.
- expo-secure-store: `getItemAsync`, `setItemAsync`, `deleteItemAsync`. Keys may only use `[A-Za-z0-9._-]`.
- `@expo/vector-icons` still works (`import Ionicons from '@expo/vector-icons/Ionicons'`) but is slated for deprecation.
- Monorepo: no metro.config.js needed (auto since SDK 52). Keep a single react / react-native version across workspaces. Verify that Metro transpiles the TS-source `@baki/shared` package.
