import spritesheet from './Art/spritesheet.png';

import {Entity, Game, Scene, Sprite, SpriteSheet} from "lagom-engine";

const sprites = new SpriteSheet(spritesheet, 16, 16);


export class LD48 extends Game {
    constructor() {
        super({width: 1200, height: 700, resolution: 1, backgroundColor: 0xd95763});
        this.setScene(new MainScene(this));
    }
}

class MainScene extends Scene {
    onAdded() {
        super.onAdded();

        this.addEntity(new Guy("guy", 100, 100));
        this.addEntity(new ElevatorDoor("door1", 140, 100));
    }
}

class Guy extends Entity {
    onAdded() {
        super.onAdded();

        this.addComponent(new Sprite(sprites.texture(0, 0, 8, 8)));
    }
}

class ElevatorDoor extends Entity {
    onAdded() {
        super.onAdded();

        this.addComponent(new Sprite(sprites.textureFromIndex(1)));
    }
}