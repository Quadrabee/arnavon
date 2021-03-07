VERSION=0.1.10

image:
	docker build --build-arg VERSION=${VERSION} -t quadrabee/arnavon:latest .
	docker tag quadrabee/arnavon:latest quadrabee/arnavon:${VERSION}

push:
	docker push quadrabee/arnavon:${VERSION}
	docker push quadrabee/arnavon:latest
