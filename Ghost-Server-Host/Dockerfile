# TODO: Shrink this image!!

FROM ghost-server-hoster_base:latest

COPY . ./app/
WORKDIR /app

# Build the C++ addon
RUN \
    node-gyp configure && \
    node-gyp build && \
    mv /app/build/Release/addon.node . && \
    npm install && \
    npm run build

EXPOSE ${PORT} ${WS_PORT}

CMD [ "npm", "start" ]
