import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartData, FileStatistic, StatsData, ViewsDownloadsStatisticsService, YearlyFileStats } from './views-downloads-statistics.service';
import { filter, Subscription, take } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { RemoteData } from 'src/app/core/data/remote-data';
import { Item } from 'src/app/core/shared/item.model';
import { ChartDrawerService } from './chart-drawer.service';
@Component({
  selector: 'ds-views-downloads-statistics',
  templateUrl: './views-downloads-statistics.component.html',
  styleUrls: ['./views-downloads-statistics.component.scss']
})
export class ViewsDownloadsStatisticsComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

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

  private subscriptions: Subscription[] = [];

  constructor(
    private statsService: ViewsDownloadsStatisticsService,
    private route: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private chartDrawer: ChartDrawerService
  ) {}

  ngOnInit() {
    this.subscriptions.push(
      this.route.data.pipe(
        filter((data) => data?.dso),
        take(1)
      ).subscribe((data) => {
        const itemRD: RemoteData<Item> = data.dso;
        if (itemRD?.hasSucceeded && itemRD?.payload) {
          this.item = itemRD.payload;
          this.itemHandle = this.item.handle;
          this.fetchData();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private fetchData(year?: string, month?: string) {
    if (!this.itemHandle) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.subscriptions.push(
      this.statsService.getStats(this.itemHandle, year, month).subscribe({
        next: (data: StatsData) => {
          this.currentData = data.chartData;
          this.fileStats = data.fileStats;
          this.yearlyFileStats = data.yearlyFileStats;
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.drawChart(), 0);
        },
        error: (err) => {
          console.error('Error fetching data:', err);
          this.error = 'Failed to load statistics. Please try again later.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      })
    );
  }

  onDataPointClick(event: ChartData): void {
    if (!this.selectedYear) {
      this.selectedYear = event.period;
      this.cdr.detectChanges();
      this.fetchData(this.selectedYear);
    } else if (!this.selectedMonth) {
      this.selectedMonth = event.period;
      this.cdr.detectChanges();
      this.fetchData(this.selectedYear, this.selectedMonth);
    }
  }

  onBack(): void {
    if (this.selectedMonth) {
      this.selectedMonth = undefined;
      this.cdr.detectChanges();
      this.fetchData(this.selectedYear);
    } else if (this.selectedYear) {
      this.selectedYear = undefined;
      this.cdr.detectChanges();
      this.fetchData();
    }
  }

  selectMetric(metric: 'views' | 'downloads'): void {
    this.activeMetric = metric;
    setTimeout(() => this.drawChart(), 0);
  }

  getTitle(): string {
    if (this.selectedMonth) {
      return `Daily Statistics for ${this.getMonthName(this.selectedMonth)} ${this.selectedYear}`;
    } else if (this.selectedYear) {
      return `Monthly Statistics for ${this.selectedYear}`;
    }
    return 'Repository Usage Statistics';
  }

  getYearLabel(): string {
    if (this.selectedMonth) {
      return `${this.getMonthName(this.selectedMonth)}`;
    } else if (this.selectedYear) {
      return 'All Months';
    }
    return 'All Years';
  }

  getYearRange(): string {
    if (this.selectedYear) {
      return this.selectedYear;
    }
    if (this.currentData.length > 0) {
      const years = this.currentData.map(d => d.period).sort();
      return `${years[0]} - ${years[years.length - 1]}`;
    }
    return '';
  }

  getTotalViews(): number {
    return this.currentData.reduce((sum, d) => sum + d.views, 0);
  }

  getTotalDownloads(): number {
    return this.currentData.reduce((sum, d) => sum + d.downloads, 0);
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private getMonthName(month: string): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month, 10) - 1] || month;
  }

  backToItem(): void {
    this.location.back();
  }

  private drawChart(): void {
    if (!this.chartContainer) {
      return;
    }

    this.chartDrawer.drawChart(
      this.chartContainer.nativeElement,
      this.currentData,
      this.activeMetric,
      (data: ChartData) => this.onDataPointClick(data),
      !!this.selectedMonth // Last level if month is selected
    );
  }

}
