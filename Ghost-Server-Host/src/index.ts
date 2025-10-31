import express from "express";
import { exit } from "process";
import * as ghostServer from "./ghost_server_addon";
import bodyParser from "body-parser";

export class GhostServerSettings {
    countdownDuration: number = 1;
    preCountdownCommands: string = "";
    postCountdownCommands: string = "";
	acceptingPlayers: boolean = true;
	acceptingSpectators: boolean = true;

    updateFrom(payload: Partial<GhostServerSettings>) {
        this.countdownDuration = payload.countdownDuration || this.countdownDuration;
        this.preCountdownCommands = payload.preCountdownCommands || this.preCountdownCommands;
        this.postCountdownCommands = payload.postCountdownCommands || this.postCountdownCommands;
		this.acceptingPlayers = payload.acceptingPlayers !== undefined ? payload.acceptingPlayers : this.acceptingPlayers;
		this.acceptingSpectators = payload.acceptingSpectators !== undefined ? payload.acceptingSpectators : this.acceptingSpectators;
    }
}

let settings = new GhostServerSettings();

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

	ghostServer.setAcceptingPlayers(settings.acceptingPlayers);
	ghostServer.setAcceptingSpectators(settings.acceptingSpectators);

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
	if ("id" in req.body) {
		ghostServer.disconnectId(+req.body.id);
		res.status(200).send(`Player with id ${req.body.id} disconnected!`);
		return;
	}
	else if ("name" in req.body) {
		ghostServer.disconnect(req.body.name.toString());
		res.status(200).send(`Player with name ${req.body.name} disconnected!`);
		return;
	}

	res.status(400).send("Please specify either 'id' or 'name'");
});

app.put("/banPlayer", (req, res) => {
	if ("id" in req.body) {
		ghostServer.banId(+req.body.id);
		res.status(200).send(`Player with id ${req.body.id} banned!`);
		return;
	}
	else if ("name" in req.body) {
		ghostServer.ban(req.body.name.toString());
		res.status(200).send(`Player with name ${req.body.name} banned!`);
		return;
	}

	res.status(400).send("Please specify either 'id' or 'name'");
});

const port = process.env.PORT || 80;
app.listen(+port, () => { console.log(`Server listening on port ${port}`); });