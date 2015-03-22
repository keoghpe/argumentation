"use strict"

// set up SVG for D3
var width  = 800,
    height = 800,
    colors = d3.scale.category10();

var RESULTS = {};

// var zoom = d3.behavior.zoom()
//     .scaleExtent([.1, 10])
//     .on("zoom", function() {
//       //container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
//       container.attr("transform", "scale(" + d3.event.scale + ")");
//       console.log("zoom");
//     });


var svg = d3.select('#graph')
.append('svg')
.attr('width', width)
.attr('height', height);
//.call(zoom);

var container = svg.append("g");

var points = [];

// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
var nodes = [
  // {
  //   id: 0,
  //   reflexive: false,
  //   membership_functions: [{
  //     title: "Something else",
  //     points: [{x: 1, y: 25}, {x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 25}, {x: 22, y: 12}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 50,
  //     yMin: 0,
  //     yMax: 50,
  //   },
  //   {
  //     title: "Something 1",
  //     points: [{x: 10, y: 140}, {x: 30, y: 0}, {x: 140, y: 0}, {x: 200, y: 150}, {x: 125, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   }
  //   ]
  // },
  // {
  //   id: 1,
  //   reflexive: false,
  //   membership_functions: [{
  //     title: "Something 2",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   },
  //   {
  //     title: "Something 3",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   }
  //   ]
  // },
  // {
  //   id: 2,
  //   reflexive: false,
  //   membership_functions: [{
  //     title: "Something 4",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   },
  //   {
  //     title: "Something 5",
  //     points: [{x: 10, y: 250}, {x: 0, y: 0}, {x: 100, y: 0}, {x: 200, y: 250}, {x: 225, y: 125}],
  //     xLabel: "X Label",
  //     yLabel: "Y Label",
  //     xMin: 0,
  //     xMax: 250,
  //     yMin: 0,
  //     yMax: 300,
  //   }
  //   ]
  // }
],
  lastNodeId = -1,//2,
  links = [
    // {source: nodes[0], target: nodes[1], left: false, right: true },
    // {source: nodes[1], target: nodes[2], left: false, right: true }
];


var templateCurves = [];


// Retrieve the object from storage
var retrievedObject = localStorage.getItem('lastSessionData');
if(retrievedObject !== null) {
  var lastData = JSON.parse(retrievedObject);

  nodes = lastData.nodes;
  links = lastData.links;
  templateCurves = lastData.templates;

  for(var i = 0; i < links.length; i++){
    links[i].source = nodes[links[i].source.id];
    links[i].target = nodes[links[i].target.id]
  }

  lastNodeId = Number(lastData.last);
  //localStorage.setItem('lastSessionData', JSON.stringify({nodes: nodes, links: links, last: last_node_id}));
}

// init D3 force layout
var force = d3.layout.force()
.nodes(nodes)
.links(links)
.size([width, height])
.linkDistance(200)
.charge(-200)
.on('tick', tick);

// define arrow markers for graph links
container.append('svg:defs').append('svg:marker')
.attr('id', 'end-arrow')
.attr('viewBox', '0 -5 10 10')
.attr('refX', 6)
.attr('markerWidth', 3)
.attr('markerHeight', 3)
.attr('orient', 'auto')
.append('svg:path')
.attr('d', 'M0,-5L10,0L0,5')
.attr('fill', '#000');

container.append('svg:defs').append('svg:marker')
.attr('id', 'start-arrow')
.attr('viewBox', '0 -5 10 10')
.attr('refX', 4)
.attr('markerWidth', 3)
.attr('markerHeight', 3)
.attr('orient', 'auto')
.append('svg:path')
.attr('d', 'M10,-5L0,0L10,5')
.attr('fill', '#000');

// line displayed when dragging new nodes
var drag_line = container.append('svg:path')
.attr('class', 'link dragline hidden')
.attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = container.append('svg:g').selectAll('path'),
circle = container.append('svg:g').selectAll('g');

// mouse event vars
var selected_node = null,
selected_link = null,
mousedown_link = null,
mousedown_node = null,
mouseup_node = null,
current_function = 0;

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick() {
    // draw directed edges with proper padding from node centers
    path.attr('d', function(d) {
        var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 12,
        targetPadding = d.right ? 17 : 12,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });

    circle.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });
}

