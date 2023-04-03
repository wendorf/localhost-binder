FROM node:18-bullseye-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      iproute2 \
      iptables \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY . .

RUN npm install
EXPOSE 80

CMD npm start
