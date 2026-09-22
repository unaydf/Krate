import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { InstanceStatsSummary } from '../../core/models';
import { StatsListPage } from './stats-list.page';

const ROWS: InstanceStatsSummary[] = [
  {
    id: 1,
    votingPointId: 10,
    votingPointName: 'Entrada',
    votingId: 100,
    votingName: 'Cena',
    status: 'CLOSED',
    startedAt: '2026-09-01T10:00:00Z',
    endedAt: '2026-09-01T11:00:00Z',
    totalVotes: 2,
  },
  {
    id: 2,
    votingPointId: 20,
    votingPointName: 'Salida',
    votingId: 100,
    votingName: 'Cena',
    status: 'ACTIVE',
    startedAt: '2026-09-02T10:00:00Z',
    endedAt: null,
    totalVotes: 1,
  },
];

describe('StatsListPage', () => {
  let listStats: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    listStats = vi.fn().mockResolvedValue(ROWS);
    await TestBed.configureTestingModule({
      imports: [StatsListPage],
      providers: [provideRouter([]), { provide: ApiService, useValue: { listStats } }],
    }).compileComponents();
  });

  it('deriva las opciones de los selectores de los lanzamientos cargados', async () => {
    const fixture = TestBed.createComponent(StatsListPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const pointOptions = [...el.querySelectorAll<HTMLOptionElement>('#point option')].map((o) =>
      o.textContent?.trim(),
    );
    const votingOptions = [...el.querySelectorAll<HTMLOptionElement>('#voting option')].map((o) =>
      o.textContent?.trim(),
    );
    expect(pointOptions).toEqual(['Todos los puntos', 'Entrada', 'Salida']);
    // La misma votación en dos lanzamientos aparece una sola vez
    expect(votingOptions).toEqual(['Todas las votaciones', 'Cena']);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(listStats).toHaveBeenCalledTimes(1);
    expect(listStats).toHaveBeenLastCalledWith();
  });

  it('vuelve a pedir los lanzamientos al backend con el punto elegido', async () => {
    const fixture = TestBed.createComponent(StatsListPage);
    await fixture.whenStable();
    fixture.detectChanges();

    listStats.mockResolvedValue([ROWS[1]]);
    const page = fixture.componentInstance;
    page.pointId = 20;
    await page.reload();
    fixture.detectChanges();

    expect(listStats).toHaveBeenLastCalledWith({ votingPointId: 20, votingId: null });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
    expect(el.textContent).toContain('Quitar filtros');

    page.clear();
    expect(page.pointId).toBeNull();
    expect(listStats).toHaveBeenLastCalledWith({ votingPointId: null, votingId: null });
  });
});
