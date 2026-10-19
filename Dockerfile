# ---------- Devcontainer Stage ---------- #
FROM node:24-slim AS devcontainer

WORKDIR /home/node/apps

RUN echo '#!/bin/sh' > /home/node/start-dev.sh && \
    echo 'echo "\n🚀 Your devcontainer is ready..."' >> /home/node/start-dev.sh && \
    echo 'echo "\n🔥 Execute \"docker compose exec -it app bash\" in another terminal to access the container"' >> /home/node/start-dev.sh && \
    echo 'tail -f /dev/null' >> /home/node/start-dev.sh

RUN chmod +x /home/node/start-dev.sh

USER node

CMD [ "sh", "/home/node/start-dev.sh" ]