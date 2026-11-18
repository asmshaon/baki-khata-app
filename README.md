# Baki Khata (mobile)

A simple shop ledger for small shops: record **baki** (credit given) and **joma** (payment received) for each customer. It has big buttons, customer photos, a number keypad, and Bangla or English text.

- `apps/mobile`: Expo (React Native) app
- `apps/api`: Express + MySQL API
- `packages/shared`: Zod schemas and types shared by both

## Run with Docker (nothing else to install)

You need Docker (Docker Desktop on macOS or Windows) and a phone with **Expo Go** on the same Wi-Fi as this computer.

```bash
cp .env.example .env      # then edit it: MYSQL_ROOT_PASSWORD, JWT_SECRET, HOST_IP
docker compose up --build --watch
```

- **MySQL** runs in a container. Data lives in the `db-data` volume and is reachable from the host on `127.0.0.1:3307`.
- **API** runs on `http://HOST_IP:4000`. Migrations run automatically on start. Photos live in the `uploads` volume.
- **Expo** runs on port 8081. Scan the QR code in the logs with Expo Go (Android) or the Camera app (iPhone).

`--watch` syncs code changes into the containers: the API restarts and the app reloads. If the QR code is hard to read in the combined logs, run `docker compose logs mobile`.

Useful commands:

```bash
docker compose run --rm api npm test     # API tests, against the test database in the db container
docker compose logs -f api               # API logs
docker compose down                      # stop everything (data is kept)
docker compose down -v                   # stop and DELETE the database and photos
```

If the phone shows "no internet connection" (ইন্টারনেট সংযোগ নেই):

- Check that `HOST_IP` in `.env` is this computer's current LAN IP.
- Make sure the firewall allows ports 4000 and 8081. On Ubuntu: `sudo ufw allow 4000/tcp && sudo ufw allow 8081/tcp`.

## Run without Docker

You need Node 24 and a local MySQL. Copy `apps/api/.env.example` to `apps/api/.env` and fill it in, then:

```bash
npm install
npm run db:migrate -w @baki/api
npm run api        # terminal 1
npm run mobile     # terminal 2
npm test           # API tests
npm run typecheck
```
