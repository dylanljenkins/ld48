import {MathUtil, Sprite, System} from "lagom-engine";
import {HellGraph, HellGraphComponent, HellNode} from "../graph/Graph";
import {GraphLocation, GraphTarget, Guy, Path} from "./Guy";
import {Layers, sprites} from "../LD48";
import {Node} from "ngraph.graph";

export class GuySpawner extends System
{
    private timeout = 5000;

    types = () => [HellGraphComponent]

    update(delta: number): void
    {
        this.runOnEntities((entity: HellGraph) =>
        {
            this.timeout -= delta
            if (this.timeout > 0) return;

            this.timeout = 5000;

            const potentialStarts: Node<HellNode>[] = []
            const potentialGoals: Node<HellNode>[] = []

            entity.graph.forEachNode(node =>
            {
                if (node?.data?.type === "FLOOR") potentialStarts.push(node)
                if (node?.data?.type === "GOAL") potentialGoals.push(node)
            })

            const start = potentialStarts[Math.floor(Math.random() * potentialStarts.length)]

            // This should only go to 4, any more than 4 potential goals will not be used.
            const goalId = MathUtil.randomRange(0, 4);
            const goal = potentialGoals[goalId];

            const guy = this.getScene().addEntity(
                new Guy("guy", start.data.entity.transform.x, start.data.entity.transform.y, Layers.GUYS));
            guy.addComponent(new Path())
            guy.addComponent(new GraphLocation(start.id))
            guy.addComponent(new GraphTarget(goal.id))
            guy.addComponent(new Sprite(sprites.textureFromPoints(goalId * 8, 48, 8, 8), {yOffset: -8}));
        })
    }
}
