
import { Component, ElementRef, EventEmitter, OnInit, Output } from '@angular/core';
import { IStats } from '../Models/Models';
import { DownloadsService } from '../services/downloads.service';
import { createChart } from '../Models/MapDrawings';
import { createChartNoDraw } from '../Models/MapNotDrawing';

interface DownloadData {
  [year: string]: IStats;
}
@Component({
  selector: 'ds-downloads',
  standalone: true,
  imports: [],
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.scss']
})
export class DownloadsComponent  implements OnInit {

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
    private dataUrl1 = 'https://lindat.cz/statistics/handle?h=11234/1-2837';
    private dataUrl2 = this.dataUrl1 + '&date=' + String(this.year);
    private dataUrl3 = this.dataUrl2 + '-' + String(this.month);
    constructor(private plotDataService: DownloadsService, private el: ElementRef) { }

    ngOnInit(): void {
      const targetUrl = this.searchID;
      console.log(this.dataPointClicked);
      // Fetch and plot decade data
      this.plotDataService.getDecadeData(this.dataUrl1, targetUrl).subscribe({
        next: data => {
          this.plotDecade = data;
          const container = this.el.nativeElement.querySelector('#decadeChart');
          createChart(container, this.plotDecade, this.dataPointClicked);
        },
        error: err => console.error('Error fetching decade data', err)
      });

      // Fetch and plot yearly data
      this.plotDataService.getYearlyData(this.dataUrl2, targetUrl).subscribe({
        next: data => {
          this.dataYearly = data;
          const container = this.el.nativeElement.querySelector('#yearlyChart');
          createChart(container, this.dataYearly, this.dataPointClicked);
        },
        error: err => console.error('Error fetching yearly data', err)
      });

      // Fetch and plot monthly data
      this.plotDataService.getMonthData(this.dataUrl3, targetUrl).subscribe({
        next: data => {
          this.dataMonthly = data;
          const container = this.el.nativeElement.querySelector('#monthlyChart');
          createChartNoDraw(container, this.dataMonthly);
        },
        error: err => console.error('Error fetching monthly data', err)
      });

      // Subscribe to dataPointClicked EventEmitter
      this.dataPointClicked.subscribe(dataPoint => {
        console.log('Data point received:', dataPoint); // Log the emitted data point
        const [year, month] = dataPoint;
        let findMonth = year.slice(0, -5);
        let findYear = year.slice(-4);
      //  this.reloadPlot(parseInt(findMonth), parseInt(findYear));
        this.reloadPlot(parseInt(findMonth, 10), parseInt(findYear, 10));
      });
    }

    // Reload plot method
    public reloadPlot(month: number, year: number): void {
      console.log('Reloading plots with Year=', year, 'Month=', this.months[month - 1]);
      this.year = year;
      this.month = month;
      const targetUrl = this.searchID;
      const dataUrl2 = this.dataUrl1 + '&date=' + String(this.year);
      const dataUrl3 = dataUrl2 + '-' + String(this.month);
      // Clean up existing charts
      this.el.nativeElement.querySelector('#yearlyChart').innerHTML = '';
      this.el.nativeElement.querySelector('#monthlyChart').innerHTML = '';

      // Fetch and plot yearly data
      this.plotDataService.getYearlyData(dataUrl2, targetUrl).subscribe({
        next: data => {
          this.dataYearly = data;
          const container = this.el.nativeElement.querySelector('#yearlyChart');
          createChart(container, this.dataYearly, this.dataPointClicked);
        },
        error: err => console.error('Error fetching yearly data', err)
      });

      // Fetch and plot monthly data
      this.plotDataService.getMonthData(dataUrl3, targetUrl).subscribe({
        next: data => {
          this.dataMonthly = data;
          const container = this.el.nativeElement.querySelector('#monthlyChart');
          createChartNoDraw(container, this.dataMonthly);
        },
        error: err => console.error('Error fetching monthly data', err)
      });
    }


}
