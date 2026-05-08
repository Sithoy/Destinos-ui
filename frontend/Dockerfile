FROM node:22-slim

WORKDIR /app

COPY frontend/package*.json /app/frontend/
RUN npm --prefix frontend ci

COPY frontend /app/frontend
COPY package*.json /app/

EXPOSE 5173

CMD ["npm", "--prefix", "frontend", "run", "dev", "--", "--host", "0.0.0.0"]
