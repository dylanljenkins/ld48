import {
    AnimatedSprite,
    AnimatedSpriteController,
    AnimationEnd,
    Component,
    Entity,
    Log,
    MathUtil,
    Scene,
    ScreenShake,
    Sprite,
    System,
    Timer
} from "lagom-engine";
import {Layers, sprites} from "../LD48";
import {HellGraph, HellLink, HellNode} from "../graph/Graph";
import {Link, Node} from "ngraph.graph";
import {DropMe, StoppedElevator} from "../Elevator";
import {getCenterCoords} from "../Util";
import {Score} from "../Score";

export class Guy extends Entity
{
    constructor(x: number, y: number, readonly goalId: number)
    {
        super("guy", x, y, Layers.GUYS);
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Sprite(sprites.textureFromPoints(this.goalId * 8, 48, 8, 8),
            {xOffset: 4, yOffset: -4, xAnchor: 0.5, yAnchor: 0.5}));
        this.addComponent(new AnimatedSpriteController(0, [
            {
                id: 0,
                textures: [sprites.texture(0, 0, 8, 8)]
            },
            {
                id: 1,
                textures: [sprites.texture(0, 0, 8, 8),
                           sprites.textureFromPoints(8, 0, 8, 8)],
                config: {
                    animationEndAction: AnimationEnd.LOOP,
                    animationSpeed: 100
                }
            }
        ]));

        // After 15 seconds, trigger stage 1.
        this.addComponent(new Timer(15000, null)).onTrigger.register(caller => {
            caller.parent.addComponent(new SpinMe(2));

            // After 20 seconds, increase spin speed
            caller.parent.addComponent(new Timer(10000, null)).onTrigger.register(caller2 =>
            {
                const sp = caller2.getEntity().getComponent<SpinMe>(SpinMe);
                if (sp !== null) sp.speed = 4;
                caller2.parent.addComponent(new Timer(10000, null)).onTrigger.register(caller3 => {
                    const sp = caller3.getEntity().getComponent<SpinMe>(SpinMe);
                    if (sp !== null) sp.speed = 6;

                    caller3.parent.addComponent(new Timer(10000, null)).onTrigger.register(caller4 => {
                        // POP
                        caller4.parent.addComponent(new AnimatedSprite(sprites.textureSliceFromRow(4, 0, 7),
                            {
                                animationEndAction: AnimationEnd.STOP,
                                animationSpeed: 100,
                                xOffset: -4,
                                yOffset: -4
                            }));
                        caller4.parent.addComponent(new ScreenShake(0.1, 500));

                        caller4.parent.addComponent(new Timer(700, null)).onTrigger.register(caller5 => {
                            caller5?.parent?.getScene().getEntityWithName("scoredisp")?.getComponent<Score>(Score)
                                   ?.sub1(caller5.parent);
                            caller5?.parent.destroy();
                        })
                    });
                });
            });
        });
    }
}

class SpinMe extends Component
{
    constructor(public speed: number)
    {
        super();
    }
}

export class Spinner extends System
{
    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, sprite: Sprite, spin: SpinMe) => {
            sprite.applyConfig({rotation: sprite.pixiObj.rotation + spin.speed * (delta / 1000)});
        });
    }

    types = () => [Sprite, SpinMe];
}

export class GuyDestroyer extends System
{
    types = () => [Path]

    update(delta: number)
    {
        this.runOnEntities((guy: Guy) => {
            if (guy.transform.position.y > 390)
            {
                guy?.parent?.getScene().getEntityWithName("scoredisp")?.getComponent<Score>(Score)?.sub1(guy, true);
                guy.destroy();
            }
        })
    }
}

export class GraphLocation extends Component
{
    public elevatorX = ((Math.random() - 0.5) * 8) + 4
    public elevatorY = ((Math.random() - 0.5) * 8) + 4

    constructor(public node: string | number, public onElevator = false)
    {
        super();
    }
}

export class GraphTarget extends Component
{
    constructor(public node: string | number)
    {
        super();
    }
}

export class Path extends Component
{
    path: Node<HellNode>[] = []
}

export class Pathfinder extends System
{
    types = () => [GraphLocation, GraphTarget, Path];

    private graph: HellGraph | undefined;

    addedToScene(scene: Scene)
    {
        super.addedToScene(scene);
        this.graph = this.getScene().getEntityWithName<HellGraph>("HellGraph") ?? undefined
    }

    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, location: GraphLocation, target: GraphTarget, path: Path) =>
        {
            try
            {
                path.path = this.graph!.pathfind(location.node, target.node);
            }
            catch (e)
            {
                Log.info("Cancelled pathfinding as node went missing.")
            }
        })
    }
}

