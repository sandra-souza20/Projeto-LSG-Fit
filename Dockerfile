# ---------- Devcontainer Stage ---------- #
FROM node:24-bookworm-slim AS devcontainer

WORKDIR /home/node/apps

# Bibliotecas de sistema exigidas pelo React Native DevTools (Electron)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libgbm1 libgtk-3-0 libxcomposite1 libxdamage1 libxrandr2 libasound2 libegl1 \
    && rm -rf /var/lib/apt/lists/*

# A sandbox SUID do Chromium nao funciona no container
ENV ELECTRON_DISABLE_SANDBOX=1

RUN echo '#!/bin/sh' > /home/node/start-dev.sh && \
    echo 'echo "\n🚀 Your devcontainer is ready..."' >> /home/node/start-dev.sh && \
    echo 'echo "\n🔥 Execute \"docker compose exec -it app bash\" in another terminal to access the container"' >> /home/node/start-dev.sh && \
    echo 'tail -f /dev/null' >> /home/node/start-dev.sh

RUN chmod +x /home/node/start-dev.sh

USER node

CMD [ "sh", "/home/node/start-dev.sh" ]