// update graph (called when needed)
function restart() {

    // force = d3.layout.force()
    // .nodes(nodes)
    // .links(links)
    // .size([width, height])
    // .linkDistance(150)
    // .charge(-500)
    // .on('tick', tick);
    // path (link) group

    force.nodes(nodes);
    force.links(links);

    path = path.data(links);

    // update existing links
    path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });


    // add new links
    path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
        if(d3.event.ctrlKey) return;

        // select link
        mousedown_link = d;
        if(mousedown_link === selected_link) selected_link = null;
        else selected_link = mousedown_link;
        //STOP THE SELECTED NODE BECOMING UNSELECTED
        //selected_node = null;
        restart();
    });

    // remove old links
    path.exit().remove();


    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    circle = circle.data(nodes, function(d) { return d.id; });

    // update existing nodes (reflexive & selected visual states)
    circle.selectAll('circle')
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .classed('reflexive', function(d) { return d.reflexive; });

    // add new nodes
    var g = circle.enter().append('svg:g');

    g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .on('mouseover', function(d) {
        if(!mousedown_node || d === mousedown_node) return;
        // enlarge target node
        d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function(d) {
        if(!mousedown_node || d === mousedown_node) return;
        // unenlarge target node
        d3.select(this).attr('transform', '');
    })
    .on('mousedown', function(d) {
        if(d3.event.ctrlKey) return;

        // select node
        mousedown_node = d;
        if(mousedown_node === selected_node) selected_node = null; //STOP THIS
        else selected_node = mousedown_node;
        selected_link = null;

        // reposition drag line
        drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

        restart();
    })
    .on('mouseup', function(d) {
        if(!mousedown_node) return;

        // needed by FF
        drag_line
        .classed('hidden', true)
        .style('marker-end', '');

        // check for drag-to-self
        mouseup_node = d;
        if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

            // unenlarge target node
            d3.select(this).attr('transform', '');

            // add link to graph (update if exists)
            // NB: links are strictly source < target; arrows separately specified by booleans
            var source, target, direction;
            if(mousedown_node.id < mouseup_node.id) {
                source = mousedown_node;
                target = mouseup_node;
                direction = 'right';
            } else {
                source = mouseup_node;
                target = mousedown_node;
                direction = 'left';
            }

            var link;
            link = links.filter(function(l) {
                return (l.source === source && l.target === target);
            })[0];

            if(link) {
                link[direction] = true;
            } else {
                link = {source: source, target: target, left: false, right: false};
                link[direction] = true;
                links.push(link);
            }

            // select new link
            selected_link = link;
            //selected_node = null;
            restart();
        });

        // show node IDs
        g.append('svg:text')
        .attr('x', 0)
        .attr('y', 4)
        .attr('class', 'id')
        .text(function(d) { return d.id; });

        g.append('svg:text')
        .attr('x', 0)
        .attr('y', 25)
        .attr('class', 'id')
        .text(function(d) { return d.name; });

        // remove old nodes
        circle.exit().remove();

        // set the graph in motion
        force.start();
    }

    function mousedown() {
        // prevent I-bar on drag
        //d3.event.preventDefault();

        // because :active only works in WebKit?
        svg.classed('active', true);

        if(d3.event.ctrlKey || mousedown_link) return;

        if(mousedown_node){

          current_function = 0;

          drawCurves();
          return;
        }

        // insert new node at point
        var point = d3.mouse(this);
        var node_name = prompt("Please enter a name for the node.");

        if(node_name){
          var node = {id: ++lastNodeId, reflexive: false, membership_functions: [], name: node_name};

          node.x = point[0];
          node.y = point[1];
          nodes.push(node);
          node.membership_functions.push({
            title: "Title",
            xLabel: "X Label",
            yLabel: "Degree of Truth",
            xMin: 0,
            xMax: 100,
            yMin: 0,
            yMax: 1,
            points: [{x: 0, y: 0}, {x: 25, y: .25}, {x: 50, y: .5}, {x: 75, y: .75}, {x: 100, y: 1}]
          });

          // node.membership_functions["output function"] = {
          //   title: "Output Function",
          //   xLabel: "Degree of Truth",
          //   yLabel: "Y Label",
          //   xMin: 0,
          //   xMax: 1,
          //   yMin: 0,
          //   yMax: 100,
          //   points: [{x: 0, y: 0}, {x: .25, y: 25}, {x: .5, y: 50}, {x: .75, y: 75}, {x: 1, y: 100}]
          // };

          node.output_function = {
            title: "Output Function",
            xLabel: "Degree of Truth",
            yLabel: "Y Label",
            xMin: 0,
            xMax: 1,
            yMin: 0,
            yMax: 100,
            points: [{x: 0, y: 0}, {x: .25, y: 25}, {x: .5, y: 50}, {x: .75, y: 75}, {x: 1, y: 100}]
          };

          restart();
        }
    }

    function mousemove() {
        if(!mousedown_node) return;

        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

        restart();
    }

    function mouseup() {
        if(mousedown_node) {
            // hide drag line
            drag_line
            .classed('hidden', true)
            .style('marker-end', '');
        }

        // because :active only works in WebKit?
        svg.classed('active', false);

        // clear mouse event vars
        resetMouseVars();
    }

    function spliceLinksForNode(node) {
        var toSplice = links.filter(function(l) {
            return (l.source === node || l.target === node);
        });
        toSplice.map(function(l) {
            links.splice(links.indexOf(l), 1);
        });
    }

    // only respond once per keydown
    var lastKeyDown = -1;

    function keydown() {
        // d3.event.preventDefault();
        //
        // if(lastKeyDown !== -1) return;
        // lastKeyDown = d3.event.keyCode;
        //
        // // ctrl
        // if(d3.event.keyCode === 17) {
        //     circle.call(force.drag);
        //     container.classed('ctrl', true);
        // }
        //
        // if(!selected_node && !selected_link) return;
        // switch(d3.event.keyCode) {
        //     case 8: // backspace
        //     case 46: // delete
        //     if(selected_node) {
        //         nodes.splice(nodes.indexOf(selected_node), 1);
        //         spliceLinksForNode(selected_node);
        //     } else if(selected_link) {
        //         links.splice(links.indexOf(selected_link), 1);
        //     }
        //     selected_link = null;
        //     selected_node = null;
        //     restart();
        //     break;
        //     case 66: // B
        //     if(selected_link) {
        //         // set link direction to both left and right
        //         selected_link.left = true;
        //         selected_link.right = true;
        //     }
        //     restart();
        //     break;
        //     case 76: // L
        //     if(selected_link) {
        //         // set link direction to left only
        //         selected_link.left = true;
        //         selected_link.right = false;
        //     }
        //     restart();
        //     break;
        //     case 82: // R
        //     if(selected_node) {
        //         // toggle node reflexivity
        //         selected_node.reflexive = !selected_node.reflexive;
        //     } else if(selected_link) {
        //         // set link direction to right only
        //         selected_link.left = false;
        //         selected_link.right = true;
        //     }
        //     restart();
        //     break;
        // }
    }

    function keyup() {
        // lastKeyDown = -1;
        //
        // // ctrl
        // if(d3.event.keyCode === 17) {
        //     circle
        //     .on('mousedown.drag', null)
        //     .on('touchstart.drag', null);
        //     container.classed('ctrl', false);
        // }
    }

    function drawCurves(){

      fillForm();

      var ul = d3.select("#mf-list");

      ul.selectAll("li").remove();
      d3.select("#vis").selectAll("svg").remove();

      selected_node.membership_functions.forEach(function(points, i){
        // add a button with the number for each mf
        //<button class="btn btn-default">Button</button>

        var li = ul.append("li")
        .append("button")
        .attr("class", "btn btn-default")
        .text(i + 1);

        //The mf is the selected one
        if(i === current_function){
          // Draw the function

          li.attr("class", "btn btn-success");
          //var id = "curve" + i;

          var id = "myCurve";

          d3.select("#vis")
          .append("div")
          .attr("id", id);


          $('#save-curve').remove();
          $('#vis').append('<button class="btn" id="save-curve">Save as template</button>');

          bezier(selected_node.membership_functions[i], id);
        }

        $('#mf-list li button').click(function(){
          current_function = $(this).text() - 1;
          drawCurves();
        });
      });

      //var i = "Output Function",
      var points = selected_node.output_function;

      var li = ul.append("li")
      .append("button")
      .attr("class", "btn btn-default")
      .attr("id", "outputfunc")
      .text("Output Function");

      drawTemplateDropdown();

      //The mf is the selected one
      if("Output Function" === current_function){
        // Draw the function

        li.attr("class", "btn btn-success");
        //var id = "curve" + i;


        var id = "myCurve";

        d3.select("#vis")
        .append("div")
        .attr("id", id);

        bezier(selected_node.output_function, id);
      }

      $('#outputfunc').click(function(){
        current_function = $(this).text();
        drawCurves();
      });

      $('#save-curve').click(function(){

        var current = selected_node.membership_functions[current_function] || selected_node.output_function;
        templateCurves.push(current);
        templateCurves = $.unique(templateCurves);

        drawTemplateDropdown();

          // and append the title to the list
      });
    }







    function fillForm(){
      if(selected_node.membership_functions.length > 0){

        var memFunc;

        if(current_function === "Output Function"){
          memFunc = selected_node.output_function;
        } else {
          memFunc = selected_node.membership_functions[current_function];
        }
        $('#titleField').val(memFunc.title);
        $('#xAxisField').val(memFunc.xLabel);
        $('#yAxisField').val(memFunc.yLabel);
        $('#xMinField').val(memFunc.xMin);
        $('#xMaxField').val(memFunc.xMax);
        $('#yMinField').val(memFunc.yMin);
        $('#yMaxField').val(memFunc.yMax);
      }
    }

    // app starts here
    svg.on('mousedown', mousedown)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);
    d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);
    restart();

