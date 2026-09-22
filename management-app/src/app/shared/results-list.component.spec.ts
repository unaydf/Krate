import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ItemResult, VotingType } from '../core/models';
import { ResultsListComponent } from './results-list.component';

const RESULTS: ItemResult[] = [
  {
    itemId: 1,
    itemName: 'Pizza',
    imageUrl: null,
    votes: 3,
    points: 3,
    averageRank: null,
    firstPlaces: 3,
    percentage: 75,
    deleted: false,
  },
  {
    itemId: 2,
    itemName: 'Pasta',
    imageUrl: null,
    votes: 1,
    points: 1,
    averageRank: null,
    firstPlaces: 1,
    percentage: 25,
    deleted: true,
  },
];

@Component({
  imports: [ResultsListComponent],
  template: `<app-results-list [results]="results" [type]="type" [scoringLabel]="'votos'" />`,
})
class HostComponent {
  results = RESULTS;
  type: VotingType = 'SINGLE';
}

describe('ResultsListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('destaca al ganador, marca los items eliminados y enlaza al historial', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const rows = el.querySelectorAll('.result');
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains('winner')).toBe(true);
    expect(rows[1].classList.contains('winner')).toBe(false);
    expect(rows[1].textContent).toContain('Item eliminado');
    // La plantilla usa un espacio no separable entre la cifra y la unidad
    const text = (n: Element) => n.textContent?.replace(/\u00a0/g, ' ') ?? '';
    expect(text(rows[0])).toContain('3 votos · 75%');
    expect(text(rows[1])).toContain('1 voto · 25%');

    const link = rows[0].querySelector<HTMLAnchorElement>('a.item-link');
    expect(link?.getAttribute('href')).toBe('/estadisticas/items/1');
    expect(rows[0].querySelector<HTMLElement>('.fill')?.style.width).toBe('75%');
  });

  it('muestra los datos de ranking solo en votaciones RANKING', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'RANKING';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('posición media');
  });
});
