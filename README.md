# ChatProject

Chat app with a Node/Express + Socket.IO backend, React/Vite frontend, and MongoDB.

## Run with Docker (Production)

This project uses a production setup where the **backend container builds the React frontend** and serves the built `dist` files via Express.

### 1) Configure environment (Atlas)

1) Copy env file:

```bash
cp Backend/.env.example Backend/.env
```

2) Update `Backend/.env` → set `MONGODB_URI` to your **MongoDB Atlas** connection string.

### 2) Start the stack

```bash
docker compose -f docker-compose.prod.yml up --build
```

- App (served by backend): http://localhost:8000

### 3) Stop

```bash
docker compose -f docker-compose.prod.yml down
```
