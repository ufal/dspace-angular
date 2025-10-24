import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ChartData } from './views-downloads-statistics.service';

export interface ChartConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colors: { views: string; downloads: string };
}

@Injectable({
  providedIn: 'root'
})
export class ChartDrawerService {
  private readonly defaultConfig: ChartConfig = {
    width: 800,
    height: 400,
    margin: { top: 20, right: 60, bottom: 50, left: 60 },
    colors: {
      views: '#8884d8',
      downloads: '#82ca9d'
    }
  };

  constructor() {}

  drawChart(
    containerElement: HTMLElement,
    data: ChartData[],
    activeMetric: 'views' | 'downloads',
    onDataPointClick: (data: ChartData) => void,
    isLastLevel: boolean = false,
    config: Partial<ChartConfig> = {}
  ): void {
    const chartConfig = { ...this.defaultConfig, ...config };
    const { width, height, margin, colors } = chartConfig;

    // Clear previous chart
    d3.select(containerElement).selectAll('*').remove();

    // Set up the SVG
    const svg = d3.select(containerElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales - first point starts at Y-axis, last point ends at right edge
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.period))
      .range([0, width])
      .padding(0); // First point at x=0 (Y-axis line)

    // Calculate Y-scale: from 0 to max value with padding
    const dataMax = d3.max(data, d => d[activeMetric]) || 0;
    const yMax = dataMax * 1.2; // Add 20% padding at top for breathing room

    const yScale = d3.scaleLinear()
      .domain([0, yMax]) // Y-axis starts at 0, ends at max + padding
      .range([height, 0])
      .nice(); // Rounds to nice round numbers

    // Create line generator
    const createLine = () => {
      return d3.line<ChartData>()
        .x(d => xScale(d.period) || 0)
        .y(d => yScale(d[activeMetric]))
        .curve(d3.curveMonotoneX);
    };

    // Create area generator for fill under the line
    const createArea = () => {
      return d3.area<ChartData>()
        .x(d => xScale(d.period) || 0)
        .y0(height)
        .y1(d => yScale(d[activeMetric]))
        .curve(d3.curveMonotoneX);
    };

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('dx', '0')
      .attr('dy', '20');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale));

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('stroke-opacity', 0.2);

    // Add the area fill (gradient effect under the line)
    svg.append('path')
      .datum(data)
      .attr('fill', colors[activeMetric])
      .attr('fill-opacity', 0.2)
      .attr('d', createArea());

    // Draw line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors[activeMetric])
      .attr('stroke-width', 2)
      .attr('d', createLine());

    // Add dots
    svg.selectAll('dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d: ChartData) => xScale(d.period) || 0)
      .attr('cy', (d: ChartData) => yScale(d[activeMetric]))
      .attr('r', 4)
      .attr('fill', colors[activeMetric])
      .style('cursor', isLastLevel ? 'default' : 'pointer')
      .on('click', (event: any, d: ChartData) => {
        if (!isLastLevel) {
          onDataPointClick(d);
        }
      });

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 100}, 0)`);

    legend.append('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('fill', colors[activeMetric]);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('text-anchor', 'start')
      .style('text-transform', 'capitalize')
      .text(activeMetric);

    // Add tooltip
    const tooltip = d3.select(containerElement)
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
    svg.selectAll('circle')
      .on('mouseover', (event: any, d: ChartData) => {
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`
          <strong>${d.period}</strong><br/>
          ${activeMetric}: ${d[activeMetric]}
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

