# Portal2-GhostServer-Hoster

A website for hosting [Ghost Servers](https://github.com/p2sr/GhostServer) that can be used freely.

An official version of the website can be found at [ghost.portal2.sr](https://ghost.portal2.sr/), which is free to use for anyone, whenever they want!

## Building

### Prerequisites
- nodejs and docker installed on your machine
- The repository cloned in a directory of your choice

### Ghost-Server-Host Module

1. Go into `/Ghost-Server-Host/root_image`
2. Run `docker build . -t ghost-server-hoster_base`
3. Go one directory up
4. Run `docker build . -t ghost-server-hoster`

### Ghost-Server-Manager

1. Go into `/Ghost-Server-Manager`
2. Create the files `users.db` and `containers.db` in `./db/`
3. Go into `./web/util/resources.js` and edit the hostname variable to the hostname of your server
4. Go into `./res/` and create a file called `mail_account.json`. That is the email configuration used by the email-client, which sends you for example password reset emails. Fill it according to the following scheme:
```
{
    "service": "your-service (e.g. gmail)",
    "user": "your-email",
    "password": "your-password"
}
```
6. Run `npm install`
7. Run `npm start`

Leave the Ghost-Server-Manager running in the background. It will serve the website and provide the API backend for it.

After a few seconds the server will start on port 8080 ("Server listening on port 8080" in console).
If you want to change that port, go into `/Ghost-Server-Manager/src/index.ts` and change the port in the last line of the file.

That's it! You can now access the website at \<hostname\>:<port (default 8080)>

## Contributing

You can contribute to the project in different ways. You can use the official host of the website ([ghost.portal2.sr](https://ghost.portal2.sr/)) and report bugs either 
here under issues or on Discord by pinging me on the [Portal 2 Speedrun Server](https://discord.gg/2PwGP73t) in #ghost-races or DMing me (Cqnd#2444).

If you want to, you can also fork the project and hack on it yourself. After you are done, PR your changes and they will be reviewed as soon as possible :^).
