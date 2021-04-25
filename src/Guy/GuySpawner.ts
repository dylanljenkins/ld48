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

            const potentialStarts: Node<HellNode>[] = []
            const potentialGoals: Node<HellNode>[] = []

            entity.graph.forEachNode(node =>
            {
                if (node?.data?.type === "FLOOR") potentialStarts.push(node)
                if (node?.data?.type === "GOAL") potentialGoals.push(node)
            })

            const start = potentialStarts[Math.floor(Math.random() * potentialStarts.length)]
            const goal = potentialGoals[Math.floor(Math.random() * potentialGoals.length)]

            const guy = this.getScene().addEntity(
                new Guy("guy", start.data.entity.transform.x, start.data.entity.transform.y, Layers.GUYS));
            guy.addComponent(new Path())
            guy.addComponent(new GraphLocation(start.id))
            guy.addComponent(new GraphTarget(goal.id))
        })
    }
}
