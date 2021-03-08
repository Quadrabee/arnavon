#!/bin/bash
set -ev

echo "Building image with tag `latest`"
docker build -t quadrabee/arnavon:latest .  

echo "Pushing image to docker registry"
docker push quadrabee/arnavon:latest