/////////////////////

function bezier(memfunc, id){

  var w = 500,
  h = 300,
  t = 1,
  delta = .01,
  padding = 30,
  points = memfunc.points,
  bezier = {},
  line = d3.svg.line().x(x).y(y),
  n = 4,
  stroke = d3.scale.category20b(),
  orders = d3.range(2, n + 2);

  var vis = d3.select('#'+id).selectAll("svg")
  .data([5])
  .enter().append("svg")
  .attr("width", w + 2 * padding)
  .attr("height", h + 2 * padding)
  .append("g")
  .attr("transform", "translate(" + padding + "," + padding + ")");

  // vis.append("text")
  // .attr("x", (w / 2))
  // .attr("y", padding)
  // .attr("text-anchor", "middle")
  // .style("font-size", "16px")
  // .style("text-decoration", "underline")
  // .text(memfunc.title);
  //
  var xScale = d3.scale.linear()
                  .domain([memfunc.xMin, memfunc.xMax])
                  .range([0, w - 2*padding]);

  var yScale = d3.scale.linear()
                  .domain([memfunc.yMin, memfunc.yMax])
                  .range([h - 2*padding, 0]);

  //
  // var xAxis = d3.svg.axis();
  // var yAxis = d3.svg.axis()
  //             .scale(yScale)
  //             .orient("left");
  //
  // xAxis.scale(xScale);
  //
  // vis.append("g")
  // .attr("class", "axis")
  // .attr("transform", "translate("+padding+","+ (h - 2 * padding) + ")")
  // .call(xAxis);
  //
  // vis.append("g")
  // .attr("class", "axis")
  // .attr("transform", "translate(" + padding + ", 0)")
  // .call(yAxis);
  //
  // vis.append("text")
  // .attr("x", w/2 - padding )
  // .attr("y",  h - padding)
  // .style("text-anchor", "middle")
  // .text(memfunc.xLabel);
  //
  // vis.append("text")
  // .attr("transform", "rotate(-90)")
  // .attr("x", padding-(h/2))
  // .attr("y", 0)
  // .style("text-anchor", "middle")
  // .text(memfunc.yLabel);

  update();

  vis.selectAll("circle.control")
  .data(function(d) { return points.slice(0, 6) })
  .enter().append("circle")
  .attr("class", "control")
  .attr("r", 7)
  .attr("cx", function(d){
    return xScale(d.x) + padding;
  })
  .attr("cy", function(d){
    return yScale(d.y);
  })
  .call(d3.behavior.drag()
  .on("dragstart", function(d) {
    //Drag behavior is here

    this.__origin__ = [d.x, d.y];
  })
  .on("drag", function(d) {

    // everything needs to be scaled now to maintain consistency between
    // view and model
    var xReverseScale = d3.scale.linear()
    .domain([0, w - 2*padding])
    .range([memfunc.xMin, memfunc.xMax]);

    var yReverseScale = d3.scale.linear()
    .domain([0, h - 2*padding])
    .range([memfunc.yMin, memfunc.yMax]);


    var dxScaled = xReverseScale(d3.event.dx) - memfunc.xMin;
    var dyScaled = yReverseScale(d3.event.dy) - memfunc.yMin;


    d.x = Math.min(memfunc.xMax, Math.max(memfunc.xMin, this.__origin__[0] += dxScaled));
    d.y = Math.min(memfunc.yMax, Math.max(memfunc.yMin, this.__origin__[1] -= dyScaled));

    bezier = {};
    update();

  })
  .on("dragend", function() {
    delete this.__origin__;
  }));

  // vis.append("text")
  // .attr("class", "t")
  // .attr("x", w / 2)
  // .attr("y", h)
  // .attr("text-anchor", "middle");

  vis.selectAll("text.controltext")
  .data(function(d) { return points.slice(0, 6); })
  .enter().append("text")
  .attr("class", "controltext")
  .attr("dx", "10px")
  .attr("dy", ".4em")
  .text(function(d, i) { return "P" + i });

  var last = 0;
  // d3.timer(function(elapsed) {
  //   // t = (t + (elapsed - last) / 5000) % 1;
  //   // last = elapsed;
  //   t = 1;
  //   update();
  // });

  function update() {
    var interpolation = vis.selectAll("g")
    .data(function(d) { return getLevels(d, t); });
    interpolation.enter().append("g")
    .style("fill", colour)
    .style("stroke", colour);

    // var circle = interpolation.selectAll("circle")
    // .data(Object);
    // circle.enter().append("circle")
    // .attr("r", 4);
    // circle
    // .attr("cx", x)
    // .attr("cy", y);

    // var path = interpolation.selectAll("path")
    // .data(function(d) { return [d]; });
    // path.enter().append("path")
    // .attr("class", "line")
    // .attr("d", line);
    // path.attr("d", line);

    //////

    xScale = d3.scale.linear()
    .domain([memfunc.xMin, memfunc.xMax])
    .range([0, w - 2*padding]);

    yScale = d3.scale.linear()
    .domain([memfunc.yMin, memfunc.yMax])
    .range([h - 2*padding, 0]);

    // xReverseScale = d3.scale.linear()
    // .domain([0, w - 2*padding])
    // .range([memfunc.xMin, memfunc.xMax]);
    //
    // yReverseScale = d3.scale.linear()
    // .domain([0, h - 2*padding])
    // .range([memfunc.yMin, memfunc.yMax]);

    var xAxis = d3.svg.axis();
    var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left");

    xAxis.scale(xScale);

    d3.select("#vis").selectAll(".axis").remove();
    d3.select("#vis").selectAll(".label").remove();
    d3.select("#graphTitle").remove();


    vis.append("text")
    .attr("x", (w / 2))
    .attr("y", padding)
    .attr("text-anchor", "middle")
    .attr("id", "graphTitle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text(memfunc.title);


    vis.append("g")
    .attr("class", "axis")
    .attr("transform", "translate("+padding+","+ (h - 2 * padding) + ")")
    .call(xAxis);

    vis.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ", 0)")
    .call(yAxis);

    vis.append("text")
    .attr("class", "label")
    .attr("x", w/2 - padding )
    .attr("y",  h - padding)
    .style("text-anchor", "middle")
    .text(memfunc.xLabel);

    vis.append("text")
    .attr("class", "label")
    .attr("transform", "rotate(-90)")
    .attr("x", padding-(h/2))
    .attr("y", 0)
    .style("text-anchor", "middle")
    .text(memfunc.yLabel);

    /////

    var curve = vis.selectAll("path.curve")
    .data(getCurve);
    curve.enter().append("path")
    .attr("class", "curve");
    curve.attr("d", line);

    vis.selectAll("circle.control")
    .attr("cx", x)
    .attr("cy", y);

    vis.selectAll("text.controltext")
    .attr("x", x)
    .attr("y", y);
    // vis.selectAll("text.t")
    // .text("t=" + t.toFixed(2));
  }

  function interpolate(d, p) {
    if (arguments.length < 2) p = t;
    var r = [];
    for (var i=1; i<d.length; i++) {
      var d0 = d[i-1], d1 = d[i];
      r.push({x: d0.x + (d1.x - d0.x) * p, y: d0.y + (d1.y - d0.y) * p});
    }
    return r;
  }

  function getLevels(d, t_) {
    if (arguments.length < 2) t_ = t;
    var x = [points.slice(0, 6)];
    for (var i=1; i<d; i++) {
      x.push(interpolate(x[x.length-1], t_));
    }
    return x;
  }

  function getCurve(d) {
    var curve = bezier[d];
    if (!curve) {
      curve = bezier[d] = [];
      for (var t_=0; t_<=1; t_+=delta) {
        var x = getLevels(d, t_);
        curve.push(x[x.length-1][0]);
      }
    }
    return [curve.slice(0, t / delta + 1)];
  }

  function x(d) { return xScale(d.x) + padding; }
  function y(d) { return yScale(d.y); }
  function colour(d, i) {
    stroke(-i);
    return d.length > 1 ? stroke(i) : "red";
  }

  // Update the fields when they are edited
  $('.mem-fn').keyup(function(){
    if(selected_node.membership_functions.length > 0){
      var memFunc;

      if(current_function === "Output Function"){
        memFunc = selected_node.output_function;
      } else {
        memFunc = selected_node.membership_functions[current_function];
      }


      var id = $(this).attr('id').replace("Field", "");

      if(typeof memFunc[id] === "number"){
        //console.log("This is numeric");
        memFunc[id] = Number($(this).val());
      }else{
        //console.log("This is not numeric");
        memFunc[id] = $(this).val();
      }
      // memFunc.title = $('#titleField').val();
      // memFunc.xLabel = $('#xAxisField').val();
      // memFunc.yLabel = $('#yAxisField').val();
      // memFunc.xMin = $('#xMinField').val();
      // memFunc.xMax = $('#xMaxField').val();
      // memFunc.yMin = $('#yMinField').val();
      // memFunc.yMax = $('#yMaxField').val();
      //d3.select("#vis").selectAll("svg").remove();
      //bezier(memFunc, "myCurve");
      update();
    }
  });
}



