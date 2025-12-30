import { ProgramNode } from '@universal-robots/contribution-api';

export interface JodellClawControlNode extends ProgramNode {
    type: string;
    option:string;
    speed:number;
    force:number;
    position:number;
    waittime: number;
    parameters?: {
    };
    lockChildren?: boolean;
    allowsChildren?: boolean;
}
