import express from "express";
import { logger } from "../util/logger";
import { createUser, generateAuthToken, openDatabase, closeDatabase } from "../auth/account_manager";
import { authMiddleware } from "../util/middleware";

export const router = express.Router();

router.use(async (req, res, next) => {
	await openDatabase();
	next();
});

router.post("/register", async (req, res) => {
	logger.info({ source: "register", message: "Route called" });

	if (!("email" in req.body)) {
		logger.warn({ source: "register", message: "No email in query. Exiting." });
		res.status(400).send();
		return;
	}
	else if (!("password" in req.body)) {
		logger.warn({ source: "register", message: "No password in query. Exiting." });
		res.status(400).send();
		return;
	}

	const email = req.body.email.toString();
	const password = req.body.password.toString();

	const successful = await createUser(email, password);
	if (!successful) {
		logger.warn({ source: "register", message: "The user already exists" });
		res.status(409).send();
		return;
	}

	res.status(201).send();
});

router.post("/generateAuthToken", async (req, res) => {
	logger.info({ source: "generateAuthToken", message: "Route called" });

	if (!("email" in req.body)) {
		logger.warn({ source: "generateAuthToken", message: "No email in query. Exiting." });
		res.status(400).send();
		return;
	}
	else if (!("password" in req.body)) {
		logger.warn({ source: "generateAuthToken", message: "No password in query. Exiting." });
		res.status(400).send();
		return;
	}

	const email = req.body.email.toString();
	const password = req.body.password.toString();

	const authToken = await generateAuthToken(email, password);
	if (!authToken) {
		logger.warn({ source: "generateAuthToken", message: "Fail! User not found." });
		res.status(404).send();
		return;
	}

	logger.info({ source: "generateAuthToken", message: "Success!" });

	res.cookie('authToken', authToken, { maxAge: 7 * 24 * 60 * 60, httpOnly: true, secure: true, sameSite: "lax" }).sendStatus(200);
});

router.get("/user", authMiddleware, (req, res) => {
	res.status(200).json(req.body.user);
});

router.use(closeDatabase);
