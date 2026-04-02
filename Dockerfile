# -------- BUILD STAGE --------
FROM node:20 AS build

# Set working directory
WORKDIR /build

# Copy dependency files first for caching
COPY package.json yarn.lock ./

# Install dependencies with lockfile (faster & reproducible)
RUN yarn install --frozen-lockfile --network-timeout 100000

# Copy rest of the source code
COPY . .

# Build NestJS app
RUN yarn build


# -------- PRODUCTION STAGE --------
FROM node:20-alpine AS prod

WORKDIR /app

# Copy build artifacts and node_modules
COPY --from=build /build/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json ./

# Expose app port
EXPOSE 4000

# Start the application
CMD ["yarn", "start"]
