import {AnimatedSpriteController, AnimationEnd, Entity, MathUtil, Sprite, System, Timer} from "lagom-engine";
import {HellGraph, HellGraphComponent, HellNode} from "../graph/Graph";
import {Layers, sprites} from "../LD48";
import {Node} from "ngraph.graph";
import {DropMe} from "../Elevator";
import {GraphLocation, GraphTarget, Guy, Path} from "./Guy";
import {SoundManager} from "../SoundManager";
import {Score, ScoreDisplay} from "../Score";
import {Sco} from "grommet-icons";

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

            const score = this.getScene().getEntityWithName<ScoreDisplay>("scoredisp")?.getComponent<Score>(Score)
            const elapsed = score!.elapsed

            let times = 1;

            if (elapsed < 30)
            {
                this.timeout = 10000;
            }
            else if (elapsed < 60)
            {
                this.timeout = 5000;
            }
            else
            {
                this.timeout = 5000;

                const currentGuys = this.getScene().entities.filter(value => value.name === "guy").length;
                if (currentGuys < 4)
                {
                    times = 3;
                }
                else if (currentGuys < 7)
                {
                    times = 2;
                }
            }

            for (let i = 0; i < times; i++)
            {
                const potentialStarts: Node<HellNode>[] = []
                const potentialGoals: Node<HellNode>[] = []

                entity.graph.forEachNode(node =>
                {
                    if (node?.data?.type === "FLOOR") potentialStarts.push(node)
                    if (node?.data?.type === "GOAL") potentialGoals.push(node)
                })

                const start = potentialStarts[Math.floor(Math.random() * potentialStarts.length)]

                const xMod = (Math.random() - 0.5) * 20;
                const yMod = (Math.random() - 0.5) * 10;

                // This should only go to 4, any more than 4 potential goals will not be used.
                const goalId = MathUtil.randomRange(0, 4);
                const goal = potentialGoals[goalId];

                const guyPortal = this.getScene().addEntity(
                    new Entity("guyportal", start.data.entity.transform.x - 4 + xMod,
                        start.data.entity.transform.y - 16 + yMod,
                        Layers.GUYS));
                const sprCon = guyPortal.addComponent(new AnimatedSpriteController(0, [
                    {
                        id: 0,
                        textures: sprites.textures([[2, 2], [3, 2], [4, 2]], 16, 16),
                        config: {
                            animationEndAction: AnimationEnd.LOOP,
                            animationSpeed: 200
                        }
                    }]));

                guyPortal.addComponent(new Timer(600, sprCon, false)).onTrigger.register((caller, data) => {
                    data.destroy();
                    caller.parent.addComponent(new AnimatedSpriteController(0, [{
                        id: 0,
                        textures: sprites.textures([[5, 2], [6, 2], [7, 2]], 16, 16),
                        config: {
                            animationEndAction: AnimationEnd.LOOP,
                            animationSpeed: 200
                        }
                    }]));
                    (this.scene.getEntityWithName("audio") as SoundManager)?.playSound("spawn");
                })

                guyPortal.addComponent(new Timer(800, [xMod, yMod])).onTrigger.register((caller, data) => {

                    const x = start.data.entity.transform.x + data[0];
                    const y = start.data.entity.transform.y + data[1];

                    const guycoming = caller.getScene().addEntity(
                        new Entity("guycomingin", x, y - 10))
                    guycoming.addComponent(new Sprite(sprites.texture(0, 0, 8, 8)));
                    guycoming.addComponent(new DropMe(20, false));
                    guycoming.addComponent(new Timer(500, guyPortal)).onTrigger.register((caller1, data) => {
                        const guy = caller1.getScene().addEntity(new Guy(x, y, goalId));
                        guy.addComponent(new Path())
                        guy.addComponent(new GraphLocation(start.id))
                        guy.addComponent(new GraphTarget(goal.id))
                        data.getComponent(AnimatedSpriteController)?.destroy();
                        data.addComponent(new AnimatedSpriteController(0, [
                            {
                                id: 0,
                                textures: sprites.textures([[4, 2], [3, 2], [2, 2]], 16, 16),
                                config: {
                                    animationEndAction: AnimationEnd.LOOP,
                                    animationSpeed: 200
                                }
                            }
                        ]));
                        data.addComponent(new Timer(600, null)).onTrigger.register(caller2 => caller2.parent.destroy());
                        caller1.parent.destroy();
                    })
                })
            }
        })
    }
}
