import { ApplicationNode } from '@universal-robots/contribution-api';

export interface JodellClawAppNode extends ApplicationNode {
  type: string;
  version: string;
  gripperID: number;
  baudrate: string;
  isSimulation: boolean;
}
export interface Hero{
  id:string;
  name:string;
}
