
import { SmartSkillInstance } from "@universal-robots/contribution-api";

export interface JodellSmartSkillInstance extends SmartSkillInstance{
    name: string;
    type: string;
    baudrate: string;
    gripperID: number;
    enabled?: boolean;
    parameters?:{

    };
}