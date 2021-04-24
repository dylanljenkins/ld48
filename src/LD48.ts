import { Entity, Game, Scene, TextDisp } from "lagom-engine";
import {myGraph} from "./graph/Graph";

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

    constructor(x: number, y: number, initialMoney: number)
    {
        super("MoneyBoard", x, y);
        this.currentMoney = initialMoney;
    }

    onAdded()
    {
        super.onAdded();
        const label = new TextDisp(-30, 0, "$" + this.currentMoney.toString(), {fill: 0xffffff});
        this.addComponent(label);
    }
}