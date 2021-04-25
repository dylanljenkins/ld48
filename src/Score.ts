import {Component, Entity, System, TextDisp, Timer} from "lagom-engine";
import {Layers} from "./LD48";
import {DropMe} from "./Elevator";
import {MathUtil} from "lagom-engine/dist";

export class ScoreDisplay extends Entity
{
    constructor()
    {
        super("scoredisp", 10, 100, Layers.SCORE);
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new Score());
        this.addComponent(new TextDisp(0, 0, "0", {fill: 0xFFFFFF}));
    }
}

export class ScoreUpdater extends System
{
    update(delta: number): void
    {
        this.runOnEntities((entity: ScoreDisplay, text: TextDisp, score: Score) => {
            text.pixiObj.text = score.score.toString();
        })
    }

    types = () => [TextDisp, Score];

}

export class TimerDisplay extends Entity
{
    constructor()
    {
        super("timerdisp", 10, 300, Layers.SCORE);
    }

    onAdded()
    {
        const initialValue = 100;

        super.onAdded();
        this.addComponent(new TextDisp(0, 0, initialValue.toString(), {fill: 0xFFFFFF}));
        this.addComponent(new Timer<number>(1000, initialValue - 1, false)).onTrigger.register(timerTick)

        function timerTick(caller: Timer<number>, elapsed: number)
        {
            const obj = caller.parent.getComponent<TextDisp>(TextDisp)?.pixiObj;
            if (obj)
            {
                obj.text = elapsed.toString();
            }
            caller.parent.addComponent(new Timer(1000, elapsed - 1)).onTrigger.register(timerTick)
        }
    }
}

export class Score extends Component
{
    score = 0;

    add1(entity: Entity)
    {
        this.score += 1;
        this.getScene().addGUIEntity(new ScoreToast(entity.transform.x, entity.transform.y, "+1"));
    }

    sub1(entity: Entity)
    {
        this.score -= 1;
        this.getScene().addGUIEntity(new ScoreToast(entity.transform.x, entity.transform.y, "-1"));
    }
}

class Toasty extends Component
{
}

class ScoreToast extends Entity
{
    constructor(x: number, y: number, readonly disp: string)
    {
        super("score", x, y, Layers.SCORE);
    }

    onAdded()
    {
        super.onAdded();
        this.addComponent(new TextDisp(MathUtil.randomRange(-10, 10), MathUtil.randomRange(-12, -4), this.disp, {fill: 0xFFFFFF, fontSize: 10}));
        this.addComponent(new DropMe(-10, false));
        this.addComponent(new Toasty());
    }
}

export class ScoreToastRemover extends System
{
    update(delta: number): void
    {
        this.runOnEntities((entity: Entity, text: TextDisp) => {
            text.pixiObj.alpha -= 0.5 * (delta / 1000);

            if (text.pixiObj.alpha < 0)
            {
                entity.destroy();
            }
        });
    }

    types = () => [TextDisp, Toasty];
}
