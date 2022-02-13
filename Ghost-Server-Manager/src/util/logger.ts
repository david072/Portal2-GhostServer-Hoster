import { createLogger, format, transports } from "winston";
import { join } from "path";

const myFormat = format.printf(({ level, message, label, timestamp, ...rest }) => {
	let result = `${timestamp} `;
	if (rest.source !== undefined) result += `\x1b[33m[${rest.source}]\x1b[0m `;

	result += `${level}: ${message}`;

	return result;
});

console.log(join(__dirname, '../logs/ghost-server-manager.log'));

export const logger = createLogger({
	level: 'info',
	transports: [
		new transports.File({
			filename: join(__dirname, '../../logs/ghost-server-manager.log'), format: format.combine(
				format.timestamp({
					format: "MM-DD-YYYY HH:mm"
				}),
				myFormat,
				format.uncolorize(),
			)
		})
	]
});

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (process.env.NODE_ENV !== 'production') {
	logger.add(new transports.Console({
		format: format.combine(
			format.colorize(),
			format.timestamp({
				format: "MM-DD-YYYY HH:mm"
			}),
			myFormat
		)
	}));
}