export class GuyMover extends System
{
    types = () => [Path, GraphLocation, AnimatedSpriteController];

    update(delta: number)
    {
        this.runOnEntities((entity: Entity, path: Path, guyLocation: GraphLocation, spr: AnimatedSpriteController) =>
        {
            // Found his destination.
            if (path.path.length === 1)
            {
                const portal = entity?.parent?.getScene()?.getEntityWithName(guyLocation.node.toString());
                if (portal !== undefined && portal !== null)
                {
                    const anim = portal.addComponent(new AnimatedSpriteController(0, [{
                        textures: sprites.textures([[0, 6], [2, 6], [4, 6], [6, 6]], 32, 32),
                        id: 0,
                        config: {yOffset: -16, xOffset: -8, animationSpeed: 100}
                    }]));
                    portal.addComponent(new Timer(400, anim)).onTrigger.register((caller, data) => {
                        data.destroy();
                    });
                }

                entity?.parent?.getScene().getEntityWithName("scoredisp")?.getComponent<Score>(Score)?.add1(entity);
                entity.destroy()
            }

            const currentNode = path.path[path.path.length - 1]
            const nextNode = path.path[path.path.length - 2]

            if (!nextNode)
            {
                if (guyLocation.onElevator)
                {
                    // We lost our path and we were on an elevator.
                    // This is the way.
                    entity.addComponent(new DropMe(50))
                }

                spr.setAnimation(0, true)
                return;
            }

            const nextLink = currentNode?.links?.find((link) => link.toId === nextNode.id) as Link<HellLink> | undefined

            // For this to be the case, they are falling with an elevator.
            if (!nextLink)
            {
                const elevator = currentNode.data.entity
                entity.transform.x = elevator.transform.x + guyLocation.elevatorX
                entity.transform.y = elevator.transform.y + guyLocation.elevatorY
                return;
            }

            switch (nextLink.data.type)
            {
                case "ELEVATOR":
                {
                    guyLocation.node = nextNode.id as string
                    break;
                }
                case "ALIGHT":
                {
                    const elevator = currentNode.data.type === "ELEVATOR" ? currentNode.data.entity
                                                                          : nextNode.data.entity;

                    const stopped = elevator.getComponent<StoppedElevator>(StoppedElevator);

                    if (guyLocation.onElevator)
                    {
                        // Slightly random position in elevator based on var on guy.
                        entity.transform.x = elevator.transform.x + guyLocation.elevatorX
                        entity.transform.y = elevator.transform.y + guyLocation.elevatorY

                        if (stopped && currentNode.id === stopped.node)
                        {
                            // Get off elevator.
                            guyLocation.node = nextNode.id as string;
                            guyLocation.onElevator = false;
                        }
                    }
                    else
                    {
                        if (stopped && nextNode.id === stopped.node)
                        {
                            // Get on elevator.
                            GuyMover.moveTowards(entity, nextNode, 0.25, delta, spr, guyLocation);
                        }
                        else
                        {
                            // Dance around waiting.
                            entity.transform.x += (Math.random() - 0.5) * 0.2
                            entity.transform.y += (Math.random() - 0.5) * 0.2
                        }
                    }
                    break;
                }
                case "FLOOR":
                {
                    GuyMover.moveTowards(entity, nextNode, 0.5, delta, spr, guyLocation)
                }
            }
        })
    }

    private static moveTowards(source: Entity, destination: Node<HellNode>,
                               speed: number, delta: number,
                               sprite: AnimatedSpriteController,
                               location: GraphLocation)
    {
        const guy = getCenterCoords(source)
        const dest = getCenterCoords(destination.data.entity)

        switch (destination.data.type)
        {
            case "ELEVATOR":
                break;
            case "GOAL":
                dest.x -= 8;
                dest.y -= 4;
                break;
            case "FLOOR":
                dest.y += 10;
                break;
        }

        const targetDir = MathUtil.pointDirection(guy.x, guy.y, dest.x, dest.y);
        const targetDistance = MathUtil.pointDistance(guy.x, guy.y, dest.x, dest.y);

        let toMove = speed * 100 * (delta / 1000);

        if (toMove > targetDistance)
        {
            toMove = targetDistance;
        }

        if (toMove > 0)
        {
            sprite.setAnimation(1, false);
        }
        else
        {
            location.node = destination.id as string;

            if (destination.data.type === "ELEVATOR")
            {
                location.onElevator = true;
            }

            sprite.setAnimation(0, true);
        }

        const movecomp = MathUtil.lengthDirXY(toMove, -targetDir);

        source.transform.x += movecomp.x;
        source.transform.y += movecomp.y;
    }
}
