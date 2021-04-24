import {Component, Entity, MathUtil, Sprite, System} from "lagom-engine";
import {graph, sprites} from "../LD48";
import {getNodeName, HellNode} from "../graph/Graph";
import {Node} from "ngraph.graph";

export class Guy extends Entity
{
    onAdded()
    {
        super.onAdded();

        this.addComponent(new Sprite(sprites.texture(0, 0, 8, 8)));
    }
}

export class GraphLocation extends Component
{
    node: string

    constructor(node: string)
    {
        super();
        this.node = node
    }
}

export class GraphTarget extends Component
{
    node: string

    constructor(node: string)
    {
        super();
        this.node = node
    }
}

export class Path extends Component
{
    path: Node<HellNode>[] = []
}

export class Pathfinder extends System
{
    types = () => [GraphLocation, GraphTarget, Path];

    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, location: GraphLocation, target: GraphTarget, path: Path) => {
            path.path = graph.pathfind(location.node, target.node);
        })
    }
}

export class GuyMover extends System
{
    readonly speed = 1;

    types = () => [Path, GraphLocation];

    update(delta: number)
    {
        this.runOnEntities((entity: Entity, path: Path, location: GraphLocation) => {

            const moveAmt = this.speed * 100 * (delta / 1000);

            // Get second last node. Last node is where we are now.
            const nextNode = path.path[path.path.length - 2]
            if (!nextNode) return;

            const destination = this.scene.getEntityWithName(nextNode.id as string)


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
                    location.node = nextNode.id as string;
                }

                const movecomp = MathUtil.lengthDirXY(toMove, -targetDir);

                entity.transform.x += movecomp.x;
                entity.transform.y += movecomp.y;
            }
        })
    }
}