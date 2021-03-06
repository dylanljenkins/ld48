import {getNodeName, HellGraph} from "./graph/Graph";
import {
    AudioAtlas,
    CircleCollider,
    CollisionMatrix,
    CollisionSystem,
    Component,
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
    RenderRect,
    Scene,
    ScreenShaker,
    Sprite,
    SpriteSheet,
    Timer,
    TimerSystem
} from "lagom-engine";
import spritesheet from './Art/spritesheet.png';
import roomsheet from './Art/chambers.png';
import portalSheet from './Art/portals.png';
import gameOverImg from './Art/game-over.png';
import startScreenImg from './Art/start-screen.png';
import scoreBackImg from './Art/scoreback.png';
import {
    DoorStateSystem,
    DropMe,
    ElevatorDestination,
    ElevatorDestroyer,
    ElevatorFollowSystem,
    ElevatorMover,
    EntityDropper
} from "./Elevator";
import {GuyDestroyer, GuyFollowSystem, GuyMover, Pathfinder, Spinner} from "./Guy/Guy";
import {GuySpawner} from "./Guy/GuySpawner";
import {ScoreDisplay, ScoreToastRemover, ScoreUpdater} from "./Score";
import {SoundManager} from "./SoundManager";

import crash from "./Sound/crash.wav";
import ding from "./Sound/ding.wav";
import ding2 from "./Sound/ding2.wav";
import moving from "./Sound/moving.wav";
import moving2 from "./Sound/moving2.wav";
import pop from "./Sound/pop.wav";
import pop2 from "./Sound/pop2.wav";
import portal from "./Sound/portal2.wav";
import spawn from "./Sound/spawn.wav";
import snip from "./Sound/snip.wav";
import rock from "./Sound/music.mp3";
import {TextDisp} from "lagom-engine/dist";

export const sprites = new SpriteSheet(spritesheet, 16, 16);
export const rooms = new SpriteSheet(roomsheet, 150, 64);
export const portals = new SpriteSheet(portalSheet, 32, 32);
export const scoreBack = new SpriteSheet(scoreBackImg, 122, 78);

const startScreen = new SpriteSheet(startScreenImg, 640, 360);
export const gameOverScreen = new SpriteSheet(gameOverImg, 640, 360);

export enum Layers
{
    BACKGROUND,
    ELEVATOR_LINK,
    ELEVATOR,
    GUYS,
    ELEVATOR_DOOR,
    ELEVATOR_NODE,
    SCORE,
    MOUSE
}

Log.logLevel = LogLevel.NONE;

export const hellLayout = [
    [3, 2, 2],
    [1, -1, 1],
    [0, 1, -1],
    [-1, -1, 3],
    [2, 0, 2]
];

export class LD48 extends Game
{
    static muted = false;
    static musicPlaying = false;
    static audioAtlas: AudioAtlas = new AudioAtlas();

    constructor()
    {
        super({width: 640, height: 360, resolution: 2, backgroundColor: 0x45283C});

        LD48.audioAtlas.load("ding", ding).volume(0);
        LD48.audioAtlas.load("ding2", ding2).volume(0);
        LD48.audioAtlas.load("moving", moving).volume(1.2);
        LD48.audioAtlas.load("moving2", moving2).volume(1.2);
        LD48.audioAtlas.load("pop", pop2).volume(0.3);
        LD48.audioAtlas.load("portal", portal).volume(0.5);
        LD48.audioAtlas.load("spawn", spawn).volume(0.3);
        LD48.audioAtlas.load("crash", crash).volume(0.04);
        LD48.audioAtlas.load("snip", snip).volume(0.8);

        const music = LD48.audioAtlas.load("music", rock);
        music.loop(true);
        music.volume(0.1);

        this.setScene(new MainScene(this));
    }
}

class ClickAction extends Component
{
    constructor(readonly action: number)
    {
        super();
    }

    onAction()
    {
        switch (this.action)
        {
            // start game
            case 0:
            {
                (this.getScene() as MainScene).startGame();
                this.getEntity().destroy();
                break;
            }
            // restart
            case 1:
            {
                this.getScene().entities.forEach(x => x.destroy());
                this.getScene().systems.forEach(x => x.destroy());
                this.getScene().globalSystems.forEach(x => x.destroy());
                this.getScene().getGame().setScene(new MainScene(this.getScene().getGame()));
                break;
            }
        }
    }
}

class ClickListener extends GlobalSystem
{
    types(): LagomType<Component>[]
    {
        return [ClickAction];
    }

