import express from "express";
import { logger } from "../util/logger";
import axios from "axios";
import Docker from "dockerode";
import { authMiddleware, containerAuthMiddleware } from "../util/middleware";
import { closeDatabase, insertContainer, getAllColumnValues, updateDatabase, deleteContainer, getContainersForUser } from "./container_db_manager";

const MAX_NUMBER_OF_GHOST_SERVERS = 10;

const docker = new Docker();
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

	logger.info({ source: "create_instance", message: `Starting container with port: ${port} and wsPort: ${wsPort}...` });

	const container = await docker.createContainer({
		Env: [`PORT=${port}`, `WS_PORT=${wsPort}`],
		ExposedPorts: {
			[`${port}/tcp`]: {},
			[`${wsPort}/tcp`]: {}
		},
		HostConfig: {
			PortBindings: {
				[`${port}/tcp`]: [{
					"HostPort": port.toString()
				}],
				[`${wsPort}/tcp`]: [{
					"HostPort": wsPort.toString()
				}]
			}
		},
		AttachStdout: true,
		Image: "ghost-server-hoster"
	});

	await container.start();
	await waitForContainerStart(container);
	await new Promise(resolve => setTimeout(resolve, 2000));

	logger.info({ source: "create_instance", message: "Container ready. Requesting websocket start..." });

	await axios.get(`http://localhost:${port}/startServer`);

	logger.info({ source: "create_instance", message: "Container successfully started" });

	const name = "name" in req.query ? req.query.name.toString() : ""
	insertContainer(container.id, port, wsPort, req.body.user.id, name);

	res.status(201).send();
});

// Resolves when the container is ready
function waitForContainerStart(container: Docker.Container): Promise<void> {
	return new Promise((resolve, reject) => {
		container.attach({ stream: true, stdout: true }, (err, stream) => {
			if (err) {
				logger.error({ source: "waitForContainerStart", message: `Failed to attach to container ${container.id}: ${err}` });
				reject(err);
				return;
			}

			const listener = async (chunk: any) => {
				logger.info({ source: "waitForContainerStart", message: `Container data: ${chunk}` });

				if (!/\s*(Server listening on port).*/.test(String(chunk))) return;
				stream.off("data", listener);
				resolve();
			};

			stream.on("data", listener);
		});
	});
}

router.get("/list", async (req, res) => {
	await updateDb();

	const containers = await getContainersForUser(req.body.user.id);
	res.status(200).json(containers);
});

router.get("/delete", containerAuthMiddleware, async (req, res) => {
	logger.info({ source: "delete", message: "Route called" });

	const container = req.body.container;
	await deleteContainer(container.id);
	await stopContainer(container.containerId, container.port);

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

async function stopContainer(containerId: string, port: number) {
	await axios.get(`http://localhost:${port}/stopServer`);

	const container = docker.getContainer(containerId);
	await container.stop();
	await container.remove();
}

async function updateDb() {
	const runningContainerIds = (await docker.listContainers()).map((container) => container.Id);
	await updateDatabase(runningContainerIds);
}

export async function deleteAllContainersFromUser(userId: number) {
	await updateDb();

	const containers = await getContainersForUser(userId);

	const promises: Promise<void>[] = [];
	containers.forEach((container) => {
		promises.push(stopContainer(container.containerId, container.port).then(() => {
			deleteContainer(container.id);
		}));
	});

	await Promise.all(promises);
}