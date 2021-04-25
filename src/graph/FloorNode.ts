import {Component, Entity, Sprite} from "lagom-engine";
import {getNodeName} from "./Graph";
import {Layers, sprites} from "../LD48";

export class FloorNode extends Entity
{
    level: number
    shaft: number

    constructor(shaft: number, level: number)
    {
        super(getNodeName("FLOOR", level, shaft), 120 + 150 * shaft, level * 70 + 50, Layers.ELEVATOR_DOOR);
        this.addComponent(new FloorNodeComp());
        this.level = level;
        this.shaft = shaft;
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Sprite(sprites.texture(3, 1, 16, 16)));
    }
}

export class FloorNodeComp extends Component
{
}