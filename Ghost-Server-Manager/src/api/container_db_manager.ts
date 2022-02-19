import { join } from "path";
import { Database as sqlite3Database } from "sqlite3";
import { open, Database } from "sqlite";
import { addHours } from "date-fns";
import { scheduleJob } from "node-schedule";
import { stopContainer } from "./docker_helper";

const dbPath = join(__dirname, "../../db/containers.db");

var db: Database | undefined;

export class Container {
	id: number;
	containerId: string;
	port: number;
	wsPort: number;
	userId: number;
	name?: string;

	constructor(id: number, containerId: string, port: number, wsPort: number, userId: number, name?: string) {
		this.id = id;
		this.containerId = containerId;
		this.port = port;
		this.wsPort = wsPort;
		this.userId = userId;
		this.name = name;
	}

	static fromRow(row: any): Container {
		return new Container(row.id, row.container_id, row.port, row.ws_port, row.user_id, row.name);
	}
}

export async function openDatabase() {
	db = await open({ filename: dbPath, driver: sqlite3Database });

	// Create tables if necessary
	await db.run(`CREATE TABLE IF NOT EXISTS containers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        container_id TEXT NOT NULL,
        port NUMBER NOT NULL, 
        ws_port NUMBER NOT NULL,
		user_id NUMBER NOT NULL,
		name STRING
    );`);

	try {
		await db.run(`ALTER TABLE containers ADD COLUMN expirationDate NUMBER NOT NULL DEFAULT ${addHours(Date.now(), 5).getTime()}`);
	}
	catch { }
}

export async function closeDatabase() {
	await db.close();
	db = undefined;
}

export async function updateDatabase(runningContainerIds: string[]) {
	await db?.run(`DELETE FROM containers WHERE container_id NOT IN (${runningContainerIds.map((_) => '?').join(',')})`, runningContainerIds);
}

export async function insertContainer(id: string, port: number, wsPort: number, userId: number, name: string = "") {
	const expirationDate = addHours(Date.now(), 5);
	await db.run(`INSERT INTO containers 
		(container_id, port, ws_port, user_id, name, expirationDate) 
		VALUES (
			'${id}',
			'${port}', 
			'${wsPort}', 
			${userId}, 
			'${name}',
			${expirationDate.getTime()}
		);`);

	// Delete container after expiration date
	scheduleJob(expirationDate, async () => {
		if (!db) await openDatabase();
		await stopContainer(port);
	});
}

export async function getContainersForUser(userId: number) {
	const rows = await db.all("SELECT * FROM containers WHERE user_id = ?", [userId]);
	return rows.map((row) => Container.fromRow(row));
}

export async function getAllContainers(): Promise<Container[]> {
	const rows = await db.all("SELECT * FROM containers");
	return rows.map(row => Container.fromRow(row));
}

export async function getContainer(id: number): Promise<Container | undefined> {
	const row = await db.get("SELECT * FROM containers WHERE id = ?", [id]);
	if (!row) return;

	return Container.fromRow(row);
}

export async function getAllColumnValues<T = any>(column: string): Promise<T[]> {
	const rows = await db.all(`SELECT ${column} FROM containers`);
	return rows;
}

export async function deleteContainer(id: number) {
	await db.run("DELETE FROM containers WHERE id = ?", [id]);
}
