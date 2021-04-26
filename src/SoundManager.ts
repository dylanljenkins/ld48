import {AnimatedSpriteController, Button, Component, Entity, Mouse, System, Timer} from "lagom-engine";
import {Layers, LD48, sprites} from "./LD48";

class MuteComp extends Component
{
}

class MuteListener extends System
{
    types = () => [AnimatedSpriteController, MuteComp];

    update(delta: number): void
    {
        this.runOnEntities((e: Entity, spr: AnimatedSpriteController) => {
            if (Mouse.isButtonPressed(Button.LEFT))
            {
                const pos = e.scene.game.renderer.plugins.interaction.mouse.global;

                if (pos.x > 640 - 40 && pos.x < 640 - 8 && pos.y > 360 - 40 && pos.y < 360 - 8)
                {
                    (e.scene.getEntityWithName("audio") as SoundManager).toggleMute();
                    spr.setAnimation(Number(LD48.muted));
                }
            }
        });
    }
}

export class SoundManager extends Entity
{
    constructor()
    {
        super("audio", 640 - 32, 360 - 32, Layers.SCORE);

        this.startMusic();
    }

    onAdded(): void
    {
        super.onAdded();

        this.addComponent(new MuteComp());
        const spr = this.addComponent(new AnimatedSpriteController(Number(LD48.muted), [
            {
                id: 0,
                textures: sprites.textures([[0, 5]])
            }, {
                id: 1,
                textures: sprites.textures([[1, 5]])
            }]));

        this.addComponent(new Timer(50, spr, false)).onTrigger.register((caller, data) => {
            data.setAnimation(Number(LD48.muted));
        });

        this.scene.addSystem(new MuteListener());
    }

    toggleMute()
    {
        LD48.muted = !LD48.muted;

        if (LD48.muted)
        {
            this.stopAllSounds();
        }
        else
        {
            this.startMusic();
        }
    }

    startMusic()
    {
        if (!LD48.muted && !LD48.musicPlaying)
        {
            LD48.audioAtlas.play("music");
            LD48.musicPlaying = true;
        }
    }

    stopAllSounds(music = true)
    {
        if (music)
        {
            LD48.audioAtlas.sounds.forEach((v, k) => v.stop());
            LD48.musicPlaying = false;
        }
        else
        {
            LD48.audioAtlas.sounds.forEach((v, k) => {
                if (k !== "music") v.stop();
            });
        }
    }

    onRemoved(): void
    {
        super.onRemoved();
        this.stopAllSounds(false);
    }

    playSound(name: string)
    {
        if (!LD48.muted)
        {
            LD48.audioAtlas.play(name);
        }
    }
}
