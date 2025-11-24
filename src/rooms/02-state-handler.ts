import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Vector2Float extends Schema {
    @type("number") x: number;
    @type("number") z: number;

    constructor(x: number, z: number) {
        super();
        this.x = x;
        this.z = z;
    }
}

export class Vector3Float extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") z: number;

    constructor(x: number, y: number, z: number) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

export class Player extends Schema {
    @type(Vector2Float) position: Vector2Float;
    @type("number") rotationY = 0;
    @type("number") speed = 0;
}

export class RestartInfo extends Schema {
    @type("string") playerId: string;
    @type(Player) player: Player;

    constructor(playerId: string, player: Player) {
        super();
        this.playerId = playerId;
        this.player = player;
    }
}

export class State extends Schema {
    fieldSize = 15;

    @type({ map: Player })
    players = new MapSchema<Player>();

    createPlayer(sessionId: string) {
        const player = new Player();
        player.position = this.getRandomFieldPoint();
        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer (sessionId: string, data: any) {
        const player = this.players.get(sessionId);
        player.position = new Vector2Float(data.positionX, data.positionZ);
        player.rotationY = data.rotationY;
    }

    getRandomFieldPoint(): Vector2Float {
        const x = Math.floor(Math.random() * this.fieldSize) - this.fieldSize / 2;
        const z = Math.floor(Math.random() * this.fieldSize) - this.fieldSize / 2;

        return new Vector2Float(x, z);
    }
}

export class StateHandlerRoom extends Room {
    maxClients = 4;
    state = new State();

    onCreate (options) {
        console.log("StateHandlerRoom created!", options);

        this.onMessage("move", (client, data) => {
            this.state.movePlayer(client.sessionId, data);
        });

        this.onMessage("startSlap", (client, data) => {
            console.log("start slap", data);
            this.broadcast("startSlap", data, {except: client});
        });

        this.onMessage("slapPunch", (client, data) => {
            console.log("slap punch", data);
            this.broadcast("slapPunch", data, {except: client});
        });

        this.onMessage("restart", (client, playerId) => {
            console.log("restart", playerId);
            const player = this.state.players.get(playerId);
            player.position = this.state.getRandomFieldPoint();
            const restartInfo = new RestartInfo(playerId, player);
            const json = JSON.stringify(restartInfo);
            this.broadcast("restart", json);
        });
    }

    // onAuth(client, options, req) {
    //     return true;
    // }

    onJoin (client: Client) {
        console.log(client.sessionId, "joined!");
        this.state.createPlayer(client.sessionId);
    }

    onLeave (client) {
        console.log(client.sessionId, "left!");
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }

}
