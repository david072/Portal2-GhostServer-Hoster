import { logger } from "../util/logger";
import express, { Request } from "express";
import { authMiddleware, containerAuthMiddleware } from "../util/middleware";
import * as db from "./container_db_manager";
import axios, { Method } from "axios";
import * as user_db from "../auth/account_manager";

export const router = express.Router();

// Require authentication for all sub-routes => Valid account and owning the requested container
router.use(authMiddleware);

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

	let idToBan: number | undefined;
	let nameToBan: string | undefined;

	if ("player_id" in req.query) {
		idToBan = +req.query.player_id.toString();
		logger.info({ source: "banPlayer", message: `Banning player by id (${idToBan})` });
	}
	else if ("name" in req.query) {
		nameToBan = req.query.name.toString();
		logger.info({ source: "banPlayer", message: `Banning player by name (${nameToBan})` });
	}
	else {
		logger.info({ source: "banPlayer", message: "No player information in query. Exiting..." });
		res.status(400).send();
		return;
	}

	const response = await sendToContainer(container, `/banPlayer?${idToBan !== undefined ? `id=${idToBan}` : `name=${nameToBan}`}`, "PUT");
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

	let idToDisconnect: number | undefined;
	let nameToDisconnect: string | undefined;

	if ("player_id" in req.query) {
		idToDisconnect = +req.query.player_id.toString();
		logger.info({ source: "disconnectPlayer", message: `Disconnecting player by id (${idToDisconnect})` });
	}
	else if ("name" in req.query) {
		nameToDisconnect = req.query.name.toString();
		logger.info({ source: "disconnectPlayer", message: `Disconnecting player by name (${nameToDisconnect})` });
	}
	else {
		logger.info({ source: "disconnectPlayer", message: "No player information in query. Exiting..." });
		res.status(400).send();
		return;
	}

	const response = await sendToContainer(container, `/disconnectPlayer?${idToDisconnect !== undefined ? `id=${idToDisconnect}` : `name=${nameToDisconnect}`}`, "PUT");
	if (response.status !== 200) {
		logger.error({ source: "Container: disconnectPlayer", message: "Disconnecting player failed!" });
		res.status(response.status).send(response.data);
		return;
	}

	logger.info({ source: "Container: disconnectPlayer", message: "Successfully disconnected the player" });
	res.status(200).send();
});

router.put("/:id/acceptingPlayers", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	let value: string | undefined = undefined;
	if ("value" in req.query) value = req.query.value.toString();

	await sendToContainer(container, `/acceptingPlayers?value=${value}`, "PUT");
	res.status(200).send();
});

router.get("/:id/acceptingPlayers", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	const response = await sendToContainer(container, "/acceptingPlayers", "GET");
	res.status(200).json(response.data);
});

router.put("/:id/acceptingSpectators", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	let value: string | undefined = undefined;
	if ("value" in req.query) value = req.query.value.toString();

	await sendToContainer(container, `/acceptingSpectators?value=${value}`, "PUT");
	res.status(200).send();
});

router.get("/:id/acceptingSpectators", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	const response = await sendToContainer(container, "/acceptingSpectators", "GET");
	res.status(200).json(response.data);
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