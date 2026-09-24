# ChatProject

Chat app with a Node/Express + Socket.IO backend, React/Vite frontend, and MongoDB.

## Run with Docker (Production)

This project uses a production setup where the **backend container builds the React frontend** and serves the built `dist` files via Express.

1) Copy env file:

```bash
cp Backend/.env.example Backend/.env
```

2) Start the stack:

```bash
docker compose -f docker-compose.prod.yml up --build
```

- App (served by backend): http://localhost:8000

3) Stop and remove containers (keeps the Mongo volume):

```bash
docker compose -f docker-compose.prod.yml down
```

## Environment Notes

- Compose overrides `MONGODB_URI` so the backend talks to the `mongodb` service, not `127.0.0.1`.
- Rebuild images after dependency changes:

```bash
docker compose -f docker-compose.prod.yml up --build
```
