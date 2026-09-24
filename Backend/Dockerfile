# ----------------------------
# Build the frontend (Vite) and
# copy its dist into the backend
# so Express can serve it.
# ----------------------------

# ---- Frontend build ----
FROM node:22-alpine AS frontend-build
WORKDIR /frontend

# Install frontend deps first (better caching)
COPY Frontend/chatApp/package*.json ./
RUN npm ci

# Build the production bundle
COPY Frontend/chatApp ./
RUN npm run build

# ---- Backend runtime ----
FROM node:22-alpine
WORKDIR /app

# Install backend deps
COPY Backend/package*.json ./
RUN npm ci

# Copy backend source
COPY Backend ./

# Copy built frontend assets
COPY --from=frontend-build /frontend/dist ./Frontend/chatApp/dist

ENV NODE_ENV=production

EXPOSE 8000
CMD ["npm", "start"]
