import express from "express";
import { exit } from "process";
import cors from "cors";
import { router as authRouter } from "./auth/auth_router";
import { router as apiRouter } from "./api/api_router";
import { router as containerRouter } from "./api/container_router";

const app = express();

app.use(cors());

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

app.listen(8080, () => { console.log("Server listening on port 8080"); });
