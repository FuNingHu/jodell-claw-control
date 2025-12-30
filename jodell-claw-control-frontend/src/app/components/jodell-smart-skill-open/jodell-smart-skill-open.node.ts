
import { SmartSkillInstance } from "@universal-robots/contribution-api";

export interface JodellSmartSkillOpenInstance extends SmartSkillInstance{
    name: string;
    type: string;
    enabled?: boolean;
    parameters?:{

    };
}