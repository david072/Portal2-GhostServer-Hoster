import { logger } from "../util/logger";
import express, { Request } from "express";
import { authMiddleware, containerAuthMiddleware } from "../util/middleware";
import { closeDatabase, Container } from "./container_db_manager";
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
	let query = "";
	if (req.query.hasOwnProperty("preCommands")) query += `${query.length === 0 ? "?" : "&"}preCommands=${req.query.preCommands}`;
	if (req.query.hasOwnProperty("postCommands")) query += `${query.length === 0 ? "?" : "&"}postCommands=${req.query.postCommands}`;
	if (req.query.hasOwnProperty("duration")) query += `${query.length === 0 ? "?" : "&"}duration=${req.query.duration}`;

	await sendToContainer(req, `/settings${query}`, "PUT");
	res.status(200).send();
});

router.put("/startCountdown", async (req, res) => {
	await sendToContainer(req, "/startCountdown", "PUT");
	res.status(200).send();
});

router.put("/banPlayer", async (req, res) => {
	logger.info({ label: "Container: banPlayer", message: "Route called" });

	let idToBan: number | undefined;
	let nameToBan: string | undefined;

	if (req.query.hasOwnProperty("player_id")) {
		idToBan = +req.query.player_id.toString();
		logger.info({ label: "Container: banPlayer", message: `Banning player by id (${idToBan})` });
	}
	else if (req.query.hasOwnProperty("name")) {
		nameToBan = req.query.name.toString();
		logger.info({ label: "Container: banPlayer", message: `Banning player by name (${nameToBan})` });
	}
	else {
		logger.info({ label: "Container: banPlayer", message: "No player information in query. Exiting..." });
		res.status(400).send();
		return;
	}

	const response = await sendToContainer(req, `/banPlayer?${idToBan !== undefined ? `id=${idToBan}` : `name=${nameToBan}`}`, "PUT");
	if (response.status !== 200) {
		logger.error({ label: "Container: banPlayer", message: "Banning player failed!" });
		res.status(response.status).send(response.data);
		return;
	}

	logger.info({ label: "Container: banPlayer", message: "Successfully banned the player" });
	res.status(200).send();
});

router.put("/disconnectPlayer", async (req, res) => {
	logger.info({ label: "Container: disconnectPlayer", message: "Route called" });

	let idToDisconnect: number | undefined;
	let nameToDisconnect: string | undefined;

	if (req.query.hasOwnProperty("player_id")) {
		idToDisconnect = +req.query.player_id.toString();
		logger.info({ label: "Container: disconnectPlayer", message: `Disconnecting player by id (${idToDisconnect})` });
	}
	else if (req.query.hasOwnProperty("name")) {
		nameToDisconnect = req.query.name.toString();
		logger.info({ label: "Container: disconnectPlayer", message: `Disconnecting player by name (${nameToDisconnect})` });
	}
	else {
		logger.info({ label: "Container: disconnectPlayer", message: "No player information in query. Exiting..." });
		res.status(400).send();
		return;
	}

	console.log(`idtd: ${idToDisconnect}, nametd: ${nameToDisconnect}`);

	const response = await sendToContainer(req, `/disconnectPlayer?${idToDisconnect !== undefined ? `id=${idToDisconnect}` : `name=${nameToDisconnect}`}`, "PUT");
	if (response.status !== 200) {
		logger.error({ label: "Container: disconnectPlayer", message: "Disconnecting player failed!" });
		res.status(response.status).send(response.data);
		return;
	}

	logger.info({ label: "Container: disconnectPlayer", message: "Successfully disconnected the player" });
	res.status(200).send();
});

function sendToContainer(req: Request, route: string, method: Method) {
	const container = JSON.parse(req.query.container.toString());
	return axios({
		url: `http://localhost:${container.port}${route}`,
		method: method
	});
}

router.use(closeDatabase);
