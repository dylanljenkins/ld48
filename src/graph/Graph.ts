import Graph from "ngraph.graph";

interface Link
{
    type: "FLOOR" | "ELEVATOR"
}

export const myGraph = () => {
    const graph = Graph();
    const levels = 7;
    const shafts = 4;

    for (let level = 0; level < levels; level++)
    {
        for (let shaft = 0; shaft < shafts; shaft++)
        {
            if (shaft !== 0)
            {
                const link: Link = {type: "FLOOR"};

                graph.addLink(getNodeName(level, shaft - 1), getNodeName(level, shaft), link)
                graph.addLink(getNodeName(level, shaft), getNodeName(level, shaft - 1), link)
            }
        }
    }

    graph.forEachNode(function(node){
        console.log(node.id, node.data);
    });

    graph.forEachLink(function(link) {
        console.dir(link);
    });
}

const getNodeName = (level: number, shaft: number) => `Level ${level}, Shaft ${shaft}`

