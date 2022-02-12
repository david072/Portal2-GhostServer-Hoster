import { Database as sqlite3Database } from "sqlite3";
import { open, Database } from "sqlite";
import { join } from "path";
import { logger } from "../util/logger";
import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";

const dbPath = join(__dirname, "../../db/users.db");

var db: Database | undefined;

export class User {
	id: number;
	email: string;

	constructor(id: number, email: string) {
		this.id = id;
		this.email = email;
	}

	static fromRow(row: any): User {
		return new User(row.id, row.email);
	}
}

export async function openDatabase() {
	if (db) return;
	db = await open({ filename: dbPath, driver: sqlite3Database });

	// Create tables if necessary
	await db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        email TEXT NOT NULL, 
        passwordHash TEXT NOT NULL
    );`);

	await db.run(`CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER NOT NULL, 
        token TEXT NOT NULL, 
        expirationDate NUMBER NOT NULL
    );`);
}

export async function closeDatabase() {
	await db.close();
	db = undefined;
}

export async function dumpDatabase() {
	if (!db) return;

	console.log(">>> Dump: 'users' database");

	let rows = await db.all("SELECT * FROM users");
	rows.forEach(row => {
		console.log(`${row.id}: ${row.email} - ${row.passwordHash}`);
	});


	console.log(">>> Dump: 'auth_tokens' database");

	rows = await db.all("SELECT * FROM auth_tokens");
	rows.forEach(row => {
		console.log(`${row.id}: ${row.user_id} > ${row.token} (${row.expirationDate})`);
	});
}

export async function createUser(email: string, password: string): Promise<boolean> {
	if (!db) return;

	const passwordHash = getPasswordHash(password);

	const row = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
	if (row) {
		logger.info({ label: "Account Manager - Insert User", message: "User creation failed. User with email already exists." });
		return false;
	}

	await db.run(`INSERT INTO users (email, passwordHash) VALUES ('${email}', '${passwordHash}');`);

	logger.info({ label: "Account Manager - Insert User", message: `Successfully inserted the user. Email: ${email}, passwordHash: ${passwordHash}` });
	return true;
}

export async function generateAuthToken(email: string, password: string): Promise<[string, number] | undefined> {
	if (!db) return;

	const passwordHash = getPasswordHash(password);
	console.log(passwordHash);

	const row = await db.get("SELECT * FROM users WHERE email = ? AND passwordHash = ?", [email, passwordHash]);
	if (!row) return;

	const authToken = randomBytes(30).toString('hex');
	// Hint: Parse expirationDate with new Date(expirationDate) :^)
	const expirationDate = addDays(Date.now(), 7).getTime();
	await db.run(`INSERT INTO auth_tokens (user_id, token, expirationDate) VALUES (${row.id}, '${authToken}', ${expirationDate});`);

	return [authToken, expirationDate];
}

export async function getUser(authToken: string): Promise<User | undefined> {
	if (!db) return;

	// Delete expired authTokens
	await db.run("DELETE FROM auth_tokens WHERE expirationDate < ?", [Date.now()]);

	const authTokenRow = await db.get("SELECT * FROM auth_tokens WHERE token = ?", [authToken]);
	if (!authTokenRow) return;

	// Check if authToken has expired
	// if (isAfter(Date.now(), new Date(authTokenRow.expirationDate))) {
	//  	await db.get("DELETE FROM auth_tokens WHERE token = ?", [authToken]);
	//  	return;
	// }

	const userRow = await db.get("SELECT * FROM users WHERE id = ?", [authTokenRow.user_id]);
	if (!userRow) return;
	return User.fromRow(userRow);
}

function getPasswordHash(password: string): string {
	return createHash('sha256').update(password).digest('base64');
}
