import express from "express";
import { exit } from "process";
import * as ghostServer from "./ghost_server_addon";
import bodyParser from "body-parser";

export class GhostServerSettings {
    countdownDuration: number;
    preCountdownCommands: string;
    postCountdownCommands: string;

    constructor(countdownDuration: number, preCountdownCommands: string, postCountdownCommands: string) {
        this.countdownDuration = countdownDuration;
        this.preCountdownCommands = preCountdownCommands;
        this.postCountdownCommands = postCountdownCommands;
    }

    updateFrom(payload: Partial<GhostServerSettings>) {
        this.countdownDuration = payload.countdownDuration || 1;
        this.preCountdownCommands = payload.preCountdownCommands || "";
        this.postCountdownCommands = payload.postCountdownCommands || "";
    }
}

let settings = new GhostServerSettings(1, "", "");

const app = express();
app.use(bodyParser.json({ limit: '20mb' }))

app.get("/startServer", (_, res) => {
	ghostServer.startServer(+process.env.WS_PORT);
	res.send("Ghost server started!");
});

app.get("/stopServer", (_, res) => {
	ghostServer.exit();
	res.send("Ghost server stopped!");
	exit();
});

app.get("/settings", (_, res) => { res.status(200).json(settings); });

app.put("/settings", (req, res) => {
	settings.updateFrom(req.body);
	res.status(200).send("Settings updated!");
});

app.put("/startCountdown", (_, res) => {
	ghostServer.startCountdown(settings.preCountdownCommands, settings.postCountdownCommands, settings.countdownDuration);
	res.status(200).send("Countdown started");
});

app.put("/serverMessage", (req, res) => {
	if (!("message" in req.query)) {
		res.status(400).send("Please specify a message");
		return;
	}

	ghostServer.serverMessage(req.query.message.toString());
	res.status(200).send();
});

app.get("/listPlayers", (_, res) => {
	res.json(ghostServer.list());
});

app.put("/disconnectPlayer", (req, res) => {
	if ("id" in req.query) {
		ghostServer.disconnectId(+req.query.id);
		res.status(200).send(`Player with id ${req.query.id} disconnected!`);
		return;
	}
	else if ("name" in req.query) {
		ghostServer.disconnect(req.query.name.toString());
		res.status(200).send(`Player with name ${req.query.name} disconnected!`);
		return;
	}

	res.status(400).send("Please specify either 'id' or 'name'");
});

app.put("/banPlayer", (req, res) => {
	if ("id" in req.query) {
		ghostServer.banId(+req.query.id);
		res.status(200).send(`Player with id ${req.query.id} banned!`);
		return;
	}
	else if ("name" in req.query) {
		ghostServer.ban(req.query.name.toString());
		res.status(200).send(`Player with name ${req.query.name} banned!`);
		return;
	}

	res.status(400).send("Please specify either 'id' or 'name'");
});

app.put("/acceptingPlayers", (req, res) => {
	let value: boolean | undefined = undefined;
	if ("value" in req.query) value = req.query.value === "1";

	ghostServer.setAcceptingPlayers(value);
	res.status(200).send(`acceptingPlayers set to ${value || true}`);
});

app.get("/acceptingPlayers", (_, res) => {
	res.status(200).json(ghostServer.getAcceptingPlayers());
});

app.put("/acceptingSpectators", (req, res) => {
	let value: boolean | undefined = undefined;
	if ("value" in req.query) value = req.query.value === "1";

	ghostServer.setAcceptingSpectators(value);
	res.status(200).send(`acceptingPlayers set to ${value || true}`);
});

app.get("/acceptingSpectators", (_, res) => {
	res.status(200).json(ghostServer.getAcceptingSpectators());
});

const port = process.env.PORT || 80;
app.listen(+port, () => { console.log(`Server listening on port ${port}`); });