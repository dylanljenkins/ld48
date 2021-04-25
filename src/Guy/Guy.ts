import {AnimatedSpriteController, AnimationEnd, Component, Entity, Log, MathUtil, Scene, System} from "lagom-engine";
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
                entity.destroy()
            }

            const moveAmt = this.speed * 100 * (delta / 1000);

            // Get second last node. Last node is where we are now.
            const currentNode = path.path[path.path.length - 1]
            const nextNode = path.path[path.path.length - 2]
            if (!nextNode) return;

            const nextLink = currentNode.links.find((link) => link.toId === nextNode.id) as Link<HellLink>

            if (nextLink.data.type === "ELEVATOR")
            {
                guyLocation.node = nextNode.id as string
                return;
            }

            if (nextLink.data.type === "ALIGHT")
            {
                const elevator = nextLink.data.elevator;

                if (elevator === null) throw Error("Bad");

                const stopped = elevator.getComponent<StoppedElevator>(StoppedElevator);

                if (stopped)
                {
                    // Getting onto the elevator.
                    if (guyLocation.state === "WALKING")
                    {
                        // It's our stop!
                        if (nextNode.id === stopped.node)
                        {
                            guyLocation.node = nextNode.id as string
                            guyLocation.state = "WAITING";
                        }
                    }
                    // Getting off of the elevator.
                    else if (guyLocation.state === "ELEVATING")
                    {
                        guyLocation.node = nextNode.id as string;
                        guyLocation.state = "WALKING";
                    }
                }
                else {

                    // We're on it, and it's moving.
                    if (guyLocation.state === "WAITING")
                    {
                        guyLocation.state = "ELEVATING"
                    }

                    if (guyLocation.state === "ELEVATING")
                    {
                        entity.transform.x = elevator.transform.x + 5
                        entity.transform.y = elevator.transform.y + 5
                    }
                }

                return;
            }

            const destination = nextNode.data.entity

            if (destination !== null)
            {
                const targetDir = MathUtil.pointDirection(entity.transform.x, entity.transform.y,
                    destination.transform.x, destination.transform.y);
                const targetDistance = MathUtil.pointDistance(entity.transform.x, entity.transform.y,
                    destination.transform.x, destination.transform.y);

                let toMove = moveAmt;

                // We will move too far, cap it so we can move accurately in another loop
                if (toMove > targetDistance)
                {
                    toMove = targetDistance;
                    guyLocation.node = nextNode.id as string;
                }

                if (toMove > 0) {
                    spr.setAnimation(1, false);
                } else {
                    spr.setAnimation(0, true);
                }

                const movecomp = MathUtil.lengthDirXY(toMove, -targetDir);

                entity.transform.x += movecomp.x;
                entity.transform.y += movecomp.y;
            }
        })
    }
}