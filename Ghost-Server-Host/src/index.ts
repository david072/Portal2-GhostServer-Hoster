import express from "express";
import { exit } from "process";
import * as ghostServer from "./ghost_server_addon";

const app = express();

let preCountdownCommands: string = "";
let postCountdownCommands: string = "";
let countdownDuration: number = 1;

app.get("/startServer", (_, res) => {
	ghostServer.startServer(+process.env.WS_PORT);
	res.send("Ghost server started!");
});

app.get("/stopServer", (_, res) => {
	ghostServer.exit();
	res.send("Ghost server stopped!");
	exit();
});

app.get("/settings", (_, res) => {
	res.status(200).json({
		preCommands: preCountdownCommands,
		postCommands: postCountdownCommands,
		duration: countdownDuration
	});
});

app.put("/settings", (req, res) => {
	if (req.query.hasOwnProperty("preCommands")) preCountdownCommands = req.query.preCommands.toString();
	if (req.query.hasOwnProperty("postCommands")) postCountdownCommands = req.query.postCommands.toString();
	if (req.query.hasOwnProperty("duration")) countdownDuration = +req.query.duration;
	res.status(200).send("Settings updated!");
});

app.put("/startCountdown", (req, res) => {
	console.log(`startCountdown prc: ${preCountdownCommands}, poc: ${postCountdownCommands}, cd: ${countdownDuration}`);
	ghostServer.startCountdown(preCountdownCommands, postCountdownCommands, countdownDuration);
	res.status(200).send("Countdown started");
});

app.get("/listPlayers", (_, res) => {
	res.send(JSON.stringify(ghostServer.list()));
});

app.put("/disconnectPlayer", (req, res) => {
	if (req.query.hasOwnProperty("id")) {
		ghostServer.disconnectId(+req.query.id);
		res.status(200).send(`Player with id ${req.query.id} disconnected!`);
		return;
	}
	else if (req.query.hasOwnProperty("name")) {
		ghostServer.disconnect(req.query.name.toString());
		res.status(200).send(`Player with name ${req.query.name} disconnected!`);
		return;
	}

	res.status(400).send("Please specify either 'id' or 'name'");
});

app.put("/banPlayer", (req, res) => {
	console.log("banPlayer called");

	if (req.query.hasOwnProperty("id")) {
		ghostServer.banId(+req.query.id);
		res.status(200).send(`Player with id ${req.query.id} banned!`);
		return;
	}
	else if (req.query.hasOwnProperty("name")) {
		ghostServer.ban(req.query.name.toString());
		res.status(200).send(`Player with name ${req.query.name} banned!`);
		return;
	}

	res.status(400).send("Please specify either 'id' or 'name'");
});

const port = process.env.PORT || 80;
app.listen(+port, () => { console.log(`Server listening on port ${port}`); });