$('#submitter').click(
  function(){
    $.ajax({
      type: "POST",
      contentType: "application/json",
      url: '/thesis/',
      data: JSON.stringify({nodes: nodes, links: links})  ,
      dataType: "json",
      success: parseReturnedData
    });
  }
);


$('#creator').click(
  function(){

    if(selected_node === null){
      alert("No node selected");
      return;
    }

    selected_node.membership_functions.push({
      title: "Title",
      xLabel: "X Label",
      yLabel: "Degree of Truth",
      xMin: 0,
      xMax: 100,
      yMin: 0,
      yMax: 1,
      points: [{x: 0, y: 0}, {x: 25, y: .25}, {x: 50, y: .5}, {x: 75, y: .75}, {x: 100, y: 1}]
    }
    );
    // var id = "curve" + selected_node.membership_functions.length;
    // d3.select("#vis")
    // .append("div")
    // .attr("id", id);
    // bezier(selected_node.membership_functions[selected_node.membership_functions.length - 1],id);
    current_function = selected_node.membership_functions.length -1;
    drawCurves();
});

$("#save").click(function(){

  //alert("Session saved!");
  localStorage.setItem('lastSessionData', JSON.stringify({nodes: nodes, links: links, last: lastNodeId, templates: templateCurves}));
  var name = $("#save-name").val();

  if(name !== undefined && name !== ''){
    $.ajax({
      type: "POST",
      contentType: "application/json",
      url: '/thesis/knowledgebases/' + name,
      data: JSON.stringify({nodes: nodes, links: links, last: lastNodeId, templates: templateCurves}),
      dataType: "json",
      success: function(){
        //console.log("Saved");
        $('#saveModal').modal('toggle');
      }
    });
  } else {
    alert("Didn't save");
    $('#saveModal').modal('toggle');
  }

});

