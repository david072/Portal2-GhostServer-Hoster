import express from "express";
import { logger } from "../util/logger";
import { createUser, generateAuthToken, openDatabase, closeDatabase, deleteUser, generatePasswordResetToken, validatePasswordResetCredentials, resetPassword } from "../auth/account_manager";
import { authMiddleware } from "../util/middleware";
import { readFileSync } from "fs";
import { join } from "path";
import { sendMailHtml } from "../util/mailer";
import { deleteAllContainersFromUser } from "../api/docker_helper";

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

router.get("/sendResetPassword", async (req, res) => {
	if (!("email" in req.query)) {
		res.status(400).send();
		return;
	}

	const email = req.query.email.toString();
	const token = await generatePasswordResetToken(email);
	if (token === undefined) {
		logger.warn({ source: "sendResetPassword", message: "Could not find the user." });
		res.status(400).send();
		return;
	}

	try {
		const html = readFileSync(join(__dirname, "../../res/reset-password_email.html"))
			.toString()
			.replace(/({host})/g, `${req.protocol}://${req.hostname}:8080`) // aka replaceAll
			.replace("{token}", token)
			.replace("{email}", email);

		await sendMailHtml(email, "Password reset", html);
	}
	catch {
		res.status(500).send();
		return;
	}

	res.status(200).send();
});

router.delete("/delete", authMiddleware, async (req, res) => {
	await deleteAllContainersFromUser(req.body.user.id);
	await deleteUser(req.body.user.id);

	res.status(200).send();
});

router.post("/validatePasswordResetCredentials", async (req, res) => {
	logger.info({ source: "validatePasswordResetCredentials", message: "Route called" });

	if (!("token" in req.body)) {
		logger.warn({ source: "validatePasswordResetCredentials", message: "No token given" });
		res.status(400).send();
		return;
	}

	if (!("email" in req.body)) {
		logger.warn({ source: "validatePasswordResetCredentials", message: "No email given" });
		res.status(400).send();
		return;
	}

	if (!await validatePasswordResetCredentials(req.body.token, req.body.email)) {
		logger.warn({ source: "validatePasswordResetCredentials", message: "Validation failed!" });
		res.status(401).send();
		return;
	}

	logger.info({ source: "validatePasswordResetCredentials", message: "Validation succeeded!" });
	res.status(200).send();
});

router.post("/resetPassword", async (req, res) => {
	logger.info({ source: "resetPassword", message: "Route called" });

	if (!("token" in req.body)) {
		logger.warn({ source: "resetPassword", message: "No token given" });
		res.status(400).send();
		return;
	}
	else if (!("email" in req.body)) {
		logger.warn({ source: "resetPassword", message: "No email given" });
		res.status(400).send();
		return;
	}
	else if (!("newPassword" in req.body)) {
		logger.warn({ source: "resetPassword", message: "No new password given" });
		res.status(400).send();
		return;
	}

	if (!await resetPassword(req.body.token, req.body.email, req.body.newPassword)) {
		logger.warn({ source: "resetPassword", message: "Password reset failed!" });
		res.status(500).send();
	}

	logger.info({ source: "resetPassword", message: "Reset password succeeded!" });
	res.status(200).send();
});

router.use(closeDatabase);
