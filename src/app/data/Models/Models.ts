export interface ViewData {
  nb_hits: number;
  nb_visits: number;
  nb_uniq_visitors: number;
  nb_uniq_pageviews: number;
}
 export interface DayData {
  [url: string]: ViewData;
}

export interface MonthData {
  [day: string]: DayData;
}

export interface YearData {
  [month: string]: MonthData;
}

export interface Views {
  [year: string]: YearData;
}

export interface TotalData {
  [year: string]: {
    [month: string]: {
      [day: string]: ViewData;
    }
  }
}

export interface Downloads {
  [year: string]: {
    [month: string]: {
      [day: string]: {
        [url: string]: ViewData;
      }
    }
  }
}

export  interface Response {
  views: Views;
  total: TotalData;
  downloads: Downloads;
}

export  interface Data {
  response: Response;
}

export interface PageStats {
  date: string;
  hits: number;
  visits: number;
  uniqueVisitors: number;
  pageViews: number;
}

export interface IStats {
  year: number;
  month: number;
  date: string; // Add this line
  hits: number;
  visits: number;
  uniqueVisitors: number;
  pageViews: number;
}
