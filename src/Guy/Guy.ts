import {AnimatedSpriteController, AnimationEnd, Component, Entity, MathUtil, Scene, System} from "lagom-engine";
import {sprites} from "../LD48";
import {HellGraph, HellLink, HellNode} from "../graph/Graph";
import {Link, Node} from "ngraph.graph";
import {StoppedElevator} from "../Elevator";
import {getCenterCoords} from "../Util";

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
    constructor(public node: string, public onElevator = false)
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
            const moveTowards = (destination: Entity, speed: number) =>
            {
                const guy = getCenterCoords(entity)
                const dest = getCenterCoords(destination)

                const targetDir = MathUtil.pointDirection(guy.x, guy.y, dest.x, dest.y);
                const targetDistance = MathUtil.pointDistance(guy.x, guy.y, dest.x, dest.y);

                let toMove = speed * 100 * (delta / 1000);

                if (toMove > targetDistance)
                {
                    toMove = targetDistance;
                }

                if (toMove > 0)
                {
                    spr.setAnimation(1, false);
                }
                else
                {
                    guyLocation.node = nextNode.id as string;

                    if (nextNode.data.type === "ELEVATOR")
                    {
                        guyLocation.onElevator = true;
                    }

                    spr.setAnimation(0, true);
                }

                const movecomp = MathUtil.lengthDirXY(toMove, -targetDir);

                entity.transform.x += movecomp.x;
                entity.transform.y += movecomp.y;
            }

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

                    if (guyLocation.onElevator)
                    {
                        // TODO slightly random position in elevator based on var on guy.
                        entity.transform.x = elevator.transform.x + 4
                        entity.transform.y = elevator.transform.y + 4

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
                            const dest = nextNode.data.entity

                            moveTowards(dest, 0.5)
                        }
                        else
                        {
                            // Dance around waiting.
                            entity.transform.x += (Math.random() - 0.5) * 0.9
                            entity.transform.y += (Math.random() - 0.5) * 0.9
                        }
                    }
                    break;
                }
                case "FLOOR":
                {
                    const destination = nextNode.data.entity

                    if (destination !== null)
                    {
                        moveTowards(destination, 1)
                    }
                }
            }
        })
    }
}