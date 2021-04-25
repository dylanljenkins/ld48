import {
    AnimatedSpriteController,
    AnimationEnd,
    Component,
    Entity,
    ScreenShake,
    Sprite,
    System,
    Timer
} from "lagom-engine";
import {Layers, sprites} from "./LD48";
import {getNodeName, HellGraph} from "./graph/Graph";

enum ElevatorStates
{
    Closed,
    Open
}

class ElevatorFollower extends Component
{
    constructor(readonly elevator: Elevator)
    {
        super();
    }
}

export class ElevatorFollowSystem extends System
{
    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, follow: ElevatorFollower) => {
            entity.transform.x = follow.elevator.transform.x;
            entity.transform.y = follow.elevator.transform.y;
        });
    }

    types = () => [ElevatorFollower];
}

export class Elevator extends Entity
{
    private backing?: Entity;

    constructor(readonly startLevel: number, readonly endLevel: number, readonly shaft: number,
                readonly reverseStart = false)
    {
        super("elevator", 100 + 150 * shaft, (reverseStart ? endLevel : startLevel) * 70 + 50, Layers.ELEVATOR_DOOR);
    }

    onRemoved()
    {
        this.backing?.destroy();
        super.onRemoved();
    }

    onAdded()
    {
        super.onAdded();

        this.addComponent(new ElevatorComp(this.startLevel, this.endLevel, this.shaft));

        this.backing = this.getScene().addEntity(
            new Entity("elevatorbacking", this.transform.x, this.transform.y, Layers.ELEVATOR));
        this.backing?.addComponent(new ElevatorFollower(this));
        this.backing?.addComponent(new Sprite(sprites.texture(2, 3)));


        if (this.reverseStart)
        {
            this.addComponent(new ElevatorDestination(this.endLevel, "DOWN"));
        }
        else
        {
            this.addComponent(new ElevatorDestination(this.startLevel, "UP"));
        }

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

export class ElevatorDestination extends Component
{
    constructor(public destinationLevel: number, public direction: "UP" | "DOWN")
    {
        super();
    }
}

export class StoppedElevator extends Component
{
    public node: string;

    public constructor(level: number, shaft: number)
    {
        super();
        this.node = getNodeName("ELEVATOR", level, shaft)
    }

}

export class DropMe extends Component
{
    hasBeenDeletedFromGraph = false;

    constructor(public speed: number, readonly accelerate = true)
    {
        super();
    }
}

export class EntityDropper extends System
{
    types = () => [DropMe];

    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, dropMe: DropMe) =>
        {
            if (dropMe.accelerate) dropMe.speed *= 1.02
            entity.transform.position.y += dropMe.speed * (delta / 1000)
        });
    }

}

export class ElevatorDestroyer extends System
{
    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, falling: DropMe) =>
        {
            if (!falling.hasBeenDeletedFromGraph)
            {
                const elevator = entity.getComponent<ElevatorComp>(ElevatorComp)!;
                const graph = this.getScene().getEntityWithName<HellGraph>("HellGraph")
                graph!.destroyElevator(elevator.startLevel, elevator.endLevel, elevator.shaft)
                falling.hasBeenDeletedFromGraph = true;
            }

            if (entity.transform.position.y > 400)
            {
                entity.destroy();
                this.getScene().getEntityWithName<HellGraph>("HellGraph")?.addComponent(new ScreenShake(0.25, 150));
            }
        });
    }

    types = () => [DropMe, ElevatorComp];
}

export class ElevatorMover extends System
{
    types = () => [ElevatorDestination, ElevatorComp];

    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, destination: ElevatorDestination, elevator: ElevatorComp) =>
        {
            // Check if we are there.
            const destY = destination.destinationLevel * 70 + 50;
            const distanceToGoal = destY - entity.transform.y
            let moveDist = Math.min(70 * (delta / 1000), Math.abs(distanceToGoal));
            moveDist *= Math.sign(distanceToGoal);

            entity.transform.y += moveDist;

            // We made it.
            if (moveDist === distanceToGoal)
            {
                entity.addComponent(new StoppedElevator(destination.destinationLevel, elevator.shaft))
                destination.destroy();

                // TODO make this able to handle stops
                let dest: ElevatorDestination;
                if (elevator.endLevel == destination.destinationLevel)
                {
                    dest = new ElevatorDestination(elevator.startLevel, "UP")
                }
                else
                {
                    dest = new ElevatorDestination(elevator.endLevel, "DOWN")
                }

                entity.addComponent(new SwapDoorState());
                const timer = entity.addComponent(new Timer(2000, dest, false));
                timer.onTrigger.register((caller: Timer<ElevatorDestination>, data: ElevatorDestination) =>
                {
                    entity.addComponent(new SwapDoorState());
                    const restartTimer = entity.addComponent(new Timer(500, data, false));
                    restartTimer.onTrigger.register((caller1, data1) =>
                    {
                        caller.parent.addComponent(data1);

                        const stoppedInfo = caller.parent.getComponent<StoppedElevator>(StoppedElevator)
                        if (stoppedInfo === null) return;
                        caller.parent.removeComponent(stoppedInfo, true)
                    });
                });
            }
        });
    }
}

export class ElevatorComp extends Component
{
    constructor(readonly startLevel: number, readonly endLevel: number, readonly shaft: number)
    {
        super();
    }
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
