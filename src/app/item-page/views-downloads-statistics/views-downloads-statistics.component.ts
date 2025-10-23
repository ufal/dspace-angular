import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartData, FileStatistic, StatsData, ViewsDownloadsStatisticsService, YearlyFileStats } from './views-downloads-statistics.service';
import { Item } from 'src/app/core/shared/item.model';
import { filter, Subscription, take } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { RemoteData } from 'src/app/core/data/remote-data';

@Component({
  selector: 'ds-views-downloads-statistics',
  templateUrl: './views-downloads-statistics.component.html',
  styleUrls: ['./views-downloads-statistics.component.scss']
})
export class ViewsDownloadsStatisticsComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', {static: true}) chartContainer!: ElementRef;

  selectedYear: string | undefined = undefined;
  selectedMonth: string | undefined = undefined;
  activeMetric: 'views' | 'downloads' = 'views';

  currentData: ChartData[] = [];
  fileStats: FileStatistic[] = [];
  yearlyFileStats: YearlyFileStats[] = [];

  loading = false;
  error: string | null = null;

  item: Item;
  itemHandle: string;
  private margin = {top: 20, right: 60, bottom: 50, left: 60};
  private width = 800;
  private height = 400;
  private svg: any;
  private colors = {
    views: '#8884d8',
    downloads: '#82ca9d'
  }

  private  subs: Subscription[] = []

  constructor(
    private statsService: ViewsDownloadsStatisticsService,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.route.data.pipe(
        filter((data) => data?.dso),
        take(1)
      ).subscribe((data) => {
        console.log(data)
        const itemRD: RemoteData<Item> = data.dso;
        if(itemRD?.hasSucceeded && itemRD?.payload) {
          this.item = itemRD.payload;
          this.itemHandle = this.item.handle;
          this.fetchData();
        }
      })
    )
  }


  fetchData(year?: string, month?: string) {
    console.log("fetching")
    if(!this.itemHandle) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.subs.push(
      this.statsService.getStats(this.itemHandle, year, month).subscribe({
        next: (data: StatsData) => {
          console.log(data)
          this.currentData = data.chartData;
          this.fileStats = data.fileStats;
          this.yearlyFileStats = data.yearlyFileStats;
          setTimeout(() => this.drawChart(), 0);
          this.loading = false;
        }
      })
    )
  }

  private drawChart() {
    console.log('drawing chart')
    if(!this.chartContainer) {
      return;
    }
  }

   ngOnDestroy(): void {
  }

}
