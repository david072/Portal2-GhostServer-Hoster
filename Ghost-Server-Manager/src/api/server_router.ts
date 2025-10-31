import { logger } from "../util/logger";
import express, { Request } from "express";
import { authMiddleware } from "../util/middleware";
import * as db from "./container_db_manager";
import axios, { Method } from "axios";
import * as user_db from "../auth/account_manager";
import * as docker from "./docker_helper";

const MAX_NUMBER_OF_GHOST_SERVERS = 10;

export const router = express.Router();

router.use(authMiddleware);

router.post("/create", async (req, res) => {
	await db.openDatabase();

	logger.info({ source: "createServer", message: "Route called" });

	const ports = await db.getAllColumnValues<number>("port");
	if (ports.length >= MAX_NUMBER_OF_GHOST_SERVERS) {
		logger.error({ source: "createServer", message: "Max number of concurrent ghost servers" });
		res.status(507).send("Max number of concurrent ghost servers");
		return;
	}

	const wsPorts = await db.getAllColumnValues<number>("ws_port");

	const port = randomRangeNotIn(5000, 10000, ports);
	const wsPort = randomRangeNotIn(45000, 50000, wsPorts);
	if (port === undefined || wsPort === undefined) {
		logger.error({ source: "createServer", message: "No available ports" });
		res.status(507).send("No available ports");
		return;
	}

	const containerId = await docker.createContainer(port, wsPort);

	const name = "name" in req.query ? req.query.name.toString() : "Ghost Server"
	db.createContainer(containerId, port, wsPort, req.body.user.id, name);

	res.status(201).send();
});

router.get("/list", async (req, res) => {
	await db.openDatabase();
	await db.removeContainersNotRunning();

	if (req.body.user.role === user_db.Role.Admin && "showAll" in req.query) {
		if (req.query.showAll === "1") {
			res.status(200).json(await db.getAllContainers());
			return;
		}
	}

	const containers = await db.getContainersForUser(req.body.user.id);
	res.status(200).json(containers);
});

router.get("/:id", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	res.status(200).json(container);
});

router.delete("/:id", async (req, res) => {
	await db.openDatabase();
	logger.info({ source: "delete", message: "Route called" });

	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	await db.deleteContainer(container.id);
	await docker.stopContainer(container.port, true);

	logger.info({ source: "delete", message: "Successfully stopped and deleted the container" });
	res.status(200).send();
});

router.get("/:id/listPlayers", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	const response = await sendToContainer(container, "/listPlayers", "GET");
	res.status(200).json(response.data);
});

router.get("/:id/settings", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	const response = await sendToContainer(container, "/settings", "GET");
	res.status(200).json(response.data);
});

router.put("/:id/settings", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	delete req.body.user;
	await sendToContainer(container, "/settings", "PUT", req.body);
	res.status(200).send();
});

router.post("/:id/startCountdown", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	await sendToContainer(container, "/startCountdown", "PUT");
	res.status(200).send();
});

router.post("/:id/serverMessage", async (req, res) => {
	await db.openDatabase();
	if (!("message" in req.query)) {
		res.status(400).send();
		return;
	}

	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	await sendToContainer(container, `/serverMessage?message=${req.query.message.toString()}`, "PUT");
	res.status(200).send();
});

router.put("/:id/banPlayer", async (req, res) => {
	await db.openDatabase();
	logger.info({ source: "banPlayer", message: "Route called" });

	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	const response = await sendToContainer(container, "/banPlayer", "PUT", req.body);
	if (response.status !== 200) {
		logger.error({ source: "Container: banPlayer", message: "Banning player failed!" });
		res.status(response.status).send(response.data);
		return;
	}

	logger.info({ source: "Container: banPlayer", message: "Successfully banned the player" });
	res.status(200).send();
});

router.put("/:id/disconnectPlayer", async (req, res) => {
	await db.openDatabase();
	logger.info({ source: "disconnectPlayer", message: "Route called" });

	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	const response = await sendToContainer(container, "/disconnectPlayer", "PUT", req.body);
	if (response.status !== 200) {
		logger.error({ source: "disconnectPlayer", message: "Disconnecting player failed!" });
		res.status(response.status).send(response.data);
		return;
	}

	logger.info({ source: "disconnectPlayer", message: "Successfully disconnected the player" });
	res.status(200).send();
});

function sendToContainer(container: db.Container, route: string, method: Method, data: any = undefined) {
	return axios({
		url: `http://localhost:${container.port}${route}`,
		method: method,
		headers: { "Content-Type": "application/json" },
		data: data,
	});
}

router.use(db.closeDatabase, user_db.closeDatabase);

function randomRangeNotIn(min: number, max: number, numbers: number[]): number | undefined {
	if (numbers.length >= (max - min)) return undefined;

	let number: number;
	do {
		number = Math.floor(Math.random() * (max - min) + min);
	}
	while (numbers.indexOf(number) !== -1);

	return number;
}