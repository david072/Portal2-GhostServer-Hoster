import express from "express";
import { logger } from "../util/logger";
import axios from "axios";
import Docker from "dockerode";
import { authMiddleware, containerAuthMiddleware } from "../util/middleware";
import { closeDatabase, insertContainer, getAllColumnValues, updateDatabase, deleteContainer, getContainersForUser, getAllContainers } from "./container_db_manager";
import { createContainer, stopContainer, updateDb } from "./docker_helper";

const MAX_NUMBER_OF_GHOST_SERVERS = 10;

export const router = express.Router();

// Require authentication for all sub-routes => Valid account and owning the requested container
router.use(authMiddleware, containerAuthMiddleware);

router.post("/create", async (req, res) => {
	logger.info({ source: "create_instance", message: "Route called" });

	const ports = await getAllColumnValues<number>("port");
	if (ports.length >= MAX_NUMBER_OF_GHOST_SERVERS) {
		logger.error({ source: "create_instance", message: "Max number of concurrent ghost servers" });
		res.status(507).send();
		return;
	}

	const wsPorts = await getAllColumnValues<number>("ws_port");

	const port = randomRangeNotIn(5000, 10000, ports);
	const wsPort = randomRangeNotIn(45000, 50000, wsPorts);
	if (port === undefined || wsPort === undefined) {
		logger.error({ source: "create_instance", message: "No available ports" });
		res.status(507).send();
		return;
	}

	const containerId = await createContainer(port, wsPort);

	const name = "name" in req.query ? req.query.name.toString() : ""
	insertContainer(containerId, port, wsPort, req.body.user.id, name);

	res.status(201).send();
});

router.get("/list", async (req, res) => {
	await updateDb();

	if (req.body.user.role === "admin" && "showAll" in req.query) {
		if (req.query.showAll === "1") {
			res.status(200).json(await getAllContainers());
			return;
		}
	}

	const containers = await getContainersForUser(req.body.user.id);
	res.status(200).json(containers);
});

router.get("/delete", containerAuthMiddleware, async (req, res) => {
	logger.info({ source: "delete", message: "Route called" });

	const container = req.body.container;
	await deleteContainer(container.id);
	await stopContainer(container.port, true);

	logger.info({ source: "delete", message: "Successfully stopped and deleted the container" });
	res.status(200).send();
});

router.get("/validateContainerId", containerAuthMiddleware, (req, res) => {
	// The middleware validates here, so if we get to this point, it was successful
	res.status(200).json(req.body.container);
});

router.use(closeDatabase);

function randomRangeNotIn(min: number, max: number, numbers: number[]): number | undefined {
	if (numbers.length >= (max - min)) return undefined;

	let number: number;
	do {
		number = Math.floor(Math.random() * (max - min) + min);
	}
	while (numbers.indexOf(number) !== -1);

	return number;
}
