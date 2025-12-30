
import { SmartSkillInstance } from "@universal-robots/contribution-api";

export interface JodellSmartSkillCloseInstance extends SmartSkillInstance{
    name: string;
    type: string;
    enabled?: boolean;
    parameters?:{

    };
}