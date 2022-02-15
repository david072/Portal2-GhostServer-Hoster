import { Database as sqlite3Database } from "sqlite3";
import { open, Database } from "sqlite";
import { join } from "path";
import { logger } from "../util/logger";
import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import bcrypt from "bcrypt";

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

export async function createUser(email: string, password: string): Promise<boolean> {
	if (!db) return;

	const passwordHash = await bcrypt.hash(password, 10); // Last parameter is the number of salt rounds, 10 is fine

	const row = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
	if (row) return false;

	await db.run(`INSERT INTO users (email, passwordHash) VALUES ('${email}', '${passwordHash}');`);

	return true;
}

export async function generateAuthToken(email: string, password: string): Promise<string | undefined> {
	if (!db) return;

	const row = await db.get("SELECT * FROM users WHERE email = ?", [email]);
	if (!row) return;

	const hash = row.passwordHash;

	const match = await bcrypt.compare(password, row.passwordHash);

	if (!match) return;

	const authToken = randomBytes(30).toString('hex');
	// Hint: Parse expirationDate with new Date(expirationDate) :^)
	const expirationDate = addDays(Date.now(), 7).getTime();
	await db.run(`INSERT INTO auth_tokens (user_id, token, expirationDate) VALUES (${row.id}, '${authToken}', ${expirationDate});`);

	return authToken;
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

export async function deleteUser(id: number) {
	await db.run("DELETE FROM auth_tokens WHERE user_id = ?", [id]);
	await db.run("DELETE FROM users WHERE id = ?", [id]);
}