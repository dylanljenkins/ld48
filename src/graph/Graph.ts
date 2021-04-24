import Ngraph, {Graph, Link, Node, NodeId} from "ngraph.graph";
import {aStar, PathFinderOptions} from "ngraph.path";
import {Scene} from "../../../lagom-engine";
import {Elevator} from "../Elevator";

export interface HellLink
{
    type: "FLOOR" | "ELEVATOR" | "ALIGHT",
    distance: number,
    elevator: Elevator | null
}

export interface HellNode
{
    type: "FLOOR" | "ELEVATOR"
}

export class HellGraph
{
    private levels = 5;
    private shafts = 4;
    public graph: Graph<HellNode, HellLink> = Ngraph();

    constructor()
    {
        for (let level = 0; level < this.levels; level++)
        {
            for (let shaft = 0; shaft < this.shafts; shaft++)
            {
                this.graph.addNode(getNodeName("FLOOR", level, shaft), {type: "FLOOR"})

                if (shaft !== 0)
                {
                    // Link floors on the same level together.
                    this.addLink(getNodeName("FLOOR", level, shaft), getNodeName("FLOOR", level, shaft - 1),
                        {type: "FLOOR", distance: 1, elevator: null})
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

        for (let level = startLevel; level <= endLevel; level++)
        {
            this.graph.addNode(getNodeName("ELEVATOR", level, shaft), {type: "ELEVATOR"})

            // Link all levels of an elevator together
            if (level !== startLevel)
            {
                this.addLink(getNodeName("ELEVATOR", level, shaft), getNodeName("ELEVATOR", level - 1, shaft),
                    {type: "ELEVATOR", distance: 1, elevator: null})
            }
        }

        const elevator = new Elevator(startLevel, endLevel, shaft);

        // Add links for the elevators and the start/end floors.
        this.addLink(getNodeName("ELEVATOR", startLevel, shaft), getNodeName("FLOOR", startLevel, shaft),
            {type: "ALIGHT", distance: 15, elevator: elevator})

        this.addLink(getNodeName("ELEVATOR", endLevel, shaft), getNodeName("FLOOR", endLevel, shaft),
            {type: "ALIGHT", distance: 15, elevator: elevator})


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
        this.graph.forEachNode((node) => {nodes.push(node)})
        console.log(nodes);

        const links: Link<HellLink>[] = [];
        this.graph.forEachLink((link => {links.push(link)}))
        console.log(links);
    }

    private addLink(node1: NodeId, node2: NodeId, link: HellLink)
    {
        this.graph.addLink(node1, node2, link)
        this.graph.addLink(node2, node1, link)
    }
}

export const getNodeName = (type: "FLOOR" | "ELEVATOR", level: number, shaft: number) =>
    `${type}: Level ${level}, Shaft ${shaft}`