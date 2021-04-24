import {getNodeName, HellGraph} from "./graph/Graph";
import {
    Component,
    Diagnostics,
    Entity,
    FrameTriggerSystem,
    Game,
    MathUtil,
    Scene,
    Sprite,
    SpriteSheet,
    TextDisp,
    TimerSystem
} from "lagom-engine";
import spritesheet from './Art/spritesheet.png';
import roomsheet from './Art/chambers.png';
import {DoorStateSystem, ElevatorMover} from "./Elevator";
import {GraphLocation, GraphTarget, Guy, GuyMover, Path, Pathfinder} from "./Guy/Guy";

export const sprites = new SpriteSheet(spritesheet, 16, 16);
export const rooms = new SpriteSheet(roomsheet, 150, 64);

export enum Layers
{
    BACKGROUND,
    ELEVATOR,
    ELEVATOR_DOOR,
    GUYS,
    SCORE
}

export const hellLayout = [
    [3, 1, 0],
    [1, -1, 2],
    [0, 2, 1],
    [3, -1, 3],
    [1, 0, 2]
];

export const graph = new HellGraph();

export class LD48 extends Game
{
    constructor()
    {
        super({width: 640, height: 360, resolution: 2, backgroundColor: 0xd95763});
        this.setScene(new MainScene(this));
    }
}

class ElevatorNode extends Entity
{
    level: number
    shaft: number

    constructor(shaft: number, level: number)
    {
        super(getNodeName("ELEVATOR", level, shaft), 100 + 150 * shaft, level * 70 + 50, Layers.ELEVATOR_DOOR);
        this.level = level;
        this.shaft = shaft;
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Sprite(sprites.texture(3, 1, 16, 16)));
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
        // const result = graph.pathfind(getNodeName("FLOOR", 1, 1), getNodeName("FLOOR", 4, 3))
        // console.log(result)

        super.onAdded();

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
        guy.addComponent(new GraphTarget(getNodeName("FLOOR", 0, 0)))
        guy.addComponent(new Path())
        this.addEntity(guy);

        this.addGUIEntity(new Diagnostics("white", 5, true));

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
                this.addEntity(new ElevatorNode(shaft, level));
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
