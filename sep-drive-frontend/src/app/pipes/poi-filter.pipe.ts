import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'poiFilter',
  standalone: true
})
export class PoiFilterPipe implements PipeTransform {
  transform(pois: any[], search: string): any[] {
    if (!search) return pois;
    const lower = search.toLowerCase();
    return pois.filter(poi => {
      const name = poi?.tags?.name || '';
      return name.toLowerCase().includes(lower);
    });
  }
}
//Pipe für evtl. Wiederverwendung Zyklus 2/3, ist übersichtlicher
