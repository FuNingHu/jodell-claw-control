import { OperatorScreen } from '@universal-robots/contribution-api';

export interface SampleOperatorScreenConfiguration extends OperatorScreen {
    type: 'universal-robots-contribution-samples-sample-operator-screen-configuration';
    version: '0.0.1';
    parameters?: {
        [key: string]: any;
    };
}
