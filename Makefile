# Specify which docker tag is to be used
DOCKER_TAG := $(or ${DOCKER_TAG},${DOCKER_TAG},latest)

node_modules:
	npm install

lint: node_modules
	npm run lint

test.unit: node_modules
	npm run test

test.integration: image
	make -C example test.example
	make -C example test.arnavon

image:
	docker build -t quadrabee/arnavon:${DOCKER_TAG} .

image.push:
	docker push quadrabee/arnavon:${DOCKER_TAG}

package: node_modules
	npm run package
