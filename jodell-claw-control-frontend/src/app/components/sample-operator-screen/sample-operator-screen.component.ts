import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { OperatorScreen, OperatorScreenPresenter, OperatorScreenPresenterAPI, RobotSettings } from '@universal-robots/contribution-api';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './sample-operator-screen.component.html',
    styleUrls: ['./sample-operator-screen.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleOperatorScreenComponent implements OperatorScreenPresenter {
    @Input() presenterAPI: OperatorScreenPresenterAPI;
    @Input() robotSettings: RobotSettings;
    @Input() operatorScreen: OperatorScreen;
}
