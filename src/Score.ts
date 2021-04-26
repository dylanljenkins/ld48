import {Component, Entity, MathUtil, System, TextDisp, Timer} from "lagom-engine";
import {GameOverScene, Layers} from "./LD48";
import {DropMe} from "./Elevator";
import {SoundManager} from "./SoundManager";

export class ScoreDisplay extends Entity
{
    constructor()
    {
        super("scoredisp", 286, 119, Layers.SCORE);
    }

    onAdded()
    {
        super.onAdded();
        const score = this.addComponent(new Score());
        this.addComponent(new TextDisp(0, 0, "0", {fill: 0x696a6a, fontSize: 18}));

        this.addComponent(new Timer<Score>(1000, score, false)).onTrigger.register(timerTick)

        function timerTick(caller: Timer<Score>, score: Score)
        {
            score.time -= 1;
            score.elapsed += 1;

            if (score.time <= 0)
            {
                caller.getScene().getGame().setScene(new GameOverScene(caller.getScene().getGame(), score.elapsed));
            }
            else
            {
                caller.parent.addComponent(new Timer(1000, score)).onTrigger.register(timerTick);
            }
        }
    }
}

export class ScoreUpdater extends System
{
    update(delta: number): void
    {
        this.runOnEntities((entity: ScoreDisplay, text: TextDisp, score: Score) => {
            text.pixiObj.text = `Score: ${score.elapsed}\nTime: ${score.time}`;
        })
    }

    types = () => [TextDisp, Score];

}

export class Score extends Component
{
    elapsed = 0;
    time = 30;

    add1(entity: Entity)
    {
        const addedTime = 10;
        this.time += addedTime;
        this.getScene().addGUIEntity(new ScoreToast(entity.transform.x, entity.transform.y, `+${addedTime}s`));
        (this.getScene().getEntityWithName("audio") as SoundManager)?.playSound("portal");
    }

    sub1(entity: Entity, offscreen = false)
    {
        const removedTime = 5;
        this.time -= removedTime;
        this.getScene().addGUIEntity(new ScoreToast(entity.transform.x, offscreen ? 350 : entity.transform.y,
            `-${removedTime}s`));
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
