FROM ubuntu:bionic 

RUN \
    # Install dependencies
    apt-get update && \
    apt-get install -y libsfml-dev g++ make curl nginx && \
    curl -sL https://deb.nodesource.com/setup_16.x  | bash - && \
    apt-get -y install nodejs && \
    # Configure node js + install global dependencies
    # npm config set unsafe-perm true && \
    npm install -g typescript node-gyp