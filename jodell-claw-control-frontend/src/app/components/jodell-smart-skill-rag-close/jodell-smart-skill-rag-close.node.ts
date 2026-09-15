
import { SmartSkillInstance } from "@universal-robots/contribution-api";

export interface JodellSmartSkillRagCloseInstance extends SmartSkillInstance{
    name: string;
    type: string;
    enabled?: boolean;
    parameters?:{

    };
}