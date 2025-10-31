import express from "express";
import cors from "cors";
import { router as authRouter } from "./auth/auth_router";
import { router as serverRouter } from "./api/server_router";
import path from "path";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { init } from "./util/mailer";

const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname, '../web')));

app.use(cookieParser());
app.use(bodyParser.json({ limit: '20mb' }))

app.use("/api/auth", authRouter);
app.use("/api/server", serverRouter);

init();

app.listen(8080, () => { console.log("Server listening on port 8080"); });
