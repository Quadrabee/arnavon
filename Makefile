VERSION=$(shell npm run version --silent)

image:
	echo -${VERSION}
	docker build --build-arg VERSION=${VERSION} -t quadrabee/arnavon:latest .
	docker tag quadrabee/arnavon:latest quadrabee/arnavon:${VERSION}

push:
	docker push quadrabee/arnavon:${VERSION}
	docker push quadrabee/arnavon:latest

package:
	npm run package
