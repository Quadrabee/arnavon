consumers/node_modules:
	cd consumers && npm install

up: consumers/node_modules
	docker-compose up -d

down: consumers/node_modules
	docker-compose down

test.arnavon: up
	docker-compose stop mailer-worker
	docker-compose exec -e RESOURCE=arnavon -e LOG_LEVEL=DEBUG -T webspicy webspicy /formalspec/

test.example: up
	docker-compose exec -e RESOURCE=example -e LOG_LEVEL=DEBUG -T webspicy webspicy /formalspec/

ps:
	docker-compose ps
