import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { getMaxValueForEachYear } from '../Models/MapFunctions';

interface ViewData {
  nb_hits: number;
  nb_visits: number;
  nb_uniq_visitors: number;
  nb_uniq_pageviews: number;
}

interface DayData {
  [url: string]: ViewData;
}

interface MonthData {
  [day: string]: DayData;
}

interface YearData {
  [month: string]: MonthData;
}

interface Views {
  [year: string]: YearData;
}

interface TotalData {
  [year: string]: {
    [month: string]: {
      [day: string]: ViewData;
    }
  }
}

interface Downloads {
  [year: string]: {
    [month: string]: {
      [day: string]: {
        [url: string]: ViewData;
      }
    }
  }
}

interface Response {
  views: Views;
  total: TotalData;
  downloads: Downloads;
}

interface Data {
  response: Response;
}


@Injectable({
  providedIn: 'root'
})
export class DownloadsService {
  constructor(private http: HttpClient) { }
  getMonthData(endPoint: string, targetUrl: string): Observable<[string, number][]> {
    return this.http.get<Data>(endPoint).pipe(
      map(data => this.prepareMonthlyData(data.response.downloads, targetUrl))
    );
  }
  getYearlyData(endPoint: string, targetUrl: string): Observable<[string, number][]> {
    return this.http.get<Data>(endPoint).pipe(
      map(data => this.prepareYearData(data.response.downloads, targetUrl))
    );
  }
  getDecadeData(endPoint: string, targetUrl: string): Observable<[string, number][]> {
    return this.http.get<Data>(endPoint).pipe(
      map(data => this.prepareDecadePlotData(data.response.downloads, targetUrl))
    );
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

                  for (const day in monthData) {
                      if (monthData.hasOwnProperty(day)) {
                          const z = monthData[day];
                          if (z) {
                              const hitsData = z.nb_hits;
                              const hitsMonth = `${month}_${year}`;
                              plotYearlyData.push([hitsMonth, Number(hitsData)]);
                          }
                      }
                  }
              }
          }
      }
  }

  return getMaxValueForEachYear(plotYearlyData);
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
                let CurrentID = Object.keys(dayData)[0];
                if (year !== 'total') {
                  const key = Object.keys(dayData)[0];
                  let z = monthData[targetUrl];
                  const hitsN = dayData[key].nb_hits;
                  console.log(hitsN);

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

}

