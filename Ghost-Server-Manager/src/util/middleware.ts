import { logger } from "./logger";
import { Request, Response, NextFunction } from "express";
import { openDatabase as authOpenDatabase, getUser } from "../auth/account_manager";
import { openDatabase as containerOpenDatabase, getContainer, updateDatabase } from "../api/container_db_manager";
import Docker from "dockerode";

const docker = new Docker();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
	logger.info({ source: "authMiddleware", message: `Validating request to ${req.url}` });

	let authToken = req.cookies["authToken"];
	if (!authToken) {
		authToken = req.header("Authorization")?.substring("Bearer ".length);
		if (!authToken) {
			logger.info({ source: "authMiddleware", message: "Validation failed! authToken not given" });
			res.status(401).send();
			return;
		}
	}

	await authOpenDatabase();
	const user = await getUser(authToken);
	if (!user) {
		logger.info({ source: "authMiddleware", message: "Validation failed! authToken not valid" });
		res.status(401).send();
		return;
	}

	logger.info({ source: "authMiddleware", message: "Request validated! Passing request on..." });

	req.body.user = user;
	next();
}

export async function containerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
	logger.info({ source: "containerAuthMiddleware", message: `Validating request to ${req.url}` });

	await containerOpenDatabase();
	await updateDb();

	if (!("id" in req.query)) {
		logger.info({ source: "containerAuthMiddleware", message: "No id requested. Passing request on..." });
		next();
		return;
	}

	const container = await getContainer(+req.query.id!);
	if (!container) {
		logger.info({ source: "containerAuthMiddleware", message: "Validation failed! Container does not exist" });
		res.status(404).send();
		return;
	}
	else if (req.body.user.role !== "admin" && container.userId !== req.body.user.id) {
		logger.info({ source: "containerAuthMiddleware", message: "Validation failed! User does not own the container" });
		res.status(401).send();
		return;
	}

	logger.info({ source: "containerAuthMiddleware", message: "Request validated! Passing request on..." });

	req.body.container = container;
	next();
}

async function updateDb() {
	const runningContainerIds = (await docker.listContainers()).map((container) => container.Id);
	await updateDatabase(runningContainerIds);
}
