import { logger } from "../util/logger";
import express, { Request } from "express";
import { authMiddleware, containerAuthMiddleware } from "../util/middleware";
import * as db from "./container_db_manager";
import axios, { Method } from "axios";
import * as user_db from "../auth/account_manager";

export const router = express.Router();

// Require authentication for all sub-routes => Valid account and owning the requested container
router.use(authMiddleware);

router.get("/:id", async (req, res) => {
	await db.openDatabase();
	const container = await db.getContainerFromParameter(req.params["id"], req.body.user);
	if (container === undefined) {
		res.status(400).send("Invalid container ID");
		return;
	}

	res.status(200).json(container);
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