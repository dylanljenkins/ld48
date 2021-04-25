import {AnimatedSpriteController, AnimationEnd, Component, Entity, MathUtil, Scene, System} from "lagom-engine";
import {sprites} from "../LD48";
import {HellGraph, HellLink, HellNode} from "../graph/Graph";
import {Link, Node} from "ngraph.graph";
import {StoppedElevator} from "../Elevator";

export class Guy extends Entity
{
    onAdded()
    {
        super.onAdded();

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
            }]));
    }
}

export class GraphLocation extends Component
{
    constructor(public node: string, public state: "WAITING" | "ELEVATING" | "WALKING" = "WALKING")
    {
        super();
    }
}

export class GraphTarget extends Component
{
    constructor(public node: string)
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
            path.path = this.graph!.pathfind(location.node, target.node);
        })
    }
}

export class GuyMover extends System
{
    readonly speed = 1;

    types = () => [Path, GraphLocation, AnimatedSpriteController];

    update(delta: number)
    {
        this.runOnEntities((entity: Entity, path: Path, guyLocation: GraphLocation, spr: AnimatedSpriteController) =>
        {
            // Found his destination.
            if (path.path.length === 1)
            {
                // TODO score points!
                entity.destroy()
            }

            const currentNode = path.path[path.path.length - 1]
            const nextNode = path.path[path.path.length - 2]
            if (!nextNode) return;

            const nextLink = currentNode.links.find((link) => link.toId === nextNode.id) as Link<HellLink>

            switch (nextLink.data.type)
            {
                case "ELEVATOR":
                {
                    guyLocation.node = nextNode.id as string
                    break;
                }
                case "ALIGHT":
                {
                    const elevator = currentNode.data.type === "ELEVATOR" ? currentNode.data.entity : nextNode.data.entity;

                    const stopped = elevator.getComponent<StoppedElevator>(StoppedElevator);

                    if (stopped)
                    {
                        // Getting onto the elevator.
                        if (guyLocation.state === "WALKING")
                        {
                            // It has to be stopped at our stop.
                            if (nextNode.id === stopped.node)
                            {
                                guyLocation.node = nextNode.id as string
                                guyLocation.state = "WAITING";
                                // TODO make the guy walk onto the elevator.
                            }
                        }
                        // Getting off of the elevator.
                        // TODO make the guy walk off the elevator.
                        else if (guyLocation.state === "ELEVATING")
                        {
                            guyLocation.node = nextNode.id as string;
                            guyLocation.state = "WALKING";
                        }
                    }
                    else
                    {
                        // We're on it, and it's moving.
                        if (guyLocation.state === "WAITING" || guyLocation.state === "ELEVATING")
                        {
                            guyLocation.state = "ELEVATING"
                            entity.transform.x = elevator.transform.x + 5
                            entity.transform.y = elevator.transform.y + 5
                        }
                    }
                    break;
                }
                case "FLOOR":
                {
                    const destination = nextNode.data.entity

                    if (destination !== null)
                    {
                        const targetDir = MathUtil.pointDirection(entity.transform.x, entity.transform.y,
                            destination.transform.x, destination.transform.y);
                        const targetDistance = MathUtil.pointDistance(entity.transform.x, entity.transform.y,
                            destination.transform.x, destination.transform.y);

                        let toMove = this.speed * 100 * (delta / 1000);

                        if (toMove > targetDistance)
                        {
                            toMove = targetDistance;
                            guyLocation.node = nextNode.id as string;
                        }

                        if (toMove > 0)
                        {
                            spr.setAnimation(1, false);
                        } else
                        {
                            spr.setAnimation(0, true);
                        }

                        const movecomp = MathUtil.lengthDirXY(toMove, -targetDir);

                        entity.transform.x += movecomp.x;
                        entity.transform.y += movecomp.y;
                    }
                }
            }
        })
    }
}