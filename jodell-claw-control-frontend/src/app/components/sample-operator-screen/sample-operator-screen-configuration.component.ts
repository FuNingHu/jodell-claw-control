import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { OperatorScreen, OperatorScreenConfigurationPresenter, OperatorScreenPresenterAPI, RobotSettings } from '@universal-robots/contribution-api';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './sample-operator-screen-configuration.component.html',
    styleUrls: ['./sample-operator-screen-configuration.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleOperatorScreenConfigurationComponent implements OperatorScreenConfigurationPresenter {
    @Input() presenterAPI: OperatorScreenPresenterAPI;
    @Input() robotSettings: RobotSettings;
    @Input() operatorScreen: OperatorScreen;
}
