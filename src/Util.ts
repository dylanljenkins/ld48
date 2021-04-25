import {Entity} from "lagom-engine";

export class Coords
{
    constructor(public x: number, public y: number)
    {
    }
}

export const getCenterCoords = (entity: Entity): Coords =>
{
    return new Coords(entity.transform.x + entity.transform.width / 2, entity.transform.y + entity.transform.height / 2);
}
