import { Component, ElementRef, EventEmitter, OnInit, Output } from '@angular/core';
import { createChart } from '../Models/MapDrawings';
import { createChartNoDraw } from '../Models/MapNotDrawing';
import { IStats } from '../Models/Models';
import { ViewsService } from '../services/views.service';
import { CommonModule } from '@angular/common';

interface DownloadData {
  [year: string]: IStats;
}

@Component({
  selector: 'ds-views',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './views.component.html',
  styleUrls: ['./views.component.scss']
})

export class ViewsComponent implements OnInit {

  @Output() dataPointClicked = new EventEmitter<[string, number]>();

  private searchID = 'lindat.mff.cuni.cz/repository/xmlui/handle/11234/1-2837';
  downloads: DownloadData = {};
  plotDecade: [string, number][] | null = null;
  dataYearly: [string, number][] | null = null;
  dataMonthly: [string, number][] | null = null;
  public months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  public year = 2020;
  public month = 4;
  constructor(private plotDataService: ViewsService, private el: ElementRef) { }

  ngOnInit(): void {
    const targetUrl = this.searchID;
    console.log(this.dataPointClicked);

    this.plotDataService.getDecadeData( targetUrl).subscribe({
      next: data => {
        this.plotDecade = data;
        const container = this.el.nativeElement.querySelector('#decadeChart');
        createChart(container, this.plotDecade, this.dataPointClicked);
      },
      error: err => console.error('Error fetching decade data', err)
    });

    // Fetch and plot yearly data
    this.plotDataService.getYearlyData( targetUrl).subscribe({
      next: data => {
        this.dataYearly = data;
        const container = this.el.nativeElement.querySelector('#yearlyChart');
        createChart(container, this.dataYearly, this.dataPointClicked);
      },
      error: err => console.error('Error fetching yearly data', err)
    });


    this.plotDataService.getMonthData(targetUrl).subscribe({
      next: data => {
        this.dataMonthly = data;
        const container = this.el.nativeElement.querySelector('#monthlyChart');
        createChartNoDraw(container, this.dataMonthly);
      },
      error: err => console.error('Error fetching monthly data', err)
    });


    this.dataPointClicked.subscribe(dataPoint => {
      console.log('Data point received:', dataPoint);
      const [year, month] = dataPoint;
      let findMonth = year.slice(0, -5);
      let findYear = year.slice(-4);
      this.reloadPlot(parseInt(findMonth, 10), parseInt(findYear, 10));
    });
  }

  public reloadPlot(month: number, year: number): void {
    console.log('Reloading plots with Year=', year, 'Month=', this.months[month - 1]);
    this.year = year;
    this.month = month;
    const targetUrl = this.searchID;
    this.el.nativeElement.querySelector('#yearlyChart').innerHTML = '';
    this.el.nativeElement.querySelector('#monthlyChart').innerHTML = '';


    this.plotDataService.getYearlyData( targetUrl).subscribe({
      next: data => {
        this.dataYearly = data;
        const container = this.el.nativeElement.querySelector('#yearlyChart');
        createChart(container, this.dataYearly, this.dataPointClicked);
      },
      error: err => console.error('Error fetching yearly data', err)
    });


    this.plotDataService.getMonthData( targetUrl).subscribe({
      next: data => {
        this.dataMonthly = data;
        const container = this.el.nativeElement.querySelector('#monthlyChart');
         createChartNoDraw(container, this.dataMonthly);
      },
      error: err => console.error('Error fetching monthly data', err)
    });
  }
}