    update(delta: number): void
    {
        this.runOnComponents((clickActions: ClickAction[]) => {

            if (Mouse.isButtonPressed(0))
            {
                for (const action of clickActions)
                {
                    action.onAction();
                    action.destroy();
                }
            }
        });
    }
}

export class ScreenCard extends Entity
{
    constructor(readonly texture: any, readonly clickAction: number, layer: number = 0)
    {
        super("card", 0, 0, layer);
    }

    onAdded(): void
    {
        super.onAdded();

        this.addComponent(new Sprite(this.texture));

        // Game reload. Skip to gameplay.
        if (!MainScene.firstLoad && this.clickAction === 0)
        {
            const action = this.addComponent(new ClickAction(this.clickAction));
            action.onAction();
        }
        else
        {
            MainScene.firstLoad = false;

            this.addComponent(new Timer(500, null)).onTrigger.register(() => {
                this.addComponent(new ClickAction(this.clickAction));
            });
        }
    }
}

export class GameOverScene extends Scene
{
    constructor(game: Game, readonly score: number)
    {
        super(game);
    }

    onAdded()
    {
        super.onAdded();

        const card = this.addGUIEntity(new ScreenCard(gameOverScreen.textureFromPoints(0, 0, 640, 360), 1));

        card.addComponent(
            new TextDisp(640 / 2, 360 / 2, "Score: " + this.score.toString(), {fill: 0xFFFFFF})).pixiObj.anchor.x = 0.5

        this.addGlobalSystem(new TimerSystem());
        this.addGlobalSystem(new FrameTriggerSystem());
        this.addGlobalSystem(new ClickListener());
        this.addEntity(new SoundManager());
    }
}


class MainScene extends Scene
{
    static firstLoad = true;

    onAdded()
    {
        // graph.printGraph()
        // const result = graph.pathfind(getNodeName("FLOOR", 1, 1), getNodeName("FLOOR", 4, 3))
        // console.log(result)

        super.onAdded();

        this.addGUIEntity(new ScreenCard(startScreen.textureFromPoints(0, 0, 640, 360), 0));

        this.addGlobalSystem(new TimerSystem());
        this.addGlobalSystem(new FrameTriggerSystem());
        this.addGlobalSystem(new ClickListener());
        this.addEntity(new SoundManager());
    }

