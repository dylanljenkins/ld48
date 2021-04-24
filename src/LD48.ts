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
    TextDisp, Timer,    TimerSystem,
    FrameTriggerSystem,
} from "lagom-engine";
import spritesheet from './Art/spritesheet.png';
import {DoorStateSystem, Elevator, ElevatorMover} from "./Elevator";
import {GraphLocation, GraphTarget, Guy, GuyMover, Path, Pathfinder} from "./Guy/Guy";

export const sprites = new SpriteSheet(spritesheet, 16, 16);

export enum Layers
{
    BACKGROUND,
    ELEVATOR,
    ELEVATOR_DOOR,
    ELEVATOR_NODE,
    GUYS,
    SCORE,
    MOUSE
}

export const graph = new HellGraph();

export class LD48 extends Game
{
    constructor()
    {
        super({width: 640, height: 360, resolution: 2, backgroundColor: 0xd95763});
        this.setScene(new MainScene(this));
    }
}

class FloorNode extends Entity
{
    level: number
    shaft: number

    constructor(shaft: number, level: number)
    {
        super(getNodeName("FLOOR", level, shaft), 120 + 150 * shaft, level * 70 + 50, Layers.ELEVATOR_DOOR);
        this.level = level;
        this.shaft = shaft;
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Sprite(sprites.texture(3, 1, 16, 16)));
    }
}

class MainScene extends Scene
{
    onAdded()
    {
        graph.addElevator(0, 4, 2, this);
        // graph.printGraph()
        const result = graph.pathfind(getNodeName("FLOOR", 1, 1), getNodeName("FLOOR", 4, 3))
        // console.log(result)

        super.onAdded();

        const collisionMatrix = new CollisionMatrix();
        collisionMatrix.addCollision(Layers.MOUSE, Layers.ELEVATOR_NODE);
        this.addGlobalSystem(new DiscreteCollisionSystem(collisionMatrix));
        this.addGlobalSystem(new MouseEventSystem());

        const initialBudget = 1000;
        const initialEnergyCost = 0;

        this.addGlobalSystem(new TimerSystem());
        this.addGlobalSystem(new FrameTriggerSystem());

        this.addSystem(new DoorStateSystem());
        this.addSystem(new ElevatorMover());

        this.addEntity(new GameManager(initialBudget, initialEnergyCost));
        this.addEntity(new MoneyBoard(50, 50, 1000));
        this.addEntity(new PowerUseBoard(600, 10, initialEnergyCost));

        const guy = new Guy("guy", 100, 330, Layers.GUYS)
        guy.addComponent(new GraphLocation(getNodeName("FLOOR", 4, 0)))
        guy.addComponent(new GraphTarget(getNodeName("FLOOR", 4, 3)))
        guy.addComponent(new Path())
        this.addEntity(guy);

        this.addGUIEntity(new Diagnostics("white", 5, true));
        this.addEntity(new ElevatorNodeManager("Node Manager", 0, 0, Layers.ELEVATOR_NODE));

        this.addBackground();
        this.makeFloors();

        this.addSystem(new Pathfinder())
        this.addSystem(new GuyMover())
    }

    private makeFloors()
    {
        for (let level = 0; level < 5; level++)
        {
            for (let shaft = 0; shaft < 4; shaft++)
            {
                this.addEntity(new FloorNode(shaft, level));
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
                background.addComponent(new Sprite(sprites.texture(1 + MathUtil.randomRange(0, 7), 0, 16, 16),
                    {xOffset: i * 16, yOffset: j * 16}));
            }
        }

        // Elevator Shafts
        for (let i = 0; i < 4; i++)
        {
            for (let j = 0; j < 360 / 16; j++)
            {
                background.addComponent(new Sprite(sprites.texture(MathUtil.randomRange(0, 3), 1, 16, 16),
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
    initialEnergyUse: number;

    constructor(initialBudget: number, initialEnergyUse: number)
    {
        super("Manager");
        this.initialBudget = initialBudget;
        this.initialEnergyUse = initialEnergyUse;
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Budget(this.initialBudget));
        this.addComponent(new EnergyUsed(this.initialEnergyUse));
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

class EnergyUsed extends Component
{
    energyUsed: number;

    constructor(initialEnergyUse: number)
    {
        super();
        this.energyUsed = initialEnergyUse;
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

class PowerUseBoard extends Entity
{
    constructor(x: number, y: number, private readonly initialValue: number)
    {
        super("power", x, y, Layers.SCORE);
    }

    onAdded()
    {
        super.onAdded();
        const textbox = new TextDisp(0, 0, this.initialValue.toString(), {fill: 0xffffff});
        this.addComponent(textbox);
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

        for (let shaft = 0; shaft < 4; shaft++)
        {
            const nodes = [];
            for (let level = 0; level < 5; level++)
            {
                const node = new ElevatorNode(shaft, level);
                nodes.push(node);
                this.addChild(node);
            }
            this.shafts.push(nodes);
        }
        console.log(this.shafts)
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
    private circle: Component = new Sprite(sprites.texture(3, 1, 16, 16));

    level: number
    shaft: number

    constructor(shaft: number, level: number)
    {
        super(getNodeName("ELEVATOR", level, shaft), 100 + 150 * shaft, level * 70 + 50, Layers.ELEVATOR_DOOR);
        this.level = level;
        this.shaft = shaft;
        this._selected = false;
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
        this.circle =  new Sprite(sprites.texture(4, 1, 16, 16));
        this.addComponent(this.circle)
    }

    deselect()
    {
        this._selected = false;
        this.removeComponent(this.circle, true);
        this.circle = new Sprite(sprites.texture(3, 1, 16, 16));
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