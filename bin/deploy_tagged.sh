#!/bin/bash
set -ev
VERSION=$(shell npm run version --silent)

echo "Building image with tag ${VERSION} "
docker build --build-arg VERSION=${VERSION} -t quadrabee/arnavon:${VERSION} .

echo "Pushing image to docker registry"
docker push quadrabee/arnavon:${VERSION}
