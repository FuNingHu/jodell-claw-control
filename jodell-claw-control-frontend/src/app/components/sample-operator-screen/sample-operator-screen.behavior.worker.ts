/// <reference lib="webworker" />
import {
    OperatorScreenBehaviors,
    registerOperatorScreenBehavior,
    ScriptBuilder,
    ValidationResponse,
} from '@universal-robots/contribution-api';
import { SampleOperatorScreen } from './sample-operator-screen.node';

// factory is required
const createOperatorScreen = async (): Promise<SampleOperatorScreen> => ({
    type: 'universal-robots-contribution-samples-sample-operator-screen',
    version: '0.0.1',
    parameters: {},
});

// generateCodePreamble is optional
const generatePreambleScript = async (operatorScreen: SampleOperatorScreen): Promise<ScriptBuilder> => new ScriptBuilder();

// validator is optional
const validate = async (operatorScreen: SampleOperatorScreen): Promise<ValidationResponse> => ({
    isValid: true,
});

const behaviors: OperatorScreenBehaviors = {
    factory: createOperatorScreen,
    validator: validate,
    generatePreamble: generatePreambleScript,
};

registerOperatorScreenBehavior(behaviors);
