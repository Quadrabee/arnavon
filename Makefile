VERSION=$(shell npm run version --silent)

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
	docker build -t quadrabee/arnavon:latest .

push:
	docker push quadrabee/arnavon:${VERSION}
	docker push quadrabee/arnavon:latest

package: node_modules
	npm run package

push.latest: image
	docker push quadrabee/arnavon:latest

push.tag: image
	docker tag quadrabee/arnavon:latest quadrabee/arnavon:${VERSION}
	docker push quadrabee/arnavon:${VERSION}
