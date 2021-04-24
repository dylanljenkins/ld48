import {Entity, Sprite} from "lagom-engine";
import {Layers, sprites} from "./LD48";

export class Elevator extends Entity
{
    constructor(x: number, y: number)
    {
        super("name", x, y, Layers.ELEVATOR);
    }

    onAdded()
    {
        super.onAdded();

        this.addComponent(new Sprite(sprites.texture(4, 1, 16, 16)));
    }
}