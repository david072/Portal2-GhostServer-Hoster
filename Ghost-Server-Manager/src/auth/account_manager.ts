import { Database as sqlite3Database } from "sqlite3";
import { open, Database } from "sqlite";
import { join } from "path";
import { randomBytes } from "crypto";
import { addDays, addHours } from "date-fns";
import bcrypt from "bcrypt";
import { logger } from "../util/logger";

const dbPath = join(__dirname, "../../db/users.db");

var db: Database | undefined;

export class User {
	id: number;
	email: string;
	role: string;

	constructor(id: number, email: string, role: string) {
		this.id = id;
		this.email = email;
		this.role = role;
	}

	static fromRow(row: any): User {
		return new User(row.id, row.email, row.role);
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

	try {
		await db.run(`ALTER TABLE users ADD role TEXT NOT NULL DEFAULT 'user'`);
	}
	catch { }

	await db.run(`CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER NOT NULL, 
        token TEXT NOT NULL, 
        expirationDate NUMBER NOT NULL
    );`);

	await db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
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
	if (!db) {
		logger.error({ source: "createUser - DB", message: "Database not open!" });
		return false;
	}

	const passwordHash = await getPasswordHash(password);

	const row = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
	if (row) return false;

	await db.run(`INSERT INTO users (email, passwordHash) VALUES ('${email}', '${passwordHash}');`);

	return true;
}

export async function generateAuthToken(email: string, password: string): Promise<string | undefined> {
	if (!db) {
		logger.error({ source: "generateAuthToken - DB", message: "Database not open!" });
		return;
	}

	const row = await db.get("SELECT * FROM users WHERE email = ?", [email]);
	if (!row) {
		logger.error({ source: "generateAuthToken - DB", message: `No user matching email ${email} found!` });
		return;
	}

	const match = await bcrypt.compare(password, row.passwordHash);
	if (!match) {
		logger.error({ source: "generateAuthToken - DB", message: "Passwords don't match" });
		return;
	}

	const authToken = randomBytes(30).toString('hex');
	// Hint: Parse expirationDate with new Date(expirationDate) :^)
	const expirationDate = addDays(Date.now(), 7).getTime();
	await db.run(`INSERT INTO auth_tokens (user_id, token, expirationDate) VALUES (${row.id}, '${authToken}', ${expirationDate});`);

	return authToken;
}

export async function getUser(authToken: string): Promise<User | undefined> {
	if (!db) {
		logger.error({ source: "getUser - DB", message: "Database not open!" });
		return;
	}

	// Delete expired authTokens
	await db.run("DELETE FROM auth_tokens WHERE expirationDate < ?", [Date.now()]);

	const authTokenRow = await db.get("SELECT * FROM auth_tokens WHERE token = ?", [authToken]);
	if (!authTokenRow) return;

	const userRow = await db.get("SELECT * FROM users WHERE id = ?", [authTokenRow.user_id]);
	if (!userRow) return;
	return User.fromRow(userRow);
}

export async function deleteUser(id: number) {
	await db.run("DELETE FROM auth_tokens WHERE user_id = ?", [id]);
	await db.run("DELETE FROM users WHERE id = ?", [id]);
}

export async function generatePasswordResetToken(email: string): Promise<string | undefined> {
	if (!db) {
		logger.error({ source: "generatePasswordResetToken - DB", message: "Database not open!" });
		return;
	}

	await deleteExpiredPasswordResetTokens();

	const userRow = await db.get("SELECT * FROM users WHERE email = ?", [email]);
	if (!userRow) return;

	const row = await db.get("SELECT * FROM password_reset_tokens WHERE user_id = ?", [userRow.id]);
	if (row)
		await db.run("DELETE FROM password_reset_tokens WHERE user_id = ?", [userRow.id]);

	const token = randomBytes(30).toString('hex');
	const expirationDate = addHours(Date.now(), 5).getTime();
	await db.exec(`INSERT INTO password_reset_tokens (user_id, token, expirationDate) VALUES (${userRow.id}, '${token}', ${expirationDate});`);

	return token;
}

export async function validatePasswordResetCredentials(token: string, email: string): Promise<boolean> {
	if (!db) {
		logger.error({ source: "validatePasswordResetCredentials - DB", message: "Database not open!" });
		return false;
	}

	await deleteExpiredPasswordResetTokens();

	const tokenRow = await db.get("SELECT * FROM password_reset_tokens WHERE token = ?", [token]);
	if (!tokenRow) return false;

	const userRow = await db.get("SELECT * FROM users WHERE id = ?", [tokenRow.user_id]);
	if (!userRow) return false;
	if (userRow.email !== email) return false;

	return true;
}

export async function resetPassword(token: string, email: string, newPassword: string): Promise<boolean> {
	if (!db) return false;

	await deleteExpiredPasswordResetTokens();

	const tokenRow = await db.get("SELECT * FROM password_reset_tokens WHERE token = ?", [token]);
	if (!tokenRow) return;

	const newPasswordHash = await getPasswordHash(newPassword);
	await db.run(`UPDATE users SET passwordHash = '${newPasswordHash}' WHERE id = ?`, [tokenRow.user_id]);
	await db.run("DELETE FROM password_reset_tokens WHERE id = ?", [tokenRow.id]);

	return true;
}

function deleteExpiredPasswordResetTokens() {
	return db.run("DELETE FROM password_reset_tokens WHERE expirationDate < ?", [Date.now()]);
}

function getPasswordHash(password: string): Promise<string> {
	return bcrypt.hash(password, 10); // Last parameter is the number of salt rounds, 10 is fine
}