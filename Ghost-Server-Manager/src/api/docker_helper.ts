import Docker from "dockerode";
import { logger } from "../util/logger";
import axios from "axios";
import { deleteContainer, getContainersForUser, updateDatabase } from "./container_db_manager";

const docker = new Docker();

export async function createContainer(port: number, wsPort: number): Promise<string> {
    logger.info({ source: "create_instance", message: `Starting container with port: ${port} and wsPort: ${wsPort}...` });
    const container = await docker.createContainer({
        Env: [`PORT=${port}`, `WS_PORT=${wsPort}`],
        ExposedPorts: {
            [`${port}/tcp`]: {},
            [`${wsPort}/tcp`]: {}
        },
        HostConfig: {
            PortBindings: {
                [`${port}/tcp`]: [{
                    "HostPort": port.toString()
                }],
                [`${wsPort}/tcp`]: [{
                    "HostPort": wsPort.toString()
                }]
            },
            NetworkMode: "host"
        },
        AttachStdout: true,
        Image: "ghost-server-hoster"
    });

    await container.start();
    await waitForContainerStart(container);
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info({ source: "create_instance", message: "Container ready. Requesting websocket start..." });
    await axios.get(`http://localhost:${port}/startServer`);

    logger.info({ source: "create_instance", message: "Container successfully started" });
    return container.id;
}

// Resolves when the container is ready
function waitForContainerStart(container: Docker.Container): Promise<void> {
    return new Promise((resolve, reject) => {
        container.attach({ stream: true, stdout: true }, (err, stream) => {
            if (err) {
                logger.error({ source: "waitForContainerStart", message: `Failed to attach to container ${container.id}: ${err}` });
                reject(err);
                return;
            }

            const listener = async (chunk: any) => {
                logger.info({ source: "waitForContainerStart", message: `Container data: ${chunk}` });

                if (!/\s*(Server listening on port).*/.test(String(chunk))) return;
                stream.off("data", listener);
                resolve();
            };

            stream.on("data", listener);
        });
    });
}

export async function updateDb() {
    const runningContainerIds = (await docker.listContainers()).map((container) => container.Id);
    await updateDatabase(runningContainerIds);
}

export async function stopContainer(port: number, updateDatabase: boolean = true) {
    await axios.get(`http://localhost:${port}/stopServer`);
    if (updateDatabase) await updateDb();

    // const container = docker.getContainer(containerId);
    // await container.stop();
    // await container.remove();
}

export async function deleteAllContainersFromUser(userId: number) {
    await updateDb();

    const containers = await getContainersForUser(userId);

    const promises: Promise<void>[] = [];
    containers.forEach((container) => {
        promises.push(stopContainer(container.port, false).then(() => {
            deleteContainer(container.id);
        }));
    });

    await updateDb();

    await Promise.all(promises);
}
