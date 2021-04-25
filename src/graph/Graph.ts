import Ngraph, {Graph, Link, Node, NodeId} from "ngraph.graph";
import {aStar, PathFinderOptions} from "ngraph.path";
import {Entity, Scene} from "lagom-engine";
import {Elevator} from "../Elevator";
import {FloorNode, hellLayout} from "../LD48";

export interface HellLink
{
    type: "FLOOR" | "ELEVATOR" | "ALIGHT",
    distance: number,
    elevator: Elevator | null
}

type HellNodeType = "FLOOR" | "ELEVATOR"

export interface HellNode
{
    type: HellNodeType
    entity: Entity
}

export class HellGraph extends Entity
{
    private levels = 5;
    private shafts = 4;
    public graph: Graph<HellNode, HellLink> = Ngraph();

    constructor()
    {
        super("HellGraph");
        //
        // for (let shaft = 0; shaft < this.shafts; shaft++)
        // {
        //     this.graph.addNode(getNodeName("FLOOR", level, shaft), {type: "FLOOR"})
        //
        //     if (shaft !== 0)
        //     {
        //         // Link floors on the same level together.
        //         this.addLink(getNodeName("FLOOR", level, shaft), getNodeName("FLOOR", level, shaft - 1),
        //             {type: "FLOOR", distance: 1})
        //     }
        // }
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
                        this.addFloor(level, i)
                        this.addFloor(level, i + 0.5);
                        this.addLink(getNodeName("FLOOR", level, i), getNodeName("FLOOR", level, i + 0.5), {
                            type: "FLOOR",
                            distance: 0,
                            elevator: null
                        });
                        break;
                    }
                    case 1:
                    {
                        this.addFloor(level, i);
                        this.addFloor(level, i + 1);
                        this.addLink(getNodeName("FLOOR", level, i), getNodeName("FLOOR", level, i + 1), {
                            type: "FLOOR",
                            distance: 0,
                            elevator: null
                        });
                        break;
                    }
                    case 2:
                    {
                        this.addFloor(level, i);
                        this.addFloor(level, i + 0.5);
                        this.addFloor(level, i + 1);
                        this.addLink(getNodeName("FLOOR", level, i), getNodeName("FLOOR", level, i + 0.5), {
                            type: "FLOOR",
                            distance: 0,
                            elevator: null
                        });
                        this.addLink(getNodeName("FLOOR", level, i + 0.5), getNodeName("FLOOR", level, i + 1), {
                            type: "FLOOR",
                            distance: 0,
                            elevator: null
                        });
                        break;
                    }
                    case 3:
                    {
                        this.addFloor(level, i + 0.5);
                        this.addFloor(level, i + 1);
                        this.addLink(getNodeName("FLOOR", level, i + 0.5), getNodeName("FLOOR", level, i + 1), {
                            type: "FLOOR",
                            distance: 0,
                            elevator: null
                        });
                        break;
                    }
                }
            }
        }
    }

    public addElevator(startLevel: number, endLevel: number, shaft: number, scene: Scene)
    {
        if (startLevel >= this.levels || startLevel < 0 ||
            endLevel >= this.levels || endLevel < 0 ||
            startLevel === endLevel ||
            shaft >= this.shafts || shaft < 0)
        {
            throw Error(`Elevator is invalid. Start: ${startLevel}, End: ${endLevel}, Shaft: ${shaft}`)
        }

        const elevator = new Elevator(startLevel, endLevel, shaft);

        const start = getNodeName("ELEVATOR", startLevel, shaft)
        const end = getNodeName("ELEVATOR", endLevel, shaft)

        this.addNode("ELEVATOR", startLevel, shaft, elevator)
        this.addNode("ELEVATOR", endLevel, shaft, elevator)

        this.addLink(start, end, {type: "ELEVATOR", distance: 1, elevator: null})

        // Add links for the elevators and the start/end floors.
        this.addLink(start, getNodeName("FLOOR", startLevel, shaft), {type: "ALIGHT", distance: 15, elevator: elevator})
        this.addLink(end, getNodeName("FLOOR", endLevel, shaft), {type: "ALIGHT", distance: 15, elevator: elevator})

        // Spawn the elevator.
        scene.addEntity(elevator);
    }

    public pathfind(startNode: string, endNode: string): Node<HellNode>[]
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

    // private addElevator()
    // {
    //
    // }

    private addFloor(level: number, shaft: number)
    {
        const entity = this.getScene().addEntity(new FloorNode(shaft, level))
        this.addNode("FLOOR", level, shaft, entity)
    }

    private addNode(type: HellNodeType, level: number, shaft: number, entity: Entity)
    {
        this.graph.addNode(getNodeName(type, level, shaft), {type: type, entity: entity})
    }

    private addLink(node1: NodeId, node2: NodeId, link: HellLink)
    {
        this.graph.addLink(node1, node2, link)
        this.graph.addLink(node2, node1, link)
    }
}

export const getNodeName = (type: "FLOOR" | "ELEVATOR" | "DROP", level: number, shaft: number) =>
    `${type}: Level ${level}, Shaft ${shaft}`