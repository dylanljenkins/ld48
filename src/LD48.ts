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
import {DoorStateSystem, Elevator} from "./Elevator";
import {GraphLocation, GraphTarget, Guy, GuyMover, Path, Pathfinder} from "./Guy/Guy";

export const sprites = new SpriteSheet(spritesheet, 16, 16);

export enum Layers
{
    BACKGROUND,
    ELEVATOR,
    ELEVATOR_DOOR,
    GUYS,
    SCORE
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
        graph.addElevator(1, 5, 2)
        graph.printGraph()
        const result = graph.pathfind(getNodeName("FLOOR", 1, 1), getNodeName("FLOOR", 5, 4))
        console.log(result)

        super.onAdded();

        const initialBudget = 1000;
        const initialEnergyCost = 0;

        this.addGlobalSystem(new TimerSystem());
        this.addGlobalSystem(new FrameTriggerSystem());

        this.addSystem(new DoorStateSystem());

        this.addEntity(new GameManager(initialBudget, initialEnergyCost));
        this.addEntity(new MoneyBoard(50, 50, 1000));
        this.addEntity(new PowerUseBoard(600, 10, initialEnergyCost));

        const guy = new Guy("guy", 100, 200, Layers.GUYS)
        guy.addComponent(new GraphLocation(getNodeName("FLOOR", 4, 1)))
        guy.addComponent(new GraphTarget(getNodeName("FLOOR", 4, 3)))
        guy.addComponent(new Path())
        this.addEntity(guy);

        this.addGUIEntity(new Diagnostics("white", 5, true));

        this.addEntity(new Elevator(200, 200));

        this.addBackground();
        this.makeFloors();

        this.addSystem(new Pathfinder())
        this.addSystem(new GuyMover())
    }

    private makeFloors()
    {
        for (let i = 0; i < 5; i++)
        {
            for (let j = 0; j < 4; j++)
            {
                this.addEntity(new ElevatorNode(j, i));
                this.addEntity(new FloorNode(j, i));
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