$("#new").click(function(){
  localStorage.clear();

  nodes = [];
  lastNodeId = -1;
  links = [];

  restart();
});

$("#deleter").click(function(){
  var nodeIndex = nodes.indexOf(selected_node);


  // Go through the links and delete relevant links
  for(var i = 0; i < links.length; i++){
    var link = links[i];

    if(link.source === selected_node || link.target === selected_node){
      links.splice(i, 1);
      i--;
    }
  }

  nodes.splice(nodeIndex, 1);
  restart();
});

$('#load-kb').click(function(){
  var container = $("#knowledgebase-options");
  container.empty();

  $.getJSON("/thesis/knowledgebases/", function(data){

    var template = '<div class="radio"><label><input type="radio" name="optionsRadios" id="%NAME%" value="%NAME%">%NAME%</label></div>';

    data.forEach(function(kb){

      kb = kb.substring(0, kb.length - 5);

      var myString = template.replace(/%NAME%/g, kb);
      container.append(myString);
    });
  });
});

$('#get-kb').click(function(){

  var name = $("input:checked").val();

  if(name !== undefined){

    $.getJSON("/thesis/knowledgebases/" + name, function(data){

      //var lastData = JSON.parse(retrievedObject);

      nodes = data.nodes;
      links = data.links;

      for(var i = 0; i < links.length; i++){
        links[i].source = nodes[links[i].source.id];
        links[i].target = nodes[links[i].target.id]
      }

      lastNodeId = Number(data.last);
      templateCurves = data.templates;

      localStorage.setItem('lastSessionData', JSON.stringify({nodes: nodes, links: links, last: lastNodeId, templates: templateCurves}));

      $('#myModal').modal('toggle');

      restart();
    });

  } else {
    $('#myModal').modal('toggle');
  }

  // var container = $("#knowledgebase-options");
  // container.empty();

  // $.getJSON("/thesis/knowledgebases/", function(data){
  //
  //   data.forEach(function(kb, i){
  //
  //     var start = '<div class="radio"><label><input type="radio" name="optionsRadios" id="optionsRadios666" value="option666">',
  //         end = '</label></div>';
  //
  //     start = start.replace(/666/g, i);
  //     container.append(start + kb + end);
  //   });
  // });
});

