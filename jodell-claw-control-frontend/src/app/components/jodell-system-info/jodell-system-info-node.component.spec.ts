import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JodellSystemInfoNodeComponent } from './jodell-system-info-node.component';

describe('Sample system info node component', () => {
    let component: JodellSystemInfoNodeComponent;
    let fixture: ComponentFixture<JodellSystemInfoNodeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(JodellSystemInfoNodeComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });
});
