import {Component, Entity, Sprite} from "lagom-engine";
import {getNodeName} from "./Graph";
import {Layers, sprites} from "../LD48";

export class FloorNode extends Entity
{
    constructor(readonly shaft: number, readonly level: number, readonly goal?: number)
    {
        super(getNodeName(goal ? "GOAL" : "FLOOR", level, shaft), 120 + 150 * shaft, level * 70 + 50,
            Layers.ELEVATOR_DOOR);
        this.addComponent(new FloorNodeComp());
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Sprite(sprites.texture(3, 1, 16, 16)));
        if (this.goal !== undefined)
        {
            this.addComponent(new Sprite(sprites.textureFromPoints(this.goal * 8, 48, 8, 8)));
        }
    }
}

export class FloorNodeComp extends Component
{
}
