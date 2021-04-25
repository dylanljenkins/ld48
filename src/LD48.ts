import {getNodeName, HellGraph} from "./graph/Graph";
import {
    CircleCollider,
    CollisionMatrix,
    CollisionSystem,
    Component,
    Diagnostics,
    DiscreteCollisionSystem,
    Entity,
    FrameTriggerSystem,
    Game,
    GlobalSystem,
    LagomType,
    Log,
    LogLevel,
    MathUtil,
    Mouse,
    RenderCircle,
    Scene,
    Sprite,
    SpriteSheet,
    TextDisp,
    Timer,
    TimerSystem
} from "lagom-engine";
import spritesheet from './Art/spritesheet.png';
import roomsheet from './Art/chambers.png';
import portalSheet from './Art/portals.png';
import {
    DoorStateSystem,
    ElevatorDestination,
    ElevatorDestroyer,
    EntityDropper,
    DropMe,
    ElevatorMover
} from "./Elevator";
import {GuyDestroyer, GuyMover, Pathfinder} from "./Guy/Guy";
import {GuySpawner} from "./Guy/GuySpawner";

export const sprites = new SpriteSheet(spritesheet, 16, 16);
export const rooms = new SpriteSheet(roomsheet, 150, 64);
export const portals = new SpriteSheet(portalSheet, 32, 32);

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

Log.logLevel = LogLevel.DEBUG;

export const hellLayout = [
    [3, 1, -1],
    [1, -1, 1],
    [0, 1, -1],
    [-1, -1, 3],
    [1, 0, -1]
];

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
        // graph.printGraph()
        // const result = graph.pathfind(getNodeName("FLOOR", 1, 1), getNodeName("FLOOR", 4, 3))
        // console.log(result)

        super.onAdded();

        const graph = this.addEntity(new HellGraph());
        graph.initGraph();

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
        this.addSystem(new EntityDropper());
        this.addSystem(new ElevatorDestroyer());

        this.addEntity(new GameManager(initialBudget, initialEnergyCost));
        this.addEntity(new MoneyBoard(50, 50, 1000));
        this.addEntity(new PowerUseBoard(600, 10, initialEnergyCost));

        this.addSystem(new GuySpawner());
        this.addSystem(new Pathfinder());
        this.addSystem(new GuyMover());
        this.addSystem(new GuyDestroyer());

        this.addGUIEntity(new Diagnostics("white", 5, true));
        this.addEntity(new ElevatorNodeManager("Node Manager", 0, 0, Layers.ELEVATOR_NODE));

        this.addBackground();
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

        // Rooms
        for (let i = 0; i < 5; i++)
        {
            for (let j = 0; j < 3; j++)
            {
                const room = hellLayout[i][j];

                if (room === -1) continue;
                background.addComponent(new Sprite(rooms.texture(0, room),
                    {xOffset: 8 + 100 + 150 * j, yOffset: i * 70 + 3}));
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
            const nodes:ElevatorNode[] = [];
            for (let level = 0; level < 5; level++)
            {
                const node:ElevatorNode = this.addChild(new ElevatorNode(shaft, level, nodes, () => this.regenShaft(nodes)));
                nodes.push(node);
            }
            this.shafts.push(nodes);
        }
    }

    regenShaft(shaft: ElevatorNode[]) {
        const newNodes:ElevatorNode[] = [];
        shaft.map(node => new ElevatorNode(node.shaft, node.level, shaft,() => this.regenShaft(shaft)))
             .forEach(node => newNodes.push(this.addChild(node)))
        shaft.splice(0, shaft.length, ...newNodes)
    }
}

class ElevatorNode extends Entity
{
    private static sprite_width = 16;
    private static sprite_height = 16;

    private _selected = false;
    private circle: Component = new Sprite(sprites.texture(3, 1, ElevatorNode.sprite_width, ElevatorNode.sprite_height));

    level: number
    shaft: number
    private shaftNodes: ElevatorNode[];
    private deleteCallback: () => void;

    constructor(shaft: number, level: number, shaftNodes: any[], deleteCallback: () => void)
    {
        super(getNodeName("ELEVATOR", level, shaft), 100 + 150 * shaft, level * 70 + 50, Layers.ELEVATOR_DOOR);
        this.level = level;
        this.shaft = shaft;
        this.shaftNodes = shaftNodes;
        this.deleteCallback = deleteCallback;
    }

    get selected(): boolean {
        return this._selected;
    }

    onAdded() {
        super.onAdded();
        this.addComponent(this.circle)

        const sys = this.getScene().getGlobalSystem<CollisionSystem>(CollisionSystem);
        if (sys !== null) {
            const buttonColl = this.addComponent(
                new CircleCollider(sys, {xOff: ElevatorNode.sprite_width/2, yOff: ElevatorNode.sprite_height/2,
                                            radius: 5, layer: Layers.ELEVATOR_NODE}));
            buttonColl.onTriggerEnter.register((caller, data) => {
                if (data.other.layer === Layers.MOUSE) {
                    if (this.selected)
                    {
                        this.deselect();
                    }
                    else if (this.shaftNodes.indexOf(this) > -1)
                    {
                        const selectedNodes = this.shaftNodes.filter(node => node.selected);

                        if (selectedNodes.length == 1)
                        {
                            const firstNode = selectedNodes[0];
                            firstNode.deselect();
                            const start = Math.min(this.level, firstNode.level);
                            const end = Math.max(this.level, firstNode.level);
                            if (this.parent != null) {
                                const graph = this.scene.getEntityWithName<HellGraph>("HellGraph");
                                if (!graph) return

                                const elevator = graph.addElevator(start, end, this.shaft, this.parent.getScene());
                                this.shaftNodes.forEach(node => node.destroy());

                                const dropButton = new ElevatorDropButton(this.shaft,start,elevator, this.deleteCallback);
                                this.parent.addChild(dropButton);
                            }
                        }
                        else if (selectedNodes.length == 0)
                        {
                            this.select();
                        }
                    }
                }
            });

        }
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

class ElevatorDropButton extends Entity
{
    level: number
    shaft: number
    private elevator: any;
    private clickcallback: () => void;

    constructor(shaft: number, level: number, elevator: any, clickCallback: () => void)
    {
        super(getNodeName("DROP", level, shaft), 108 + 150 * shaft, 20, Layers.ELEVATOR_DOOR);
        this.level = level;
        this.shaft = shaft;
        this.elevator = elevator
        this.clickcallback = clickCallback;
    }

    onAdded() {
        super.onAdded();
        this.addComponent(new RenderCircle(0, 0, 5, 0xff0000, 0x000000));

        const sys = this.getScene().getGlobalSystem<CollisionSystem>(CollisionSystem);
        if (sys !== null) {
            const buttonColl = this.addComponent(
                new CircleCollider(sys, {radius: 0, layer: Layers.ELEVATOR_NODE}));
            buttonColl.onTriggerEnter.register((caller, data) => {
                if (data.other.layer === Layers.MOUSE) {
                    this.destroy();
                    this.elevator.getComponent(ElevatorDestination)?.destroy();
                    this.elevator.addComponent(new DropMe(160));
                    this.clickcallback()
                }
            });
        }
    }
}
