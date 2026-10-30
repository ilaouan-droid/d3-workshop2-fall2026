// ============================================================================
// DEMO.JS - Track outline (we build this together in class)
// ============================================================================
// Question: what does this circuit look like?
//
// race.outline is a list of [x, y] positions of one car during one lap.
// The units are arbitrary, so we have to scale them into our SVG ourselves.
//
// Read more:
//   Scales      https://d3js.org/d3-scale/linear
//   Lines       https://d3js.org/d3-shape/line
//   Transitions https://d3js.org/d3-transition
// ============================================================================

import { onRaceChange } from './data.js';

// No animation on the first draw (page load); after that, transitions take 750 ms.
// Use .transition().duration(duration), and set duration = 750 at the end of each draw.
let duration = 0;


// ============================================================================
// SVG SETUP
// ============================================================================
// viewBox makes the SVG scale with the page, keeping its shape

const width = 600;
const height = 400;
const padding = 20;

const svg = d3.select('#chart1')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Track outline');

// We create the elements ONCE here, and only change their attributes when the race changes
const track = svg.append('path').attr('class', 'track');

const startDot = svg.append('circle').attr('class', 'start-dot').attr('r', 7);
const startLabel = svg.append('text').text('Start / Finish');

const replayDot = svg.append('circle').attr('class', 'replay-dot').attr('r', 8).attr('opacity', 0);


// ============================================================================
// LINE GENERATOR
// ============================================================================
// d3.line() turns a list of [x, y] points into the "d" attribute of a <path>.

const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));


// ============================================================================
// DRAW (runs for the first race and every time the race changes)
// ============================================================================

onRaceChange(race => {
    const points = race.outline;
    console.log('Outline points:', points.length, points.slice(0, 3));

    const xRange = d3.extent(points, d => d[0]);
    const yRange = d3.extent(points, d => d[1]);

    const trackWidth = xRange[1] - xRange[0];
    const trackHeight = yRange[1] - yRange[0];

    const k = Math.min(
        (width - 2 * padding) / trackWidth,
        (height - 2 * padding) / trackHeight
    );

    const offsetX = (width - trackWidth * k) / 2;
    const offsetY = (height - trackHeight * k) / 2;

    const x = d3.scaleLinear()
        .domain(xRange)
        .range([offsetX, offsetX + trackWidth * k]);

    const y = d3.scaleLinear()
        .domain(yRange)
        .range([offsetY + trackHeight * k, offsetY]);
    
    const screenPoints = points.map(([pointX, pointY]) => [x(pointX), y(pointY)]);

    track.transition().duration(duration).attr('d', line(screenPoints));
    duration = 750;

    const [startX, startY] = screenPoints[0];
    startDot.attr('cx', startX).attr('cy', startY);
    startLabel.attr('x', startX + 10).attr('y', startY + 4);

    // Update the aria-label of the svg with the race name
    svg.attr('aria-label', `Track outline of the ${race.label}`);
    replayDot.interrupt()
        .attr('opacity', 0)
        .attr('cx', startX)
        .attr('cy', startY)
        .attr('transform', null);
});


// ============================================================================
// REPLAY A LAP
// ============================================================================
const replayButton = d3.select('#replay');

replayButton.on('click', () => {
    const path = track.node();
    const length = path.getTotalLength();
    const start = path.getPointAtLength(0);

    replayDot.interrupt()
        .attr('opacity', 1)
        .attr('cx', start.x)
        .attr('cy', start.y)
        .attr('transform', null);

    // Disable the button while the lap plays, so clicks do not restart it
    replayButton.property('disabled', true);

    replayDot.transition()
        .duration(5000)
        .ease(d3.easeLinear) // constant speed
        .attrTween('transform', () => t => {
            const p = path.getPointAtLength(t * length);
            return `translate(${p.x - start.x}, ${p.y - start.y})`;
        })
        // 'end' when the lap finishes, 'interrupt' when a race change stops it
        .on('end interrupt', () => replayButton.property('disabled', false));

});
