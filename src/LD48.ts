import { Entity, Game, Scene, TextDisp } from "lagom-engine";
import {myGraph} from "./graph/Graph";


enum Layers
{
    SCORE
}


export class LD48 extends Game
{
    constructor()
    {
        super({width: 1200, height: 700, resolution: 1, backgroundColor: 0x000000});
        this.setScene(new MainScene(this));
    }
}

class MainScene extends Scene
{
    onAdded()
    {
        myGraph();

        super.onAdded();

        this.addEntity(new MoneyBoard(50, 50, 1000));
    }
}

class MoneyBoard extends Entity
{
    private currentMoney: number;
    private label: TextDisp;

    constructor(x: number, y: number, initialMoney: number)
    {
        super("MoneyBoard", x, y, Layers.SCORE);
        this.currentMoney = initialMoney;
        this.label = new TextDisp(-30, 0, this.getScoreText(), {fill: 0xffffff});
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(this.label);
    }

    getScoreText()
    {
        return "$" + this.currentMoney.toString();
    }

    public modifyAmount(modifier: number)
    {
        this.currentMoney += modifier;
        this.label.pixiObj.text = this.getScoreText();
    }
}