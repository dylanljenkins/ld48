import { Game, Scene } from "lagom-engine";

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
        super.onAdded();
    }
}