    startGame()
    {
        const graph = this.addEntity(new HellGraph());
        graph.initGraph();

        const collisionMatrix = new CollisionMatrix();
        collisionMatrix.addCollision(Layers.MOUSE, Layers.ELEVATOR_NODE);
        this.addGlobalSystem(new DiscreteCollisionSystem(collisionMatrix));
        this.addGlobalSystem(new MouseEventSystem());

        this.addSystem(new DoorStateSystem());
        this.addSystem(new ElevatorMover());
        this.addSystem(new EntityDropper());
        this.addSystem(new ElevatorDestroyer());
        this.addSystem(new ElevatorFollowSystem());

        this.addSystem(new GuySpawner());
        this.addSystem(new Pathfinder());
        this.addSystem(new GuyMover());
        this.addSystem(new GuyDestroyer());
        this.addSystem(new Spinner());
        this.addSystem(new GuyFollowSystem());

        this.addEntity(new ElevatorNodeManager("Node Manager", 0, 0, Layers.ELEVATOR_LINK));

        this.addGUIEntity(new ScoreDisplay());
        this.addSystem(new ScoreUpdater());
        this.addSystem(new ScoreToastRemover());

        this.addGlobalSystem(new ScreenShaker());

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

        background.addComponent(new Sprite(scoreBack.textureFromPoints(0, 0, 122, 78),
            {xOffset: 270, yOffset: 100}));
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

class ElevatorNodeManager extends Entity
{
    private shafts: ElevatorNode[][] = [];

    onAdded()
    {
        super.onAdded();

        for (let shaft = 0; shaft < 4; shaft++)
        {
            const nodes: ElevatorNode[] = [];
            for (let level = 0; level < 5; level++)
            {
                const node: ElevatorNode = this.addChild(
                    new ElevatorNode(shaft, level, nodes, () => this.regenShaft(nodes)));
                nodes.push(node);
            }
            this.shafts.push(nodes);
        }
    }

    regenShaft(shaft: ElevatorNode[])
    {
        const newNodes: ElevatorNode[] = [];
        shaft.map(node => new ElevatorNode(node.shaft, node.level, shaft, () => this.regenShaft(shaft)))
             .forEach(node => newNodes.push(this.addChild(node)))
        shaft.splice(0, shaft.length, ...newNodes)
    }
}

class ElevatorNode extends Entity
{
    private static sprite_width = 16;
    private static sprite_height = 16;

    private _selected = false;
    private circle: Component = new Sprite(
        sprites.texture(3, 1, ElevatorNode.sprite_width, ElevatorNode.sprite_height));

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

    get selected(): boolean
    {
        return this._selected;
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(this.circle)

        const sys = this.getScene().getGlobalSystem<CollisionSystem>(CollisionSystem);
        if (sys !== null)
        {
            const buttonColl = this.addComponent(
                new CircleCollider(sys, {
                    xOff: ElevatorNode.sprite_width / 2, yOff: ElevatorNode.sprite_height / 2,
                    radius: 5, layer: Layers.ELEVATOR_NODE
                }));
            buttonColl.onTriggerEnter.register((caller, data) => {
                if (data.other.layer === Layers.MOUSE)
                {
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
                            if (this.parent != null)
                            {
                                const graph = this.scene.getEntityWithName<HellGraph>("HellGraph");
                                if (!graph) return

                                const elevator = graph.addElevator(start, end, this.shaft, this.parent.getScene(),
                                    this.level < firstNode.level);
                                this.shaftNodes.forEach(node => node.destroy());
                                const elevatorLinks: Entity[] = []
                                elevatorLinks.push(this.parent.addChild(new ElevatorLinkTop(this.shaft, start)));
                                elevatorLinks.push(
                                    this.parent.addChild(new ElevatorLinkMiddle(this.shaft, start, end)));
                                elevatorLinks.push(this.parent.addChild(new ElevatorLinkBottom(this.shaft, end)));

                                const callbackWrapper = () => {
                                    this.deleteCallback();
                                    elevatorLinks.forEach(link => this.parent?.removeChild(link));
                                }
                                this.parent.addChild(
                                    new ElevatorDropButton(this.shaft, start, elevator, callbackWrapper));
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
        this.circle = new Sprite(sprites.texture(4, 1, 16, 16));
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

    onAdded()
    {
        super.onAdded();

        this.addComponent(new RenderRect(-5, -1, 10, 1, 0xab0000, 0xab0000))
        this.addComponent(new RenderCircle(0, 0, 5, null, 0xab0000));

        const sys = this.getScene().getGlobalSystem<CollisionSystem>(CollisionSystem);
        if (sys !== null)
        {
            const buttonColl = this.addComponent(
                new CircleCollider(sys, {radius: 0, layer: Layers.ELEVATOR_NODE}));
            buttonColl.onTriggerEnter.register((caller, data) => {
                if (data.other.layer === Layers.MOUSE)
                {
                    (this.getScene().getEntityWithName("audio") as SoundManager)?.playSound("snip");
                    this.destroy();
                    this.elevator.getComponent(ElevatorDestination)?.destroy();
                    this.elevator.addComponent(new DropMe(80));
                    this.clickcallback()
                }
            });
        }
    }
}

class ElevatorLinkTop extends Entity
{
    constructor(shaft: number, level: number)
    {
        super(getNodeName("ELEVATOR_LINK", level, shaft), 100 + 150 * shaft, level * 70 + 50, Layers.BACKGROUND);
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Sprite(sprites.texture(5, 1, 16, 16)))
    }
}

class ElevatorLinkBottom extends Entity
{
    constructor(shaft: number, level: number)
    {
        super(getNodeName("ELEVATOR_LINK", level, shaft), 100 + 150 * shaft, level * 70 + 50, Layers.BACKGROUND);
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Sprite(sprites.texture(6, 1, 16, 16)))
    }
}

class ElevatorLinkMiddle extends Entity
{
    start: number;
    end: number;

    constructor(shaft: number, start: number, end: number)
    {
        super(getNodeName("ELEVATOR_LINK", start, shaft), 100 + 150 * shaft, start * 70 + 50, -1);
        this.start = start
        this.end = end;
    }

    onAdded()
    {
        super.onAdded();
        const spriteHeight = 16;
        const diffy = (this.end - this.start) * 70;
        let currentOffsety = 0;
        console.log(diffy)
        while (currentOffsety < diffy - spriteHeight)
        {
            if (diffy - (currentOffsety + spriteHeight) < (spriteHeight / 2))
            {
                currentOffsety += (spriteHeight / 4)
            }
            else
            {
                currentOffsety += spriteHeight;
            }
            this.addComponent(new Sprite(sprites.texture(7, 1, 16, 16), {yOffset: currentOffsety}))
        }
    }
}
