/// <reference lib="webworker" />
import {
    InsertionContext,
    OptionalPromise,
    PopupLevel,
    ProgramBehaviorAPI,
    ProgramBehaviors,
    ProgramNode,
    registerProgramBehavior,
    ScriptBuilder,
    ValidationContext,
    ValidationResponse
} from '@universal-robots/contribution-api';
import { JodellRagControlNode } from './jodell-rag-control.node';
import { URCAP_ID, VENDOR_ID } from 'src/generated/contribution-constants';
import { JodellClawAppNode } from '../jodell-claw-app/jodell-claw-app.node';

// programNodeLabel is required
const createProgramNodeLabel = (node: JodellRagControlNode): string=>{
    return ` P(${node.position})-V(${node.speed})-F(${node.force})-T(${node.waittime})`;
};

// factory is required
const createProgramNode = (): OptionalPromise<JodellRagControlNode> => ({
    type: 'jodell-jodell-claw-control-frontend-jodell-rag-control',
    version: '1.0.0',
    lockChildren: false,
    allowsChildren: false,
    option: 'Grip',
    speed: 50,
    force: 50,
    position: 100,
    waittime: 2
    // parameters: {

    // },
});



// generateCodeBeforeChildren is optional
const generateScriptCodeBefore = async (node: JodellRagControlNode): Promise<ScriptBuilder> => {
    const builder = new ScriptBuilder();
    const api = new ProgramBehaviorAPI(self);
    const applicationNode = await api.applicationService.getApplicationNode(`jodell-jodell-claw-control-frontend-jodell-claw-app`) as JodellClawAppNode;
    // builder.popup(`Jodell Message: baudrate ${applicationNode.baudrate}, gripperID is ${applicationNode.gripperID}`, 'Application Info', PopupLevel.INFO, true);
    if(!applicationNode.isSimulation){
        builder.ifCondition(`jodell_daemon.getActivateState()=="false"`);
        builder.popup('Gripper NOT activated..','Warning message',PopupLevel.WARNING,true);
        builder.halt();
        builder.end();
        builder.addStatements(`jodell_daemon.controlRag(${node.position*100},${node.speed},${node.force})`);    
    }
    builder.addStatements(`sleep(${node.waittime})`);
    // get_rtde_value("runtime_state")
    return builder;
};

// generateCodeAfterChildren is optional
const generateScriptCodeAfter = (node: JodellRagControlNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// generateCodePreamble is optional
const generatePreambleScriptCode = (node: JodellRagControlNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// validator is optional
const validate = (node: JodellRagControlNode, validationContext: ValidationContext): OptionalPromise<ValidationResponse> => ({
    isValid: true
});

// allowsChild is optional
const allowChildInsert = (node: ProgramNode, childType: string): OptionalPromise<boolean> => true;

// allowedInContext is optional
const allowedInsert = (insertionContext: InsertionContext): OptionalPromise<boolean> => true;

// upgradeNode is optional
const nodeUpgrade = (loadedNode: ProgramNode): ProgramNode => loadedNode;

const behaviors: ProgramBehaviors = {
    programNodeLabel: createProgramNodeLabel,
    factory: createProgramNode,
    generateCodeBeforeChildren: generateScriptCodeBefore,
    generateCodeAfterChildren: generateScriptCodeAfter,
    generateCodePreamble: generatePreambleScriptCode,
    validator: validate,
    allowsChild: allowChildInsert,
    allowedInContext: allowedInsert,
    upgradeNode: nodeUpgrade
};

registerProgramBehavior(behaviors);
