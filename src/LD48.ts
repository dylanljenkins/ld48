import {getNodeName, HellGraph} from "./graph/Graph";
import {
    CircleCollider,
    CollisionMatrix, CollisionSystem,
    Component,
    Diagnostics, DiscreteCollisionSystem,
    Entity,
    Game, GlobalSystem, LagomType,
    MathUtil,
    Mouse, RectCollider,
    RenderCircle,
    Scene,
    Sprite,
    SpriteSheet,
    TextDisp, Timer
} from "lagom-engine";
import spritesheet from './Art/spritesheet.png';

const sprites = new SpriteSheet(spritesheet, 16, 16);

enum Layers
{
    BACKGROUND,
    ELEVATOR_DOOR,
    ELEVATOR_NODE,
    GUYS,
    SCORE,
    MOUSE
}


export class LD48 extends Game
{
    constructor()
    {
        super({width: 640, height: 360, resolution: 2, backgroundColor: 0xd95763});
        this.setScene(new MainScene(this));
    }
}

class MainScene extends Scene
{
    onAdded()
    {
        const graph = new HellGraph();
        graph.addElevator(1, 5, 2)
        graph.printGraph()
        const result = graph.pathfind(getNodeName("FLOOR", 1, 1), getNodeName("FLOOR", 5, 4))
        console.log(result)

        super.onAdded();

        const collisionMatrix = new CollisionMatrix();
        collisionMatrix.addCollision(Layers.MOUSE, Layers.ELEVATOR_NODE);
        this.addGlobalSystem(new DiscreteCollisionSystem(collisionMatrix));
        this.addGlobalSystem(new MouseEventSystem());

        const initialBudget = 1000;

        this.addEntity(new GameManager(initialBudget));
        this.addEntity(new MoneyBoard(50, 50, 1000));
        this.addEntity(new Guy("guy", 100, 100, Layers.GUYS));
        this.addGUIEntity(new Diagnostics("white", 5, true));
        this.addEntity(new ElevatorNodeManager("Node Manager", 0, 0, Layers.ELEVATOR_NODE));

        this.addBackground();
        // this.makeFloors();
    }

    private makeFloors()
    {
        for (let i = 0; i < 7; i++)
        {
            const shaft = [];
            for (let j = 0; j < 4; j++)
            {
                this.addEntity(new ElevatorNode(`node${i}${j}`, 100 + 150 * j, i * 40 + 40, Layers.ELEVATOR_DOOR));
            }
        }
    }

    private addBackground()
    {
        const background = this.addEntity(new Entity("background", 0, 0, Layers.BACKGROUND));

        for (let i = 0; i < 640 / 16; i++)
        {
            for (let j = 0; j < 360 / 16; j++)
            {
                background.addComponent(new Sprite(sprites.texture(2 + MathUtil.randomRange(0, 6), 0, 16, 16),
                    {xOffset: i * 16, yOffset: j * 16}));
            }
        }

        // Elevator Shafts
        for (let i = 0; i < 7; i++)
        {
            for (let j = 0; j < 360 / 16; j++)
            {
                background.addComponent(new Sprite(sprites.texture( MathUtil.randomRange(0, 3), 1, 16, 16),
                    {xOffset: 100 + 150 * i, yOffset: j * 16}));
            }
        }
    }
}

class MouseColl extends Entity
{
    onAdded(): void
    {
        super.onAdded();

        const sys = this.getScene().getGlobalSystem<CollisionSystem>(CollisionSystem);
        if (sys !== null)
        {
            this.addComponent(new CircleCollider(sys, {layer: Layers.MOUSE, radius: 5}));
        }
        this.addComponent(new Timer(60, null, false)).onTrigger.register(caller => {
            caller.getEntity().destroy();
        });
    }
}

class MouseEventSystem extends GlobalSystem
{
    types(): LagomType<Component>[]
    {
        return [];
    }

