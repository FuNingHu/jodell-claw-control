
import { SmartSkillInstance } from "@universal-robots/contribution-api";

export interface JodellSmartSkillRagInitInstance extends SmartSkillInstance{
    name: string;
    type: string;
    baudrate: string;
    gripperID: number;
    enabled?: boolean;
    parameters?:{

    };
}