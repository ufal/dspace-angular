import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartData, FileStatistic, StatsData, ViewsDownloadsStatisticsService, YearlyFileStats } from './views-downloads-statistics.service';
import { Item } from 'src/app/core/shared/item.model';
import { filter, Subscription, take } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { RemoteData } from 'src/app/core/data/remote-data';
import { select } from '@ngrx/store';
import * as d3 from 'd3';
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

  private margin = { top: 20, right: 60, bottom: 50, left: 60 };
  private width = 800;
  private height = 400;
  private svg: any;
  private colors = {
    views: '#8884d8',
    downloads: '#82ca9d'
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private statsService: ViewsDownloadsStatisticsService,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit() {
    // this.subscriptions.push(
    //   this.route.data.pipe(
    //     filter((data) => data?.dso),
    //     take(1)
    //   ).subscribe((data) => {
    //     const itemRD: RemoteData<Item> = data.dso;
    //     if (itemRD?.hasSucceeded && itemRD.payload) {
    //       this.item = itemRD.payload;
    //       this.itemHandle = this.item.handle;
    //       this.fetchData();
    //     }
    //   })
    // );
    this.subscriptions.push(
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
          setTimeout(() => this.drawChart(), 0);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching data:', err);
          this.error = 'Failed to load statistics. Please try again later.';
          this.loading = false;
        }
      })
    );
  }

  onDataPointClick(event: ChartData): void {
    if (!this.selectedYear) {
      this.selectedYear = event.period;
      this.fetchData(this.selectedYear);
    } else if (!this.selectedMonth) {
      this.selectedMonth = event.period;
      this.fetchData(this.selectedYear, this.selectedMonth);
    }
  }

  onBack(): void {
    if (this.selectedMonth) {
      this.selectedMonth = undefined;
      this.fetchData(this.selectedYear);
    } else if (this.selectedYear) {
      this.selectedYear = undefined;
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

    // Clear previous chart
    d3.select(this.chartContainer.nativeElement).selectAll('*').remove();

    // Set up the SVG
    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Set up scales
    const xScale = d3.scaleBand()
      .domain(this.currentData.map(d => d.period))
      .range([0, this.width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(
        d3.max(this.currentData, d => d[this.activeMetric]) || 0
      ) * 1.1])
      .range([this.height, 0]);

    // Create line generator
    const createLine = () => {
      return d3.line<ChartData>()
        .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d[this.activeMetric]))
        .curve(d3.curveMonotoneX);
    };

    // Add X axis
    this.svg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('dx', '0')
      .attr('dy', '20');

    // Add Y axis
    this.svg.append('g')
      .call(d3.axisLeft(yScale));

    // Add grid lines
    this.svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-this.width)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('stroke-opacity', 0.2);

    // Draw line
    this.svg.append('path')
      .datum(this.currentData)
      .attr('fill', 'none')
      .attr('stroke', this.colors[this.activeMetric])
      .attr('stroke-width', 2)
      .attr('d', createLine());

    // Add dots
    this.svg.selectAll('dot')
      .data(this.currentData)
      .enter()
      .append('circle')
      .attr('cx', (d: ChartData) => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
      .attr('cy', (d: ChartData) => yScale(d[this.activeMetric]))
      .attr('r', 4)
      .attr('fill', this.colors[this.activeMetric])
      .style('cursor', this.selectedMonth ? 'default' : 'pointer')
      .on('click', (event: any, d: ChartData) => {
        if (!this.selectedMonth) {
          this.onDataPointClick(d);
        }
      });

    // Add legend
    const legend = this.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.width - 100}, 0)`);

    const legendData = [
      { name: this.activeMetric, color: this.colors[this.activeMetric] }
    ];

    legendData.forEach((d, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', d.color);

      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .attr('text-anchor', 'start')
        .style('text-transform', 'capitalize')
        .text(d.name);
    });

    // Add tooltip
    const tooltip = d3.select(this.chartContainer.nativeElement)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('padding', '10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none');

    // Add hover effects
    this.svg.selectAll('circle')
      .on('mouseover', (event: any, d: ChartData) => {
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`
          <strong>${d.period}</strong><br/>
          ${this.activeMetric}: ${d[this.activeMetric]}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
  }

}
