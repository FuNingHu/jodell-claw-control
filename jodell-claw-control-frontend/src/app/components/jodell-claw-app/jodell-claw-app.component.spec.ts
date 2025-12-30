import {ComponentFixture, TestBed} from '@angular/core/testing';
import {JodellClawAppComponent} from "./jodell-claw-app.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {Observable, of} from "rxjs";

describe('JodellClawAppComponent', () => {
  let fixture: ComponentFixture<JodellClawAppComponent>;
  let component: JodellClawAppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [JodellClawAppComponent],
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

    fixture = TestBed.createComponent(JodellClawAppComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
