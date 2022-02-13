import { logger } from "./logger";
import { Request, Response, NextFunction } from "express";
import { openDatabase as authOpenDatabase, getUser } from "../auth/account_manager";
import { openDatabase as containerOpenDatabase, getContainer, updateDatabase } from "../api/container_db_manager";
import Docker from "dockerode";

const docker = new Docker();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
	logger.info({ label: "authMiddleware", message: `Validating request to ${req.url}` });

	const authToken = req.cookies["authToken"];
	if (!authToken) {
		logger.info({ label: "authMiddleware", message: "Validation failed! authToken not given" });
		res.status(401).send();
		return;
	}

	await authOpenDatabase();
	const user = await getUser(authToken);
	if (!user) {
		logger.info({ label: "authMiddleware", message: "Validation failed! authToken not valid" });
		res.status(401).send();
		return;
	}

	req.query.user = JSON.stringify(user);

	logger.info({ label: "authMiddleware", message: "Request validated! Passing request on..." });
	next();
}

export async function containerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
	logger.info({ label: "containerAuthMiddleware", message: `Validating request to ${req.url}` });

	await containerOpenDatabase();
	await updateDb();

	if (!req.query.hasOwnProperty("id")) {
		logger.info({ label: "containerAuthMiddleware", message: "No id requested. Passing request on..." });
		next();
		return;
	}

	const container = await getContainer(+req.query.id!);
	if (!container) {
		logger.info({ label: "containerAuthMiddleware", message: "Validation failed! Container does not exist" });
		res.status(404).send();
		return;
	}
	else if (container.userId !== JSON.parse(req.query.user.toString()).id) {
		logger.info({ label: "containerAuthMiddleware", message: "Validation failed! User does not own the container" });
		res.status(401).send();
		return;
	}

	logger.info({ label: "containerAuthMiddleware", message: "Request validated! Passing request on..." });

	req.query.container = JSON.stringify(container);
	next();
}

async function updateDb() {
	const runningContainerIds = (await docker.listContainers()).map((container) => container.Id);
	await updateDatabase(runningContainerIds);
}
