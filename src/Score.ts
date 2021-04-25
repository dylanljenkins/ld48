import {Component, Entity, MathUtil, System, TextDisp, Timer} from "lagom-engine";
import {Layers} from "./LD48";
import {DropMe} from "./Elevator";

export class ScoreDisplay extends Entity
{
    constructor()
    {
        super("scoredisp", 10, 100, Layers.SCORE);
    }

    onAdded()
    {
        super.onAdded();
        const score = this.addComponent(new Score());
        this.addComponent(new TextDisp(0, 0, "0", {fill: 0xFFFFFF}));

        this.addComponent(new Timer<Score>(1000, score, false)).onTrigger.register(timerTick)

        function timerTick(caller: Timer<Score>, score: Score)
        {
            score.time -= 1;
            caller.parent.addComponent(new Timer(1000, score)).onTrigger.register(timerTick)
        }
    }
}

export class ScoreUpdater extends System
{
    update(delta: number): void
    {
        this.runOnEntities((entity: ScoreDisplay, text: TextDisp, score: Score) => {
            text.pixiObj.text = score.score.toString() + "\n" + score.time.toString();
        })
    }

    types = () => [TextDisp, Score];

}

export class Score extends Component
{
    score = 0;
    time = 30;

    add1(entity: Entity)
    {
        this.score += 1;
        this.time += 10;
        this.getScene().addGUIEntity(new ScoreToast(entity.transform.x, entity.transform.y, "+5s"));
    }

    sub1(entity: Entity, offscreen = false)
    {
        this.score -= 1;
        this.getScene().addGUIEntity(new ScoreToast(entity.transform.x, offscreen ? 350 : entity.transform.y, "-1"));
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
        this.addComponent(new TextDisp(MathUtil.randomRange(-10, 10), MathUtil.randomRange(-12, -4), this.disp,
            {fill: 0xFFFFFF, fontSize: 10}));
        this.addComponent(new DropMe(-20, false));
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
