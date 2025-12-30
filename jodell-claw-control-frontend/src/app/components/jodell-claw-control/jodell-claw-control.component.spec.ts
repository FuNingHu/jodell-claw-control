import {ComponentFixture, TestBed} from '@angular/core/testing';
import {JodellClawControlComponent} from "./jodell-claw-control.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {Observable, of} from "rxjs";

describe('JodellClawControlComponent', () => {
  let fixture: ComponentFixture<JodellClawControlComponent>;
  let component: JodellClawControlComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [JodellClawControlComponent],
      imports: [TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader, useValue: {
            getTranslation(): Observable<Record<string, string>> {
              return of({});
            }
          }
        }
      })],
    }).compileComponents();

    fixture = TestBed.createComponent(JodellClawControlComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
