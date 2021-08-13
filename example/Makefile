consumers/node_modules:
	cd consumers && npm install

up: consumers/node_modules
	docker-compose up --force-recreate --build -d

down: consumers/node_modules
	docker-compose down

workers.logs:
	docker-compose logs -f workers

workers.restart:
	docker-compose restart workers

webspicy.bash:
	docker-compose exec webspicy bash

test.arnavon: up
	docker-compose stop workers
	docker-compose exec -e RESOURCE=arnavon -e LOG_LEVEL=DEBUG -T webspicy webspicy /formalspec/

test.example: up
	docker-compose exec -e RESOURCE=example -e LOG_LEVEL=DEBUG -T webspicy webspicy /formalspec/

ps:
	docker-compose ps
