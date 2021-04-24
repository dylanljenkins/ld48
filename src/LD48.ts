import { Entity, Game, Scene, Sprite, SpriteSheet, TextDisp } from "lagom-engine";
import spritesheet from './Art/spritesheet.png';

const sprites = new SpriteSheet(spritesheet, 16, 16);
enum Layers
{
    SCORE
}


export class LD48 extends Game
{
    constructor()
    {
        super({width: 1200, height: 700, resolution: 1, backgroundColor: 0xd95763});
        this.setScene(new MainScene(this));
    }
}

class MainScene extends Scene
{
    onAdded()
    {
        super.onAdded();

        this.addEntity(new MoneyBoard(50, 50, 1000));
        this.addEntity(new Guy("guy", 100, 100));
        this.addEntity(new ElevatorDoor("door1", 140, 100));
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
class Guy extends Entity {
    onAdded() {
        super.onAdded();

        this.addComponent(new Sprite(sprites.texture(0, 0, 8, 8)));
    }
}

class ElevatorDoor extends Entity {
    onAdded() {
        super.onAdded();

        this.addComponent(new Sprite(sprites.textureFromIndex(1)));
    }
}