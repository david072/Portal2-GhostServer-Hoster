import express from "express";
import { exit } from "process";
import cors from "cors";
import { router as authRouter } from "./auth/auth_router";
import { router as apiRouter } from "./api/api_router";
import { router as containerRouter } from "./api/container_router";
import path from "path";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { init } from "./util/mailer";

const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname, '../web')));

app.use(cookieParser());
app.use(bodyParser.json({ limit: '20mb' }))

// Authentication routes
app.use("/auth", authRouter);

// Container API routes
app.use("/api", apiRouter);
app.use("/container", containerRouter);

// app.get("/terminate", async (_, res) => {
// 	const containers = await docker.listContainers();
// 	containers.forEach(stopContainer);

// 	res.status(200).send("Containers stopped! Exiting...");
// 	exit();
// });

init();

app.listen(8080, () => { console.log("Server listening on port 8080"); });
