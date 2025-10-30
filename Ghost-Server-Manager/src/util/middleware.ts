import { logger } from "./logger";
import { Request, Response, NextFunction } from "express";
import * as user_db from "../auth/account_manager";
import * as container_db from "../api/container_db_manager";

/// Validates the provided auth token (cookie or Authorization header) and places the user object
/// from the database into the request's body.
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
	logger.info({ source: "authMiddleware", message: `Validating request to ${req.url}` });

	let authToken = req.cookies["authToken"];
	if (!authToken) {
		authToken = req.header("Authorization")?.substring("Bearer ".length);
		if (!authToken) {
			logger.info({ source: "authMiddleware", message: "Validation failed! authToken not given" });
			res.status(400).send("Please provide an auth token");
			return;
		}
	}

	await user_db.openDatabase();
	const user = await user_db.getUser(authToken);
	if (!user) {
		logger.info({ source: "authMiddleware", message: "Validation failed! authToken not valid" });
		res.status(401).send("Invalid auth token");
		return;
	}

	logger.info({ source: "authMiddleware", message: "Request validated!" });

	req.body.user = user;
	next();
}

/// Validates that the container exists and that the user owns the container (expects the user object
/// to be in the request's body) and places the container object from the database into the request's body.
export async function containerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
	logger.info({ source: "containerAuthMiddleware", message: `Validating request to ${req.url}` });

	await container_db.openDatabase();
	await container_db.removeContainersNotRunning();

	if (!("id" in req.query)) {
		logger.info({ source: "containerAuthMiddleware", message: "Missing container id!" });
		res.status(400).send();
		return;
	}

	const container = undefined; // await container_db.getContainer(+req.query.id!);
	if (!container) {
		logger.info({ source: "containerAuthMiddleware", message: "Validation failed! Container does not exist" });
		res.status(404).send("The server does not exist");
		return;
	}
	else if (req.body.user.role !== user_db.Role.Admin && container.userId !== req.body.user.id) {
		logger.info({ source: "containerAuthMiddleware", message: "Validation failed! User does not own the container" });
		res.status(404).send("The server does not exist");
		return;
	}

	logger.info({ source: "containerAuthMiddleware", message: "Request validated!" });

	req.body.container = container;
	next();
}
