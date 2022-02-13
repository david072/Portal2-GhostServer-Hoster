# TODO: Shrink this image!!

FROM ghost-server-hoster_base:latest

COPY . ./app/
WORKDIR /app

RUN \
    # Install dependencies
    # apt-get update && \
    # apt-get install -y libsfml-dev g++ make curl nginx && \
    # curl -sL https://deb.nodesource.com/setup_16.x  | bash - && \
    # apt-get -y install nodejs && \
    # Configure node js + install global dependencies
    # npm config set unsafe-perm true && \
    # npm install -g typescript node-gyp && \
    # Build the C++ addon
    node-gyp configure && \
    node-gyp build && \
    mv /app/build/Release/addon.node . && \
    npm install && \
    npm run build

EXPOSE ${PORT} ${WS_PORT}

CMD [ "npm", "start" ]
