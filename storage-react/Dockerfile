# Dev / non-prod image: flexible deps, hot reloading, etc.
FROM node:24-slim

WORKDIR /app

# Reduce npm noise
ENV npm_config_audit=false \
    npm_config_fund=false

# Lower Node heap for child processes (tsc/webpack/esbuild) to fit smaller hosts
ENV NODE_OPTIONS="--max_old_space_size=1024"

# Cut extra work for CRA
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true

# Make sure /app is writable by the node user
RUN chown node:node /app

# Use non-root user
USER node

# Install dependencies (NON-PROD: use npm install to allow lock changes)
COPY --chown=node:node package*.json ./
RUN npm install --no-audit --no-fund


# Copy the rest of the source code
COPY --chown=node:node . .

# Build the React application as node user
RUN npm run build

EXPOSE 3000

# Start CRA dev server
CMD ["npm", "start"]