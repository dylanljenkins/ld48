import {System} from "lagom-engine";
import {HellGraph, HellGraphComponent, HellNode} from "../graph/Graph";
import {GraphLocation, GraphTarget, Guy, Path} from "./Guy";
import {Layers} from "../LD48";
import {Node} from "ngraph.graph";

export class GuySpawner extends System
{
    private timeout = 2000;

    types = () => [HellGraphComponent]

    update(delta: number): void
    {
        this.runOnEntities((entity: HellGraph) =>
        {
            this.timeout -= delta
            if (this.timeout > 0) return;

            this.timeout = 2000;

            const nodes: Node<HellNode>[] = []

            entity.graph.forEachNode(node =>
            {
                if (node?.data?.type === "FLOOR") nodes.push(node)
            })

            const start = nodes[Math.floor(Math.random() * nodes.length)]

            // Start can't be goal
            const potentialGoals = nodes.filter(node => node !== start)

            const goal = potentialGoals[Math.floor(Math.random() * potentialGoals.length)]

            const guy = this.getScene().addEntity(
                new Guy("guy", start.data.entity.transform.x, start.data.entity.transform.y, Layers.GUYS));
            guy.addComponent(new Path())
            guy.addComponent(new GraphLocation(start.id))
            guy.addComponent(new GraphTarget(goal.id))
        })
    }
}
