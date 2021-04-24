import {AnimatedSpriteController, AnimationEnd, Component, Entity, System} from "lagom-engine";
import {Layers, sprites} from "./LD48";

enum ElevatorStates
{
    Closed,
    Open
}

export class Elevator extends Entity
{
    constructor(x: number, y: number)
    {
        super("elevator", x, y, Layers.ELEVATOR);
    }

    onAdded()
    {
        super.onAdded();

        this.addComponent(new ElevatorComp());

        this.addComponent(new AnimatedSpriteController(ElevatorStates.Closed, [
            {
                id: ElevatorStates.Closed, config: {animationEndAction: AnimationEnd.STOP, animationSpeed: 80},
                textures: sprites.textures([[1, 2], [0, 2], [4, 1]])
            },
            {
                id: ElevatorStates.Open, config: {animationEndAction: AnimationEnd.STOP, animationSpeed: 80},
                textures: sprites.textures([[4, 1], [0, 2], [1, 2]])
            }
        ]));
    }
}

class ElevatorComp extends Component
{
}

export class SwapDoorState extends Component
{
}

export class DoorStateSystem extends System
{
    types = () => [AnimatedSpriteController, SwapDoorState, ElevatorComp];

    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, sprite: AnimatedSpriteController, swapState: SwapDoorState) =>
        {
            swapState.destroy();
            const nextState = sprite.currentState == 0 ? 1 : 0;
            sprite.setAnimation(nextState);
        });
    }
}