$('#load-ds').click(function(){
  var container = $("#dataset-options");
  container.empty();

  $.getJSON("/thesis/datasets/", function(data){

    var template = '<div class="radio"><label><input type="radio" name="optionsRadios" id="%NAME%" value="%NAME%">%NAME%</label></div>';

    data.forEach(function(ds){

      ds = ds.substring(0, ds.length - 4);

      var myString = template.replace(/%NAME%/g, ds);
      container.append(myString);
    });
  });
});

$('#get-ds').click(function(){
  var name = $("input:checked").val();

  if(name !== undefined){

    d3.csv("/thesis/data_sets/" + name + '.csv', function(data){


      var columns = [];

      for(var prop in data[0]){
        columns.push(prop);
      }

      // dropdown

      var xaxlist = $('#x-axis-list');
      xaxlist.empty();
      columns.forEach(function(name){

        xaxlist.append('<li role="presentation" class="xaxlabel"><a role="menuitem" tabindex="-1">'+ name +'</a></li>');
      });
      xaxlist.append('<li role="presentation" class="xaxlabel"><a role="menuitem" tabindex="-1">Degree of Truth</a></li>');

      $('.xaxlabel').click(function(){

        var newlabel = $(this).text();

        if("Output Function" === current_function){
          selected_node.output_function.xLabel = newlabel;
        }else{
          selected_node.membership_functions[current_function].xLabel = newlabel;
        }

        drawCurves();
      });

      // end dropdown



      d3.select("#dataset table").remove();

      var table = d3.select("#dataset").append("table").attr("class", "table"),
        thead = table.append("thead"),
        tbody = table.append("tbody");

        thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
            .text(function(column) { return column; });

        // create a row for each object in the data
        var rows = tbody.selectAll("tr")
            .data(data)
            .enter()
            .append("tr")
            .attr("id", function(d,i){
              return "dataset-row-" + i;
            });

            console.log(data);

        // create a cell in each row for each column
         var cells = rows.selectAll("td")
             .data(function(row) {
                 return columns.map(function(column) {
                     return {column: column, value: row[column]};
                 });
             })
             .enter()
             .append("td")
                 .text(function(d) { return d.value; });

          rows.append("td")
            .append("button")
            .text("submit")
            .attr("class","submit-row btn btn-primary");

            $('.submit-row').click(function(){


              $('#extensionSelectModal').modal('toggle');

              var id = $(this).parent().parent().attr('id');


              $('#getSemantics').click(function(){
                var checkboxes = $('#extensionCheckboxes input:checked');
                var values = "";

                var first = true;
                for(var i =0; i < checkboxes.length; i++){
                  if(!first){
                    values += ","
                  } else {
                    first = false;
                  }
                  values += checkboxes[i].value;
                }

                $.ajax({
                  type: "POST",
                  contentType: "application/json",
                  url: '/thesis/',
                  data: JSON.stringify({nodes: nodes, links: links, data: data[id.replace("dataset-row-", "")], extensions: values}),
                  dataType: "json",
                  success: parseReturnedData
                });

                $('#extensionSelectModal').modal('toggle');
              });
            });


      $('#mySecondModal').modal('toggle');
    });

  } else {
    $('#mySecondModal').modal('toggle');
  }
});


