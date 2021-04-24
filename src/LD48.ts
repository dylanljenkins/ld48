import {myGraph} from "./graph/Graph";
import {Component, Entity, Game, Scene, Sprite, SpriteSheet, TextDisp} from "lagom-engine";
import spritesheet from './Art/spritesheet.png';
import { NumberLiteralType } from "typescript";

const sprites = new SpriteSheet(spritesheet, 16, 16);

enum Layers
{
    SCORE
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
        myGraph();

        super.onAdded();

        const initialBudget = 1000;

        this.addEntity(new GameManager(initialBudget));
        this.addEntity(new MoneyBoard(10, 10, initialBudget));
        this.addEntity(new Guy("guy", 100, 100));

        this.make_floors()
    }

    private make_floors()
    {
        for (let i = 0; i < 7; i++)
        {
            for (let j = 0; j < 4; j++)
            {
                this.addEntity(new ElevatorDoor("door1", 100 + 150 * j, i * 40 + 40));
            }
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
    private label: TextDisp;

    constructor(x: number, y: number, initialMoney: number)
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
    onAdded()
    {
        super.onAdded();

        this.addComponent(new Sprite(sprites.textureFromIndex(1)));
    }
}