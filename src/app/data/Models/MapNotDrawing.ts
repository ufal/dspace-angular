import * as d3 from 'd3';

export function createChartNoDraw(
  container: HTMLElement,
  data: [string, number][],
  width: number = window.innerWidth * 0.9,
  height: number = 400
): void {
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  const x = createXAxis(svg, data, innerWidth);
  const y = createYAxis(svg, data, innerHeight);
  drawLine(svg, data, x, y);
}


export function drawDots(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: [string, number][],
  x: d3.ScaleBand<string>,
  y: d3.ScaleLinear<number, number>
): void {

  svg.selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', (d: [string, number]) => (x(d[0]) ?? 0) + x.bandwidth() / 2)
    .attr('cy', (d: [string, number]) => y(d[1]))
    .attr('r', 5)
    .attr('fill', '#d04a35');
}


export function drawLine(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: [string, number][],
  x: d3.ScaleBand<string>,
  y: d3.ScaleLinear<number, number>
): void {
  // Define the area generator
  const area = d3.area<[string, number]>()
    .x((d: [string, number]) => (x(d[0]) ?? 0) + x.bandwidth() / 2)
    .y0(y(0))
    .y1((d: [string, number]) => y(d[1]));

  svg.append('path')
    .datum(data)
    .attr('fill', 'red')
    .attr('opacity', 0.2)
    .attr('d', area);


  const line = d3.line<[string, number]>()
    .x((d: [string, number]) => (x(d[0]) ?? 0) + x.bandwidth() / 2)
    .y((d: [string, number]) => y(d[1]));

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#d04a35')
    .attr('stroke-width', 1.5)
    .attr('d', line);
}

export function createXAxis(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: [string, number][],
  width: number
): d3.ScaleBand<string> {
  const x = d3.scaleBand()
    .range([0, width])
    .domain(data.map(d => d[0]))
    .paddingInner(0.1)
    .paddingOuter(0.1);

  svg.append('g')
    .attr('transform', `translate(0, ${300})`)
    .call(d3.axisBottom(x));
  svg.selectAll('.x-grid')
    .data(x.domain())
    .enter()
    .append('line')
    .attr('class', 'x-grid')
    .attr('x1', (d: string) => x(d) || 0)
    .attr('x2', (d: string) => x(d) || 0)
    .attr('y1', 0)
    .attr('y2', 300)
    .attr('stroke', '#ddd')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '2,2');
  return x;
}

export function createYAxis(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: [string, number][],
  height: number
): d3.ScaleLinear<number, number> {
  const numericData = data.map(d => d[1]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(numericData) ?? 0])
    .range([height, 0]);


  svg.append('g')
    .call(d3.axisLeft(y).ticks(d3.max(numericData, d => Math.ceil(d / 250)) ?? 0));
  svg.selectAll('.y-grid')
    .data(y.ticks(d3.max(numericData, d => Math.ceil(d / 100)) ?? 0))
    .enter()
    .append('line')
    .attr('class', 'y-grid')
    .attr('x1', 0)
    .attr('x2', window.innerWidth * 0.99)
    .attr('y1', d => y(d))
    .attr('y2', d => y(d))
    .attr('stroke', '#ddd')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '2,2');
  return y;
}
