
import { SmartSkillInstance } from "@universal-robots/contribution-api";

export interface JodellSmartSkillRagOpenInstance extends SmartSkillInstance{
    name: string;
    type: string;
    enabled?: boolean;
    parameters?:{

    };
}