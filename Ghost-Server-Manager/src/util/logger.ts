import { createLogger, format, transports } from "winston";
import { join } from "path";

export const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.label(),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
    ),
    transports: [
        new transports.File({ filename: join(__dirname, '../logs/ghost-server-manager.log') })
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
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            format.label(),
            format.errors({ stack: true }),
            format.splat(),
            format.json(),
        )
    }));
}