function parseReturnedData(data){


  console.log(data);
  RESULTS = {};

  for (var prop in data.results) {
    //RESULTS[prop] = JSON.parse(data[prop]);
    RESULTS[prop] = data.results[prop];
  }

  $('#resultsModal').modal('toggle');
  var results = $('#results-body');
  results.empty();

  if(jQuery.isEmptyObject(RESULTS)){
    results.append("<p>There are no results associated with this dataset/knowledgebase.</p>");
  } else {

    var heading = '<div id="%NAME%" class="row"><h4>%NAME%</h4></div>';
    var content = '<div id="%RESULT%"><p>%RESULT%</p></div>';

    for (var prop in data.results) {
      results.append(heading.replace(/%NAME%/g, prop));


      if(!Array.isArray(RESULTS[prop])){

        var resultsString = "[" + getArgName(RESULTS[prop].arguments) + "]";
        resultsString     += "\n Result: " + RESULTS[prop].result;

        $('#' + prop).append(content.replace(/%RESULT%/g, resultsString));
      } else {

        for(var i =0; i < RESULTS[prop].length; i++){

          var resultsString = "[" + getArgName(RESULTS[prop][i].arguments) + "]";
          resultsString     += "\n Result: " + RESULTS[prop][i].result;

          $('#' + prop).append(content.replace(/%RESULT%/g, resultsString).replace(/%ID%/g, prop + "-" + i));
        }
      }
    }
  }

}

function drawTemplateDropdown(){
  var tflist = $('#templateFunctionList');
  tflist.empty();
  templateCurves.forEach(function(curve){

    tflist.append('<li role="presentation" class="template_function"><a role="menuitem" tabindex="-1">'+ curve.title +'</a></li>');
  });

  $('.template_function').click(function(){
    var $clicked = $(this);
    var newFunc = $.grep(templateCurves, function(e){ return e.title == $clicked.text(); });
    console.log(newFunc);
    var copiedObject = jQuery.extend({},newFunc[0]);

    if("Output Function" === current_function){
      selected_node.output_function = copiedObject;
    }else{
      selected_node.membership_functions[current_function] = copiedObject;
    }

    drawCurves();
  });
}


function getArgName(index){

  var result = "";

  console.log(index);

  for(var i = 0; i < index.length; i++){
    console.log(index[i]);
    if(index[i] === ""){
      break;
    }

    var thing = $.grep(nodes, function(n){ return n.id == index[i]; });

    result += thing[0].name + ", ";
  }

  return result;
}
