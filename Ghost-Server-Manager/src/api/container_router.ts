import { logger } from "../util/logger";
import express, { Request } from "express";
import { authMiddleware, containerAuthMiddleware } from "../util/middleware";
import { closeDatabase } from "./container_db_manager";
import axios, { Method } from "axios";

export const router = express.Router();

// Require authentication for all sub-routes => Valid account and owning the requested container
router.use(authMiddleware, containerAuthMiddleware);

router.get("/listPlayers", async (req, res) => {
	const response = await sendToContainer(req, "/listPlayers", "GET");
	res.status(200).json(response.data);
});

router.get("/settings", async (req, res) => {
	const response = await sendToContainer(req, "/settings", "GET");
	res.status(200).json(response.data);
});

router.put("/settings", async (req, res) => {
	let query = `preCommands=${req.query.preCommands || ""}&postCommands=${req.query.postCommands || ""}&duration=${req.query.duration || ""}`;
	await sendToContainer(req, `/settings?${query}`, "PUT");
	res.status(200).send();
});

router.put("/startCountdown", async (req, res) => {
	await sendToContainer(req, "/startCountdown", "PUT");
	res.status(200).send();
});

router.put("/serverMessage", async (req, res) => {
	if (!("message" in req.query)) {
		res.status(400).send();
		return;
	}

	await sendToContainer(req, `/serverMessage?message=${req.query.message.toString()}`, "PUT");
	res.status(200).send();
});

router.put("/banPlayer", async (req, res) => {
	logger.info({ source: "Container: banPlayer", message: "Route called" });

	let idToBan: number | undefined;
	let nameToBan: string | undefined;

	if ("player_id" in req.query) {
		idToBan = +req.query.player_id.toString();
		logger.info({ source: "Container: banPlayer", message: `Banning player by id (${idToBan})` });
	}
	else if ("name" in req.query) {
		nameToBan = req.query.name.toString();
		logger.info({ source: "Container: banPlayer", message: `Banning player by name (${nameToBan})` });
	}
	else {
		logger.info({ source: "Container: banPlayer", message: "No player information in query. Exiting..." });
		res.status(400).send();
		return;
	}

	const response = await sendToContainer(req, `/banPlayer?${idToBan !== undefined ? `id=${idToBan}` : `name=${nameToBan}`}`, "PUT");
	if (response.status !== 200) {
		logger.error({ source: "Container: banPlayer", message: "Banning player failed!" });
		res.status(response.status).send(response.data);
		return;
	}

	logger.info({ source: "Container: banPlayer", message: "Successfully banned the player" });
	res.status(200).send();
});

router.put("/disconnectPlayer", async (req, res) => {
	logger.info({ source: "Container: disconnectPlayer", message: "Route called" });

	let idToDisconnect: number | undefined;
	let nameToDisconnect: string | undefined;

	if ("player_id" in req.query) {
		idToDisconnect = +req.query.player_id.toString();
		logger.info({ source: "Container: disconnectPlayer", message: `Disconnecting player by id (${idToDisconnect})` });
	}
	else if ("name" in req.query) {
		nameToDisconnect = req.query.name.toString();
		logger.info({ source: "Container: disconnectPlayer", message: `Disconnecting player by name (${nameToDisconnect})` });
	}
	else {
		logger.info({ source: "Container: disconnectPlayer", message: "No player information in query. Exiting..." });
		res.status(400).send();
		return;
	}

	const response = await sendToContainer(req, `/disconnectPlayer?${idToDisconnect !== undefined ? `id=${idToDisconnect}` : `name=${nameToDisconnect}`}`, "PUT");
	if (response.status !== 200) {
		logger.error({ source: "Container: disconnectPlayer", message: "Disconnecting player failed!" });
		res.status(response.status).send(response.data);
		return;
	}

	logger.info({ source: "Container: disconnectPlayer", message: "Successfully disconnected the player" });
	res.status(200).send();
});

function sendToContainer(req: Request, route: string, method: Method) {
	return axios({
		url: `http://localhost:${req.body.container.port}${route}`,
		method: method
	});
}

router.use(closeDatabase);
