import { OperatorScreen } from '@universal-robots/contribution-api';

export interface SampleOperatorScreen extends OperatorScreen {
    type: 'universal-robots-contribution-samples-sample-operator-screen';
    version: '0.0.1';
    parameters?: {
        [key: string]: any;
    };
}
