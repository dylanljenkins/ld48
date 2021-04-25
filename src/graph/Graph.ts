import Ngraph, {Graph, Link, Node, NodeId} from "ngraph.graph";
import {aStar, PathFinderOptions} from "ngraph.path";
import {Component, Entity, Scene} from "lagom-engine";
import {Elevator} from "../Elevator";
import {hellLayout} from "../LD48";
import {FloorNode, GoalType} from "./FloorNode";

export interface HellLink
{
    type: "FLOOR" | "ELEVATOR" | "ALIGHT",
    distance: number,
}

type HellNodeType = "FLOOR" | "ELEVATOR" | "GOAL"

export interface HellNode
{
    type: HellNodeType
    entity: Entity
}

export class HellGraphComponent extends Component
{
}

export class HellGraph extends Entity
{
    private levels = 5;
    private shafts = 4;
    public graph: Graph<HellNode, HellLink> = Ngraph();

    constructor()
    {
        super("HellGraph");
        this.addComponent(new HellGraphComponent());
    }

    public initGraph()
    {
        for (let level = 0; level < this.levels; level++)
        {
            const levelLayout = hellLayout[level];
            for (let i = 0; i < 3; i++)
            {
                const thisShaft = levelLayout[i];

                switch (thisShaft)
                {
                    case 0:
                    {
                        const floor1 = this.addFloor(level, i)
                        const floor2 = this.addGoal(level, i + 0.5, GoalType.RED);
                        this.addFloorLink(floor1, floor2);
                        break;
                    }
                    case 1:
                    {
                        const floor1 = this.addFloor(level, i);
                        const floor2 = this.addFloor(level, i + 1);
                        this.addFloorLink(floor1, floor2);
                        break;
                    }
                    case 2:
                    {
                        const floor1 = this.addFloor(level, i);
                        const floor2 = this.addGoal(level, i + 0.5, GoalType.BLUE);
                        const floor3 = this.addFloor(level, i + 1);
                        this.addFloorLink(floor1, floor2);
                        this.addFloorLink(floor2, floor3);
                        break;
                    }
                    case 3:
                    {
                        const floor1 = this.addGoal(level, i + 0.5, GoalType.YELLOW);
                        const floor2 = this.addFloor(level, i + 1);
                        this.addFloorLink(floor1, floor2);
                        break;
                    }
                }
            }
        }
    }

    public addElevator(startLevel: number, endLevel: number, shaft: number, scene: Scene): Elevator
    {
        if (startLevel >= this.levels || startLevel < 0 ||
            endLevel >= this.levels || endLevel < 0 ||
            startLevel === endLevel ||
            shaft >= this.shafts || shaft < 0)
        {
            throw Error(`Elevator is invalid. Start: ${startLevel}, End: ${endLevel}, Shaft: ${shaft}`)
        }

        const elevator = new Elevator(startLevel, endLevel, shaft);

        const start = this.addNode("ELEVATOR", startLevel, shaft, elevator)
        const end = this.addNode("ELEVATOR", endLevel, shaft, elevator)

        this.addLink(start, end, {type: "ELEVATOR", distance: 1})

        // Add links for the elevators and the start/end floors.
        this.addLink(start, getNodeName("FLOOR", startLevel, shaft), {type: "ALIGHT", distance: 15})
        this.addLink(end, getNodeName("FLOOR", endLevel, shaft), {type: "ALIGHT", distance: 15})

        // Spawn the elevator.
        return scene.addEntity(elevator);
    }

    public pathfind(startNode: string | number, endNode: string | number): Node<HellNode>[]
    {
        const options: PathFinderOptions<HellNode, HellLink> = {
            distance: (from, to, link) => link.data.distance
        }

        const astar = aStar(this.graph, options)

        return astar.find(startNode, endNode);
    }

    public printGraph()
    {
        const nodes: Node<HellNode>[] = [];
        this.graph.forEachNode((node) =>
        {
            nodes.push(node)
        })
        console.log(nodes);

        const links: Link<HellLink>[] = [];
        this.graph.forEachLink((link =>
        {
            links.push(link)
        }))
        console.log(links);
    }

    private addGoal(level: number, shaft: number, goal: GoalType)
    {
        const entity = this.getScene().addEntity(new FloorNode(shaft, level, goal))
        return this.addNode("GOAL", level, shaft, entity)
    }

    private addFloor(level: number, shaft: number): string
    {
        const entity = this.getScene().addEntity(new FloorNode(shaft, level))
        return this.addNode("FLOOR", level, shaft, entity)
    }

    private addNode(type: HellNodeType, level: number, shaft: number, entity: Entity): string
    {
        const name = getNodeName(type, level, shaft);
        this.graph.addNode(name, {type: type, entity: entity});
        return name;
    }

    private addFloorLink(node1: NodeId, node2: NodeId)
    {
        this.addLink(node1, node2, {type: "FLOOR", distance: 0})
    }

    private addLink(node1: NodeId, node2: NodeId, link: HellLink)
    {
        this.graph.addLink(node1, node2, link)
        this.graph.addLink(node2, node1, link)
    }
}

export const getNodeName = (type: HellNodeType | "DROP", level: number, shaft: number) =>
    `${type}: Level ${level}, Shaft ${shaft}`
