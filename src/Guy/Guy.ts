import {Component, Entity, Sprite, System} from "lagom-engine";
import {graph, sprites} from "../LD48";
import {HellNode} from "../graph/Graph";
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