    update(delta: number): void
    {
        if (Mouse.isButtonPressed(0))
        {
            const where = this.scene.camera.viewToWorld(Mouse.getPosX(), Mouse.getPosY());
            this.getScene().addEntity(new MouseColl("mouse", where.x, where.y));
        }
    }
}

class GameManager extends Entity
{
    initialBudget: number;

    constructor(initialBudget: number)
    {
        super("Manager");
        this.initialBudget = initialBudget;
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Budget(this.initialBudget));
    }
}

class Budget extends Component
{
    moneyLeft: number;

    constructor(initialBudget: number)
    {
        super();
        this.moneyLeft = initialBudget;
    }
}

class MoneyBoard extends Entity
{
    private readonly label: TextDisp;

    constructor(x: number, y: number, private readonly initialMoney: number)
    {
        super("MoneyBoard", x, y, Layers.SCORE);
        this.label = new TextDisp(0, 0, this.getScoreText(initialMoney), {fill: 0xffffff});
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(this.label);
    }

    private getScoreText(newMoney: number)
    {
        return "$" + newMoney.toString();
    }

    public updateMoney(newMoney: number)
    {
        this.label.pixiObj.text = this.getScoreText(newMoney);
    }
}

class Guy extends Entity
{
    onAdded()
    {
        super.onAdded();

        this.addComponent(new Sprite(sprites.texture(0, 0, 8, 8)));
    }
}

class ElevatorDoor extends Entity
{
    onAdded() {
        super.onAdded();

        this.addComponent(new Sprite(sprites.textureFromIndex(1)));
    }
}

class ElevatorNodeManager extends Entity
{
    private shafts: ElevatorNode[][] = [];

    onAdded()
    {
        super.onAdded();

        for (let j = 0; j < 4; j++)
        {
            const shaft = [];
            for (let i = 0; i < 7; i++)
            {
                const node = new ElevatorNode(`node${i}${j}`, 100 + 150 * j, i * 40 + 40, Layers.ELEVATOR_DOOR);
                shaft.push(node);
                this.addChild(node);
                console.log(node);
            }
            this.shafts.push(shaft);
        }

        const sys = this.getScene().getGlobalSystem<CollisionSystem>(CollisionSystem);
        if (sys !== null) {
            this.shafts.forEach(shaft => shaft.forEach(node => {
                    const buttonColl = node.addComponent(
                        new CircleCollider(sys, {radius: 10, layer: Layers.ELEVATOR_NODE}));
                    buttonColl.onTriggerEnter.register((caller, data) => {
                        if (data.other.layer === Layers.MOUSE) {
                            if (node.selected)
                            {
                                node.deselect();
                            }
                            else if (shaft.indexOf(node) > -1)
                            {
                                const numSelected = shaft.reduce((acc, node) => node.selected ? acc+1 : acc, 0);
                                console.log(numSelected);
                                if (numSelected < 2)
                                {
                                    node.select();
                                }
                            }
                        }
                    });
                }

            ))

        }
    }
}

class ElevatorNode extends Entity
{
    private _selected = false;
    private circle = new RenderCircle(5, 0, 3, null, 0xff0000);

    constructor(name: string, x?: number, y?: number, depth?: number, selected = false)
    {
        super(name, x, y, depth)
        this._selected = selected;
    }

    get selected(): boolean {
        return this._selected;
    }

    onAdded() {
        super.onAdded();
        this.addComponent(this.circle)
    }

    select()
    {
        this._selected = true;
        this.removeComponent(this.circle, true);
        this.circle = new RenderCircle(5, 0, 3, null, 0x0000ff);
        this.addComponent(this.circle)
    }

    deselect()
    {
        this._selected = false;
        this.removeComponent(this.circle, true);
        this.circle = new RenderCircle(5, 0, 3, null, 0xff0000);
        this.addComponent(this.circle)
    }
}

// class ElevatorCreator extends GlobalSystem
// {
//     types(): LagomType<ElevatorNode>[] {
//         return [];
//     }
//
//     update(delta: number)
//     {
//
//     }
// }