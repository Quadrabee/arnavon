VERSION=$(shell npm run version --silent)

node_modules:
	npm install

test.unit: node_modules
	npm run test

test.integration: image
	make -C example test.example
	make -C example test.arnavon

image:
	docker build --build-arg VERSION=${VERSION} -t quadrabee/arnavon:latest .
	docker tag quadrabee/arnavon:latest quadrabee/arnavon:${VERSION}

push:
	docker push quadrabee/arnavon:${VERSION}
	docker push quadrabee/arnavon:latest

package: node_modules
	npm run package
