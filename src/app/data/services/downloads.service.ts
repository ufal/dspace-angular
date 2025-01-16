import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { getMaxValueForEachYear } from '../Models/MapFunctions';
import { Data } from 'ejs';
import { Views } from '../Models/Models';

@Injectable({
  providedIn: 'root'
})
export class DownloadsService {
  public year = 2020;
  public month = 4;
  private apiUrl = '/api?h=11234/1-2837';
  private apiUrl2 = this.apiUrl + '&date=' + String(this.year);
  private apiUrl3 = this.apiUrl2 + '-' + String(this.month);

  constructor(private http: HttpClient) { }

  getMonthData(targetUrl: string): Observable<[string, number][]> {
    return this.http.get<Data>(this.apiUrl3).pipe(
      map(data => this.prepareMonthlyData(data.response.downloads, targetUrl))
    );
  }

  getYearlyData(targetUrl: string): Observable<[string, number][]> {
    return this.http.get<Data>(this.apiUrl2).pipe(
      map(data => this.prepareYearData(data.response.downloads, targetUrl))
    );
  }

  getDecadeData(targetUrl: string): Observable<[string, number][]> {
    return this.http.get<Data>(this.apiUrl).pipe(
      map(data => this.prepareDecadePlotData(data.response.downloads, targetUrl))
    );
  }

  private prepareMonthlyData(downloads: Views, targetUrl: string): [string, number][] {
    const monthlyData: [string, number][] = [];
    for (const year in downloads) {
      if (downloads.hasOwnProperty(year)) {
        const yearData = downloads[year];
        for (const month in yearData) {
          if (yearData.hasOwnProperty(month)) {
            const monthData = yearData[month];
            for (const day in monthData) {
              if (monthData.hasOwnProperty(day)) {
                const dayData = monthData[day];
                if (year !== 'total') {
                  const key = Object.keys(dayData)[0];
                  const hitsN = dayData[key].nb_hits;
                  monthlyData.push([String(day), Number(hitsN)]);
                }
              }
            }
          }
        }
      }
    }
    return monthlyData;
  }

  private prepareYearData(downloads: Views, targetUrl: string): [string, number][] {
    const plotYearlyData: [string, number][] = [];
    const yearHitsAccumulator: { [key: string]: number } = {};
    for (const year in downloads) {
      if (downloads.hasOwnProperty(year)) {
        const yearData = downloads[year];
        yearHitsAccumulator[year] = yearHitsAccumulator[year] || 0;
        for (const month in yearData) {
          if (yearData.hasOwnProperty(month)) {
            const monthData = yearData[month];
            console.log(monthData);
            for (const day in monthData) {
              if (monthData.hasOwnProperty(day)) {
                const z = monthData[day];
                if (z) {
                  const hitsMonth = `${month}_${year}`;
                  plotYearlyData.push([hitsMonth, Number(z.nb_hits)]);
                }
              }
            }
          }
        }
      }
    }
    return getMaxValueForEachYear(plotYearlyData);
  }

  private prepareDecadePlotData(downloads: Views, targetUrl: string): [string, number][] {
    const wholeDataSet: [string, number, number][] = [];
    const plotDecadeData: [string, number][] = [];
    const yearHitsAccumulator: { [key: string]: number } = {};
    for (const year in downloads) {
      if (downloads.hasOwnProperty(year)) {
        const yearData = downloads[year];
        if (!yearHitsAccumulator[year]) {
          yearHitsAccumulator[year] = 0;
        }
        for (const month in yearData) {
          if (yearData.hasOwnProperty(month)) {
            const monthData = yearData[month];
            for (const day in monthData) {
              if (monthData.hasOwnProperty(day)) {
                const dayData = monthData[day];
                if (year !== 'total' && (day === 'nb_hits')) {
                  yearHitsAccumulator[year] += Number(dayData);
                  const sumDayDataPerYear = yearHitsAccumulator[year];
                  wholeDataSet.push([String(year + '_' + day), Number(sumDayDataPerYear), Number(dayData)]);
                  plotDecadeData.push([String(year), Number(sumDayDataPerYear)]);
                }
              }
            }
          }
        }
      }
    }
    const maxByYear = getMaxValueForEachYear(plotDecadeData);
    return maxByYear;
  }

}
