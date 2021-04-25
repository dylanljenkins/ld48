import {AnimatedSpriteController, AnimationEnd, Component, Entity, Sprite} from "lagom-engine";
import {getNodeName} from "./Graph";
import {Layers, portals, sprites} from "../LD48";
import {MathUtil} from "lagom-engine/dist";

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
            const textures = portals.textureSliceFromRow(this.goal % 4, 0, 3);

            // Shift start frame by a bit so it doesn't all look so uniform
            for (let i = 0; i < this.goal; i++)
            {
                textures.push(textures.shift() as any);
            }

            this.addComponent(new AnimatedSpriteController(0, [{
                    textures: textures,
                    config: {
                        animationEndAction: AnimationEnd.LOOP, animationSpeed: 150 + MathUtil.randomRange(-20, 20),
                        yOffset: -16, xOffset: -16
                    },
                    id: 0
                }]
            ));
        }
    }
}

export class FloorNodeComp extends Component
{
}
