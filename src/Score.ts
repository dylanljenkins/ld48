import {Component, Entity, System, TextDisp, Timer} from "lagom-engine";
import {Layers} from "./LD48";

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
        super.onAdded();
        this.addComponent(new TextDisp(0, 0, "100", {fill: 0xFFFFFF}));
        this.addComponent(new Timer<number>(1000, 200, false)).onTrigger.register(timerTick)

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

    add1()
    {
        this.score += 1;
    }

    sub1()
    {
        this.score -= 1;
    }
}
